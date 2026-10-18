import { useId, useState } from 'react';
import { EMAIL_PATTERN, Field } from './ui.jsx';

export const CONTACT_TOPICS = ['Order question', 'Product question', 'Sizing', 'Shipping & delivery', 'Returns & exchanges', 'Other'];
const EMPTY = { firstName: '', lastName: '', email: '', phone: '', message: '', topics: [] };

function validate(values) {
  const errors = {};
  if (!values.firstName.trim()) errors.firstName = 'Enter your first name.';
  if (!values.lastName.trim()) errors.lastName = 'Enter your last name.';
  if (!values.email.trim()) errors.email = 'Enter your email address.';
  else if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Enter a valid email address, like name@example.com.';
  if (values.phone.trim() && !/^[+\d][\d\s()-]{6,}$/.test(values.phone.trim())) errors.phone = 'Enter a valid phone number, or leave this blank.';
  if (!values.message.trim()) errors.message = 'Write a message.';
  return errors;
}

/**
 * Contact form. With a real endpoint (VITE_CONTACT_FORM_ENDPOINT) it posts the message and reports success
 * only on a 2xx answer. Without one it is a labelled demo: it validates locally and shows a simulated result,
 * and nothing is sent.
 */
export default function ContactForm({ endpoint }) {
  const connected = Boolean(endpoint);
  const topicsId = useId();
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | sent | failed

  const bind = (name) => ({ name, value: values[name], error: errors[name], onChange: (event) => { setValues((current) => ({ ...current, [name]: event.target.value })); setErrors((current) => ({ ...current, [name]: undefined })); } });
  const toggleTopic = (topic) => setValues((current) => ({ ...current, topics: current.topics.includes(topic) ? current.topics.filter((item) => item !== topic) : [...current.topics, topic] }));

  const submit = async (event) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) { document.querySelector(`[name="${first}"]`)?.focus(); return; }
    if (!connected) { setStatus('sent'); return; }
    setStatus('sending');
    // AbortController instead of AbortSignal.timeout, which older Safari versions lack.
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(endpoint, { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ firstName: values.firstName.trim(), lastName: values.lastName.trim(), email: values.email.trim(), phone: values.phone.trim(), topics: values.topics, message: values.message.trim() }) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setValues(EMPTY);
      setStatus('sent');
    } catch {
      setStatus('failed');
    } finally {
      window.clearTimeout(timer);
    }
  };

  if (status === 'sent') {
    return <div className="ov-form-done" role="status">
      <h2>{connected ? 'Message sent' : 'Demo only: no message was sent'}</h2>
      <p>{connected ? 'Thank you. Your message has been delivered.' : 'This form is not connected to an inbox yet, so your message was not delivered.'}</p>
      <button type="button" className="ov-button ov-button-light" onClick={() => { setValues(EMPTY); setStatus('idle'); }}>Write another message</button>
    </div>;
  }

  return <form className="ov-form ov-contact-form" onSubmit={submit} noValidate>
    <div className="ov-field-row">
      <Field label="First name" autoComplete="given-name" placeholder="First name" {...bind('firstName')} />
      <Field label="Last name" autoComplete="family-name" placeholder="Last name" {...bind('lastName')} />
    </div>
    <Field label="Email" type="email" autoComplete="email" placeholder="you@example.com" {...bind('email')} />
    <Field label="Phone number (optional)" type="tel" autoComplete="tel" placeholder="+92 300 0000000" {...bind('phone')} />
    <Field label="Message" as="textarea" placeholder="Leave us a message…" {...bind('message')} />
    <fieldset className="ov-topics" aria-labelledby={topicsId}>
      <legend id={topicsId}>What is this about?</legend>
      <div>{CONTACT_TOPICS.map((topic) => <label key={topic}><input type="checkbox" checked={values.topics.includes(topic)} onChange={() => toggleTopic(topic)} /><span>{topic}</span></label>)}</div>
    </fieldset>
    {status === 'failed' && <p className="ov-form-error" role="alert">Your message could not be sent. Please try again.</p>}
    <button type="submit" className="ov-button ov-button-dark" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : connected ? 'Send message' : 'Preview message'}</button>
    {!connected && <p className="ov-note">Demo: this form is not connected, so nothing is sent.</p>}
  </form>;
}
