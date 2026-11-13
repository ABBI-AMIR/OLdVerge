<!-- SNAPSHOT exported from the canonical Obsidian brain (Downloads/oldv/brain). Do not edit here: edit the brain, then run `node scripts/export-brain.mjs`. -->
---
type: index
updated: 2026-10-18
---
# OLDVERGE Brain (start here)

The long-term memory for the OLDVERGE storefront. Claude Code reads this before big changes and writes to it after every piece of work. Obsidian shows how everything connects (Graph view).

> Code lives in `oldv/` (React + Vite, a Git repository). Notes live here in `brain/` (not in Git). Both are in the same vault.



## Completed staging Auth/email verification — 2026-10-23
Mailtrap sandbox SMTP is saved and working without forwarding. Actual hosted signup/confirmation, pre-confirmation denial, explicit login, reload persistence, logout gate, recovery email/reset, old-password rejection and replacement-password login all pass. Same ordinary test customer/profile, zero admin memberships; existing admin unchanged. Final ordering=false rechecked. No orders/inventory/domain/deployment/source changes. Sandbox capture is not real inbox deliverability or a commerce-mail adapter. Current evidence: oldv/docs/staging-auth-email-verification-2026-10-22.md. Earlier pending checkpoints are historical.


## Hosted Auth/email checkpoint — 2026-10-23
Saved Supabase SMTP verified against Mailtrap Email Sandbox; no forwarding. One ordinary test customer/profile created; existing admin unchanged. Actual confirmation/recovery messages captured. Pre-confirmation login denial, confirmation, explicit login, session persistence, logout gate and admin denial passed. Recovery opens usable reset form. Owner must enter/submit replacement password; reset completion, old-password rejection and new-password login remain unverified. Ordering rechecked false. No orders, inventory, production domain, deployment or application-code changes. Commerce email adapter/production deliverability remain outside this evidence. Details: oldv/docs/staging-auth-email-verification-2026-10-22.md. Earlier unsaved-SMTP checkpoints are historical.


## Map
- **Project**: [[Overview]] · [[Stack]] · [[Architecture]] · [[Routes]] · [[Commands]] · [[File Map]] · [[Git and GitHub]]
- **Brand**: [[Brand Identity]] · [[Colours and Fonts]] · [[Brand Rules]]
- **Commerce**: [[Commerce Rules]] · [[Products]] · [[Policies and Contact]] · [[Checkout and Cart]]
- **Backend**: [[Backend]]
- **Assets**: [[Images]]
- **Status**: [[Known Issues]] · [[Launch Blockers]] · [[Verification]] · [[Roadmap]] · [[Code Audit 2026-10-18]]
- **History**: [[Decision Log]] · [[Session Log]]
- **How this brain works**: [[How to Use This Brain]]

## Right now (2026-10-23)
Existing staging retained; Auth/schema/newsletter and the single owner-approved unpaid order test are complete. OV-261023-06007E7F cancelled, test stock restored exactly once, browser/remote cart empty and both Mailtrap messages captured (customer needed one retry; rejection cause unknown). Ordering closed, MFA required, testmode removed, fixture archived/inactive, temporary methods disabled, prior policy/contact content restored, every other inventory row unchanged. No oldverge.com changes or further order/stock permission. Next gates: production/operational readiness, then separately approved domain/launch. Current report: oldv/docs/staging-single-order-test-2026-10-23.md. [[Known Issues]] [[Verification]]

