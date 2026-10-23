# Staging commerce and newsletter email adapter — 2026-10-23

> Later activation completed on 2026-10-23: sandbox API token stored server-side; newsletter/outbox functions ACTIVE v6; one synthetic hosted capture verified in Mailtrap, with no commerce/database writes and probe cleanup verified. See [activation evidence](staging-email-activation-2026-10-23.md). The initial local-only implementation/activation checklist below is historical; current limitations are in the follow-up.

## Implementation and scope

Implemented locally in `supabase/functions/_shared/mailer.js` and wired into `buildDeps()` in `deps.ts`. The existing `newsletter-subscribe` and `process-outbox` handlers now use the adapter when configured. **Hosted activation has not been performed:** no server secrets were changed, functions deployed, Mailtrap API messages sent, outbox jobs claimed or schedulers enabled in this task. Supabase Auth's already-working SMTP setup remains separate and unchanged.

The provider is Mailtrap's [Email Sandbox send API](https://docs.mailtrap.io/developers/email-sandbox/send-test-emails), using the documented `Api-Token` header. The adapter has one fixed endpoint: `https://sandbox.api.mailtrap.io/api/send/4975389`. It has no live sending endpoint, configurable host, SMTP connection, production sender domain or fallback provider.

Configuration must identify the existing Supabase staging project `qeczhyiwgvglilwqbveh`, stable site `https://o-ld-verge.vercel.app` and sandbox `4975389`. A wrong/missing target, token, provider, allowlist or admin recipient disables the adapter. Exact recipient addresses are required; wildcards are not accepted. Admin recipients and the source customer/contact address must be allowlisted, including for admin notices. Commerce notifications also require `orders.is_test=true`. Unsupported kinds and invalid payloads fail closed.

## Supported messages

| Kind | Source | Contents |
| --- | --- | --- |
| `newsletter_confirmation` | Validated email plus newly generated tokens from handler | Confirmation and unsubscribe links using the existing staging routes with tokens in fragments |
| `order_confirmation` | Outbox `order_id`; read selected `orders` columns | Order number, name, whole-PKR total, actual payment/fulfilment states, account link and guest-code reminder |
| `admin_new_order` | Outbox `order_id`; same minimal read | Test order summary and staging admin order link |
| `admin_new_contact_message` | Outbox `message_id`; read selected `contact_messages` columns | Sender, contact type/message and staging admin link |

All messages have a reserved `example.test` sender and explicit STAGING subject/body labels. There are no attachments, CC/BCC recipients, raw SQL errors, shipping addresses, phone numbers or credential fields. User content is HTML escaped; text and HTML bodies are both supplied. Confirmation emails contain required one-use links, but tokens/links are never logged or returned by the public subscribe response. This adds confirmation mail, not a newsletter campaign/bulk sending feature.

Order emails provide a minimal summary, not an itemized invoice. No guest order capability is generated from an order ID or stored in the outbox: recipients retain the access code from checkout. A payment status is reported as stored; no payment settlement is inferred. Unimplemented payment integration remains outside this change.

## Delivery and failure behavior

- The adapter shares a ten-second deadline across record lookup, provider request and response-body consumption. It rejects redirects, bounds the response body to 16 KiB and requires explicit successful acknowledgement with one message ID.
- Provider rejection, transport/timeout errors, malformed responses, lookup failures and blocked recipients produce fixed error codes. Provider responses, recipient data, capabilities and credentials are not logged or copied into `notification_outbox.last_error`.
- `process-outbox` retains cron/admin authorization, rate limits and the existing database claim/backoff rules. Missing configuration claims nothing. A message is marked sent only after provider acceptance; failure records a sanitized code. Once acknowledged and marked sent, a later worker does not resend it.
- Delivery remains **at least once**, not exactly once: an ambiguous timeout or database failure after provider acceptance can produce a duplicate on a later retry. No undocumented provider idempotency guarantee or internal immediate retry was added. Existing outbox dedupe keys prevent duplicate enqueueing; they do not prove external exactly-once delivery.
- Missing mail configuration now gives newsletter signup `503 email_not_configured` before subscription writes. Provider failure gives `503 email_unavailable`; a pending subscription can retry with fresh confirmation/unsubscribe tokens. Already-confirmed subscribers receive the same generic success response without another email. Only the one-use database confirmation function confirms a subscription; provider acceptance does not.
- Consent checks, honeypot handling, Turnstile checks, token hashing, admin MFA, cart synchronization and closed-ordering safeguards remain in place. No bot bypass or `ORDER_TEST_MODE` setting was added for hosted testing.

## Server-only configuration for later activation

Names are listed with blank values in `supabase/email-secrets.example`:

| Name | Required configuration |
| --- | --- |
| `COMMERCE_EMAIL_PROVIDER` | `mailtrap_sandbox` |
| `COMMERCE_EMAIL_SITE_URL` | Exact stable staging origin above |
| `MAILTRAP_SANDBOX_ID` | Existing sandbox ID above |
| `MAILTRAP_SANDBOX_API_TOKEN` | Private API credential authorized for that sandbox; **not** its SMTP password or GitHub password |
| `COMMERCE_EMAIL_ALLOWED_RECIPIENTS` | Exact authorized test addresses, comma separated; initially only the separate staging customer alias |
| `COMMERCE_EMAIL_ADMIN_TO` | The same authorized staging test alias, included in the allowlist |

`SUPABASE_URL` is provided by the Edge runtime and must match the pinned staging project. Never put mail credentials in a `VITE_*` variable, frontend build, committed env file, report or chat. Existing Auth SMTP settings are not read or copied by this adapter. No SMTP credential reset is needed.

For later activation, the owner must supply the API credential directly to server-only Supabase secrets through a secure handoff. Use the existing Mailtrap sandbox with forwarding disabled; do not enable Email Sending, add oldverge.com, purchase a plan or rotate working SMTP credentials. A suitably scoped API token is separate from Auth's saved SMTP password. Then deploy the reviewed Edge Function sources to the existing staging project. Keep the outbox scheduler disabled until its backlog and intended recipients are reviewed.

Hosted newsletter verification also needs the existing bot protection to be correctly configured; do not bypass Turnstile to make this test pass. A bounded sandbox-only capture test can verify transport/templates without creating an order, enabling ordering, invoking maintenance or draining the hosted outbox. Real order/inventory writes remain prohibited. This task does not claim provider capture, inbox deliverability or production readiness for the new adapter.

## Tests

`mailer.test.js` uses a mocked Mailtrap transport for all four supported kinds, fixed sandbox endpoint/headers, correct recipient mapping, reserved sender, fragment links, escaping, incomplete/wrong/live target rejection, allowlist enforcement, invalid tokens/IDs, unknown kinds, non-test orders, lookup failure, HTTP 401/429/500/redirects, provider acknowledgement validation, bounded parsing and deadlines through lookup/headers/body. No network email is sent.

`supabase/tests/email-adapter.test.js` runs real newsletter/outbox SQL in an isolated local PostgreSQL database and mocks the provider. It covers no-adapter refusal before writes; pending-token rotation and stale-link rejection; one-use confirmation; no repeat email to confirmed subscribers; unsubscribe using the current token; honest provider failure/retry; acknowledged/failed outbox states; sanitized persisted errors; and no resend after a successful send. Those four new integration tests create **no orders or inventory rows**, and assert ordering remains closed. Contact fixture/outbox changes stay local. Existing database-suite order/inventory fixtures remain confined to disposable local databases.

Validation: **299 unit tests and 125 isolated PostgreSQL tests passed**, including 21 new adapter unit cases and four new integration tests. Lint, client/server build, bundle budgets, source/build secret scan and Deno checks for all 12 Edge Functions passed. Final staging read-only postconditions confirm ordering closed, admin MFA required and COD disabled. Existing cart/security/schema regressions still pass. No UI layout changed; responsive-browser testing was not repeated for this server-only change. No database migration or reconciliation-ledger change is required. Hosted transport capture remains unverified until a Sandbox API token is supplied and the reviewed functions are deployed.
