# Staging schema and migration reconciliation — 2026-10-23

## Result

Existing staging Supabase project `qeczhyiwgvglilwqbveh` now has a migration ledger matching all **14 repository migrations** through `20261022000300_catalog_paging.sql`. Its application definitions and API-role permissions matched a fresh local reference before repair and still match afterward: **2,201 entries, zero missing, changed or unexpected entries**.

The only hosted repair was recording already-present migrations with the official Supabase CLI 2.121.0 `migration repair --status applied`. This records a reconciled baseline, not proof of the original execution dates/order. Existing application migrations were **not replayed**. No new application migration was needed.

Ordering stayed closed, admin MFA stayed required, and COD stayed disabled. No orders, inventory, application/customer rows, Auth settings, Storage objects, maintenance jobs, frontend deployments, oldverge.com or DNS were changed. The CLI used its normal temporary login-role connection setup. No database reset, seed, actual migration push, Vault synchronization, remote load test or hosted commerce RPC execution occurred.

## Comparison evidence

Built an isolated loopback PostgreSQL reference from `supabase/tests/support/shim.sql` and the complete sorted migration chain. Exported hosted definitions through the authenticated official CLI's Management API query support. Both snapshots use a read-only transaction with `search_path=pg_catalog` for consistent PostgreSQL deparser output.

| Scope | Entries |
| --- | ---: |
| Application relations, including RLS/forced RLS | 38 |
| Columns, types, defaults, nullability and generated/identity flags | 335 |
| Constraints and validation flags | 214 |
| Index definitions and validity/readiness | 87 |
| Function definitions, settings and security-definer ownership | 72 |
| Noninternal application triggers, including Auth signup trigger | 43 |
| Public/private/Storage RLS policies | 68 |
| Effective schema permissions for anon/authenticated/service_role | 6 |
| Effective table permissions for those roles | 114 |
| Effective column permissions for those roles | 1,005 |
| Effective function EXECUTE permissions for those roles | 216 |
| Application Storage bucket visibility, limits and MIME types | 3 |
| **Total** | **2,201** |

Sequence definitions/permissions and views are included by the snapshot query when present; this reference has no such separate entries. Comparison preserves SQL body/literal differences, normalizes CRLF and JSON object key order, and detects unexpected objects as well as missing/changed objects. Extension-owned functions and provider-managed Auth/Storage internals are excluded; application policies/triggers on those schemas are included. This is application-schema reconciliation, not a dump of every Supabase platform object, default ACL, role membership, database parameter, extension version, publication or backup configuration.

Eight read-only postconditions passed before and after repair: ordering closed; admin MFA required; all current Auth users have profiles; expected private/public setting keys present; COD disabled; four policy-page/draft pairs present; three buckets present. Application content/prices/stock were not compared to seed fixtures or overwritten. Seeded defaults are mutable store configuration, not schema drift by themselves.

The new ledger is inaccessible to both customer API roles: no schema USAGE, table SELECT or INSERT/UPDATE/DELETE privileges for `anon` or `authenticated`. The CLI migration list aligns all 14 local/remote versions; each recorded name matches and includes its migration statements. Final `db push --dry-run --skip-vault` reports `upToDate: true`, with empty migrations, seeds and roles.

Sanitized point-in-time evidence and normalized migration source SHA-256 hashes: [baseline record](../supabase/reconciliation/staging-baseline-2026-10-23.json). Definition snapshots/query results remain in ignored `scripts/out/schema-*`; no customer rows or credentials are included in the committed evidence. Preserve existing migration files; use a new forward migration for later changes. Source hashes describe the reconciled worktree, including the earlier uncommitted cart/security/catalogue migrations.

## Verified repo gap fixed

`supabase/full-schema-setup.sql` diverged from migration `20261022000200_security_operations.sql`: its final `newsletter_subscribe` definition rotated the unsubscribe token only for unsubscribed addresses, omitting still-unconfirmed subscriptions. Corrected the combined setup's condition to match the migration chain. Staging already had the correct definition, so no hosted function replacement was necessary.

Changed the misleading “Safe to run” header to **fresh empty databases only**, with a link to this reconciliation process. Never use that file as an existing-project repair script.

## Tests and commands

Added eight tests across `supabase/tests/schema-reconciliation.test.js` and `schema-baseline.test.js`:

- Snapshot repeatability and required security/definition coverage.
- Detection of an unsafe grant, altered RPC body, dropped index and unexpected policy.
- JSON ordering normalization without erasing SQL string differences; duplicate identity rejection.
- Actual migrated-vs-combined-setup schema/permission parity, plus pending subscription token rotation and confirmed-subscriber preservation in both disposable databases.
- History baseline idempotency and refusal of wrong target, missing/drifting evidence, unknown remote versions, failed/missing postconditions, malformed hashes and duplicate/unordered versions.

Validation: **278 unit tests and 121 isolated PostgreSQL tests passed**, including existing cart/security/customer-journey tests. Lint, client/server build, bundle budgets and source/build secret-pattern scanning passed. The parity test first failed against the old combined setup and passed after the fix. Order/inventory fixtures in the existing database suite execute only in disposable local PostgreSQL. No UI behavior changed; no new responsive-browser or remote load test was needed.

## Repeat safely

1. Verify the exact project and closed ordering. Never infer a target from the domain or a stale default link.
2. Run `npm run schema:reference` to generate the disposable local reference and source hashes. This command never connects to Supabase.
3. Export `supabase/reconciliation/manifest.sql` through an authorized read-only session, wrapping it in `BEGIN READ ONLY; SET LOCAL search_path=pg_catalog; ... COMMIT;`. Unwrap the CLI result's `rows[0].manifest` into an ignored JSON file.
4. Run `npm run schema:compare -- scripts/out/schema-reference.json scripts/out/schema-staging.json`. Inspect every discrepancy. `postconditions.sql` checks the data-related migration outcomes without exposing personal fields.
5. Check existing history. `planBaseline` in `scripts/schema-baseline.mjs` plans missing versions only after exact-target, schema and postcondition checks; it performs no database writes itself. For this project the plan is now empty. Do not repeat history repair to hide future drift.
6. For a newly verified gap, review a forward repair and tests before applying it. For a manually installed but exactly matching schema, history repair records a baseline without rerunning application SQL. Never use reset, seeds or a blind push for reconciliation.
7. Repeat the read-only comparison/postconditions and run the official CLI migration list and `db push --dry-run --skip-vault` against the explicit staging ref. Do not pass `--include-seed` or `--include-roles`.

The ignored exports are definition evidence, not a complete disaster-recovery/data backup. Backup/restore drills, provider-managed schema/configuration auditing, commerce-email/payment adapters, and production launch approval remain separate work. Ordering stays closed.
