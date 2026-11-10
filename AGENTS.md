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
- Mercaflow sync: pure mapping/campaign selection in `src/lib/mercaflow.ts` (tested in `src/test/mercaflow.test.ts`), network + writes in `src/lib/mercaflow.server.ts`; rows are replaced atomically by the service-role-only SQL function `aplicar_sincronizacao_mercaflow`, scoped to the single "Sincronização Mercaflow" import and the synced campaigns' date ranges — keeps cron and manual runs idempotent. Each run is logged in `sincronizacoes`. Reduced-rate products are keyed by the campaign's start month (`produtosReduzidosDa`), and the ranking's rate label by the viewed month (`regraComissao*` in `comissao.ts`) — so past months keep their own rules.
- Scheduled sync hits `/api/public/jobs/sincronizar-mercaflow` (managed HTTP schedule, cron-auth); it hands the work to `waitUntil` when the runtime offers it because a full Mercaflow read takes ~8–10 s, longer than the scheduler waits.
- Monthly campaigns and their focus products (name, image, Mercaflow product id, unit goal) live in `campanhas`/`campanha_produtos`, edited in /admin; images go to the private `campanha-produtos` bucket and are stored as long-lived signed URLs because public buckets are blocked in this workspace.
- Per-product sales come from the Mercaflow sync into `vendas_produto` (service-role only, replaced per synced period by `aplicar_vendas_produto`) and are read only through `painel_produtos` / `extrato_vendedor` — keeps raw rows off the Data API.
- Achievement tiers and ranking badges live only in `src/lib/conquistas.ts` (tested in `src/test/conquistas.test.ts`); tiers are recognition only and never change commission rates.
- The WhatsApp share card is drawn client-side on a canvas (`src/lib/card-compartilhavel.ts`) — no server rendering or extra dependency.
- Installable app is manifest-only (`public/manifest.webmanifest`); no service worker.
- Per-store monthly unit goals live in `metas_loja` (public read, admin write), shown on /loja via `MetaCard` with the store total swapped in — reuses the same ritmo/projeção math as the general goal.
- Daily ranking variation: `ranking_snapshot` is photographed at 00:05 (Brasília) by the managed schedule hitting `/api/public/jobs/snapshot-ranking` (SQL `snapshot_ranking(date)`); the UI shows ▲▼=/NOVO vs yesterday only for the current month.
- Daily WhatsApp summaries to store managers go through Z-API (`src/lib/whatsapp.server.ts`, secrets ZAPI_INSTANCE_ID/ZAPI_INSTANCE_TOKEN/ZAPI_CLIENT_TOKEN); the message text is pure in `src/lib/whatsapp.ts` (tested), managers and send logs live in `gerentes`/`whatsapp_logs` (admin-only), cron at 08:00 (Brasília) via `/api/public/jobs/whatsapp-gerentes`.
