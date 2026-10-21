import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { asAnon, asUser, createTestDatabase, expectDenied } from './support/db.js';
import { openOrdering, seedStore } from './support/fixtures.js';

describe('customer shopping cart persistence and RLS', () => {
  let db;
  let ids;

  beforeAll(async () => {
    db = await createTestDatabase();
    ids = await seedStore(db);
    await openOrdering(db);
  });

  afterAll(async () => {
    await db.close();
  });

  it('forbids anonymous visitors from reading or modifying customer cart items', async () => {
    await expectDenied(asAnon(db.main, (c) => c.query('select * from public.customer_cart_items')));
    await expectDenied(asAnon(db.main, (c) => c.query('insert into public.customer_cart_items (user_id, variant_id, quantity) values ($1, $2, 1)', [ids.customerA, ids.zipM])));
    await expectDenied(asAnon(db.main, (c) => c.query("select * from public.sync_customer_cart('[]'::jsonb)")));
  });

  it('allows authenticated users to insert, select, update and delete only their own cart items', async () => {
    // User A inserts variant zipM
    await asUser(db.main, ids.customerA, (c) =>
      c.query('insert into public.customer_cart_items (user_id, variant_id, quantity) values ($1, $2, 2)', [ids.customerA, ids.zipM]),
    );

    // User A can read it
    const itemsA = (await asUser(db.main, ids.customerA, (c) =>
      c.query('select variant_id, quantity from public.customer_cart_items where user_id = $1', [ids.customerA]),
    )).rows;
    expect(itemsA).toEqual([{ variant_id: ids.zipM, quantity: 2 }]);

    // User B cannot see User A's cart items
    const itemsB = (await asUser(db.main, ids.customerB, (c) =>
      c.query('select * from public.customer_cart_items'),
    )).rows;
    expect(itemsB).toEqual([]);

    // User B cannot update User A's cart items
    await asUser(db.main, ids.customerB, (c) =>
      c.query('update public.customer_cart_items set quantity = 5 where user_id = $1', [ids.customerA]),
    );
    const verifyUnchanged = (await asUser(db.main, ids.customerA, (c) =>
      c.query('select quantity from public.customer_cart_items where user_id = $1', [ids.customerA]),
    )).rows[0].quantity;
    expect(verifyUnchanged).toBe(2);

    // User A can update quantity
    await asUser(db.main, ids.customerA, (c) =>
      c.query('update public.customer_cart_items set quantity = 4 where variant_id = $1', [ids.zipM]),
    );
    const updated = (await asUser(db.main, ids.customerA, (c) =>
      c.query('select quantity from public.customer_cart_items where user_id = $1', [ids.customerA]),
    )).rows[0].quantity;
    expect(updated).toBe(4);

    // User A deletes their cart item
    await asUser(db.main, ids.customerA, (c) =>
      c.query('delete from public.customer_cart_items where variant_id = $1', [ids.zipM]),
    );
    const afterDelete = (await asUser(db.main, ids.customerA, (c) =>
      c.query('select * from public.customer_cart_items where user_id = $1', [ids.customerA]),
    )).rows;
    expect(afterDelete).toEqual([]);
  });

  it('sync_customer_cart merges guest items atomically and caps at 9', async () => {
    // Initial sync with zipM (qty 3)
    const initialSync = (await asUser(db.main, ids.customerB, (c) =>
      c.query("select * from public.sync_customer_cart($1::jsonb)", [JSON.stringify([{ variant_id: ids.zipM, quantity: 3 }])]),
    )).rows;

    expect(initialSync).toHaveLength(1);
    expect(initialSync[0].variant_id).toBe(ids.zipM);
    expect(initialSync[0].quantity).toBe(3);
    expect(initialSync[0].product_slug).toBe('zip-test-black');

    // Second sync with additional zipM (qty 8, should cap at 9) and zipS (qty 1)
    const secondSync = (await asUser(db.main, ids.customerB, (c) =>
      c.query("select * from public.sync_customer_cart($1::jsonb)", [JSON.stringify([
        { variant_id: ids.zipM, quantity: 8 },
        { variant_id: ids.zipS, quantity: 1 },
      ])]),
    )).rows;

    expect(secondSync).toHaveLength(2);
    const mItem = secondSync.find((item) => item.variant_id === ids.zipM);
    const sItem = secondSync.find((item) => item.variant_id === ids.zipS);
    expect(mItem.quantity).toBe(9); // Capped at MAX_QTY 9
    expect(sItem.quantity).toBe(1);
  });
});
