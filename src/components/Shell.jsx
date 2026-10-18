import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AlignLeft, ChevronDown, CircleUserRound, Instagram, Search, ShoppingBag, ShoppingCart, Store, X } from 'lucide-react';
import { siteInfo } from '../data/siteInfo.js';
import { EMAIL_PATTERN } from './ui.jsx';
import { formatPrice } from '../lib/money.js';
import { NAV_GROUPS } from '../data/collections.js';
import { POLICIES, policyPath } from '../data/policies.js';
import ProductArt from './ProductArt.jsx';
import CartDrawer from './CartDrawer.jsx';
import SearchPanel from './SearchPanel.jsx';
import { cartCount, useStore } from '../store.js';
import { useScrollLock } from '../lib/scrollLock.js';
import { useDialogFocus } from '../lib/useDialogFocus.js';
import Reveal from './Reveal.jsx';

export function ProductCard({ product }) {
  // Image, then name and price on one line. Nothing sits on top of the photograph.
  return (
    <article className="ov-pc">
      <Link to={`/product/${product.slug}`} className="ov-pc-media" aria-label={product.name} tabIndex={-1}><ProductArt product={product} /></Link>
      <div className="ov-pc-info"><Link to={`/product/${product.slug}`} className="ov-pc-name">{product.name}</Link><strong>{formatPrice(product.price)}</strong></div>
    </article>
  );
}

// Desktop dropdown: the label is a real link to the main collection; a separate
// button (aria-expanded) opens the list. Mouse hover opens it too; keyboard users
// press the button. Escape closes it and returns focus to the button.
function NavDropdown({ group }) {
  const [open, setOpen] = useState(false);
  const itemRef = useRef(null);
  const buttonRef = useRef(null);
  const location = useLocation();
  const panelId = `ov-nav-${group.id}`;
  useEffect(() => { setOpen(false); }, [location.pathname, location.search]);
  return <div
    ref={itemRef}
    className={`ov-nav-item ${open ? 'is-open' : ''}`}
    onPointerEnter={(event) => { if (event.pointerType === 'mouse') setOpen(true); }}
    onPointerLeave={(event) => { if (event.pointerType === 'mouse') setOpen(false); }}
    onBlur={(event) => { if (!itemRef.current?.contains(event.relatedTarget)) setOpen(false); }}
    onKeyDown={(event) => { if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false); buttonRef.current?.focus(); } }}
  >
    <NavLink to={group.to} className="nav-link">{group.label}</NavLink>
    <button ref={buttonRef} type="button" className="ov-nav-toggle" aria-expanded={open} aria-controls={panelId} aria-label={`${group.label} menu`} onClick={() => setOpen((value) => !value)}><ChevronDown size={12} aria-hidden="true" /></button>
    <ul id={panelId} className="ov-nav-panel" aria-label={group.label}>
      {group.links.map((link) => <li key={link.to}><Link to={link.to}>{link.label}</Link></li>)}
    </ul>
  </div>;
}

export function Header() {
  const [menu, setMenu] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileGroups, setMobileGroups] = useState({});
  const menuButtonRef = useRef(null);
  const location = useLocation();
  useScrollLock(menu, 'header-menu');
  useDialogFocus(menu, () => setMenu(false));
  const cart = useStore((state) => state.cart);
  const openCart = useStore((state) => state.openCart);
  const customer = useStore((state) => state.customer);
  const count = cartCount(cart);
  const [bagWobble, setBagWobble] = useState(false);
  const previousCount = useRef(count);
  useEffect(() => {
    const listener = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', listener, { passive: true });
    return () => window.removeEventListener('scroll', listener);
  }, []);
  useEffect(() => {
    if (count > previousCount.current) {
      setBagWobble(true);
      const timeout = window.setTimeout(() => setBagWobble(false), 520);
      previousCount.current = count;
      return () => window.clearTimeout(timeout);
    }
    previousCount.current = count;
    return undefined;
  }, [count]);
  useEffect(() => { setMenu(false); }, [location.pathname, location.search]);
  useEffect(() => {
    if (!menu) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') { setMenu(false); menuButtonRef.current?.focus(); } };
    const wide = window.matchMedia('(min-width: 1025px)');
    const onWide = () => { if (wide.matches) setMenu(false); };
    document.addEventListener('keydown', onKeyDown);
    wide.addEventListener('change', onWide);
    return () => { document.removeEventListener('keydown', onKeyDown); wide.removeEventListener('change', onWide); };
  }, [menu]);
  const closeMenu = () => { setMenu(false); menuButtonRef.current?.focus(); };

  return <>
    <a className="ov-skip-link" href="#main-content">Skip to content</a>
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="nav-inner">
        <button ref={menuButtonRef} className="icon-button mobile-menu" aria-label="Open menu" aria-expanded={menu} aria-controls="ov-mobile-menu" onClick={() => setMenu(true)}><AlignLeft aria-hidden="true" /></button>
        <Link to="/" className="wordmark" aria-label="OldVerge home">OLD<span>VERGE</span><b>®</b></Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {NAV_GROUPS.map((group) => <NavDropdown key={group.id} group={group} />)}
          <NavLink to="/about" className="nav-link">Our Story</NavLink>
        </nav>
        <div className="nav-actions">
          <button type="button" className="icon-button" aria-label="Search" aria-haspopup="dialog" onClick={() => setSearchOpen(true)}><Search aria-hidden="true" /></button>
          <Link to={customer ? '/account' : '/account/login'} className="icon-button desktop-only" aria-label={customer ? 'Your account' : 'Sign in'}><CircleUserRound aria-hidden="true" /></Link>
          <button type="button" className={`icon-button bag-action ${bagWobble ? 'is-wobbling' : ''}`} aria-label={`Open cart, ${count} ${count === 1 ? 'item' : 'items'}`} aria-haspopup="dialog" onClick={openCart}><ShoppingCart aria-hidden="true" />{count > 0 && <span className="icon-count" aria-hidden="true">{count}</span>}</button>
        </div>
      </div>
    </header>
    {menu && createPortal(<div className="ov-mm">
      <button type="button" className="ov-mm-backdrop" aria-label="Close menu" tabIndex={-1} onClick={closeMenu} />
      <aside id="ov-mobile-menu" className="ov-mm-panel" data-lenis-prevent role="dialog" aria-modal="true" aria-label="Menu">
        <div className="ov-mm-head"><Link to="/" className="wordmark" onClick={() => setMenu(false)}>OLD<span>VERGE</span><b>®</b></Link><button type="button" className="ov-mm-close" aria-label="Close menu" onClick={closeMenu}><X size={22} /></button></div>
        <nav className="ov-mm-nav" aria-label="Menu">
          {NAV_GROUPS.map((group) => { const expanded = Boolean(mobileGroups[group.id]); return <div className="ov-mm-group" key={group.id}>
            <div className="ov-mm-row"><Link to={group.to} onClick={() => setMenu(false)}>{group.label}</Link><button type="button" aria-expanded={expanded} aria-controls={`ov-mnav-${group.id}`} aria-label={`${group.label} links`} onClick={() => setMobileGroups((current) => ({ ...current, [group.id]: !current[group.id] }))}><ChevronDown size={20} aria-hidden="true" /></button></div>
            {expanded && <ul id={`ov-mnav-${group.id}`}>{group.links.map((link) => <li key={link.to}><Link to={link.to} onClick={() => setMenu(false)}>{link.label}</Link></li>)}</ul>}
          </div>; })}
          {[['/about', 'Our story'], ['/faq', 'FAQ'], ['/search', 'Search'], [customer ? '/account' : '/account/login', customer ? 'Your account' : 'Sign in']].map(([to, label]) => <div className="ov-mm-group" key={to}><div className="ov-mm-row"><Link to={to} onClick={() => setMenu(false)}>{label}</Link></div></div>)}
        </nav>
        <p className="ov-mm-note">Displayed prices are samples. Orders are not open yet.</p>
      </aside>
    </div>, document.body)}
    <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} />
    <CartDrawer />
    <nav className="mobile-tabs" aria-label="Quick navigation">
      <NavLink to="/" end><Store aria-hidden="true" /><span>Home</span></NavLink>
      <NavLink to="/shop"><ShoppingBag aria-hidden="true" /><span>Shop</span></NavLink>
      <button type="button" onClick={() => setSearchOpen(true)}><Search aria-hidden="true" /><span>Search</span></button>
      <button type="button" onClick={openCart}><ShoppingBag aria-hidden="true" /><span>{`Cart${count > 0 ? ` (${count})` : ''}`}</span></button>
    </nav>
  </>;
}

// Footer sign-up: validates locally, shows a simulated result. No mailing list exists and nothing is saved.
function FooterNewsletter() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const submit = (event) => {
    event.preventDefault();
    if (!email.trim()) { setError('Enter your email address.'); return; }
    if (!EMAIL_PATTERN.test(email.trim())) { setError('Enter a valid email address, like name@example.com.'); return; }
    setError('');
    setDone(true);
  };
  return <div className="ov-footer-news">
    <h3>Subscribe to our newsletter</h3>
    {done ? <p className="ov-footer-news-done" role="status">Demo only: nothing was saved and no email will be sent.</p>
      : <form onSubmit={submit} noValidate>
        <label className="ov-sr-only" htmlFor="ov-footer-email">Email address</label>
        <input id="ov-footer-email" type="email" autoComplete="email" placeholder="Email" value={email} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? 'ov-footer-email-error' : undefined} onChange={(event) => { setEmail(event.target.value); setError(''); }} />
        {error && <p className="ov-footer-news-error" id="ov-footer-email-error">{error}</p>}
        <button type="submit">Subscribe</button>
      </form>}
    <p className="ov-footer-news-note">Hear when ordering opens. This form is a demo and is not connected to a mailing list.</p>
  </div>;
}

export function Footer() {
  const { instagram } = siteInfo.contact;
  return <footer className="site-footer ov-footer">
    <Reveal className="footer-top">
      <div className="ov-footer-cols">
        <div className="ov-footer-col"><Link to="/" className="wordmark" aria-label="OldVerge home">OLD<span>VERGE</span><b>®</b></Link></div>
        <nav className="ov-footer-col" aria-label="Shop and help"><h3>Shop</h3><Link to="/shop">All products</Link><Link to="/shop/watches">Watches</Link><Link to="/shop/quarter-zips">Clothes</Link><Link to="/search">Search</Link></nav>
        <nav className="ov-footer-col" aria-label="Help"><h3>Help</h3><Link to="/faq">FAQ</Link><Link to="/pages/shipping">Shipping &amp; delivery</Link><Link to="/pages/returns">Returns &amp; exchanges</Link><Link to="/pages/track-order">Track an order</Link><Link to="/contact">Contact</Link></nav>
        <nav className="ov-footer-col" aria-label="Useful links"><h3>Useful Links</h3><Link to="/about">Our story</Link>{POLICIES.map((policy) => <Link key={policy.slug} to={policyPath(policy)}>{policy.title}</Link>)}
          {instagram && <><h3 className="ov-footer-sub">Social Media</h3><a href={instagram} target="_blank" rel="noreferrer" aria-label="OLDVERGE on Instagram" className="ov-footer-social"><Instagram size={20} aria-hidden="true" /></a></>}
        </nav>
      </div>
      <FooterNewsletter />
    </Reveal>
    <Reveal className="ov-footer-end" delay={0.1}>
      <p className="ov-footer-disclosure">Displayed prices are samples. Orders are not open yet.</p>
      <p className="ov-footer-copy">© OLDVERGE 2026 · Pakistan</p>
    </Reveal>
  </footer>;
}
