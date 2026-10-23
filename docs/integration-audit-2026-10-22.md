# OLDVERGE — frontend, backend and database integration audit

> Follow-up: [the staging function/Auth rollout](staging-functions-deployment-2026-10-22.md) subsequently deployed all 12 functions and fixed the stable staging Auth Site URL/recovery callback. The missing-function and redirect findings below describe the earlier audit baseline. Other launch blockers and unverified write journeys remain; ordering is still closed.

Audit date: 2026-10-22. Repository: `D:\oldv\oldv`, branch `fix/cart-synchronization`, baseline HEAD `1e121da`. Existing uncommitted cart, security, performance and SSR work was preserved. This audit did not commit, push, deploy, change hosted configuration, create hosted orders, edit hosted inventory, send email, charge payments or change DNS. Initial read-only findings are preserved in [the baseline](integration-audit-baseline-2026-10-22.md).

## A. Overall integration status — Partially Verified

The staging storefront reads real Supabase catalog data, renders public pages on Vercel and hydrates successfully. Local PostgreSQL tests demonstrate persisted carts, addresses, orders, inventory movements, cancellation, access isolation and transaction behavior. **The complete hosted customer journey is not integrated yet:** the staging Supabase project has no deployed Edge Functions. A read-only GET of `quote-order` returns HTTP 404 / `NOT_FOUND`.

Ordering is deliberately closed. Auth redirects omit the stable staging address, custom SMTP is disabled, commerce/newsletter email adapters are absent, and no payment provider is implemented. OLDVERGE is suitable for protected browsing and continued staging work, not launch or real sales.

### Verified environment identity

| Environment | Actual backend / hosting evidence |
| --- | --- |
| Local current production build | `dist/ssr-public.json` resolves the public backend to project `qeczhyiwgvglilwqbveh`. Local browser checks used real staging catalog reads only. |
| Isolated database tests | Temporary loopback PostgreSQL 17, all 14 repository migrations, separate fixture databases, simulated Supabase Auth/Storage transport. No hosted database connection. |
| Vercel Development / Preview configuration | Public Supabase aliases and staging isolation variables exist in each scope. Previously verified same staging project; this audit inspected metadata/scopes, not decrypted every saved value or a fresh Preview build. |
| Existing Vercel platform Production target | Business use is **staging**, project `abdullah-f9b8/o-ld-verge`, protected address `https://o-ld-verge.vercel.app`. Current deployed code predates this audit's local fixes. |
| Real production commerce environment | None established. Owner confirmed existing projects are development-only. `oldverge.com` is not attached to this Vercel project. |

Supabase project: `qeczhyiwgvglilwqbveh`, ABBI-AMIR's Project in org `zqaefbfbjrjxuasxache`. Existing hosting evidence places Vercel functions and Supabase in Tokyo. No provider-verified hosted cold-start duration was obtained in this audit; warm smoke timings must not be described as cold-start measurements.

## B. Frontend integration

React 19, Vite 6.4.4, React Router 7, Zustand 5, Supabase JS 2.118; plain JS/JSX, npm lockfile, Node engine `^22.13.0 || >=24.0.0`, Vercel Node 24.x. No Python backend. Styling uses handwritten `ov-*` CSS and Tailwind 3 Preflight. Existing visual design and generated main CSS hash remained unchanged after the dependency patch.

Entry points: `src/main.jsx` hydrates public SSR state then loads the interactive app; `src/App.jsx` owns routes and bootstrap. `server/entry.jsx` renders public React views; `server/handler.mjs` and `server/runtime.mjs` initialize/call it; `api/render.js` is the Vercel entry; `server/local.mjs` serves the same production handler locally. `src/ssr/PublicPage.jsx` provides public SSR markup. Account, checkout and admin routes use private client shells without customer SSR data.

| Feature | Connection and status |
| --- | --- |
| Collections, category/brand, search, sort/filter | `src/components/BackendBrowse.jsx`, `src/lib/useCatalogPage.js`, `src/data/catalog.js` call `catalog_page`, then fetch published product/variant/image details. Paging is server-side across the catalog; browser detail cache is bounded. Verified local DB paging/filter tests and real staging reads. Browser search for `casio`, ascending price, returned A168 then MTP-1302. Large hosted catalog coverage not verified. |
| Product details and prices/images | `src/pages/ProductPage.jsx`, `src/data/catalogMapper.js`; active variants and approved public images. Hosted A168 showed PKR 16,900 and hydrated without captured warnings/errors. Seven visible images loaded. Availability showed Sold out and ordering-closed notice; no stock was changed to make purchase controls usable. |
| Registration/login/logout/recovery | `src/pages/live/AuthPages.jsx` → `src/lib/auth.js` → Supabase Auth. Session persistence/refresh/PKCE handled by `src/lib/supabase.js`; no auth tokens in Zustand. Unit verified only; no test inbox or authorized hosted test account was used. Hosted redirect configuration currently blocks the intended stable-origin recovery route. |
| Profile and addresses | `AccountPages.jsx` → `pages/live/data.js`: own profile update; `save_customer_address` atomic RPC; own address delete/list. Real local role/RLS persistence and rollback tests pass. Hosted customer UI writes not exercised. |
| Cart | `src/store.js` local persistence; `src/lib/cartSync.js` → `sync_customer_cart` / `replace_customer_cart`. Variant mapping, remote slug hydration, serialized writes, max merge on login, edits during hydration, removals, identity changes, retries and checkout clearing are covered locally. Simultaneous devices retain last completed snapshot semantics, not realtime collaboration. |
| Checkout / confirmation | `LiveCheckoutPage.jsx` → `src/lib/checkout.js` → `callFunction` → quote/create/order-status. Stable idempotency per request; server determines prices. Confirmation capability uses URL fragment. Local unit and real PostgreSQL handler tests pass; hosted function absence blocks use. Buy now keeps the ordinary cart. |
| History, tracking, cancellation | Own history/detail reads use explicit granted columns and RLS; capability lookup uses `order-status`. Customers cannot directly cancel an order in this implementation; requests go through support and an authorized administrator cancels through `admin_cancel_order`. Local cancellation restores stock once. |
| Contact / returns / newsletter | Contact and returns call `submit-contact`; newsletter calls subscribe/confirm/unsubscribe. Database writes/consent tested locally. Hosted functions absent. Newsletter stays pending without a confirmation adapter; no mail delivery claim is justified. |
| Admin | Lazy `src/admin/AdminApp.jsx`, `Auth.jsx`, `api.js`, `pages/*`: membership/MFA gates, stats/orders/products/variants/categories/brands/settings/policies/inventory/exports. Writes are direct RLS-protected operations or admin RPCs. Local permission tests pass; hosted admin login/CRUD/export not verified with an authorized account. |
| Image uploads | ProductImages → admin-upload-image → private bucket; approval function validates and publishes → approved public image row. Local inspection/storage policy tests pass; hosted upload/approval cannot work before function deployment. |

Invalid backend config fails clearly; backend failures do not switch to sample catalog data. Explicit demo builds retain demo products/accounts/shipping in separate modules; CI/local load tests intentionally build that mode. Their success is not evidence of hosted commerce. Public catalog pages may briefly display cached values, but quote/create validate current prices, availability and ordering state again.

## C. Backend integration

`src/lib/api.js` supplies the public routing key and an optional user bearer token. Shared handlers use `supabase/functions/_shared/endpoint.js` for bounded JSON, method checks, persistent rate limits, auth, error mapping and narrowly granted RPCs. Supabase `buildDeps` creates separate trusted service and user clients. `verify_jwt=false` in repository function config relies on handler-side verification; an API key alone never establishes customer/admin identity.

| Function group | Database operation / implementation | Hosted status |
| --- | --- | --- |
| quote-order / create-order | `quote_order`, `create_order`; authoritative prices, shipping rules, locks, idempotency and stock transactions | Not deployed |
| order-status | `get_order_for_access`, hashed capability lookup | Not deployed |
| submit-contact | `submit_contact`; private persisted message, no automatic email | Not deployed |
| newsletter-subscribe / confirm / unsubscribe | subscribe, request/confirm token, unsubscribe RPCs | Not deployed; mail adapter also absent |
| admin-upload-image / admin-approve-image | Image validation, private/public Storage operations and approval RPC | Not deployed |
| maintenance / process-outbox | Cron-secret or admin gated maintenance; outbox claims/sends/finishes only with adapter | Not deployed; scheduler execution/secrets not verified |
| payment-webhook | Explicit HTTP 501 until an adapter verifies raw-body signatures and translates events | No payment provider |

SSR calls public REST/catalog RPC without forwarding visitor cookies or bearer tokens. It bounds upstream time/body size and concurrent misses, coalesces reads, normalizes cache keys and never uses stale successful backend data after failure. This audit's staging smoke observed home backend+render around 127 ms, missing-product SSR around 60 ms and a cached product around 0.2 ms server time. These are individual warm observations, not latency guarantees.

### Trace: product → cart → checkout → confirmation

1. Product URL → `api/render.js` / `server/runtime.mjs` / `handler.mjs` → `server/public-data.js` public product query → `server/entry.jsx` / `PublicPage.jsx` → escaped HTML and public snapshot.
2. `src/main.jsx` / `App.jsx` → catalog mapper → `ProductPage.jsx` selection → `src/store.js` cart line using variant options. Signed-in `cartSync.js` hydrates and replaces `public.customer_cart_items` through the RPC.
3. `LiveCheckoutPage.jsx` resolves current variants via `checkout.js`; `api.js` calls quote-order → `handlers.js` → SQL `quote_order` / `private.build_quote`.
4. Submit → create-order validates identity, bot token, inputs and contact rate limits → SQL `create_order` transaction. COD commits stock and records unpaid/COD order; online reservation/payment logic exists in SQL but there is no active customer online-payment adapter.
5. Success → clear ordinary cart/remote snapshot for cart checkout; Buy now remains separate → fragment capability on confirmation → `LiveConfirmationPage.jsx` → order-status → minimal projection. Signed-in history reads own orders with RLS. Authorized admin cancellation restores committed stock once and persists an event.

Steps 3–5 are verified in isolated local PostgreSQL, not hosted, because the required functions are absent.

## D. Database integration

All **14 migrations** apply successfully to new isolated PostgreSQL databases. Catalog tables: categories, brands, products, product_variants, product_images and site_images. Products reference categories/brands; variants hold unique SKU, options and integer PKR price; images hold approval/provenance/storage path. Account/config tables include profiles, addresses, customer_cart_items, settings, shipping zones/methods/rates, payment methods and published/draft policies. Orders snapshot contact/address, prices, shipping and payment labels; items reference variants while retaining immutable purchase data. Inventory, movements, reservations, events, payment attempts, returns/refunds, contact/newsletter/outbox/audit tables support operations. Private schema contains membership/MFA settings, idempotency/access hashes, rate limits and webhook deduplication.

Local tests exercise foreign keys, unique/default address constraints, restricted columns, immutable movement/event history, trigger-created profiles/inventory, server-derived totals, rollback, last-item buyer concurrency, duplicate concurrent order creation, payment event deduplication, expiry and cancellation/stock restoration. SQL payment tests use a synthetic provider; they do not verify an actual webhook/payment account.

Hosted SELECT inspection confirmed:

- No public base table has RLS disabled; 68 public/storage policies exist. Policy count alone does not prove every policy is correct.
- Ordering is closed and private admin MFA is enabled.
- Expected signatures exist for cart replacement, address save, catalog paging, create order and admin membership; newsletter confirmation exists. The initial one-argument catalog probe was invalid; inspecting its real six-argument signature confirmed it is present.
- `product-public` is public, 5 MiB, JPEG/PNG/WebP/AVIF. `product-private` is private, 10 MiB, same image types. `order-private` is private, 5 MiB, JPEG/PNG/PDF. Public images loaded in a real browser. No hosted upload or private customer-document download was performed.
- **`supabase_migrations.schema_migrations` does not exist.** Objects are manually installed. Presence of selected objects is not proof all 14 definitions match. A full normalized hosted definition/grant/index diff remains unverified; no migration-history entries were fabricated and no SQL migration was applied by this audit.

## E. End-to-end tests and actual outcomes

“Pass (local)” means persisted checks in isolated PostgreSQL or local tests, not a hosted browser journey. Auth token verification and Storage transport are simulated in those database-handler tests.

| Test | Expected | Actual | Status |
| --- | --- | --- | --- |
| Hosted browse/product SSR | Real public data, protection/noindex, correct product/404 | Five route checks plus anonymous protection passed | Pass (hosted read) |
| Search `casio`, ascending price | Both matching products in price order | A168 PKR 16,900 then MTP PKR 24,900 in local production browser against staging | Pass (read integration) |
| Paging/filter full dataset | Server-wide filters and bounded pages | Catalog database tests pass; large hosted dataset not available | Pass (local); partial hosted |
| Product mobile/tablet/desktop | Images, heading, no overflow/errors | 390/768/1440 widths: all images loaded, document narrower than viewport, no captured warnings/errors | Pass (local production browser) |
| Register / confirm email / sign in / recovery | Real account and mail, stable-origin recovery | No inbox/test account used; stable redirect omitted; custom SMTP disabled | Blocked / not verified hosted |
| Existing auth/session/logout logic | Neutral errors, events/persistence bootstrap | Auth unit tests pass | Pass (unit); hosted unverified |
| Address save and ownership | Persist own default; deny other customer; rollback invalid update | Database tests pass | Pass (local) |
| Cart edits/removal/relogin/checkout clear | Correct variant, no accumulated quantities, own data only | Existing unit/DB tests plus combined journey pass | Pass (local); signed-in hosted unverified |
| Combined customer order journey | Catalog → saved address/cart → quote → test order → retry → history → capability → clear cart → admin cancel | New test asserts one persisted test order, correct total, stock 5→3→5, cross-customer denial, AAL1 denial and single cancellation | Pass (local) |
| Concurrent last item / duplicate checkout | One purchase; no oversell/duplicate | Real PostgreSQL concurrency tests pass | Pass (local) |
| Actual hosted checkout | Reach function and persist a controlled test order | quote-order GET returns 404; no write attempted | Fail readiness; hosted journey blocked |
| Online payment | Verified charge/signature/event reconciliation | No adapter; webhook deliberately unavailable | Not implemented |
| Admin upload/approval/forms/outbox | Authorized persisted changes and intended delivery | Local tests pass; hosted functions absent; no delivery adapter | Partial; blocked hosted |
| Local bounded production HTTP check | 200 read-only responses, no external network | 200/200 at 10 RPS for 20 seconds, p95 18.57 ms, max 21.25 ms; demo fixture build | Pass (local capacity smoke only) |
| Fresh-process SSR | Initialization/cache behavior, no live upstream I/O | Three fresh local processes passed with injected 25 ms reads | Pass (local); true hosted cold start unverified |
| Lint / unit / database / builds | Existing behavior preserved | 278 unit tests; 113 database tests including new combined journey; lint/build/bundle checks pass | Pass within stated scope |

Local load evidence: `scripts/out/load-local.json`; fresh-process evidence: `scripts/out/ssr-profile/report.json`; staging smoke: `scripts/out/ssr-staging-after-load-verification.json`. These ignored reports are local evidence, not committed artifacts. No remote load test was run during this audit.

## F. Problems found

No new Critical vulnerability was verified. Severity distinguishes launch blockers from exploitable production exposure.

| Severity | Root cause / affected files or service | Fix or action |
| --- | --- | --- |
| High | No hosted Edge Functions; all frontend function callers affected | Verified dashboard + quote GET 404. Configure safe staging secrets, deploy named repository functions, then verify before any hosted writes. Remains open. |
| High | Supabase Auth Site URL/allowlist uses generated alias, omits stable staging origin | Exact configuration steps below. No hosted settings changed. |
| High | Missing migration ledger; manual schema setup | Reconcile definitions and back up before approved history repair. Do not reset or blindly push. |
| High | No commerce/newsletter mail adapter and no payment adapter (`_shared/deps.ts`, handlers) | Provider/account decisions required; implement/test adapter before promising delivery or online payments. Custom SMTP disabled is a separate Auth delivery limitation. |
| High before enabling production writes | No Vercel public Turnstile site-key variable; hosted server bot secrets not verified | Configure matching site key/secret/hostnames or retain closed ordering. Current shared production handlers fail closed without bot protection. |
| Medium | API session lookup outside deadline/error lifecycle (`src/lib/api.js`) | Fixed rejection handling, deadline coverage, pre-abort handling and listener/timer cleanup. Regression tests reproduce prior failures. |
| Medium | bcrypt maximum compared with character count (`src/lib/auth.js`) | Fixed UTF-8 byte count; ASCII/accent/emoji boundary tests added. |
| Medium | Secret gate excludes untracked/build/history (`scripts/check-secrets.mjs`) | `check:secrets` now uses expanded scanner; test verifies secret/public-token distinction. No matching secrets found; not an exhaustive credential guarantee. |
| Medium | Seven dev-tool advisories in Tailwind dependency chain | Non-breaking npm audit fix updated selector parser 6.1.4→6.1.5 but advisories remain: five high, two moderate. npm proposes Tailwind 4 as breaking remediation. Not forced; exposed build tools should not process untrusted patterns. Runtime audit zero. |
| Medium | Obsolete deployment/verification documentation names different account and SPA flow | Added prominent superseded notices directing operators to this audit. Existing old statements are historical, not active instructions. |
| Low / production SEO task | No sitemap, staging index controls and canonical need production configuration | Keep staging noindex; generate production sitemap/canonical only after approved domain target exists. |

## G. Changes made

Only local source, test, lockfile and documentation changes in this audit:

- `src/lib/api.js`, new `src/lib/api.test.js`: whole-operation timeout/error/cancellation cleanup; four tests.
- `src/lib/auth.js`, `auth.test.js`: UTF-8 maximum password length, added multibyte boundaries to existing test.
- New `scripts/secret-patterns.mjs`, `scripts/scan-integration-secrets.mjs`, `src/lib/secret-patterns.test.js`; package script updated. Scan includes nonignored untracked/current files, generated client/server text assets and optional `--history` reachable text blobs. Prints locations only. `.github/workflows/ci.yml` also scans generated output after building; prebuild scan is retained. CI checks available checkout files; a complete history check requires the relevant refs/history locally.
- `package-lock.json`: compatible selector-parser patch only; no forced major upgrade or CSS migration.
- New `supabase/tests/customer-journey.test.js`: complete persisted local journey and MFA/ownership checks. Existing security/cart tests retained.
- This report, baseline, and superseded notices in deployment/verification docs; local brain notes updated separately.

No new migration. No hosted deploy. The earlier cart/security/performance/SSR changes already present in the dirty tree are not newly attributed to this audit. The unrelated existing `scripts/check-backend-order-flow.mjs` was not run or modified.

## H. Deployment readiness

**Protected staging browsing: verified. Real sales / production launch: not ready.** Keep ordering closed. The absence of Edge Functions is sufficient to block launch regardless of passing builds. Required gates include reconciled hosted schema/history, functioning staged endpoints, an authorized customer/admin test run with email safeguards, approved commercial product/stock/policy/shipping content, operational maintenance, backups, and provider decisions. Do not point the domain at this staging project as a shortcut to launch.

## I. Exact manual actions required

### Supabase staging

1. In the existing project, Authentication → URL Configuration: use `https://o-ld-verge.vercel.app` as staging Site URL; add `https://o-ld-verge.vercel.app/account/reset-password`. Keep any generated aliases only when intentionally supported. Allow local callback URLs only if using hosted Auth for local testing. No wildcard across all Vercel accounts is needed.
2. Authentication → Emails → SMTP Settings currently has custom SMTP disabled. Choose an owned test inbox and restricted staging mail transport before signup/recovery tests. Never send fixture addresses through live delivery. Local Supabase's configured mail catcher is an alternative for full local Auth tests.
3. Obtain a read-only schema/privilege/index definition export through an authorized connection; compare it against a clean local instance built from 14 migrations. Snapshot/backup first. Record already-applied history only after exact comparison and approval. Do not run `full-schema-setup.sql`, reset, seed, or a blind `db push` on this project.
4. Before deploying functions, configure the server-only names below in Edge Functions secrets, not Vercel public variables. `ORDER_TEST_MODE` must designate staging tests. **Test mode marks revenue and can bypass a missing bot secret; it does not prevent inventory writes or email delivery.** An isolated test SKU/account/inbox or a fully local environment is still necessary for hosted write testing.
5. Deploy named functions from `supabase/functions`, including newsletter-confirm and both admin image functions, with their repository config. Do not assume a frontend deployment deploys them. Verify GET method rejection/CORS first, then controlled test writes only after safeguards are established.
6. Use a separate authorized test admin with MFA enrollment and membership; verify AAL1 denied and AAL2 permitted. Never insert self-admin privileges through the browser or disable MFA/RLS for tests.
7. Configure maintenance scheduling and inspect successful invocations; do not activate outbox delivery until its adapter and intended recipients are verified.

### Environment variable names (no credential values)

| Location | Names |
| --- | --- |
| Public application allowlist | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_CONTACT_FORM_ENDPOINT`, `VITE_TURNSTILE_SITE_KEY` |
| Build/server isolation | `VITE_STORE_MODE`, `SITE_URL`, `OLDVERGE_DEPLOYMENT_TIER`, `STAGING_SUPABASE_URL`, `PRODUCTION_SUPABASE_URL`, `OLDVERGE_PRODUCTION_BACKEND`, `VERCEL_ENV` |
| Existing Vercel public aliases | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_ANON_KEY` |
| Existing Vercel privileged integration entries, Production scope only | `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_USER`, `POSTGRES_HOST`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`, `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SECRET_KEY` |
| Edge Function supplied credentials | `SUPABASE_URL`, `SUPABASE_SECRET_KEYS`, `SUPABASE_PUBLISHABLE_KEYS`, legacy `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY` |
| Custom function secrets/config | `TOKEN_SECRET`, `ALLOWED_ORIGINS`, `CRON_SECRET`, `TURNSTILE_SECRET_KEY`, `ORDER_TEST_MODE` |
| GitHub maintenance secrets | `SUPABASE_URL`, `CRON_SECRET` |

Local `.env` values were not dumped. No public variable may contain a service credential. Existing privileged Vercel entries are not imported by the frontend allowlist; their presence does not prove they are required by this app. Review them separately before removing integration-managed settings.

### Vercel

Use existing `abdullah-f9b8/o-ld-verge`; project dashboard confirms Vite, Node 24.x, no root-directory override and authentication protection. Repository `vercel.json` explicitly builds client+SSR server, bundles server artifacts into `api/render.js`, uses hnd1 and routes public paths through SSR. Keep staging isolation across all scopes. Add a public Turnstile site key only with matching server secret/allowed hostnames. Build-time env changes require redeployment; this audit's fixes have not been deployed or pushed. Review and push the intended source deliberately: a source-upload deployment is not proof GitHub contains the same dirty working tree.

### GoDaddy / custom domain

Current Vercel domain inventory contains **only `o-ld-verge.vercel.app`**. Therefore there are **no verified domain-specific DNS records for oldverge.com to report yet**. Do not use a guessed A record or change existing records. Earlier DNS evidence pointed to Shopify; it was not refreshed in this audit and is not proof the website is live.

When a real production project/backend is ready and the owner approves domain attachment, add `oldverge.com` and `www.oldverge.com` to that intended project, read Vercel's exact displayed record type/name/value and any ownership TXT challenge, then apply only those reviewed records in GoDaddy. Preserve unrelated email/MX/TXT records. Verify certificate issuance, HTTPS and the chosen apex/www redirect before traffic switches. Domain ownership alone establishes none of these.

### Email and payments

Auth SMTP and commerce/newsletter `deps.mailer` are separate integrations. Configuring SMTP alone does not implement newsletter or order email delivery. Select an adapter with a staging sink/recipient allowlist, test confirmation-token links and outbox retry semantics, then verify actual received email. Select an online payment provider only if desired; use its sandbox, verify raw-body signatures, amount/currency/provider binding, replay and reconciliation before enabling an online method. Do not treat SQL synthetic payment tests as a real provider test. COD can remain the only supported flow with approved operational terms; no card fields should be added without that integration.

## J. Remaining unverified risks

Full hosted schema/function-body/grant/index equivalence, hosted signed-in cart persistence, signup/email confirmation/recovery delivery, admin MFA login and all hosted CRUD/upload flows remain unverified. No authorized test inbox/account credentials were provided for a full browser journey; no hosted order or inventory change was attempted. Hosted CORS/secrets cannot be judged from absent functions. Maintenance repository secrets and actual schedule execution, disaster recovery/restore, production monitoring/alerts, retention policies and payment reconciliation are not verified.

Pattern scanning found no recognized privileged credentials in 647 source/build/history files at the first expanded run; it cannot establish absence of arbitrary secrets, deleted/unreachable Git objects, private remote-only refs or credentials in ignored local files. Runtime dependencies have zero reported advisories at audit time; seven development advisories remain. Provider dashboards displayed an incident banner, but its precise service scope/current duration was not independently determined here.

Responsive checks cover product layout at 390/768/1440 and a search result, not every page/browser/accessibility workflow. No Safari, Firefox, real touch device or screen reader test ran. Catalog tests use fixtures and a small hosted catalog, not production-sized data. No new remote capacity or true hosted VM cold-start claim is made. Published commerce content/photography/licensing/stock/terms still needs owner approval.

## K. Deployment checklist and rollback plan

1. Review the current dirty diff and this report. Keep secrets/generated evidence out of commits. Run `npm ci`, lint, unit/database tests, production client/server build, bundle check and postbuild secret scan; use `npm run check:secrets -- --history` for reachable-history review. CI intentionally builds a demo fixture; separately validate a correctly configured staging backend build.
2. Snapshot/export the hosted schema and data through approved tooling. Compare definitions and reconcile migration history; use only reviewed additive migrations. Keep ordering closed.
3. Establish staging mail safeguards, public/server bot configuration, exact Auth URLs, allowed origins and test accounts/SKU boundaries. Reuse the existing staging projects; no duplicate projects are required for that step.
4. Deploy/version compatible Edge Functions and verify method/CORS/error behavior. Verify maintenance without sending queued notifications unintentionally.
5. Deploy reviewed frontend fixes to protected staging when requested. Check route SSR, assets, noindex/no-store, private-shell isolation and catalog credentials. Run a controlled full customer/admin journey with persisted before/after assertions; no load test without fresh limits.
6. Resolve remaining development advisories with a separate tested styling-tool upgrade. Confirm policies, products, stock, shipping, contact, returns, backups and monitoring. Decide COD and/or a sandbox-verified payment provider and working email adapter.
7. Only after explicit production approval, provision an isolated production backend and configure the intended production project/scopes. Staging variables must not point to production. Confirm readiness with ordering still closed.
8. Request approval for domain attachment/DNS changes, copy the actual Vercel requirements, verify HTTPS/canonical/redirects, then separately approve opening orders. Add production sitemap and indexing rules after the production origin is established.

Rollback: record the exact previous Vercel deployment and Edge Function versions before release. If frontend validation fails, restore the staging alias to that verified prior deployment without moving oldverge.com. Redeploy the previous compatible function source if needed. Do not blindly reverse schema migrations or restore a database snapshot over new orders: prefer a forward corrective migration and preserve order/inventory ledgers. If an approved test fails, close ordering through the authorized operational flow and reconcile only the isolated test records with audited admin actions. DNS rollback, if later authorized, restores the recorded prior records/TTL; no DNS rollback is needed for this audit because none changed.
