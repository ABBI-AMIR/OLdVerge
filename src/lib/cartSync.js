import { useEffect } from 'react';
import { isBackend } from './config.js';
import { supabase } from './supabase.js';
import { useAuth } from './auth.js';
import { lineKey, useStore } from '../store.js';
import { productBySlug, useCatalog } from '../data/catalog.js';
import { variantFor } from '../data/catalogMapper.js';

export function linesToVariantPayload(lines) {
  return (lines || []).flatMap((line) => {
    const variant = variantFor(productBySlug(line.productId), line.size, line.color);
    return variant ? [{ variant_id: variant.id, quantity: line.quantity }] : [];
  });
}

const fromRows = (rows) => (rows || []).map((row) => {
  const size = row.size || 'One size';
  const color = row.color || 'Standard';
  return { key: lineKey(row.product_slug, size, color), productId: row.product_slug, size, color, quantity: Math.min(9, Math.max(1, row.quantity)) };
});

// A login merges by maximum quantity; subsequent edits replace the full snapshot.
// Serialize writes so a slow add cannot arrive after a removal/checkout clear.
export function startCartSync({ client = supabase, store = useStore, auth = useAuth, catalog = useCatalog, events = globalThis.window } = {}) {
  let stopped = false;
  let generation = 0;
  let owner = null;
  let ready = false;
  let applying = false;
  let revision = 0;
  let queue = Promise.resolve();
  let retry = null;
  const current = (id, epoch) => !stopped && owner === id && generation === epoch && auth.getState().user?.id === id;
  const enqueue = (task) => { queue = queue.then(task).catch(() => { if (!stopped) store.setState({ cartNotice: 'Your bag is saved in this browser, but could not sync to your account. Reconnect or edit your bag to retry.' }); }); };
  const push = () => {
    if (!ready || !owner) return;
    const id = owner; const epoch = generation;
    const lines = linesToVariantPayload(store.getState().cart);
    enqueue(async () => {
      if (!current(id, epoch)) return;
      const { error } = await client.rpc('replace_customer_cart', { p_lines: lines });
      if (error) throw error;
    });
  };
  const check = () => {
    const state = auth.getState();
    const id = state.status === 'signed-in' ? state.user?.id : null;
    if (id !== owner) { owner = id; generation++; ready = false; }
    if (!id || ready || catalog.getState().status !== 'ready' || retry === generation) return;
    const epoch = generation; retry = epoch;
    const initial = store.getState().cart;
    const version = revision;
    enqueue(async () => {
      try {
        if (!current(id, epoch)) return;
        const { data, error } = await client.rpc('sync_customer_cart', { p_lines: linesToVariantPayload(initial) });
        if (error) throw error;
        if (!current(id, epoch)) return;
        await catalog.getState().ensure?.((data || []).map(row => row.product_slug));
        if (!current(id, epoch)) return;
        const remote = fromRows(data);
        // Preserve edits made while login was loading, including removals and checkout.
        const now = store.getState().cart;
        const merged = version === revision ? remote : !now.length ? [] : [
          ...remote.filter((line) => !initial.some((entry) => entry.key === line.key) && !now.some((entry) => entry.key === line.key)),
          ...now,
        ];
        applying = true;
        store.setState({ cart: merged });
        applying = false;
        ready = true;
        if (version !== revision) push();
      } finally { if (retry === epoch) retry = null; }
    });
  };
  const unsubStore = store.subscribe((state, previous) => {
    if (state.cart === previous.cart || applying) return;
    revision++;
    if (ready) push(); else check();
  });
  const unsubAuth = auth.subscribe(check);
  const unsubCatalog = catalog.subscribe(check);
  const reconnect = () => { if (ready) push(); else check(); };
  events?.addEventListener('online', reconnect);
  check();
  return {
    idle: () => queue,
    stop() { stopped = true; generation++; unsubStore(); unsubAuth(); unsubCatalog(); events?.removeEventListener('online', reconnect); },
  };
}

export function useCartSync() {
  useEffect(() => {
    if (!isBackend || !supabase) return undefined;
    const sync = startCartSync();
    return () => sync.stop();
  }, []);
}
