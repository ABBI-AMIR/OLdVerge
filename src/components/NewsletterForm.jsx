import { useState } from 'react';
import { EMAIL_PATTERN } from './ui.jsx';

/** Demo newsletter sign-up: validates locally and shows a simulated result. No list exists and nothing is saved. */
export default function NewsletterForm() {
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
  return <section className="ov-newsletter" aria-labelledby="ov-news-title">
    <div>
      <h2 id="ov-news-title">News from OLDVERGE</h2>
      <p>This sign-up form is a preview and is not connected yet.</p>
    </div>
    {done ? <p className="ov-form-ok" role="status">Demo only: nothing was saved and no email will be sent.</p>
      : <form onSubmit={submit} noValidate>
        <label htmlFor="ov-news-email">Email address</label>
        <div><input id="ov-news-email" type="email" autoComplete="email" value={email} aria-invalid={error ? 'true' : undefined} aria-describedby={error ? 'ov-news-error' : undefined} onChange={(event) => { setEmail(event.target.value); setError(''); }} placeholder="name@example.com" />
          <button type="submit" className="ov-button ov-button-dark">Notify me</button></div>
        {error && <p className="ov-field-error" id="ov-news-error">{error}</p>}
        <p className="ov-note">Demo form: it is not connected to a mailing list.</p>
      </form>}
  </section>;
}
