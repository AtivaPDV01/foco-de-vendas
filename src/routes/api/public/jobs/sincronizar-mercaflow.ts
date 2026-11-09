import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

type WaitUntil = (p: Promise<unknown>) => void;

/** Usa o waitUntil do Cloudflare quando existe, para o agendador não esperar a leitura do Mercaflow. */
async function obterWaitUntil(): Promise<WaitUntil | null> {
  try {
    const modulo = "cloudflare:workers";
    const cf = (await import(/* @vite-ignore */ modulo)) as { waitUntil?: WaitUntil };
    return typeof cf.waitUntil === "function" ? cf.waitUntil : null;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/public/jobs/sincronizar-mercaflow")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;

        const { sincronizarMercaflow } = await import("@/lib/mercaflow.server");
        const waitUntil = await obterWaitUntil();
        if (waitUntil) {
          waitUntil(sincronizarMercaflow("automatico"));
          return Response.json({ aceito: true }, { status: 202 });
        }
        const resultado = await sincronizarMercaflow("automatico");
        return Response.json(resultado, { status: resultado.ok ? 200 : 502 });
      },
    },
  },
});
