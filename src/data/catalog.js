import { create } from 'zustand';
import { backend, isBackend } from '../lib/config.js';
import { supabase } from '../lib/supabase.js';
import { products as demoProducts } from './products.js';
import { registerImageSize } from './imageSizes.js';
import { PRODUCT_SELECT, mapProductRow } from './catalogMapper.js';

export const PAGE_SIZE = 24;
export const CACHE_LIMIT = 256;
export const STALE_MS = 60000;

// Bounded workers rather than either a sequential waterfall or unbounded Promise.all.
export async function mapConcurrent(items, limit, work) {
  const results = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const index = next++; results[index] = await work(items[index]); }
  }));
  return results;
}
export async function mapRows(rows, client = supabase) {
  const ids = [...new Set(rows.flatMap(row => (row.product_variants || []).filter(v => v.active !== false).map(v => v.id)))];
  const chunks = Array.from({ length: Math.ceil(ids.length / 200) }, (_, i) => ids.slice(i * 200, (i + 1) * 200));
  const replies = await mapConcurrent(chunks, 3, batch => client.rpc('catalog_availability', { p_variant_ids: batch }));
  const availability = Object.fromEntries(replies.flatMap(reply => reply.error ? [] : (reply.data || []).map(row => [row.variant_id, row])));
  return rows.map(row => mapProductRow(row, { storageBase: backend.url, availability })).map(product => {
    product.images.forEach(image => registerImageSize(image.src, image.width, image.height));
    return product;
  });
}
export async function fetchProducts(slugs, client = supabase) {
  const unique = [...new Set(slugs)].filter(Boolean);
  const groups = Array.from({ length: Math.ceil(unique.length / 48) }, (_, i) => unique.slice(i * 48, (i + 1) * 48));
  const rows = await mapConcurrent(groups, 3, async batch => {
    const { data, error } = await client.from('products').select(PRODUCT_SELECT).eq('status', 'published').in('slug', batch);
    if (error) throw new Error(error.message);
    return data || [];
  });
  return mapRows(rows.flat(), client);
}
export async function fetchCatalogPage({ category = null, q = '', filters = {}, sort = 'featured', page = 1, size = PAGE_SIZE } = {}, client = supabase) {
  const { data, error } = await client.rpc('catalog_page', { p_category: category, p_query: q, p_filters: filters, p_sort: sort, p_page: page, p_size: size });
  if (error) throw new Error(error.message);
  const products = await fetchProducts(data.slugs, client);
  const bySlug = new Map(products.map(product => [product.slug, product]));
  return { ...data, products: data.slugs.map(slug => bySlug.get(slug)).filter(Boolean) };
}
export async function fetchCatalog({ slugs = [] } = {}) {
  const page = await fetchCatalogPage();
  const wanted = slugs.filter(slug => !page.products.some(product => product.slug === slug));
  return [...page.products, ...await fetchProducts(wanted)];
}
export function mergeProducts(previous, incoming, pinned = []) {
  const map = new Map(previous.map(product => [product.slug, product]));
  incoming.forEach(product => { map.delete(product.slug); map.set(product.slug, product); });
  const all = [...map.values()];
  const protectedSet = new Set(pinned);
  const remove = new Set(all.filter(product => !protectedSet.has(product.slug)).slice(0, Math.max(0, all.length - CACHE_LIMIT)).map(product => product.slug));
  return all.filter(product => !remove.has(product.slug));
}
let inflight;
const pending = new Map();
export const useCatalog = create((set, get) => ({
  status: isBackend ? 'idle' : 'ready', products: isBackend ? [] : demoProducts,
  error: null, refreshError: null, refreshing: false, loadedAt: 0, pinnedSlugs: [], activeSlug: null,
  cache(products) { set({ products: mergeProducts(get().products, products, [...get().pinnedSlugs, get().activeSlug]) }); },
  async ensure(slugs) {
    if (!isBackend) return;
    const missing = [...new Set(slugs)].filter(slug => !get().products.some(product => product.slug === slug));
    if (!missing.length) return;
    const key = missing.slice().sort().join('|');
    if (!pending.has(key)) pending.set(key, fetchProducts(missing).then(products => get().cache(products)).finally(() => pending.delete(key)));
    await pending.get(key);
  },
  async load({ force = false, slugs = [] } = {}) {
    if (!isBackend) return;
    if (inflight) return inflight;
    if (!force && get().status === 'ready' && Date.now() - get().loadedAt < STALE_MS) return;
    const warm = get().status === 'ready';
    set({ ...(warm ? {} : { status: 'loading' }), refreshing: true, refreshError: null });
    const requested = new Set([...get().products.map(product => product.slug), ...get().pinnedSlugs, ...slugs, get().activeSlug].filter(Boolean));
    inflight = fetchCatalog({ slugs: [...requested] })
      .then(products => set({ products: mergeProducts(get().products.filter(product => !requested.has(product.slug)), products, [...get().pinnedSlugs, get().activeSlug]), status: 'ready', error: null, refreshError: null, loadedAt: Date.now() }))
      .catch(error => set(warm ? { refreshError: error.message } : { status: 'error', error: error.message }))
      .finally(() => { set({ refreshing: false }); inflight = null; });
    return inflight;
  },
}));
export const getProducts = () => useCatalog.getState().products;
export const productBySlug = slug => typeof slug === 'string' ? getProducts().find(product => product.slug === slug) : undefined;
export const catalogReady = () => useCatalog.getState().status === 'ready';
