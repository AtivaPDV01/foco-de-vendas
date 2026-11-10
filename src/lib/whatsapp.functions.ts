import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Reenvia uma mensagem de WhatsApp a partir de um log (somente admin). */
export const reenviarWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { logId: string }) => z.object({ logId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: ehAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!ehAdmin) throw new Error("Sem permissão.");
    const { reenviarLog } = await import("@/lib/whatsapp.server");
    return reenviarLog(data.logId);
  });
