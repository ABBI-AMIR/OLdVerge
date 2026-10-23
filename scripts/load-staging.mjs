import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runLoad } from './load-test.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const target='https://o-ld-verge.vercel.app';
// Fixed read-only CLI command. Its JSON can contain credentials: capture it in
// memory, never log it or write it to a report/environment file.
const command='npm exec --yes --package vercel -- vercel api /v9/projects/prj_KLAre72Wg19Cmhz16wsanrI8Ftwv --scope abdullah-f9b8 --raw';
const cli=spawnSync(process.env.ComSpec||'cmd.exe',['/d','/s','/c',command],{cwd:path.join(root,'scripts/out/staging-deploy'),encoding:'utf8',timeout:45000,maxBuffer:2*1024*1024,windowsHide:true});
if(cli.status!==0) throw new Error('Unable to read the existing staging access configuration through the authenticated CLI');
let project; try {project=JSON.parse(cli.stdout);} catch {throw new Error('Unexpected staging access response');}
if(project.id!=='prj_KLAre72Wg19Cmhz16wsanrI8Ftwv'||project.name!=='o-ld-verge') throw new Error('Unexpected staging project');
if(process.argv.includes('--inspect')) {
  console.log(JSON.stringify({project:project.name,protectionType:project.ssoProtection?.deploymentType,existingBypassCount:Object.keys(project.protectionBypass||{}).length}));
  process.exit(0);
}
if(!process.argv.includes('--run-approved')) throw new Error('Remote load execution requires --run-approved and fresh user authorization');
if(project.ssoProtection?.deploymentType!=='all') throw new Error('Staging must retain All Deployments authentication');
const bypass=Object.keys(project.protectionBypass||{})[0];
if(!bypass) throw new Error('No existing staging automation credential is available; no access settings were changed');
const protectedFetch=(url,options={})=>{
  if(new URL(url).origin!==target||(options.method&&options.method!=='GET')||options.body) throw new Error('Only approved staging GET requests are permitted');
  const headers=new Headers(options.headers);headers.set('x-vercel-protection-bypass',bypass);
  return fetch(url,{...options,headers,redirect:'error'});
};
const paths=['/','/shop/watches','/search?q=watch','/product/casio-a168'];
const report=await runLoad({target,allowedOrigin:target,rps:5,duration:20,concurrency:8,paths,fetch:protectedFetch});
Object.assign(report,{paths,protectionEnabled:true,requestType:'HTML GET only; no browser JavaScript or asset fetching',preflightRequests:1});
// Keep every approved run independently so before/after evidence survives.
const reportFile=`scripts/out/load-staging-${report.startedAt.replace(/[:.]/g,'-')}.json`;
await fs.writeFile(path.join(root,reportFile),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({reportFile}));
console.log(JSON.stringify(report,null,2));
if(!report.passed)process.exitCode=1;
