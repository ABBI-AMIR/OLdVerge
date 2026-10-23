import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asService, createTestDatabase, sha256 } from './support/db.js';
import { compareManifests, readManifest } from '../../scripts/schema-manifest.mjs';
import fs from 'node:fs/promises';

describe('schema reconciliation snapshot', () => {
  let db;
  beforeAll(async () => { db = await createTestDatabase(); });
  afterAll(async () => { await db.close(); });

  it('captures function bodies, column grants, RLS, auth triggers, storage policies and buckets', async () => {
    const manifest = await readManifest(db.main);
    for (const kind of ['relation','column','constraint','index','function','trigger','policy','schema_access','table_access','column_access','function_access','bucket']) {
      expect(manifest.some((item) => item.kind === kind), kind).toBe(true);
    }
    expect(manifest.some((item) => item.kind === 'trigger' && item.key.startsWith('auth.users.'))).toBe(true);
    expect(compareManifests(manifest, await readManifest(db.main)).matches).toBe(true);
  });

  it('detects unsafe grants, changed RPC bodies, missing indexes and extra policies', async () => {
    const baseline = await readManifest(db.main);
    await db.main.query('begin');
    try {
      await db.main.query('grant update on public.orders to authenticated');
      await db.main.query("create or replace function private.get_setting(p_key text) returns jsonb language sql stable set search_path='' as $$ select null::jsonb $$");
      await db.main.query('drop index public.products_category_idx');
      await db.main.query('create policy unexpected_public_orders on public.orders for select to anon using (true)');
      // readManifest owns a transaction, so snapshot the test mutations directly here.
      const { manifestSql } = await import('../../scripts/schema-manifest.mjs');
      await db.main.query('set local search_path=pg_catalog');
      const { rows } = await db.main.query(manifestSql);
      const diff = compareManifests(baseline, rows[0].manifest);
      expect(diff.changed).toContain('table_access:public.orders.authenticated');
      expect(diff.changed.some((id) => id.startsWith('function:private.get_setting('))).toBe(true);
      expect(diff.missing).toContain('index:public.products_category_idx');
      expect(diff.unexpected).toContain('policy:public.orders.unexpected_public_orders');
    } finally { await db.main.query('rollback'); }
  });

  it('does not mistake JSON key order for drift or ignore SQL string differences', () => {
    const row = { kind:'function', key:'example', definition:{ sql:"select 'a  b'", secure:true } };
    expect(compareManifests([row],[{ ...row, definition:{secure:true,sql:"select 'a  b'"} }]).matches).toBe(true);
    expect(compareManifests([row],[{ ...row, definition:{secure:true,sql:"select 'a b'"} }]).matches).toBe(false);
    expect(() => compareManifests([row,row],[])).toThrow('Duplicate');
  });

  it('keeps the manual fresh-database setup equivalent to the migration chain', async () => {
    const manual = await createTestDatabase({empty:true});
    try {
      await manual.main.query(await fs.readFile(new URL('./support/shim.sql',import.meta.url),'utf8'));
      await manual.main.query(await fs.readFile(new URL('../full-schema-setup.sql',import.meta.url),'utf8'));
      expect(compareManifests(await readManifest(db.main),await readManifest(manual.main))).toEqual({missing:[],changed:[],unexpected:[],matches:true});
      // The prior combined setup left pending re-subscriptions holding the old unsubscribe hash.
      for (const database of [db,manual]) {
        const subscribe = (token) => asService(database.main,c=>c.query("select public.newsletter_subscribe('pending@example.test','consent','local-test',$1)",[sha256(token)]));
        await subscribe('initial'); await subscribe('replacement');
        const read = async () => (await database.main.query("select unsubscribe_token_hash,confirmed_at from public.newsletter_subscriptions where email='pending@example.test'")).rows[0];
        expect((await read()).unsubscribe_token_hash).toEqual(sha256('replacement'));
        await asService(database.main,c=>c.query("select public.request_newsletter_confirmation('pending@example.test',$1)",[sha256('confirm')]));
        await asService(database.main,c=>c.query('select public.confirm_newsletter($1)',[sha256('confirm')]));
        await subscribe('must-not-replace');
        expect((await read()).unsubscribe_token_hash).toEqual(sha256('replacement'));
        expect((await read()).confirmed_at).not.toBeNull();
      }
    } finally { await manual.close(); }
  });
});
