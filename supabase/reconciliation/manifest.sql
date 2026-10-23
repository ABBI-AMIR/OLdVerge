-- Read-only application schema snapshot. Never select customer/order/inventory row data.
-- Execute in a transaction with search_path=pg_catalog for stable deparser output.
with relations as (
  select c.*, n.nspname from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('public','private') and c.relkind in ('r','p','v','m','S')
), functions as (
  select p.*, n.nspname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname in ('public','private') and p.prokind='f'
    and not exists (select 1 from pg_depend d where d.classid='pg_proc'::regclass
      and d.objid=p.oid and d.deptype='e')
), roles as (select unnest(array['anon','authenticated','service_role']) as name), items as (
  select 'relation' as kind, r.nspname||'.'||r.relname as key,
    jsonb_build_object('kind',r.relkind,'rls',r.relrowsecurity,'force_rls',r.relforcerowsecurity,
      'persistence',r.relpersistence,'replica_identity',r.relreplident,
      'view',case when r.relkind in ('v','m') then pg_get_viewdef(r.oid,false) end,
      'options',r.reloptions) as definition from relations r
  union all
  select 'column',r.nspname||'.'||r.relname||'.'||a.attname,
    jsonb_build_object('position',a.attnum,'type',format_type(a.atttypid,a.atttypmod),
      'not_null',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid,false),
      'identity',a.attidentity,'generated',a.attgenerated)
  from relations r join pg_attribute a on a.attrelid=r.oid and a.attnum>0 and not a.attisdropped
    left join pg_attrdef d on d.adrelid=r.oid and d.adnum=a.attnum where r.relkind<>'S'
  union all
  select 'constraint',r.nspname||'.'||r.relname||'.'||c.conname,
    jsonb_build_object('sql',pg_get_constraintdef(c.oid,false),'validated',c.convalidated)
  from relations r join pg_constraint c on c.conrelid=r.oid
  union all
  select 'index',r.nspname||'.'||ci.relname,
    jsonb_build_object('sql',pg_get_indexdef(i.indexrelid),'valid',i.indisvalid,'ready',i.indisready)
  from relations r join pg_index i on i.indrelid=r.oid join pg_class ci on ci.oid=i.indexrelid
  union all
  select 'function',f.nspname||'.'||f.proname||'('||pg_get_function_identity_arguments(f.oid)||')',
    jsonb_build_object('sql',pg_get_functiondef(f.oid),'definer_owner',case when f.prosecdef then pg_get_userbyid(f.proowner) end)
  from functions f
  union all
  select 'trigger',n.nspname||'.'||c.relname||'.'||t.tgname,
    jsonb_build_object('sql',pg_get_triggerdef(t.oid,false),'enabled',t.tgenabled)
  from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace
    join pg_proc p on p.oid=t.tgfoid join pg_namespace pn on pn.oid=p.pronamespace
  where not t.tgisinternal and (n.nspname in ('public','private') or pn.nspname in ('public','private'))
  union all
  select 'policy',schemaname||'.'||tablename||'.'||policyname,
    jsonb_build_object('permissive',permissive,'roles',roles,'command',cmd,'using',qual,'check',with_check)
  from pg_policies where schemaname in ('public','private','storage')
  union all
  select 'schema_access',n.nspname||'.'||r.name,
    jsonb_build_object('usage',has_schema_privilege(r.name,n.oid,'USAGE'),'create',has_schema_privilege(r.name,n.oid,'CREATE'))
  from pg_namespace n cross join roles r where n.nspname in ('public','private')
  union all
  select 'table_access',t.nspname||'.'||t.relname||'.'||r.name,
    jsonb_object_agg(privilege,has_table_privilege(r.name,t.oid,privilege))
  from relations t cross join roles r cross join unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) privilege
  where t.relkind<>'S' group by t.nspname,t.relname,t.oid,r.name
  union all
  select 'column_access',t.nspname||'.'||t.relname||'.'||a.attname||'.'||r.name,
    jsonb_object_agg(privilege,has_column_privilege(r.name,t.oid,a.attnum,privilege))
  from relations t join pg_attribute a on a.attrelid=t.oid and a.attnum>0 and not a.attisdropped
    cross join roles r cross join unnest(array['SELECT','INSERT','UPDATE','REFERENCES']) privilege
  where t.relkind<>'S' group by t.nspname,t.relname,t.oid,a.attname,a.attnum,r.name
  union all
  select 'function_access',f.nspname||'.'||f.proname||'('||pg_get_function_identity_arguments(f.oid)||').'||r.name,
    jsonb_build_object('execute',has_function_privilege(r.name,f.oid,'EXECUTE')) from functions f cross join roles r
  union all
  select 'sequence',t.nspname||'.'||t.relname,
    jsonb_build_object('type',format_type(s.seqtypid,null),'start',s.seqstart,'increment',s.seqincrement,
      'min',s.seqmin,'max',s.seqmax,'cache',s.seqcache,'cycle',s.seqcycle)
  from relations t join pg_sequence s on s.seqrelid=t.oid
  union all
  select 'sequence_access',t.nspname||'.'||t.relname||'.'||r.name,
    jsonb_object_agg(privilege,has_sequence_privilege(r.name,t.oid,privilege))
  from relations t cross join roles r cross join unnest(array['SELECT','UPDATE','USAGE']) privilege
  where t.relkind='S' group by t.nspname,t.relname,t.oid,r.name
  union all
  select 'bucket',id,jsonb_build_object('public',public,'file_size_limit',file_size_limit,'allowed_mime_types',allowed_mime_types)
  from storage.buckets where id in ('product-public','product-private','order-private')
)
select coalesce(jsonb_agg(jsonb_build_object('kind',kind,'key',key,'definition',definition) order by kind,key),'[]'::jsonb) as manifest from items;
