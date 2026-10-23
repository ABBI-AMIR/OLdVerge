import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const manifestSql = await fs.readFile(new URL('../supabase/reconciliation/manifest.sql', import.meta.url), 'utf8');

export async function readManifest(client) {
  await client.query('begin read only');
  try {
    await client.query('set local search_path=pg_catalog');
    const { rows } = await client.query(manifestSql);
    await client.query('commit');
    return rows[0].manifest;
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

export function compareManifests(expected, actual) {
  const keyed = (items) => {
    const result = new Map();
    for (const item of items) {
      const id = `${item.kind}:${item.key}`;
      if (result.has(id)) throw new Error(`Duplicate manifest identity: ${id}`);
      result.set(id, item);
    }
    return result;
  };
  const canonical = (value) => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
    return typeof value === 'string' ? value.replaceAll('\r\n', '\n').trimEnd() : value;
  };
  const left = keyed(expected), right = keyed(actual);
  const missing = [], changed = [], unexpected = [];
  for (const [id, item] of left) {
    if (!right.has(id)) missing.push(id);
    else if (JSON.stringify(canonical(item.definition)) !== JSON.stringify(canonical(right.get(id).definition))) changed.push(id);
  }
  for (const id of right.keys()) if (!left.has(id)) unexpected.push(id);
  return { missing: missing.sort(), changed: changed.sort(), unexpected: unexpected.sort(), matches: !missing.length && !changed.length && !unexpected.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [expectedFile, actualFile] = process.argv.slice(2);
  if (!expectedFile || !actualFile) throw new Error('Usage: node scripts/schema-manifest.mjs EXPECTED.json ACTUAL.json');
  const expected = JSON.parse(await fs.readFile(expectedFile, 'utf8'));
  const actual = JSON.parse(await fs.readFile(actualFile, 'utf8'));
  const result = compareManifests(expected, actual);
  console.log(JSON.stringify(result, null, 2));
  if (!result.matches) process.exitCode = 1;
}
