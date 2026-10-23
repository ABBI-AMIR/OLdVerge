// Shared by server rendering and the first client render. No browser state or global stores.
import {formatPrice} from '../lib/money.js';
export default function PublicPage({ snapshot }) {
  const { title, description, kind, products = [], sections = [], total = products.length } = snapshot;
  return <div className="app-shell" data-ssr="public"><header><nav className="ov-crumbs" aria-label="Main navigation"><a href="/">OLDVERGE</a><a href="/shop">Shop</a><a href="/shop/watches">Watches</a><a href="/shop/quarter-zips">Clothes</a><a href="/about">Our story</a></nav></header>
    <main id="main-content" className={kind === 'product' ? 'ov-product-page' : 'ov-page'}><h1>{title}</h1>{description && <p>{description}</p>}
      {kind === 'product' && products[0] && <article className="ov-product-layout">{products[0].image && <img src={products[0].image} alt={products[0].name} width={products[0].images?.[0]?.width} height={products[0].images?.[0]?.height} fetchPriority="high" />}
        <div><strong>{formatPrice(products[0].price)}</strong><p>{products[0].description}</p><p>Sizes: {products[0].sizes.join(', ')}. Colours: {products[0].colors.join(', ')}.</p><p>Enable JavaScript to select options and use your bag.</p></div></article>}
      {kind !== 'product' && products.length > 0 && <><p>{total} pieces</p><div className="ov-product-grid">{products.map(product => <article className="ov-pc" key={product.slug}><a href={`/product/${product.slug}`}>{product.image && <img src={product.image} alt={product.name} width={product.images?.[0]?.width} height={product.images?.[0]?.height} loading="lazy" />}<h2>{product.name}</h2><p>{formatPrice(product.price)}</p></a></article>)}</div></>}
      {snapshot.previous && <a href={snapshot.previous}>Previous</a>} {snapshot.next && <a href={snapshot.next}>Next</a>}
      {sections.map((section,index) => <section key={index}><h2>{section.heading}</h2>{section.body.map((text,i) => <p key={i}>{text}</p>)}</section>)}
      {snapshot.error && <p role="alert">Please try again later.</p>}
    </main><footer className="ov-page"><a href="/shipping">Shipping</a> · <a href="/refund-policy">Returns</a> · <a href="/privacy-policy">Privacy</a> · <a href="/terms-and-conditions">Terms</a></footer>
  </div>;
}
