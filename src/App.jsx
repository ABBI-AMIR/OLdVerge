import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { Footer, Header } from './components/Shell.jsx';
import BrandLoader from './components/BrandLoader.jsx';
import { HERO_IMAGES } from './components/HomeHero.jsx';
import { HomePage, ShopPage } from './pages.jsx';
import ProductPage from './pages/ProductPage.jsx';
import CartPage from './pages/CartPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import ConfirmationPage from './pages/ConfirmationPage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import { AddressesPage, DashboardPage, ForgotPasswordPage, LoginPage, OrderDetailPage, OrdersPage, ProfilePage, RegisterPage } from './pages/account.jsx';
import { ReturnsPage, ShippingPage, TrackOrderPage } from './pages/support.jsx';
import AboutPage from './pages/AboutPage.jsx';
import FaqPage from './pages/FaqPage.jsx';
import ContactPage from './pages/ContactPage.jsx';
import PolicyPage from './components/PolicyPage.jsx';
import { POLICIES, policyPath } from './data/policies.js';
import { PAGE_META } from './data/siteInfo.js';
import { useStore } from './store.js';
import SmoothScroll from './components/SmoothScroll.jsx';
import { productBySlug } from './data/products.js';
import { shopTitle } from './data/collections.js';

const TITLES = {
  '/cart': ['Cart', 'Review the items in your cart.'],
  '/checkout': ['Checkout', 'Demo checkout. No payment is taken.'],
  '/order-confirmation': ['Order confirmation', 'Your demo order summary.'],
  '/search': ['Search', 'Search OLDVERGE watches and quarter zips.'],
  '/account': ['Your account', 'Demo account dashboard.'],
  '/account/login': ['Sign in', 'Sign in to the OLDVERGE demo account.'],
  '/account/register': ['Create account', 'Create an OLDVERGE demo account.'],
  '/account/forgot-password': ['Reset password', 'Demo password reset.'],
  '/account/orders': ['Order history', 'Sample order history.'],
  '/account/addresses': ['Address book', 'Manage demo addresses.'],
  '/account/profile': ['Profile', 'Edit your demo profile.'],
  '/pages/shipping': ['Shipping & delivery', 'Sample delivery options for the OLDVERGE demo.'],
  '/pages/returns': ['Returns & exchanges', 'Returns and exchanges at OLDVERGE.'],
  '/pages/track-order': ['Track an order', 'See a sample order tracking result.'],
};

function Redirect({ to }) { return <Navigate to={to} replace />; }
function CollectionRedirect() { const { handle } = useParams(); return <Navigate to={handle === 'all' ? '/shop' : `/shop/${handle}`} replace />; }
function ProductRedirect() { const { handle } = useParams(); return <Navigate to={`/product/${handle}`} replace />; }

function RouteContent() {
  const location = useLocation();
  useEffect(() => {
    const path = location.pathname.replace(/\/$/, '') || '/';
    const policy = POLICIES.find((item) => policyPath(item) === path);
    const product = path.startsWith('/product/') ? productBySlug(path.split('/').pop()) : null;
    const info = TITLES[path] || PAGE_META[path];
    const title = product ? `${product.name} | OLDVERGE`
      : path.startsWith('/shop') ? shopTitle(path, location.search)
        : path.startsWith('/account/orders/') ? 'Order details | OLDVERGE'
          : info ? `${info[0]} | OLDVERGE`
            : policy ? `${policy.title} | OLDVERGE`
              : path === '/' ? 'OLDVERGE — Good taste. No noise.' : 'Page not found | OLDVERGE';
    document.title = title;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = product ? `${product.name}. ${product.description} OLDVERGE, Pakistan.` : info?.[1] || policy?.description || 'Quarter zips and watches for everyday wear. OLDVERGE, Pakistan.';
  }, [location.pathname, location.search]);
  // Keyed by path only: changing filters or sort (query string) updates the same page in place.
  return <div key={location.pathname} className="ov-page-enter"><Routes location={location}>
    <Route path="/" element={<HomePage />} />
    <Route path="/shop" element={<ShopPage />} /><Route path="/shop/:category" element={<ShopPage />} />
    <Route path="/collections" element={<Redirect to="/shop" />} /><Route path="/collections/:handle" element={<CollectionRedirect />} />
    <Route path="/product/:slug" element={<ProductPage />} /><Route path="/products/:handle" element={<ProductRedirect />} />
    <Route path="/cart" element={<CartPage />} /><Route path="/checkout" element={<CheckoutPage />} /><Route path="/order-confirmation" element={<ConfirmationPage />} />
    <Route path="/search" element={<SearchPage />} />
    <Route path="/account" element={<DashboardPage />} /><Route path="/account/login" element={<LoginPage />} /><Route path="/account/register" element={<RegisterPage />} />
    <Route path="/account/forgot-password" element={<ForgotPasswordPage />} /><Route path="/account/orders" element={<OrdersPage />} /><Route path="/account/orders/:id" element={<OrderDetailPage />} />
    <Route path="/account/addresses" element={<AddressesPage />} /><Route path="/account/profile" element={<ProfilePage />} />
    <Route path="/about" element={<AboutPage />} /><Route path="/faq" element={<FaqPage />} /><Route path="/contact" element={<ContactPage />} />
    <Route path="/pages/about" element={<Redirect to="/about" />} /><Route path="/pages/faq" element={<Redirect to="/faq" />} /><Route path="/pages/contact" element={<Redirect to="/contact" />} />
    <Route path="/pages/shipping" element={<ShippingPage />} /><Route path="/pages/returns" element={<ReturnsPage />} /><Route path="/pages/track-order" element={<TrackOrderPage />} />
    {POLICIES.map((policy) => <Route key={policy.slug} path={policyPath(policy)} element={<PolicyPage policy={policy} />} />)}
    {POLICIES.flatMap((policy) => (policy.aliases || []).map((alias) => <Route key={alias} path={alias} element={<Navigate to={policyPath(policy)} replace />} />))}
    <Route path="/policies/privacy-policy" element={<Redirect to="/privacy-policy" />} /><Route path="/policies/terms-of-service" element={<Redirect to="/terms-and-conditions" />} /><Route path="/policies/refund-policy" element={<Redirect to="/refund-policy" />} />
    <Route path="/wishlist" element={<Redirect to="/shop" />} /><Route path="/size-guide" element={<Redirect to="/faq#sizing" />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes></div>;
}

export default function App() {
  const announcement = useStore((state) => state.announcement);
  const cartOpen = useStore((state) => state.cartOpen);
  useEffect(() => {
    // The site always renders in its light theme.
    document.documentElement.dataset.theme = 'light';
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = '#F4F0E7';
  }, []);
  return <div className="app-shell"><SmoothScroll /><Header /><RouteContent /><Footer /><BrandLoader readyImages={HERO_IMAGES.slice(0, 6).map((image) => image.src)} />
    <div className="ov-sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
    {announcement && !cartOpen && <div className="toast-message" aria-hidden="true">{announcement}</div>}
  </div>;
}
