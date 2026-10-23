import { lookup } from 'node:dns/promises';
import { performance } from 'node:perf_hooks';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function validateTarget(target,{allowedOrigin,local=false}={}) {
  const url=new URL(target);
  if(url.username||url.password||url.search||url.hash||url.pathname!=='/') throw new Error('Use an origin without credentials, path, query or fragment');
  if(local) { if(url.protocol!=='http:'||url.hostname!=='127.0.0.1') throw new Error('Local tests require loopback'); }
  else if(url.protocol!=='https:'||url.origin!==allowedOrigin) throw new Error('Remote testing requires HTTPS and LOAD_TEST_ALLOWED_ORIGIN matching the approved target');
  return url.origin;
}
export const percentile=(values,p)=>values.length?values.slice().sort((a,b)=>a-b)[Math.min(values.length-1,Math.ceil(values.length*p)-1)]:0;
const latencySummary=values=>({p50:percentile(values,.5),p95:percentile(values,.95),p99:percentile(values,.99),max:Math.max(0,...values)});
// Parse only our fixed diagnostic names. Never save raw response headers,
// which could contain deployment-protection cookies or other credentials.
export function readServerTiming(header='') {
  const result={};
  const fields=['data','render','ssr','catalog','products','policy','init','app',...['catalog','products','policy'].flatMap(phase=>['headers','body','json','gateway','upstream'].map(part=>phase+'_'+part))];
  for(const name of fields) {
    const match=header.match(new RegExp(`(?:^|,)\\s*${name};dur=(\\d+(?:\\.\\d+)?)(?=\\s*(?:,|$))`));
    if(match&&Number.isFinite(Number(match[1]))) result[name]=Number(match[1]);
  }
  const cache=header.match(/(?:^|,)\s*cache;desc="(HIT|MISS|COALESCED)"(?=\s*(?:,|$))/);
  if(cache) result.cache=cache[1];
  const boot=header.match(/(?:^|,)\s*boot;desc="(INIT|WAIT|READY)"(?=\s*(?:,|$))/);
  if(boot)result.boot=boot[1];
  return result;
}
export async function runLoad({target,allowedOrigin,local=false,rps=5,duration=20,concurrency=8,paths=['/','/shop/watches','/search?q=watch','/privacy-policy'],fetch:fetcher=fetch,reportPath}={}) {
  const origin=validateTarget(target,{allowedOrigin,local});
  if(!Number.isInteger(rps)||rps<1||rps>20||!Number.isInteger(duration)||duration<1||duration>60||!Number.isInteger(concurrency)||concurrency<1||concurrency>16) throw new Error('Limits: 1–20 rps, 1–60 seconds, 1–16 connections');
  if(!paths.length||paths.some(value=>!/^\/(?:\?|$|shop(?:\/watches|\/quarter-zips)?(?:\?|$)|search(?:\?|$)|product\/[a-z0-9-]+(?:\?|$)|privacy-policy(?:\?|$)|about(?:\?|$))/.test(value)||value.includes('#')||value.length>200)) throw new Error('Only public read-only browse paths are permitted');
  if(!local) {
    const addresses=await lookup(new URL(origin).hostname,{all:true});
    if(addresses.some(({address})=>/^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|::|fc|fd|fe80:)/i.test(address))) throw new Error('Remote target resolves to a private address');
  }
  // Preflight does not count toward latency statistics; reject non-SSR or misconfigured targets.
  const preflight=await fetcher(origin+'/',{redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!preflight.ok||preflight.headers.get('x-oldverge-rendering')!=='ssr') throw new Error('Target is not a healthy Oldverge SSR deployment');
  await preflight.body?.cancel();
  const samples=[];const statuses={};const routeSamples=new Map();let failed=0,skipped=0,bytes=0,active=0,peak=0;
  const startedAt=new Date().toISOString();
  const running=new Set();const start=performance.now();const total=rps*duration;
  for(let index=0;index<total;index++) {
    const delay=start+index*1000/rps-performance.now();if(delay>0)await new Promise(resolve=>setTimeout(resolve,delay));
    if(active>=concurrency){skipped++;continue;}
    const task=(async()=>{
      active++;peak=Math.max(peak,active);const begin=performance.now();
      const route=paths[index%paths.length];
      if(!routeSamples.has(route)) routeSamples.set(route,{latency:[],headers:[],failed:0,cache:{},data:[],render:[],ssr:[]});
      const measurements=routeSamples.get(route);let success=false;
      try {
        const response=await fetcher(origin+route,{method:'GET',redirect:'error',signal:AbortSignal.timeout(5000),headers:{'User-Agent':'Oldverge-read-only-load-test'}});
        measurements.headers.push(performance.now()-begin);
        const timing=readServerTiming(response.headers.get('server-timing')||'');
        if(timing.cache) measurements.cache[timing.cache]=(measurements.cache[timing.cache]||0)+1;
        for(const name of ['data','render','ssr']) if(timing[name]!==undefined) measurements[name].push(timing[name]);
        statuses[response.status]=(statuses[response.status]||0)+1;
        const html=await response.text();bytes+=Buffer.byteLength(html);
        success=response.status===200&&response.headers.get('x-oldverge-rendering')==='ssr'&&html.includes('data-ssr="public"');
        if(!success)failed++;
      } catch {failed++;statuses.network=(statuses.network||0)+1;}
      finally{const elapsed=performance.now()-begin;samples.push(elapsed);measurements.latency.push(elapsed);if(!success)measurements.failed++;active--;}
    })();running.add(task);task.finally(()=>running.delete(task));
  }
  await Promise.all(running);
  const report={target:origin,environment:local?'local-production-build':'remote',startedAt,rps,duration,planned:total,completed:samples.length,failed,skipped,peakConcurrency:peak,statuses,responseBytes:bytes,
    latencyMs:latencySummary(samples),byPath:Object.fromEntries([...routeSamples].map(([route,values])=>[route,{completed:values.latency.length,failed:values.failed,latencyMs:latencySummary(values.latency),headersMs:latencySummary(values.headers),cache:values.cache,serverTimingMs:Object.fromEntries(['data','render','ssr'].map(name=>[name,{samples:values[name].length,...latencySummary(values[name])}]))}])),passed:failed===0&&skipped===0&&percentile(samples,.95)<1500};
  if(reportPath){await fs.mkdir(path.dirname(reportPath),{recursive:true});await fs.writeFile(reportPath,JSON.stringify(report,null,2)+'\n');}
  return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 if(process.env.LOAD_TEST_ENABLE_REMOTE!=='true') throw new Error('Remote load testing is disabled. Only local testing is authorized for this task.');
 const report=await runLoad({target:process.env.LOAD_TEST_TARGET,allowedOrigin:process.env.LOAD_TEST_ALLOWED_ORIGIN,rps:Number(process.env.LOAD_TEST_RPS||5),duration:Number(process.env.LOAD_TEST_SECONDS||20),reportPath:'scripts/out/load-remote.json'});
 console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
}
