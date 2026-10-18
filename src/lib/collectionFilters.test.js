import { describe, expect, it } from 'vitest';
import { COLLECTIONS, collectionProducts } from '../data/collections.js';
import { activeFilterCount, applyFilters, emptyFilters, filtersToSearch, getFacets, parseFilters, sortProducts } from './collectionFilters.js';

const parse = (query, collection) => parseFilters(new URLSearchParams(query), getFacets(collection));

describe('parseFilters', () => {
  it('reads repeated brand params and removes duplicates', () => {
    const filters = parse('brand=casio&brand=timex&brand=casio', COLLECTIONS.watches);
    expect(filters.brand).toEqual(['casio', 'timex']);
  });

  it('ignores params for facets the collection does not offer', () => {
    const filters = parse('brand=casio&colour=navy', COLLECTIONS['quarter-zips']);
    expect(filters.brand).toEqual([]);
    expect(filters.colour).toEqual(['navy']);
  });

  it('rejects non-numeric, negative, decimal and oversized prices', () => {
    for (const bad of ['abc', '-5', '12.5', '1234567890', '1e9']) {
      const filters = parse(`price_min=${bad}`, COLLECTIONS.watches);
      expect(filters.priceMin).toBeNull();
    }
  });

  it('swaps a reversed price range', () => {
    const filters = parse('price_min=90000&price_max=20000', COLLECTIONS.watches);
    expect([filters.priceMin, filters.priceMax]).toEqual([20000, 90000]);
  });

  it('accepts only known sorts and maps the old aliases', () => {
    expect(parse('sort=price-asc', COLLECTIONS.watches).sort).toBe('price-asc');
    expect(parse('sort=price-low', COLLECTIONS.watches).sort).toBe('price-asc');
    expect(parse('sort=new', COLLECTIONS.watches).sort).toBe('featured');
    expect(parse('sort=<script>', COLLECTIONS.watches).sort).toBe('featured');
  });
});

describe('filtersToSearch', () => {
  it('round-trips through parseFilters', () => {
    const filters = parse('brand=casio&style=digital&price_min=10000&price_max=30000&sort=price-desc', COLLECTIONS.watches);
    const search = filtersToSearch(filters);
    expect(parse(search, COLLECTIONS.watches)).toEqual(filters);
  });

  it('is empty for default filters', () => {
    expect(filtersToSearch(emptyFilters())).toBe('');
  });
});

// The next two suites run against the real catalogue on purpose: they fail if the shop starts showing
// listings for brands that have none, or exposes a price/size facet the data cannot support. If the
// catalogue changes legitimately (new Rolex listing, new prices), update these expectations with it.
describe('applyFilters and sortProducts', () => {
  const scoped = collectionProducts(COLLECTIONS.watches);

  it('shows an empty collection for a brand with no listings instead of other brands', () => {
    const filters = { ...emptyFilters(), brand: ['rolex'] };
    expect(applyFilters(scoped, filters)).toEqual([]);
  });

  it('filters by price range inclusively', () => {
    const items = applyFilters(scoped, { ...emptyFilters(), priceMin: 24900, priceMax: 28900 });
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((product) => product.price >= 24900 && product.price <= 28900)).toBe(true);
  });

  it('sorts a copy and leaves featured order alone', () => {
    const original = [...scoped];
    const ascending = sortProducts(scoped, 'price-asc').map((product) => product.price);
    expect(ascending).toEqual([...ascending].sort((a, b) => a - b));
    expect(sortProducts(scoped, 'featured')).toEqual(original);
    expect(scoped).toEqual(original);
  });
});

describe('getFacets', () => {
  it('hides the quarter-zip price facet while every price is equal and the size facet while every size is listed', () => {
    const facets = getFacets(COLLECTIONS['quarter-zips']);
    expect(facets.price).toBeNull();
    expect(facets.size).toBeNull();
  });

  it('counts active filters once for a price range', () => {
    expect(activeFilterCount({ ...emptyFilters(), brand: ['casio'], priceMin: 1, priceMax: 2 })).toBe(2);
  });
});
