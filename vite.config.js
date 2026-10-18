import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The Vercel Supabase integration names its PUBLIC values NEXT_PUBLIC_SUPABASE_*. Map exactly those names
// (an explicit allow-list) onto the VITE_* names the app reads. Server-only values such as
// SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SECRET_KEY or POSTGRES_* are never read here and never reach the bundle.
const PUBLIC_ALIASES = {
  VITE_SUPABASE_URL: ['NEXT_PUBLIC_SUPABASE_URL'],
  VITE_SUPABASE_PUBLISHABLE_KEY: ['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
};

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env };
  const define = {};
  for (const [target, sources] of Object.entries(PUBLIC_ALIASES)) {
    if (env[target]) continue;                 // an explicit VITE_* value always wins
    const source = sources.find((name) => env[name]);
    if (source) define[`import.meta.env.${target}`] = JSON.stringify(env[source]);
  }
  return { plugins: [react()], define };
});
