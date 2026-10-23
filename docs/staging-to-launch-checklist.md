# Path from staging to order tests and oldverge.com

## Current boundary

Existing Vercel/Supabase projects are development/staging. Ordering is closed. The owner-authorized single-SKU, single-order staging test is complete: checkout/cart clearing, customer/admin Mailtrap captures, cancellation and exactly one stock restoration passed. The test listing is archived, temporary methods disabled, prior policy/contact content restored and test mode removed. No authorization remains for additional orders/stock edits or connecting oldverge.com. Auth signup/login/recovery, schema/history reconciliation and newsletter signup/confirmation/unsubscribe are also verified. Evidence: staging-single-order-test-2026-10-23.md and staging-turnstile-newsletter-2026-10-23.md.

## Four gates, including the current task

These are work phases, not four clicks or a guaranteed completion date. Several launch decisions still need the owner.

| Gate | Evidence needed | When orders can be tested |
| --- | --- | --- |
| 1. Staging form protection and newsletter — COMPLETE | Staging-only Turnstile hostname/key pair, real Siteverify success, captured confirmation, one-use confirmation and unsubscribe through UI; ordering still closed | Finish this before planning the hosted order run |
| 2. Bounded staging commerce test — COMPLETE for one unpaid test order | OV-261023-06007E7F: one isolated SKU/unit, real Turnstile checkout, browser/remote cart clear, two Mailtrap captures (customer required one retry), owner cancellation and stock1→0→1; all15 cleanup checks pass. Owner-authenticated checkout with the test alias; prior separate customer Auth verification remains separate evidence | This approval is used up. Additional order tests require new limits; no live payment/provider/courier or concurrency test is implied |
| 3. Production and operational readiness | Choose isolated production environment; verify real products/photos/prices/stock, payment method (COD and/or selected provider), shipping/rates/contact/policies; live email provider/domain/sender rather than Mailtrap Sandbox; maintenance/outbox schedule, monitoring, tested backups/restore and admin operations | Staging tests do not approve real selling. Readiness items can be worked in parallel after a scoped staging test plan |
| 4. Domain and launch review | Review production target, exact GoDaddy DNS records/rollback, HTTPS, production Auth redirects/CORS/Turnstile/email links, protected preview and launch smoke. Connect domain only on owner approval; enable sales separately after readiness passes | Domain connection can publish a closed storefront; accepting real orders is a distinct owner-approved action |

For a COD-only launch, an online payment gateway need not be selected, but the COD workflow and delivery/returns terms must be approved and tested. No integrated online payments, courier bookings, live email deliverability or production readiness are implied by local tests. The admin records shipments/refunds; it does not book a courier or move money without a provider integration.

Turnstile can be configured for `o-ld-verge.vercel.app` without adding oldverge.com to Cloudflare or changing its nameservers. Staging Mailtrap remains capture-only. Existing sandbox-only recipient and test-order restrictions should stay in place during all staging tests.
