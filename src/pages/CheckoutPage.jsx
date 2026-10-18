import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { SHIPPING_OPTIONS, computeTotals, formatPrice, shippingCost } from '../lib/money.js';
import { resolveLines, useStore } from '../store.js';
import { optionText } from '../components/CartDrawer.jsx';
import { EMAIL_PATTERN, EmptyState, Field } from '../components/ui.jsx';
import { imageSize } from '../data/imageSizes.js';

export const PROVINCES = ['Punjab', 'Sindh', 'Khyber Pakhtunkhwa', 'Balochistan', 'Islamabad Capital Territory', 'Gilgit-Baltistan', 'Azad Jammu and Kashmir'];
const BLANK_ADDRESS = { firstName: '', lastName: '', line1: '', line2: '', city: '', province: '', postalCode: '' };

function validateAddress(values, prefix, errors) {
  const need = (key, message) => { if (!String(values[key] || '').trim()) errors[`${prefix}${key}`] = message; };
  need('firstName', 'Enter a first name.');
  need('lastName', 'Enter a last name.');
  need('line1', 'Enter the street address.');
  need('city', 'Enter the city.');
  need('province', 'Choose a province or territory.');
  if (!String(values.postalCode || '').trim()) errors[`${prefix}postalCode`] = 'Enter the postal code.';
  else if (!/^\d{5}$/.test(values.postalCode.trim())) errors[`${prefix}postalCode`] = 'Postal codes in Pakistan have 5 digits, for example 54000.';
}

function AddressFields({ prefix, values, errors, onChange, autocompleteSection }) {
  const field = (key, label, props = {}) => <Field key={key} label={label} name={`${prefix}${key}`} value={values[key]} error={errors[`${prefix}${key}`]} onChange={(event) => onChange(key, event.target.value)} autoComplete={`${autocompleteSection} ${props.ac}`} {...props.input} />;
  return <>
    <div className="ov-field-row">{field('firstName', 'First name', { ac: 'given-name' })}{field('lastName', 'Last name', { ac: 'family-name' })}</div>
    {field('line1', 'Address', { ac: 'address-line1' })}
    {field('line2', 'Apartment, suite or floor (optional)', { ac: 'address-line2' })}
    <div className="ov-field-row">{field('city', 'City', { ac: 'address-level2' })}
      <Field label="Province or territory" as="select" name={`${prefix}province`} value={values.province} error={errors[`${prefix}province`]} onChange={(event) => onChange('province', event.target.value)} autoComplete={`${autocompleteSection} address-level1`}><option value="">Select</option>{PROVINCES.map((province) => <option key={province} value={province}>{province}</option>)}</Field>
    </div>
    {field('postalCode', 'Postal code', { ac: 'postal-code', input: { inputMode: 'numeric', maxLength: 5 } })}
  </>;
}

export default function CheckoutPage() {
  const [params] = useSearchParams();
  const buyNow = params.get('mode') === 'buy-now';
  const navigate = useNavigate();
  const cart = useStore((state) => state.cart);
  const directItem = useStore((state) => state.directItem);
  const completeOrder = useStore((state) => state.completeOrder);
  const customer = useStore((state) => state.customer);
  const lines = useMemo(() => resolveLines(buyNow ? (directItem ? [directItem] : []) : cart), [buyNow, directItem, cart]);
  const [contact, setContact] = useState({ email: customer?.email || '', phone: customer?.phone || '' });
  const [shipTo, setShipTo] = useState(BLANK_ADDRESS);
  const [billTo, setBillTo] = useState(BLANK_ADDRESS);
  const [sameBilling, setSameBilling] = useState(true);
  const [shippingId, setShippingId] = useState('standard');
  const [errors, setErrors] = useState({});
  const summaryRef = useRef(null);
  const totals = computeTotals(lines, shippingId);

  if (!lines.length) {
    return <main id="main-content" className="ov-page ov-checkout">
      <EmptyState title={buyNow ? 'Your Buy now item is no longer available.' : 'Nothing to check out yet.'} actions={<><Link to="/shop" className="ov-button ov-button-dark">Back to shopping</Link>{!buyNow && <Link to="/cart" className="ov-button ov-button-light">View cart</Link>}</>}>
        {buyNow ? 'Choose the product again and use Buy now.' : 'Your cart is empty. Add something first, then come back to check out.'}
      </EmptyState>
    </main>;
  }

  const submit = (event) => {
    event.preventDefault();
    const found = {};
    if (!contact.email.trim()) found.email = 'Enter your email address.';
    else if (!EMAIL_PATTERN.test(contact.email.trim())) found.email = 'Enter a valid email address, like name@example.com.';
    if (!contact.phone.trim()) found.phone = 'Enter a phone number for the courier.';
    else if (!/^[+\d][\d\s-]{8,16}$/.test(contact.phone.trim())) found.phone = 'Enter a valid phone number, for example 0300 0000000.';
    validateAddress(shipTo, 'ship_', found);
    if (!sameBilling) validateAddress(billTo, 'bill_', found);
    setErrors(found);
    const keys = Object.keys(found);
    if (keys.length) {
      window.setTimeout(() => (document.querySelector(`[name="${keys[0].replace('ship_', 'ship_').replace(/^(email|phone)$/, '$1')}"]`) || summaryRef.current)?.focus(), 0);
      return;
    }
    const order = {
      id: `OV-DEMO-${String(Date.now()).slice(-6)}`,
      placedAt: new Date().toISOString(),
      status: 'Demo order (no payment taken)',
      shippingId,
      items: lines.map(({ product, size, color, quantity }) => ({ productId: product.id, size, color, quantity })),
      email: contact.email.trim(),
      phone: contact.phone.trim(),
      shipTo: { ...shipTo },
      billTo: sameBilling ? { ...shipTo } : { ...billTo },
      sample: false,
    };
    completeOrder(order, buyNow ? 'direct' : 'cart');
    navigate('/order-confirmation');
  };
  const errorList = Object.entries(errors);

  return <main id="main-content" className="ov-page ov-checkout">
    <header className="ov-page-head"><h1>Checkout</h1><p className="ov-page-intro">{buyNow ? 'You are buying one item with Buy now. Your cart is untouched.' : 'Review your cart and enter your details.'} This is a demo: no payment is taken and no order is created.</p></header>
    <div className="ov-checkout-layout">
      <form onSubmit={submit} noValidate className="ov-checkout-form">
        {errorList.length > 0 && <div className="ov-error-summary" role="alert" tabIndex={-1} ref={summaryRef}><h2>Please fix {errorList.length === 1 ? 'one thing' : `${errorList.length} things`} to continue</h2><ul>{errorList.map(([key, message]) => <li key={key}>{message}</li>)}</ul></div>}
        <section aria-labelledby="co-contact"><h2 id="co-contact">Contact</h2>
          <Field label="Email" name="email" type="email" autoComplete="email" value={contact.email} error={errors.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} />
          <Field label="Phone" name="phone" type="tel" autoComplete="tel" value={contact.phone} error={errors.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} />
        </section>
        <section aria-labelledby="co-ship"><h2 id="co-ship">Shipping address</h2>
          <p className="ov-field-hint">Country: Pakistan</p>
          <AddressFields prefix="ship_" autocompleteSection="shipping" values={shipTo} errors={errors} onChange={(key, value) => setShipTo({ ...shipTo, [key]: value })} />
        </section>
        <fieldset className="ov-radio-group"><legend>Delivery method</legend>
          {SHIPPING_OPTIONS.map((option) => { const price = shippingCost(option.id, totals.subtotal); return <label key={option.id} className={`ov-radio ${shippingId === option.id ? 'is-checked' : ''}`}>
            <input type="radio" name="shipping" value={option.id} checked={shippingId === option.id} onChange={() => setShippingId(option.id)} />
            <span><strong>{option.label}</strong><small>{option.estimate}</small></span><b>{price === 0 ? 'Free' : formatPrice(price)}</b></label>; })}
        </fieldset>
        <fieldset className="ov-radio-group"><legend>Payment</legend>
          <label className="ov-radio is-checked"><input type="radio" name="payment" checked readOnly /><span><strong>Demo payment</strong><small>No card details are collected and nothing is charged.</small></span><b>PKR 0</b></label>
        </fieldset>
        <section aria-labelledby="co-bill"><h2 id="co-bill">Billing address</h2>
          <label className="ov-check"><input type="checkbox" checked={sameBilling} onChange={(event) => setSameBilling(event.target.checked)} /> Same as shipping address</label>
          {!sameBilling && <AddressFields prefix="bill_" autocompleteSection="billing" values={billTo} errors={errors} onChange={(key, value) => setBillTo({ ...billTo, [key]: value })} />}
        </section>
        <button type="submit" className="ov-button ov-button-dark ov-place-order">Place demo order</button>
        <p className="ov-note">Details you enter here are used on the confirmation screen only. They are not stored or sent anywhere.</p>
      </form>
      <aside className="ov-summary" aria-label="Order summary">
        <h2>{buyNow ? 'Buying now' : 'Your cart'}</h2>
        <ul className="ov-summary-lines">{lines.map((line) => <li key={line.key}>
          <span className="ov-summary-thumb"><img src={line.product.image} alt="" {...imageSize(line.product.image)} /><i aria-hidden="true">{line.quantity}</i></span>
          <span className="ov-summary-name">{line.product.name}<small>{optionText(line)} · Qty {line.quantity}</small></span><strong>{formatPrice(line.lineTotal)}</strong></li>)}</ul>
        <div className="ov-row"><span>Subtotal</span><strong>{formatPrice(totals.subtotal)}</strong></div>
        <div className="ov-row"><span>Delivery</span><strong>{totals.shipping === 0 ? 'Free' : formatPrice(totals.shipping)}</strong></div>
        <div className="ov-row"><span>Taxes</span><strong>Not calculated</strong></div>
        <div className="ov-row ov-row-total"><span>Total</span><strong>{formatPrice(totals.total)}</strong></div>
        {!buyNow && <Link to="/cart" className="ov-text-link">Edit cart</Link>}
      </aside>
    </div>
  </main>;
}
