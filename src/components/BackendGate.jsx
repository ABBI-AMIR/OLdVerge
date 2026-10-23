import { useEffect } from 'react';
import { isBackend } from '../lib/config.js';
import { useCatalog } from '../data/catalog.js';
import { useSite } from '../data/site.js';
import { useStore } from '../store.js';
import { useAuth } from '../lib/auth.js';
import { startStoreRefresh } from '../lib/storeRefresh.js';
import { useCartSync } from '../lib/cartSync.js';

/** Starts loading the store content once and re-checks the bag against the catalogue when it arrives (backend mode). */
export function useBackendBootstrap() {
  useCartSync();

  useEffect(() => {
    if (!isBackend) return;
    useAuth.getState().init();
    useSite.getState().load();
    const pin = () => { const state = useStore.getState(); useCatalog.setState({ pinnedSlugs: [...new Set([...state.cart, ...(state.directItem ? [state.directItem] : [])].map(line => line.productId))] }); };
    pin();
    const unsubscribe = useStore.subscribe((state, previous) => { if (state.cart !== previous.cart || state.directItem !== previous.directItem) pin(); });
    const stopRefresh = startStoreRefresh({ refresh: () => {
      useSite.getState().load();
      useCatalog.getState().load().then(() => { if (useCatalog.getState().status === 'ready' && !useCatalog.getState().refreshError) useStore.getState().reconcileCart(); });
    } });
    useCatalog.getState().load().then(() => {
      if (useCatalog.getState().status === 'ready') useStore.getState().reconcileCart();
    });
    return () => { unsubscribe(); stopRefresh(); };
  }, []);
}

/**
 * Wraps pages that need the catalogue and store settings. In demo mode it renders its children straight away.
 * In backend mode it shows a loading state, or an honest error with a retry: it never shows sample data instead.
 */
export default function BackendGate({ children }) {
  const catalog = useCatalog((state) => state.status);
  const site = useSite((state) => state.status);
  const catalogWarning = useCatalog(state => state.refreshError);
  const siteWarning = useSite(state => state.refreshError);
  useCatalog(state => state.products);
  if (!isBackend) return children;
  if (catalog === 'error' || site === 'error') {
    return <main id="main-content" className="ov-backend-state" role="alert">
      <h1>We could not load the store.</h1>
      <p>Something went wrong while loading the collection. Nothing has been lost. Please check your connection and try again.</p>
      <button type="button" className="ov-button ov-button-dark" onClick={() => {
        useSite.getState().load({ force: true });
        useCatalog.getState().load({ force: true }).then(() => useStore.getState().reconcileCart());
      }}>Try again</button>
    </main>;
  }
  if (catalog !== 'ready' || site !== 'ready') {
    return <main id="main-content" className="ov-backend-state" aria-busy="true"><p role="status">Loading the collection…</p></main>;
  }
  return <>{(catalogWarning || siteWarning) && <p role="status">Store information could not refresh. <button onClick={() => { useSite.getState().load({ force: true }); useCatalog.getState().load({ force: true }); }}>Try again</button></p>}{children}</>;
}
