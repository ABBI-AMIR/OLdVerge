// Check the entire static-import closure, not just the now-smaller entry chunk.
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
const manifest = JSON.parse(fs.readFileSync('dist/.vite/manifest.json','utf8'));
const visited = new Set(); let bytes = 0;
function visit(key) {
  if (visited.has(key)) return; visited.add(key);
  const entry = manifest[key];
  if (!entry) throw new Error('Missing manifest entry: '+key);
  if (entry.file.endsWith('.js')) bytes += gzipSync(fs.readFileSync(path.join('dist',entry.file))).length;
  (entry.imports || []).forEach(visit);
}
Object.keys(manifest).filter(key=>manifest[key].isEntry).forEach(visit);
console.log(`Initial JavaScript including static dependencies: ${(bytes/1024).toFixed(1)} KiB gzip`);
if (bytes > 200*1024) { console.error('Initial JavaScript exceeds the 200 KiB gzip budget.'); process.exitCode=1; }
for (const source of ['src/pages/ProductPage.jsx','src/pages/checkout/LiveCheckoutPage.jsx','src/admin/AdminApp.jsx']) {
  if (!manifest[source] || visited.has(source)) throw new Error('Expected a deferred route chunk: '+source);
}
// Raw size matters for serverless download/parse time, independently of the
// browser gzip budget. The production renderer is currently about 250 KiB.
const server=fs.readFileSync('server-dist/entry.js');
console.log(`SSR entry: ${(server.length/1024).toFixed(1)} KiB raw`);
if(server.length>350*1024) throw new Error('SSR entry exceeds the 350 KiB raw cold-start budget.');
if(server.toString().includes('process.env.NODE_ENV')) throw new Error('SSR React environment branches must be folded at build time.');
