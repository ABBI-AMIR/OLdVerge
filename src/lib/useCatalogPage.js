import { useEffect, useState } from 'react';
import { fetchCatalogPage, useCatalog } from '../data/catalog.js';

// Previous query results are never shown as if they belonged to a new filter/search.
export function useCatalogPage(options, { enabled = true } = {}) {
  const key = JSON.stringify(options);
  const loadedAt = useCatalog(state => state.loadedAt);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ key: '', status: 'loading' });
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setResult({ key, status: 'loading' });
    fetchCatalogPage(JSON.parse(key)).then(data => {
      if (cancelled) return;
      useCatalog.getState().cache(data.products);
      setResult({ ...data, key, status: 'ready' });
    }).catch(() => { if (!cancelled) setResult({ key, status: 'error' }); });
    return () => { cancelled = true; };
  }, [key, loadedAt, attempt, enabled]);
  return { ...(result.key === key ? result : { status: 'loading' }), retry: () => setAttempt(value => value + 1) };
}
