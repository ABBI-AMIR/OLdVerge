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

## Email (completed 2026-11-13)

- The owner added the Mailtrap sending-domain CNAMEs at GoDaddy (`mt24`, `rwmt1._domainkey`, `rwmt2._domainkey`); the existing strict DMARC record was kept. Public DNS (Cloudflare and Google resolvers) showed all three; the website records were unchanged. Mailtrap marked `oldverge.com` Verified after the owner completed sender information and the compliance check.
- Order email: Edge secrets `ORDER_EMAIL_PROVIDER=mailtrap_live`, `ORDER_EMAIL_SITE_URL`, `ORDER_EMAIL_ADMIN_TO`, `ORDER_EMAIL_REPLY_TO`, `MAILTRAP_LIVE_FROM` (`orders@oldverge.com`) and `MAILTRAP_LIVE_API_TOKEN` (owner-entered; a dedicated token limited to Domain Admin on `oldverge.com`, **expires after 365 days, renew before November 2027**).
- Outbox schedule: `pg_cron` and `pg_net` enabled; Vault holds `order_email_worker_url` and `order_email_cron_secret`. `CRON_SECRET` was regenerated so the Vault and Edge copies match (never printed). `supabase/operations/schedule-order-email.sql` created job `oldverge-order-email`, every minute, which only calls the worker when the outbox has due rows.
- Auth email: custom SMTP on, `live.smtp.mailtrap.io:587`, user `api`, sender `orders@oldverge.com` ("OLDVERGE"); the owner entered the token as the password. Settings persisted after reload.
- Known gap: the live mailer has no newsletter-confirmation template and its newsletter links point at the staging site. Newsletter signup is disabled (`newsletter.active = false`); fix before enabling it.

## Ordering opened and live test order (2026-11-13)

- The readiness check blocked opening because the copied policy pages had `updated_by` cleared. After confirming each draft was identical to the published text, the four policies were republished with `admin_publish_policy` acting as the owner (now version 4). `admin_ordering_readiness` then passed and `admin_set_ordering_enabled(true)` opened ordering, at the owner's request. The footer notice now reads "Cash on delivery and bank transfer available across Pakistan."
- Turnstile could not be completed inside the embedded automation browser ("try again"); the owner placed the test order in a normal browser, where it passed.
- Test order `OV-261113-30184679`: one Black quarter-zip M, Standard delivery PKR 250, COD, total PKR 4,449, `is_test = false` (the live mailer refuses test orders). Stock 9 → 8; `order_confirmation` and `admin_new_order` were sent by the first scheduled run (worker reply `sent: 2, failed: 0`). Cancelled with `admin_cancel_order` acting as the owner (reason "Launch test order, not a real sale"): stock 8 → 9 and `order_cancelled` sent. It remains in the order list as a cancelled record, not a sale.

## Product photo changes (2026-11-13)

- Black quarter-zip: studio cover kept; the lifestyle photo `products/quarter-zip-black/v1/quarter-zip-black.jpg` removed from the product; owner photos `products/quarter-zip-black/v2/quarter-zip-black-folded.webp` and `…-closeup.webp` added (approved, SHA-256 recorded).
- Navy quarter-zip: studio cover kept; `products/quarter-zip-navy/v1/quarter-zip-navy.jpg` removed from the product; owner photo `products/quarter-zip-navy/v3/quarter-zip-navy-folded.webp` added.
- An earlier full replacement was reverted from the backup at the owner's request before these changes. Removed photos and unused uploads remain in Storage and in the weekly backup. The homepage colour showcase and the product-page garment banner use images bundled in the repository and were not changed.

## Still open

1. Monitoring/uptime alerts and a hosted restore drill (see `docs/backups.md`).
2. Fix the live newsletter template and links before enabling newsletter signup.
3. Plan limits accepted for now: Vercel Hobby (non-commercial terms) and Supabase Free (pauses after 7 days without activity).
4. Rotate the Mailtrap sending token before it expires (November 2027).
