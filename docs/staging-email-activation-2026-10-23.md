# Staging Mailtrap API activation — 2026-10-23

## Result

Configured the existing Mailtrap sandbox API credential in the existing Supabase staging project and deployed `newsletter-subscribe` and `process-outbox`. Both are **ACTIVE, version 6**, retaining their repository `verify_jwt=false` configuration and application authorization. A single synthetic newsletter message passed through the same mailer code in a temporary hosted probe and was captured in **My Sandbox, ID4975389**.

The probe had **no database client**. No order, inventory, subscriber, contact or outbox rows were created or modified by this verification. Ordering remained closed, admin MFA required, and Auth SMTP unchanged. No outbox/maintenance job, scheduler, frontend deployment, oldverge.com request, domain or DNS change occurred.

## Secure configuration

- Owner explicitly approved creation and server-only storage of the named **OLDVERGE staging sandbox adapter** token.
- Expiration selected: **30 days**. Scope: **My Sandbox Admin** only, with its inherited Viewer permission; account, templates, campaigns, live-domain, project-wide and separate email-content permissions remained unchecked. Mailtrap's Sandbox Admin scope includes sandbox management as well as test sends; the owner was informed before approval. No sandbox settings or team memberships were changed.
- Token copied directly from the one-time Mailtrap display into Supabase's encrypted `MAILTRAP_SANDBOX_API_TOKEN` secret. The new API token was never printed, placed in a command argument or written to a file; the display was closed and temporary value cleared.
- Other server-only names configured: `COMMERCE_EMAIL_PROVIDER`, `COMMERCE_EMAIL_SITE_URL`, `MAILTRAP_SANDBOX_ID`, `COMMERCE_EMAIL_ALLOWED_RECIPIENTS`, `COMMERCE_EMAIL_ADMIN_TO`. Targets remain pinned to the existing staging project/site/sandbox. The recipient allowlist and admin recipient contain only the previously authorized separate staging customer alias.
- No `VITE_*` variable or Auth SMTP credential changed. The API credential is separate from the working SMTP password. Replace it securely before its configured expiry; no automatic token rotation or reminder was scheduled.

## Hosted capture evidence

One temporary `staging-email-probe` function imported the current shared mailer and used an independent 64-character random probe secret with a 15-minute expiry. It accepted only an authenticated POST on the exact staging project and sent fixed synthetic newsletter data to the authorized test alias. Its dummy tokens were never registered in the database and are intentionally nonfunctional; this was transport/template verification, not an actual subscription.

The single POST returned HTTP200 with `accepted=true`, `synthetic=true`, `database_access=false`. Mailtrap's UI independently showed:

- Subject: **[STAGING] Confirm your newsletter subscription**.
- Expected test recipient and reserved `oldverge-staging@example.test` sender.
- Two HTML links, privately inspected: exact stable staging origin and confirmation/unsubscribe routes, fragment tokens, no query string.
- No automatic forwarding rules. Nothing was delivered to the Gmail inbox.

Captured message ID: **5771294348**, at **2026-10-23 10:57 UTC**. Safe header/inbox screenshot: ignored `scripts/out/staging-mailtrap-api-capture-2026-10-23.png`; no token or message capability appears in that image.

The temporary function, its local source, `STAGING_EMAIL_PROBE_SECRET` and `STAGING_EMAIL_PROBE_EXPIRES_AT` were removed immediately afterward. Independent function/secret metadata queries confirm cleanup. The permanent deployed function set remains 12 functions.

## Safeguards and validation

Read-only before/after aggregate queries match exactly for order count, inventory row count **and inventory-content fingerprint**, outbox count, newsletter count and contact count. Ordering stayed `false`; required admin MFA stayed `true`. Earlier full migration postconditions also passed before rollout.

Sequential GET method checks for the two deployed functions both returned expected405 responses with no-store and exact staging CORS allowance. No business POST was made to either endpoint. The only sending POST went to the temporary probe. The probe was type-checked with Deno before deployment; production source was unchanged from the implementation already validated by **299 unit tests, 125 local PostgreSQL tests, lint/build/bundle/secret checks and all12 Deno checks**. Full local suites were not needlessly repeated for this configuration/deployment step.

Sanitized probe acceptance/cleanup metadata and before/after aggregates are in ignored `scripts/out/staging-email-capture-2026-10-23.json` and `email-activation-*` reports. These contain no token values or customer row exports.

## Limits and next steps

Verified: server-side configuration, the deployed adapter's shared code in the hosted runtime, Mailtrap API acceptance and actual sandbox capture/template links. Order/admin/contact template behavior remains covered by local tests; no hosted order was created. No hosted outbox batch was drained.

Actual storefront newsletter opt-in still needs valid Turnstile configuration and a separately bounded test; bot protection was not bypassed. This capture does not prove that public signup endpoint's complete hosted journey, production inbox delivery, commerce readiness, payment processing or exactly-once delivery. Keep ordering closed. See [adapter implementation and delivery semantics](staging-commerce-email-adapter-2026-10-23.md).
