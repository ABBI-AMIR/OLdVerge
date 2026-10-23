# Staging Auth email and account verification — 2026-10-22

## Completed hosted Auth verification — 2026-10-23

Owner performed the replacement-password login. Browser verification confirmed the intended ordinary customer identity, Sign out control, zero orders, and session persistence after reload. The initial password had already been rejected after recovery. Final read-only settings GET confirmed ordering remains false. All flows in the verification table now pass within the staging Email Sandbox scope. No real inbox deliverability, commerce-email adapter or production readiness claim is made. No orders, inventory, production domain, deployment or application-code changes occurred.

## Hosted verification progress — 2026-10-23

Owner completed SMTP password entry/save. A separate fresh Supabase tab confirmed persisted custom SMTP enabled, sandbox host, port2525, disabled Save button and no draft Cancel button; original unsaved tab was preserved rather than reloaded. Mailtrap Auto Forward has no rules and forwarding controls are unavailable on the current plan. Actual confirmation and recovery emails were captured in sandbox4975389 for the single ordinary test customer, with no live delivery.

Created one customer through the actual staging UI using a random temporary password held only in process memory. Before signup the targeted alias count was zero. After signup, SELECT verified exactly one Auth user, one trigger-created profile, no admin membership and unconfirmed email. Login before confirmation was denied. Followed the email's privately inspected capability only after verifying the exact staging Supabase project, verify endpoint, signup type and stable redirect origin. Confirmation persisted; normal password login, session persistence after reload, logout/private-route gating and ordinary-customer admin denial all passed. The existing admin account was not used or changed.

One recovery request generated a captured sandbox email. Privately validated exact project/type and `https://o-ld-verge.vercel.app/account/reset-password` callback; followed it in the same browser. It opened a usable replacement-password form and consumed the URL code without error. **Owner reports password updated; browser returned to the same customer account. After logout, the initial password was rejected with “Email or password is not correct.” Owner signed in with the replacement password; verified the same ordinary customer account and persisted session after reload.** No credentials/capability links were printed or stored in reports. Staging recovery form screenshot contains empty fields only.

## Resume check — 2026-10-23

Later checkpoint: owner confirmed Reset Credentials completed. Refreshing the existing Mailtrap tab confirmed the sandbox username changed; the new username has replaced the stale value in the unsaved Supabase SMTP form. Mailtrap's password display/copy remains masked or unavailable to automation. Awaiting the owner's direct entry of the fresh SMTP password and Save changes; no further credential reset is needed. Ordering was rechecked false. No signup/login/recovery test has run yet.

The owner resumed after pausing. Existing Mailtrap/Supabase tabs and the unsaved SMTP draft remain present. Mailtrap still exposes a masked password, with no observed credential change or reset confirmation dialog. Rechecked `ordering_enabled=false`. Prepared the actual staging registration form with the separate ordinary-customer alias and test name, leaving password blank and form unsubmitted. No account, test email or Auth verification was performed. Awaiting the owner's required sandbox credential reset before refreshing both SMTP credential fields and saving. No orders, inventory, domain or application code changes.

Target: existing protected staging storefront and Supabase project `qeczhyiwgvglilwqbveh`. Ordering must remain closed. No order, inventory, DNS, production-domain, email-confirmation bypass or admin-membership changes are permitted by this test plan.

## Setup and preflight

- Owner authorized a controlled Gmail inbox and created a Mailtrap account through GitHub. The account is signed in and the private Email Sandbox is empty at setup time. Use **Email Sandbox**, not the live Email API/SMTP product, with forwarding left disabled.
- The authorized base email already belongs to a Supabase admin. Do not reset, delete or repurpose that account. The separately chosen `+oldverge-staging` customer alias has zero existing Auth users, confirmed by a targeted read-only query. Do not grant it admin membership or elevated app metadata.
- Hosted email signup/provider and email confirmation are enabled; anonymous signup and manual identity linking are disabled. Confirmation remains enabled for these tests.
- `ordering_enabled=false` was rechecked through the public settings API.
- The staging Site URL and exact password-recovery callback were fixed in the preceding rollout. No custom-domain changes are needed.
- Supabase SMTP form prepared with the Mailtrap sandbox hostname, port 2525 (STARTTLS supported by the provider), a clearly test-only sender using the reserved `example.test` domain, and sandbox username. Mailtrap's Password copy control currently returns a masked value rather than a usable SMTP credential. The owner was asked to perform Mailtrap's supported sandbox credential reset; browser rules require a human to perform credential changes. **The form is unsaved, and SMTP is not yet claimed configured or verified.** If reset completes, refresh both username and password before saving; never submit the old username with a new password. Credentials stay out of chat, source files, reports and screenshots.

Mailtrap account: My Sandbox, sandbox ID `4975389`. This sandbox captures test messages rather than delivering them to the Gmail recipient. It verifies Auth email generation and receipt in the sandbox, not Gmail inbox placement or production deliverability. This SMTP setup does not implement commerce/newsletter `deps.mailer`.

Provider references: [Mailtrap sandbox SMTP setup](https://docs.mailtrap.io/email-sandbox/setup/sandbox-smtp-integration), [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## Controlled verification sequence

Use one ordinary customer test account through the actual staging UI. Keep the same browser for initiating and following PKCE confirmation/recovery links. The initial new-account password is cryptographically random and held only in process memory for the login checks; the owner enters and submits the replacement password directly during recovery. Never request passwords or recovery tokens in chat.

| Step | Required evidence | Current result |
| --- | --- | --- |
| Save SMTP | Reload persisted sandbox host/port/sender with password masked; forwarding disabled | Pass: fresh tab confirms persisted configuration; no forward rules |
| Signup | One new ordinary Auth user plus trigger-created profile; confirmation still pending; one captured sandbox confirmation email | Pass: actual UI + SELECT + captured email |
| Login before confirmation | Refused with confirmation-required message; no authenticated session | Pass: actual UI refusal |
| Confirm email | Follow the new test account's link; database confirmation timestamp set; redirect to stable staging; do not log link/token | Pass: exact project/redirect verified; SELECT result1/true/1/0 |
| Login and reload | Correct credentials reach own account; identity/session survive reload | Pass: actual customer greeting and Sign out button after reload; explicit password login also passes |
| Logout | Private account routes require sign-in again | Pass: /account resolves to /account/login |
| Recovery request | Actual UI sends one reset email to sandbox; exact stable reset route used; generic response alone is insufficient proof | Pass: captured email and exact callback; usable reset form |
| Reset completion | Owner enters replacement password; UI and Auth event confirm success; no token or password retained in report | Pass: owner reports saved; redirected to same account, old password rejected |
| Login after reset | Old password refused, replacement password accepted, verified account identity unchanged | Pass: old password rejected; owner entered new password and signed in; same identity/session confirmed after reload |
| Ordinary account isolation | No admin membership; admin route denies access without loading operational data | Pass: SELECT0 memberships and actual Access denied / no store data loaded |
| Final safeguard | Ordering still false; no order/inventory/maintenance operation invoked | Pass: final read-only settings GET confirms false |

Avoid duplicate signups or repeated mail attempts: inspect the specific Auth user and sandbox result before retrying. Do not auto-confirm through an admin API; that would bypass the journey under test. Do not generate mail to unrelated users, run maintenance/outbox or delete existing accounts. Retain the ordinary test account for later approved tests; cleanup or credential rotation is a separate action.

## Scope of current evidence

The dated setup/resume checkpoints above describe the earlier preparation stage. The current table records actual hosted UI, email and SELECT evidence; password change, old-password rejection and replacement-password login/session persistence now pass. Existing unit/database tests are separate local evidence and do not substitute for these hosted results. One ordinary Auth user/profile was created by this test; no admin grants, order, inventory, migration, application-code, Vercel or DNS change occurred. SMTP config is for staging Auth only, not a commerce/newsletter delivery adapter or a production deliverability guarantee.
