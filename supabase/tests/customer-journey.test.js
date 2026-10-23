import { afterAll, beforeAll, expect, it } from 'vitest';
import { asAnon, asUser, createTestDatabase, expectDenied } from './support/db.js';
import { checkoutPayload, openOrdering, seedStore, stockOf } from './support/fixtures.js';
import { freshKey, jsonRequest, makeDeps, tokenFor } from './support/function-deps.js';
import { createOrder, orderStatus, quoteOrder } from '../functions/_shared/handlers.js';

let db; let ids; let deps;
beforeAll(async () => {
  db = await createTestDatabase(); ids = await seedStore(db); await openOrdering(db);
  await db.main.query("update private.settings set value='true' where key='require_mfa'");
  deps = makeDeps(db); // Auth and Storage transport simulated; every RPC uses real local PostgreSQL.
});
afterAll(async () => { await db?.close(); });

it('persists a customer journey through cart, quote, test order, replay, history and authorized cancellation', async () => {
  const customer = (work, user = ids.customerA) => asUser(db.main, user, work);
  const call = async (factory, body) => {
    const response = await factory(deps)(jsonRequest('https://project.functions.test/journey', body, { headers: { authorization: `Bearer ${tokenFor(ids.customerA)}` } }));
    return { status: response.status, body: await response.json() };
  };
  const catalog = await asAnon(db.main, (c) => c.query("select public.catalog_page(p_query=>'Casio') as page"));
  expect(catalog.rows[0].page.slugs).toContain('casio-test');
  const values = { label: 'Home', recipient: 'Test Customer', phone: '03001234567', line1: '12 Test Street', line2: '', city: 'Lahore', province: 'Punjab', postal_code: '54000', is_default: true };
  await customer((c) => c.query('select * from public.save_customer_address(null,$1)', [values]));
  expect((await customer((c) => c.query('select recipient from public.addresses'))).rows).toEqual([{ recipient: 'Test Customer' }]);

  const lines = [{ variant_id: ids.zipM, quantity: 2 }];
  const replace = (items) => customer((c) => c.query('select * from public.replace_customer_cart($1)', [JSON.stringify(items)]));
  await replace(lines); await replace(lines); // Snapshot retries must not accumulate quantities.
  expect((await customer((c) => c.query('select quantity from public.customer_cart_items'))).rows).toEqual([{ quantity: 2 }]);
  expect((await customer((c) => c.query('select quantity from public.customer_cart_items'), ids.customerB)).rows).toEqual([]);
  const quote = await call(quoteOrder, { lines, shipping_method: 'standard', province: 'Punjab', payment_method: 'cod' });
  expect(quote.status).toBe(200);
  const payload = checkoutPayload(lines);
  const body = { ...payload, idempotency_key: freshKey(), expected_total_pkr: quote.body.quote.total_pkr };
  const created = await call(createOrder, body);
  expect(created.status).toBe(201);
  const replay = await call(createOrder, body);
  expect(replay.status).toBe(200);
  expect(replay.body.order_number).toBe(created.body.order_number);
  expect(replay.body.access_token).toBe(created.body.access_token);
  const rows = (await customer((c) => c.query('select id,order_number,total_pkr from public.orders'))).rows;
  expect(rows).toHaveLength(1);
  expect(rows[0].total_pkr).toBe(quote.body.quote.total_pkr);
  expect((await db.main.query('select is_test from public.orders where id=$1', [rows[0].id])).rows[0].is_test).toBe(true);
  expect(await stockOf(db, ids.zipM)).toEqual({ on_hand: 3, reserved: 0 });
  expect((await customer((c) => c.query('select order_number from public.orders'), ids.customerB)).rows).toEqual([]);
  const confirmation = await call(orderStatus, { order_number: created.body.order_number, access_token: created.body.access_token });
  expect(confirmation.status).toBe(200);
  expect(confirmation.body.order.items[0].quantity).toBe(2);
  await replace([]);
  expect((await customer((c) => c.query('select quantity from public.customer_cart_items'))).rows).toEqual([]);

  await expectDenied(customer((c) => c.query('select public.admin_cancel_order($1,$2)', [rows[0].id, 'Unauthorized'])));
  await expectDenied(asUser(db.main, ids.owner, (c) => c.query('select public.admin_cancel_order($1,$2)', [rows[0].id, 'No MFA'])));
  const cancel = () => asUser(db.main, ids.owner, (c) => c.query('select public.admin_cancel_order($1,$2)', [rows[0].id, 'Isolated test cancellation']), { aal: 'aal2' });
  await cancel();
  await expect(cancel()).rejects.toThrow(/invalid_transition/);
  expect(await stockOf(db, ids.zipM)).toEqual({ on_hand: 5, reserved: 0 });
  expect((await customer((c) => c.query('select fulfilment_status from public.orders'))).rows).toEqual([{ fulfilment_status: 'cancelled' }]);
});
