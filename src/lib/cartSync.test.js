import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { create } from 'zustand';
import { useCatalog } from '../data/catalog.js';
import { useStore } from '../store.js';
import { linesToVariantPayload, startCartSync } from './cartSync.js';

vi.hoisted(() => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem() {}, removeItem() {} });
});

const line = (quantity = 2) => ({ key: 'zip|M|Black', productId: 'zip', size: 'M', color: 'Black', quantity });
const row = (quantity = 2) => ({ product_slug: 'zip', size: 'M', color: 'Black', quantity });
let sync;
beforeEach(() => {
  useCatalog.setState({ status: 'ready', products: [{ id: 'zip', slug: 'zip', variants: [{ id: 'black-m', size: 'M', color: 'Black' }, { id: 'navy-m', size: 'M', color: 'Navy' }] }] });
});
afterEach(() => sync?.stop());
function setup({ ready = true, login } = {}) {
  const store = create(() => ({ cart: [line()] }));
  const auth = create(() => ({ status: 'signed-in', user: { id: 'customer' } }));
  const catalog = create(() => ({ status: ready ? 'ready' : 'loading' }));
  const events = new EventTarget();
  const rpc = vi.fn(async (name) => ({ data: name === 'sync_customer_cart' ? [row()] : null, error: null }));
  if (login) rpc.mockImplementationOnce(login);
  sync = startCartSync({ client: { rpc }, store, auth, catalog, events });
  return { store, auth, catalog, rpc, events };
}
describe('customer cart synchronization', () => {
  it('clears the remote cart for real cart checkout but leaves it alone for Buy now', async () => {
    useStore.setState({ cart: [line()], directItem: line() });
    const auth = create(() => ({ status: 'signed-in', user: { id: 'customer' } }));
    const catalog = create(() => ({ status: 'ready' }));
    const rpc = vi.fn(async (name) => ({ data: name === 'sync_customer_cart' ? [row()] : null, error: null }));
    sync = startCartSync({ client: { rpc }, store: useStore, auth, catalog, events: new EventTarget() });
    await sync.idle();
    useStore.getState().finishCheckout('buy-now'); await sync.idle();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(useStore.getState().cart).toHaveLength(1);
    useStore.getState().finishCheckout('cart'); await sync.idle();
    expect(rpc).toHaveBeenLastCalledWith('replace_customer_cart', { p_lines: [] });
  });
  it('retries failed login synchronization on reconnect', async () => {
    const { rpc, events } = setup({ login: async () => ({ error: new Error('offline') }) });
    await sync.idle();
    events.dispatchEvent(new Event('online')); await sync.idle();
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenLastCalledWith('sync_customer_cart', { p_lines: [{ variant_id: 'black-m', quantity: 2 }] });
  });
  it('hydrates remote cart products before applying a login merge', async () => {
    const { store, catalog } = setup();
    let release;
    const ensure = vi.fn(() => new Promise(resolve => { release = resolve; }));
    catalog.setState({ ensure });
    await Promise.resolve(); await Promise.resolve();
    expect(ensure).toHaveBeenCalledWith(['zip']);
    store.setState({ cart: [line(4)] });
    release(); await sync.idle(); await sync.idle();
    expect(store.getState().cart[0].quantity).toBe(4);
  });
  it('maps the chosen size and colour to a real variant and drops unknown products', () => {
    expect(linesToVariantPayload([line(), { ...line(), color: 'Navy' }, { ...line(), productId: 'missing' }])).toEqual([
      { variant_id: 'black-m', quantity: 2 }, { variant_id: 'navy-m', quantity: 2 },
    ]);
    expect(linesToVariantPayload(null)).toEqual([]);
  });
  it('waits for catalog readiness and does not echo login results as writes', async () => {
    const { catalog, rpc } = setup({ ready: false });
    await sync.idle(); expect(rpc).not.toHaveBeenCalled();
    catalog.setState({ status: 'ready' }); await sync.idle();
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it('serializes additions, quantity decreases, removal and checkout clearing', async () => {
    const { store, rpc } = setup(); await sync.idle();
    store.setState({ cart: [line(4)] });
    store.setState({ cart: [line(1)] });
    store.setState({ cart: [] });
    await sync.idle();
    expect(rpc.mock.calls.slice(1).map((call) => call[1].p_lines)).toEqual([
      [{ variant_id: 'black-m', quantity: 4 }], [{ variant_id: 'black-m', quantity: 1 }], [],
    ]);
  });
  it('does not restore a cleared cart when a slow login response arrives', async () => {
    let resolve;
    const { store, rpc } = setup({ login: () => new Promise((done) => { resolve = done; }) });
    await Promise.resolve();
    store.setState({ cart: [] });
    resolve({ data: [row(5)], error: null }); await sync.idle(); await sync.idle();
    expect(store.getState().cart).toEqual([]);
    expect(rpc).toHaveBeenLastCalledWith('replace_customer_cart', { p_lines: [] });
  });
  it('ignores responses after signout and preserves Buy now cart state', async () => {
    let resolve;
    const { store, auth, rpc } = setup({ login: () => new Promise((done) => { resolve = done; }) });
    await Promise.resolve(); auth.setState({ status: 'signed-out', user: null });
    resolve({ data: [row(8)], error: null }); await sync.idle();
    expect(store.getState().cart).toEqual([line()]);
    store.setState({ directItem: null }); await sync.idle();
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it('reports failed writes and retries the latest snapshot on reconnect', async () => {
    const { store, rpc, events } = setup(); await sync.idle();
    rpc.mockResolvedValueOnce({ error: new Error('offline') });
    store.setState({ cart: [] }); await sync.idle();
    expect(store.getState().cartNotice).toContain('could not sync');
    events.dispatchEvent(new Event('online')); await sync.idle();
    expect(rpc).toHaveBeenLastCalledWith('replace_customer_cart', { p_lines: [] });
  });
});
