import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ProductCard } from './Shell.jsx';
import { COLLECTIONS, slugify } from '../data/collections.js';
import { PAGE_SIZE } from '../data/catalog.js';
import { useCatalogPage } from '../lib/useCatalogPage.js';
import { SORTS } from '../lib/collectionFilters.js';

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
  return <main id="main-content" className="ov-page ov-shop"><h1>{title}</h1>
    {!search && <nav className="ov-switch" aria-label="Collection">{Object.values(COLLECTIONS).map(item => <Link key={item.key} to={item.path}>{item.label}</Link>)}</nav>}
    {search && <form className="ov-inline-search" onSubmit={submit}><label htmlFor="catalog-query">Search products</label><input id="catalog-query" name="q" type="search" maxLength={80} defaultValue={options.q} key={options.q} /><button className="ov-button ov-button-dark">Search</button></form>}
    <button type="button" className="ov-filter-button" onClick={() => setOpen(!open)} aria-expanded={open}>Filter and sort</button>
    {open && <form className="ov-form" onSubmit={submit} key={params.toString()}>
      {options.q && <input type="hidden" name="q" value={options.q} />}
      {(options.category === 'watches' ? ['brand','style'] : options.category === 'quarter-zips' ? ['colour','size'] : []).map(key => <fieldset key={key}><legend>{key}</legend>{(data.facets?.[key] || []).map(item => <label key={item.id}><input type="checkbox" name={key} value={item.id} defaultChecked={options.filters[key].includes(item.id)} />{item.name} ({item.count})</label>)}</fieldset>)}
      <label>Minimum price (PKR)<input name="price_min" type="number" min="0" max="999999999" defaultValue={options.filters.priceMin ?? ''} /></label>
      <label>Maximum price (PKR)<input name="price_max" type="number" min="0" max="999999999" defaultValue={options.filters.priceMax ?? ''} /></label>
      <label>Sort<select name="sort" defaultValue={options.sort}>{SORTS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <button className="ov-button ov-button-dark">Apply</button><button type="button" onClick={() => { setParams(options.q ? { q: options.q } : {}); setOpen(false); }}>Clear filters</button>
    </form>}
    {data.status === 'loading' && <p role="status">Loading products…</p>}
    {data.status === 'error' && <div role="alert"><p>We could not load these products.</p><button onClick={data.retry}>Try again</button></div>}
    {data.status === 'ready' && <><p role="status">{data.total} {data.total === 1 ? 'piece' : 'pieces'}</p>
      {data.products.length ? <div className="ov-product-grid">{data.products.map(product => <ProductCard key={product.slug} product={product} />)}</div> : <p>No products match this page. Try clearing filters or returning to the first page.</p>}
      <nav aria-label="Product pages" className="ov-empty-actions">{options.page > 1 && <Link className="ov-button ov-button-light" to={pageLink(options.page-1)}>Previous</Link>}
        <span>Page {options.page}</span>{options.page * PAGE_SIZE < data.total && <Link className="ov-button ov-button-light" to={pageLink(options.page+1)}>Next</Link>}</nav>
    </>}
  </main>;
}
