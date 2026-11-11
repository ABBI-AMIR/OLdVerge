import BrandLoader from './components/BrandLoader.jsx';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useCatalog } from './data/catalog.js';
import { quarterZipColors } from './lib/quarterZipShowcase.js';
import { collectionForCategory } from './data/collections.js';
import { NotFoundPage } from './pages/NotFoundPage.jsx';
import HomeHero, { heroImages } from './components/HomeHero.jsx';
import FeaturedCarousel from './components/FeaturedCarousel.jsx';
import ColorExplorer from './components/ColorExplorer.jsx';
import CollectionPage from './components/CollectionPage.jsx';
import Reveal from './components/Reveal.jsx';


export function HomePage() {
  const products = useCatalog(state => state.products);
  // Quarter-zip colour links use the colour values already defined on the
  // quarter-zip products, and the product routes that already exist.
  const colors = useMemo(() => quarterZipColors(products), [products]);
  return <main id="main-content" className="ov-home">
    <BrandLoader readyImages={heroImages().slice(0, 3).map(image => image.src)} />
    <HomeHero />
    <FeaturedCarousel />
    {colors.length > 0 && <ColorExplorer colors={colors} />}
    <section id="collections" className="ov-category-section">
      <Reveal className="ov-section-heading"><div><h2>Two essentials.<br /><em>One point of view.</em></h2></div></Reveal>
      <Reveal className="ov-category-grid" delay={0.1}>
        <Link to="/shop/watches" className="ov-category-card ov-watch-card"><img src="/images/editorial-watch-collection.webp" width="1100" height="1350" alt="Dark-dial watches arranged in a velvet-lined case" loading="lazy" decoding="async" /><span className="ov-category-index">01 / WATCHES</span><div><h3>Time,<br />considered.</h3><span>Explore the collection <ArrowRight size={15} /></span></div></Link>
        <Link to="/shop/quarter-zips" className="ov-category-card ov-zip-card"><img src="/images/ribbon-four-colours.jpg" width="1290" height="2106" alt="Folded Oldverge quarter-zips in Burgundy, Brown, Black and Navy on a wooden table" loading="lazy" decoding="async" /><span className="ov-category-index">02 / CLOTHES</span><div><h3>The layer<br />you reach for.</h3><span>Find your colour <ArrowRight size={15} /></span></div></Link>
      </Reveal>
    </section>
    <section className="ov-story" aria-label="Our story">
      <Reveal className="ov-story-media">
        <Link to="/about" aria-label="Our story: read more"><img src="/images/editorial-tank-watch.webp" width="1100" height="1350" alt="Rectangular gold-tone watch with a black leather strap in a red presentation box" loading="lazy" decoding="async" /></Link>
      </Reveal>
      <Reveal className="ov-story-copy" delay={0.1}>
        <span className="ov-story-eyebrow">OUR STORY</span>
        <p className="ov-story-statement">A small range for everyday wear. A quarter zip in four colours, and watches that suit a plain white shirt as well as a weekend.</p>
        <p className="ov-story-sign">Considered clothing. Distinctive watches. Your everyday signature.</p>
        <Link to="/about" className="ov-story-link">Read our story <ArrowRight size={15} aria-hidden="true" /></Link>
      </Reveal>
    </section>
  </main>;
}

export function ShopPage() {
  const { category } = useParams();
  const collection = collectionForCategory(category);
  if (!collection) return <NotFoundPage what="collection" />;
  return <CollectionPage collection={collection} />;
}
