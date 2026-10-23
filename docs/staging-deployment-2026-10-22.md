# Staging deployment — 2026-10-22

## Deployment identity

- Project: `abdullah-f9b8/o-ld-verge` (`prj_KLAre72Wg19Cmhz16wsanrI8Ftwv`).
- Stable staging URL: https://o-ld-verge.vercel.app
- Current verified deployment: https://o-ld-verge-9mo4ajh63-abdullah-f9b8.vercel.app
- Dashboard: https://vercel.com/abdullah-f9b8/o-ld-verge/JDFxewQ94MdnM4EdgRQHL1KcCuzP
- Deployment ID: `dpl_JDFxewQ94MdnM4EdgRQHL1KcCuzP`, state `READY`, execution region `hnd1` (Tokyo).
- Previous cold/uncached revision: `dpl_qsdZj6Sv3HK3juLS3Ms6SVHar8L2` (Tokyo).
- Previous SSR comparison deployment: `dpl_DQ37GSYVYgaYeh5Vs88ojphzfpiY` (Tokyo). Its load results below apply to that revision, not the newer cold/uncached revision.
- Previous baseline deployment: `dpl_8xkZNgyXtspskodn8aj6NMquChyC`, execution region `iad1` (Washington, D.C.).
- Platform target: Vercel Production, within the project explicitly designated staging. Runtime deployment tier is `staging`.
- Source: current local application files, uploaded with the official Vercel CLI. No Git commit, branch push or main merge was performed. The upload manifest is ignored local output at `scripts/out/staging-deploy-manifest.json`.

`scripts/prepare-staging-deploy.mjs` assembled 161 application source/asset files in an ignored upload folder. Environment files, credentials, Git history, reports, conversation files, tests and unrelated working files were excluded. The payload secret scan passed. The CLI link and authentication files are local and excluded from upload. Both client and server builds completed on Vercel with Node 24.x.

Deployment used `--prod --skip-domain`, followed by explicit assignment of **only** `o-ld-verge.vercel.app`. No custom domain, GoDaddy setting or `oldverge.com` record was changed.

## Approved database migrations

The owner explicitly approved applying these files to existing staging project `qeczhyiwgvglilwqbveh`:

1. `20261022000100_cart_sync.sql`
2. `20261022000200_security_operations.sql`
3. `20261022000300_catalog_paging.sql`

They were applied together in a transaction through the authenticated Supabase SQL editor. Before execution, schema inspection confirmed the new objects were absent. The editor contents were verified against the exact source files after normalizing line endings. An earlier malformed editor submission failed to parse and applied no changes. The successful transaction verified the cart replacement RPC, address RPC, catalogue RPC and private newsletter confirmation table exist. No seed scripts or transactional RPCs were executed. These were manually applied migrations; the pre-existing dashboard migration history was empty, and no CLI migration history was fabricated.

Read-only public API checks subsequently confirmed `catalog_page` works and `ordering_enabled` remains `false`. No orders were created and no inventory records were edited.

## Verification

| Check | Result |
| --- | --- |
| Local regression tests | 245 passed |
| Lint | Passed |
| Client/server production build on Vercel | Passed |
| Initial JavaScript budget | 172.4 KiB gzip; below 200 KiB limit |
| Runtime dependency audit | Zero vulnerabilities with `npm audit --omit=dev` |
| Homepage GET | 200, public SSR content and hydration snapshot |
| Known product GET | 200, real name, PKR 16,900 price, variant and approved images in server HTML |
| Unknown product GET | 404 |
| Account shell GET | 200, client-private rendering, no hydration snapshot containing personal data |
| Legacy collection URL GET | 308 to `/shop` |
| Staging headers | `X-Robots-Tag: noindex, nofollow` and `Cache-Control: no-store` |
| Anonymous staging access | Redirected to authentication (302) |
| Stable-host browser check | Product hydrated with correct image and PKR 16,900 price; buying controls disabled; no captured console warnings/errors |
| Published image request | 200 with `image/webp` after uploading missing staging assets |

The machine-readable smoke report is ignored local output at `scripts/out/staging-smoke.json`. Only a handful of individual public GET requests and browser navigation were used, with no load generator or transaction submissions.

The first deployment exposed an SSR-only defect: multiline raw PostgREST selection strings resulted in base product columns without variant/image relations, giving zero prices in initial HTML. The server now compacts the selection like the browser SDK. Regression assertions cover the compact relation query and rendered price; the final deployment was checked for real variant/image data, rather than HTTP status alone.

## Missing staging assets resolved

Visual inspection caught broken product images despite correct image references in HTML. The existing `product-public` bucket was empty, while the database already referenced the repository's sample image paths. `scripts/migrate-assets.mjs` validated all 31 existing source assets, then uploaded 31 missing objects to `product-private` and the same 31 objects to `product-public` in the confirmed development-only project. Existing object overwrites were disabled. No catalogue rows, prices, inventory, orders, bucket visibility or storage policies were modified.

The uploader used an existing staging server credential privately; no key was created, rotated, printed or included in application sources. Vercel correctly refused to export sensitive Production variables. Its temporary placeholder export was removed. The upload credential was subsequently retrieved through the owner's authenticated Supabase dashboard, used via a temporary OS file outside Git, and deleted immediately after execution; deletion was verified. The clipboard was cleared. The upload report is ignored output at `scripts/out/staging-assets-deployed.json` and confirms 31 successful private and 31 successful public uploads.

## Scope and remaining limits

All Deployments authentication remains enabled. The official CLI generated an automation bypass credential for authenticated HTTP checks; it is kept outside the source payload and has not been printed in reports. Existing database/service-role credential scopes were not broadened.

The npm build log reports existing development-tool dependency advisories; the runtime-only audit is clean. No force upgrades were performed.

Supabase Edge Functions were not redeployed as part of this Vercel deployment. Payments, newsletter delivery, sign-in redirects, checkout/order submission, inventory changes and production capacity were not validated. Ordering remains closed. The owner subsequently approved the single bounded staging load test recorded below; further runs require new authorization.

## Approved staging load test

On 2026-10-22 at 11:32 PDT, the owner explicitly authorized one read-only test of `https://o-ld-verge.vercel.app` at **5 requests per second for 20 seconds**. The run used the existing project automation credential in memory; All Deployments authentication remained enabled and no access settings were modified.

| Measurement | Result |
| --- | --- |
| Planned/completed load requests | 100 / 100 |
| HTTP status | 200 for all 100 |
| Failed/skipped | 0 / 0 |
| Median latency | 379 ms |
| p95 latency | 814 ms |
| p99 latency | 1,972 ms |
| Maximum latency | 2,281 ms |
| Peak in-flight requests | 8 (configured cap) |
| HTML response bytes | 1,413,175 |
| Configured pass criterion | No failures/skips and p95 below 1,500 ms: passed |

The paths were `/`, `/shop/watches`, `/search?q=watch`, and `/product/casio-a168`, rotating evenly across the 100 GETs. One additional authenticated health-check GET was excluded from latency statistics. No browser JavaScript, linked images, stylesheets, or fonts were loaded by the generator. Public SSR may read its staging Supabase backend; no direct database load test or business write was performed.

No requests were sent to `oldverge.com`. No orders were created, inventory modified, forms submitted, or deployments changed. This is one small HTML/SSR/cache test, not evidence of production capacity or checkout throughput. The p99 and maximum show that a few responses still approached two seconds despite the passing p95.

The full report is ignored output at `scripts/out/load-staging-2026-10-22.json`. `scripts/load-staging.mjs` validates the fixed project and protected origin, permits GET only, keeps the existing credential out of logs/files, and requires an explicit `--run-approved` flag. The flag does not substitute for fresh user authorization. Lint passed after adding the runner.

## SSR rollout and approved comparison run

The owner explicitly authorized deployment of the SSR fixes and one additional read-only staging test at 5 requests/second for 20 seconds. On 2026-10-22 the official CLI uploaded the current application source to the existing project with `--prod --skip-domain`. The build produced a 255.30 kB SSR entry. Vercel metadata verified the new deployment is READY in Tokyo (`hnd1`); the build machine itself remained in Washington, which is separate from function execution placement.

Only `o-ld-verge.vercel.app` was explicitly reassigned to the new deployment. Vercel also maintains the project's generated `o-ld-verge-abdullah-f9b8.vercel.app` alias. The authoritative alias API confirmed the stable staging hostname maps to the new deployment ID. The deployment API's original `alias` list does not include the subsequently assigned stable alias, so it was not used as the sole verification source. No custom domain assignment, DNS operation or oldverge.com request was made.

Preflight confirmed the new deployment's public SSR, no-store/noindex headers and anonymous authentication redirect. All Deployments protection stayed enabled and the existing automation credential was reused only in memory. After the load test, five stable-host smoke checks passed: home/product SSR (including PKR 16,900 and variant/image data), unknown-product 404, account client-private shell without snapshot, and collection alias 308. Private pages remain no-store. No forms, checkout submissions, database migrations, storage uploads or inventory operations were performed.

The comparison run began at **11:48:46 PDT / 18:48:46 UTC**. Both runs used the same protected origin, four paths, 5 RPS, 20-second duration, concurrency cap of eight, five-second request deadline and full HTML GET checks. Each issued 100 measured GETs plus one excluded homepage preflight; smoke requests were separate. No browser JavaScript/assets were loaded by these checks.

| Measurement | Before SSR fixes | After SSR fixes | Reduction |
| --- | ---: | ---: | ---: |
| Median | 379 ms | 211 ms | 44.4% |
| p95 | 814 ms | 327 ms | 59.9% |
| p99 | 1,972 ms | 689 ms | 65.1% |
| Maximum | 2,281 ms | 810 ms | 64.5% |
| Completed | 100/100 | 100/100 | — |
| Failed / skipped | 0 / 0 | 0 / 0 | — |
| Peak concurrency | 8 | 5 | — |

The second run passed the same criterion (zero failed/skipped; p95 below 1,500 ms). All responses were HTTP 200. It recorded 96 process-cache hits and four misses. Product data loading on its measured miss took 70.69 ms; browse misses took 115.40–175.44 ms. Measured HTML/React rendering on misses took 0.48–1.38 ms. Hit SSR median was 0.04–0.05 ms per route, whereas end-to-end medians remained roughly 207–215 ms. This suggests remaining warm-response time lies primarily outside the timed renderer (transit, deployment protection, platform scheduling/initialization); it does not distinguish those components. There is no pre-change phase data to attribute the improvement separately to region placement, reduced reads, or bundle size.

Both are small, mostly warm-cache runs from one client. They show an observed improvement under this workload, not a production-capacity result, broad geographic benchmark or statistical proof of cold-start behavior. The previous baseline JSON was preserved; the runner now creates a timestamped report per approved run rather than overwriting it.

Artifacts (ignored local output):

- `scripts/out/load-staging-2026-10-22.json` — original baseline.
- `scripts/out/load-staging-2026-10-22T18-48-46-200Z.json` — new detailed report.
- `scripts/out/ssr-staging-load-comparison.json` — exact values and calculated reductions.
- `scripts/out/ssr-staging-deployment.json` — sanitized region/alias verification.
- `scripts/out/ssr-staging-before-alias-verification.json` and `scripts/out/ssr-staging-after-load-verification.json` — sanitized HTTP checks.

Before rollout, all 253 regression tests and lint passed, preserving cart/security coverage. Bundle budgets and secret scans passed; both client and server production builds completed on Vercel. The existing seven development-tool advisories remain reported by installation; no force dependency upgrades were performed. No further remote load runs are authorized by this completed one-run request.

## Subsequent cold/uncached SSR revision

The owner's next request authorized staging cold/uncached investigation and fixes. The latest deployment identity above contains canonical public cache keys, a shared whole-route data deadline, safe cancellation/response-body cleanup, filtered public relation reads and bootstrap/backend phase instrumentation. It was deployed to the same protected project with `--skip-domain`, then only the stable staging vercel.app alias was explicitly moved. READY/Tokyo/alias mapping and manifest equality were verified. Cart/security code was preserved, with 266 regression tests passing. There was no new remote load test; six sequential diagnostics before the changes and six on the new generated hostname, plus normal protected smoke checks, were used. No database definitions, orders, stock or custom domains were changed. See [cold/uncached findings and limitations](ssr-and-load-testing.md#cold-handler-and-uncached-investigation-2026-10-22): the hosted probes all observed an already initialized handler, so they do not establish true hosted cold-start performance.

## Supabase attribution and cold-render revision

The current deployment additionally contains safe upstream header/body/JSON timing and the verified whole-PKR cold-render optimization. 273 tests passed. Query Performance showed catalogue SQL mean 13 ms/max 92 ms and a common product query mean 2 ms/max 17 ms; no database index/configuration changes were justified or applied. An active Supabase API Gateway incident included Tokyo and confounds comparisons.

Two protected Preview controls were retained for diagnostic evidence, one with a temporary per-deployment `fluid:false` payload override. Normal staging Fluid settings were preserved. Each control received six sequential GETs; the provider Preview aggregate classified ten Hot and two Prewarmed, no Cold. Application initialization was captured, but a true provider cold duration was not. The owner declined a proposed scale-out burst and selected sequential diagnostics only. No burst was run. Full evidence, control IDs and limits: [Supabase and provider cold-start evidence](ssr-and-load-testing.md#supabase-attribution-and-provider-cold-start-evidence-2026-10-22). Oldverge.com, orders, inventory, database definitions, authentication protection and custom domains were untouched.
