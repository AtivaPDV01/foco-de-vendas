import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { hojeSP } from "@/lib/datas";
import {
  montarLinhasMercaflow,
  PRODUTOS_CAMPANHA_REDUZIDA,
  selecionarCampanhas,
  type CampanhaMercaflow,
  type OperadorMercaflow,
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

async function buscarDadosMercaflow() {
  const cookie = await entrar();
  const get = <T>(path: string, oQue: string) =>
    fetch(`${BASE}${path}`, { headers: { cookie, accept: "application/json" } }).then((r) => lerJson<T>(r, oQue));

  const todas = await get<CampanhaMercaflow[]>("/api/vendas/campanhas", "a lista de campanhas");
  const campanhas = selecionarCampanhas(todas, hojeSP());

  const porCampanha = await Promise.all(
    campanhas.map(async (c) => {
      const base = `/api/vendas/campanhas/${c.id}/vendas-diarias-operador`;
      const [total, ...itens] = await Promise.all([
        get<RespostaDiaria>(base, `as vendas de "${c.nome}"`),
        ...PRODUTOS_CAMPANHA_REDUZIDA.map((p) =>
          get<RespostaDiaria>(`${base}?idProduto=${p}`, `o item da campanha em "${c.nome}"`),
        ),
      ]);
      return montarLinhasMercaflow(
        total.operadores ?? [],
        itens.flatMap((i) => i.operadores ?? []),
        { inicio: c.dataInicio, fim: c.dataFim },
      );
    }),
  );
  return { campanhas, linhas: porCampanha.flat() };
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
    const { campanhas, linhas } = await buscarDadosMercaflow();
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
