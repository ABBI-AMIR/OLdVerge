import { renderToString } from 'react-dom/server';
import PublicPage from '../src/ssr/PublicPage.jsx';
import { publicRoute, createPublicData } from './public-data.js';
import { POLICIES } from '../src/data/policies.js';

export const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export const serialize=value=>JSON.stringify(value).replace(/[<>&\u2028\u2029]/g,char=>'\\u'+char.charCodeAt(0).toString(16).padStart(4,'0'));
const titles={'/':'Timeless Elegance','/shop':'The collection','/shop/watches':'Watches','/shop/quarter-zips':'Quarter Zips','/search':'Search','/about':'Our story','/faq':'FAQ','/contact':'Contact'};
const text={'/':'Considered clothing. Distinctive watches. Your everyday signature.','/about':'OLDVERGE is a small range for everyday wear: quarter zips and watches.','/faq':'Browse watches and quarter zips. Product sizes and options are shown on each product page.','/contact':'Contact OLDVERGE using the channels published by the store.'};
export function createRenderer({config,template,fetch:fetcher,origin=null,now=Date.now,ttl=30000,maxEntries=64,maxCacheBytes=8*1024*1024,timeoutMs=4000}) {
  const load=createPublicData({config,fetch:fetcher,timeoutMs});
  const cache=new Map(); const inflight=new Map(); let cachedBytes=0;
  async function documentFor(route) {
    const start=performance.now();
    let status=200; let data;
    const phases=[];
    try { data=await load(route,{onTiming:(name,duration)=>phases.push(`${name};dur=${duration.toFixed(2)}`)}); } catch { status=503; data={products:[],total:0,policies:[]}; }
    const loaded=performance.now();
    const policy=data.policies?.find(item=>'/'+item.slug===route.path);
    const demoPolicy=config.mode==='demo'?POLICIES.find(item=>'/'+item.slug===route.path):null;
    let title=titles[route.path]||policy?.title||demoPolicy?.title||'Page not found';
    let description=text[route.path]||'Explore OLDVERGE watches and quarter zips in PKR.';
    if(route.kind==='product') {
      if(!data.products.length&&status!==503) status=404;
      title=data.products[0]?.name||'Product not found'; description=data.products[0]?.description||'';
    } else if(!titles[route.path]&&!policy&&!demoPolicy&&status!==503) status=404;
    if(route.path==='/search'&&route.q) title='Search: '+route.q;
    if(status===503) { title='Store temporarily unavailable'; description='Please try again later.'; }
    const pageUrl=number=>{const query=new URLSearchParams(route.query);if(number>1) query.set('page',number);else query.delete('page');return route.path+(query.size?'?'+query:'');};
    const snapshot={version:1,mode:config.mode,path:route.path,kind:route.kind,title,description,products:data.products||[],total:data.total||0,
      sections:policy?.published_sections||demoPolicy?.sections||[],error:status>=500,
      previous:route.page>1?pageUrl(route.page-1):null,next:route.page*24<data.total?pageUrl(route.page+1):null};
    const markup=renderToString(<PublicPage snapshot={snapshot} />);
    let html=template.replace('<div id="root"></div>',()=>`<div id="root">${markup}</div><script type="application/json" id="ov-ssr-state">${serialize(snapshot)}</script>`);
    html=html.replace(/<title>[\s\S]*?<\/title>/,()=>`<title>${escapeHtml(title)} | OLDVERGE</title>`)
      .replace(/<meta name="description"[^>]*>/,()=>`<meta name="description" content="${escapeHtml(description)}" />`)
      .replace(/<meta property="og:title"[^>]*>/,()=>`<meta property="og:title" content="${escapeHtml(title)} | OLDVERGE" />`)
      .replace(/<meta property="og:description"[^>]*>/,()=>`<meta property="og:description" content="${escapeHtml(description)}" />`);
    if(origin) html=html.replace('</head>',()=>`<link rel="canonical" href="${escapeHtml(origin+pageUrl(route.page))}" /><meta property="og:url" content="${escapeHtml(origin+pageUrl(route.page))}" /></head>`);
    if(route.kind==='product'&&data.products[0]?.image) {
      try { const image=new URL(data.products[0].image,origin||undefined); if(['https:','http:'].includes(image.protocol)) html=html.replace('</head>',()=>`<meta property="og:image" content="${escapeHtml(image.href)}" /></head>`); } catch { /* Relative images need an explicitly configured site origin. */ }
    }
    if(status!==200) html=html.replace('</head>','<meta name="robots" content="noindex" /></head>');
    return {status,html,headers:{'Server-Timing':`${phases.length?phases.join(', ')+', ':''}data;dur=${(loaded-start).toFixed(2)}, render;dur=${(performance.now()-loaded).toFixed(2)}`,'Content-Type':'text/html; charset=utf-8','Cache-Control':status===200?'public, max-age=0, s-maxage=30, stale-while-revalidate=30':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Oldverge-Rendering':'ssr'}};
  }
  return async input=>{
    const start=performance.now();
    // Per-request headers must not mutate the cached/shared result. Durations
    // contain no backend URLs, credentials, visitor state or query strings.
    const timed=(result,state)=>({...result,headers:{...result.headers,'Server-Timing':`cache;desc="${state}", ${state==='MISS'?result.headers['Server-Timing']+', ':''}ssr;dur=${(performance.now()-start).toFixed(2)}`}});
    const route=publicRoute(input);
    if(route.kind==='redirect') return {status:308,html:'',headers:{Location:route.path,'Cache-Control':'public, max-age=300'}};
    if(route.kind==='private') return {status:200,html:template.replace('</head>','<meta name="robots" content="noindex, nofollow" /></head>'),headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow','X-Oldverge-Rendering':'client-private'}};
    if(route.kind==='missing') return {status:404,html:template.replace('<div id="root"></div>','<div id="root"><main><h1>Page not found</h1><a href="/shop">Shop</a></main></div>'),headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}};
    const key=route.path+'?'+route.query;
    const saved=cache.get(key); if(saved&&now()-saved.at<ttl) return timed(saved.result,'HIT');
    if(inflight.has(key)) return timed(await inflight.get(key),'COALESCED');
    if(inflight.size>=16) return {status:503,html:'<!doctype html><h1>Store temporarily unavailable</h1>',headers:{'Cache-Control':'no-store','Retry-After':'2'}};
    const task=documentFor(route).then(result=>{
      if(result.status===200) { cachedBytes-=cache.get(key)?.bytes||0; cache.delete(key); const bytes=new TextEncoder().encode(result.html).length; cache.set(key,{at:now(),result,bytes});cachedBytes+=bytes; while(cache.size>maxEntries||cachedBytes>maxCacheBytes) {const oldest=cache.keys().next().value;cachedBytes-=cache.get(oldest).bytes;cache.delete(oldest);} }
      return result;
    }).finally(()=>inflight.delete(key));
    inflight.set(key,task);return timed(await task,'MISS');
  };
}
