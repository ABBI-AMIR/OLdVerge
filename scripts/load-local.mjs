import { build } from 'vite';
import { startServer } from '../server/local.mjs';
import { runLoad } from './load-test.mjs';
import fs from 'node:fs/promises';
const define={'import.meta.env.VITE_SUPABASE_URL':'""','import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY':'""','import.meta.env.VITE_CONTACT_FORM_ENDPOINT':'""','import.meta.env.VITE_TURNSTILE_SITE_KEY':'""'};
// Isolated artifacts: real env files and normal deployable builds are never rewritten.
await build({mode:'test',define,build:{outDir:'scripts/out/load-client'}});
await build({mode:'test',define,build:{ssr:'server/entry.jsx',outDir:'scripts/out/load-server',manifest:false,rollupOptions:{output:{manualChunks:undefined}}}});
const config=JSON.parse(await fs.readFile('scripts/out/load-client/ssr-public.json','utf8'));
if(config.mode!=='demo'||config.url||config.key) throw new Error('Local load artifacts must use isolated demo data');
const instance=await startServer({clientDir:'scripts/out/load-client',serverDir:'scripts/out/load-server',fetch:()=>{throw new Error('Network access is forbidden in isolated local tests');}});
try {
 const head=await fetch(instance.origin+'/shop',{method:'HEAD'});
 if(head.status!==200||head.headers.get('x-oldverge-rendering')!=='ssr'||(await head.text())!=='') throw new Error('Production HEAD handling failed');
 const missing=await fetch(instance.origin+'/product/nonexistent');
 if(missing.status!==404) throw new Error('Production product 404 handling failed');
 const privatePage=await fetch(instance.origin+'/account');
 if(privatePage.headers.get('cache-control')!=='no-store'||(await privatePage.text()).includes('ov-ssr-state')) throw new Error('Private production route isolation failed');
 const alias=await fetch(instance.origin+'/collections/all',{redirect:'manual'});
 if(alias.status!==308||alias.headers.get('location')!=='/shop') throw new Error('Production redirect handling failed');
 const report=await runLoad({target:instance.origin,local:true,rps:10,duration:20,concurrency:8,reportPath:'scripts/out/load-local.json'});
 console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
} finally {await instance.close();}
