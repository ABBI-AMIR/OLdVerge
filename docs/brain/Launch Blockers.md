<!-- SNAPSHOT exported from the canonical Obsidian brain (Downloads/oldv/brain). Do not edit here: edit the brain, then run `node scripts/export-brain.mjs`. -->
---
type: status
updated: 2026-10-18
---
# Launch Blockers

## Production status — 2026-11-13
Production is live at oldverge.com with ordering closed. Remaining before opening: (1) Mailtrap live email: owner adds GoDaddy CNAMEs mt24, rwmt1._domainkey, rwmt2._domainkey, then SMTP/secrets/schedule; (2) one live test order, then cancel; (3) owner switches ordering on and replaces the sample-price footer notice. Earlier items below are historical. See oldv/docs/production-setup-2026-11-13.md. [[Session Log]]

## Turnstile/newsletter verification checkpoint — 2026-10-23
COMPLETE: real staging-only Managed Turnstile configured, private key Supabase/public key Vercel, pre-clearance off, no test bypass. Protected frontend deployed to existing staging project and stable alias only (dpl_EioQHGq9mN2W4qy8J9tVnNWYzAT2). Real UI signup produced one pending row and Mailtrap message5771361807; actual email/UI confirmation then unsubscribe persisted. Controlled subscriber left unsubscribed. First early attempt rejected before verification with zero rows. Consent checkbox CSS defect fixed;16px/current-width wrapping pass, exact390/768/1440 checks unverified.299 unit/lint/build/bundle/scan+targeted5 DB pass. Orders/inventory fingerprint/outbox/contact unchanged, orderingfalse/MFAtrue, no ORDER_TEST_MODE, no domain/DNS changes. Next: bounded staging order test only after owner approves testSKU/order count/stock-write/open-close limits; then production/operations and domain/launch. Reports: oldv/docs/staging-turnstile-newsletter-2026-10-23.md and staging-to-launch-checklist.md. [[Backend]] [[Verification]]


## Staging commerce/newsletter mail adapter — 2026-10-23
Implemented/tested adapter is now activated on existing staging: owner approved a 30-day My Sandbox-only Admin API token and encrypted Supabase storage; no account/live-domain/project-wide permissions. Newsletter-subscribe/process-outbox ACTIVE v6, six required server-only settings present. One synthetic hosted capture accepted and independently seen in sandbox4975389; correct sender/test alias and two staging-only fragment links. No forwarding rules. Temporary expiring probe, local source and both credentials removed; 12 permanent functions remain. Before/after order counts, inventory fingerprint, outbox/subscriber/contact counts match; ordering false and MFA true. No orders/inventory/customer rows, outbox drain, maintenance, migration, frontend deployment or domain/DNS changes. Auth SMTP unchanged. Latest source gates299 unit/125 local DB/all Deno checks; today probe Deno check, read-only GET smoke and secret scan pass. Actual hosted public opt-in still needs valid bot protection and a separate bounded test; commerce templates locally tested, production delivery/readiness unclaimed. Current report: oldv/docs/staging-email-activation-2026-10-23.md. [[Backend]] [[Verification]]


## Staging schema/history reconciliation — 2026-10-23
Closed the missing-ledger/full-application-schema-comparison blocker: 14 migrations, 2,201 app definition/permission entries match before/after official metadata-only history repair. No application SQL replay. All eight data postconditions pass; ordering false, MFA true and COD disabled. Ledger API access denied; official skip-vault dry-run has no pending migrations/seeds/roles. Fixed the combined fresh-setup newsletter pending condition locally and added eight regression tests. 278 unit + 121 isolated PostgreSQL tests, lint/build/bundle/secret scan pass. Current report: oldv/docs/staging-schema-reconciliation-2026-10-23.md. Earlier absent-history statements are historical. Commerce adapters, production readiness and provider-managed internals/default ACL/backup/restore verification remain separate. No hosted orders, inventory, customer/Storage rows, deployment or domain changes. See [[Backend]] and [[Verification]].




## Completed staging Auth/email verification — 2026-10-23
Mailtrap sandbox SMTP is saved and working without forwarding. Actual hosted signup/confirmation, pre-confirmation denial, explicit login, reload persistence, logout gate, recovery email/reset, old-password rejection and replacement-password login all pass. Same ordinary test customer/profile, zero admin memberships; existing admin unchanged. Final ordering=false rechecked. No orders/inventory/domain/deployment/source changes. Sandbox capture is not real inbox deliverability or a commerce-mail adapter. Current evidence: oldv/docs/staging-auth-email-verification-2026-10-22.md. Earlier pending checkpoints are historical.


## Hosted Auth/email checkpoint — 2026-10-23
Saved Supabase SMTP verified against Mailtrap Email Sandbox; no forwarding. One ordinary test customer/profile created; existing admin unchanged. Actual confirmation/recovery messages captured. Pre-confirmation login denial, confirmation, explicit login, session persistence, logout gate and admin denial passed. Recovery opens usable reset form. Owner must enter/submit replacement password; reset completion, old-password rejection and new-password login remain unverified. Ordering rechecked false. No orders, inventory, production domain, deployment or application-code changes. Commerce email adapter/production deliverability remain outside this evidence. Details: oldv/docs/staging-auth-email-verification-2026-10-22.md. Earlier unsaved-SMTP checkpoints are historical.


## Current integration blockers (2026-10-22)
Rollout update: all 12 staging Edge Functions deployed and exact stable Auth Site URL/reset callback fixed. Those two blockers are closed; no hosted write journey was run. Remaining requirements below still include safe test accounts/data/mail/bot setup, schema-history reconciliation and commercial readiness. See oldv/docs/staging-functions-deployment-2026-10-22.md. The following paragraph describes the preceding audit baseline.

Reuse existing staging projects; no new project needed. Before hosted customer write tests: deploy missing Edge Functions after setting safe test-mode/secrets/mail restrictions, fix exact stable staging Auth callbacks, establish authorized test accounts/SKU boundaries and reconcile absent migration history against actual definitions. Custom SMTP disabled; commerce/newsletter adapter and online payment provider absent. Ordering remains closed; oldverge.com not attached. Full evidence and manual steps: oldv/docs/integration-audit-2026-10-22.md. Historical list below includes stale account/project assumptions.


Needs the **owner** (Claude cannot invent these). Publishing the code to GitHub does not resolve any of them.
1. **A real contact channel** (email, WhatsApp, form service). The site gives visitors no way to reach the business. [[Policies and Contact]]
2. **Real policy terms** (shipping, returns/refunds, privacy, terms). [[Policies and Contact]]
3. **Correct, owner-approved photography**: five requested watch brands, four colour-matched quarter zips, correct photos for Casio MTP, Citizen, Orient, Timex. Record each in `docs/asset-sources.md`. [[Images]]
4. **Commerce path**: provider or manual flow (WhatsApp/COD), delivery and exchange terms, then real checkout. [[Checkout and Cart]]
5. Real watch listings (model refs, prices) for the five requested brands. [[Products]]
6. Confirmed prices, SKUs and stock.
7. Owner decisions listed in [[Known Issues]]: demo delivery numbers, duplicate shipping/returns pages, Tailwind, contact gate.
8. **Supabase project and keys**: create/authorize a project, set `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` in Vercel, server secrets in Supabase, first admin. Checklist in `oldv/docs/supabase-setup.md`. [[Backend]]
9. **Payment method and email provider** (COD and/or online provider; sender for order emails). [[Backend]]
10. **Bot protection**: Cloudflare Turnstile widget + `TURNSTILE_SECRET_KEY` before ordering opens (security review). [[Backend]]
11. **Merge approval** for `feature/supabase-backend` (also fixes production 404 on deep links).
12. ~~GitHub account identity and CI~~ Done 2026-10-18: private repo `SpideyAB/oldverge-storefront`, CI green. [[Git and GitHub]]

Technical, no owner input needed: real-device, Safari/Firefox and accessibility testing; performance and code splitting. See [[Roadmap]].

## Authorized one-order staging test — preflight 2026-10-23
Owner explicitly authorized exactly one isolated test-SKU order, only its stock adjustment, temporary ordering, Mailtrap verification, cancellation, and closure. Read-only hosted preflight: ordering=false, MFA=true, zero orders/pending outbox, CODdisabled, no shipping rates/methods, no ready products/contact, four policies without admin publication. No hosted commerce writes. Proposed test-only PKR100 SKU/unit, free no-shipment delivery, separate unpaid test COD, test contact and explicit test policies prepared for owner approval in oldv/docs/staging-single-order-test-2026-10-23.md. Current customer correctly denied admin; signed it out and prepared existing owner sign-in/MFA, no impersonation or security bypass. Waiting on approval and owner sign-in.45 local DB checkout/lifecycle/email tests pass. No real order result claimed; oldverge.com untouched.

## One staging order — approved configuration, waiting for human check (2026-10-23)
Owner approved exact temporary settings and completed owner/MFA login. Prepared isolated OV-STAGING-TEST-20261023 at PKR100 with verifiedstock1, approved synthetic test graphic, separate free/no-shipment delivery and unpaid/no-collection test COD, test contact; owner UI published all four test policiesv2. ORDER_TEST_MODE=true. Opened through owner toggle, then CLOSED before submitting when real Cloudflare widget required interactive human check. No order submitted, zero orders/outbox confirmed, otherstock fingerprint b9ea8aa506d12e862b942f122854fe71 unchanged; teststock1/reserved0, MFAtrue. Checkout tab30 pending human check, adminsettings28/product29 preserved. Owner must complete Verify human only, not Place order. Contact/policy snapshot+cleanup SQL in ignored scripts/out; archive/deactivate/disabletemporary config+restorecontent+unsettestmode after cancellation. Current report oldv/docs/staging-single-order-test-2026-10-23.md supersedes earlier pendingapproval. No oldverge.com/payment/courier activity.

## Completed one staging order — 2026-10-23
Supersedes the pending CAPTCHA/order checkpoints. Owner authorized exactly one isolated order and temporary test settings, then explicitly approved CAPTCHA interaction. Real Turnstile passed using ordinary keyboard activation after closed-shadow-root coordinate interaction was unavailable. OV-261023-06007E7F (111356a2-284e-4951-8a36-979328482f07), OV-STAGING-TEST-20261023 quantity1/PKR100, testflagtrue/unpaid/no shipment. Checkout readback, local+remote cart clear passed. Mailtrap admin5771475188 captured firsttry; customer5771477816 captured after one controlled retry of initial email_provider_rejected (causeunknown; no status/body retained). Only these two queue entries processed; bothsent. Owner UI cancelled; onecancelevent/onerestock, stock1→0→1. All15 final DB checks pass; original otherinventory fingerprint b9ea8aa506d12e862b942f122854fe71 identical. Orderingfalse, MFAtrue, ORDER_TEST_MODEremoved, testproductarchived/variantinactive, methods/rateoff; prior4policybodies+4drafts+5contactvalues exactly restored, legitimatepublication/auditmetadata retained. Cancelled order/inactivefixture/asset retained. No application-code, deployment, migration, livepayment/courier or oldverge.com changes.45 local checkout/lifecycle/mail tests passed in preflight, not rerun for config-only hosted operations. Report oldv/docs/staging-single-order-test-2026-10-23.md; launch checklist now gates1–2complete, gates3production/operations and4domain/launch remain. No additionalorder/stock permission inferred. Followups: safe provider-status diagnostics, scheduling/monitoring, disabledpaymentclientdisplay for admin sessions; productionpolicies/contact/products/email still needed. Earlier no-order statements are historical.
