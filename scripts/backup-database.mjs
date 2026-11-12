// Logical backup of one hosted Supabase project: every table in public/private,
// the Auth tables needed to restore accounts, and every Storage object.
//
//   node scripts/backup-database.mjs --project-ref <ref> --out <folder outside this repo> [--keep 8]
//
// Read-only: table data is read with `supabase db query --read-only`; Storage objects
// are downloaded with the authenticated CLI. Requires a logged-in Supabase CLI
// (`supabase login`); set OLDVERGE_SUPABASE_CLI to its path if it is not on PATH.
// The output contains customer personal data and Auth password hashes: keep it on a
// private disk only. Never write it inside this (public) repository.
// Restore with scripts/restore-backup.mjs. See docs/backups.md.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUTH_TABLES = ['users', 'identities', 'mfa_factors'];

export function parseArgs(argv) {
  const args = { keep: 8 };
  for (let i = 0; i < argv.length; i += 1) {
    const [flag, value] = [argv[i], argv[i + 1]];
    if (flag === '--project-ref') { args.projectRef = value; i += 1; }
    else if (flag === '--out') { args.out = value; i += 1; }
    else if (flag === '--keep') { args.keep = Number(value); i += 1; }
    else throw new Error(`Unknown argument: ${flag}`);
  }
  if (!/^[a-z]{20}$/.test(args.projectRef || '')) throw new Error('--project-ref must be an explicit 20-letter Supabase project ref');
  if (!args.out) throw new Error('--out is required');
  if (!Number.isInteger(args.keep) || args.keep < 1) throw new Error('--keep must be a positive integer');
  const out = path.resolve(args.out);
  const relative = path.relative(repoRoot, out);
  if (!relative || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    throw new Error('--out must be outside the repository: backups contain personal data and the repository is public');
  }
  return { ...args, out };
}

// Every top-level JSON object or array in mixed CLI output (status lines, warnings, results).
export function jsonDocuments(text) {
  const found = [];
  let depth = 0; let start = -1; let inString = false; let escaped = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
    } else if (ch === '"' && depth > 0) inString = true;
    else if (ch === '{' || ch === '[') { if (depth === 0) start = i; depth += 1; }
    else if ((ch === '}' || ch === ']') && depth > 0) {
      depth -= 1;
      if (depth === 0) { try { found.push(JSON.parse(text.slice(start, i + 1))); } catch { /* not JSON */ } }
    }
  }
  return found;
}

// The CLI prints status lines and sometimes several JSON documents. Interactively
// results come as {"rows": [...]}; under Windows Task Scheduler as a bare [...].
// Surface any error document, otherwise return {rows}.
export function parseCliJson(text) {
  const docs = jsonDocuments(text);
  const error = docs.find((doc) => !Array.isArray(doc) && (doc._tag === 'Error' || doc.error));
  if (error) throw new Error(`Supabase CLI error: ${error.error?.message || JSON.stringify(error.error)}`);
  const doc = docs.find((d) => !Array.isArray(d) && 'rows' in d)
    || (docs.find(Array.isArray) && { rows: docs.find(Array.isArray) })
    || docs.at(-1);
  if (!doc) throw new Error('Supabase CLI returned no JSON');
  return doc;
}

export const quoteIdent = (name) => `"${String(name).replaceAll('"', '""')}"`;

export function pruneList(names, keep) {
  const backups = names.filter((name) => /^\d{8}T\d{6}Z$/.test(name)).sort();
  return backups.slice(0, Math.max(0, backups.length - keep));
}

function cli(args, { cwd = repoRoot } = {}) {
  const bin = process.env.OLDVERGE_SUPABASE_CLI || 'supabase';
  const result = spawnSync(bin, args, { cwd, encoding: 'utf8', maxBuffer: 1024 * 1024 * 512, windowsHide: true });
  if (result.error) throw result.error;
  return { status: result.status, text: `${result.stdout || ''}\n${result.stderr || ''}` };
}

function query(ref, sql) {
  const { text } = cli(['db', 'query', `--remote=${ref}`, '--read-only', '--output-format', 'json', '--workdir', repoRoot, sql]);
  const { rows } = parseCliJson(text);
  if (!Array.isArray(rows)) throw new Error(`Supabase CLI returned no rows: ${text.replace(/\s+/g, ' ').slice(0, 400)}`);
  return rows;
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function main() {
  const { projectRef, out, keep } = parseArgs(process.argv.slice(2));
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const dir = path.join(out, stamp);
  await fs.mkdir(path.join(dir, 'tables'), { recursive: true });
  await fs.mkdir(path.join(dir, 'storage'), { recursive: true });
  try {
    await writeBackup(projectRef, dir);
  } catch (error) {
    // A partial backup must not count towards retention or be mistaken for a good one.
    await fs.rm(dir, { recursive: true, force: true });
    throw error;
  }
  const removed = [];
  for (const name of pruneList(await fs.readdir(out), keep)) {
    await fs.rm(path.join(out, name), { recursive: true, force: true });
    removed.push(name);
  }
  const manifest = JSON.parse(await fs.readFile(path.join(dir, 'manifest.json'), 'utf8'));
  const rows = manifest.tables.reduce((sum, t) => sum + t.rows, 0);
  console.log(JSON.stringify({ backup: dir, tables: manifest.tables.length, rows, storage_objects: manifest.storage.length, pruned: removed }));
}

async function writeBackup(projectRef, dir) {

  const tables = query(projectRef, `
    select n.nspname as schema, c.relname as name,
      coalesce((select jsonb_agg(a.attname order by a.attnum) from pg_attribute a
        where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped and a.attgenerated = ''), '[]') as columns,
      coalesce((select jsonb_agg(a.attname) from pg_attribute a
        where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped and a.attidentity = 'a'), '[]') as identity_always,
      coalesce((select jsonb_agg(a.attname) from pg_attribute a
        where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped and a.attgenerated = ''
          and a.atttypid in ('json'::regtype, 'jsonb'::regtype)), '[]') as json_columns
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'p')
      and (n.nspname in ('public', 'private') or (n.nspname = 'auth' and c.relname in (${AUTH_TABLES.map((t) => `'${t}'`).join(',')})))
    order by n.nspname, c.relname`);

  const manifest = { project_ref: projectRef, created_at: new Date().toISOString(), format: 1, tables: [], storage: [] };
  for (const table of tables) {
    const qualified = `${quoteIdent(table.schema)}.${quoteIdent(table.name)}`;
    // json/jsonb values are stored as text so a JSON null stays distinct from SQL NULL.
    const exact = table.json_columns.length
      ? ` || jsonb_build_object(${table.json_columns.map((c) => `'${c.replaceAll("'", "''")}', t.${quoteIdent(c)}::text`).join(', ')})`
      : '';
    const [row] = query(projectRef, `select coalesce(jsonb_agg(to_jsonb(t)${exact}), '[]'::jsonb) as data from ${qualified} t`);
    const bytes = Buffer.from(JSON.stringify(row.data));
    const file = `tables/${table.schema}.${table.name}.json`;
    await fs.writeFile(path.join(dir, file), bytes);
    manifest.tables.push({ ...table, file, rows: row.data.length, sha256: sha256(bytes) });
  }

  const objects = query(projectRef, 'select bucket_id, name from storage.objects order by bucket_id, name');
  const storageDir = path.join(dir, 'storage');
  for (const object of objects) {
    if (object.name.split('/').some((part) => part === '..' || part === '')) throw new Error(`Unsafe object path: ${object.bucket_id}/${object.name}`);
    const relative = path.posix.join(object.bucket_id, object.name);
    await fs.mkdir(path.join(storageDir, path.dirname(relative)), { recursive: true });
    // Relative destination: the CLI misreads Windows drive letters as URL schemes.
    const { text } = cli(['storage', 'cp', '--experimental', `--remote=${projectRef}`, '--workdir', repoRoot,
      `ss:///${relative}`, relative], { cwd: storageDir });
    const bytes = await fs.readFile(path.join(storageDir, relative)).catch(() => null);
    if (!bytes) throw new Error(`Storage download failed for ${relative}: ${text.slice(-300)}`);
    manifest.storage.push({ bucket: object.bucket_id, name: object.name, bytes: bytes.length, sha256: sha256(bytes) });
  }

  await fs.writeFile(path.join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.writeFile(path.join(dir, 'COMPLETE'), `${manifest.created_at}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exit(1); });
}
