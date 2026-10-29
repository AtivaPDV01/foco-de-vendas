<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Dashboard aggregates come from the `painel_mes(date)` SQL function via a public server function (`src/lib/painel.functions.ts`); never fetch raw sales rows to the browser for totals — avoids the 1000-row API limit.
- Commission rates and goal math live only in `src/lib/comissao.ts`, covered by `src/test/regras.test.ts`; UI must call these helpers instead of inlining rates.
- Sales are written only by users with the `admin` role (RLS via `has_role`); the first signed-up account is auto-granted admin by a trigger on `auth.users`.
- Spreadsheet parsing is pure (`src/lib/planilha.ts`) and runs in the browser; `xlsx` is loaded with dynamic import to keep it out of the main bundle.
- All dates are calendar dates in America/Sao_Paulo (`src/lib/datas.ts`); "destaque do dia" (top seller and top store) uses the latest sales date before today.
- `vendas.quantidade` is the total units (drives goal and ranking); `vendas.quantidade_campanha` is the subset paying the reduced campaign rate — keeps every existing sum unchanged while commission helpers take both values.
- Mercaflow sync: pure mapping/campaign selection in `src/lib/mercaflow.ts` (tested in `src/test/mercaflow.test.ts`), network + writes in `src/lib/mercaflow.server.ts`; rows are replaced atomically by the service-role-only SQL function `aplicar_sincronizacao_mercaflow`, scoped to the single "Sincronização Mercaflow" import and the synced campaigns' date ranges — keeps cron and manual runs idempotent. Each run is logged in `sincronizacoes`.
- Scheduled sync hits `/api/public/jobs/sincronizar-mercaflow` (managed HTTP schedule, cron-auth); it hands the work to `waitUntil` when the runtime offers it because a full Mercaflow read takes ~8–10 s, longer than the scheduler waits.
