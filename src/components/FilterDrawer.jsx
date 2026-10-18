import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { formatPrice } from '../lib/money.js';
import { useScrollLock } from '../lib/scrollLock.js';
import { SORTS, activeFilterCount, applyFilters } from '../lib/collectionFilters.js';
import { useDialogFocus } from '../lib/useDialogFocus.js';

const swatchClass = (name) => `ov-swatch ov-swatch-${String(name).toLowerCase()}`;

function CheckGroup({ legend, name, options, selected, onToggle, swatches = false }) {
  return <fieldset className="ov-fd-group">
    <legend>{legend}</legend>
    <div className="ov-fd-options">
      {options.map((option) => <label className="ov-fd-check" key={option.id}>
        <input type="checkbox" name={name} value={option.id} checked={selected.includes(option.id)} onChange={() => onToggle(option.id)} />
        {swatches && <i className={swatchClass(option.name)} aria-hidden="true" />}
        <span>{option.name}</span>
        <small>{option.count}{option.count === 0 && <span className="ov-sr-only"> (no listings yet)</span>}</small>
      </label>)}
    </div>
  </fieldset>;
}

/**
 * Filter + sort drawer. It edits a draft; nothing changes in the URL until
 * Apply (or Clear all). `filters` is what the URL currently says.
 */
export default function FilterDrawer({ open, onClose, facets, filters, scoped, onApply, onClear }) {
  const reduced = useReducedMotion();
  const [draft, setDraft] = useState(filters);
  useEffect(() => { if (open) setDraft(filters); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useDialogFocus(open, onClose);
  useScrollLock(open, 'shop-filter');

  const toggle = (key, id) => setDraft((current) => ({ ...current, [key]: current[key].includes(id) ? current[key].filter((value) => value !== id) : [...current[key], id] }));
  const setPrice = (key, raw) => setDraft((current) => ({ ...current, [key]: raw === '' ? null : Math.max(0, Math.floor(Number(raw))) }));
  const matches = applyFilters(scoped, draft).length;
  const draftCount = activeFilterCount(draft);

  return <AnimatePresence>
    {open && <motion.div className="overlay drawer-overlay ov-filter-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : 0.2 }} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <motion.aside
        data-lenis-prevent
        className="ov-filter-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ov-filter-title"
        initial={reduced ? { opacity: 0 } : { x: '100%' }}
        animate={reduced ? { opacity: 1 } : { x: 0 }}
        exit={reduced ? { opacity: 0 } : { x: '100%' }}
        transition={reduced ? { duration: 0 } : { type: 'spring', damping: 30, stiffness: 260 }}
      >
        <div className="ov-fd-head">
          <h2 id="ov-filter-title">Filter &amp; sort{draftCount > 0 && <span> ({draftCount})</span>}</h2>
          <button type="button" className="ov-fd-close" aria-label="Close filters" onClick={onClose}><X size={20} /></button>
        </div>
        <form className="ov-fd-form" onSubmit={(event) => { event.preventDefault(); onApply(draft); }}>
          <div className="ov-fd-body" data-lenis-prevent>
            <fieldset className="ov-fd-group">
              <legend>Sort by</legend>
              <div className="ov-fd-options">
                {SORTS.map((option) => <label className="ov-fd-check" key={option.value}>
                  <input type="radio" name="ov-sort" value={option.value} checked={draft.sort === option.value} onChange={() => setDraft((current) => ({ ...current, sort: option.value }))} />
                  <span>{option.label}</span>
                </label>)}
              </div>
            </fieldset>
            {facets.brand && <CheckGroup legend="Brand" name="brand" options={facets.brand} selected={draft.brand} onToggle={(id) => toggle('brand', id)} />}
            {facets.style && <CheckGroup legend="Style" name="style" options={facets.style} selected={draft.style} onToggle={(id) => toggle('style', id)} />}
            {facets.colour && <CheckGroup legend="Colour" name="colour" options={facets.colour} selected={draft.colour} onToggle={(id) => toggle('colour', id)} swatches />}
            {facets.size && <CheckGroup legend="Size" name="size" options={facets.size} selected={draft.size} onToggle={(id) => toggle('size', id)} />}
            {facets.price && <fieldset className="ov-fd-group">
              <legend>Price (PKR)</legend>
              <div className="ov-fd-price">
                <label>Min<input type="number" inputMode="numeric" min="0" step="100" placeholder={String(facets.price.min)} value={draft.priceMin ?? ''} onChange={(event) => setPrice('priceMin', event.target.value)} /></label>
                <span aria-hidden="true">–</span>
                <label>Max<input type="number" inputMode="numeric" min="0" step="100" placeholder={String(facets.price.max)} value={draft.priceMax ?? ''} onChange={(event) => setPrice('priceMax', event.target.value)} /></label>
              </div>
              <p className="ov-fd-hint">Sample prices here run from {formatPrice(facets.price.min)} to {formatPrice(facets.price.max)}.</p>
            </fieldset>}
          </div>
          <div className="ov-fd-foot">
            <button type="button" className="ov-fd-clear" onClick={onClear}>Clear all</button>
            <button type="submit" className="ov-button ov-button-dark ov-fd-apply">Apply · {matches} {matches === 1 ? 'piece' : 'pieces'}</button>
          </div>
        </form>
      </motion.aside>
    </motion.div>}
  </AnimatePresence>;
}
