import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { mesAtualSP } from "@/lib/datas";

export type VendedorRanking = { vendedor: string; loja: string; quantidade: number };
export type LojaRanking = { loja: string; quantidade: number; vendedores: number };
export type Destaque = { data: string; vendedor: string; loja: string; quantidade: number };

export type Painel = {
  mes: string; // YYYY-MM-01
  meta: number | null;
  total: number;
  ultima_data: string | null;
  vendedores: VendedorRanking[];
  lojas: LojaRanking[];
  destaque: Destaque | null;
};

const entrada = z.object({ mes: z.string().regex(/^\d{4}-\d{2}$/).optional() });

export const getPainel = createServerFn({ method: "GET" })
  .inputValidator((input: { mes?: string }) => entrada.parse(input))
  .handler(async ({ data }) => {
    const url = process.env["SUPABASE_URL"]!;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient<Database>(url, key, {
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

    const mes = data.mes ?? mesAtualSP();
    const { data: painel, error } = await client.rpc("painel_mes", { _mes: `${mes}-01` });
    if (error) throw new Error(error.message);
    return painel as unknown as Painel;
  });

export const painelQuery = (mes?: string) =>
  queryOptions({
    queryKey: ["painel", mes ?? "atual"],
    queryFn: () => getPainel({ data: { mes } }),
    refetchInterval: 60_000,
  });
