# Customer email rejection investigation — 2026-10-23

The historical rejection cannot be conclusively attributed: existing code discarded the provider HTTP status/body, retaining only email_provider_rejected. One accepted admin alert and later accepted customer retry do not prove rate limiting. No new sends were made during this investigation.

Verified issue fixed locally: mailer now persists only a validated numeric HTTP status (email_provider_http_429, for example). Provider text, recipients and credentials remain excluded. Error-body cancellation failures no longer mask the known rejection. No internal retries were added; queue backoff and sent-message exclusion remain intact.

Validation: 22 adapter unit tests; 5 isolated PostgreSQL email tests, including persisted 401/429/503 statuses and no immediate resend; lint passed before the integration-only test extension. All15 hosted read-only postconditions remain true, including ordering closed, exactly one cancelled test order, restored stock, otherinventory unchanged, MFArequired and both prior messages sent.

Source changes: supabase/functions/_shared/mailer.js, mailer.test.js and supabase/tests/email-adapter.test.js. Not deployed. No orders, inventory changes, email sends, migrations or oldverge.com requests/changes. Historical cause remains unknown; future rejection statuses will distinguish throttling, credentials and server failures after deployment. No speculative retry/pacing fix applied.

## Staging deployment verified — 2026-10-23
Owner authorized deployment with no sends/orders/inventory writes. Deployed only newsletter-subscribe and process-outbox to existing staging project qeczhyiwgvglilwqbveh using official CLI/API. Both ACTIVE version10; existing verify_jwt=false remains intentional, with application authentication unchanged. No frontend deployment, secret changes or migrations.

Downloaded each deployed function through the official API into ignored scripts/out/email-diagnostic-download; shared mailer SHA256 exactly matched the tested local file independently for both functions. Four sequential no-delivery requests passed: GET405/method_not_allowed and OPTIONS204 for each. No POST, queue worker execution, provider request or delivery attempt was performed. All15 read-only database postconditions passed before/after and were identical: orderingclosed, onecancelledtestorder, stockrestored/otherstockunchanged, cartempty, bothpriornotificationssent, nofailed/pendingnotifications, MFArequired and temporarymethodsdisabled. No oldverge.com requests/changes or remote load tests.

Evidence: ignored scripts/out/email-diagnostic-functions-before.json and -after.json, email-diagnostic-readonly-smoke.json, email-diagnostic-deploy-before.json and -after.json. Existing22unit+5DB tests cover the diagnostic behavior locally. Verification here proves deployed source integrity, active serving and unchanged protected state; it does not exercise provider errors on staging, since no email sends were authorized. The historical rejection cause remains unknown.
