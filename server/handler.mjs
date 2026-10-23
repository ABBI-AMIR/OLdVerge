import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function createHandler({clientDir='dist',serverDir='server-dist',siteUrl=process.env.SITE_URL,tier=process.env.OLDVERGE_DEPLOYMENT_TIER,fetch}={}) {
  const [template,configText,module]=await Promise.all([fs.readFile(path.join(clientDir,'index.html'),'utf8'),fs.readFile(path.join(clientDir,'ssr-public.json'),'utf8'),import(pathToFileURL(path.resolve(serverDir,'entry.js')).href)]);
  let origin=null;
  if(siteUrl) { const url=new URL(siteUrl); if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash) throw new Error('Invalid SITE_URL');origin=url.origin; }
  const render=module.createRenderer({template,config:JSON.parse(configText),origin,fetch});
  return async(req,res,startup)=>{
    if(!['GET','HEAD'].includes(req.method)) {res.writeHead(405,{'Allow':'GET, HEAD','Cache-Control':'no-store'});res.end();return;}
    try {
      const url=new URL(req.url,'https://local.invalid');
      let target=url.pathname;
      if(url.pathname==='/api/render') {target=url.searchParams.get('route')||'/';url.searchParams.delete('route');}
      const result=await render(target+(url.searchParams.size?'?'+url.searchParams:''));
      const headers={...result.headers};
      if(startup)headers['Server-Timing']=[headers['Server-Timing'],`boot;desc="${startup.boot}"`,`init;dur=${startup.initMs.toFixed(2)}`,`app;dur=${(performance.now()-startup.startedAt).toFixed(2)}`].filter(Boolean).join(', ');
      if(tier==='staging') Object.assign(headers,{'X-Robots-Tag':'noindex, nofollow','Cache-Control':'no-store'});
      res.writeHead(result.status,headers);res.end(req.method==='HEAD'?'':result.html);
    } catch {res.writeHead(503,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end('<!doctype html><h1>Store temporarily unavailable</h1>');}
  };
}
