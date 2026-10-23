import { PRODUCT_SELECT, mapProductRow } from '../src/data/catalogMapper.js';
import { products as demoProducts } from '../src/data/products.js';
import { readBoundedBody } from '../supabase/functions/_shared/http.js';

const publicPaths = new Set(['/', '/shop', '/shop/watches', '/shop/quarter-zips', '/search', '/about', '/faq', '/contact', '/shipping', '/refund-policy', '/privacy-policy', '/terms-and-conditions']);
const policyPaths=new Set(['/shipping','/refund-policy','/privacy-policy','/terms-and-conditions']);
// Gateway values are optional diagnostics, never proof of SQL execution time.
// Allow numeric durations only; never reflect raw upstream headers.
export function gatewayTimings(headers) {
  const result={};
  for(const [name,header]of [['gateway','x-kong-proxy-latency'],['upstream','x-kong-upstream-latency']]) {
    const value=headers.get(header);
    if(value!==null&&/^\d+(?:\.\d+)?$/.test(value)&&Number(value)<=60000)result[name]=Number(value);
  }
  return result;
}
export function publicRoute(input) {
  if (typeof input !== 'string' || !input.startsWith('/') || input.startsWith('//') || input.length > 2048) return { kind:'missing', path:'/' };
  let url; try { url=new URL(input,'https://local.invalid'); } catch { return {kind:'missing',path:'/'}; }
  const path=url.pathname.replace(/\/$/,'')||'/';
  const aliases={'/index.html':'/','/collections':'/shop','/collections/all':'/shop','/pages/about':'/about','/pages/faq':'/faq','/pages/contact':'/contact','/shipping-policy':'/shipping','/returns':'/refund-policy','/returns-and-refunds':'/refund-policy','/privacy':'/privacy-policy','/terms':'/terms-and-conditions','/policies/privacy-policy':'/privacy-policy','/policies/terms-of-service':'/terms-and-conditions','/policies/refund-policy':'/refund-policy','/wishlist':'/shop','/size-guide':'/faq#sizing'};
  const destination=aliases[path] || (/^\/collections\/(watches|quarter-zips)$/.test(path)?path.replace('/collections/','/shop/'):null) || (/^\/products\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path)?path.replace('/products/','/product/'):null);
  if(destination) return {kind:'redirect',path:destination};
  if(/^\/pages\/(shipping|returns|track-order)$/.test(path)) return {kind:'private',path};
  if (/^\/(admin|account|cart|checkout|order-confirmation|newsletter)(\/|$)/.test(path)) return {kind:'private',path};
  if (!publicPaths.has(path) && !/^\/product\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path)) return {kind:'missing',path};
  const query=new URLSearchParams();
  for (const key of ['q','brand','style','colour','size','sort','price_min','price_max','page']) {
    for (const value of url.searchParams.getAll(key).slice(0,6)) if (value.length<=80) query.append(key,value);
  }
  const number=key=>/^\d{1,9}$/.test(query.get(key)||'')?Number(query.get(key)):null;
  const filters={brand:[],style:[],colour:[],size:[],priceMin:number('price_min'),priceMax:number('price_max')};
  for (const key of ['brand','style','colour','size']) filters[key]=query.getAll(key).filter(value=>/^[a-z0-9-]+$/.test(value));
  if(filters.priceMin!==null&&filters.priceMax!==null&&filters.priceMin>filters.priceMax) [filters.priceMin,filters.priceMax]=[filters.priceMax,filters.priceMin];
  const page=Math.max(1,Math.min(number('page')||1,1000000));
  const q=query.get('q')||'';
  const sort=['price-asc','price-desc'].includes(query.get('sort'))?query.get('sort'):'featured';
  // Cache/canonical URLs describe effective inputs, not rejected values or
  // duplicated filters. Product and informational pages consume no browse args.
  const canonical=new URLSearchParams();
  const browse=path==='/'||path.startsWith('/shop')||path==='/search';
  if(browse) {
    if(q)canonical.set('q',q);
    for(const key of ['brand','style','colour','size']) {
      filters[key]=[...new Set(filters[key])].sort();
      for(const value of filters[key])canonical.append(key,value);
    }
    if(filters.priceMin!==null)canonical.set('price_min',String(filters.priceMin));
    if(filters.priceMax!==null)canonical.set('price_max',String(filters.priceMax));
    if(sort!=='featured')canonical.set('sort',sort);
    if(page>1)canonical.set('page',String(page));
  }
  return {kind:path.startsWith('/product/')?'product':'public',path,query:canonical,filters,page:browse?page:1,category:path==='/shop/watches'?'watches':path==='/shop/quarter-zips'?'quarter-zips':null,q:browse?q:'',sort:browse?sort:'featured'};
}
export function createPublicData({config,fetch:fetcher=fetch,timeoutMs=4000}) {
  // Only share pending reads, scoped to this renderer/project. Never extend the
  // HTML freshness window with a second, independently expiring data cache.
  const pending = new Map();
  async function api(resource, {body,signal,onTiming=()=>{}}={}) {
    signal.throwIfAborted();
    const key=resource+JSON.stringify(body??null);
    let entry=pending.get(key);
    if(!entry) {
      entry={controller:new AbortController(),users:0};
      entry.promise=read(resource,body,entry.controller.signal).finally(()=>{if(pending.get(key)===entry)pending.delete(key);});
      pending.set(key,entry);
    }
    entry.users++;
    let abort;
    try {
      const cancelled=new Promise((_,reject)=>{abort=()=>reject(signal.reason);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();});
      const {data,timing}=await Promise.race([entry.promise,cancelled]);
      for(const [name,duration]of Object.entries(timing))onTiming(name,duration);
      return data;
    } finally {
      signal.removeEventListener('abort',abort);
      if(--entry.users===0) {
        // A timed-out route must not leave an orphaned request occupying a
        // connection; another route sharing it keeps its own deadline.
        if(pending.get(key)===entry)pending.delete(key);
        entry.controller.abort();
      }
    }
  }
  async function read(resource,body,signal) {
    const started=performance.now();
    // Never forward a visitor's Authorization, cookies, API keys or forwarded host.
    const response=await fetcher(`${config.url}/rest/v1/${resource}`,{method:body?'POST':'GET',redirect:'error',signal:AbortSignal.any([signal,AbortSignal.timeout(timeoutMs)]),headers:{apikey:config.key,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
    const received=performance.now();
    if(!response.ok) {await response.body?.cancel();throw new Error('public_backend_unavailable');}
    const bytes=await readBoundedBody(response,2*1024*1024);
    const consumed=performance.now();
    const data=JSON.parse(new TextDecoder().decode(bytes));
    return {data,timing:{headers:received-started,body:consumed-received,json:performance.now()-consumed,...gatewayTimings(response.headers)}};
  }
  async function products(slugs,signal,onTiming) {
    if(!slugs.length) return [];
    // Match postgrest-js: raw REST requests must compact multiline selections,
    // otherwise the gateway can discard the select and return only base columns.
    const params=new URLSearchParams({select:PRODUCT_SELECT.replace(/\s/g,''),status:'eq.published',slug:`in.(${slugs.join(',')})`,'product_variants.active':'eq.true','product_images.bucket':'eq.product-public','product_images.approval_status':'eq.approved'});
    const rows=await api(`products?${params}`,{signal,onTiming});
    const bySlug=new Map(rows.map(row=>[row.slug,mapProductRow(row,{storageBase:config.url})]));
    return slugs.map(slug=>bySlug.get(slug)).filter(Boolean);
  }
  return async (route,{onTiming=()=>{},signal=AbortSignal.timeout(timeoutMs)}={})=>{
    const details=phase=>(name,duration)=>onTiming(phase+'_'+name,duration);
    const phase=async(name,work)=>{const start=performance.now();try{return await work();}finally{onTiming(name,performance.now()-start);}};
    if(config.mode==='demo') {
      let list=route.kind==='product'?demoProducts.filter(p=>p.slug===route.path.slice(9)):demoProducts.filter(p=>!route.category||p.type===(route.category==='watches'?'watch':'clothing'));
      if(route.kind!=='product'&&route.path!=='/'&&!route.path.startsWith('/shop')&&route.path!=='/search') list=[];
      if(route.q) list=list.filter(p=>`${p.name} ${p.description}`.toLowerCase().includes(route.q.toLowerCase()));
      return {products:list.slice((route.page-1)*24,route.page*24),total:list.length,policies:[]};
    }
    if(!config.configured) throw new Error('public_backend_unavailable');
    // PublicPage does not consume store settings. Commerce readiness continues
    // to be checked by the existing client gate and authoritative checkout.
    // Only policy pages need policy content, and only their own published row.
    if(policyPaths.has(route.path)) {
      const params=new URLSearchParams({select:'slug,title,published_sections,published_at',slug:'eq.'+route.path.slice(1),published_at:'not.is.null'});
      return {products:[],total:0,policies:await phase('policy',()=>api(`policy_pages?${params}`,{signal,onTiming:details('policy')}))};
    }
    let list;
    if(route.kind==='product') list=phase('products',()=>products([route.path.slice(9)],signal,details('products'))).then(products=>({products,total:products.length}));
    else if(route.path==='/'||route.path.startsWith('/shop')||route.path==='/search') list=phase('catalog',()=>api('rpc/catalog_page',{signal,onTiming:details('catalog'),body:{p_category:route.category,p_query:route.q,p_filters:route.filters,p_sort:route.sort,p_page:route.page,p_size:24}})).then(async page=>({products:await phase('products',()=>products(page.slugs,signal,details('products'))),total:page.total}));
    else list=Promise.resolve({products:[],total:0});
    return {...await list,policies:[]};
  };
}
