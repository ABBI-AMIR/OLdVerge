import { useEffect } from 'react';

// One shared registry for "the page behind must not scroll" reasons: the
// loading screen, the bag drawer, the mobile menu, the quick-view modal, etc.
// Each reason holds its own key, so two overlays open at once (or one closing
// while another opens) can never release each other's lock.
const reasons = new Set();
const listeners = new Set();

const apply = () => {
  const locked = reasons.size > 0;
  document.documentElement.classList.toggle('ov-scroll-locked', locked);
  listeners.forEach((listener) => listener(locked));
};

export const lockScroll = (reason) => { reasons.add(reason); apply(); };
export const unlockScroll = (reason) => { reasons.delete(reason); apply(); };
export const isScrollLocked = () => reasons.size > 0;
/** Called with true/false whenever the locked state changes. Returns an unsubscribe function. */
export const subscribeScrollLock = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };

/** Lock page scrolling while `active` is true. `reason` must be unique per overlay. */
export function useScrollLock(active, reason) {
  useEffect(() => {
    if (!active) return undefined;
    lockScroll(reason);
    return () => unlockScroll(reason);
  }, [active, reason]);
}
