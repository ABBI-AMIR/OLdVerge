// Restores a backup made by scripts/backup-database.mjs into an EMPTY project whose
// schema already matches (run `supabase db push` with this repository's migrations first).
//
//   node scripts/restore-backup.mjs --backup <dir> --sql-out <file>             write the SQL only
//   node scripts/restore-backup.mjs --backup <dir> --pg <connection string>     apply with node-postgres
//   node scripts/restore-backup.mjs --backup <dir> --project-ref <ref> --yes    apply with the Supabase CLI
//   add --storage with --project-ref to also upload every Storage object.
//
// Data is loaded in one transaction with session_replication_role=replica, so triggers
// and foreign keys do not re-run against already-consistent backup data; sequences are
// moved past the restored values. The target must contain no products and no orders.
// See docs/backups.md for the full procedure and the drill record.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCliJson, quoteIdent } from './backup-database.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function dollarQuote(text) {
  let tag = 'ovr';
  while (text.includes(`$${tag}$`)) tag += 'x';
  return `$${tag}$${text}$${tag}$`;
}

export function buildRestoreSql(manifest, tableData) {
  const lines = [
    'begin;',
    'set local session_replication_role = replica;',
    `do $guard$ begin
  if exists (select 1 from public.products) or exists (select 1 from public.orders) then
    raise exception 'restore target is not empty: refusing to overwrite';
  end if;
end $guard$;`,
  ];
  for (const table of manifest.tables) {
    const qualified = `${quoteIdent(table.schema)}.${quoteIdent(table.name)}`;
    const columns = table.columns.map(quoteIdent).join(', ');
    lines.push(`delete from ${qualified};`);
    const rows = tableData.get(table.file);
    if (!rows.length) continue;
    const overriding = table.identity_always.length ? ' overriding system value' : '';
    // json/jsonb columns were backed up as text (see backup-database.mjs) to keep JSON null distinct from SQL NULL.
    const jsonColumns = new Set(table.json_columns || []);
    const values = table.columns.map((c) => (jsonColumns.has(c)
      ? `(e ->> '${c.replaceAll("'", "''")}')::jsonb`
      : `r.${quoteIdent(c)}`)).join(', ');
    lines.push(`insert into ${qualified} (${columns})${overriding} select ${values} from jsonb_array_elements(${dollarQuote(JSON.stringify(rows))}::jsonb) e cross join lateral jsonb_populate_record(null::${qualified}, e) r;`);
  }
  lines.push(`do $seq$ declare r record; v bigint; begin
  for r in select s.oid::regclass as seq, t.oid::regclass as tbl, a.attname as col
    from pg_class s join pg_depend d on d.objid = s.oid and d.deptype in ('a', 'i')
    join pg_class t on t.oid = d.refobjid join pg_attribute a on a.attrelid = t.oid and a.attnum = d.refobjsubid
    join pg_namespace n on n.oid = t.relnamespace
    where s.relkind = 'S' and n.nspname in ('public', 'private')
  loop
    execute format('select max(%I) from %s', r.col, r.tbl) into v;
    if v is not null then perform setval(r.seq, v); end if;
  end loop;
end $seq$;`);
  lines.push(`select jsonb_build_object(${manifest.tables.map((t) => `'${t.schema}.${t.name}', (select count(*) from ${quoteIdent(t.schema)}.${quoteIdent(t.name)})`).join(', ')}) as restored;`);
  lines.push('commit;');
  return `${lines.join('\n')}\n`;
}

export async function loadBackup(dir) {
  if (!(await fs.stat(path.join(dir, 'COMPLETE')).catch(() => null))) throw new Error('Backup is incomplete (no COMPLETE marker)');
  const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
  const tableData = new Map();
  for (const table of manifest.tables) {
    const bytes = await fs.readFile(path.join(dir, table.file));
    if (createHash('sha256').update(bytes).digest('hex') !== table.sha256) throw new Error(`Checksum mismatch: ${table.file}`);
    const rows = JSON.parse(bytes);
    if (rows.length !== table.rows) throw new Error(`Row count mismatch: ${table.file}`);
    tableData.set(table.file, rows);
  }
  return { manifest, tableData };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (['--yes', '--storage'].includes(flag)) args[flag.slice(2)] = true;
    else if (['--backup', '--sql-out', '--pg', '--project-ref'].includes(flag)) { args[flag.slice(2).replace('-', '_')] = argv[i + 1]; i += 1; }
    else throw new Error(`Unknown argument: ${flag}`);
  }
  if (!args.backup) throw new Error('--backup is required');
  if ([args.sql_out, args.pg, args.project_ref].filter(Boolean).length !== 1) throw new Error('Choose exactly one of --sql-out, --pg, --project-ref');
  if (args.project_ref && !args.yes) throw new Error('Applying to a hosted project requires --yes');
  if (args.storage && !args.project_ref) throw new Error('--storage requires --project-ref');
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dir = path.resolve(args.backup);
  const { manifest, tableData } = await loadBackup(dir);
  const sql = buildRestoreSql(manifest, tableData);
  if (args.sql_out) {
    await fs.writeFile(args.sql_out, sql);
    console.log(JSON.stringify({ sql: path.resolve(args.sql_out), bytes: sql.length }));
    return;
  }
  if (args.pg) {
    const { default: pg } = await import('pg');
    const client = new pg.Client({ connectionString: args.pg });
    await client.connect();
    try {
      const results = await client.query(sql);
      const restored = [results].flat().find((r) => r.rows?.[0]?.restored)?.rows[0].restored;
      console.log(JSON.stringify({ restored }));
    } finally { await client.end(); }
    return;
  }
  const bin = process.env.OLDVERGE_SUPABASE_CLI || 'supabase';
  const sqlFile = path.join(dir, 'restore.sql');
  await fs.writeFile(sqlFile, sql);
  try {
    const result = spawnSync(bin, ['db', 'query', `--remote=${args.project_ref}`, '--yes', '--output-format', 'json', '--workdir', repoRoot, '--file', sqlFile],
      { encoding: 'utf8', maxBuffer: 1024 * 1024 * 512, windowsHide: true });
    console.log(JSON.stringify({ restored: parseCliJson(`${result.stdout}\n${result.stderr}`).rows?.[0]?.restored }));
  } finally { await fs.rm(sqlFile, { force: true }); }
  if (args.storage) {
    const storageDir = path.join(dir, 'storage');
    for (const object of manifest.storage) {
      const relative = path.posix.join(object.bucket, object.name);
      const result = spawnSync(bin, ['storage', 'cp', '--experimental', `--remote=${args.project_ref}`, '--yes', '--workdir', repoRoot, relative, `ss:///${relative}`],
        { cwd: storageDir, encoding: 'utf8', windowsHide: true });
      if (/"_tag":"Error"/.test(`${result.stdout}${result.stderr}`)) throw new Error(`Upload failed: ${relative}`);
    }
    console.log(JSON.stringify({ storage_uploaded: manifest.storage.length }));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
