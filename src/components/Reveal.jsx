import { createElement, useEffect, useRef, useState } from 'react';

/** Progressive enhancement: content is visible without JS/IntersectionObserver or under reduced motion. */
export default function Reveal({ as = 'div', delay = 0, y = 24, duration = 0.7, className, style, children, ...rest }) {
  const element = useRef(null);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!element.current || !globalThis.IntersectionObserver) return undefined;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (preference.matches) return undefined;
    const show = () => setHidden(false);
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { show(); observer.disconnect(); }
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    setHidden(true); observer.observe(element.current);
    preference.addEventListener('change', show);
    return () => { observer.disconnect(); preference.removeEventListener('change', show); };
  }, []);
  return createElement(as, { ...rest, ref: element, className, style: {
    transition: `opacity ${duration}s cubic-bezier(.22,.7,.2,1) ${delay}s, transform ${duration}s cubic-bezier(.22,.7,.2,1) ${delay}s`,
    ...(hidden ? { opacity: 0, transform: `translateY(${y}px)` } : {}), ...style,
  } }, children);
}
