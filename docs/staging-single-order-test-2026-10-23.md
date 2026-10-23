# One staging order: readiness and bounded test plan

## Final verified result — COMPLETE

Exactly one hosted staging order was created: **OV-261023-06007E7F** (`111356a2-284e-4951-8a36-979328482f07`), for one `OV-STAGING-TEST-20261023` unit at PKR 100 plus PKR 0 shipping. `is_test=true`; payment remained unpaid, and no payment or courier provider was used. The real checkout confirmation loaded its order readback, and both the browser cart and persisted account cart were empty afterward.

Real Cloudflare verification succeeded. The user explicitly approved clicking its checkbox; coordinate interaction was unavailable inside its closed shadow root, so ordinary keyboard focus/Space activated the visible control. No bypass/test key/token injection was used. One earlier request was rejected when ordering was closed too soon; a hosted SELECT proved zero orders before retry. No duplicate order or quantity was created.

Ordering was closed immediately after the successful creation was verified. The authenticated owner then processed the two notifications for this order only (the queue had no unrelated entries):

| Notification | Mailtrap capture | Result |
| --- | --- | --- |
| Admin new-order alert | [5771475188](https://mailtrap.io/sandboxes/4975389/messages/5771475188) | Captured on first attempt |
| Customer confirmation | [5771477816](https://mailtrap.io/sandboxes/4975389/messages/5771477816) | Initial provider rejection, then captured on one controlled retry |

Both messages went only to the allowlisted staging alias in sandbox 4975389. Customer message source was checked for the correct order number, staging/no-real-purchase disclaimer, PKR 100, unpaid and unfulfilled states, and absence of oldverge.com. Provider rejection cause is **unverified**: the adapter retained only `email_provider_rejected`, not HTTP status/body. The retry advanced only this order's failed customer notification deadline; it did not replay the sent admin alert or create another order. Both rows are now sent with no pending/failed queue entries. This proves sandbox capture, not live inbox delivery or automatic scheduling.

The real owner cancellation workflow produced exactly one cancellation event and one `cancel_restock` movement. Final order state is **cancelled / unpaid / restocked**. The test stock journey was **1 → 0 → 1**, reserved stock stayed zero, and every other inventory row has exactly its original fingerprint.

All **15 hosted final postconditions passed** (`scripts/out/order-test-final.json`). All four policy published bodies, all four drafts and all five contact values exactly match their saved pre-test content (`order-test-restored-content.json`). Legitimate version-2 publication metadata/audit history remains; it is not erased or forged. The original restored policy text includes historical/demo statements and is **not production-approved**.

Final cleanup: ordering false; admin MFA true; all payment methods disabled, including original COD; temporary shipping/rate disabled; test product archived and variant inactive; restored synthetic test stock retained at one unit; temporary `ORDER_TEST_MODE` absent. Real Turnstile and the restricted Mailtrap adapter remain configured. The cancelled order, inactive fixture, asset and audit records remain for traceability. No application source/security/cart changes, migrations, deployment, real customer stock edits, load tests, live payment, shipment, or oldverge.com/DNS changes were made for this run.

Evidence: `scripts/out/staging-order-cancelled-2026-10-23.png`, the two Mailtrap captures above, and ignored read-only status/detail/final SQL evidence. The 45 local checkout/lifecycle/email regression tests passed during this task's preflight; they were not rerun after configuration-only hosted testing.

Remaining follow-ups: diagnose provider rejection with safe status-only diagnostics before unattended delivery; configure/review worker scheduling and monitoring; correct the admin-authenticated checkout's display of disabled payment methods (the server correctly refuses disabled methods); finish production policies/contact/products/stock/shipping/live-email/operations before any domain launch. Online payment/provider settlement, concurrent checkout load, courier dispatch and live deliverability were not tested.

## Authorization

The owner authorized exactly one staging order, an isolated test SKU, adjustments only to that SKU's test stock, temporarily opening staging ordering, Mailtrap verification, cancellation, and closing ordering afterward. oldverge.com remains untouched. This is not authorization for real payment collection or dispatch.

## Read-only preflight

Verified against existing Supabase project `qeczhyiwgvglilwqbveh` on 2026-10-23:

- Ordering is false; admin MFA remains required.
- Zero orders and zero pending outbox messages.
- COD exists but is disabled; no shipping methods or enabled rates exist.
- No published, ready-to-sell products exist.
- No contact channel is configured.
- All four policies lack admin publication. Seed publication timestamps do not satisfy the gate.
- Inventory fingerprint: `b9ea8aa506d12e862b942f122854fe71`.

No hosted commerce writes have been performed for this test. The readiness query is in ignored `scripts/out/order-test-readiness.sql`. The ordinary customer session was signed out to prepare the real owner admin sign-in; no membership or MFA settings changed.

## Approved temporary staging configuration

Owner approved these exact values and signed in as the existing owner with MFA. Applied on 2026-10-23. Ordering was opened through the real owner UI and then closed again before submission when Cloudflare required a human check. No order has been created yet.

The repository requires owner-approved policies, contact, shipping and payment configuration before its owner-only ordering switch can open. Review these concrete test-only values before proceeding:

| Item | Proposed value |
| --- | --- |
| Product / SKU | `OLDVERGE staging checkout test` / `OV-STAGING-TEST-20261023`; a new isolated variant, quantity one, PKR 100; clearly synthetic listing and cover asset |
| Test stock | One unit, verified only for this fixture; cancel must restore that unit; archive the listing and deactivate the variant afterward |
| Shipping | `staging_test`, label `Staging test — no shipment`, PKR 0; no courier integration or dispatch |
| Payment | Separate `staging_test_cod` method, COD kind, label `Staging test — no payment collected`; existing COD row stays disabled |
| Contact | Existing authorized alias `abbiamir19+oldverge-staging@gmail.com`; test messages are captured in Mailtrap, not forwarded |
| Order mode | Temporarily set server-only `ORDER_TEST_MODE=true`; remove after closure; real Turnstile remains required |

Proposed temporary policy text, to be published through the authenticated owner workflow:

- **Shipping:** “This protected staging site is for an authorized checkout test only. No goods will be shipped and no courier will be booked. The test order will be cancelled.”
- **Returns & refunds:** “No payment will be collected for this staging test. The single test order will be cancelled and its test stock restored. This is not the store's live returns or refunds policy.”
- **Privacy:** “Use only the authorized staging test email and synthetic checkout details. Test account and order records are stored in the existing Supabase staging project. Test emails are captured in Mailtrap Sandbox. Do not enter real address, phone or payment details.”
- **Terms:** “This protected staging checkout is solely for one owner-authorized test. It does not arrange a real sale, payment collection or shipment. The test order will be cancelled. Live store terms are not yet approved.”

These proposed texts describe this test only; they must never be reused as production policies. Preserve the pre-test policy/contact configuration and restore its content afterward; retain legitimate publication/audit history rather than forge or erase it. Disable the new shipping and payment entries after testing.

## Execution and cleanup requirements

1. Obtain owner approval of the temporary values and a real owner admin session with MFA. Do not manufacture JWT claims, disable MFA, grant membership, or bypass readiness.
2. Save a non-secret rollback snapshot of affected configuration and aggregate baselines. Record the test product and variant IDs. Verify every other SKU remains unavailable to checkout during the temporary window.
3. Create only this fixture and adjust only its stock. Publish the approved test policies, configure the isolated test payment/shipping method and test contact, and enable test mode.
4. Open ordering using `admin_set_ordering_enabled`; submit exactly one real browser checkout for one unit, with real Turnstile and the authorized email. Do not blindly repeat an ambiguous submission; query for the unique test order first.
5. Close ordering immediately after order creation. Verify `is_test=true`, one matching line, expected total PKR 100, unpaid payment state, correct stock change, and an empty checkout cart where applicable.
6. Process only notifications attributable to this order through the configured adapter; independently inspect the customer and admin Mailtrap captures. Never drain an unrelated backlog.
7. Cancel the unique order through `admin_cancel_order`; verify cancelled status and exactly one stock restoration. Retain the test order and its audit history.
8. In cleanup, always close ordering, disable test payment/shipping, archive/deactivate the fixture, restore prior contact/policy content, and remove test mode. Verify the inventory of every other variant matches its baseline, MFA is still required, no real COD is enabled, and no unrelated orders exist.

## Earlier checkpoint — superseded by the completed result above

**Checkout not submitted:** waiting for the owner to complete Cloudflare's interactive “Verify you are human” checkbox in Checkout (tab 30). Do not click Place order. Temporary fixture/configuration remains prepared, and server-only test mode is enabled. Ordering is closed, confirmed by a fresh hosted SELECT. No checkout creation, commerce email delivery, cancellation, or stock restoration is claimed yet.

Applied and verified:

- Real owner admin session; MFA remains required, no membership changes or impersonation.
- Product `d23e0000-0000-4000-8000-000000000001`, variant `d23e0000-0000-4000-8000-000000000002`, SKU `OV-STAGING-TEST-20261023`.
- One verified synthetic unit; all other inventory fingerprint still exactly `b9ea8aa506d12e862b942f122854fe71`.
- Original synthetic PNG generated locally; uploaded through the admin image pipeline, provenance recorded, approved and set as cover. Clearly labelled test-only, not a product photograph.
- Only test product is marked ready to sell; all four test policy drafts published as version 2 through the authenticated owner UI.
- One cart addition; authoritative quote PKR 100, shipping PKR 0; synthetic address and all-zero test phone; existing authorized test alias. Session is the owner's authenticated browser, with the test alias used as checkout contact; this is not a separate customer-login test.
- Disabled real COD remains disabled in the database. The admin-authenticated checkout UI also displays it because admins can read disabled methods; explicitly selected the separate test method. No attempt to use real COD.
- Fresh hosted status: ordering false, orders 0, outbox empty, test stock on-hand 1/reserved 0/verified true, MFA true.

Rollback material is ignored and local: `scripts/out/order-test-before.json` (prior policy/draft/contact content and inventory baseline), `order-test-cleanup.sql` (requires ordering already closed; archives fixture, deactivates variant, disables temporary payment/shipping and restores prior content while retaining publication/audit history). After the eventual test, cancel through the admin workflow and verify restoration before cleanup. Remove `ORDER_TEST_MODE` afterward. Never leave ordering open across a handoff.

Local regression verification: `npm run test:db -- supabase/tests/checkout.test.js supabase/tests/lifecycle.test.js supabase/tests/email-adapter.test.js` passed all 45 tests across three files. This uses isolated embedded PostgreSQL, not staging. No source changes were required or made in this preflight.

## Verification visibility checkpoint — 2026-10-23
Owner could not find the checkbox because refreshed checkout hides the form while ordering is closed. Reopened through real owner UI for a bounded active window; restored synthetic form, real Turnstile initially completed automatically. Submitted once but closed ordering before the async request finished: rejected by closed gate, hosted SELECT confirmed orders0/outboxempty/teststock1, other inventory unchanged. Reopened and prepared same fixture again; Cloudflare required interactive checkbox. Displayed it below Place order and requested action-time confirmation to click it (not yet received). Closed ordering again before handoff. Final hosted status must be checked by the accompanying tool result. Do not claim order/email/cancellation completion. Keep temporary testmode/configuration prepared pending CAPTCHA approval; prior rollback remains available. No domain changes.
