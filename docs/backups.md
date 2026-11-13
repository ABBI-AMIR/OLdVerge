# Production backups and restore

The production Supabase project (`emwxwaefekzxmwbumuik`) is on the Free plan, which has **no platform backups**. These scripts provide a logical backup instead. Upgrading to Pro adds daily platform backups; keep these scripts either way as an independent copy.

## What a backup contains

`scripts/backup-database.mjs` writes one timestamped folder:

- `tables/<schema>.<table>.json`: every table in `public` and `private`, plus `auth.users`, `auth.identities` and `auth.mfa_factors`. json/jsonb columns are stored as exact text so a JSON `null` (for example an empty contact setting) stays distinct from SQL `NULL`.
- `storage/<bucket>/<path>`: every Storage object in every bucket (`product-public`, `product-private`, `order-private`).
- `manifest.json`: columns, row counts and SHA-256 of every file; `COMPLETE` is written last. A failed run deletes its partial folder.

It reads with `supabase db query --read-only` and the authenticated CLI Storage API. It needs a logged-in Supabase CLI and no database password.

**The output contains customer names, addresses, phone numbers, orders and Auth password hashes and MFA secrets.** Keep it on a private disk. The script refuses an output folder inside this repository, because the repository is public. Never upload a backup to GitHub (including Actions artifacts) or any shared location without encrypting it first.

## Schedule (owner's Windows machine)

| Item | Value |
| --- | --- |
| Task Scheduler task | `OLDVERGE weekly backup`, Sundays 03:00, runs at the next opportunity if the PC was off, network required |
| Runner | `D:\oldv-backups\run-weekly-backup.ps1` (outside the repo) |
| Output | `D:\oldv-backups\production\<UTC timestamp>`, newest 8 kept |
| Log | `D:\oldv-backups\backup.log` |
| CLI | `D:\oldv-backups\bin\supabase.exe` (Supabase CLI 3.1.0; Windows Application Control blocks fresh npx downloads of the CLI on this machine, this copy is allowed) |

The backup only runs while this PC is on and the CLI login is valid. Check `backup.log` occasionally. A copy of the newest folder on another disk or a private cloud drive protects against losing the PC.

Run one manually:

```sh
OLDVERGE_SUPABASE_CLI=D:/oldv-backups/bin/supabase.exe node scripts/backup-database.mjs --project-ref emwxwaefekzxmwbumuik --out D:/oldv-backups/production
```

Under Task Scheduler the CLI prints query results as a bare JSON array instead of `{"rows": [...]}`; `parseCliJson` accepts both (covered by `scripts/backup.test.js`).

## Restore

Into an **empty** project only (the script refuses a target that has products or orders):

1. Create or reset the target project, then apply this repository's migrations: `supabase db push --remote=<ref>` (no seeds).
2. Restore data and files:
   `node scripts/restore-backup.mjs --backup <backup folder> --project-ref <ref> --yes --storage`
   Data is loaded in one transaction with `session_replication_role = replica` (triggers and foreign keys are not re-run against already consistent data) and sequences are moved past the restored values. `--sql-out <file>` writes the SQL without applying it; `--pg <connection string>` applies it with node-postgres.
3. Re-apply settings that are not in the database: Edge Function secrets, Auth URL/password/SMTP settings, Turnstile keys, the Vercel environment and the order-email schedule (see `docs/production-setup-2026-11-13.md`).
4. Verify: product, order and inventory counts against `manifest.json`, then sign in to `/admin`.

Restoring into the existing production project after data loss means first making it empty (or restoring into a new project and switching Vercel's `VITE_SUPABASE_*` variables and the Edge secrets to it).

## Drill record

| Date | Backup | Result |
| --- | --- | --- |
| 2026-11-13 | production, 41 tables, 221 rows, 36 Storage objects | `scripts/restore-drill.mjs` restored 38 tables / 218 rows into a disposable local PostgreSQL with all 16 migrations, zero row-count mismatches. The three Auth tables were skipped because the local shim models only part of Supabase Auth. |
| 2026-11-13 | same, scheduled-task run | Same result. |
| 2026-11-13 | hosted permission check | `set local session_replication_role = replica` is permitted for the CLI's `postgres` login on the production project (checked inside a rolled-back transaction). |

Not yet drilled: a full hosted restore including Auth tables and Storage upload, because the organisation's two free projects are both in use. Do it when a spare project is available (for example a temporary project deleted afterwards).

Run the local drill after schema changes: `node scripts/restore-drill.mjs --backup <folder>`.
