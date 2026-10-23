import {describe,it,expect,vi} from 'vitest';
import {createRuntime} from '../../server/runtime.mjs';
import {createPublicData,publicRoute} from '../../server/public-data.js';
import {readServerTiming} from '../../scripts/load-test.mjs';

const config={mode:'supabase',configured:true,url:'https://public.test',key:'sb_publishable_test0123456789'};
const response=()=>({writeHead:vi.fn(),setHeader:vi.fn(),end:vi.fn()});
const product=[{slug:'watch',name:'Watch',product_variants:[],product_images:[]}];
describe('cold handler initialization',()=>{
 it('initializes once, identifies waiting requests, and distinguishes subsequent warm entry',async()=>{
   let release;const gate=new Promise(resolve=>{release=resolve;});
   const handle=vi.fn();const initialize=vi.fn(async()=>{await gate;return handle;});
   const run=createRuntime({initialize});
   const first=run({method:'GET'},response()),second=run({method:'GET'},response());
   await vi.waitFor(()=>expect(initialize).toHaveBeenCalledTimes(1));
   release();await Promise.all([first,second]);await run({method:'GET'},response());
   expect(handle.mock.calls.map(call=>call[2].boot)).toEqual(['INIT','WAIT','READY']);
   expect(handle.mock.calls.every(call=>call[2].initMs>=0)).toBe(true);
 });
 it('retries failed initialization, keeps errors private and suppresses a HEAD error body',async()=>{
   const handle=vi.fn();const initialize=vi.fn().mockRejectedValueOnce(new Error('private server detail')).mockResolvedValue(handle);
   const run=createRuntime({initialize}),failed=response();
   await run({method:'HEAD'},failed);
   expect(failed.statusCode).toBe(503);expect(failed.setHeader).toHaveBeenCalledWith('Cache-Control','no-store');expect(failed.end).toHaveBeenCalledWith(undefined);
   await run({method:'GET'},response());expect(initialize).toHaveBeenCalledTimes(2);expect(handle.mock.calls[0][2].boot).toBe('INIT');
 });
 it('rejects writes without paying the cold initialization cost',async()=>{
   const initialize=vi.fn();const run=createRuntime({initialize}),res=response();
   await run({method:'POST'},res);expect(initialize).not.toHaveBeenCalled();
   expect(res.writeHead).toHaveBeenCalledWith(405,expect.objectContaining({Allow:'GET, HEAD','Cache-Control':'no-store'}));
 });
});
describe('uncached public read budgets',()=>{
 it('uses one route deadline across catalogue selection and detail hydration, aborting orphaned work',async()=>{
   const controller=new AbortController();let productSignal;
   const fetch=vi.fn(async(url,options)=>{
     if(url.includes('rpc/catalog_page'))return new Response(JSON.stringify({slugs:['watch'],total:1}));
     productSignal=options.signal;return new Promise(()=>{});
   });
   const load=createPublicData({config,fetch});
   const result=load(publicRoute('/shop'),{signal:controller.signal}).catch(error=>error);
   await vi.waitFor(()=>expect(productSignal).toBeDefined());controller.abort(new Error('budget exhausted'));
   expect((await result).message).toBe('budget exhausted');expect(productSignal.aborted).toBe(true);
   expect(fetch).toHaveBeenCalledTimes(2);
 });
 it('keeps another consumer’s shared read alive when one route expires',async()=>{
   let release,sharedSignal;const first=new AbortController(),second=new AbortController();
   const fetch=vi.fn(async(_url,options)=>{sharedSignal=options.signal;await new Promise(resolve=>{release=resolve;});return new Response(JSON.stringify(product));});
   const load=createPublicData({config,fetch});
   const a=load(publicRoute('/product/watch'),{signal:first.signal}).catch(error=>error);
   const b=load(publicRoute('/product/watch'),{signal:second.signal});
   first.abort(new Error('first deadline'));expect((await a).message).toBe('first deadline');
   expect(sharedSignal.aborted).toBe(false);release();expect((await b).products).toHaveLength(1);expect(fetch).toHaveBeenCalledTimes(1);
 });
 it('does not let a cancelled old read remove its replacement from the pending map',async()=>{
   let rejectOld,releaseNew;const first=new AbortController();
   const fetch=vi.fn().mockImplementationOnce(()=>new Promise((_,reject)=>{rejectOld=reject;})).mockImplementationOnce(()=>new Promise(resolve=>{releaseNew=()=>resolve(new Response(JSON.stringify(product)));}));
   const load=createPublicData({config,fetch}),route=publicRoute('/product/watch');
   const old=load(route,{signal:first.signal}).catch(error=>error);first.abort();await old;
   const next=load(route);rejectOld(new Error('old aborted read'));
   await Promise.resolve();await Promise.resolve();
   const joined=load(route);expect(fetch).toHaveBeenCalledTimes(2);releaseNew();
   expect((await next).products).toHaveLength(1);expect((await joined).products).toHaveLength(1);
 });
 it('releases failed HTTP response bodies before retrying and reports only public fields',async()=>{
   const failed=new Response('private backend detail',{status:500});const cancel=vi.spyOn(failed.body,'cancel');
   const fetch=vi.fn().mockResolvedValueOnce(failed).mockResolvedValueOnce(new Response(JSON.stringify(product)));
   const load=createPublicData({config,fetch});
   await expect(load(publicRoute('/product/watch'))).rejects.toThrow('public_backend_unavailable');expect(cancel).toHaveBeenCalledOnce();
   expect((await load(publicRoute('/product/watch'))).products).toHaveLength(1);
   const params=new URL(fetch.mock.calls[1][0]).searchParams;
   expect(params.get('status')).toBe('eq.published');expect(params.get('product_variants.active')).toBe('eq.true');
   expect(params.get('product_images.bucket')).toBe('eq.product-public');expect(params.get('product_images.approval_status')).toBe('eq.approved');
 });
 it('does not start upstream reads for an already expired route',async()=>{
   const fetch=vi.fn(),controller=new AbortController();controller.abort();
   await expect(createPublicData({config,fetch})(publicRoute('/shop'),{signal:controller.signal})).rejects.toThrow();expect(fetch).not.toHaveBeenCalled();
 });
});
describe('cache fragmentation and cold timing',()=>{
 it('canonicalizes only equivalent effective browse inputs while retaining distinct filters and pages',()=>{
   const a=publicRoute('/shop?brand=casio&brand=seiko&price_min=100&price_max=500');
   const b=publicRoute('/shop?brand=seiko&brand=casio&brand=seiko&price_max=100&price_min=500&sort=featured&page=01&token=secret');
   expect(String(a.query)).toBe(String(b.query));expect(a.filters).toEqual(b.filters);
   expect(String(publicRoute('/shop?brand=casio&page=2').query)).not.toBe(String(a.query));
   expect(String(publicRoute('/product/watch?q=ignored&page=20').query)).toBe('');
   expect(publicRoute('/product/watch?page=20').page).toBe(1);
   expect(String(publicRoute('/about?brand=casio').query)).toBe('');
 });
 it('parses only allowlisted bootstrap and upstream timing fields',()=>{
   expect(readServerTiming('boot;desc="INIT", init;dur=12.3, app;dur=155, catalog;dur=50, products;dur=60, policy;dur=2, private;dur=123')).toEqual({boot:'INIT',init:12.3,app:155,catalog:50,products:60,policy:2});
   expect(readServerTiming('boot;desc="secret", init;dur=-1, app;dur=NaN')).toEqual({});
 });
});
