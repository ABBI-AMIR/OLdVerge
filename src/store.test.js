import { beforeEach, describe, expect, it, vi } from 'vitest';

// store.js touches localStorage, sessionStorage and window at import time, so stub them first.
const memoryStorage = () => {
  const map = new Map();
  return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), removeItem: (key) => map.delete(key), clear: () => map.clear() };
};
vi.stubGlobal('localStorage', memoryStorage());
vi.stubGlobal('sessionStorage', memoryStorage());
vi.stubGlobal('window', globalThis);

const { useStore, sanitizeLines, validateOptions, resolveLines, lineKey } = await import('./store.js');
const { productBySlug } = await import('./data/products.js');
const { MAX_QTY } = await import('./lib/money.js');

const zip = productBySlug('quarter-zip-black');
const watch = productBySlug('casio-a168');

beforeEach(() => {
  useStore.setState({ cart: [], directItem: null, orders: [], lastOrder: null, announcement: '' });
});

// These tests use real catalogue products (a watch and a quarter zip), so they read the shop's real sizes and
// colours. They assert behaviour, not specific prices, except where noted.

describe('addToCart', () => {
  it('requires a size for products that have several', () => {
    expect(useStore.getState().addToCart(zip, { quantity: 1 }).ok).toBe(false);
    expect(useStore.getState().cart).toEqual([]);
  });

  it('merges the same product, size and colour into one line', () => {
    const { addToCart } = useStore.getState();
    addToCart(zip, { size: 'M', quantity: 1, open: false });
    addToCart(zip, { size: 'M', quantity: 2, open: false });
    const { cart } = useStore.getState();
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(3);
  });

  it('keeps different sizes as separate lines', () => {
    const { addToCart } = useStore.getState();
    addToCart(zip, { size: 'M', open: false });
    addToCart(zip, { size: 'L', open: false });
    expect(useStore.getState().cart).toHaveLength(2);
  });

  it('caps the quantity and says so instead of claiming the full amount was added', () => {
    const { addToCart } = useStore.getState();
    addToCart(watch, { quantity: MAX_QTY, open: false });
    const result = addToCart(watch, { quantity: 1, open: false });
    expect(result).toEqual({ ok: true, capped: true });
    expect(useStore.getState().cart[0].quantity).toBe(MAX_QTY);
    expect(useStore.getState().announcement).toMatch(/up to/i);
  });

  it('accepts a valid size, colour and quantity', () => {
    expect(validateOptions(zip, { size: zip.sizes[0], color: zip.colors[0], quantity: 1 })).toBe('');
    expect(validateOptions(watch, { size: watch.sizes[0], color: watch.colors[0], quantity: MAX_QTY })).toBe('');
  });

  it('rejects fractional, zero, negative and oversized quantities', () => {
    for (const quantity of [0, -1, 1.5, MAX_QTY + 1, Number.NaN]) {
      expect(validateOptions(watch, { size: watch.sizes[0], color: watch.colors[0], quantity })).not.toBe('');
    }
  });
});

describe('Buy now stays separate from the cart', () => {
  it('sets only the direct item and leaves the cart untouched', () => {
    const { addToCart, buyNowProduct } = useStore.getState();
    addToCart(watch, { open: false });
    const before = JSON.stringify(useStore.getState().cart);
    expect(buyNowProduct(zip, { size: 'L', quantity: 1 }).ok).toBe(true);
    expect(JSON.stringify(useStore.getState().cart)).toBe(before);
    expect(useStore.getState().directItem.productId).toBe(zip.id);
  });

  it('a cart checkout clears the cart; a Buy now checkout keeps it', () => {
    const { addToCart, buyNowProduct, completeOrder } = useStore.getState();
    addToCart(watch, { open: false });
    buyNowProduct(zip, { size: 'M', quantity: 1 });
    completeOrder({ id: 'OV-DEMO-TEST', items: [] }, 'buy-now');
    expect(useStore.getState().cart).toHaveLength(1);
    expect(useStore.getState().directItem).toBeNull();

    completeOrder({ id: 'OV-DEMO-TEST2', items: [] }, 'cart');
    expect(useStore.getState().cart).toEqual([]);
    expect(useStore.getState().orders).toHaveLength(2);
  });
});

describe('sanitizeLines (corrupt or stale storage)', () => {
  it('returns an empty list for anything that is not an array', () => {
    for (const bad of [null, undefined, 'x', 5, {}]) expect(sanitizeLines(bad)).toEqual([]);
  });

  it('drops unknown products and junk entries', () => {
    const lines = sanitizeLines([null, 'x', { productId: 'does-not-exist', quantity: 1 }, { productId: watch.id, quantity: 2 }]);
    expect(lines.map((line) => line.productId)).toEqual([watch.id]);
  });

  it('clamps quantities and merges duplicate lines', () => {
    const lines = sanitizeLines([
      { productId: watch.id, size: watch.sizes[0], color: watch.colors[0], quantity: 7 },
      { productId: watch.id, size: watch.sizes[0], color: watch.colors[0], quantity: 7 },
      { productId: zip.id, size: 'M', color: zip.colors[0], quantity: 9999 },
    ]);
    expect(lines.find((line) => line.productId === watch.id).quantity).toBe(MAX_QTY);
    expect(lines.find((line) => line.productId === zip.id).quantity).toBe(MAX_QTY);
  });

  it('never trusts a stored price: resolved lines take the price from the catalogue', () => {
    const [line] = resolveLines([{ productId: watch.id, size: watch.sizes[0], color: watch.colors[0], quantity: 2, unitPrice: 1, price: 1 }]);
    expect(line.unitPrice).toBe(watch.price);
    expect(line.lineTotal).toBe(watch.price * 2);
    expect(line.key).toBe(lineKey(watch.id, watch.sizes[0], watch.colors[0]));
  });
});
