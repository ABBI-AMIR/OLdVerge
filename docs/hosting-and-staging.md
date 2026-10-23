# Hosting verification and safe staging

## Verified on 2026-10-22

| Evidence | Finding | Limit |
| --- | --- | --- |
| Public DNS lookup | `oldverge.com` A record: `23.227.38.65`; `www.oldverge.com` CNAME: `shops.myshopify.com` | These match Shopify's documented connection targets. They do not prove that this repository is deployed there or that a working store exists. |
| Nameservers | `ns53.domaincontrol.com`, `ns54.domaincontrol.com` | Consistent with GoDaddy DNS; domain registration does not establish application hosting. |
| Repository deployment config | `vercel.json` targets Vercel, Vite client output and a Node SSR function | Intended deployment platform, not proof of an existing deployment. |
| Authenticated Vercel dashboard | Workspace Abdullah (`abdullah-f9b8`), project `o-ld-verge`, repository `ABBI-AMIR/OLdVerge`; ready deployment from main commit `bc33237`, hostname `o-ld-verge.vercel.app` | Existing deployment predates local fixes. No new deployment was performed. |
| Authenticated Supabase dashboard | ABBI-AMIR's Org, project ABBI-AMIR's Project (`qeczhyiwgvglilwqbveh`), healthy in Tokyo (`ap-northeast-1`) | Project URL matches local configuration. Schema and migration state have not been remotely tested. |
| HTTPS check | HEAD requests could not complete from this execution environment | Website availability, TLS status and Shopify account attachment remain unverified. No certificate checks were bypassed. |

Shopify documents these DNS targets in [Connecting a third-party domain manually](https://help.shopify.com/en/manual/domains/add-a-domain/connecting-domains/connect-domain-manual). No DNS records, deployments, remote database records, orders or inventory were changed during this work. No load was sent to the domain or Supabase.

## Staging setup prepared in this repository

The owner confirmed that both existing projects contain development data only, with no real customers or orders, and explicitly selected them for staging. **Reuse the existing projects; do not create replacements.** No production Supabase backend is currently designated. Keep `oldverge.com` and GoDaddy records untouched.

1. Use the verified Vercel project above. Its project settings show Vite, root directory empty, output `dist` and Node 24.x. The dashboard warns that deployed settings differ from current project settings. Do not redeploy or push code yet; inspect these differences before any later deployment approval.
2. Use the verified Supabase project above as staging. No schema changes, migrations, seed runs, order submissions or inventory edits are authorized in this configuration phase. Do not copy production data into it.
3. Keep `vercel.json` checked in: `npm ci`, `npm run build`, output `dist`. The build also creates `server-dist/entry.js`; `api/render.js` includes the server bundle, HTML template and public config in its function. Do not publish `server-dist` as static content. Both Node 22.13+ and 24 are supported by the repository.
4. **Verified saved:** Vercel Authentication is enabled with **All Deployments**, protecting even the project's Production hostname. The platform's Production label does not make this a business production environment. See [Vercel deployment protection](https://vercel.com/docs/deployment-protection).
5. Staging configuration is saved in Production, Preview and Development scopes. Following owner-completed Vercel email verification, the existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` variables were updated to All Environments; their values were preserved. The frontend explicitly supports these aliases. Privileged integration variables retain their existing scopes; the legacy anon-key aliases were not changed.

| Name | Staging setting |
| --- | --- |
| `OLDVERGE_DEPLOYMENT_TIER` | `staging` |
| `STAGING_SUPABASE_URL` | Verified existing staging Supabase origin |
| `OLDVERGE_PRODUCTION_BACKEND` | `none`, based on the owner's development-only confirmation |
| `PRODUCTION_SUPABASE_URL` | Unset for now; when production exists, set its actual distinct origin and remove the `none` declaration |
| `VITE_SUPABASE_URL` | Same origin as `STAGING_SUPABASE_URL` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public key from staging only; the existing `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` integration alias is also supported |
| `SITE_URL` | Actual generated staging HTTPS origin, after it is known |
| `VITE_CONTACT_FORM_ENDPOINT` | Empty |
| `VITE_TURNSTILE_SITE_KEY` | Dedicated staging site key, only if needed later |
| `VITE_STORE_MODE` | Empty for backend staging |

The build rejects Preview deployments without the staging tier, a frontend URL differing from the declared staging URL, external contact forwarding, an ambiguous production declaration, or a staging/production URL collision. An explicit `OLDVERGE_PRODUCTION_BACKEND=none` permits the current development-only setup; contradictory declarations fail. Server responses in staging have `X-Robots-Tag: noindex, nofollow` and `Cache-Control: no-store`. These checks take effect with the updated code in a future approved deployment. They cannot verify that a supplied key belongs to a project without contacting it.

6. Keep ordering disabled: the `store_settings` row with key `ordering_enabled` must retain its default JSON boolean `false`. Do not invoke the admin operation that opens ordering. Do not deploy checkout/payment/email functions or configure real provider credentials for this read-only phase. Do not enable the maintenance workflow against staging or repoint production workflow secrets. If email authentication is later needed, use staging-only accounts and a non-delivering mail sink. Auth redirect URLs and allowed origins must list only the actual staging origin.
7. The owner subsequently authorized the initial deployment, the three new schema migrations and one 5 RPS/20-second read-only staging load test, followed by the SSR-fix deployment and a second test at the same limits. The protected staging URL is `https://o-ld-verge.vercel.app`; see [deployment and comparison verification](staging-deployment-2026-10-22.md#ssr-rollout-and-approved-comparison-run). The latest deployment is READY in `hnd1` (Tokyo), beside the staging database. Both runs completed 100/100 HTTP 200 responses with no failures/skips; p95 improved from 814 to 327 ms. These two approved runs are complete; further remote load tests require fresh authorization. Order submissions, stock edits and requests to `oldverge.com` remain outside the authorized test scope.

Environment scope guidance: [Vercel environments](https://vercel.com/docs/deployments/environments) and [Supabase integration variable scope](https://supabase.com/docs/guides/troubleshooting/vercel-integration-environment-variables-not-syncing-for-persistent-git-branches-b9191e).

## What remains external

Latest normal staging is `dpl_JDFxewQ94MdnM4EdgRQHL1KcCuzP` in Tokyo with protected alias verification. The Supabase/provider investigation used two isolated Preview controls and found only Hot/Prewarmed classifications; no true hosted-cold duration was established. The owner chose **sequential diagnostics only** and declined a new scale-out burst. Do not generate concurrent bursts without new authorization. See [current evidence and verified cold-render fix](ssr-and-load-testing.md#supabase-attribution-and-provider-cold-start-evidence-2026-10-22).

The subsequent cold/uncached investigation deployed `dpl_qsdZj6Sv3HK3juLS3Ms6SVHar8L2` to the same protected Tokyo staging project and used sequential read-only probes, not a new load run. See [findings and remaining measurement limits](ssr-and-load-testing.md#cold-handler-and-uncached-investigation-2026-10-22). All hosted probes found the application handler already initialized; true hosted cold-start performance remains unmeasured.

The existing projects are designated staging; no new projects were created. All-deployment protection is saved. Staging configuration and public backend aliases cover all three Vercel environments. The application, approved schema migrations, and missing existing sample image files are deployed, and bounded read-only verification passed. Deployment used the official CLI with custom-domain assignment disabled; only the existing `o-ld-verge.vercel.app` alias was explicitly moved to the verified deployment. `oldverge.com` and DNS were not changed. The CLI generated a project automation bypass credential for authenticated smoke requests; it is not in the uploaded application or documentation. Supabase Edge Functions were not redeployed, and transaction flows were not exercised. Ordering remains disabled.

## Local testing authorized now

Run `npm run test:load:local`. It creates optimized client and server artifacts in ignored `scripts/out/load-client` and `scripts/out/load-server`, blanks all public integration defines, verifies demo configuration, and starts a loopback-only server with an upstream fetch implementation that throws on any attempted network access. The load generator makes GET requests to public routes only: 10 requests/second for 20 seconds, maximum 8 concurrent requests, request timeout 5 seconds. It never uses `oldverge.com` or a Supabase endpoint.

The JSON report is `scripts/out/load-local.json`; CI runs the same test and uploads the report. Remote load testing is disabled by default. Do not enable it without new approval specifying the staging URL and request limits. Local demo results measure the Node renderer and its public HTML cache; they do not establish Vercel, Supabase, checkout or production capacity.
