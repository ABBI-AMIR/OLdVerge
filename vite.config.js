import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { publicDefines } from './src/lib/publicEnv.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The Vercel Supabase integration names its PUBLIC values NEXT_PUBLIC_SUPABASE_*. Map exactly those names
// (an explicit allow-list) onto the VITE_* names the app reads. Server-only values such as
// SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SECRET_KEY or POSTGRES_* are never read here and never reach the bundle.
const PUBLIC_ALIASES = {
  VITE_SUPABASE_URL: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL'],
  VITE_SUPABASE_PUBLISHABLE_KEY: [
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'VITE_SUPABASE_ANON_KEY',
    'SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_ANON_KEY',
  ],
};

export default defineConfig(({ mode, command, isSsrBuild }) => {
  // Check __dirname (oldv), parent folder (vault root), and process.cwd() so .env is never missed
  const parentEnv = loadEnv(mode, path.resolve(__dirname, '..'), '');
  const dirEnv = loadEnv(mode, __dirname, '');
  const cwdEnv = loadEnv(mode, process.cwd(), '');
  const env = { ...parentEnv, ...dirEnv, ...cwdEnv, ...process.env };

  const define = {};
  for (const [target, sources] of Object.entries(PUBLIC_ALIASES)) {
    if (env[target]) continue;                 // an explicit VITE_* value always wins
    const source = sources.find((name) => env[name]);
    if (source) define[`import.meta.env.${target}`] = JSON.stringify(env[source]);
  }
  Object.assign(define, publicDefines(env, { production: command === 'build' && mode !== 'test' }));
  // Vite leaves NODE_ENV dynamic in SSR dependencies unless explicitly defined.
  // Fold React's production branches at build time instead of shipping both
  // production and development renderers into the cold-start function payload.
  if(isSsrBuild&&command==='build') define['process.env.NODE_ENV']=JSON.stringify('production');
  let ssrPublicConfig;
  return {
    plugins: [react(), {
      name: 'public-ssr-build-config',
      configResolved(config) { ssrPublicConfig = Object.fromEntries(['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY'].map(key => [key, JSON.parse(config.define['import.meta.env.'+key] || '""')])); },
      generateBundle() { if (!isSsrBuild) { const config = publicDefines(ssrPublicConfig); const url=JSON.parse(config['import.meta.env.VITE_SUPABASE_URL']); const key=JSON.parse(config['import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY']); this.emitFile({type:'asset',fileName:'ssr-public.json',source:JSON.stringify({version:1,mode:url?'supabase':'demo',configured:Boolean(url&&key),url,key})}); } },
    }],
    build: isSsrBuild ? { outDir: 'server-dist', minify: 'esbuild', manifest: false, rollupOptions: { output: { entryFileNames: 'entry.js' } } } : { manifest: true, rollupOptions: { output: { manualChunks(id) {
      if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react-vendor';
      if (id.includes('/node_modules/@supabase/')) return 'supabase-vendor';
    } } } },
    envPrefix: [],
    // The function loads this bundle dynamically; package React into it so file tracing
    // does not need to discover dependencies through the runtime-computed import path.
    ssr: { noExternal: ['react', 'react-dom', 'scheduler'] },
    define,
  };
});
