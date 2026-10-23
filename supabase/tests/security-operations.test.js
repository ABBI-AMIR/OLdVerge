import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asAnon, asService, asUser, createTestDatabase, expectDenied, sha256 } from './support/db.js';
import { checkoutPayload, openOrdering, placeOrder, seedStore } from './support/fixtures.js';

describe('security and operations regressions', () => {
  let db; let ids;
  beforeAll(async () => {
    db = await createTestDatabase();
    expect((await db.main.query("select value from private.settings where key='require_mfa'")).rows[0].value).toBe(true);
    ids = await seedStore(db); await openOrdering(db);
  });
  afterAll(async () => db.close());
  it('denies AAL1 admins when MFA is required and permits AAL2', async () => {
    await db.main.query("update private.settings set value='true' where key='require_mfa'");
    try {
      expect((await asUser(db.main, ids.owner, (c) => c.query('select public.is_admin() as ok'))).rows[0].ok).toBe(false);
      expect((await asUser(db.main, ids.owner, (c) => c.query('select public.is_admin() as ok'), { aal: 'aal2' })).rows[0].ok).toBe(true);
    } finally { await db.main.query("update private.settings set value='false' where key='require_mfa'"); }
  });
  it('atomically saves defaults and rolls back a failed address update', async () => {
    const values = { label: 'Home', recipient: 'Customer', phone: '03001234567', line1: '1 Street', line2: '', city: 'Lahore', province: 'Punjab', postal_code: '54000', is_default: true };
    const save = (id, payload, user = ids.customerA) => asUser(db.main, user, (c) => c.query('select * from public.save_customer_address($1,$2)', [id, payload]));
    const first = (await save(null, values)).rows[0];
    await expect(save(null, { ...values, recipient: '' })).rejects.toThrow();
    expect((await db.main.query('select is_default from public.addresses where id=$1', [first.id])).rows[0].is_default).toBe(true);
    await expect(save(first.id, values, ids.customerB)).rejects.toThrow(/not_found/);
    const second = (await save(null, { ...values, label: 'Work' })).rows[0];
    expect(second.is_default).toBe(true);
    expect((await db.main.query('select is_default from public.addresses where id=$1', [first.id])).rows[0].is_default).toBe(false);
    await expectDenied(asAnon(db.main, (c) => c.query("select public.save_customer_address(null,'{}')")));
  });
  it('rejects payment events for COD and another online provider without changing payment status', async () => {
    const lines = [{ variant_id: ids.zipM, quantity: 1 }];
    const cod = await placeOrder(db.main, { lines, expectedTotal: 8740 });
    await db.main.query("insert into public.payment_methods(code,label,kind,provider,enabled) values ('test_online','Test','online','expected',true)");
    const online = await placeOrder(db.main, { payload: checkoutPayload(lines, { payment_method: 'test_online' }), expectedTotal: 8740 });
    for (const order of [cod, online]) {
      const result = await asService(db.main, (c) => c.query("select public.apply_payment_event('wrong',$1,$2,8740,'PKR','succeeded',null) as r", [crypto.randomUUID(), order.order_id]));
      expect(result.rows[0].r.result).toBe('rejected');
    }
    expect((await db.main.query('select payment_status from public.orders where id=$1',[online.order_id])).rows[0].payment_status).toBe('pending');
  });
  it('requires a fresh, unexpired, one-use newsletter confirmation and rotates unsubscribe hashes', async () => {
    const subscribe = (token) => asService(db.main, c => c.query("select public.newsletter_subscribe('reader@example.test','consent','test',$1)",[sha256(token)]));
    const request = (token) => asService(db.main, c => c.query("select public.request_newsletter_confirmation('reader@example.test',$1)",[sha256(token)]));
    const confirm = async (token) => (await asService(db.main, c => c.query('select public.confirm_newsletter($1) as ok',[sha256(token)]))).rows[0].ok;
    await subscribe('old-unsubscribe'); await request('expired');
    await db.main.query("update private.newsletter_confirmations set expires_at=now()-interval '1 second'");
    expect(await confirm('expired')).toBe(false);
    await request('first'); await request('second');
    expect(await confirm('first')).toBe(false);
    expect(await confirm('second')).toBe(true); expect(await confirm('second')).toBe(false);
    await asService(db.main, c => c.query('select public.newsletter_unsubscribe($1)',[sha256('old-unsubscribe')]));
    await subscribe('new-unsubscribe');
    const record = (await db.main.query("select confirmed_at,unsubscribe_token_hash from public.newsletter_subscriptions where email='reader@example.test'")).rows[0];
    expect(record.confirmed_at).toBeNull(); expect(record.unsubscribe_token_hash).toEqual(sha256('new-unsubscribe'));
    await expectDenied(asUser(db.main, ids.customerA, c => c.query('select public.confirm_newsletter($1)',[sha256('second')])));
  });
});
