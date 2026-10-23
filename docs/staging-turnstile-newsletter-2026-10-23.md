# Staging Turnstile and newsletter verification — 2026-10-23

## Completed

Configured the real Cloudflare Turnstile widget **OLDVERGE staging** for the existing staging hostname **o-ld-verge.vercel.app** only. Managed mode selected, pre-clearance off. No Cloudflare DNS zone, oldverge.com hostname, nameserver or paid-plan change. The owner completed Cloudflare account sign-in personally.

Private key copied directly into existing Supabase staging secret TURNSTILE_SECRET_KEY; only public sitekey saved as VITE_TURNSTILE_SITE_KEY in the existing Vercel staging project. Private key never printed or filed. ORDER_TEST_MODE remains absent: no always-pass key, bypass, disabled hostname validation or relaxed security was used.

Current protected staging build: **dpl_EioQHGq9mN2W4qy8J9tVnNWYzAT2**, READY. Deployed to existing project prj_KLAre72Wg19Cmhz16wsanrI8Ftwv with automatic custom-domain assignment skipped, then explicitly assigned only o-ld-verge.vercel.app. Vercel's production environment name belongs to this staging-only project; it does not mean oldverge.com was deployed. Vercel authentication protection remains present in deployment metadata.

## Actual hosted newsletter journey

Used only the previously authorized separate staging customer alias. Before the run it had zero newsletter rows. Explicit consent was selected in the actual footer form.

| Step | Evidence | Result |
| --- | --- | --- |
| Early submit before verification finished | UI failure; aggregate SELECT still zero subscribers | Rejected before subscriber creation |
| Real Turnstile | Managed widget visibly reported Success; subsequent real UI submit accepted by existing server Siteverify/hostname checks | Pass |
| Signup | Actual UI saved-pending response; exactly one row with confirmed_at null/unsubscribed_at null | Pass |
| Mail | New Mailtrap message **5771361807**, distinct from earlier synthetic capture; expected staging subject/sender/recipient | Pass |
| Confirmation | Privately inspected exact stable-origin fragment link, clicked Confirm subscription; UI success and persisted confirmed_at | Pass |
| Unsubscribe | Followed the actual email's unsubscribe link, clicked Unsubscribe; UI success and persisted unsubscribed_at | Pass |

The test account is deliberately left **unsubscribed**, with its consent/confirmation history retained. Links and private key were cleared from temporary browser variables; capabilities were not put in documentation or screenshots. Only one real subscriber and one new confirmation email were generated; there was one rejected early attempt followed by the successful signup. Mailtrap stays capture-only with forwarding unchanged. No real Gmail delivery is claimed. Hosted single-use replay/concurrent-signup behavior was not exercised beyond this flow; existing local tests cover one-use confirmation and pending-token rotation.

## Consent-layout defect fixed

The existing broad email-input CSS also styled consent checkboxes. In the hosted footer it enlarged the checkbox and forced consent text off-screen. In src/store.css, restricted newsletter/footer input selectors to type=email and sized the native consent checkbox to16×16 with flex:none. No cart/auth/checkout behavior changed.

Verified corrected hosted checkbox dimensions16×16 and consent text within the current browser width, without horizontal overflow. The browser viewport override did not apply to this background tab: observed width was about650px, so **390/768/1440 breakpoint coverage is not claimed**. Temporary override reset. Safe corrected-form screenshot is under ignored scripts/out/newsletter-consent-corrected-2026-10-23.png.

## Validation and preserved safeguards

- 299 unit tests, lint, client/server build, bundle budgets and source/build secret-pattern scan passed after the CSS fix.
- The targeted isolated PostgreSQL email suite has5 passing tests, including the new production-mode newsletter guard test: missing challenge, wrong host or failed verification produces no subscriber/provider delivery; exact staging-host success creates pending state and mocked mail. Latest prior full DB suite125 tests remains separate evidence; no full DB rerun was needed for CSS/config-only follow-through.
- Read-only before/after verification proves unchanged order count, inventory row count **and inventory-content fingerprint**, outbox count and contact count. Newsletter count changed only by the one authorized test subscriber.
- Ordering=false, admin MFA=true, ORDER_TEST_MODE absent. No orders, inventory changes, outbox drain, maintenance, admin membership changes, schema/history changes, oldverge.com requests or DNS changes.
- Existing Mailtrap/Edge Function deployments and cart/security/performance fixes retained. Only the staging frontend was rebuilt for the public key and consent fix; the real functions use the already configured server secret.

Ignored evidence: turnstile-newsletter-verification.json, turnstile-staging-state-before/after.json, turnstile-newsletter-pending/confirmed/unsubscribed.json and deployment metadata under scripts/out. Safe UI captures show confirmed/unsubscribed states without tokens.

## Remaining phases

Three phases remain after this gate: **bounded staging commerce tests**, **production/operational readiness**, then **domain and launch review**. The next phase can be your first hosted test order, but requires explicit authorization for a named test SKU/account, order count, stock changes and temporary staging readiness/open/close plan. No such writes are authorized by this task. Production prices/photos/policies/shipping/contact, COD/payment choice, live email rather than Sandbox, isolated production setup, admin/maintenance/monitoring and tested backups remain launch requirements. Connecting the domain and enabling sales are separate owner decisions.

See [the staged launch checklist](staging-to-launch-checklist.md). Turnstile setup follows [Cloudflare's widget documentation](https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/).
