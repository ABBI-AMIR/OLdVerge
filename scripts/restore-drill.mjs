// Restore drill: loads a backup into a disposable loopback PostgreSQL with this
// repository's shim + migrations, then compares every table's row count with the
// backup manifest. Never connects to hosted Supabase.
//
//   node scripts/restore-drill.mjs --backup <dir>
//
// Auth tables are restored only when the local shim has every backed-up column
// (the shim models a subset of Supabase Auth); skipped tables are reported.
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { stopDatabase } from '../supabase/tests/support/stop-database.js';
import { buildRestoreSql, loadBackup } from './restore-backup.mjs';

const root = new URL('../', import.meta.url);
const flag = process.argv.indexOf('--backup');
if (flag < 0 || !process.argv[flag + 1]) throw new Error('--backup <dir> is required');
const { manifest, tableData } = await loadBackup(path.resolve(process.argv[flag + 1]));

const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'oldverge-restore-'));
const port = await new Promise((resolve, reject) => {
  const listener = net.createServer();
  listener.on('error', reject);
  listener.listen(0, '127.0.0.1', () => { const { port: p } = listener.address(); listener.close(() => resolve(p)); });
});
const server = new EmbeddedPostgres({ databaseDir: directory, user: 'postgres', password: 'postgres', port, persistent: false,
  postgresFlags: ['-c', 'listen_addresses=127.0.0.1'], onLog: () => {}, onError: () => {} });
let client;
try {
  await server.initialise(); await server.start();
  client = new pg.Client({ host: '127.0.0.1', port, user: 'postgres', password: 'postgres', database: 'postgres' });
  await client.connect();
  await client.query(await fs.readFile(new URL('supabase/tests/support/shim.sql', root), 'utf8'));
  for (const name of (await fs.readdir(new URL('supabase/migrations/', root))).filter((n) => n.endsWith('.sql')).sort()) {
    await client.query(await fs.readFile(new URL(`supabase/migrations/${name}`, root), 'utf8'));
  }
  const { rows: cols } = await client.query(`select table_schema || '.' || table_name as t, array_agg(column_name::text) as c
    from information_schema.columns group by 1`);
  const present = new Map(cols.map((r) => [r.t, new Set(r.c)]));
  const restorable = manifest.tables.filter((t) => t.columns.every((c) => present.get(`${t.schema}.${t.name}`)?.has(c)));
  const skipped = manifest.tables.filter((t) => !restorable.includes(t)).map((t) => `${t.schema}.${t.name}`);
  const results = await client.query(buildRestoreSql({ ...manifest, tables: restorable }, tableData));
  const restored = [results].flat().find((r) => r.rows?.[0]?.restored).rows[0].restored;
  const mismatches = restorable.filter((t) => Number(restored[`${t.schema}.${t.name}`]) !== t.rows).map((t) => `${t.schema}.${t.name}`);
  const rows = restorable.reduce((sum, t) => sum + t.rows, 0);
  console.log(JSON.stringify({ restored_tables: restorable.length, restored_rows: rows, mismatches, skipped }));
  if (mismatches.length) process.exitCode = 1;
} finally {
  await client?.end();
  await stopDatabase(server, directory);
  await fs.rm(directory, { recursive: true, force: true });
}
