// Request-local public content, matching the first interactive viewport.
import {formatPrice} from '../lib/money.js';
import {responsiveImageProps} from '../data/responsiveImages.js';
import {imageSize} from '../data/imageSizes.js';
import {copyFor} from '../data/productCopy.js';
import HeroCopy from '../components/HeroCopy.jsx';
import TiltedGridHero from '../components/TiltedGridHero.jsx';

function Icon({kind}) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">{kind==='search'?<><circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/></>:kind==='bag'?<><path d="M3 3h2l3 13h11l3-10H6M10 21h.01M18 21h.01"/></>:<path d="M3 6h18M3 12h13M3 18h18"/>}</svg>;
}
function Header() {
  return <><header className="site-header"><div className="nav-inner">
    <a className="icon-button mobile-menu" href="/shop" aria-label="Shop"><Icon/></a><a href="/" className="wordmark" aria-label="OldVerge home">OLD<span>VERGE</span><b>®</b></a>
    <nav className="desktop-nav" aria-label="Main navigation"><a className="nav-link" href="/shop/watches">Watches</a><a className="nav-link" href="/shop/quarter-zips">Clothes</a><a className="nav-link" href="/about">Our Story</a></nav>
    <div className="nav-actions"><a className="icon-button" href="/search" aria-label="Search"><Icon kind="search"/></a><a className="icon-button desktop-only" href="/account" aria-label="Your account"><Icon/></a><a className="icon-button" href="/cart" aria-label="View bag"><Icon kind="bag"/></a></div>
  </div></header><nav className="mobile-tabs" aria-label="Quick navigation">{[['/','Home'],['/shop','Shop'],['/search','Search'],['/cart','Cart']].map(([href,label])=><a href={href} key={href}><Icon kind={label==='Search'?'search':'bag'}/><span>{label}</span></a>)}</nav></>;
}
function Crumbs({items}) {
  return <nav className="ov-crumbs" aria-label="Breadcrumb"><ol>{items.map(([label,href],i)=><li key={i}>{href?<a href={href}>{label}</a>:<span aria-current="page">{label}</span>}{i<items.length-1&&<span className="ov-crumb-sep" aria-hidden="true">/</span>}</li>)}</ol></nav>;
}
function Photo({product,priority=false,className}) {
  const image=product.images?.[0]||{};
  return product.image?<img className={className} src={product.image} {...responsiveImageProps(product.image)} alt={product.name} width={image.width||imageSize(product.image).width} height={image.height||imageSize(product.image).height} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':undefined} decoding="async"/>:null;
}
function Cards({products}) {
  return <div className="ov-product-grid">{products.map((product,index)=><article className="ov-pc" key={product.slug}><a href={`/product/${product.slug}`} className="ov-pc-media" aria-label={product.name}><div className={`product-art is-photo ${product.type==='watch'?'is-watch':'is-clothing'}`}><Photo className="product-photo" product={product} priority={index<2}/></div></a><div className="ov-pc-info"><a href={`/product/${product.slug}`} className="ov-pc-name">{product.name}</a><strong>{formatPrice(product.price)}</strong></div></article>)}</div>;
}
function Product({product}) {
  const zip=product.category==='Quarter-Zips';
  return <main id="main-content" className={`ov-product-page ${zip?'ov-quarter-zip-page':''}`}>
    <Crumbs items={[["Home","/"],["Shop","/shop"],...(zip?[["Clothes","/shop/quarter-zips"]]:[]),[zip?'Quarter Zips':'Watches',zip?'/shop/quarter-zips':'/shop/watches'],[product.name,null]]}/>
    <div className="ov-product-layout"><div className="ov-gallery"><div className="ov-gallery-main ov-product-figure"><Photo product={product} priority/></div>{product.images?.length>1&&<ul className="ov-thumbs" aria-label="Product images">{product.images.map(image=><li key={image.src}><span className="ov-ssr-thumb"><img src={image.src} {...responsiveImageProps(image.src)} alt="" loading="lazy" decoding="async"/></span></li>)}</ul>}</div>
      <div className="ov-product-copy"><div className="ov-product-title"><h1>{product.name}</h1><div className="ov-price"><strong>{formatPrice(product.price)}</strong></div></div><p className="ov-product-description">{copyFor(product)[0]}</p>
        <div className="ov-detail-block"><div className="ov-detail-heading"><strong>Colour</strong><span>{product.colors[0]}</span></div><div className="ov-detail-colors"><span className="ov-ssr-swatch" style={{background:product.artColor||'#292923'}}/></div></div>
        <div className="ov-detail-block"><div className="ov-detail-heading"><strong>Size</strong><span>Select a size</span></div><div className="ov-detail-sizes">{product.sizes.map(size=><button type="button" key={size} disabled>{size}</button>)}</div></div><p>Enable JavaScript to select options and use your bag.</p>
      </div></div></main>;
}
export function PublicMain({snapshot}) {
  const {title,description,kind,products=[],sections=[],total=products.length}=snapshot;
  const home=snapshot.path==='/'&&!snapshot.error;
  const browse=snapshot.path?.startsWith('/shop')||snapshot.path==='/search';
  return kind==='product'&&products[0]?<Product product={products[0]}/>:home?<main id="main-content" className="ov-home"><section className="ov-hero2 is-entered" aria-labelledby="ov-hero-title"><HeroCopy/>{snapshot.heroImages?.length>0&&<TiltedGridHero className="ov-hero2-ribbon" images={snapshot.heroImages} aspectRatio={4/5} tileHeight={65} axis={50} curve={56} gap={6} fade={13} speed={5}/>}</section><section className="ov-fp"><div className="ov-fp-head"><h2>Featured Section</h2></div><div className="ov-page"><Cards products={products}/></div></section></main>:
      <main id="main-content" className={browse?'ov-shop ov-collection':'ov-page'}>
        {browse&&snapshot.path!=='/search'&&<Crumbs items={[["Home","/"],["Shop",snapshot.path==='/shop'?null:'/shop'],...(snapshot.path!=='/shop'?[[title,null]]:[])]}/>}
        <div className="ov-collection-head"><h1>{title}</h1></div>
        {browse?<><div className="ov-collection-bar"><nav className="ov-switch" aria-label="Collection">{[['/shop','All'],['/shop/watches','Watches'],['/shop/quarter-zips','Clothes']].map(([href,label])=><a key={href} href={href} className={snapshot.path===href?'is-active':''}>{label}</a>)}</nav><div className="ov-collection-tools"><span className="ov-collection-count" role="status">{total} {total===1?'piece':'pieces'}</span><button className="ov-filter-button" disabled>Filter</button></div></div><section className="ov-shop-products" aria-label={title}><Cards products={products}/></section></>:description&&<p>{description}</p>}
        {snapshot.previous&&<a href={snapshot.previous}>Previous</a>} {snapshot.next&&<a href={snapshot.next}>Next</a>}
        {sections.map((section,index)=><section key={index}><h2>{section.heading}</h2>{section.body.map((text,i)=><p key={i}>{text}</p>)}</section>)}{snapshot.error&&<p role="alert">Please try again later.</p>}
      </main>;
}
export default function PublicPage({snapshot}) {
  return <div className="app-shell" data-ssr="public"><Header/><PublicMain snapshot={snapshot}/>
    <footer className="site-footer ov-footer"><div className="footer-grid"><a className="wordmark" href="/">OLD<span>VERGE</span><b>®</b></a><nav><h3>Shop</h3><a href="/shop">All products</a><a href="/shop/watches">Watches</a><a href="/shop/quarter-zips">Clothes</a></nav><nav><h3>Help</h3><a href="/shipping">Shipping</a><a href="/refund-policy">Returns</a><a href="/privacy-policy">Privacy</a><a href="/terms-and-conditions">Terms</a></nav></div></footer>
  </div>;
}
