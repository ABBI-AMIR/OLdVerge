import { useEffect, useReducer, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Pause, Play, RotateCcw } from 'lucide-react';
import { imageSize } from '../data/imageSizes.js';
import { colorNames, colorWays, idleShowcase, RETURN_TO_IDLE_MS, showcaseReducer, showcaseTilt, shownColor } from '../lib/quarterZipShowcase.js';
import Reveal from './Reveal.jsx';
import GarmentTurn from './GarmentTurn.jsx';

export default function ColorExplorer({ colors }) {
  const [state, dispatch] = useReducer(showcaseReducer, idleShowcase);
  const active = colors.find(color => color.slug === shownColor(state)) || null;
  const listRef = useRef(null);
  const stageRef = useRef(null);
  const holdTimer = useRef(0);
  const tiltFrame = useRef(0);
  const [frame, setFrame] = useState(0);
  const studioIndex = colors.findIndex(color => color.turntable);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!window.IntersectionObserver) { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);

  const clearHold = () => window.clearTimeout(holdTimer.current);
  const reset = () => { clearHold(); dispatch({type: 'reset'}); };
  useEffect(() => {
    // Already-mounted eager images also start decoding before a colour is chosen.
    const images = colors.map(color => {
      const image = new Image();
      image.decoding = 'async';
      image.src = color.image;
      image.decode?.().catch(() => {});
      return image;
    });
    return () => { images.forEach(image => { image.onload = null; }); };
  }, [colors]);
  useEffect(() => {
    const outside = event => {
      // Keep the chosen product URL stable through pointerdown -> click.
      if (!listRef.current?.contains(event.target) && !event.target.closest('.ov-cx-link, .ov-cx-playback')) dispatch({type: 'reset'});
    };
    document.addEventListener('pointerdown', outside);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.clearTimeout(holdTimer.current);
      window.cancelAnimationFrame(tiltFrame.current);
    };
  }, []);

  const blurPreview = event => {
    if (!event.relatedTarget?.closest('.ov-cx-reset, .ov-cx-link, .ov-cx-playback')) dispatch({type: 'blur'});
  };

  const resetTilt = () => {
    window.cancelAnimationFrame(tiltFrame.current);
    stageRef.current?.style.setProperty('--cx-tilt-x', '0deg');
    stageRef.current?.style.setProperty('--cx-tilt-y', '0deg');
  };
  const tilt = event => {
    if (event.pointerType === 'touch' || !window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)').matches) return;
    const box = event.currentTarget.getBoundingClientRect();
    const rotation = showcaseTilt((event.clientX - box.left) / box.width * 2 - 1, (event.clientY - box.top) / box.height * 2 - 1, Boolean(active));
    window.cancelAnimationFrame(tiltFrame.current);
    tiltFrame.current = window.requestAnimationFrame(() => {
      stageRef.current?.style.setProperty('--cx-tilt-x', `${rotation.x}deg`);
      stageRef.current?.style.setProperty('--cx-tilt-y', `${rotation.y}deg`);
    });
  };

  return <section className="ov-color-section ov-cx" aria-labelledby="ov-zip-title">
    <Reveal className="ov-color-copy">
      <span className="ov-eyebrow">THE OLDVERGE QUARTER-ZIP</span>
      <h2 id="ov-zip-title">One considered layer.<br /><em>{colorWays(colors.length)}</em></h2>
      <p>A familiar silhouette with a cleaner point of view. Find it in {colorNames(colors)}.</p>
      <ul ref={listRef} className="ov-color-list ov-cx-list" aria-label="Quarter-zip colours"
        onPointerLeave={event => {
          if (event.pointerType === 'touch') return;
          clearHold();
          dispatch({type: 'leave'});
          holdTimer.current = window.setTimeout(() => dispatch({type: 'expire'}), RETURN_TO_IDLE_MS);
        }}>
        {colors.map(color => <li key={color.slug}>
          <Link to={`/product/${color.slug}`} className={`ov-color-link ov-cx-btn${active?.slug === color.slug ? ' is-active' : ''}`}
            aria-label={`Shop Oldverge quarter-zip in ${color.name}`}
            onPointerEnter={event => {
              if (event.pointerType !== 'touch') { clearHold(); dispatch({type: 'hover', slug: color.slug}); }
            }}
            onFocus={event => {
              if (event.currentTarget.matches(':focus-visible')) { clearHold(); dispatch({type: 'focus', slug: color.slug}); }
            }}
            onBlur={blurPreview}
            onKeyDown={event => { if (event.key === 'Escape') { reset(); event.currentTarget.blur(); } }}>
            <i style={{background: color.hex}} aria-hidden="true" />
            <span>{color.name}</span><span className="ov-cx-mark" aria-hidden="true" />
          </Link>
        </li>)}
      </ul>
      <button type="button" className="ov-cx-reset" onClick={reset} onBlur={blurPreview} disabled={!active}>
        <RotateCcw size={15} aria-hidden="true" /> Show all colours
      </button>
    </Reveal>
    <Reveal className="ov-color-image ov-cx-visual" delay={0.1}>
      <div id="ov-cx-display" className={`ov-cx-display${active ? ' is-single' : ''}`} role="group" aria-label="Quarter-zip colour showcase"
        onPointerMove={active ? undefined : tilt} onPointerLeave={resetTilt}>
        <div className="ov-cx-stage" ref={stageRef}>
          <div className="ov-cx-idle" aria-hidden={Boolean(active)}>
            <svg width="0" height="0" aria-hidden="true" style={{position:'absolute'}}>
              <filter id="ov-cx-sand-matte" colorInterpolationFilters="sRGB">
                <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -2 -5 -1 0 6" />
                <feComposite in2="SourceGraphic" operator="in" />
              </filter>
            </svg>
            <div className="ov-cx-sequence" data-paused={paused || !visible || Boolean(active)}>
              {colors.map((color, index) => {
                const slot = (index - (frame + Math.max(0, studioIndex)) % colors.length + colors.length) % colors.length;
                const role = ['lead', 'partner'][slot] || 'waiting';
                // These four studio fronts share a light sand backdrop and dark fabric.
                const sandMatte = color.studioFront;
                return <figure key={color.slug} className={`ov-cx-garment ${role}`} data-matte={sandMatte}
                  onAnimationIteration={event => {
                    if (role === 'lead' && event.animationName === 'ov-cx-lead') setFrame(value => value + 1);
                  }}>
                  <img className="ov-cx-photo" src={color.image} {...imageSize(color.image)} {...color.imageProps} width={color.width} height={color.height} alt={`Oldverge quarter-zip in ${color.name}`} loading="eager" decoding="async" draggable="false" />
                  {!active && role === 'lead' && index === studioIndex && <GarmentTurn running={visible && !paused} />}
                </figure>;
              })}
            </div>
          </div>
          <div className="ov-cx-singles">
            {colors.map(color => <figure key={color.slug} className={`ov-cx-single${active?.slug === color.slug ? ' is-active' : ''}`} aria-hidden={active?.slug !== color.slug}>
              <img className="ov-cx-photo" src={color.image} {...imageSize(color.image)} {...color.imageProps} width={color.width} height={color.height} alt={`Oldverge quarter-zip in ${color.name}`} loading="eager" decoding="async" draggable="false" />
            </figure>)}
          </div>
        </div>
      </div>
      {!active && <button type="button" className="ov-cx-playback" onBlur={blurPreview} onClick={() => setPaused(value => !value)}
        aria-label={paused ? 'Play quarter-zip animation' : 'Pause quarter-zip animation'}>
        {paused ? <Play size={16} /> : <Pause size={16} />}
      </button>}
      <Link to={active ? `/product/${active.slug}` : '/shop/quarter-zips'} className="ov-color-image-link ov-cx-link" onBlur={blurPreview}>
        {active ? `View ${active.name} quarter-zip` : 'Explore all colours'} <ArrowRight size={14} aria-hidden="true" />
      </Link>
      <p className="ov-sr-only" role="status" aria-live="polite">{active ? `Showing ${active.name} quarter-zip` : `Showing all ${colors.length} quarter-zip colours`}</p>
    </Reveal>
  </section>;
}
