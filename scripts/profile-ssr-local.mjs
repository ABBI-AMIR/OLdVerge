import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readServerTiming} from './load-test.mjs';

const directory='scripts/out/ssr-profile';
const config={version:1,mode:'supabase',configured:true,url:'https://mock-backend.invalid',key:'sb_publishable_local_fixture_only'};
async function worker(){
  // Explicitly prohibit all real upstream I/O. Only the injected public fixture
  // can answer requests, including when a normal local env file exists.
  globalThis.fetch=()=>{throw new Error('Network access forbidden in SSR profile');};
  const importStart=performance.now();
  const {createRuntime}=await import('../server/runtime.mjs');
  const {createHandler}=await import('../server/handler.mjs');
  const moduleImportMs=performance.now()-importStart;
  let reads=0;
  const backend=async(url,options)=>{
    if(!url.startsWith(config.url+'/rest/v1/'))throw new Error('Unexpected fixture origin');
    reads++;
    await new Promise((resolve,reject)=>{
      const abort=()=>{clearTimeout(timer);reject(options.signal.reason);};
      const timer=setTimeout(()=>{options.signal.removeEventListener('abort',abort);resolve();},25);
      options.signal.addEventListener('abort',abort,{once:true});
    });
    if(url.includes('/rpc/catalog_page'))return new Response(JSON.stringify({slugs:['profile-watch'],total:1}));
    return new Response(JSON.stringify([{id:'fixture',slug:'profile-watch',name:'Profile Watch',kind:'watch',product_variants:[{id:'fixture-variant',price_pkr:500,active:true}],product_images:[]} ]));
  };
  const run=createRuntime({initialize:()=>createHandler({clientDir:directory+'/client',serverDir:directory+'/server',siteUrl:'https://staging.invalid',tier:'staging',fetch:backend})});
  const samples=[];
  for(const route of ['/product/profile-watch','/product/profile-watch?sort=featured&page=1','/shop/watches?q=first','/shop/watches?q=second']){
    const begin=performance.now(),readsBefore=reads;let status,headers,html;
    await run({method:'GET',url:route},{writeHead:(code,values)=>{status=code;headers=values;},end:value=>{html=value;},setHeader:()=>{}});
    if(status!==200||!html.includes('Profile Watch')||headers['Cache-Control']!=='no-store'||headers['X-Robots-Tag']!=='noindex, nofollow')throw new Error('Local profile SSR response failed');
    samples.push({route,totalMs:performance.now()-begin,reads:reads-readsBefore,timing:readServerTiming(headers['Server-Timing'])});
  }
  if(samples[0].timing.boot!=='INIT'||samples[1].timing.cache!=='HIT'||samples[1].reads!==0||samples[2].timing.cache!=='MISS'||samples[2].reads!==2)throw new Error('Expected cold/warm/uncached transitions did not occur');
  console.log(JSON.stringify({moduleImportMs,samples}));
}
if(process.argv.includes('--worker'))await worker();
else{
  const {build}=await import('vite');
  const define=Object.fromEntries(['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY','VITE_CONTACT_FORM_ENDPOINT','VITE_TURNSTILE_SITE_KEY'].map(name=>['import.meta.env.'+name,'""']));
  await build({mode:'test',define,build:{ssr:'server/entry.jsx',outDir:directory+'/server',manifest:false,rollupOptions:{output:{manualChunks:undefined}}}});
  await fs.mkdir(directory+'/client',{recursive:true});
  await fs.writeFile(directory+'/client/ssr-public.json',JSON.stringify(config));
  await fs.writeFile(directory+'/client/index.html','<!doctype html><html><head><title>Default</title><meta name="description" content="Default" /></head><body><div id="root"></div></body></html>');
  const runs=[];
  for(let index=0;index<3;index++){
    const processStart=performance.now();
    const output=await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,[fileURLToPath(import.meta.url),'--worker'],{windowsHide:true,stdio:['ignore','pipe','pipe'],timeout:15000});
      let stdout='',stderr='';child.stdout.on('data',bytes=>{stdout+=bytes;});child.stderr.on('data',bytes=>{stderr+=bytes;});
      child.on('error',reject);child.on('close',code=>code===0?resolve(stdout):reject(new Error('Local SSR worker failed: '+stderr)));
    });
    runs.push({processWallMs:performance.now()-processStart,...JSON.parse(output)});
  }
  const report={recordedAt:new Date().toISOString(),environment:'three fresh local Node processes; injected 25 ms public backend reads; all upstream network forbidden',runs};
  await fs.writeFile(directory+'/report.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
}
