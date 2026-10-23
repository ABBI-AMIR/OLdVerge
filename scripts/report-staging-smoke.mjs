import fs from 'node:fs/promises';
const cases=[['home',200,'ssr'],['product',200,'ssr'],['missing',404,null],['account',200,'client-private'],['alias',308,null]];
const results=[];
for(const [name,expected,rendering] of cases) {
  const base='scripts/out/staging-'+name;
  let raw,html; try {[raw,html]=await Promise.all([fs.readFile(base+'.headers','utf8'),fs.readFile(base+'.html','utf8')]);} catch {continue;}
  const status=Number([...raw.matchAll(/HTTP\/[^ ]+ (\d+)/g)].at(-1)?.[1]);
  const allowed=['cache-control','x-robots-tag','x-oldverge-rendering','content-type','location'];
  const headers=Object.fromEntries(raw.split(/\r?\n/).filter(line=>allowed.some(name=>line.toLowerCase().startsWith(name+':'))).map(line=>{const index=line.indexOf(':');return[line.slice(0,index).toLowerCase(),line.slice(index+1).trim()];}));
  // Exclude authentication redirect URLs, cookies, credentials, and raw HTML from reports.
  if(headers.location?.includes('?')) headers.location=headers.location.split('?')[0];
  const ssr=html.includes('data-ssr="public"');
  const snapshot=html.includes('id="ov-ssr-state"');
  let productDataValid;
  if(name==='product') {
    const state=JSON.parse(html.match(/<script type="application\/json" id="ov-ssr-state">([\s\S]*?)<\/script>/)?.[1]||'null');
    productDataValid=state?.products?.[0]?.price>0&&state.products[0].variants?.length>0&&state.products[0].images?.length>0&&html.includes('<img');
  }
  const passed=status===expected&&(!rendering||headers['x-oldverge-rendering']===rendering)&&headers['cache-control']==='no-store'&&headers['x-robots-tag']==='noindex, nofollow'&&(rendering!=='ssr'||(ssr&&snapshot))&&(name!=='account'||!snapshot)&&(name!=='alias'||headers.location==='/shop')&&(name!=='product'||productDataValid);
  results.push({name,status,headers,ssr,snapshot,productDataValid,bytes:Buffer.byteLength(html),title:html.match(/<title>(.*?)<\/title>/)?.[1],passed});
}
const report={checkedAt:new Date().toISOString(),results,passed:results.length===cases.length&&results.every(result=>result.passed)};
await fs.writeFile('scripts/out/staging-smoke.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(!report.passed) process.exitCode=1;
