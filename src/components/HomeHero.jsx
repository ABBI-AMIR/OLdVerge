import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import TiltedGridHero from './TiltedGridHero.jsx';
import { useIntroDone } from '../introState.js';

// Local photographs only (public/images). Mixed clothing, watches and editorial.
// `position` keeps the subject inside the 4:5 crop (object-position).
export const HERO_IMAGES = [
  { src: '/images/quarter-zip-beige.jpg', position: '50% 28%' },
  { src: '/images/watch-seiko-sports.jpg', position: '56% 50%' },
  { src: '/images/oldverge-hero-model.jpg', position: '50% 30%' },
  { src: '/images/watch-timex-weekender.jpg', position: '50% 62%' },
  { src: '/images/quarter-zip-neutral.jpg', position: '50% 42%' },
  { src: '/images/oldverge-watch-editorial.jpg', position: '50% 50%' },
  { src: '/images/watch-hero-wrist.jpg', position: '50% 38%' },
  { src: '/images/watch-casio-mtp.jpg', position: '52% 50%' },
  { src: '/images/oldverge-hero-watch-detail.jpg', position: '50% 55%' },
  { src: '/images/quarter-zip-soft-knit.jpg', position: '50% 40%' },
];

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);
  return matches;
}

// The ribbon box has an explicit height (.ov-hero2-ribbon in home.css) and the axis sits in its
// vertical middle, so the band is symmetrical and nothing is cut off at the top or bottom.
// `tileHeight` is the centre tile's height as a share of that box. Tiles nearer the edges are
// magnified by the perspective (about 1.4x where the mask has faded them to nothing), which is why
// the centre tile is about two-thirds of the box and not more.
// `curve` is how far round the cylinder the frame's edge sits. The cylinder's radius follows the
// hero's WIDTH, so narrower screens get a gentler curve to keep the ribbon reading as a ribbon.
const LAYOUTS = {
  wide: { tileHeight: 65, axis: 50, curve: 56, gap: 6, fade: 13, speed: 5 },
  medium: { tileHeight: 63, axis: 50, curve: 52, gap: 6, fade: 11, speed: 5 },
  compact: { tileHeight: 64, axis: 50, curve: 46, gap: 8, fade: 7, speed: 4.5 },
};

export default function HomeHero() {
  const entered = useIntroDone();
  const compact = useMediaQuery('(max-width: 650px)');
  const medium = useMediaQuery('(max-width: 1000px)');
  const layout = compact ? LAYOUTS.compact : medium ? LAYOUTS.medium : LAYOUTS.wide;
  return (
    <section className={`ov-hero2 ${entered ? 'is-entered' : 'is-waiting'}`} aria-labelledby="ov-hero-title">
      <div className="ov-hero2-copy">
        <h1 id="ov-hero-title" className="ov-rise" style={{ '--d': '0ms' }}>Timeless Elegance</h1>
        <p className="ov-rise" style={{ '--d': '120ms' }}>Considered clothing. Distinctive watches. Your everyday signature.</p>
        <div className="ov-hero2-actions ov-rise" style={{ '--d': '220ms' }}><Link to="/shop" className="ov-button ov-button-dark">Shop all</Link><Link to="/shop/watches" className="ov-button ov-button-light">Shop watches</Link></div>
      </div>
      <TiltedGridHero className="ov-hero2-ribbon" images={HERO_IMAGES} aspectRatio={4 / 5} {...layout} />
    </section>
  );
}
