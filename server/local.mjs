import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHandler } from './handler.mjs';
import { createRuntime } from './runtime.mjs';

export async function startServer({clientDir='dist',serverDir='server-dist',port=0,fetch}={}) {
  const handler=createRuntime({initialize:()=>createHandler({clientDir,serverDir,fetch})});
  const staticRoot=path.resolve(clientDir);
  const types={'.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp','.png':'image/png','.txt':'text/plain'};
  const server=http.createServer(async(req,res)=>{
    try {
      const pathname=new URL(req.url,'http://local.invalid').pathname;
      if(/^\/(assets|fonts|images)\//.test(pathname)||['/favicon.svg','/robots.txt'].includes(pathname)) {
        if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
        const filename=path.resolve(staticRoot,'.'+decodeURIComponent(pathname));
        if(!filename.startsWith(staticRoot+path.sep)){res.writeHead(404);res.end();return;}
        const bytes=await fs.readFile(filename);res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:bytes);return;
      }
      await handler(req,res);
    } catch {res.writeHead(404);res.end('Not found');}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  return {server,origin:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(resolve=>{server.close(resolve);server.closeIdleConnections();})};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const instance=await startServer({port:Number(process.env.PORT||4173)});console.log('Production SSR listening on '+instance.origin);
}
