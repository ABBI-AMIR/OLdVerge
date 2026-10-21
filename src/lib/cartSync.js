// Customer cart persistence and synchronization for Supabase (backend mode).
//
// Rules:
// 1. Guest carts are stored locally in localStorage (via Zustand persist in store.js).
// 2. When a customer signs in, their local cart lines merge into their remote cart on Supabase
//    via `sync_customer_cart`, which caps line quantities at MAX_QTY (9) and drops invalid variants.
// 3. While signed in, cart mutations (add, set quantity, remove, clear) update the database asynchronously.
// 4. In demo mode (no Supabase configured), this module remains idle and does nothing.

import { useEffect, useRef } from 'react';
import { isBackend } from './config.js';
import { supabase } from './supabase.js';
import { useAuth } from './auth.js';
import { lineKey, useStore } from '../store.js';
import { productBySlug } from '../data/catalog.js';
import { variantFor } from '../data/catalogMapper.js';

/** Converts local cart lines [{ productId, size, color, quantity }] to [{ variant_id, quantity }] */
export function linesToVariantPayload(lines) {
  const payload = [];
  (lines || []).forEach((line) => {
    const product = productBySlug(line.productId);
    if (!product) return;
    const variant = variantFor(product, { size: line.size, color: line.color });
    if (variant?.id) {
      payload.push({ variant_id: variant.id, quantity: line.quantity });
    }
  });
  return payload;
}

/** Synchronizes the current local cart with Supabase for the signed-in customer. */
export async function syncCartWithBackend() {
  if (!isBackend || !supabase) return { ok: false, error: 'backend_not_configured' };
  const user = useAuth.getState().user;
  if (!user?.id) return { ok: false, error: 'unauthenticated' };

  try {
    const localLines = useStore.getState().cart;
    const p_lines = linesToVariantPayload(localLines);
    const { data, error } = await supabase.rpc('sync_customer_cart', { p_lines });
    if (error) return { ok: false, error: error.message };

    // Map database rows back into storefront cart lines
    const mergedLines = (data || []).map((row) => {
      const size = row.size || '';
      const color = row.color || '';
      return {
        key: lineKey(row.product_slug, size, color),
        productId: row.product_slug,
        size,
        color,
        quantity: Math.min(9, Math.max(1, row.quantity)),
      };
    });

    useStore.setState({ cart: mergedLines });
    return { ok: true, lines: mergedLines };
  } catch (err) {
    return { ok: false, error: err?.message || 'sync_failed' };
  }
}

/** Asynchronously pushes an item removal to the database for an authenticated user. */
export async function removeBackendCartItem(key) {
  if (!isBackend || !supabase) return;
  const user = useAuth.getState().user;
  if (!user?.id) return;

  const [slug, size, color] = key.split('|');
  const product = productBySlug(slug);
  const variant = product ? variantFor(product, { size, color }) : null;
  if (!variant?.id) return;

  try {
    await supabase.from('customer_cart_items').delete().eq('user_id', user.id).eq('variant_id', variant.id);
  } catch {
    // Non-blocking background sync
  }
}

/** Asynchronously clears the customer's remote cart in Supabase. */
export async function clearBackendCart() {
  if (!isBackend || !supabase) return;
  const user = useAuth.getState().user;
  if (!user?.id) return;

  try {
    await supabase.from('customer_cart_items').delete().eq('user_id', user.id);
  } catch {
    // Non-blocking background sync
  }
}

/** Hook to automatically synchronize the cart on login and maintain synchronization. */
export function useCartSync() {
  const authStatus = useAuth((state) => state.status);
  const user = useAuth((state) => state.user);
  const syncedUserRef = useRef(null);

  useEffect(() => {
    if (!isBackend) return;

    if (authStatus === 'signed-in' && user?.id && syncedUserRef.current !== user.id) {
      syncedUserRef.current = user.id;
      syncCartWithBackend();
    } else if (authStatus !== 'signed-in') {
      syncedUserRef.current = null;
    }
  }, [authStatus, user?.id]);
}
