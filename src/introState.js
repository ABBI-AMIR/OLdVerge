import { useSyncExternalStore } from 'react';

/*
 * Shared state for the first-visit loader. The loader runs only on the first
 * homepage visit in a browser tab session; the hero waits for it to leave
 * before starting its entrance.
 */
const KEY = 'ov-loader-seen';

const read = () => {
  try { return window.sessionStorage.getItem(KEY) === '1'; } catch { return false; }
};
export const markLoaderSeen = () => {
  try { window.sessionStorage.setItem(KEY, '1'); } catch { /* private mode: loader may repeat */ }
};

// Decided once, when the app first loads.
const willShow = typeof window !== 'undefined' && window.location.pathname === '/' && !read();
if (typeof window !== 'undefined' && !willShow) markLoaderSeen();

let done = !willShow;
const listeners = new Set();

export const loaderWillShow = () => willShow;
export const finishIntro = () => {
  if (done) return;
  done = true;
  markLoaderSeen();
  listeners.forEach((listener) => listener());
};
const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
export const useIntroDone = () => useSyncExternalStore(subscribe, () => done, () => true);
