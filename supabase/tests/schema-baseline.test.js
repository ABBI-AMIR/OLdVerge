import { describe, expect, it } from 'vitest';
import { planBaseline,requiredPostconditions,stagingProject } from '../../scripts/schema-baseline.mjs';

const input=()=>({project:stagingProject,expected:[{kind:'relation',key:'public.products',definition:{rls:true}}],actual:[{kind:'relation',key:'public.products',definition:{rls:true}}],postconditions:Object.fromEntries(requiredPostconditions.map(key=>[key,true])),sources:[{name:'20261019000100_core_catalog.sql',sha256:'a'.repeat(64)},{name:'20261022000100_cart_sync.sql',sha256:'b'.repeat(64)}]});
describe('migration history baseline safety',()=>{
  it('plans only absent verified versions and is idempotent',()=>{
    const args=input();
    expect(planBaseline(args)).toEqual(['20261019000100','20261022000100']);
    expect(planBaseline({...args,history:['20261019000100']})).toEqual(['20261022000100']);
    expect(planBaseline({...args,history:['20261019000100','20261022000100']})).toEqual([]);
  });
  it('refuses wrong project, drift, empty evidence and unknown remote versions',()=>{
    expect(()=>planBaseline({...input(),project:'production'})).toThrow('project');
    expect(()=>planBaseline({...input(),actual:[]})).toThrow('drift');
    expect(()=>planBaseline({...input(),expected:[],actual:[]})).toThrow('drift');
    expect(()=>planBaseline({...input(),history:['20261023000100']})).toThrow('history');
  });
  it('refuses each missing/failed postcondition, including closed ordering and MFA',()=>{
    for(const key of requiredPostconditions){
      const args=input();delete args.postconditions[key];
      expect(()=>planBaseline(args)).toThrow('postconditions');
      args.postconditions[key]=false;
      expect(()=>planBaseline(args)).toThrow('postconditions');
    }
  });
  it('refuses malformed hashes, duplicate versions and reordered migrations',()=>{
    const args=input();
    expect(()=>planBaseline({...args,sources:[{...args.sources[0],sha256:'unknown'}]})).toThrow('source');
    expect(()=>planBaseline({...args,sources:[args.sources[0],args.sources[0]]})).toThrow('unique');
    expect(()=>planBaseline({...args,sources:[...args.sources].reverse()})).toThrow('ordered');
  });
});
