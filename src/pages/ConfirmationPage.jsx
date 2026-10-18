import { Link } from 'react-router-dom';
import { SHIPPING_OPTIONS, formatPrice, shippingOption } from '../lib/money.js';
import { orderSummary, useStore } from '../store.js';
import { optionText } from '../components/CartDrawer.jsx';
import { DemoNotice, EmptyState } from '../components/ui.jsx';
import { imageSize } from '../data/imageSizes.js';

export function OrderBody({ order }) {
  const { lines, subtotal, shipping, tax, total } = orderSummary(order);
  const method = shippingOption(order.shippingId);
  return <div className="ov-order-body">
    <ul className="ov-summary-lines">{lines.map((line) => <li key={line.key}>
      <span className="ov-summary-thumb"><img src={line.product.image} alt="" {...imageSize(line.product.image)} /><i aria-hidden="true">{line.quantity}</i></span>
      <span className="ov-summary-name"><Link to={`/product/${line.product.slug}`}>{line.product.name}</Link><small>{optionText(line)} · Qty {line.quantity}</small></span><strong>{formatPrice(line.lineTotal)}</strong></li>)}</ul>
    <div className="ov-row"><span>Subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
    <div className="ov-row"><span>Delivery ({method.label})</span><strong>{shipping === 0 ? 'Free' : formatPrice(shipping)}</strong></div>
    <div className="ov-row"><span>Taxes</span><strong>{tax === 0 ? 'Not calculated' : formatPrice(tax)}</strong></div>
    <div className="ov-row ov-row-total"><span>Total</span><strong>{formatPrice(total)}</strong></div>
  </div>;
}

export default function ConfirmationPage() {
  const order = useStore((state) => state.lastOrder);
  if (!order) {
    return <main id="main-content" className="ov-page"><EmptyState title="No recent demo order to show." actions={<Link to="/shop" className="ov-button ov-button-dark">Continue shopping</Link>}>Order confirmations are not saved. If you refreshed this page, the details are gone.</EmptyState></main>;
  }
  const method = shippingOption(order.shippingId) || SHIPPING_OPTIONS[0];
  const to = order.shipTo;
  return <main id="main-content" className="ov-page ov-confirmation">
    <header className="ov-page-head"><p className="ov-eyebrow-dark">Demo order</p><h1>Thank you. Your demo order is placed.</h1><p className="ov-page-intro">Order number <strong>{order.id}</strong>. A confirmation would be sent to {order.email}, but this demo sends no email.</p></header>
    <DemoNotice>No payment was taken and no real order was created.</DemoNotice>
    <div className="ov-checkout-layout">
      <section aria-labelledby="oc-items"><h2 id="oc-items">Your items</h2><OrderBody order={order} /></section>
      <aside className="ov-summary" aria-label="Delivery details">
        <h2>Delivery</h2>
        <p><strong>{method.label}</strong><br />{method.estimate}</p>
        <h3>Ship to</h3>
        <address>{to.firstName} {to.lastName}<br />{to.line1}{to.line2 ? `, ${to.line2}` : ''}<br />{to.city}, {to.province} {to.postalCode}<br />Pakistan</address>
        <Link to="/shop" className="ov-button ov-button-dark">Continue shopping</Link>
        <Link to="/account/login" className="ov-text-link">Sign in to the demo account</Link>
      </aside>
    </div>
  </main>;
}
