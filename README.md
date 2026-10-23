# OLDVERGE — Storefront & Supabase Backend

For the current SSR runtime and local-only load testing, see [SSR and load testing](docs/ssr-and-load-testing.md). Hosting verification and the isolated staging setup are documented in [hosting and staging](docs/hosting-and-staging.md). The domain's DNS and this repository's intended hosting differ; an active deployment has not yet been verified.

Production-ready storefront and backend integration for **OLDVERGE** watches and menswear (prices in PKR). Built with React 19 + Vite 6 and Supabase (PostgreSQL 17, Auth, Storage, Edge Functions, Row Level Security).

---

## 1. Architecture Overview

OLDVERGE operates on a clean, dual-mode full-stack architecture:

- **Frontend**: React 19, Vite 6, React Router 7, Zustand 5, Framer Motion 12, Lenis smooth scrolling, Lucide icons, and custom CSS design system (`--ov-espresso #30251F`, `--ov-ivory #F4F0E7`).
- **Backend & Database**: Supabase PostgreSQL with 11 version-controlled migrations, Row Level Security (RLS) enabled on all exposed tables, capability tokens for guest orders, and private guest-access hashes.
- **Authentication**: Supabase Auth with secure session handling, customer data isolation, and role-based access verification (`is_admin()`).
- **Storage**: Supabase Storage with dedicated private buckets (`product-private`, `site-private`) for unapproved drafts and public buckets (`product-public`, `site-public`) for approved CDN delivery.
- **Server Functions**: 11 Supabase Edge Functions handling order quoting, atomic checkout with inventory reservation, contact submissions, newsletter opt-in/opt-out, maintenance, and payment webhooks.
- **Admin Portal**: Integrated at `/admin/*` (lazy-loaded), featuring Dashboard, Product Management, Variants, Inventory, Orders, Messages, Newsletter, Policies, Operations, and CSV Exports.

---

## 2. Requirements

- **Node.js**: `^22.13.0 || >=24.0.0` (pinned in `.nvmrc`)
- **npm**: Package lockfile v3 (`package-lock.json`)

---

## 3. Quick Start (Local Development)

### Install dependencies
```sh
npm ci
```

### Run the development server
```sh
npm run dev
```
Open `http://localhost:5173`. By default, without Supabase credentials, the site runs in **demo mode** with local sample data.

---

## 4. Test & Verification Commands

All quality gates pass out-of-the-box:

```sh
# Run unit and store tests (Vitest)
npm test

# Run full database test suite against embedded PostgreSQL 17 (103 tests)
npm run test:db

# Run ESLint (flat config)
npm run lint

# Build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 5. Environment Variables Configuration

Copy `.env.example` to `.env.local` for local development. Never put server secrets in frontend `VITE_*` variables.

### Frontend (`.env.local` or Vercel Environment Variables)
| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes (for backend) | Supabase project URL (e.g. `https://xyzcompany.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes (for backend) | Supabase Anon / Publishable key (safe for browser) |
| `VITE_CONTACT_FORM_ENDPOINT` | Optional | Custom HTTPS contact form webhook (demo mode fallback) |

*Note: The frontend also accepts `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` if using the Vercel Supabase integration.*

### Backend / Supabase Server Secrets (Edge Functions)
Set these in the Supabase Dashboard (`Settings -> Edge Functions -> Secrets`) or via Supabase CLI:
| Variable | Description |
|---|---|
| `SUPABASE_URL` | Project API URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged service key for Edge Functions |
| `TURNSTILE_SECRET_KEY` | Optional Cloudflare Turnstile key for checkout bot protection |
| `RESEND_API_KEY` | Optional email delivery provider key |

---

## 6. Supabase Project Setup & Database Migrations

### Option A: Complete Database Setup via SQL Editor (Recommended)
1. In your [Supabase Dashboard](https://supabase.com), open **SQL Editor**.
2. Open [`supabase/full-schema-setup.sql`](supabase/full-schema-setup.sql).
3. Copy the entire file content, paste it into the SQL Editor, and click **Run**.
4. This executes all 11 chronological migrations:
   - `01_core_catalog`: Categories, brands, products, variants, images.
   - `02_accounts_admin_config`: Profiles, addresses, store settings, policies.
   - `03_orders_inventory_support`: Orders, items, inventory, rate limits, outbox.
   - `04_catalog_checkout_functions`: RPCs for availability, quote, checkout.
   - `05_admin_functions`: RPCs for product, inventory, and order operations.
   - `06_admin_queries`: Read queries with admin role verification.
   - `07_rls_grants_storage`: Row Level Security policies and bucket permissions.
   - `08_profile_backfill`: Trigger to automatically create customer profile on signup.
   - `09_image_integrity`: Checksum and image metadata verification guards.
   - `10_security_review_fixes`: Rate limit spoofing guards, per-contact order limit.
   - `11_customer_cart`: Multi-device customer cart persistence and atomic merging.

### Option B: Supabase CLI
```sh
supabase link --project-ref <your-project-ref>
supabase db push
```

---

## 7. Seeding Catalogue & Uploading Assets

### 1. Seed Initial Products & Policies
In the Supabase SQL Editor, run [`supabase/seed.sql`](supabase/seed.sql).
To publish the sample products for preview browsing, also execute [`supabase/seed-demo-publish.sql`](supabase/seed-demo-publish.sql).

### 2. Migrate Media to Supabase Storage
Run the asset migration script to verify and upload product images to Supabase Storage:
```sh
# Dry run verification (verifies checksums and dimensions)
npm run assets:dry-run

# Upload to Supabase Storage (requires shell environment variables)
export SUPABASE_URL=https://<your-project>.supabase.co
export SUPABASE_SECRET_KEY=sb_secret_...
node scripts/migrate-assets.mjs --apply --publish-samples
```

---

## 8. Creating the First Administrator

To grant administrative access to an account:
1. Sign up a user in the storefront or Supabase Auth.
2. In the Supabase SQL Editor, run:
```sql
insert into private.admin_members (user_id, role)
select id, 'owner' from auth.users where email = 'your-email@example.com';
```
3. Navigate to `/admin` to access the admin portal.

---

## 9. Deployment Instructions

### Frontend (Vercel)
1. Push this repository to GitHub.
2. Import the project into Vercel.
3. Configure the Framework Preset as **Vite**.
4. Set the Root Directory as `oldv` (or the folder containing `package.json`).
5. Add the environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
6. `vercel.json` already contains the SPA route rewrite (`/(.*) -> /index.html`), preventing 404s on direct navigation.

### Edge Functions
Deploy Edge Functions to Supabase:
```sh
supabase functions deploy quote-order
supabase functions deploy create-order
supabase functions deploy order-status
supabase functions deploy newsletter-subscribe
supabase functions deploy submit-contact
supabase functions deploy admin-bulk-ops
supabase functions deploy admin-upload-image
supabase functions deploy maintenance
```

---

## 10. Security & Compliance Highlights

- **Row Level Security (RLS)**: Enforced across 100% of tables. Anonymous visitors can only read published products, categories, active shipping rates, and published policies.
- **Customer Privacy**: Customers can strictly read and write only their own profiles, addresses, cart items, and placed orders.
- **Privilege Separation**: Privileged keys (`service_role`, `sb_secret`) are forbidden from frontend code and build configuration. The browser bundle only carries the public publishable key.
- **Idempotency & Concurrency**: Checkout operations use atomic server-side transactions (`create_order_atomic`) with idempotency keys and row-level locks (`for update`) on inventory to prevent overselling and double charges.
- **Rate Limiting**: IP and contact-level sliding window rate limits on sensitive endpoints (`submit-contact`, `quote-order`, `create-order`).

## Cart synchronization (2026-10-22)

Apply migration `20261022000100_cart_sync.sql` before deploying this frontend (also included in full-schema-setup.sql). Login waits for the catalog and merges overlapping quantities using the maximum, not addition; retries and repeated logins do not inflate quantities. Signed-in cart changes use the atomic replace_customer_cart RPC, serialized in the browser, including removals and cart-checkout clearing. Buy now leaves the cart unchanged. Changes during login loading are preserved; stale login responses are ignored after signout. Failed sync shows a bag notice and retries on reconnect or the next cart edit. Simultaneous devices use last completed snapshot write; there is no realtime collaborative cart.

## Security and operations update (2026-10-22)

See `docs/security-operations-changes.md` for the new migration, mandatory admin MFA, required production bot verification, explicit build configuration, atomic address saves, newsletter confirmation, CI checks and maintenance setup. These instructions supersede earlier permissive defaults. Hosted rollout and provider configuration remain outstanding.

## Performance and catalogue paging (2026-10-22)

See `docs/performance-and-scale.md`. Apply migration `20261022000300_catalog_paging.sql` before this frontend: backend collections/search are server-paged, product details are cached and refreshed, routes/drawers are deferred, and fonts are self-hosted. `npm run check:bundle` enforces the initial JavaScript budget. Cart and security rollout requirements remain in force.
