import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { mesAtualSP } from "@/lib/datas";

// `quantidade` é o total de unidades; `campanha` é quantas delas pagam comissão reduzida.
// `dias` = dias com venda no mês (só no painel do mês).
export type VendedorRanking = { vendedor: string; loja: string; quantidade: number; campanha: number; dias?: number };
export type LojaRanking = { loja: string; quantidade: number; campanha: number; vendedores: number };
export type Destaque = { data: string; vendedor: string; loja: string; quantidade: number; campanha: number };
export type LojaDestaque = { data: string; loja: string; quantidade: number; campanha: number; vendedores: number };

export type Painel = {
  mes: string; // YYYY-MM-01
  meta: number | null;
  total: number;
  ultima_data: string | null;
  dias_com_venda: number;
  vendedores: VendedorRanking[];
  lojas: LojaRanking[];
  destaque: Destaque | null;
  loja_destaque: LojaDestaque | null;
};

const entrada = z.object({ mes: z.string().regex(/^\d{4}-\d{2}$/).optional() });

function clientePublico() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

// Recarrega o painel a cada 30 s; a sincronização com o Mercaflow roda a cada 5 min.
const ATUALIZACAO_MS = 30_000;

export const getPainel = createServerFn({ method: "GET" })
  .inputValidator((input: { mes?: string | undefined }) => entrada.parse(input))
  .handler(async ({ data }) => {
    const mes = data.mes ?? mesAtualSP();
    const { data: painel, error } = await clientePublico().rpc("painel_mes", { _mes: `${mes}-01` });
    if (error) throw new Error(error.message);
    return painel as unknown as Painel;
  });

export const painelQuery = (mes?: string) =>
  queryOptions({
    queryKey: ["painel", mes ?? "atual"],
    queryFn: () => getPainel({ data: { mes } }),
    refetchInterval: ATUALIZACAO_MS,
  });

export type PainelDia = {
  data: string;
  total: number;
  campanha: number;
  vendedores: VendedorRanking[];
  lojas: LojaRanking[];
  ultima_sincronizacao: string | null;
};

const entradaDia = z.object({ data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });

export const getPainelDia = createServerFn({ method: "GET" })
  .inputValidator((input: { data: string }) => entradaDia.parse(input))
  .handler(async ({ data }) => {
    const { data: dia, error } = await clientePublico().rpc("painel_dia", { _data: data.data });
    if (error) throw new Error(error.message);
    return dia as unknown as PainelDia;
  });

export const painelDiaQuery = (data: string) =>
  queryOptions({
    queryKey: ["painel-dia", data],
    queryFn: () => getPainelDia({ data: { data } }),
    refetchInterval: ATUALIZACAO_MS,
  });

export const getUltimaSincronizacao = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await clientePublico().rpc("ultima_sincronizacao");
  if (error) throw new Error(error.message);
  return (data as string | null) ?? null;
});

export const ultimaSincronizacaoQuery = () =>
  queryOptions({
    queryKey: ["ultima-sincronizacao"],
    queryFn: () => getUltimaSincronizacao(),
    refetchInterval: ATUALIZACAO_MS,
  });

// ---------- Desempenho por produto da campanha ----------

export type ProdutoDesempenho = {
  id_produto: number;
  produto: string;
  quantidade: number;
  vendedores: number;
  lojas: number;
  top_vendedor: string | null;
  top_vendedor_qtd: number | null;
  top_loja: string | null;
  top_loja_qtd: number | null;
};

const entradaProdutos = z.object({ mes: z.string().regex(/^\d{4}-\d{2}$/), loja: z.string().max(200).optional() });

export const getProdutos = createServerFn({ method: "GET" })
  .inputValidator((input: { mes: string; loja?: string | undefined }) => entradaProdutos.parse(input))
  .handler(async ({ data }) => {
    const { data: lista, error } = await clientePublico().rpc("painel_produtos", {
      _mes: `${data.mes}-01`,
      ...(data.loja ? { _loja: data.loja } : {}),
    });
    if (error) throw new Error(error.message);
    return (lista ?? []) as unknown as ProdutoDesempenho[];
  });

export const produtosQuery = (mes: string, loja?: string) =>
  queryOptions({
    queryKey: ["produtos", mes, loja ?? ""],
    queryFn: () => getProdutos({ data: { mes, loja } }),
    refetchInterval: ATUALIZACAO_MS,
  });

// ---------- Extrato individual do vendedor ----------

export type Extrato = {
  vendedor: string;
  loja: string | null;
  quantidade: number;
  campanha: number;
  posicao: number | null;
  total_vendedores: number;
  dias: { data: string; quantidade: number; campanha: number }[];
  produtos: { id_produto: number; produto: string; quantidade: number }[];
};

const entradaExtrato = z.object({ mes: z.string().regex(/^\d{4}-\d{2}$/), vendedor: z.string().min(1).max(200) });

export const getExtrato = createServerFn({ method: "GET" })
  .inputValidator((input: { mes: string; vendedor: string }) => entradaExtrato.parse(input))
  .handler(async ({ data }) => {
    const { data: extrato, error } = await clientePublico().rpc("extrato_vendedor", {
      _mes: `${data.mes}-01`,
      _vendedor: data.vendedor,
    });
    if (error) throw new Error(error.message);
    return extrato as unknown as Extrato;
  });

export const extratoQuery = (mes: string, vendedor: string) =>
  queryOptions({
    queryKey: ["extrato", mes, vendedor],
    queryFn: () => getExtrato({ data: { mes, vendedor } }),
    refetchInterval: ATUALIZACAO_MS,
  });

// ---------- Campanha do mês (produtos foco, cadastrados no /admin) ----------

export type ItemCampanha = {
  id: string;
  nome: string;
  imagem: string | null;
  id_produto: number | null;
  meta: number | null;
};
export type Campanha = { nome: string; itens: ItemCampanha[] };

export const getCampanha = createServerFn({ method: "GET" })
  .inputValidator((input: { mes: string }) => z.object({ mes: z.string().regex(/^\d{4}-\d{2}$/) }).parse(input))
  .handler(async ({ data }): Promise<Campanha | null> => {
    const { data: c, error } = await clientePublico()
      .from("campanhas")
      .select("nome, campanha_produtos(id, nome, imagem_url, id_produto_mercaflow, meta, ordem)")
      .eq("mes", `${data.mes}-01`)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!c) return null;
    const itens = [...(c.campanha_produtos ?? [])]
      .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
      .map((p) => ({ id: p.id, nome: p.nome, imagem: p.imagem_url, id_produto: p.id_produto_mercaflow, meta: p.meta }));
    return { nome: c.nome, itens };
  });

export const campanhaQuery = (mes: string) =>
  queryOptions({
    queryKey: ["campanha", mes],
    queryFn: () => getCampanha({ data: { mes } }),
    staleTime: 5 * 60_000,
  });

// ---------- Metas individuais por loja ----------

export type MetaLoja = { loja: string; quantidade: number };

export const getMetasLoja = createServerFn({ method: "GET" })
  .inputValidator((input: { mes: string }) => z.object({ mes: z.string().regex(/^\d{4}-\d{2}$/) }).parse(input))
  .handler(async ({ data }): Promise<MetaLoja[]> => {
    const { data: lista, error } = await clientePublico()
      .from("metas_loja")
      .select("loja, quantidade")
      .eq("mes", `${data.mes}-01`);
    if (error) throw new Error(error.message);
    return lista ?? [];
  });

export const metasLojaQuery = (mes: string) =>
  queryOptions({
    queryKey: ["metas-loja", mes],
    queryFn: () => getMetasLoja({ data: { mes } }),
    staleTime: 60_000,
  });
