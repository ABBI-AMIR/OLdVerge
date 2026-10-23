# Public SSR and bounded local load testing

## Rendering path

`npm run build` builds client assets into `dist/` and the React server entry into `server-dist/entry.js`. `dist/ssr-public.json` contains only validated public backend configuration. Vercel routes HTML requests to `api/render.js`, which loads `server/handler.mjs` and the server entry. Static assets remain served from `dist/`.

`server/public-data.js` recognizes public routes and reads only the published content needed by each page. A product page makes one product-detail request. Browse pages call the existing read-only `catalog_page` RPC with a 24-product page, then hydrate the returned slugs (two requests, or one for an empty page). Policy pages fetch only their own published row; informational pages need no backend requests. Store settings are not consumed by the informational SSR view and are loaded by the existing interactive client gate. The server never imports Zustand stores, authentication sessions, cart contents or browser storage. It sends only the public project key to the public API and never forwards visitor cookies or authorization headers. A single four-second deadline covers the complete route's data loading; each upstream response is capped at two MiB. Failed required reads return 503, never sample catalogue fallback. Unknown products return 404. Identical pending backend reads share work within one renderer; settled results are not retained in a separate data cache. Cancellation aborts orphaned reads while preserving reads still needed by another route.

`server/entry.jsx` renders `src/ssr/PublicPage.jsx`, escapes metadata and serialized JSON, and includes route titles, descriptions and an optional canonical URL from the explicitly configured `SITE_URL`. Public HTML is cached for 30 seconds, bounded to 64 entries and eight MiB per process. Concurrent requests for the same page share work; at most 16 distinct pages fetch at once, with excess requests receiving 503 and Retry-After. Cache scope is one renderer/project. Serverless instances have independent caches; this is not a distributed rate limiter.

Cart, checkout, account, confirmation, newsletter actions, admin and interactive support routes use a private client-rendered shell with `no-store`. They perform no SSR backend reads and serialize no personal state. Existing collection/product/policy aliases retain redirects.

`src/main.jsx` hydrates the shared public view. `ClientBoot.jsx` then prepares the existing catalogue/site stores and hands over to the existing interactive app and cart/auth bootstrap. Public SSR intentionally uses a simpler informational layout; this is not full server rendering of the animated application or transactional pages. Without JavaScript, public catalogue/product/policy content is readable and links work; cart and account interactions require JavaScript. With JavaScript, a layout change during the handover remains possible and should be evaluated on real devices before launch.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run build` | Optimized client and server builds; no network reads required |
| `npm start` | Serve normal build through SSR at loopback port 4173; configured backend reads may occur on visits |
| `npm run preview` | Vite static preview only; does not exercise SSR |
| `npm test` | Existing cart/security/performance regression tests plus mocked SSR and load guardrail tests |
| `npm run test:load:local` | Isolated demo production build, blocked upstream network access, bounded loopback GET load and JSON report |
| `npm run test:ssr:uncached` | Three fresh Node processes using the optimized SSR bundle and injected read-only fixtures; checks initialization, uncached pages and canonical cache reuse with upstream network prohibited |
| `npm run check:bundle` | Verify initial JavaScript budget including static imports and deferred routes |

Use the isolated load command for the user's current local-only authorization, rather than `npm start` against a backend-configured build. It uses Vite's test environment mode to isolate integration defines but the optimized production build pipeline, not a dev server.

## Verification on 2026-10-22

- 244 unit/regression tests passed, including real HTML without browser JavaScript, XSS escaping, private-route exclusions, deduplication, cache expiry/bounds, overload handling, redirects, backend failures, target restrictions and staging configuration rejection.
- Lint, production client/server build, bundle budget and tracked-file secret scan passed. Initial JavaScript static dependency closure: 172.4 KiB gzip (200 KiB budget).
- Local production SSR load: 200/200 requests at 10 requests/second over 20 seconds; zero failures and skips. An initial completed run measured p50 18.0 ms, p95 19.9 ms, p99 21.7 ms, maximum 29.7 ms; subsequent runs are recorded in the JSON report. This includes four public routes and uses the public HTML cache. Preflight and HTTP smoke checks are additional and excluded from latency statistics.
- Browser smoke check: the isolated demo product page hydrated into the existing interactive product controls with no captured console warnings or errors. No checkout was submitted.
- No remote load, Supabase requests, checkout orders or inventory modifications were made by these checks. The database integration suite was not rerun in this phase because it creates local fixture orders; no SQL changed in this phase. Earlier database verification remains separate evidence.

Backend SSR behavior is covered with mocked public API responses. Cold serverless starts, CDN routing, authenticated Vercel deployment protection, real backend latency, database connection pressure, browser Core Web Vitals and distributed capacity still require a verified isolated staging deployment and separate testing approval. See [hosting and staging](hosting-and-staging.md).

## Staging latency investigation and local fixes (2026-10-22)

The earlier approved staging run recorded p50 379 ms, p95 814 ms, p99 1,972 ms and maximum 2,281 ms. Its aggregate report has no route/cache/server phase measurements, so it cannot establish which phase caused individual slow responses.

Read-only Vercel deployment metadata for `dpl_8xkZNgyXtspskodn8aj6NMquChyC` confirmed execution in `iad1` (Washington, D.C.). The existing staging Supabase project is in Tokyo. This is a verified geographic mismatch and a likely network contributor, not a measured attribution of the entire tail. `vercel.json` now selects `hnd1` (Tokyo) for the next deployment, following [Vercel's region configuration guidance](https://vercel.com/docs/functions/configuring-functions/region). This affects function placement, not custom domains or access protection. No deployment or dashboard settings were changed in this task. A future production database in another region will require revisiting this setting.

Code changes:

- Removed two unused reads (public settings and all policies) from every product/browse cache miss. Product reads decrease from three to one; browse reads from four to two. Policy reads are limited by slug and published status. Static informational pages no longer depend on the backend being reachable.
- Identical pending read requests share work across concurrent public routes, including overlapping product hydration. Settled and failed reads are removed immediately, preserving the existing HTML freshness window, retry behavior and project isolation. No stale-while-revalidate behavior was added to the process cache.
- The SSR bundle previously included both React development and production renderers, selected through runtime `NODE_ENV`. The SSR build now folds production branches and minifies the output: approximately 1,471.6 kB to 255.3 kB (83% smaller). `check:bundle` now enforces a 350 KiB raw server-entry budget and rejects unresolved environment branches, alongside the existing browser budget. Smaller payload/parse work is expected to help cold starts; hosted cold-start improvement has not been measured.
- Responses expose fixed-name `Server-Timing` fields: `cache` is MISS/HIT/COALESCED; `ssr` measures the current renderer invocation; misses also expose `data` and `render`. Hits do not repeat the original miss's timings. These contain no URLs, queries, backend error details, credentials or personal state. They exclude function-module initialization, deployment protection and transit latency. Private/unknown routes retain their previous behavior without public-data timing.
- Load reports now group response/header latency, failures, cache outcomes and server timings by approved route. Absent phase measurements have zero samples. Raw response headers and cookies are never saved. Preflight remains excluded from samples and warms the home route; this is not a fully cold-start benchmark.

Verification after the final code changes:

- 253 tests passed, including eight added cases for minimal reads, filtered policies/failures, overlapping read sharing/retry/isolation, independent timing headers, sanitized per-route reporting, and regional deployment configuration. Existing cart/security tests passed. No transactional files or SQL were changed.
- Lint, optimized client/server builds, secret scan, diff whitespace check and bundle checks passed. Initial browser dependency closure remains 172.4 KiB gzip; server entry is 249.3 KiB raw.
- Isolated optimized production build: 200/200 loopback GETs, 10 requests/second for 20 seconds; zero failed/skipped; p50 10.76 ms, p95 19.69 ms, p99 20.67 ms, maximum 22.29 ms. Data was local demo content and upstream fetches were forbidden. Full diagnostics: ignored `scripts/out/load-local.json`. These figures cannot be compared directly with protected staging's real backend/network results.
- Local browser product hydration at the available 1280 px viewport: correct heading and PKR 16,900, loaded product image, no horizontal overflow, no captured warning/error logs. Responsive checks at 390/768/1440 px and Safari/Firefox were not rerun; no layout or styling changed.
- No requests to oldverge.com, storefront remote load, deployment, orders, inventory edits or database writes. The database integration suite was not rerun because it creates fixture orders; this task changed no database definitions. The deployed staging version remains the previous version until a separate rollout.

Subsequent authorized rollout: this revision was deployed to existing staging in `hnd1`, with protection and headers verified. The approved 5 RPS/20-second comparison passed 100/100 requests: p50 211 ms, p95 327 ms, p99 689 ms, max 810 ms. The run was mostly cached (96 hits/four misses); timings indicate warm latency is primarily outside the timed renderer, but do not separate network/protection/platform overhead. Full deployment identity, before/after figures and limits are recorded in [the staging deployment report](staging-deployment-2026-10-22.md#ssr-rollout-and-approved-comparison-run). Catalogue browsing still has two sequential necessary backend reads. Further cold-start/geographic attribution requires separately authorized measurements; no database RPC/schema changes were made from the old aggregate report alone.

## Cold-handler and uncached investigation (2026-10-22)

The owner requested a staging cold-start/uncached investigation and fixes, preserving cart/security behavior and prohibiting live-domain traffic, orders and inventory edits. The investigation issued six sequential public diagnostic reads against the previous staging revision, then deployed the verified changes and issued six sequential diagnostic reads on its generated hostname. Five stable-host smoke reads and one anonymous protection check followed. There was no remote load test, synthetic scale-out, cron warm-up, database migration or business write. The generator did not fetch browser JavaScript or assets.

### Findings and fixes

The previous revision's uncached product probe spent 725.51 ms loading data and 0.44 ms rendering; its repeat was a cache hit with 0.04 ms SSR and 203 ms end-to-end latency. An informational page with no upstream reads still took 637 ms end to end despite 0.46 ms timed SSR. These are single observations, not percentiles or evidence of a VM cold start.

- **Cache fragmentation:** accepted but unused product/static query parameters, repeated filters, equivalent numeric bounds and default values generated distinct HTML-cache keys. SSR now canonicalizes effective inputs, removes unused arguments and duplicates, normalizes prices/pages/default sort and sorts filter sets. Distinct filters/pages remain isolated; canonical links and pagination use the normalized query. No cache lifetime extension or stale content serving was added.
- **Sequential timeout multiplication:** catalogue selection and hydration previously each received a fresh four-second timeout. One route could therefore wait close to eight seconds. One four-second data deadline now spans both stages, including shared-read waits. On cancellation, a read is aborted only when no route still needs it. Old cancelled tasks cannot delete replacement pending entries. Failed HTTP bodies are cancelled to release connections. Failures remain uncached 503 responses with no upstream details or demo fallback.
- **Unnecessary relation rows:** product reads now filter active variants and approved `product-public` image rows on the server, using the same public selection/mapping and published-product filter. The mapped public product/variant shape is unchanged; embedded filters do not use `!inner`, so a product without an approved image is not silently removed. No inventory/availability query was added.
- **Cold-path visibility and write rejection:** `server/runtime.mjs` shares one handler initialization across concurrent first requests, retries initialization failure and rejects non-GET/HEAD methods before loading the renderer. HEAD initialization errors have no body. Both Vercel and the local HTTP server use this wrapper. Existing SSR/private/no-store behavior remains intact.
- **Phase diagnostics:** fixed-name `catalog`, `products` and `policy` durations accompany uncached data reads. `boot` is INIT (first application-handler initialization), WAIT (another request waiting for that initialization), or READY (handler already initialized). `init` measures the current request's wait for initialization and `app` measures entry-point-to-response-header work. These exclude platform work before entry-point invocation, and do not equate cache MISS with cold process. Values contain no credentials, raw errors, visitor state or request IDs. Private routes may report fixed bootstrap timings but still do no public backend reads or serialization of personal state.

### Fresh-process local evidence

`npm run test:ssr:uncached` builds optimized isolated server output and starts three separate Node processes. Every upstream network call is forbidden; injected public reads wait nominally 25 ms and return catalogue fixtures. Each process checks a first INIT/product MISS, a logically equivalent product URL served from cache with zero upstream reads, and two different uncached browse queries with two reads each. The profile uses the real runtime wrapper, handler, compiled renderer and public mapper.

Observed handler initialization was 19–21 ms. First product invocations were 95–101 ms overall; those include initialization, local Web API/ICU startup and the fixture delay. Equivalent cached product requests were below 0.3 ms. Browse misses were 57–68 ms. These are three deterministic workload reproductions with variable local scheduling, not cloud latency predictions or a proof of hosted cold-start improvement. Full output: ignored `scripts/out/ssr-profile/report.json`. CI now runs this command after the production build and bundle checks.

### Hosted diagnostic evidence and limits

New staging deployment `dpl_qsdZj6Sv3HK3juLS3Ms6SVHar8L2` is READY in Tokyo; authoritative alias inspection confirms `o-ld-verge.vercel.app` points to it. All 162 deployed application source files matched the prepared manifest. All Deployments authentication, noindex and no-store remained enabled.

The new generated-hostname probes deliberately had **no homepage preflight**. All six returned HTTP 200 with protected staging headers and actual backend SSR content. However, every response reported **boot READY**, so this run did **not capture an application INIT or a confirmed hosted VM cold start**. A new deployment does not guarantee that the next agent request is the first invocation. No additional redeployments or bursts were used to force a cold instance.

| Uncached probe | Backend selection | Product hydration | HTML render | End to end |
| --- | ---: | ---: | ---: | ---: |
| Product | — | 113.09 ms | 0.82 ms | 1,066 ms |
| Price-sorted watches | 484.01 ms | 160.82 ms | 0.62 ms | 1,118 ms |
| Search | 93.30 ms | 71.03 ms | 0.39 ms | 620 ms |

The corresponding search hit took 210 ms with 0.12 ms application work. The static about page took 494 ms with 0.55 ms application work. Stable-host post-alias smoke checks measured a 155.59 ms homepage data miss and a 60.65 ms product data miss; real name/price/variant/image data, unknown-product 404, account isolation and legacy redirect checks passed. No indexability or access protection was relaxed for speed.

These samples show variable upstream and platform/transit costs dominate the observed responses; HTML rendering is small. The `catalog` and `products` phases include network/TLS, Supabase gateway/database work, body transfer/parsing and mapping, so they do **not** isolate SQL time or prove the catalogue query is CPU-bound. Catalogue pages still require selection followed by hydration under the existing API. There is insufficient evidence to justify a new database RPC/index or provider tier change from these samples alone. No percentage improvement is claimed from unlike single before/after probes or different generated/stable hostnames. True hosted cold-start distribution and upstream SQL/gateway attribution remain unmeasured.

Artifacts: `scripts/out/ssr-diagnostics-2026-10-22T18-54-01-225Z.json` (before), `scripts/out/ssr-diagnostics-2026-10-22T19-04-05-385Z.json` (instrumented revision), `scripts/out/ssr-cold-staging-deployment.json` (sanitized alias/region), and `scripts/out/ssr-staging-after-load-verification.json` (latest smoke check, despite its historical filename).

Validation: **266 tests passed**, including 13 added regressions and existing cart/security coverage. Lint, client/server production builds, bundle budgets, secret scan and whitespace checks passed. Initial browser closure remains 172.4 KiB gzip and the server entry is approximately 250.7 KiB raw, within its 350 KiB budget. Local HTTP test: 200/200 GETs at 10 RPS for 20 seconds, no failures/skips, p95 21.64 ms. This phase changed no CSS, layouts, transaction code or SQL. Responsive device/Safari/Firefox checks and the order-creating database integration suite were not rerun.

## Supabase attribution and provider cold-start evidence (2026-10-22)

The owner requested further Supabase investigation, actual hosted cold-start measurements, verified fixes and tests. The owner subsequently chose **sequential diagnostics only**, declining a proposed bounded scale-out burst. No such burst was executed. No orders, inventory changes, live-domain traffic, database definitions, RLS changes, paid upgrades or gateway settings were involved.

### Supabase measurements

Read-only inspection of the existing project's Query Performance report found these cumulative `pg_stat_statements` figures (dashboard-rounded milliseconds):

| Statement family | Calls | Mean SQL execution | Maximum SQL execution |
| --- | ---: | ---: | ---: |
| PostgREST `catalog_page`, full browse arguments | 61 | 13 ms | 92 ms |
| Common embedded product read | 63 | 2 ms | 17 ms |
| Another embedded product-read shape | 9 | 12 ms | 46 ms |

These are cumulative statement statistics, not end-to-end HTTP timing or a matched trace of a particular slow request. They do not justify a new index, connection limit or paid compute upgrade. A loopback HTTP reproduction confirmed six sequential uncached public reads reused one TCP connection, as did native fetch; the shared reader did not exhibit a reconnect-per-read problem. A regression now checks that behavior.

The dashboard displayed an incident banner. Supabase's official [API Gateway Request Issues incident](https://status.supabase.com/incidents/01M5J8ZQ04EZXAYF10Q75MGC1T) was **Monitoring / Degraded performance** at inspection and explicitly listed Tokyo (`ap-northeast-1`) Data APIs. The provider described demand on its backplane and ongoing mitigations. This is a relevant environmental confounder, not proof that it caused any particular project's request or that all remaining delay is in the gateway.

Backend reads now report separate fixed-name `*_headers`, `*_body` and `*_json` durations for catalogue/product/policy phases. Header wait includes connection/TLS, gateway, queueing and database execution; body time covers bounded transfer; JSON time covers decoding/parsing. Optional numeric Kong proxy/upstream timings are accepted only when present, finite, non-negative and at most 60 seconds. [Kong documents these as proxy processing and upstream response-header times](https://developer.konghq.com/gateway/tracing/), not pure SQL timings. Raw headers, tokens, cookies, URLs and error text are never reflected. Current hosted Supabase responses did **not** expose these optional gateway durations; missing metrics remain absent, not zero, and no gateway configuration was changed.

Latest normal staging generated-hostname samples:

| Read phase | Header wait | Body transfer | JSON decode/parse |
| --- | ---: | ---: | ---: |
| Product miss | 103.38 ms | 0.88 ms | 0.09 ms |
| Watches catalogue selection | 38.71 ms | 0.93 ms | 0.09 ms |
| Watches detail hydration | 41.27 ms | 0.77 ms | 0.10 ms |
| Search catalogue selection | 42.11 ms | 0.68 ms | 0.06 ms |
| Search detail hydration | 37.92 ms | 0.62 ms | 0.05 ms |

These isolate the remaining measured cost to waiting for upstream response headers rather than response size/parsing, but do not split network versus gateway versus database queueing. Stable-host smoke checks subsequently measured 110.55/74.95 ms header waits for home selection/hydration and 56.52 ms for a product read; bodies were under 1 ms. Single sequential samples during a provider incident are not a latency distribution or an improvement guarantee.

### Cold-path controls: what was and was not measured

Two protected Preview controls were created in the existing Vercel staging project, using the same staging backend and Tokyo region. Neither moved the stable hostname, changed project-wide settings, disabled authentication or touched custom domains:

1. Normal Fluid Preview: `dpl_6whkcrr5HpU3cRn4HnNBjae3ekER` at `o-ld-verge-jnkxau60i-abdullah-f9b8.vercel.app`.
2. A separate Preview configured with `fluid:false` in the ignored control payload only: `dpl_7tuN5khyEHGm6fMEKR3zqjc5txoJ` at `o-ld-verge-id7d58jq1-abdullah-f9b8.vercel.app`. That temporary override was immediately restored in the local payload, and was never put into the repository or main staging deployment.

Each received exactly six sequential public GETs, without preflight or a load burst. Their first application invocations reported INIT:

| Control first product request | Client total | Handler initialization | Data load | HTML rendering | Application total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Normal Fluid Preview | 2,160 ms | 35.63 ms | 1,087.74 ms | 61.53 ms | 1,186.52 ms |
| `fluid:false` Preview control | 1,722 ms | 54.90 ms | 573.20 ms | 137.11 ms | 766.83 ms |

Crucially, Vercel's individual normal-Preview log classified the first request **Hot (prewarmed)**, despite application INIT. The non-Fluid individual log exposed 799 ms execution duration and bytecode-cache Miss, but no Start Type or provider initialization duration. Preview-wide provider metrics for these 12 invocations showed **10 Hot and two Prewarmed, zero Cold**. Thus neither INIT, a fresh deployment, a bytecode miss nor the non-Fluid control provides a verified true platform-cold duration. No such duration is claimed.

Production-wide historical metrics at an earlier inspection showed 2.8% Cold among 251 invocations over 12 hours, across earlier revisions. Individual old records expired under the account's short log retention before they could provide cold-duration attribution. Those aggregates cannot be used to assign a cold duration to the current revision or to any particular diagnostic request. Vercel's [runtime logs documentation](https://vercel.com/docs/logs/runtime) distinguishes function Start Type from ordinary invocation duration; [Fluid documentation](https://vercel.com/docs/fluid-compute) describes automatic prewarming and bytecode optimization. TTFB charts marked Demo Data were not used as measurement evidence.

`scripts/cold-start-evidence.mjs` and regression tests enforce this distinction: only an explicit provider Cold classification confirms a platform cold event; application INIT is recorded independently, and unknown/missing/invalid provider durations remain null. A measured on-demand/platform Cold-duration distribution remains **unavailable** under the sequential-only observations. Further scale-out probing was explicitly declined, so no repeated redeployments, concurrent burst or project-wide runtime downgrade was used to chase a cold sample. The controls remain protected and were not promoted to normal staging.

### Verified cold-render fix and rollout

First rendering in the hosted controls took 61–137 ms; fresh local processes previously spent approximately 20 ms in first rendering. The SSR public page called `toLocaleString('en-PK')` on each price, invoking ICU on the cold path. It now uses the existing shared `formatPrice` helper. The helper directly groups non-negative safe whole-PKR integers without locale initialization; decimals, negatives, negative zero, strings, NaN and Infinity retain the existing Intl fallback. Price arithmetic, cart quantities, variant mapping, checkout behavior and payment amounts are unchanged. Tests compare boundary/large integer output against Intl and verify the whole-PKR path does not initialize Intl.

With the optimized compiled renderer, three fresh local processes measured first render at **4.75–8.22 ms**. This verifies a local cold-render improvement, not a cloud cold-start percentile. Hosted normal staging render samples after rollout were 0.34–0.81 ms on already initialized handlers and cannot establish hosted cold-render improvement by themselves.

Current normal staging deployment: **`dpl_JDFxewQ94MdnM4EdgRQHL1KcCuzP`**, READY in Tokyo, generated hostname `o-ld-verge-9mo4ajh63-abdullah-f9b8.vercel.app`. Deployment used `--prod --skip-domain`; only `o-ld-verge.vercel.app` was explicitly moved, and the authoritative alias API verified that mapping. Normal project Fluid configuration remains unchanged. The source payload did not include the control override. All Deployments authentication, noindex and no-store stayed enabled. Six sequential detailed diagnostics and the five normal smoke cases plus anonymous protection check passed actual price/variant/image content, 404, private account isolation and redirect handling.

Validation: **273 tests passed** (seven new cases for provider evidence, gateway parsing, transport timings, connection reuse and price-formatting behavior), including existing cart/security suites. Lint, production client/server builds, bundle budgets, secret scan and diff checks passed. Initial browser JavaScript remains 172.4 KiB gzip; server entry is about 251.4 KiB raw. Three fresh-process fixtures passed with real upstream I/O prohibited. Local HTTP load passed 200/200 at 10 RPS/20 seconds, zero failures/skips, p95 18.76 ms. No order-creating database integration tests were run. Responsive/Safari/Firefox browser sweeps were not repeated; HTML and shared-formatting regressions plus read-only hosted smoke checks cover this narrow change.

Evidence remains in ignored `scripts/out/`: `supabase-latency-evidence.json`, `supabase-latency-deployment.json`, `ssr-diagnostics-2026-10-22T20-36-27-881Z.json`, `ssr-diagnostics-2026-10-22T20-39-05-818Z.json`, `ssr-diagnostics-2026-10-22T20-45-38-173Z.json`, `ssr-profile/report.json`, `load-local.json`, and the latest sanitized stable-host smoke report. There is no true hosted-cold duration field filled with an estimate or a local measurement.
