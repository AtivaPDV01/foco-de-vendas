import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hojeSP } from "@/lib/datas";
import {
  montarLinhasMercaflow,
  montarLinhasProduto,
  produtosDaCampanha,
  produtosReduzidosDa,
  selecionarCampanhas,
  type CampanhaMercaflow,
  type LinhaVendaProduto,
  type OperadorMercaflow,
  type ProdutoCampanhaMercaflow,
} from "@/lib/mercaflow";
import type { LinhaVenda } from "@/lib/planilha";

const BASE = "https://mercaflow.com.br";

export type ResultadoSincronizacao =
  | { ok: true; linhas: number; unidades: number; campanhas: string[] }
  | { ok: false; erro: string };

async function lerJson<T>(res: Response, oQue: string): Promise<T> {
  if (!res.ok) {
    const corpo = (await res.text()).slice(0, 300);
    console.error(`Mercaflow ${oQue} falhou [${res.status}]: ${corpo}`);
    throw new Error(`Mercaflow recusou ${oQue} (erro ${res.status}).`);
  }
  return (await res.json()) as T;
}

function cookiesDe(res: Response) {
  const h = res.headers as Headers & { getSetCookie?: () => string[] };
  const lista = h.getSetCookie?.() ?? (res.headers.get("set-cookie") ?? "").split(/,(?=\s*[^;=\s]+=)/);
  return lista
    .map((c) => c.split(";")[0]?.trim())
    .filter((c): c is string => Boolean(c))
    .join("; ");
}

async function entrar() {
  const email = process.env["MERCAFLOW_EMAIL"];
  const password = process.env["MERCAFLOW_PASSWORD"];
  if (!email || !password) throw new Error("E-mail e senha do Mercaflow não estão configurados.");
  const res = await fetch(`${BASE}/api/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (res.status === 401 || res.status === 400) throw new Error("O Mercaflow recusou o e-mail ou a senha.");
  await lerJson<unknown>(res, "o login");
  const cookie = cookiesDe(res);
  if (!cookie) throw new Error("O Mercaflow não devolveu a sessão de login.");
  return cookie;
}

type RespostaDiaria = { operadores?: OperadorMercaflow[] };

type DetalheCampanha = { produtos?: { idProduto?: unknown; descricao?: unknown }[] | null };

async function sessaoMercaflow() {
  const cookie = await entrar();
  return <T>(path: string, oQue: string) =>
    fetch(`${BASE}${path}`, { headers: { cookie, accept: "application/json" } }).then((r) => lerJson<T>(r, oQue));
}

async function buscarDadosMercaflow() {
  const get = await sessaoMercaflow();
  const todas = await get<CampanhaMercaflow[]>("/api/vendas/campanhas", "a lista de campanhas");
  const campanhas = selecionarCampanhas(todas, hojeSP());

  const porCampanha = await Promise.all(
    campanhas.map(async (c) => {
      const base = `/api/vendas/campanhas/${c.id}/vendas-diarias-operador`;
      const periodo = { inicio: c.dataInicio, fim: c.dataFim };
      const [total, detalhe] = await Promise.all([
        get<RespostaDiaria>(base, `as vendas de "${c.nome}"`),
        get<DetalheCampanha>(`/api/vendas/campanhas/${c.id}`, `os produtos de "${c.nome}"`),
      ]);
      const produtos = produtosDaCampanha(detalhe);
      const reduzidos = produtosReduzidosDa(c);
      // Venda de cada produto da campanha (também usada para separar o item com comissão reduzida).
      const ids = [...new Set([...produtos.map((p) => p.idProduto), ...reduzidos])];
      const porProduto = new Map<number, OperadorMercaflow[]>();
      await Promise.all(
        ids.map(async (id) => {
          const r = await get<RespostaDiaria>(`${base}?idProduto=${id}`, `o produto ${id} em "${c.nome}"`);
          porProduto.set(id, r.operadores ?? []);
        }),
      );
      const linhas = montarLinhasMercaflow(
        total.operadores ?? [],
        reduzidos.flatMap((id) => porProduto.get(id) ?? []),
        periodo,
      );
      const linhasProduto = produtos.flatMap((p: ProdutoCampanhaMercaflow) =>
        montarLinhasProduto(porProduto.get(p.idProduto) ?? [], p, periodo),
      );
      return { linhas, linhasProduto };
    }),
  );
  return {
    campanhas,
    linhas: porCampanha.flatMap((p) => p.linhas),
    linhasProduto: porCampanha.flatMap((p) => p.linhasProduto),
  };
}

/** Produtos das campanhas Ativa PDV do mês no Mercaflow (para o cadastro de campanhas no /admin). */
export async function listarProdutosMercaflow() {
  const get = await sessaoMercaflow();
  const todas = await get<CampanhaMercaflow[]>("/api/vendas/campanhas", "a lista de campanhas");
  const campanhas = selecionarCampanhas(todas, hojeSP());
  const detalhes = await Promise.all(
    campanhas.map((c) => get<DetalheCampanha>(`/api/vendas/campanhas/${c.id}`, `os produtos de "${c.nome}"`)),
  );
  const vistos = new Map<number, ProdutoCampanhaMercaflow>();
  for (const d of detalhes) for (const p of produtosDaCampanha(d)) vistos.set(p.idProduto, p);
  return [...vistos.values()].sort((a, b) => a.descricao.localeCompare(b.descricao));
}

/** Busca as vendas no Mercaflow e substitui as da "Sincronização Mercaflow". Registra o resultado. */
export async function sincronizarMercaflow(gatilho: "manual" | "automatico"): Promise<ResultadoSincronizacao> {
  const { data: registro } = await supabaseAdmin
    .from("sincronizacoes")
    .insert({ origem: "mercaflow", gatilho, status: "executando" })
    .select("id")
    .single();

  const concluir = async (campos: Record<string, unknown>) => {
    if (!registro) return;
    await supabaseAdmin
      .from("sincronizacoes")
      .update({ ...campos, concluido_em: new Date().toISOString() })
      .eq("id", registro.id);
  };

  try {
    const { campanhas, linhas, linhasProduto } = await buscarDadosMercaflow();
    const nomes = campanhas.map((c) => c.nome);
    if (campanhas.length === 0) {
      await concluir({ status: "ok", linhas: 0, unidades: 0, campanhas: [], mensagem: "Nenhuma campanha Venda Ativa PDV no mês." });
      return { ok: true, linhas: 0, unidades: 0, campanhas: [] };
    }
    const { error } = await supabaseAdmin.rpc("aplicar_sincronizacao_mercaflow", {
      _periodos: campanhas.map((c) => ({ inicio: c.dataInicio, fim: c.dataFim })),
      _linhas: linhas satisfies LinhaVenda[],
    });
    if (error) {
      console.error("Falha ao gravar a sincronização:", error.message);
      throw new Error("Não foi possível gravar as vendas sincronizadas.");
    }
    const periodos = campanhas.map((c) => ({ inicio: c.dataInicio, fim: c.dataFim }));
    const { error: erroProdutos } = await supabaseAdmin.rpc("aplicar_vendas_produto", {
      _periodos: periodos,
      _linhas: linhasProduto satisfies LinhaVendaProduto[],
    });
    // A venda por produto é complementar: se falhar, o ranking continua atualizado.
    if (erroProdutos) console.error("Falha ao gravar a venda por produto:", erroProdutos.message);
    const unidades = linhas.reduce((s, l) => s + l.quantidade, 0);
    await concluir({ status: "ok", linhas: linhas.length, unidades, campanhas: nomes, mensagem: null });
    return { ok: true, linhas: linhas.length, unidades, campanhas: nomes };
  } catch (e) {
    const erro = e instanceof Error ? e.message : "Erro desconhecido na sincronização.";
    console.error("Sincronização Mercaflow falhou:", e);
    await concluir({ status: "erro", mensagem: erro });
    return { ok: false, erro };
  }
}
