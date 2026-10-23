import { checkProjectUrl, resolveBackend } from './config.js';

// Only these values may be serialized into browser code, regardless of env prefixes.
export function publicDefines(env, { production = false } = {}) {
  const resolved = resolveBackend(env, { dev: !production });
  if (production && (env.OLDVERGE_DEPLOYMENT_TIER === 'staging' || env.VERCEL_ENV === 'preview')) {
    const staging = resolveBackend({ VITE_SUPABASE_URL: env.STAGING_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY: resolved.key });
    const production = checkProjectUrl(env.PRODUCTION_SUPABASE_URL);
    const noProduction = env.OLDVERGE_PRODUCTION_BACKEND === 'none' && !env.PRODUCTION_SUPABASE_URL;
    const declaredProduction = production.ok && env.OLDVERGE_PRODUCTION_BACKEND !== 'none';
    if (env.OLDVERGE_DEPLOYMENT_TIER !== 'staging' || !staging.configured || (!noProduction && !declaredProduction) || resolved.url !== staging.url || staging.url === production.origin || env.VITE_CONTACT_FORM_ENDPOINT) {
      throw new Error('Unsafe staging configuration. Declare the staging backend and either a distinct production URL or OLDVERGE_PRODUCTION_BACKEND=none; use staging public credentials and disable external contact forwarding.');
    }
  }
  if (resolved.issue || (production && !resolved.configured && env.VITE_STORE_MODE !== 'demo')) {
    throw new Error('Invalid storefront configuration. Configure public Supabase credentials or explicitly select VITE_STORE_MODE=demo.');
  }
  const values = {
    VITE_SUPABASE_URL: resolved.url || '',
    VITE_SUPABASE_PUBLISHABLE_KEY: resolved.key || '',
    VITE_CONTACT_FORM_ENDPOINT: env.VITE_CONTACT_FORM_ENDPOINT || '',
    VITE_TURNSTILE_SITE_KEY: env.VITE_TURNSTILE_SITE_KEY || '',
  };
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)]));
}
