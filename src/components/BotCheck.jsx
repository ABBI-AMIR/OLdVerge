import { useEffect, useRef, useState } from 'react';
import { isBackend } from '../lib/config.js';

let loading;
export function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!loading) loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.onload = () => window.turnstile ? resolve(window.turnstile) : reject(new Error('bot_check_unavailable'));
    script.onerror = () => { script.remove(); loading = null; reject(new Error('bot_check_unavailable')); };
    document.head.appendChild(script);
  });
  return loading;
}

export const formBotToken = (form) => new FormData(form).get('cf-turnstile-response') || '';

export default function BotCheck() {
  const container = useRef(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const key = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    if (!isBackend || !key) return undefined;
    let cancelled = false; let api; let id; let token;
    const reset = (event) => { if (event.detail === token && id !== undefined) { token = null; api.reset(id); } };
    window.addEventListener('ov-bot-token-used', reset);
    loadTurnstile().then((service) => {
      if (cancelled) return;
      api = service;
      id = api.render(container.current, { sitekey: key, callback: (value) => { token = value; setError(false); }, 'expired-callback': () => { token = null; api.reset(id); }, 'error-callback': () => { token = null; setError(true); } });
    }).catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; window.removeEventListener('ov-bot-token-used', reset); if (id !== undefined) api.remove(id); };
  }, []);
  return <div><div ref={container} />{error && <p role="alert">Verification could not load. Please reload the page to try again.</p>}</div>;
}
