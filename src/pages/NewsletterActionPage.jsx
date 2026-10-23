import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { callFunction } from '../lib/api.js';

export default function NewsletterActionPage({ action }) {
  const { hash } = useLocation();
  const [state, setState] = useState('idle');
  const token = new URLSearchParams(hash.slice(1)).get('token');
  const confirm = action === 'confirm';
  const submit = async () => {
    if (state === 'busy') return;
    setState('busy');
    const result = await callFunction(`newsletter-${action}`, { token }, { token: null });
    if (result.ok && result.data?.[confirm ? 'confirmed' : 'unsubscribed']) {
      setState('done'); history.replaceState(null, '', location.pathname);
    } else setState('error');
  };
  return <main id="main-content" className="ov-page"><h1>{confirm ? 'Confirm your newsletter subscription' : 'Unsubscribe from the newsletter'}</h1>
    {state === 'done' ? <p role="status">{confirm ? 'Your subscription is confirmed.' : 'You have been unsubscribed.'}</p>
      : !token ? <p>Open the complete link from your email.</p> : <><p>Choose below to {confirm ? 'confirm your subscription' : 'unsubscribe'}.</p>
        <button className="ov-button ov-button-dark" onClick={submit} disabled={state === 'busy'}>{state === 'busy' ? 'Please wait…' : confirm ? 'Confirm subscription' : 'Unsubscribe'}</button>
        {state === 'error' && <p role="alert">This link may have expired or already been used, or the service is unavailable. Please try again or request a new link.</p>}</>}
  </main>;
}
