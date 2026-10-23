import {spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';
import {readServerTiming} from './load-test.mjs';

// Six sequential diagnostic HTML reads, no preflight or cache-busting storm.
// A process cache MISS alone is not evidence of a cold serverless instance.
const hostArgument=process.argv.find(value=>value.startsWith('--deployment-host='));
const host=hostArgument?.slice('--deployment-host='.length);
if(host&&!/^o-ld-verge-[a-z0-9]+-abdullah-f9b8\.vercel\.app$/.test(host))throw new Error('Only this staging project’s generated deployment hostname is permitted');
const target=host?'https://'+host:'https://o-ld-verge.vercel.app';
if(!process.argv.includes('--run-approved'))throw new Error('Staging diagnostics require explicit approval');
const command='npm exec --yes --package vercel -- vercel api /v9/projects/prj_KLAre72Wg19Cmhz16wsanrI8Ftwv --scope abdullah-f9b8 --raw';
const cli=spawnSync(process.env.ComSpec||'cmd.exe',['/d','/s','/c',command],{cwd:'scripts/out/staging-deploy',encoding:'utf8',timeout:45000,maxBuffer:2*1024*1024,windowsHide:true});
if(cli.status!==0)throw new Error('Unable to inspect staging');
const project=JSON.parse(cli.stdout);
if(project.id!=='prj_KLAre72Wg19Cmhz16wsanrI8Ftwv'||project.ssoProtection?.deploymentType!=='all')throw new Error('Unexpected staging project/protection');
if(host){
 const inspection=spawnSync(process.env.ComSpec||'cmd.exe',['/d','/s','/c',`npm exec --yes --package vercel -- vercel api /v13/deployments/${host} --scope abdullah-f9b8 --raw`],{cwd:'scripts/out/staging-deploy',encoding:'utf8',timeout:45000,maxBuffer:2*1024*1024,windowsHide:true});
 if(inspection.status!==0)throw new Error('Cannot verify deployment');
 const deployment=JSON.parse(inspection.stdout);
 if(deployment.projectId!==project.id||deployment.readyState!=='READY'||deployment.regions?.length!==1||deployment.regions[0]!=='hnd1')throw new Error('Deployment must belong to existing staging and run in Tokyo');
}
const bypass=Object.keys(project.protectionBypass||{})[0];
if(!bypass)throw new Error('Existing staging credential unavailable');
const startedAt=new Date().toISOString();
const samples=[];
for(const route of ['/product/casio-a168','/product/casio-a168','/shop/watches?sort=price-asc','/search?q=casio','/search?q=casio','/about']){
 const start=performance.now();
 const response=await fetch(target+route,{method:'GET',redirect:'error',signal:AbortSignal.timeout(10000),headers:{'x-vercel-protection-bypass':bypass}});
 const headersMs=performance.now()-start;
 const html=await response.text();
 const sample={route,status:response.status,headersMs,totalMs:performance.now()-start,bytes:Buffer.byteLength(html),timing:readServerTiming(response.headers.get('server-timing')||''),noStore:response.headers.get('cache-control')==='no-store',noIndex:response.headers.get('x-robots-tag')==='noindex, nofollow',ssr:response.headers.get('x-oldverge-rendering')==='ssr'&&html.includes('data-ssr="public"')};
 samples.push(sample);
 if(sample.status!==200||!sample.noStore||!sample.noIndex||!sample.ssr)throw new Error('Staging diagnostic response failed safety/SSR checks');
}
const report={target,startedAt,requestCount:samples.length,concurrency:1,loadTest:false,samples};
const reportFile=`scripts/out/ssr-diagnostics-${startedAt.replace(/[:.]/g,'-')}.json`;
await fs.writeFile(reportFile,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({reportFile,...report},null,2));
