<!-- SNAPSHOT exported from the canonical Obsidian brain (Downloads/oldv/brain). Do not edit here: edit the brain, then run `node scripts/export-brain.mjs`. -->
---
type: history
updated: 2026-10-18
---
# Decision Log

Newest at the bottom. Format: date, decision, why. Do not reverse without asking the owner.

- **Stack kept**: React + Vite + CSS + zustand; no migration. Why: builds cleanly, small. See [[Stack]].
- **Rubik font reverted**. Why: owner rejected it. Its font files were deleted on 2026-10-18. See [[Colours and Fonts]].
- **Hero H1 "Timeless Elegance"; big OLDVERGE heading removed.** Owner approved. [[Brand Rules]]
- **Nav espresso, no banner above nav, no theme button, light theme only.** [[Brand Rules]]
- **Categories: Watches and Clothes; Clothes = Quarter Zips only.** Route stays `/shop/quarter-zips`.
- **"Best Win" kept as supplied name.** "New Arrivals" removed (no date data).
- **Filters live in the URL; Filter drawer replaces sidebar and sort dropdown.** [[Routes]]
- **Sample-price notice moved to a single footer line** instead of repeating everywhere. [[Commerce Rules]]
- **Product cards minimal**: photo + one-line name/price, no overlays or buttons. [[Brand Rules]]
- **Policy drafts published as four pages** that state plainly no orders are accepted yet; nothing invented. [[Policies and Contact]]
- **Backend removed** (Supabase SQL, DB tests, `@supabase/supabase-js`, `zod`, `pg`, `embedded-postgres`). Owner wanted design first.
- **UI UX Pro Max "Liquid Glass" style rejected** (not minimal); its accessibility checklist is used.
- **2026-10-17 Photos replaced with Unsplash stand-ins** (previous photos had no recorded source or showed other brands). [[Images]]
- **2026-10-17 Owner asked for a complete front-end demo journey** (search, cart drawer, demo checkout, confirmation, demo account, support pages). Supersedes the earlier "no checkout data / no search/wishlist" rules. Wishlist removed on purpose. [[Checkout and Cart]]
- **2026-10-18 Obsidian second brain created** at `Downloads\oldv\brain` inside the vault `Downloads\oldv`. Claude reads it first and logs work after. [[How to Use This Brain]]
- **2026-10-18 Owner commissioned a Supabase commerce backend brief and a code audit + GitHub brief; the audit runs first.** The backend is a separate later phase and is not started. Live ordering stays closed. [[Roadmap]]
- **2026-10-18 Repository boundary = `Downloads\oldv\oldv` only.** The vault, brain, skills, venv and zips stay outside Git. [[Git and GitHub]]
- **2026-10-18 Audit actions authorised by the owner's brief**: fix verified defects, remove proven-dead code and CSS, add lint/tests/CI, create a PRIVATE GitHub repository under the correct account and push `main`. No force-push, no history rewrite, no deployment. [[Code Audit 2026-10-18]]
- **2026-10-18 Kept Tailwind (Preflight reset) and the demo delivery numbers pending owner decisions**, rather than removing them silently. [[Known Issues]]
- **2026-10-18 GitHub: private repo `SpideyAB/oldverge-storefront`; owner confirmed the SpideyAB account, allowed installing `gh`, approved the OAuth screens (repo, then workflow in Chrome).** CI is active. [[Git and GitHub]]
- **2026-10-18 Node range is `^22.13.0 || >=24.0.0`** because ESLint 10 and Vitest 5 require it; the production build alone also works on Node 20.19+. Only `@tailwind base` is loaded.
- **2026-10-18 ESLint uses only `rules-of-hooks` and `exhaustive-deps`** from the React hooks plugin; its React Compiler rules are off until the project adopts the compiler.
- **2026-10-18 The brain is exported to `oldv/docs/brain/` as a snapshot** (canonical source stays in `brain/`), produced by `scripts/export-brain.mjs`. Reason: the vault is outside the repo; one source of truth.

- **2026-10-23 Owner authorized existing staging schema/history reconciliation and verified gap fixes**, with ordering closed, no orders/inventory changes and oldverge.com untouched. Exact application schema comparison justified official history baseline repair instead of replaying 14 migrations; no new hosted application migration was needed. [[Backend]] [[Verification]]

- **2026-10-23 Owner explicitly approved a 30-day Mailtrap API token with Admin access only to My Sandbox and encrypted server-only storage in existing staging Supabase**, after explanation that Sandbox Admin also permits sandbox management. No account/billing/project-wide/live-domain permissions. Authorized adapter deployment and bounded sandbox delivery verification with ordering closed/no orders or inventory writes/domain changes. [[Backend]] [[Verification]]

## Completed one staging order — 2026-10-23
Supersedes the pending CAPTCHA/order checkpoints. Owner authorized exactly one isolated order and temporary test settings, then explicitly approved CAPTCHA interaction. Real Turnstile passed using ordinary keyboard activation after closed-shadow-root coordinate interaction was unavailable. OV-261023-06007E7F (111356a2-284e-4951-8a36-979328482f07), OV-STAGING-TEST-20261023 quantity1/PKR100, testflagtrue/unpaid/no shipment. Checkout readback, local+remote cart clear passed. Mailtrap admin5771475188 captured firsttry; customer5771477816 captured after one controlled retry of initial email_provider_rejected (causeunknown; no status/body retained). Only these two queue entries processed; bothsent. Owner UI cancelled; onecancelevent/onerestock, stock1→0→1. All15 final DB checks pass; original otherinventory fingerprint b9ea8aa506d12e862b942f122854fe71 identical. Orderingfalse, MFAtrue, ORDER_TEST_MODEremoved, testproductarchived/variantinactive, methods/rateoff; prior4policybodies+4drafts+5contactvalues exactly restored, legitimatepublication/auditmetadata retained. Cancelled order/inactivefixture/asset retained. No application-code, deployment, migration, livepayment/courier or oldverge.com changes.45 local checkout/lifecycle/mail tests passed in preflight, not rerun for config-only hosted operations. Report oldv/docs/staging-single-order-test-2026-10-23.md; launch checklist now gates1–2complete, gates3production/operations and4domain/launch remain. No additionalorder/stock permission inferred. Followups: safe provider-status diagnostics, scheduling/monitoring, disabledpaymentclientdisplay for admin sessions; productionpolicies/contact/products/email still needed. Earlier no-order statements are historical.
