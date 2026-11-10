import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/** Todo dia às 08:00 (Brasília): envia o resumo de ontem da loja para cada gerente ativo. */
export const Route = createFileRoute("/api/public/jobs/whatsapp-gerentes")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;

        const { enviarResumoGerentes } = await import("@/lib/whatsapp.server");
        const resultado = await enviarResumoGerentes();
        return Response.json(resultado, { status: resultado.ok ? 200 : 502 });
      },
    },
  },
});
