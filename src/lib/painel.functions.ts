import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { mesAtualSP } from "@/lib/datas";

// `quantidade` é o total de unidades; `campanha` é quantas delas pagam comissão reduzida.
export type VendedorRanking = { vendedor: string; loja: string; quantidade: number; campanha: number };
export type LojaRanking = { loja: string; quantidade: number; campanha: number; vendedores: number };
export type Destaque = { data: string; vendedor: string; loja: string; quantidade: number; campanha: number };
export type LojaDestaque = { data: string; loja: string; quantidade: number; campanha: number; vendedores: number };

export type Painel = {
  mes: string; // YYYY-MM-01
  meta: number | null;
  total: number;
  ultima_data: string | null;
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
