import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { getLenis, setLenis } from '../lib/lenisInstance.js';
import { isScrollLocked, subscribeScrollLock } from '../lib/scrollLock.js';

/**
 * App-root scroll integration (render once, inside the Router):
 *  1. One Lenis instance with its own single animation-frame loop (autoRaf). Wheel input is lightly
 *     smoothed; touch stays native (syncTouch is off). With prefers-reduced-motion there is no Lenis at all.
 *     In-page links (#id) glide to their section; reduced motion turns that off.
 *  2. Scroll position per history entry: new navigations jump to the top at
 *     once; back/forward restore the position that entry was left at.
 *  3. Overlay locking is handled in lib/scrollLock.js.
 */
const STORAGE_KEY = 'ov-scroll-positions';

const readPositions = () => {
  try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
};
const writePositions = (positions) => {
  try {
    const entries = Object.entries(positions).slice(-60);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch { /* storage unavailable: restoration just falls back to the top */ }
};

const jumpTo = (y) => {
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo({ top: y, left: 0, behavior: 'instant' });
};
const HEADER_OFFSET = 84;

export default function SmoothScroll() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const keyRef = useRef(location.key);
  const cancelRestoreRef = useRef(() => {});
  // Last scroll offset seen by a passive listener (no React state, so nothing
  // re-renders while scrolling). Read when leaving a page, because by the time
  // the new route commits the browser may already have clamped scrollY.
  const latestY = useRef(0);

  // 1. Lenis lives here, once, for every route. Created only when motion is allowed; torn down on unmount
  // or when the visitor switches reduced motion on.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    let lenis = null;
    let unsubscribe = () => {};
    const stop = () => { unsubscribe(); lenis?.destroy(); lenis = null; setLenis(null); };
    const start = () => {
      if (lenis) return;
      // Subtle smoothing: a high lerp follows the wheel closely, so there is little trailing momentum.
      lenis = new Lenis({ autoRaf: true, lerp: 0.14, wheelMultiplier: 1, smoothWheel: true, syncTouch: false, anchors: false });
      setLenis(lenis);
      if (isScrollLocked()) lenis.stop();
      unsubscribe = subscribeScrollLock((locked) => { if (locked) lenis?.stop(); else lenis?.start(); });
    };
    const sync = () => { if (query.matches) stop(); else start(); };
    sync();
    query.addEventListener('change', sync);
    return () => { query.removeEventListener('change', sync); stop(); };
  }, []);

  // 2. Take over restoration so it works the same with and without Lenis.
  useEffect(() => {
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    const save = () => {
      const positions = readPositions();
      positions[keyRef.current] = latestY.current;
      writePositions(positions);
    };
    const track = () => { latestY.current = window.scrollY; };
    window.addEventListener('pagehide', save);
    window.addEventListener('scroll', track, { passive: true });
    return () => {
      window.removeEventListener('pagehide', save);
      window.removeEventListener('scroll', track);
      window.history.scrollRestoration = previous;
    };
  }, []);

  useLayoutEffect(() => {
    const positions = readPositions();
    // Leaving the previous entry: remember where it was.
    const previousKey = keyRef.current;
    if (previousKey !== location.key) {
      positions[previousKey] = latestY.current;
      writePositions(positions);
    }
    keyRef.current = location.key;
    cancelRestoreRef.current();

    const target = navigationType === 'POP' ? positions[location.key] : undefined;
    if (!target) {
      // In-page link (#id): glide to the section below the sticky header; otherwise jump to the top.
      let id = '';
      try { id = decodeURIComponent(location.hash.slice(1)); } catch { /* malformed escape in the URL: treat as no target */ }
      const node = id ? document.getElementById(id) : null;
      if (node) {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.requestAnimationFrame(() => {
          const lenis = getLenis();
          if (lenis && !reduced) lenis.scrollTo(node, { offset: -HEADER_OFFSET, duration: 0.9 });
          else node.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
        });
      } else jumpTo(0);
      return undefined;
    }

    // Back/forward: the page may not be tall enough yet (route fade-in,
    // images), so retry briefly until the position is reachable. Any user
    // input cancels the restore so it can never fight the reader.
    let frame = 0;
    const startedAt = performance.now();
    const events = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
    const cancel = () => { window.cancelAnimationFrame(frame); events.forEach((name) => window.removeEventListener(name, cancel)); };
    cancelRestoreRef.current = cancel;
    events.forEach((name) => window.addEventListener(name, cancel, { passive: true, once: true }));
    const attempt = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max >= target - 2 || performance.now() - startedAt > 1500) { jumpTo(Math.min(target, Math.max(max, 0))); cancel(); return; }
      frame = window.requestAnimationFrame(attempt);
    };
    frame = window.requestAnimationFrame(attempt);
    return cancel;
  }, [location.key, navigationType, location.hash]);

  return null;
}
