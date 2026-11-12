import {responsiveImageProps} from '../data/responsiveImages.js';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Maximize2, PackageCheck, Ruler, X } from 'lucide-react';
import { getProducts, productBySlug, useCatalog } from '../data/catalog.js';
import { crumbsFor } from '../data/collections.js';
import { imageSize } from '../data/imageSizes.js';
import { galleryFor } from '../data/productImages.js';
import { copyFor } from '../data/productCopy.js';
import { formatPrice } from '../lib/money.js';
import { isBackend } from '../lib/config.js';
import { orderingOpen, useSite } from '../data/site.js';
import { needsSize, useStore, validateOptions, variantStatus } from '../store.js';
import { useScrollLock } from '../lib/scrollLock.js';
import { useDialogFocus } from '../lib/useDialogFocus.js';
import { ProductCard } from '../components/Shell.jsx';
import { Accordion, QuantityControl } from '../components/ui.jsx';
import { NotFoundPage } from './NotFoundPage.jsx';

const quarterZipMeasurements = [
  ['S', 20.5, 17.5, 24.4, 9.1, 26],
  ['M', 21.5, 18, 24.8, 9.4, 27],
  ['L', 22.5, 18.5, 25.2, 9.8, 27.5],
  ['XL', 23.5, 19, 25.6, 10, 28],
];

function QuarterZipSizeChart({ chartRef }) {
  return <details ref={chartRef} className="ov-size-chart" id="quarter-zip-size-chart">
    <summary><Ruler size={19} aria-hidden="true" /> Size chart</summary>
    <table>
      <caption>Size chart <small>Garment measurements in inches</small></caption>
      <thead><tr>{['Size', 'Chest', 'Shoulder', 'Sleeve length', 'Armhole', 'Total length'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
      <tbody>{quarterZipMeasurements.map(([size, ...values]) => <tr key={size}>
        <th scope="row">{size}</th>{values.map((value, column) => <td key={column}>{value}</td>)}
      </tr>)}</tbody>
    </table>
  </details>;
}

function Lightbox({ images, index, onIndex, onClose }) {
  useDialogFocus(true, onClose);
  useScrollLock(true, 'lightbox');
  const image = images[index];
  const step = (delta) => onIndex((index + delta + images.length) % images.length);
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'ArrowRight') step(1); if (event.key === 'ArrowLeft') step(-1); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });
  return <div className="overlay ov-lightbox" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <div role="dialog" aria-modal="true" aria-label="Enlarged product image" className="ov-lightbox-panel">
      <button type="button" className="ov-icon-close" aria-label="Close enlarged image" onClick={onClose}><X size={22} aria-hidden="true" /></button>
      <img src={image.src} {...responsiveImageProps(image.src)} alt={image.alt} {...imageSize(image.src)} loading="eager" decoding="async" />
      {images.length > 1 && <div className="ov-lightbox-nav">
        <button type="button" aria-label="Previous image" onClick={() => step(-1)}><ChevronLeft aria-hidden="true" /></button>
        <span aria-live="polite">{index + 1} / {images.length}</span>
        <button type="button" aria-label="Next image" onClick={() => step(1)}><ChevronRight aria-hidden="true" /></button>
      </div>}
    </div>
  </div>;
}

function Gallery({ product }) {
  const images = galleryFor(product);
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const zoomButton = useRef(null);
  useEffect(() => { setActive(0); }, [product.id]);
  const current = images[active] || images[0];
  if (!current) return <div className="ov-gallery"><div className="ov-gallery-main is-empty" role="img" aria-label={`${product.name}, no photograph yet`} /></div>;
  return <div className="ov-gallery">
    <div className="ov-gallery-main ov-product-figure">
      <img src={current.src} {...responsiveImageProps(current.src)} alt={current.alt} {...imageSize(current.src)} loading="eager" decoding="async" fetchPriority="high" />
      <button type="button" ref={zoomButton} className="ov-zoom" aria-label="Enlarge image" aria-haspopup="dialog" onClick={() => setZoom(true)}><Maximize2 size={18} aria-hidden="true" /></button>
    </div>
    {images.length > 1 && <ul className="ov-thumbs" aria-label="Product images">{images.map((image, index) => <li key={image.src}>
      <button type="button" aria-label={`Show ${image.alt} (${index + 1} of ${images.length})`} aria-pressed={index === active} className={index === active ? 'is-active' : ''} onClick={() => setActive(index)}><img src={image.src} alt="" width="76" height="95" loading="lazy" decoding="async" /></button>
    </li>)}</ul>}
    {zoom && <Lightbox images={images} index={active} onIndex={setActive} onClose={() => { setZoom(false); window.setTimeout(() => zoomButton.current?.focus(), 0); }} />}
  </div>;
}

export default function ProductPage() {
  const { slug } = useParams();
  const products = useCatalog(state => state.products);
  const [load, setLoad] = useState({ slug: '', error: false });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    useCatalog.getState().ensure([slug]).then(() => { if (!cancelled) setLoad({ slug, error: false }); }).catch(() => { if (!cancelled) setLoad({ slug, error: true }); });
    return () => { cancelled = true; };
  }, [slug, attempt]);
  if (isBackend && !products.some(product => product.slug === slug)) {
    if (load.slug !== slug) return <main className="ov-page" role="status">Loading product…</main>;
    if (load.error) return <main className="ov-page" role="alert">We could not load this product. <button onClick={() => setAttempt(value => value + 1)}>Try again</button></main>;
  }
  return <ProductContent />;
}
function ProductContent() {
  const { slug } = useParams();
  useSite((state) => state.settings);
  const navigate = useNavigate();
  const product = productBySlug(slug);
  const [size, setSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [stickyVisible, setStickyVisible] = useState(false);
  const actionsRef = useRef(null);
  const chartRef = useRef(null);
  const addToCart = useStore((state) => state.addToCart);
  const buyNowProduct = useStore((state) => state.buyNowProduct);
  const announce = useStore((state) => state.announce);

  // Reset the choices only when the viewed product changes (product is a stable catalogue object per id).
  useEffect(() => { setSize(product && !needsSize(product) ? product.sizes[0] : ''); setQuantity(1); setError(''); }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const node = actionsRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => setStickyVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0), { threshold: 0 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [product?.id]);

  if (!product) return <NotFoundPage what="product" />;
  const isZip = product.category === 'Quarter-Zips';
  const related = getProducts().filter((item) => item.id !== product.id && item.category === product.category).slice(0, 4);
  const colourProducts = product.groupKey ? getProducts().filter((item) => item.groupKey === product.groupKey) : getProducts().filter((item) => item.category === 'Quarter-Zips');
  const soldOutEverywhere = product.soldOut || (!needsSize(product) && variantStatus(product, product.sizes[0]) === 'sold-out');
  const purchaseDisabled = soldOutEverywhere || product.pricePending;
  const options = { size, color: product.colors[0], quantity };

  const check = () => {
    const message = validateOptions(product, options);
    setError(message);
    if (message) { announce(message); document.getElementById('ov-size-group')?.focus(); }
    return !message;
  };
  const onAdd = () => { if (check()) addToCart(product, options); };
  const onBuyNow = () => { if (check() && buyNowProduct(product, options).ok) navigate('/checkout?mode=buy-now'); };

  return <main id="main-content" className={isZip ? 'ov-product-page ov-quarter-zip-page' : 'ov-product-page'}>
    <nav className="ov-crumbs" aria-label="Breadcrumb"><ol>{[...crumbsFor({ product }), { label: product.name }].map((crumb, index, trail) => <li key={`${crumb.label}-${index}`}>{crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : <span aria-current="page">{crumb.label}</span>}{index < trail.length - 1 && <span className="ov-crumb-sep" aria-hidden="true">/</span>}</li>)}</ol></nav>
    <div className="ov-product-layout">
      <Gallery product={product} />
      <div className="ov-product-copy">
        <div className="ov-product-title"><h1>{product.name}</h1><strong className="ov-price">{formatPrice(product.price)}</strong></div>
        <p className="ov-product-lede">{copyFor(product)[0]}</p>
        {isZip && <div className="ov-detail-group"><div className="ov-detail-heading"><strong>Colour</strong><span>{product.colors[0]}</span></div>
          <div className="ov-detail-colors" role="group" aria-label="Colour">{colourProducts.map((entry) => <button type="button" key={entry.id} aria-label={entry.colors[0]} aria-pressed={entry.id === product.id} className={entry.id === product.id ? 'is-selected' : ''} onClick={() => entry.id !== product.id && navigate(`/product/${entry.slug}`)}><i className={`ov-swatch ov-swatch-${entry.colors[0].toLowerCase()}`} style={entry.artColor ? { background: entry.artColor } : undefined} /></button>)}</div></div>}
        {needsSize(product) && <div className={`ov-detail-group ${error && !size ? 'has-error' : ''}`}>
          <div className="ov-detail-heading"><strong id="ov-size-label">Size</strong><span>{size || 'Select a size'}</span></div>
          <div className="ov-detail-sizes" id="ov-size-group" tabIndex={-1} role="group" aria-labelledby="ov-size-label" aria-describedby={error ? 'ov-option-error' : undefined}>
            {product.sizes.map((item) => { const soldOut = variantStatus(product, item) === 'sold-out'; return <button type="button" key={item} disabled={soldOut} className={size === item ? 'is-selected' : ''} aria-pressed={size === item} onClick={() => { setSize(item); setError(''); }}>{item}{soldOut && <span className="ov-sr-only"> (sold out)</span>}</button>; })}
          </div>
          {isZip ? <QuarterZipSizeChart key={product.id} chartRef={chartRef} /> : <p className="ov-detail-help"><Link to="/faq#sizing">Sizing information</Link></p>}
        </div>}
        {error && <p className="ov-form-error" id="ov-option-error" role="alert">{error}</p>}
        <div className="ov-qty-block"><span className="ov-qty-label" id="ov-qty-label">Quantity</span><QuantityControl value={quantity} label="Quantity" onChange={setQuantity} /></div>
        <div className="ov-purchase" ref={actionsRef}>
          <button type="button" className="ov-button ov-button-dark" onClick={onAdd} disabled={purchaseDisabled}>{product.pricePending ? 'Price coming soon' : soldOutEverywhere ? 'Sold out' : 'Add to cart'}</button>
          <button type="button" className="ov-button ov-button-light" onClick={onBuyNow} disabled={purchaseDisabled}>Buy now</button>
        </div>
        {!isBackend && <p className="ov-note">Demo store: prices are samples and orders are not open yet.</p>}
        {isBackend && !orderingOpen() && <p className="ov-note">Orders are not open yet.</p>}
        <Accordion openFirst items={[
          { title: 'Description', body: <>{copyFor(product).slice(1).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{isZip && product.ownerUpload && <ul className="ov-garment-details">
            <li><strong>Stand collar.</strong> Zip it up for a clean neckline or fold it open over a tee.</li>
            <li><strong>Ribbed edges.</strong> Narrow ribs frame the cuffs and hem.</li>
            <li><strong>How to wear it.</strong> Pair with dark denim for the weekend or pressed trousers for dinner.</li>
          </ul>}{product.listingStatus && <p>{product.listingStatus}</p>}</> },
          { title: 'Specifications', body: <dl className="ov-spec">
            <div><dt>Brand</dt><dd>{product.brand}</dd></div><div><dt>Category</dt><dd>{isZip ? 'Quarter zip' : 'Watch'}</dd></div><div><dt>Style</dt><dd>{product.style}</dd></div><div><dt>Colour</dt><dd>{product.colors[0]}</dd></div>
            {isZip && <div><dt>Sizes</dt><dd>{product.sizes.join(', ')}</dd></div>}
            <div><dt>Materials</dt><dd>Not published yet</dd></div></dl> },
        ]} />
      </div>
    </div>
    {isZip && <>
      <nav className="ov-garment-links" aria-label="Quarter-zip shopping information">
        <Link to="/refund-policy"><PackageCheck aria-hidden="true" /><span><strong>Returns &amp; exchanges</strong><small>Read the returns policy</small></span></Link>
        {needsSize(product) && <a href="#quarter-zip-size-chart" onClick={() => { if (chartRef.current) chartRef.current.open = true; }}><Ruler aria-hidden="true" /><span><strong>Size guidance</strong><small>View the size chart</small></span></a>}
      </nav>
      <div id="quarter-zip-banner" className="ov-garment-banner">
        <img src="/images/quarter-zip-campaign.jpg" alt="Blue quarter-zip layered over a shirt and patterned tie" width="1800" height="1100" loading="lazy" decoding="async" />
        <span>OLDVERGE</span>
      </div>
    </>}
    {related.length > 0 && <section className="ov-related" aria-labelledby="ov-related-title"><h2 id="ov-related-title">More like this</h2><div className="ov-product-grid">{related.map((item) => <ProductCard product={item} key={item.id} />)}</div></section>}
    <div className={`ov-sticky-buy ${stickyVisible ? 'is-visible' : ''}`} aria-hidden={!stickyVisible}>
      <div><strong>{product.name}</strong><span>{formatPrice(product.price)}</span></div>
      <button type="button" className="ov-button ov-button-dark" tabIndex={stickyVisible ? 0 : -1} onClick={onAdd} disabled={purchaseDisabled}>{product.pricePending ? 'Price coming soon' : soldOutEverywhere ? 'Sold out' : 'Add to cart'}</button>
    </div>
  </main>;
}
