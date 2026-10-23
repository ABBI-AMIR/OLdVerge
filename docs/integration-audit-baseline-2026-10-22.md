# OLDVERGE initial integration audit — 2026-10-22

Read-only inspection completed before application changes in this audit. This is a baseline, not a launch certificate. See the final integration report for fixes and verification after this baseline.

## Evidence and scope

Inspected React/Vite entry points, SSR, routes, Zustand catalog/site/cart/auth state, customer/admin data layers, shared Edge Function handlers, migrations/RLS/storage, local test harness, CI, deployment and historical verification documents. Read the authenticated Supabase functions and Auth URL dashboards; queried hosted schema/security metadata using SELECT only; read Vercel project, environment metadata and domains using its authenticated CLI. No hosted rows, inventory, settings, deployments, secrets or DNS changed.

Baseline local checks: 273 unit tests and 112 real embedded PostgreSQL tests pass. All 14 migrations apply to isolated local databases. Lint, client/server build, bundle budgets and existing tracked-source secret scan pass; runtime dependency audit reports zero advisories. The database suite needs execution outside the filesystem sandbox because Windows user-profile lookup fails inside it. No hosted write journeys or remote load tests ran.

## Initial findings

| Severity | Verified finding | Implication / next action |
| --- | --- | --- |
| High | Supabase staging Edge Functions dashboard shows “Deploy your first Edge Function”, with no deployed functions. | Function-backed checkout, guest order lookup, contact/newsletter, image upload/approval and maintenance cannot work hosted. Prepare deployment instructions; configure secrets and test safeguards before deployment. |
| High | Hosted Auth Site URL and four allowed redirects use the generated project alias, omitting `https://o-ld-verge.vercel.app/account/reset-password`. | Recovery requested from the stable staging address is not allowlisted. Report exact staging URL changes; do not claim delivery or recovery verified. |
| High | Hosted `supabase_migrations.schema_migrations` relation does not exist. | Objects were installed manually. Reconcile definitions before recording migration history; do not push all migrations or reset the project. |
| High | Email adapter absent from `buildDeps`; payment webhook explicitly returns 501. | Newsletter confirmation/commerce emails cannot be delivered by these functions; no online payment integration. COD is the only customer checkout option. |
| Medium | `callFunction` awaits session lookup outside its try/finally. | Rejected lookup escapes the promised structured error contract and leaks the timeout/listener; a hung lookup has no effective deadline. Add regression tests and fix lifecycle management. |
| Medium | Password helper documents bcrypt's 72-byte ceiling but counts UTF-16 characters. | Multibyte passwords exceed the intended limit undetected. Enforce UTF-8 bytes with boundary tests. |
| Medium | Existing secret scanner checks tracked current source only. | Untracked changes, built output and Git history remain outside that check. Extend bounded scans, keep findings sanitized and test detection. |
| Medium | Deployment guide names a different repo/account and a SPA-only setup. | Could lead an operator to deploy the wrong source/project. Replace obsolete active setup instructions with verified staging context. |
| Low | No sitemap implementation found; staging robots blocks indexing. | Correct for staging; production SEO needs explicit domain-aware setup before launch. |

## Confirmed hosted safeguards and limitations

Vercel project `o-ld-verge`, Node 24.x, Vite, authentication protection enabled; the only attached domain is `o-ld-verge.vercel.app`. No oldverge.com attachment or exact domain-specific DNS requirement exists in that project yet. Do not invent records or alter DNS.

Hosted public base tables all have RLS enabled; 68 public/storage policies exist. `ordering_enabled=false` and private admin `require_mfa=true`. Cart replacement, address save, newsletter confirmation and six-argument catalog paging RPCs exist with expected argument types. Buckets: product-public public (5 MiB, JPEG/PNG/WebP/AVIF); product-private private (10 MiB, same image types); order-private private (5 MiB, JPEG/PNG/PDF). Counts and flags do not prove every hosted policy/function body matches the repository; a full definition diff remains required.

Vercel environment metadata contains staging isolation variables and public Supabase aliases in Development/Preview/Production, with privileged database/service variables scoped Production. No `VITE_TURNSTILE_SITE_KEY` is configured. Runtime function secrets, SMTP delivery, authorized test customer/admin accounts and browser write journeys are not verified. No order can be tested hosted safely while ordering remains closed and functions are absent. Local fixture-based order, cancellation, concurrency and authorization tests provide real persisted database evidence only in isolated PostgreSQL, with an Auth/Storage shim rather than hosted Supabase services.
