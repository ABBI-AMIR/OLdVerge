import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, SlidersHorizontal, X } from 'lucide-react';
import { COLLECTIONS, brandDisplayName, collectionProducts, crumbsFor } from '../data/collections.js';
import { formatPrice } from '../lib/money.js';
import {
  SORTS, activeFilterCount, applyFilters, emptyFilters, filtersToSearch, getFacets, parseFilters, recallShopState, rememberShopState,
} from '../lib/collectionFilters.js';
import { ProductCard } from './Shell.jsx';
import FilterDrawer from './FilterDrawer.jsx';
import Reveal from './Reveal.jsx';

const SWITCH = ['all', 'watches', 'quarter-zips'];

function Breadcrumbs({ trail }) {
  return <nav className="ov-crumbs" aria-label="Breadcrumb"><ol>
    {trail.map((crumb, index) => {
      const last = index === trail.length - 1;
      return <li key={`${crumb.label}-${index}`}>{last ? <span aria-current="page">{crumb.label}</span> : <Link to={crumb.to}>{crumb.label}</Link>}{!last && <span className="ov-crumb-sep" aria-hidden="true">/</span>}</li>;
    })}
  </ol></nav>;
}

function pricePhrase(filters) {
  if (filters.priceMin != null && filters.priceMax != null) return `${formatPrice(filters.priceMin)} – ${formatPrice(filters.priceMax)}`;
  if (filters.priceMin != null) return `From ${formatPrice(filters.priceMin)}`;
  return `Up to ${formatPrice(filters.priceMax)}`;
}

function activeChips(filters, facets) {
  const name = (key, id) => facets[key]?.find((option) => option.id === id)?.name || id;
  const chips = [];
  if (filters.q) chips.push({ key: 'q', label: `Search: ${filters.q}`, remove: { q: '' } });
  ['brand', 'style', 'colour', 'size'].forEach((key) => filters[key].forEach((id) => chips.push({ key: `${key}-${id}`, label: name(key, id), remove: { [key]: filters[key].filter((value) => value !== id) } })));
  if (filters.priceMin != null || filters.priceMax != null) chips.push({ key: 'price', label: pricePhrase(filters), remove: { priceMin: null, priceMax: null } });
  if (filters.sort !== 'featured') chips.push({ key: 'sort', label: SORTS.find((option) => option.value === filters.sort).label, remove: { sort: 'featured' } });
  return chips;
}

function EmptyState({ filters, facets, onClear }) {
  const brandId = filters.brand.length === 1 ? filters.brand[0] : '';
  const brandName = brandId && brandDisplayName(brandId);
  const brandEntry = brandId && facets.brand?.find((option) => option.id === brandId);
  const onlyBrand = brandName && activeFilterCount(filters) === 1 && !filters.q;
  if (onlyBrand && brandEntry?.count === 0) {
    const available = facets.brand.filter((option) => option.count > 0);
    return <div className="ov-empty" role="status">
      <span className="ov-eyebrow-dark">{brandName.toUpperCase()}</span>
      <h2>No {brandName} watches listed yet.</h2>
      <p>This preview has no {brandName} listings. A watch is added only once its model details and a matching photograph are available, so nothing is shown here in the meantime.</p>
      <div className="ov-empty-actions"><Link className="ov-button ov-button-dark" to={COLLECTIONS.watches.path}>View all watches <ArrowRight size={15} /></Link></div>
      {available.length > 0 && <div className="ov-empty-brands"><span>Brands with listings</span>{available.map((option) => <Link key={option.id} to={`${COLLECTIONS.watches.path}?brand=${option.id}`}>{option.name} <small>{option.count}</small></Link>)}</div>}
    </div>;
  }
  return <div className="ov-empty" role="status">
    <h2>Nothing matches these filters.</h2>
    <p>Try removing a filter or widening the price range.</p>
    <div className="ov-empty-actions"><button type="button" className="ov-button ov-button-dark" onClick={onClear}>Clear all filters</button></div>
  </div>;
}

export default function CollectionPage({ collection }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const scoped = useMemo(() => collectionProducts(collection), [collection]);
  const facets = useMemo(() => getFacets(collection), [collection]);
  const filters = useMemo(() => parseFilters(searchParams, facets), [searchParams, facets]);
  const items = useMemo(() => applyFilters(scoped, filters), [scoped, filters]);
  const activeCount = activeFilterCount(filters);
  const chips = activeChips(filters, facets);

  useEffect(() => { rememberShopState(collection.key, location.search); }, [collection.key, location.search]);

  const go = (next) => {
    const search = filtersToSearch(next);
    if (search !== filtersToSearch(filters)) navigate({ pathname: location.pathname, search });
    setDrawerOpen(false);
  };
  const clearAll = () => go(emptyFilters());

  const singleBrand = filters.brand.length === 1 && brandDisplayName(filters.brand[0]) ? filters.brand[0] : '';
  const title = filters.q ? `Search: ${filters.q}` : singleBrand ? brandDisplayName(singleBrand) : collection.heading;
  const trail = crumbsFor({ collection, brand: singleBrand });

  return <main className="ov-shop ov-collection">
    <Breadcrumbs trail={trail} />
    <Reveal className="ov-collection-head"><h1>{title}</h1></Reveal>
    <div className="ov-collection-bar">
      <div className="ov-switch" role="group" aria-label="Collection">
        {SWITCH.map((key) => {
          const target = COLLECTIONS[key];
          const active = key === collection.key;
          return <Link key={key} to={{ pathname: target.path, search: active ? location.search : recallShopState(key) }} className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined}>{target.label}</Link>;
        })}
      </div>
      <div className="ov-collection-tools">
        <span className="ov-collection-count" aria-live="polite">{items.length} {items.length === 1 ? 'piece' : 'pieces'}</span>
        <button type="button" className="ov-filter-button" aria-haspopup="dialog" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}>
          <SlidersHorizontal size={15} aria-hidden="true" /> Filter
          {activeCount > 0 && <span className="ov-filter-count" aria-label={`${activeCount} active ${activeCount === 1 ? 'filter' : 'filters'}`}>{activeCount}</span>}
        </button>
      </div>
    </div>
    {chips.length > 0 && <div className="ov-chips" aria-label="Active filters">
      {chips.map((chip) => <button type="button" className="ov-chip" key={chip.key} aria-label={`Remove filter: ${chip.label}`} onClick={() => go({ ...filters, ...chip.remove })}>{chip.label}<X size={12} aria-hidden="true" /></button>)}
      {chips.length > 1 && <button type="button" className="ov-chip-clear" onClick={clearAll}>Clear all</button>}
    </div>}
    <section className="ov-shop-products" aria-label={`${title} products`}>
      {items.length
        ? <Reveal className="ov-product-grid">{items.map((product) => <ProductCard product={product} key={product.id} />)}</Reveal>
        : <EmptyState filters={filters} facets={facets} onClear={clearAll} />}
    </section>
    <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} facets={facets} filters={filters} scoped={scoped} onApply={go} onClear={clearAll} />
  </main>;
}
