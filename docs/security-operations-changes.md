# Security and operations changes — 2026-10-22

This document supersedes older security/deployment defaults in the historical audit and README.

## Implemented

- Production builds require valid public Supabase configuration or an explicit `VITE_STORE_MODE=demo`. Invalid/partial configuration fails builds; runtime invalid configuration shows an unavailable screen. Only the four explicitly defined public variables reach the browser; arbitrary `VITE_*` and `NEXT_PUBLIC_*` variables do not.
- Turnstile widgets are present on checkout, contact, returns and both newsletter forms. Tokens reset after each request. Production handlers fail closed without a secret and verify the returned hostname against `ALLOWED_ORIGINS`. Isolated `ORDER_TEST_MODE=true` may bypass missing bot configuration and marks orders as tests. Do not use test mode for real selling.
- Rate limits apply independently to email and normalized phone number. Guest lookup limits include the capability hash so knowing an order number cannot exhaust another capability's bucket. Existing IP limits still apply.
- JSON and image request streams stop at their byte limits. JPEG APP1/XMP segments are checked even after dimensions; invalid segment/chunk lengths are refused. Approval runs full upload validation and refuses an existing public object whose bytes differ.
- The new migration enables mandatory admin MFA. AAL1 members cannot use admin RPCs; the admin sign-in screen offers authenticator enrollment. Prepare an authenticator and verify AAL2 access during rollout; owner SQL remains the recovery path.
- Address creation/update and changing the previous default execute in one transaction under the customer's RLS identity. Failed writes leave the previous default intact.
- Checkout locks always release, including failures before the HTTP request. Admin RPCs retry once only for rolled-back deadlock/serialization errors.
- Payment events are bound to the configured online provider; COD and mismatched providers are rejected without settling the order. The payment HTTP endpoint stays disabled until a real signature-verifying provider adapter exists.
- Newsletter records now require expiring, one-use confirmation. Existing records are migrated to pending because previous email ownership was not verified. Confirmation hashes are private; unsubscribe capabilities are random and rotate on resubscription. Admin active counts exclude unconfirmed addresses. Confirmation/unsubscribe links use `/newsletter/confirm#token=...` and `/newsletter/unsubscribe#token=...` and require a button click before changing state.
- CI now runs database tests, a tracked-file credential-pattern scan, a high-severity production dependency audit, and Deno entry-point checks. The pattern scanner is a baseline, not a full-history secret scan.
- A maintenance workflow calls the protected expiry/rate-limit cleanup endpoint every 15 minutes. GitHub schedules are best-effort. Missing configuration fails visibly. The workflow is effective only after these files reach the default branch and secrets are configured.

## Deployment order

1. Apply `20261022000100_cart_sync.sql` if not already applied, then `20261022000200_security_operations.sql`. For a fresh database the combined setup file includes both; do not re-run the full setup against an existing schema.
2. Deploy updated Edge Functions, including the new `newsletter-confirm` function, before deploying the frontend.
3. Set `VITE_TURNSTILE_SITE_KEY` in the frontend environment and `TURNSTILE_SECRET_KEY` in Supabase; configure the widget's permitted domains and `ALLOWED_ORIGINS` to match. Keep server credentials out of frontend variables.
4. Verify admin MFA enrollment/AAL2 sign-in. Test account/address/checkout against a staging Supabase project with test ordering enabled before opening sales.
5. Configure repository secrets `SUPABASE_URL` and `CRON_SECRET` for the maintenance workflow; use the same cron secret on the server. Confirm a manual workflow run succeeds.
6. Configure Supabase Auth's site/redirect URLs and email delivery separately. Frontend builds never validate hosted configuration by making remote calls.

Turnstile implementation reference: [Cloudflare explicit rendering](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/) and [server verification](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

## Still requires external decisions or configuration

No hosted database, secrets, workflows, or services were changed by this work. Online payments, courier integration and order email delivery remain unconfigured. A selected email provider, verified sender and adapter are required for actual newsletter confirmation delivery; without a mailer records safely remain pending. The adapter must translate `newsletter_confirmation` payload tokens into the fragment links above. No raw capability is returned by the subscription API. No existing subscriber is assumed verified.

COD fraud still requires operational review and cancellation even with bot protection and limits. Confirmation links remain bearer credentials; customers must retain them while order email/recovery is unavailable. Real legal terms, licensed photographs, physical stock verification, retention periods and production readiness still require the owner. Backend and security changes do not constitute approval to enable selling.

## Verification

Frontend and SQL regression tests cover build configuration, streamed limits, XMP parsing, bot verification/hostname rejection, checkout lock recovery, admin retry rules, MFA, atomic address rollback/isolation, provider mismatch, and newsletter expiry/replay/rotation. Live Turnstile interaction, hosted Auth/Storage, browser UI and delivery were not verified. Deno is not installed locally; its check is configured in CI. Performance and scale work is deferred.
