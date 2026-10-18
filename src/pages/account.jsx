import { useState } from 'react';
import { Link, NavLink, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { allOrders, orderSummary, useStore } from '../store.js';
import { formatPrice } from '../lib/money.js';
import { SAMPLE_CUSTOMER } from '../data/sampleCustomer.js';
import { DemoNotice, EMAIL_PATTERN, EmptyState, Field, PageHead, PasswordField } from '../components/ui.jsx';
import { OrderBody } from './ConfirmationPage.jsx';
import { PROVINCES } from './CheckoutPage.jsx';

const dateText = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const AUTH_NOTE = 'This is a demo account. Your name, email and phone are kept in this browser tab only and are never sent anywhere. No real account is created.';

function useForm(initial) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const bind = (name) => ({ name, value: values[name], error: errors[name], onChange: (event) => { setValues((current) => ({ ...current, [name]: event.target.value })); if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined })); } });
  const fail = (found) => { setErrors(found); const first = Object.keys(found)[0]; if (first) window.setTimeout(() => document.querySelector(`[name="${first}"]`)?.focus(), 0); return Object.keys(found).length > 0; };
  return { values, setValues, errors, bind, fail };
}

export function LoginPage() {
  const signIn = useStore((state) => state.signIn);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const form = useForm({ email: '', password: '' });
  const submit = (event) => {
    event.preventDefault();
    const found = {};
    if (!form.values.email.trim()) found.email = 'Enter your email address.'; else if (!EMAIL_PATTERN.test(form.values.email.trim())) found.email = 'Enter a valid email address.';
    if (!form.values.password) found.password = 'Enter your password.';
    if (form.fail(found)) return;
    signIn({ name: SAMPLE_CUSTOMER.name, email: form.values.email.trim(), phone: SAMPLE_CUSTOMER.phone });
    navigate(params.get('next') && params.get('next').startsWith('/account') ? params.get('next') : '/account');
  };
  return <main id="main-content" className="ov-page ov-auth">
    <PageHead title="Sign in" />
    <DemoNotice>{AUTH_NOTE} Any valid email and password lets you in to see sample data.</DemoNotice>
    <form onSubmit={submit} noValidate className="ov-form">
      <Field label="Email" type="email" autoComplete="email" {...form.bind('email')} />
      <PasswordField autoComplete="current-password" {...form.bind('password')} />
      <button type="submit" className="ov-button ov-button-dark">Sign in</button>
    </form>
    <p className="ov-auth-links"><Link to="/account/forgot-password">Forgot your password?</Link><span>New here? <Link to="/account/register">Create an account</Link></span></p>
  </main>;
}

export function RegisterPage() {
  const signIn = useStore((state) => state.signIn);
  const navigate = useNavigate();
  const form = useForm({ name: '', email: '', password: '' });
  const submit = (event) => {
    event.preventDefault();
    const found = {};
    if (!form.values.name.trim()) found.name = 'Enter your name.';
    if (!form.values.email.trim()) found.email = 'Enter your email address.'; else if (!EMAIL_PATTERN.test(form.values.email.trim())) found.email = 'Enter a valid email address.';
    if (form.values.password.length < 8) found.password = 'Use at least 8 characters.';
    if (form.fail(found)) return;
    signIn({ name: form.values.name.trim(), email: form.values.email.trim(), phone: '' });
    navigate('/account');
  };
  return <main id="main-content" className="ov-page ov-auth">
    <PageHead title="Create account" />
    <DemoNotice>{AUTH_NOTE} Your password is never stored.</DemoNotice>
    <form onSubmit={submit} noValidate className="ov-form">
      <Field label="Full name" autoComplete="name" {...form.bind('name')} />
      <Field label="Email" type="email" autoComplete="email" {...form.bind('email')} />
      <PasswordField autoComplete="new-password" hint="At least 8 characters." {...form.bind('password')} />
      <button type="submit" className="ov-button ov-button-dark">Create demo account</button>
    </form>
    <p className="ov-auth-links"><span>Already have an account? <Link to="/account/login">Sign in</Link></span></p>
  </main>;
}

export function ForgotPasswordPage() {
  const form = useForm({ email: '' });
  const [done, setDone] = useState(false);
  const submit = (event) => {
    event.preventDefault();
    const found = {};
    if (!form.values.email.trim()) found.email = 'Enter your email address.'; else if (!EMAIL_PATTERN.test(form.values.email.trim())) found.email = 'Enter a valid email address.';
    if (!form.fail(found)) setDone(true);
  };
  return <main id="main-content" className="ov-page ov-auth">
    <PageHead title="Reset your password" />
    <DemoNotice>{AUTH_NOTE}</DemoNotice>
    {done ? <div className="ov-form-done" role="status"><h2>Demo only: no email was sent</h2><p>A real store would email reset instructions to {form.values.email.trim()}. This demo sends nothing.</p><Link to="/account/login" className="ov-button ov-button-dark">Back to sign in</Link></div>
      : <form onSubmit={submit} noValidate className="ov-form"><Field label="Email" type="email" autoComplete="email" {...form.bind('email')} /><button type="submit" className="ov-button ov-button-dark">Show reset message</button></form>}
    <p className="ov-auth-links"><Link to="/account/login">Back to sign in</Link></p>
  </main>;
}

export function AccountLayout({ title, children }) {
  const customer = useStore((state) => state.customer);
  const signOut = useStore((state) => state.signOut);
  const navigate = useNavigate();
  if (!customer) return <Navigate to={`/account/login?next=${encodeURIComponent(window.location.pathname)}`} replace />;
  const links = [['/account', 'Dashboard', true], ['/account/orders', 'Orders'], ['/account/addresses', 'Addresses'], ['/account/profile', 'Profile']];
  return <main id="main-content" className="ov-page ov-account">
    <PageHead title={title} />
    <DemoNotice>Demo account with sample data. Your name, email and phone are kept for this tab only. Addresses and orders reset when you reload the page.</DemoNotice>
    <div className="ov-account-layout">
      <nav className="ov-account-nav" aria-label="Account">{links.map(([to, label, end]) => <NavLink key={to} to={to} end={end}>{label}</NavLink>)}<button type="button" className="ov-link-button" onClick={() => { signOut(); navigate('/'); }}>Sign out</button></nav>
      <div className="ov-account-body">{children}</div>
    </div>
  </main>;
}

export function DashboardPage() {
  const customer = useStore((state) => state.customer);
  const orders = allOrders(useStore((state) => state.orders));
  const addresses = useStore((state) => state.addresses);
  return <AccountLayout title="Your account">
    <h2>Hello, {customer?.name || 'there'}</h2>
    <p>{customer?.email}</p>
    <ul className="ov-stat-list"><li><strong>{orders.length}</strong> {orders.length === 1 ? 'order' : 'orders'}</li><li><strong>{addresses.length}</strong> saved {addresses.length === 1 ? 'address' : 'addresses'}</li></ul>
    <p><Link to="/account/orders" className="ov-text-link">View order history</Link></p>
  </AccountLayout>;
}

export function OrdersPage() {
  const orders = allOrders(useStore((state) => state.orders));
  return <AccountLayout title="Order history">
    {orders.length ? <ul className="ov-order-list">{orders.map((order) => { const { total, lines } = orderSummary(order); return <li key={order.id}>
      <div><Link to={`/account/orders/${order.id}`}><strong>{order.id}</strong></Link><span>{dateText(order.placedAt)} · {order.status}</span></div>
      <p>{lines.reduce((sum, line) => sum + line.quantity, 0)} items</p><strong>{formatPrice(total)}</strong></li>; })}</ul>
      : <EmptyState title="No orders yet." actions={<Link to="/shop" className="ov-button ov-button-dark">Start shopping</Link>}>Demo orders you place will appear here.</EmptyState>}
  </AccountLayout>;
}

export function OrderDetailPage() {
  const { id } = useParams();
  const orders = allOrders(useStore((state) => state.orders));
  const order = orders.find((entry) => entry.id === id);
  return <AccountLayout title={order ? `Order ${order.id}` : 'Order not found'}>
    {order ? <><p>{dateText(order.placedAt)} · {order.status}{order.sample ? ' · Sample order' : ''}</p><OrderBody order={order} /><p><Link to="/account/orders" className="ov-text-link">Back to orders</Link></p></>
      : <EmptyState title="We could not find that order." actions={<Link to="/account/orders" className="ov-button ov-button-dark">Back to orders</Link>}>It may not exist in this demo.</EmptyState>}
  </AccountLayout>;
}

function AddressForm({ initial, onSave, onCancel }) {
  const form = useForm(initial);
  const submit = (event) => {
    event.preventDefault();
    const found = {};
    ['name', 'line1', 'city', 'province'].forEach((key) => { if (!String(form.values[key] || '').trim()) found[key] = 'This field is required.'; });
    if (!/^\d{5}$/.test(String(form.values.postalCode || '').trim())) found.postalCode = 'Postal codes in Pakistan have 5 digits.';
    if (!form.fail(found)) onSave(form.values);
  };
  return <form onSubmit={submit} noValidate className="ov-form">
    <Field label="Label (for example Home)" {...form.bind('label')} />
    <Field label="Full name" autoComplete="name" {...form.bind('name')} />
    <Field label="Address" autoComplete="address-line1" {...form.bind('line1')} />
    <Field label="Apartment, suite or floor (optional)" autoComplete="address-line2" {...form.bind('line2')} />
    <div className="ov-field-row"><Field label="City" autoComplete="address-level2" {...form.bind('city')} />
      <Field label="Province or territory" as="select" autoComplete="address-level1" {...form.bind('province')}><option value="">Select</option>{PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}</Field></div>
    <Field label="Postal code" inputMode="numeric" maxLength={5} autoComplete="postal-code" {...form.bind('postalCode')} />
    <label className="ov-check"><input type="checkbox" checked={Boolean(form.values.isDefault)} onChange={(event) => form.setValues({ ...form.values, isDefault: event.target.checked })} /> Use as my default address</label>
    <div className="ov-form-actions"><button type="submit" className="ov-button ov-button-dark">Save address</button><button type="button" className="ov-button ov-button-light" onClick={onCancel}>Cancel</button></div>
  </form>;
}

export function AddressesPage() {
  const addresses = useStore((state) => state.addresses);
  const saveAddress = useStore((state) => state.saveAddress);
  const deleteAddress = useStore((state) => state.deleteAddress);
  const announce = useStore((state) => state.announce);
  const [editing, setEditing] = useState(null); // null | 'new' | address
  const blank = { label: '', name: '', line1: '', line2: '', city: '', province: '', postalCode: '', phone: '', isDefault: false };
  return <AccountLayout title="Address book">
    {editing ? <AddressForm initial={editing === 'new' ? blank : editing} onCancel={() => setEditing(null)} onSave={(values) => { saveAddress(values); setEditing(null); announce('Address saved.'); }} />
      : <>
        {addresses.length ? <ul className="ov-address-list">{addresses.map((address) => <li key={address.id}>
          <h2>{address.label || 'Address'}{address.isDefault && <span className="ov-tag">Default</span>}</h2>
          <address>{address.name}<br />{address.line1}{address.line2 ? `, ${address.line2}` : ''}<br />{address.city}, {address.province} {address.postalCode}<br />Pakistan</address>
          <div className="ov-line-actions"><button type="button" className="ov-link-button" onClick={() => setEditing(address)}>Edit<span className="ov-sr-only"> {address.label}</span></button><button type="button" className="ov-link-button" onClick={() => { deleteAddress(address.id); announce('Address removed.'); }}>Remove<span className="ov-sr-only"> {address.label}</span></button></div></li>)}</ul>
          : <EmptyState title="No saved addresses.">Add an address to use at checkout.</EmptyState>}
        <button type="button" className="ov-button ov-button-dark" onClick={() => setEditing('new')}>Add an address</button>
      </>}
  </AccountLayout>;
}

export function ProfilePage() {
  const customer = useStore((state) => state.customer);
  const updateCustomer = useStore((state) => state.updateCustomer);
  const form = useForm({ name: customer?.name || '', email: customer?.email || '', phone: customer?.phone || '' });
  const [saved, setSaved] = useState(false);
  const submit = (event) => {
    event.preventDefault();
    const found = {};
    if (!form.values.name.trim()) found.name = 'Enter your name.';
    if (!EMAIL_PATTERN.test(form.values.email.trim())) found.email = 'Enter a valid email address.';
    if (form.fail(found)) return;
    updateCustomer({ name: form.values.name.trim(), email: form.values.email.trim(), phone: form.values.phone.trim() });
    setSaved(true);
  };
  return <AccountLayout title="Profile">
    <form onSubmit={submit} noValidate className="ov-form" onChange={() => setSaved(false)}>
      <Field label="Full name" autoComplete="name" {...form.bind('name')} />
      <Field label="Email" type="email" autoComplete="email" {...form.bind('email')} />
      <Field label="Phone (optional)" type="tel" autoComplete="tel" {...form.bind('phone')} />
      <button type="submit" className="ov-button ov-button-dark">Save profile</button>
      {saved && <p className="ov-form-ok" role="status">Profile updated for this demo session.</p>}
    </form>
  </AccountLayout>;
}
