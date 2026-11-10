import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { hojeSP, somarDias } from "@/lib/datas";

/** Todo dia às 00:05 (Brasília): fotografa o ranking do mês até ontem, para a variação de posições. */
export const Route = createFileRoute("/api/public/jobs/snapshot-ranking")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const ontem = somarDias(hojeSP(), -1);
        const { error } = await supabaseAdmin.rpc("snapshot_ranking", { _data: ontem });
        if (error) {
          console.error(`snapshot_ranking falhou: ${error.message}`);
          return Response.json({ ok: false, erro: error.message }, { status: 502 });
        }
        return Response.json({ ok: true, data: ontem });
      },
    },
  },
});
