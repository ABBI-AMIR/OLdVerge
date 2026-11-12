import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ProductCard } from './Shell.jsx';
import { COLLECTIONS, crumbsFor, slugify } from '../data/collections.js';
import { PAGE_SIZE } from '../data/catalog.js';
import { useCatalogPage } from '../lib/useCatalogPage.js';
import FilterDrawer from './FilterDrawer.jsx';
import { SlidersHorizontal } from 'lucide-react';
import { SORTS, filtersToSearch, activeFilterCount } from '../lib/collectionFilters.js';

export function catalogOptions(params, category = null) {
  const number = key => /^\d{1,9}$/.test(params.get(key) || '') ? Number(params.get(key)) : null;
  const filters = { brand: [], style: [], colour: [], size: [], priceMin: number('price_min'), priceMax: number('price_max') };
  const keys = category === 'watches' ? ['brand', 'style'] : category === 'quarter-zips' ? ['colour', 'size'] : [];
  for (const key of keys) filters[key] = [...new Set(params.getAll(key).map(slugify).filter(Boolean))];
  if (filters.priceMin !== null && filters.priceMax !== null && filters.priceMin > filters.priceMax) [filters.priceMin, filters.priceMax] = [filters.priceMax, filters.priceMin];
  return { category, q: (params.get('q') || '').trim().slice(0, 80), filters, sort: SORTS.some(item => item.value === params.get('sort')) ? params.get('sort') : 'featured', page: Math.max(1, Math.min(1000000, number('page') || 1)), size: PAGE_SIZE };
}
export default function BackendBrowse({ collection, search = false }) {
  const [params, setParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const options = catalogOptions(params, collection?.key === 'all' ? null : collection?.key);
  const data = useCatalogPage(options);
  const title = search ? options.q ? `Search: ${options.q}` : 'Search' : collection.heading;
  const pageLink = page => { const next = new URLSearchParams(params); if (page > 1) next.set('page', page); else next.delete('page'); return `?${next}`; };
  const submit = event => {
    event.preventDefault();
    const next = new URLSearchParams();
    for (const [key, value] of new FormData(event.currentTarget)) if (String(value).trim()) next.append(key, value);
    setParams(next); setOpen(false);
  };
  const filters = { ...options.filters, q: options.q, sort: options.sort };
  const trail = search ? [] : crumbsFor({ collection });
  const facetKeys = options.category === 'watches' ? ['brand', 'style'] : options.category === 'quarter-zips' ? ['colour', 'size'] : [];
  const facets = Object.fromEntries(facetKeys.map(key => [key, data.facets?.[key] || []]));
  if (data.price?.max > 0) facets.price = data.price;
  return <main id="main-content" className="ov-shop ov-collection">
    {trail.length > 0 && <nav className="ov-crumbs" aria-label="Breadcrumb"><ol>{trail.map((crumb, index) => <li key={crumb.label}>
      {index === trail.length - 1 ? <span aria-current="page">{crumb.label}</span> : <><Link to={crumb.to}>{crumb.label}</Link><span className="ov-crumb-sep" aria-hidden="true">/</span></>}
    </li>)}</ol></nav>}
    <div className="ov-collection-head"><h1>{title}</h1></div>
    {search && <form className="ov-inline-search" onSubmit={submit}><label htmlFor="catalog-query">Search products</label><input id="catalog-query" name="q" type="search" maxLength={80} defaultValue={options.q} key={options.q} /><button className="ov-button ov-button-dark">Search</button></form>}
    <div className="ov-collection-bar">
      {!search && <nav className="ov-switch" aria-label="Collection">{Object.values(COLLECTIONS).map(item => <Link key={item.key} to={item.path} className={item.key === collection.key ? 'is-active' : ''} aria-current={item.key === collection.key ? 'page' : undefined}>{item.label}</Link>)}</nav>}
      <div className="ov-collection-tools">
        {data.status === 'ready' && <span className="ov-collection-count" role="status">{data.total} {data.total === 1 ? 'piece' : 'pieces'}</span>}
        <button type="button" className="ov-filter-button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}><SlidersHorizontal size={15} aria-hidden="true" /> Filter {activeFilterCount(filters) > 0 && <span className="ov-filter-count">{activeFilterCount(filters)}</span>}</button>
      </div>
    </div>
    <FilterDrawer open={open} filters={filters} facets={facets} onClose={() => setOpen(false)}
      onApply={next => { setParams(filtersToSearch(next)); setOpen(false); }}
      onClear={() => { setParams(options.q ? { q: options.q } : {}); setOpen(false); }} />
    {data.status === 'loading' && <p role="status">Loading products…</p>}
    {data.status === 'error' && <div role="alert"><p>We could not load these products.</p><button onClick={data.retry}>Try again</button></div>}
    {data.status === 'ready' && <section className="ov-shop-products" aria-label={title}>
      {data.products.length ? <div className="ov-product-grid">{data.products.map(product => <ProductCard key={product.slug} product={product} />)}</div> : <p>No products match this page. Try clearing filters or returning to the first page.</p>}
      {(options.page > 1 || data.total > PAGE_SIZE) && <nav aria-label="Product pages" className="ov-empty-actions">{options.page > 1 && <Link className="ov-button ov-button-light" to={pageLink(options.page-1)}>Previous</Link>}
        <span>Page {options.page}</span>{options.page * PAGE_SIZE < data.total && <Link className="ov-button ov-button-light" to={pageLink(options.page+1)}>Next</Link>}</nav>}
    </section>}
  </main>;
}
