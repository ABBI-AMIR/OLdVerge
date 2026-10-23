import {describe,it,expect,vi} from 'vitest';
import http from 'node:http';
import {formatPrice} from '../lib/money.js';
import {createPublicData,publicRoute,gatewayTimings} from '../../server/public-data.js';
import {readServerTiming} from '../../scripts/load-test.mjs';
import {coldStartEvidence} from '../../scripts/cold-start-evidence.mjs';

describe('provider-confirmed cold evidence',()=>{
 it('does not mistake INIT, a fresh deployment or bytecode miss for a provider cold start',()=>{
   expect(coldStartEvidence({applicationBoot:'INIT'})).toEqual({startType:'unknown',confirmedCold:false,coldDurationMs:null,applicationInitialized:true});
   expect(coldStartEvidence({providerStartType:'Hot (prewarmed)',providerColdDurationMs:55,applicationBoot:'INIT'})).toMatchObject({startType:'prewarmed',confirmedCold:false,coldDurationMs:null});
 });
 it('keeps provider cold duration separate from application initialization and rejects invented durations',()=>{
   expect(coldStartEvidence({providerStartType:'Cold',providerColdDurationMs:280,applicationBoot:'READY'})).toMatchObject({confirmedCold:true,coldDurationMs:280,applicationInitialized:false});
   for(const duration of [undefined,-1,Infinity,'280'])expect(coldStartEvidence({providerStartType:'Cold',providerColdDurationMs:duration}).coldDurationMs).toBeNull();
 });
});

describe('cold-render price formatting',()=>{
 it('preserves locale formatting at grouping boundaries and whole-PKR limits without initializing ICU',()=>{
   const amounts=[0,1,999,1000,16900,999999,1000000,2147483647,Number.MAX_SAFE_INTEGER];
   const reference=amounts.map(value=>'PKR '+new Intl.NumberFormat('en-PK',{maximumFractionDigits:0}).format(value));
   const formatter=vi.spyOn(Intl,'NumberFormat');
   try{expect(amounts.map(formatPrice)).toEqual(reference);expect(formatter).not.toHaveBeenCalled();}finally{formatter.mockRestore();}
 });
 it('preserves the existing fallback and rounding for values outside the whole-PKR domain',()=>{
   for(const value of [-0,-1000,12.5,1234.4,'16900',NaN,Infinity])expect(formatPrice(value)).toBe('PKR '+new Intl.NumberFormat('en-PK',{maximumFractionDigits:0}).format(value));
 });
});
describe('upstream latency evidence',()=>{
 it('accepts only bounded numeric gateway durations without reflecting other headers',()=>{
   expect(gatewayTimings(new Headers({'x-kong-proxy-latency':'2.5','x-kong-upstream-latency':'13','set-cookie':'private=secret'}))).toEqual({gateway:2.5,upstream:13});
   for(const value of ['-1','NaN','Infinity','60001','private-token',''])expect(gatewayTimings(new Headers({'x-kong-proxy-latency':value}))).toEqual({});
   expect(gatewayTimings(new Headers())).toEqual({});
 });
 it('separates header wait, body consumption and decoding and leaves missing gateway timing absent',async()=>{
   const fetch=vi.fn(async()=>new Response(JSON.stringify([{slug:'watch',name:'Watch',product_variants:[],product_images:[]}]),{headers:{'x-kong-upstream-latency':'3','x-kong-proxy-latency':'1'}}));
   const observed={};const load=createPublicData({config:{mode:'supabase',configured:true,url:'https://public.test',key:'public-fixture'},fetch});
   await load(publicRoute('/product/watch'),{onTiming:(name,duration)=>{observed[name]=duration;}});
   expect(observed).toMatchObject({products_headers:expect.any(Number),products_body:expect.any(Number),products_json:expect.any(Number),products_gateway:1,products_upstream:3});
   expect(readServerTiming('products_headers;dur=100, products_body;dur=1, products_json;dur=0.2, products_gateway;dur=1, products_upstream;dur=3')).toEqual({products_headers:100,products_body:1,products_json:.2,products_gateway:1,products_upstream:3});
 });
 it('reuses a completed upstream connection across sequential uncached public reads',async()=>{
   const connections=new Set();let reads=0;
   const server=http.createServer((req,res)=>{connections.add(req.socket.remotePort);reads++;res.setHeader('content-type','application/json');res.end(JSON.stringify([{slug:'watch',name:'Watch',product_variants:[],product_images:[]} ]));});
   await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
   try{
     const load=createPublicData({config:{mode:'supabase',configured:true,url:'http://127.0.0.1:'+server.address().port,key:'fixture'}});
     for(let index=0;index<4;index++){await load(publicRoute('/product/watch'));await new Promise(setImmediate);}
     expect(reads).toBe(4);expect(connections.size).toBe(1);
   }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 });
});
