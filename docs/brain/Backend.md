<!-- SNAPSHOT exported from the canonical Obsidian brain (Downloads/oldv/brain). Do not edit here: edit the brain, then run `node scripts/export-brain.mjs`. -->
---
type: topic
updated: 2026-10-18
---
# Backend (Supabase) index

## Turnstile/newsletter verification checkpoint — 2026-10-23
COMPLETE: real staging-only Managed Turnstile configured, private key Supabase/public key Vercel, pre-clearance off, no test bypass. Protected frontend deployed to existing staging project and stable alias only (dpl_EioQHGq9mN2W4qy8J9tVnNWYzAT2). Real UI signup produced one pending row and Mailtrap message5771361807; actual email/UI confirmation then unsubscribe persisted. Controlled subscriber left unsubscribed. First early attempt rejected before verification with zero rows. Consent checkbox CSS defect fixed;16px/current-width wrapping pass, exact390/768/1440 checks unverified.299 unit/lint/build/bundle/scan+targeted5 DB pass. Orders/inventory fingerprint/outbox/contact unchanged, orderingfalse/MFAtrue, no ORDER_TEST_MODE, no domain/DNS changes. Next: bounded staging order test only after owner approves testSKU/order count/stock-write/open-close limits; then production/operations and domain/launch. Reports: oldv/docs/staging-turnstile-newsletter-2026-10-23.md and staging-to-launch-checklist.md. [[Backend]] [[Verification]]


## Staging commerce/newsletter mail adapter — 2026-10-23
Implemented/tested adapter is now activated on existing staging: owner approved a 30-day My Sandbox-only Admin API token and encrypted Supabase storage; no account/live-domain/project-wide permissions. Newsletter-subscribe/process-outbox ACTIVE v6, six required server-only settings present. One synthetic hosted capture accepted and independently seen in sandbox4975389; correct sender/test alias and two staging-only fragment links. No forwarding rules. Temporary expiring probe, local source and both credentials removed; 12 permanent functions remain. Before/after order counts, inventory fingerprint, outbox/subscriber/contact counts match; ordering false and MFA true. No orders/inventory/customer rows, outbox drain, maintenance, migration, frontend deployment or domain/DNS changes. Auth SMTP unchanged. Latest source gates299 unit/125 local DB/all Deno checks; today probe Deno check, read-only GET smoke and secret scan pass. Actual hosted public opt-in still needs valid bot protection and a separate bounded test; commerce templates locally tested, production delivery/readiness unclaimed. Current report: oldv/docs/staging-email-activation-2026-10-23.md. [[Backend]] [[Verification]]


## Staging schema/history reconciliation — 2026-10-23
Closed the missing-ledger/full-application-schema-comparison blocker: 14 migrations, 2,201 app definition/permission entries match before/after official metadata-only history repair. No application SQL replay. All eight data postconditions pass; ordering false, MFA true and COD disabled. Ledger API access denied; official skip-vault dry-run has no pending migrations/seeds/roles. Fixed the combined fresh-setup newsletter pending condition locally and added eight regression tests. 278 unit + 121 isolated PostgreSQL tests, lint/build/bundle/secret scan pass. Current report: oldv/docs/staging-schema-reconciliation-2026-10-23.md. Earlier absent-history statements are historical. Commerce adapters, production readiness and provider-managed internals/default ACL/backup/restore verification remain separate. No hosted orders, inventory, customer/Storage rows, deployment or domain changes. See [[Backend]] and [[Verification]].


Later staging rollout (2026-10-22): all 12 existing-project Edge Functions ACTIVE v1, stable Auth Site URL and exact recovery callback fixed; method/CORS tests pass with ordering closed. TOKEN_SECRET and exact stable ALLOWED_ORIGINS are configured; bot-test bypass and cron secret remain unset. Full hosted writes, mail/payment adapters and schema-history reconciliation remain open. See oldv/docs/staging-functions-deployment-2026-10-22.md; earlier no-functions statements below are superseded.


Current evidence (2026-10-22): repo ABBI-AMIR/OLdVerge; Vercel abdullah-f9b8/o-ld-verge; Supabase qeczhyiwgvglilwqbveh. Read oldv/docs/integration-audit-2026-10-22.md first. Real hosted catalog and SSR verified, no Edge Functions deployed, migration ledger absent; local database logic passes 113 tests but full hosted writes/Auth/email/admin remain unverified. Older account/branch/setup descriptions below are historical.


Supabase Postgres + Auth + Storage + Edge Functions, frontend stays on Vercel. Branch `feature/supabase-backend` in `SpideyAB/oldverge-storefront`. Back to [[00 Home]].

| Topic | Engineering doc (in `oldv/docs/`) |
|---|---|
| Architecture and schema | `backend-architecture.md` |
| Access rules (RLS, grants, functions) | `backend-security.md` |
| Frontend to backend mapping | `frontend-backend-map.md` |
| Environments and deployment | `vercel-supabase-deployment.md`, `supabase-setup.md` |
| Owner operation (`/admin`) | `admin-owner-guide.md`, `commerce-operations.md` |
| Verification | `backend-verification.md` (see also [[Verification]]) |
| Remaining blockers | [[Launch Blockers]] |

## State (verified 2026-10-18, never collapse these into "done")
- **Implemented locally**: yes (9 migrations, 11 Edge Functions, live storefront mode, `/admin`).
- **Tested locally**: yes. 206 unit tests, 99 DB tests on embedded Postgres (RLS, concurrency, idempotency). Edge Functions were not run in the real Supabase runtime.
- **Deployed to preview**: frontend only, in demo mode (Vercel builds the branch; previews are SSO-protected). No Supabase project exists yet.
- **Deployed to production**: no. Production still lacks the SPA rewrite (deep links 404) until the branch is merged.
- **Approved for selling**: **no**. `ordering_enabled = false`.

## Two modes
Demo (no `VITE_SUPABASE_*` set): the sample storefront. Backend (both set): everything from Supabase, with no sample fallback. See [[Architecture]], [[Checkout and Cart]], [[Commerce Rules]].

## Keeping the GitHub snapshot in sync
Canonical notes are here in `brain/`. `oldv/docs/brain/` is an export: run `node scripts/export-brain.mjs` from `oldv/`, review the diff, then commit. Never edit `docs/brain/` directly.

## Completed one staging order — 2026-10-23
Supersedes the pending CAPTCHA/order checkpoints. Owner authorized exactly one isolated order and temporary test settings, then explicitly approved CAPTCHA interaction. Real Turnstile passed using ordinary keyboard activation after closed-shadow-root coordinate interaction was unavailable. OV-261023-06007E7F (111356a2-284e-4951-8a36-979328482f07), OV-STAGING-TEST-20261023 quantity1/PKR100, testflagtrue/unpaid/no shipment. Checkout readback, local+remote cart clear passed. Mailtrap admin5771475188 captured firsttry; customer5771477816 captured after one controlled retry of initial email_provider_rejected (causeunknown; no status/body retained). Only these two queue entries processed; bothsent. Owner UI cancelled; onecancelevent/onerestock, stock1→0→1. All15 final DB checks pass; original otherinventory fingerprint b9ea8aa506d12e862b942f122854fe71 identical. Orderingfalse, MFAtrue, ORDER_TEST_MODEremoved, testproductarchived/variantinactive, methods/rateoff; prior4policybodies+4drafts+5contactvalues exactly restored, legitimatepublication/auditmetadata retained. Cancelled order/inactivefixture/asset retained. No application-code, deployment, migration, livepayment/courier or oldverge.com changes.45 local checkout/lifecycle/mail tests passed in preflight, not rerun for config-only hosted operations. Report oldv/docs/staging-single-order-test-2026-10-23.md; launch checklist now gates1–2complete, gates3production/operations and4domain/launch remain. No additionalorder/stock permission inferred. Followups: safe provider-status diagnostics, scheduling/monitoring, disabledpaymentclientdisplay for admin sessions; productionpolicies/contact/products/email still needed. Earlier no-order statements are historical.

2026-10-23 staging email diagnostics DEPLOYED: newsletter-subscribe/process-outbox ACTIVEv10. Both downloaded mailer hashes match tested source; four GET/OPTIONS smoke checks pass;15 hosted before/after postconditions identical. Orderingclosed, stockunchanged, no new orders/emails/provider calls/domain activity. No runtime provider-error test; historical rejection causeunknown. Report oldv/docs/staging-email-rejection-2026-10-23.md supersedes prior local-only status.

2026-10-24 merged main staging deploy COMPLETE: exact d1de633 exported/allowlisted source, dpl_3xMMjSmn9E6kjSjzkMsgNAv9LX3a READY; stable https://o-ld-verge.vercel.app now points to https://o-ld-verge-o26m92iyb-abdullah-f9b8.vercel.app.8read-onlyGETcases pass on generated+stable, anonymousauthprotected. Fullinventory/orders/outboxhashes identical, orderingfalse; no neworders/sends/inventory/domainchanges. Gitautodeployblocksretained. Evidence ignored scripts/out/main-deploy-report-20261024.md. Localexcludedfilespreserved; no sourcecommit needed.
