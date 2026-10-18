// The single Lenis instance, created by components/SmoothScroll.jsx. It is null while
// reduced motion is on (or before mount), and callers then fall back to native scrolling.
let instance = null;
export const getLenis = () => instance;
export const setLenis = (lenis) => { instance = lenis; };
