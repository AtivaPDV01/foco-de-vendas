import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Disparo manual pelo painel /admin — só para quem tem o papel admin. */
export const sincronizarMercaflowAgora = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: ehAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!ehAdmin) throw new Error("Apenas o responsável pode sincronizar.");
    const { sincronizarMercaflow } = await import("@/lib/mercaflow.server");
    return sincronizarMercaflow("manual");
  });

/** Produtos das campanhas do mês no Mercaflow, para escolher no cadastro de campanhas. */
export const produtosMercaflow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: ehAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!ehAdmin) throw new Error("Apenas o responsável pode ver os produtos.");
    const { listarProdutosMercaflow } = await import("@/lib/mercaflow.server");
    try {
      return { ok: true as const, produtos: await listarProdutosMercaflow() };
    } catch (e) {
      console.error("Falha ao listar produtos do Mercaflow:", e);
      return { ok: false as const, produtos: [], erro: "Não foi possível ler os produtos do Mercaflow agora." };
    }
  });
