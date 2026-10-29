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
