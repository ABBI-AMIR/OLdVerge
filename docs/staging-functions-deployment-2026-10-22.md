# Supabase staging functions and Auth rollout — 2026-10-22

Completed at the owner's explicit request after the integration audit. Target: existing Supabase project `qeczhyiwgvglilwqbveh` (ABBI-AMIR's Project, Tokyo). No new project, Vercel deployment, database migration, DNS change, hosted order, inventory adjustment, upload or email was performed.

## Changes applied

- Deployed the 12 previously absent Edge Functions from the current repository using official Supabase CLI 2.121.0 and its API bundler. Every function is **ACTIVE, version 1**: quote-order, create-order, order-status, submit-contact, newsletter-subscribe, newsletter-unsubscribe, newsletter-confirm, maintenance, process-outbox, payment-webhook, admin-upload-image, admin-approve-image.
- Used explicit project targeting and named functions, one deployment job at a time. No prune, seed, database push or reset. No existing functions were overwritten because the initial deployment inventory was empty.
- Preserved repository `verify_jwt=false` settings. These are required for publishable API-key routing; customer/admin/cron authorization remains enforced by the shared handlers and database. No handler authorization, MFA, RLS or bot verification was disabled.
- Configured server-only `TOKEN_SECRET` using a cryptographically random 64-byte source and `ALLOWED_ORIGINS` restricted to `https://o-ld-verge.vercel.app`. No prior custom secrets existed. Secret values were not printed; the temporary ignored input file was removed in a finally block and absence was checked afterward.
- Did **not** enable `ORDER_TEST_MODE` bot bypass, configure a cron secret/scheduler or add an email/payment provider. Production-style write handlers continue to fail closed without required bot protection. Deploying maintenance does not execute it.
- Supabase Auth Site URL now uses `https://o-ld-verge.vercel.app`. Added exact recovery callback `https://o-ld-verge.vercel.app/account/reset-password`; retained four pre-existing generated-alias entries. Reloading the dashboard confirmed the saved Site URL and five redirect entries. No broad new wildcard was added.

## Verification

| Check | Result |
| --- | --- |
| Official CLI target identity | Existing Tokyo project, ACTIVE_HEALTHY |
| Deployment inventory | All 12 named functions ACTIVE at version 1, expected JWT routing configuration |
| Sequential GET to each function | All 12 returned HTTP 405 with `method_not_allowed`, request ID, no-store, and exact staging CORS origin; the former quote-order 404 is resolved |
| OPTIONS to each function | All 12 returned 204 with the expected staging CORS origin and POST allowance |
| Untrusted-origin preflight | No Access-Control-Allow-Origin header, as intended |
| Ordering setting before and after checks | `ordering_enabled=false` both times |
| Relevant local regressions | 43 tests pass across API, Auth and security suites |
| Secret input cleanup | No temporary staging function env files remain |

Verification used only sequential GET and OPTIONS requests plus public read-only settings queries. The shared handler rejects GET before rate-limit RPCs or business actions; OPTIONS returns before business actions. No function POST was sent, including maintenance/outbox. This establishes deployment, runtime initialization, method handling and CORS; it does **not** establish a successful hosted checkout, email delivery, payment event, authenticated admin operation or upload.

Local ignored evidence:

- `scripts/out/staging-functions-deployed-2026-10-22.json`: selected non-secret function metadata.
- `scripts/out/staging-functions-readonly-verification-2026-10-22.json`: all read-only HTTP results and ordering flags.
- `scripts/out/staging-functions-source-manifest-2026-10-22.json`: SHA-256 source manifest for the deployed local functions.
- `scripts/out/staging-auth-redirects-2026-10-22.png` and `staging-auth-callback-2026-10-22.png`: dashboard evidence.

## Remaining work and rollback

Ordering remains closed. Custom SMTP is still disabled; no commerce/newsletter mail adapter or online payment provider was added. The missing migration ledger and full hosted schema-definition comparison remain unresolved. Hosted customer/admin write journeys remain unverified and require separately established test accounts, recipient safeguards, test data boundaries and bot configuration. A frontend rollout of the latest local API/password fixes was not included.

The earlier [integration audit](integration-audit-2026-10-22.md) is a dated baseline; its missing-function and staging-redirect findings are resolved by this rollout, while its other launch blockers remain. `oldverge.com` and all GoDaddy/Vercel domain settings remain untouched.

For future rollback, retain this source manifest and redeploy the last reviewed compatible function sources to the same staging project. There is no prior function version in this project to restore before version 1. Keep ordering closed and investigate failures before any destructive function deletion or secret rotation; rotating the signing secret can invalidate previously issued capabilities. The previous Auth Site URL was the generated project alias, and this rollout added only the exact stable callback; restoring those old settings would intentionally reintroduce the recovery mismatch. No database or DNS rollback is required because neither changed.
