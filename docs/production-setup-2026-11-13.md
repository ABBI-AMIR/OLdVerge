# Production setup — 13 November 2026

Production is a separate Vercel project and a separate Supabase project. The earlier projects (`o-ld-verge`, `qeczhyiwgvglilwqbveh`) remain staging and must never receive production credentials.

## Projects

| Piece | Staging | Production |
| --- | --- | --- |
| Supabase project | `qeczhyiwgvglilwqbveh`, Tokyo `ap-northeast-1` | `emwxwaefekzxmwbumuik` (`oldverge-production`), Mumbai `ap-south-1`, Free plan |
| Vercel project | `o-ld-verge`, function region `hnd1` | `oldverge-production`, function region `bom1`, Node 24.x, Hobby plan |
| Hostnames | `o-ld-verge.vercel.app` (Vercel login required) | `oldverge.com` (primary), `www.oldverge.com` → 308 to apex, `oldverge-production.vercel.app` |
| Turnstile widget | "OLDVERGE staging" | "OLDVERGE production": Managed, pre-clearance off, hostnames `oldverge.com`, `oldverge-production.vercel.app` |

Mumbai was chosen because customers are in Pakistan. The region is set per Vercel project (`vercel.json` no longer has `regions`; see `docs/hosting-and-staging.md`).

Plan limits the owner accepted: Vercel Hobby is for non-commercial use under Vercel's terms (Pro required for a shop), and Supabase Free pauses after 7 days without activity and has no platform backups (see `docs/backups.md`).

## Supabase production

- All 16 migrations applied with `supabase db push` (no seeds); migration history recorded. A read-only manifest comparison against the local reference matched all 2,210 schema/permission entries with nothing missing, changed or unexpected.
- 12 Edge Functions deployed, `ACTIVE`, `verify_jwt = false` as configured (authorisation is in the shared handlers).
- Edge secrets (names only): `TOKEN_SECRET` and `CRON_SECRET` (generated directly into Supabase, never printed), `ALLOWED_ORIGINS` (`https://oldverge.com`, `https://www.oldverge.com`, `https://oldverge-production.vercel.app`), `TURNSTILE_SECRET_KEY` (entered by the owner). A probe with an invalid token now returns `400 bot_check_failed` instead of `503 not_configured`, and stored nothing.
- Auth: Site URL `https://oldverge.com`, redirect `https://oldverge.com/account/reset-password`, email confirmation on, minimum password length 10 with lower/upper letters and digits. Custom SMTP is **not** configured yet (Supabase's default sender only reaches organisation members, about 2 per hour).
- First admin added as `owner` in `private.admin_members` after the owner confirmed their account; the owner enrolled TOTP MFA.

## Catalogue copied from staging

A one-off transaction copied only published content from staging, after confirming the target had no products or orders and ordering was closed:

- 2 categories, 16 brands, 23 published products, 37 variants, 25 approved product images, 11 site images, 11 store settings (not `ordering_enabled`), 4 policy pages and drafts, the `standard` shipping method/rate and the `cod` and `allied_bank` payment methods.
- Excluded: draft/archived products, orders, customers, carts, newsletter and contact rows, audit history and every `staging_test` shipping/payment record.
- Staging admin IDs (`approved_by`, `updated_by`, `verified_by`) were cleared.
- The 36 Storage objects referenced by those rows were copied into `product-public`; all 36 are byte-identical to staging and all 25 product images match their recorded SHA-256.

Afterwards the owner confirmed stock: the 16 quarter-zip variants (100 units) from a written count and the 19 watches (25 units) as on staging. Each was recorded as an `initial_count` inventory movement and marked verified by the owner. All 23 products passed the readiness trigger and are `ready_to_sell`; COD and Allied Bank transfer are enabled. **`ordering_enabled` is still false.**

## Frontend deployment

Production is deployed with the Vercel CLI from a clean upload folder made by `scripts/prepare-staging-deploy.mjs` (sources only, secret scan, `.vercelignore` for `.env*`), linked to `oldverge-production` and deployed with `vercel deploy --prod`. Git deployments from `main` stay disabled in `vercel.json`.

Production environment variables (Production and Preview): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_TURNSTILE_SITE_KEY`, `SITE_URL=https://oldverge.com`, `OLDVERGE_DEPLOYMENT_TIER=production`.

Verified after deployment: function region `bom1` (`X-Vercel-Id … ::bom1::`), product data read about 40 ms, CSP/frame/HSTS headers present, no `noindex`, sitemap URLs on `oldverge.com`, product prices rendered, checkout shows that orders are not open, no broken images or console errors on the watch collection.

## Domain

GoDaddy DNS already pointed `oldverge.com` (A `216.198.79.1`) and `www` (CNAME to `vercel-dns`) at Vercel, but both names were attached to the login-protected staging project, so visitors saw a Vercel sign-in. On 2026-11-13 they were moved to `oldverge-production` with the apex as primary. HTTPS uses a Let's Encrypt certificate issued by Vercel. No GoDaddy change was needed for this.

## Still open before ordering is switched on

1. **Email.** Add the Mailtrap sending-domain CNAMEs at GoDaddy (`mt24`, `rwmt1._domainkey`, `rwmt2._domainkey`; keep the existing strict DMARC record), verify the domain in Mailtrap, then: Auth SMTP in the production project, the `ORDER_EMAIL_*` / `MAILTRAP_LIVE_*` Edge secrets, and the outbox schedule in `supabase/operations/schedule-order-email.sql`.
2. **One live test order** after email works: open ordering briefly, place one real order, confirm the customer and owner emails, cancel it (stock is restored once), close ordering again. `ORDER_TEST_MODE` is not suitable because it also disables live email.
3. Owner switches ordering on in `/admin → Settings → Ordering` and replaces the footer notice that still says prices are samples.

Monitoring/uptime alerts and a hosted restore drill (see `docs/backups.md`) are also not done.
