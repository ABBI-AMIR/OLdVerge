import { describe, expect, it, vi } from 'vitest';
import { createRenderer, serialize } from '../../server/entry.jsx';
import { publicRoute, createPublicData } from '../../server/public-data.js';
import { validateTarget, percentile, runLoad, readServerTiming } from '../../scripts/load-test.mjs';
import fs from 'node:fs';
const template='<!doctype html><html><head><title>Default</title><meta name="description" content="Default" /><meta property="og:title" content="Default" /><meta property="og:description" content="Default" /></head><body><div id="root"></div></body></html>';
const config={mode:'supabase',configured:true,url:'https://public.test',key:'sb_publishable_test0123456789'};
function backend(name='Public Watch') {
 return vi.fn(async(url,_options)=>{
   let data=[];
   if(url.includes('rpc/catalog_page')) data={slugs:['public-watch'],total:50};
   else if(url.includes('/products?')&&!url.includes('nonexistent')) data=[{id:'id',slug:'public-watch',name,description:'A public description',kind:'watch',category:{slug:'watches'},product_variants:[{id:'v',size_label:'One size',price_pkr:500}],product_images:[]}];
   else if(url.includes('store_settings')) data=[{key:'ordering_enabled',value:false}];
   return new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
 });
}
describe('request-isolated public SSR',()=>{
 it('preserves existing redirects and interactive support routes without data reads',async()=>{
   const fetch=backend();const render=createRenderer({config,template,fetch});
   for(const [from,to] of [['/collections/all','/shop'],['/collections/watches','/shop/watches'],['/products/public-watch','/product/public-watch'],['/pages/contact','/contact'],['/privacy','/privacy-policy']]) {
     expect(await render(from)).toMatchObject({status:308,headers:{Location:to}});
   }
   for(const from of ['/pages/returns','/pages/track-order','/pages/shipping']) expect((await render(from)).headers['Cache-Control']).toBe('no-store');
   expect(fetch).not.toHaveBeenCalled();
 });
 it('bounds concurrent distinct origin renders and does not cache failed responses',async()=>{
   let release;const wait=new Promise(resolve=>{release=resolve;});const fetch=backend();
   const blocked=vi.fn(async(...args)=>{await wait;return fetch(...args);});
   const render=createRenderer({config,template,fetch:blocked});
   const active=Array.from({length:16},(_,i)=>render('/shop?page='+(i+1)));
   expect(await render('/shop?page=17')).toMatchObject({status:503,headers:{'Retry-After':'2'}});
   release();await Promise.all(active);
   const broken=vi.fn(async()=>new Response('',{status:500}));const retry=createRenderer({config,template,fetch:broken});
   await retry('/shop');await retry('/shop');expect(broken).toHaveBeenCalledTimes(2);
 });
 it('renders real product HTML and route metadata without running browser JavaScript',async()=>{
   const fetch=backend();const render=createRenderer({config,template,fetch,origin:'https://staging.example.test'});
   const result=await render('/product/public-watch');
   expect(result.status).toBe(200);expect(result.html).toContain('<h1>Public Watch</h1>');expect(result.html).toContain('content="Public Watch | OLDVERGE"');
   expect(result.html).toContain('https://staging.example.test/product/public-watch');expect(result.html).toContain('ov-ssr-state');
   expect(result.html.replace(/<!--[\s\S]*?-->/g,'')).toContain('PKR 500');
   for(const [url,options]of fetch.mock.calls){expect(url.startsWith(config.url)).toBe(true);expect(options.headers).not.toHaveProperty('Authorization');expect(options.headers).not.toHaveProperty('Cookie');expect(options.redirect).toBe('error');
     if(url.includes('/products?')) { const selection=new URL(url).searchParams.get('select');expect(selection).not.toMatch(/\s/);expect(selection).toContain('product_variants(');expect(selection).toContain('product_images('); }
   }
 });
 it('excludes private routes from SSR, data reads, snapshots and shared caching',async()=>{
   const fetch=backend();const render=createRenderer({config,template,fetch});
   for(const route of ['/account','/admin/orders','/cart','/checkout','/order-confirmation?o=private-order','/newsletter/confirm?token=private-token']){
     const result=await render(route);expect(result.headers['Cache-Control']).toBe('no-store');expect(result.html).not.toContain('ov-ssr-state');expect(result.html).not.toContain('private-token');
   }
   expect(fetch).not.toHaveBeenCalled();
 });
 it('escapes hostile names in HTML, metadata and serialized hydration data',async()=>{
   const name='</script><script>alert("x")</script>';
   const result=await createRenderer({config,template,fetch:backend(name)})('/product/public-watch');
   expect(result.html).not.toContain('<script>alert');expect(result.html).toContain('&lt;script&gt;');expect(serialize({name})).not.toContain('<');
 });
 it('deduplicates public requests, expires cached HTML, and never shares data across renderers',async()=>{
   let time=0;const fetch=backend('First');const render=createRenderer({config,template,fetch,now:()=>time});
   await Promise.all([render('/shop'),render('/shop')]);expect(fetch).toHaveBeenCalledTimes(2);
   await render('/shop');expect(fetch).toHaveBeenCalledTimes(2);
   time=31000;await render('/shop');expect(fetch).toHaveBeenCalledTimes(4);
   const other=await createRenderer({config,template,fetch:backend('Other store')})('/shop');expect(other.html).not.toContain('First');
 });
 it('bounds the HTML cache, reports failures without demo fallback, and returns real 404s',async()=>{
   const fetch=backend();const render=createRenderer({config,template,fetch,maxEntries:1});await render('/shop');await render('/shop/watches');await render('/shop');expect(fetch).toHaveBeenCalledTimes(6);
   const failed=await createRenderer({config,template,fetch:async()=>new Response('private upstream detail',{status:500})})('/shop');
   expect(failed.status).toBe(503);expect(failed.headers['Cache-Control']).toBe('no-store');expect(failed.html).not.toContain('private upstream');expect(failed.html).not.toContain('Casio');
   const missing=await render('/product/nonexistent');
   expect(missing.status).toBe(404);
   expect((await render('/nonexistent')).status).toBe(404);
 });
 it('normalizes public browse parameters without reflecting tokens or unsafe routes',()=>{
   expect(publicRoute('//attacker.test/x').kind).toBe('missing');
   expect(publicRoute('/shop?page=-1&token=secret').page).toBe(1);
   expect(publicRoute('/shop?token=secret').query.has('token')).toBe(false);
   expect(publicRoute('/product/%3Cscript%3E').kind).toBe('missing');
 });
});
describe('read-only load-test guardrails',()=>{
 it('records route latency and sanitized server timing without saving response credentials',async()=>{
   const fetch=vi.fn(async()=>new Response('<div data-ssr="public"></div>',{headers:{'x-oldverge-rendering':'ssr','server-timing':'cache;desc="MISS", data;dur=80.25, render;dur=1.5, ssr;dur=82','set-cookie':'private-credential=secret'}}));
   const report=await runLoad({target:'http://127.0.0.1:4173',local:true,rps:2,duration:1,paths:['/','/shop'],fetch});
   expect(report.completed).toBe(2);expect(report.failed).toBe(0);
   expect(report.byPath['/'].cache).toEqual({MISS:1});
   expect(report.byPath['/shop'].serverTimingMs.data).toMatchObject({samples:1,p95:80.25});
   expect(JSON.stringify(report)).not.toContain('private-credential');
   expect(readServerTiming('url;desc="secret", data;dur=-1, render;dur=NaN, cache;desc="visitor input"')).toEqual({});
 });
 it('rejects unapproved remote targets and credentials before making requests',async()=>{
   expect(()=>validateTarget('https://oldverge.com')).toThrow();expect(()=>validateTarget('https://user:pass@example.test',{allowedOrigin:'https://example.test'})).toThrow();
   expect(()=>validateTarget('http://127.0.0.1:4173',{local:true})).not.toThrow();
   const fetch=vi.fn();await expect(runLoad({target:'http://127.0.0.1:4173',local:true,paths:['/checkout'],fetch})).rejects.toThrow('public read-only');expect(fetch).not.toHaveBeenCalled();
   await expect(runLoad({target:'http://127.0.0.1:4173',local:true,rps:100,fetch})).rejects.toThrow('Limits');expect(fetch).not.toHaveBeenCalled();
 });
 it('reports percentiles without silently discarding failures',()=>{expect(percentile([100,1,50,10],.95)).toBe(100);expect(percentile([], .5)).toBe(0);});
});

describe('SSR backend latency and deployment regressions',()=>{
 it('avoids origin reads for equivalent canonical product and browse URLs',async()=>{
   const fetch=backend();const render=createRenderer({config,template,fetch});
   await render('/product/public-watch');const product=await render('/product/public-watch?page=20&sort=featured&q=unused');
   expect(fetch).toHaveBeenCalledTimes(1);expect(product.headers['Server-Timing']).toContain('HIT');
   expect(product.html).toContain('<h1>Public Watch</h1>');
   await render('/shop?brand=casio&brand=seiko&price_min=100&price_max=500');
   const browse=await render('/shop?brand=seiko&brand=casio&brand=casio&price_min=500&price_max=100&page=01&sort=featured');
   expect(fetch).toHaveBeenCalledTimes(3);expect(browse.headers['Server-Timing']).toContain('HIT');
 });
 it('returns retryable uncached 503 responses when the whole data budget expires',async()=>{
   let recover=false;const source=backend();
   const fetch=vi.fn((...args)=>recover?source(...args):new Promise(()=>{}));
   const render=createRenderer({config,template,fetch,timeoutMs:20});
   const result=await render('/shop');expect(result.status).toBe(503);expect(result.headers['Cache-Control']).toBe('no-store');
   recover=true;expect((await render('/shop')).status).toBe(200);expect(fetch).toHaveBeenCalledTimes(3);
 });
 it('reports uncached catalogue/detail phases separately and omits them on hits',async()=>{
   const render=createRenderer({config,template,fetch:backend()});
   const miss=readServerTiming((await render('/shop')).headers['Server-Timing']);
   expect(miss).toMatchObject({catalog:expect.any(Number),products:expect.any(Number),data:expect.any(Number),cache:'MISS'});
   const hit=readServerTiming((await render('/shop')).headers['Server-Timing']);expect(hit.catalog).toBeUndefined();expect(hit.products).toBeUndefined();
 });
 it('places SSR beside the existing Tokyo staging database without changing routes or protection headers',()=>{
   const deployment=JSON.parse(fs.readFileSync(new URL('../../vercel.json',import.meta.url),'utf8'));
   expect(deployment.regions).toEqual(['hnd1']);
   expect(deployment.functions['api/render.js'].maxDuration).toBe(15);
   expect(deployment.routes).toContainEqual({src:'/',dest:'/api/render?route=/'});
 });
 it('makes one product read, two browse reads and no reads for informational pages',async()=>{
   const fetch=backend();const render=createRenderer({config,template,fetch});
   await render('/product/public-watch');expect(fetch).toHaveBeenCalledTimes(1);
   fetch.mockClear();await render('/shop');expect(fetch).toHaveBeenCalledTimes(2);
   expect(fetch.mock.calls.some(([url])=>/store_settings|policy_pages/.test(url))).toBe(false);
   fetch.mockClear();
   for(const route of ['/about','/faq','/contact']) expect((await render(route)).status).toBe(200);
   expect(fetch).not.toHaveBeenCalled();
 });
 it('fetches only the requested published policy and keeps backend failures closed',async()=>{
   const fetch=vi.fn(async url=>{
     const params=new URL(url).searchParams;
     expect(params.get('slug')).toBe('eq.privacy-policy');expect(params.get('published_at')).toBe('not.is.null');
     return new Response(JSON.stringify([{slug:'privacy-policy',title:'Published privacy',published_sections:[{heading:'Privacy',body:['Published text']}]}]));
   });
   const result=await createRenderer({config,template,fetch})('/privacy-policy');
   expect(fetch).toHaveBeenCalledTimes(1);expect(result.html).toContain('Published text');expect(result.status).toBe(200);
   const unavailable=await createRenderer({config,template,fetch:async()=>new Response('',{status:500})})('/privacy-policy');
   expect(unavailable.status).toBe(503);expect(unavailable.headers['Cache-Control']).toBe('no-store');
 });
 it('shares overlapping catalogue hydration across routes without retaining stale product data',async()=>{
   let release;const gate=new Promise(resolve=>{release=resolve;});const source=backend();
   const fetch=vi.fn(async(...args)=>{if(args[0].includes('/products?'))await gate;return source(...args);});
   const load=createPublicData({config,fetch});
   const requests=[load(publicRoute('/shop')),load(publicRoute('/shop/watches')),load(publicRoute('/search?q=watch'))];
   await vi.waitFor(()=>expect(fetch.mock.calls.filter(([url])=>url.includes('/products?'))).toHaveLength(1));
   release();await Promise.all(requests);
   expect(fetch).toHaveBeenCalledTimes(4); // Three page queries, one shared detail read.
   await load(publicRoute('/shop'));
   expect(fetch).toHaveBeenCalledTimes(6); // Fresh reads after settlement, no second TTL.
 });
 it('cleans up failed shared reads so a subsequent request can recover',async()=>{
   let fail=true;const source=backend();const fetch=vi.fn(async(...args)=>fail?new Response('',{status:503}):source(...args));
   const load=createPublicData({config,fetch});
   const failed=await Promise.allSettled([load(publicRoute('/shop')),load(publicRoute('/shop'))]);
   expect(failed.every(result=>result.status==='rejected')).toBe(true);expect(fetch).toHaveBeenCalledTimes(1);
   fail=false;expect((await load(publicRoute('/shop'))).products).toHaveLength(1);expect(fetch).toHaveBeenCalledTimes(3);
 });
 it('reports cache misses, coalesced waits and hits without reusing another request’s timing',async()=>{
   const render=createRenderer({config,template,fetch:backend()});
   const [miss,coalesced]=await Promise.all([render('/shop'),render('/shop')]);
   const hit=await render('/shop');
   expect(readServerTiming(miss.headers['Server-Timing'])).toMatchObject({cache:'MISS',data:expect.any(Number),render:expect.any(Number),ssr:expect.any(Number)});
   expect(readServerTiming(coalesced.headers['Server-Timing']).cache).toBe('COALESCED');
   expect(readServerTiming(hit.headers['Server-Timing']).cache).toBe('HIT');
   expect(hit.headers['Server-Timing']).not.toContain('data;');
   expect(miss.headers['Server-Timing']).toContain('MISS');
   expect(hit.html).toBe(miss.html);
 });
 it('isolates pending public reads between different backend projects',async()=>{
   const one=backend('First project'),two=backend('Second project');
   const [a,b]=await Promise.all([createPublicData({config,fetch:one})(publicRoute('/shop')),createPublicData({config:{...config,url:'https://other.test'},fetch:two})(publicRoute('/shop'))]);
   expect(a.products[0].name).toBe('First project');expect(b.products[0].name).toBe('Second project');
 });
});
