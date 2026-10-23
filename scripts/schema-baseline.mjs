import { compareManifests } from './schema-manifest.mjs';

export const stagingProject = 'qeczhyiwgvglilwqbveh';
export const requiredPostconditions = ['ordering_closed','admin_mfa_required','profiles_backfilled','private_settings_present','public_settings_present','cod_disabled','policy_rows_present','buckets_present'];

/** Plans history metadata repair only; it never executes migrations or connects to a database. */
export function planBaseline({project,expected,actual,postconditions,sources,history=[]}) {
  if(project !== stagingProject) throw new Error('Unexpected staging project');
  if(!expected.length || !compareManifests(expected,actual).matches) throw new Error('Schema drift must be resolved before baselining');
  if(requiredPostconditions.some(key=>postconditions[key]!==true)) throw new Error('Migration postconditions must all pass');
  const versions=sources.map(({name,sha256})=>{
    if(!/^\d{14}_[a-z0-9_]+\.sql$/.test(name)||!/^[a-f0-9]{64}$/.test(sha256)) throw new Error('Invalid migration source');
    return name.slice(0,14);
  });
  if(!versions.length || new Set(versions).size!==versions.length || versions.join()!==[...versions].sort().join()) throw new Error('Migration versions must be nonempty, unique and ordered');
  if(history.some(version=>!versions.includes(version))) throw new Error('Unexpected remote history');
  return versions.filter(version=>!history.includes(version));
}
