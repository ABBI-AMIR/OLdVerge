import { brandId, collectionProducts, slugify, watchBrandOptions } from '../data/collections.js';
import { matchesQuery } from './search.js';

// URL <-> filter state for the collection pages. The URL is the only source of
// truth; the Filter drawer edits a draft and writes it back with filtersToSearch.
//
//   /shop/watches?brand=rolex&brand=cartier&style=dress&price_min=20000&price_max=90000&sort=price-asc
//   /shop/quarter-zips?colour=navy&sort=price-desc

export const SORTS = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
];
// Earlier builds used these values in component state only; accepted for safety.
const SORT_ALIASES = { 'price-low': 'price-asc', 'price-high': 'price-desc' };

/** Returns a sorted copy for 'price-asc' / 'price-desc'; any other value keeps the featured order. */
export function sortProducts(items, sort) {
  if (sort === 'price-asc') return [...items].sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') return [...items].sort((a, b) => b.price - a.price);
  return items;
}

export const emptyFilters = () => ({ brand: [], style: [], colour: [], size: [], priceMin: null, priceMax: null, sort: 'featured', q: '' });

const distinct = (values) => [...new Set(values)];
const countBy = (items, pick) => {
  const map = new Map();
  items.forEach((item) => [].concat(pick(item)).forEach((raw) => {
    const id = slugify(raw);
    const entry = map.get(id) || { id, name: raw, count: 0 };
    entry.count += 1;
    map.set(id, entry);
  }));
  return [...map.values()];
};

/**
 * Which filters make sense for a collection, derived from the real data.
 * A facet is only offered when it can change the result: size, for example,
 * stays hidden while every quarter-zip lists every size (the data says nothing
 * about real availability), and price stays hidden if all prices are equal.
 */
export function getFacets(collection) {
  const scoped = collectionProducts(collection);
  const prices = scoped.map((product) => product.price);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const facets = { price: min < max ? { min, max } : null, brand: null, style: null, colour: null, size: null };
  if (collection.key === 'watches') {
    facets.brand = watchBrandOptions();
    const styles = countBy(scoped, (product) => product.style).filter((entry) => entry.name);
    facets.style = styles.length > 1 ? styles : null;
  }
  if (collection.key === 'quarter-zips') {
    const colours = countBy(scoped, (product) => product.colors);
    facets.colour = colours.length > 1 ? colours : null;
    const sizes = distinct(scoped.flatMap((product) => product.sizes));
    const differs = scoped.some((product) => sizes.some((size) => !product.sizes.includes(size)));
    facets.size = differs ? sizes.map((size) => ({ id: slugify(size), name: size, count: scoped.filter((product) => product.sizes.includes(size)).length })) : null;
  }
  return facets;
}

const readList = (params, key) => distinct(params.getAll(key).map(slugify).filter(Boolean));
const readPrice = (params, key) => {
  const raw = params.get(key);
  return raw && /^\d{1,9}$/.test(raw) ? Number(raw) : null;
};

export function parseFilters(params, facets) {
  const filters = emptyFilters();
  if (facets.brand) filters.brand = readList(params, 'brand');
  if (facets.style) filters.style = readList(params, 'style');
  if (facets.colour) filters.colour = readList(params, 'colour');
  if (facets.size) filters.size = readList(params, 'size');
  if (facets.price) {
    filters.priceMin = readPrice(params, 'price_min');
    filters.priceMax = readPrice(params, 'price_max');
    if (filters.priceMin != null && filters.priceMax != null && filters.priceMin > filters.priceMax) {
      [filters.priceMin, filters.priceMax] = [filters.priceMax, filters.priceMin];
    }
  }
  const sort = SORT_ALIASES[params.get('sort')] || params.get('sort');
  filters.sort = SORTS.some((option) => option.value === sort) ? sort : 'featured';
  filters.q = params.get('q')?.trim() || '';
  return filters;
}

export function filtersToSearch(filters) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  filters.brand.forEach((value) => params.append('brand', value));
  filters.style.forEach((value) => params.append('style', value));
  filters.colour.forEach((value) => params.append('colour', value));
  filters.size.forEach((value) => params.append('size', value));
  if (filters.priceMin != null) params.set('price_min', String(filters.priceMin));
  if (filters.priceMax != null) params.set('price_max', String(filters.priceMax));
  if (filters.sort !== 'featured') params.set('sort', filters.sort);
  const text = params.toString();
  return text ? `?${text}` : '';
}

export function applyFilters(scoped, filters) {
  let items = scoped.filter((product) =>
    (!filters.brand.length || filters.brand.includes(brandId(product)))
    && (!filters.style.length || filters.style.includes(slugify(product.style)))
    && (!filters.colour.length || product.colors.some((colour) => filters.colour.includes(slugify(colour))))
    && (!filters.size.length || product.sizes.some((size) => filters.size.includes(slugify(size))))
    && (filters.priceMin == null || product.price >= filters.priceMin)
    && (filters.priceMax == null || product.price <= filters.priceMax)
    && matchesQuery(product, filters.q));
  items = sortProducts(items, filters.sort);
  return items;
}

export const activeFilterCount = (filters) => filters.brand.length + filters.style.length + filters.colour.length + filters.size.length
  + (filters.priceMin != null || filters.priceMax != null ? 1 : 0);

// ---- Remember each main category's last browsing state --------------------
// Only used to build the All / Watches / Clothes switcher links. The URL a
// visitor actually opens always wins; it simply replaces the remembered value.
const MEMORY_KEY = 'ov-shop-state';
const readMemory = () => {
  try { return JSON.parse(sessionStorage.getItem(MEMORY_KEY) || '{}'); } catch { return {}; }
};
export const rememberShopState = (collectionKey, search) => {
  try {
    const memory = readMemory();
    memory[collectionKey] = search;
    sessionStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
  } catch { /* storage unavailable: the switcher simply links to the plain collection */ }
};
export const recallShopState = (collectionKey) => {
  const value = readMemory()[collectionKey];
  return typeof value === 'string' && value.startsWith('?') ? value : '';
};
