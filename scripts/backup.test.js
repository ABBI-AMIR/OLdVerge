import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseArgs, parseCliJson, pruneList, quoteIdent } from './backup-database.mjs';
import { buildRestoreSql, dollarQuote } from './restore-backup.mjs';

const ref = 'emwxwaefekzxmwbumuik';
const outside = path.resolve(process.cwd(), '..', 'oldv-backups-test');

describe('backup arguments', () => {
  it('requires an explicit project ref and a folder outside the public repository', () => {
    expect(() => parseArgs(['--out', outside])).toThrow(/project-ref/);
    expect(() => parseArgs(['--project-ref', ref, '--out', 'scripts/out/backups'])).toThrow(/outside the repository/);
    expect(() => parseArgs(['--project-ref', ref, '--out', '.'])).toThrow(/outside the repository/);
    expect(parseArgs(['--project-ref', ref, '--out', outside])).toMatchObject({ projectRef: ref, out: outside, keep: 8 });
    expect(() => parseArgs(['--project-ref', ref, '--out', outside, '--keep', '0'])).toThrow(/keep/);
  });

  it('prunes only timestamped backup folders, oldest first', () => {
    const names = ['20261101T030000Z', 'notes', '20261115T030000Z', '20261108T030000Z', 'bin'];
    expect(pruneList(names, 2)).toEqual(['20261101T030000Z']);
    expect(pruneList(names, 5)).toEqual([]);
  });
});

describe('Supabase CLI output', () => {
  it('reads the JSON document after status lines and surfaces CLI errors', () => {
    expect(parseCliJson('Target: project x\n{"rows":[{"a":1}]}\n').rows).toEqual([{ a: 1 }]);
    expect(() => parseCliJson('{"_tag":"Error","error":{"message":"nope"}}')).toThrow(/nope/);
    expect(() => parseCliJson('no json here')).toThrow(/no JSON/);
    // Several documents (as printed under Task Scheduler) and braces inside strings.
    expect(parseCliJson('{"target":{"kind":"linked"}}\n{"rows":[{"v":"a}b{"}],"warning":"x"}\n{"notice":1}').rows).toEqual([{ v: 'a}b{' }]);
    expect(() => parseCliJson('{"rows":[]}\n{"_tag":"Error","error":{"message":"not logged in"}}')).toThrow(/not logged in/);
    // Under Windows Task Scheduler the CLI prints rows as a bare array.
    expect(parseCliJson('Target: project x\n[ { "schema": "auth", "name": "users" } ]\n').rows).toEqual([{ schema: 'auth', name: 'users' }]);
  });

  it('quotes identifiers', () => {
    expect(quoteIdent('store_settings')).toBe('"store_settings"');
    expect(quoteIdent('we"ird')).toBe('"we""ird"');
  });
});

describe('restore SQL', () => {
  const manifest = { tables: [
    { schema: 'public', name: 'store_settings', file: 'a', rows: 2, columns: ['key', 'value'], identity_always: [], json_columns: ['value'] },
    { schema: 'public', name: 'brands', file: 'b', rows: 0, columns: ['id', 'name'], identity_always: [], json_columns: [] },
  ] };
  const data = new Map([['a', [{ key: 'contact.instagram', value: 'null' }, { key: 'max_lines', value: '20' }]], ['b', []]]);
  const sql = buildRestoreSql(manifest, data);

  it('refuses non-empty targets and bypasses triggers only inside the transaction', () => {
    expect(sql.startsWith('begin;\nset local session_replication_role = replica;')).toBe(true);
    expect(sql).toContain('restore target is not empty');
    expect(sql.trimEnd().endsWith('commit;')).toBe(true);
  });

  it('restores json columns from exact text so JSON null is not turned into SQL NULL', () => {
    expect(sql).toContain(`(e ->> 'value')::jsonb`);
    expect(sql).toContain('r."key"');
    expect(sql).toContain('delete from "public"."brands";');
    expect(sql).not.toMatch(/insert into "public"\."brands"/);
  });

  it('chooses a dollar-quote tag that does not occur in the data', () => {
    expect(dollarQuote('plain')).toBe('$ovr$plain$ovr$');
    expect(dollarQuote('has $ovr$ inside')).toBe('$ovrx$has $ovr$ inside$ovrx$');
  });
});
