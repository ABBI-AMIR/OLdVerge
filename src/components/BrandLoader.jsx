import { useEffect, useRef, useState } from 'react';
import { finishIntro, loaderWillShow } from '../introState.js';
import { lockScroll, unlockScroll } from '../lib/scrollLock.js';

/*
 * OLDVERGE loader — a local React port of the supplied Framer component
 * "Animation loader" (framer.com/m/Animation-loader-eHagKV.js, module SVXObxb6u).
 *
 * The Framer module cannot be imported as-is: it is a remote ES module that
 * depends on the `framer` runtime package (RichText, variant hooks, layout
 * containers), so it is re-implemented here with CSS and a small counter loop. This
 * keeps the source sequence:
 *
 *   Variant 1  full-screen panel; brand name top-left; a 1px bar; counter 0%
 *   Variant 2  (on mount)  the bar line draws across the panel and the
 *              counter runs 0 -> 100 smoothly over
 *              `counterDuration` seconds. Brand-name letters blur in one by one.
 *   Variant 3  (counterDuration + 0.1s later; source: 3.1s with a 3s counter)
 *              the panel's corners round to 50% and it lifts away over 0.6s
 *              (ease .77,.02,.24,1.02), taking the text with it.
 *
 * Source controls, kept as props: brandName, counterDuration, textColor,
 * background. Changed for OLDVERGE: the brand name, Ivory/Espresso colours,
 * the typefaces (Quattrocento wordmark, Helvetica-family Light counter), a
 * shorter default counter (2.4s, not 3s), and the exit is gated on the hero
 * images and fonts being ready (with a hard timeout).
 */

const BAR_EASE = 'cubic-bezier(.12,.23,.5,1)';      // source transition4
const LIFT_EASE = 'cubic-bezier(.77,.02,.24,1.02)'; // source transition1
const LIFT_MS = 600;
const MAX_WAIT_MS = 6000;

export default function BrandLoader({
  brandName = 'OLDVERGE',
  counterDuration = 2.4,
  textColor = '#30251F',
  background = '#F4F0E7',
  readyImages = [],
  contentVersion = 0,
}) {
  const [reduced,setReduced]=useState(()=>typeof window!=='undefined'&&Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));
  const [visible, setVisible] = useState(loaderWillShow());
  const [variant, setVariant] = useState(1);
  const countRef = useRef(null);
  const rootRef = useRef(null);
  const startedAt = useRef(0);

  useEffect(()=>{
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>setReduced(media.matches);
    media.addEventListener('change',update);
    return ()=>media.removeEventListener('change',update);
  },[]);

  // Lock scroll and make the page behind unreachable while the panel is up.
  useEffect(() => {
    if (!visible) return undefined;
    lockScroll('loader');
    const behind = [...document.querySelectorAll('.app-shell > :not(.ov-loader)')];
    behind.forEach((el) => el.setAttribute('inert', ''));
    return () => {
      unlockScroll('loader');
      behind.forEach((el) => el.removeAttribute('inert'));
    };
  }, [visible,contentVersion]);

  useEffect(() => {
    if (!visible) return undefined;
    startedAt.current = performance.now();
    let cancelled = false;
    const timers = [];
    const later = (fn, ms) => { const id = window.setTimeout(fn, ms); timers.push(id); return id; };

    // What must be ready before the panel leaves: the display font, and the
    // first hero images. Never the whole catalog.
    const fontReady = Promise.race([
      document.fonts?.load ? Promise.all([document.fonts.load('400 24px Quattrocento'), document.fonts.load('300 48px "OV Helvetica"')]) : Promise.resolve(),
      new Promise((resolve) => later(resolve, MAX_WAIT_MS)),
    ]);
    const imageReady = Promise.all(readyImages.map((src) => new Promise((resolve) => {
      const img = new Image();
      img.onload = img.onerror = resolve;
      img.src = src;
      if (img.decode) img.decode().then(resolve, resolve);
    })));
    const assetsReady = Promise.race([Promise.all([fontReady, imageReady]), new Promise((resolve) => later(resolve, MAX_WAIT_MS))]);

    const leave = () => {
      if (cancelled) return;
      setVariant(3);                                  // lift away
      later(() => { if (!cancelled) { setVisible(false); finishIntro(); } }, reduced ? 380 : LIFT_MS + 60);
    };

    if (reduced) {
      // Brief, simple transition: no counter or bar; fade once ready (at most ~1.2s).
      Promise.race([assetsReady, new Promise((resolve) => later(resolve, 1200))]).then(leave);
    } else {
      setVariant(2);                                  // source: onAppear -> Variant 2
      const minimum = new Promise((resolve) => later(resolve, (counterDuration + 0.1) * 1000)); // source: 3.1s after Variant 2
      Promise.all([minimum, assetsReady]).then(leave);
    }
    return () => { cancelled = true; timers.forEach(window.clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // The panel/letters/bar remain CSS animated. Update only the counter's text
  // instead of rerendering the whole loader on every animation tick.
  useEffect(()=>{
    if(!visible||reduced)return undefined;
    let frame;let previous=-1;
    const tick=now=>{
      const progress=Math.min(1,(now-startedAt.current)/Math.max(1,counterDuration*1000));
      const value=Math.round(Math.max(0,progress)*100);
      if(value!==previous&&countRef.current){countRef.current.textContent=String(value);previous=value;}
      if(progress<1)frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(frame);
  },[visible,reduced,counterDuration]);

  if (!visible) return null;
  const lifting = variant === 3;
  const letters = [...brandName];
  return (
    <div
      ref={rootRef}
      className={`ov-loader is-v${variant} ${reduced ? 'is-reduced' : ''}`}
      role="status"
      aria-label={`${brandName} is loading`}
      style={{ '--ldr-text': textColor, '--ldr-bg': background, '--ldr-bar': `${counterDuration}s`, '--ldr-bar-ease': BAR_EASE, '--ldr-lift': `${LIFT_MS}ms`, '--ldr-lift-ease': LIFT_EASE }}
    >
      <div className="ov-loader-mask" data-lifting={lifting || undefined}>
        <div className="ov-loader-content">
          <div className="ov-loader-top" aria-hidden="true">
            {letters.map((letter, index) => <span key={index} style={{ '--i': index }}>{letter}</span>)}
          </div>
          <div className="ov-loader-middle" aria-hidden="true"><div className="ov-loader-barmask"><div className="ov-loader-bar" /></div></div>
          <div className="ov-loader-counter" aria-hidden="true"><span ref={countRef} className="ov-loader-number">{reduced ? '' : '0'}</span>{!reduced && <span className="ov-loader-percent">%</span>}</div>
        </div>
      </div>
    </div>
  );
}
