# Production readiness remediation — 11 November 2026

## Boundary and release status

Ordering must remain closed. No orders, emails or inventory writes are needed to validate this patch. Existing projects remain staging. The owner chose separate production projects, then requested configuration preparation only. Do not create projects, buy plans, connect the website domain or enable sales under this task.

This document distinguishes source changes from hosted activation. Passing local tests does not mean the patch is deployed, that live email works, or that a recoverable production backup exists.

## Validation of this patch

- 331 frontend/handler/SSR tests and 128 isolated database tests passed.
- Lint, production client/server build, secret-pattern scan and bundle budgets passed. Full dependency audit reported zero known vulnerabilities for the installed lockfile.
- Three fresh local SSR worker processes passed cold/warm/uncached assertions with real upstream network forbidden.
- The first local load run alongside other tooling completed 59 requests and skipped 141, so it failed. A separate repeat using the already built, isolated fixture artifacts completed 200/200 requests at 10 requests/second for 20 seconds, zero failures/skips, p95 21.37 ms. Neither run contacted staging or production, and neither proves hosted performance.
- Hosted read-only schema export found no drift against the existing baseline; only this patch's new cancellation migration is absent.
- Staging Auth base URL persisted after reload. A read-only query confirmed `ordering_enabled=false`. No orders, inventory writes, emails or DNS changes were performed in this continuation.

## Audit checklist

| Audit item | Current disposition |
| --- | --- |
| Accidentally hosted demo storefront | Build now rejects a Vercel-hosted storefront without a configured Supabase backend. Explicit local/CI demo mode remains for isolated tests. |
| Customer sample/demo copy | Live confirmation no longer falsely says that automatic email is unavailable. Older demo code and seed scripts are retained for tests; they are not a production seed plan. |
| Security headers | CSP, frame denial, MIME protection and permissions restrictions added to SSR and Vercel routes. Verify on deployed HTML and static assets before declaring hosted completion. |
| Development-tool advisory | Lockfile updated to patched Vite and dependency versions. This advisory concerned the development server; do not expose the development server publicly. |
| Sitemap and structured data | Published product/policy sitemap plus Organization and Product/PKR Offer data implemented. Private routes excluded; missing backend data fails closed. Search Console verification remains separate. |
| Large product photos | Repeatable Sharp pipeline generates responsive WebP copies and a checksum manifest. Originals remain unchanged. Stored covers use these copies only with a matching recorded checksum; hosted covers without checksums still need verification and activation. |
| Cancellation email | Migration and matching Edge Functions deployed to staging with Git release 7f9db17. The trigger queues one customer notification on first cancellation; no historical backfill. Live sender activation remains separate. |
| Automatic sending/retries | Worker and bounded retry/backoff code exist. Hosted schedule is not active. `supabase/operations/schedule-order-email.sql` is the explicit activation script, after sender verification. |
| Ambiguous email acknowledgement | Not solved: if Mailtrap accepts an email but its acknowledgement is lost, retry can duplicate it. Database deduplication prevents duplicate queue rows, not duplicate provider deliveries. Do not claim exactly-once delivery. |
| Windows database-test shutdown | Added explicit local PostgreSQL shutdown using the installed package's pg_ctl. All 128 database tests and schema-reference generation exited cleanly on Windows. |
| Schema drift | After staging migration deployment, all 2,210 application schema/permission entries match the 16-migration reference, with no missing, changed or unexpected entries. This scope does not include all Supabase-managed schemas/extensions. |
| IP-header trust | Hosted direct-ingress diagnostics rejected forged CF headers and preserved selected CF identity under XFF/X-Real-IP spoofing. Last XFF was not stable; the follow-up hardening removes that fallback. See hosted-mobile-ip-verification-2026-11-11.md for scope and limitations. |
| Git/release reproducibility | Release 7f9db17 was pushed to the integration branch, passed GitHub CI and deployed directly from that Git source to staging. Main remains unmerged. Later follow-up patches must preserve the same process. |
| Admin, RLS and mutations | Isolated database/API regressions cover existing flows. No exhaustive production penetration test or every-mutation proof. Preserve MFA and service-only mutation boundaries. |
| Mobile/Core Web Vitals | Hosted mobile functional checks and throttled lab audits completed; performance does not pass. Large covers and SSR/client layout movement need work. These are not field CWV results. See hosted-mobile-ip-verification-2026-11-11.md. |
| Monitoring/analytics/Search Console | No verified uptime/error tracking/analytics/Search Console setup. Do not add third-party telemetry without selecting its destination and privacy policy. |
| Database/storage backup and recovery | No verified scheduled backup, offsite object copy or restore rehearsal. Requires the production destination, retention and recovery objectives before activation. A local schema-reference database is not a data backup. |

## Environment configuration to prepare

Never copy privileged database keys into browser-prefixed variables or commit environment values. The frontend is Vite, not Next.js. Integration-created aliases need not be deleted merely because this app does not use them. Review their project/scope and consumers first.

| Location | Names and intended configuration |
| --- | --- |
| Vercel staging public build | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_TURNSTILE_SITE_KEY` for the existing staging backend/hostname only. Existing supported aliases may remain until an approved scoped migration. |
| Vercel staging server/build | `SITE_URL=https://o-ld-verge.vercel.app`, `OLDVERGE_DEPLOYMENT_TIER=staging`, `STAGING_SUPABASE_URL` matching staging. While production does not exist, `OLDVERGE_PRODUCTION_BACKEND=none`. Once created, declare the distinct `PRODUCTION_SUPABASE_URL` and update that declaration consistently. |
| Future Vercel production | Separate project's public Supabase credentials and Turnstile key; `SITE_URL=https://oldverge.com`. Never reuse staging credentials. Keep ordering false in that backend. |
| Supabase Edge server secrets | `TOKEN_SECRET`, `TURNSTILE_SECRET_KEY`, `ALLOWED_ORIGINS` restricted to the project's storefront. Platform `SUPABASE_URL` and server credential variables stay server-only. |
| Live order worker | `ORDER_EMAIL_PROVIDER=mailtrap_live`, `ORDER_EMAIL_SITE_URL`, `ORDER_EMAIL_ADMIN_TO=abbiamir19@gmail.com`, `ORDER_EMAIL_REPLY_TO=oldverge6@gmail.com`, `MAILTRAP_LIVE_FROM` on the verified domain, `MAILTRAP_LIVE_API_TOKEN`, `CRON_SECRET`. Production sender and site must belong to production. |
| Vault scheduler | `order_email_worker_url` matching that project's `/functions/v1/process-outbox`, and `order_email_cron_secret` matching its Edge secret. Never put the token in the SQL file. |
| Auth email | Separate verified live SMTP configuration in the production project's Auth settings. Edge API secrets do not change Auth SMTP. Retain staging sandbox capture. |

`NEXT_PUBLIC_*` variables are legacy aliases here. `POSTGRES_*`, `SUPABASE_JWT_SECRET`, `SUPABASE_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` must never appear in client output. Do not rotate/delete integration credentials without identifying all consumers. Automatic approval review rejected an earlier attempt to overwrite Vercel variables across production/preview/development scopes; no such consolidation was applied.

## Domain and Auth preparation

The inspected root A and www CNAME still point to Shopify. Do not replace them until the separate production Vercel project exists, its exact domain records are shown by Vercel, the zone is reviewed, and owner approval covers cutover and rollback. Do not guess the target IP.

Mailtrap still showed oldverge.com as unverified at the last inspection. Email-only DNS verification had owner approval, but GoDaddy sign-in and Mailtrap sender registration were deferred. Required CNAME targets from that domain's Mailtrap screen were `mt24 → smtp.mailtrap.live`, `rwmt1._domainkey → rwmt1.dkim.smtp.mailtrap.live`, and `rwmt2._domainkey → rwmt2.dkim.smtp.mailtrap.live`; optional tracking was `mt-link → t.mailtrap.live`. Recheck provider instructions before applying. Preserve unrelated mail/DNS records, especially DMARC.

Staging Auth Site URL was corrected to the stable `https://o-ld-verge.vercel.app/` and verified after reload. Its exact `https://o-ld-verge.vercel.app/account/reset-password` redirect remains allowed. Future production should use `https://oldverge.com/` and its exact `/account/reset-password` route. Configure app origins, Turnstile hostnames and email links consistently. Do not point staging recovery emails at production or change production redirects before the target exists.

## The four cancelled tests

| Order | Item/payment | Total PKR |
| --- | --- | ---: |
| OV-261023-06007E7F | Isolated test SKU, test COD | 100 |
| OV-261109-88C63329 | Isolated test SKU, test COD | 100 |
| OV-261110-02A1290B | Isolated test SKU, Allied Bank | 350 |
| OV-261110-22C1DA79 | Black quarter zip S, Allied Bank | 4,449 |

All four were recorded as test and cancelled at the prior hosted check, with stock restored. They are not customer sales; no further order is authorized by this remediation.

## Remaining launch sequence

1. Finish local verification, review source and publish one reproducible Git commit; run GitHub CI. Deploy only to staging under the release authorization and verify headers, routes, approved covers, prices and closed ordering.
2. Reconcile hosted schema definitions and apply reviewed staging migrations without seeds or stock edits. Verify cancellation queue behavior locally rather than creating hosted orders.
3. Resume the deferred Mailtrap sender registration and email DNS work; verify live domain, configure production Auth SMTP and worker secrets, then activate and observe the bounded outbox schedule. A demo-domain owner test is not production customer delivery evidence.
4. When authorized, create separate production projects, copy approved catalogue/content through a reviewed data migration, and verify stock/prices independently. Preserve staging isolation.
5. Select and implement database plus storage offsite backups; restore both into an isolated target and document recovery time, retention, access control and evidence. Configure uptime/error alerts and review mobile/CWV measurements.
6. Cut over DNS and production Auth only after the exact production target is verified. Opening ordering is a separate final owner approval.
