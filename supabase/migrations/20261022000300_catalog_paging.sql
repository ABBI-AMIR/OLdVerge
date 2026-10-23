-- Bounded server-side collection/search pages. Invoker rights preserve existing catalogue RLS.
create or replace function public.catalog_page(
 p_category text default null, p_query text default '', p_filters jsonb default '{}',
 p_sort text default 'featured', p_page integer default 1, p_size integer default 24
) returns jsonb language sql stable security invoker set search_path = '' as $$
with base as (
 select p.id,p.slug,p.name,p.sort_order,p.description,p.style,c.name as category_name,
 coalesce(b.name,'OLDVERGE') as brand,
 regexp_replace(lower(coalesce(b.name,'OLDVERGE')),'[^a-z0-9]+','-','g') as brand_slug,
 coalesce(v.price,0) as price,coalesce(v.colors,'[]'::jsonb) as colors,coalesce(v.sizes,'[]'::jsonb) as sizes
 from public.products p join public.categories c on c.id=p.category_id
 left join public.brands b on b.id=p.brand_id
 left join lateral (
  select min(price_pkr) as price,jsonb_agg(distinct color_name) filter(where color_name is not null) as colors,
   jsonb_agg(distinct coalesce(size_label,'One size')) as sizes
  from public.product_variants where product_id=p.id and active
 ) v on true
 where p.status='published' and (p_category is null or c.slug=p_category)
), filtered as (
 select * from base x where
 not exists(select 1 from regexp_split_to_table(lower(left(trim(coalesce(p_query,'')),80)),'\s+') word where word<>'' and
  position(word in lower(concat_ws(' ',x.name,x.description,x.brand,x.style,x.category_name,x.colors::text)))=0)
 and (coalesce(p_filters->'brand','[]')='[]'::jsonb or (p_filters->'brand') ? x.brand_slug)
 and (coalesce(p_filters->'style','[]')='[]'::jsonb or (p_filters->'style') ? regexp_replace(lower(coalesce(x.style,'')),'[^a-z0-9]+','-','g'))
 and (coalesce(p_filters->'colour','[]')='[]'::jsonb or exists(select 1 from jsonb_array_elements_text(x.colors) color where (p_filters->'colour') ? regexp_replace(lower(color),'[^a-z0-9]+','-','g')))
 and (coalesce(p_filters->'size','[]')='[]'::jsonb or exists(select 1 from jsonb_array_elements_text(x.sizes) size where (p_filters->'size') ? lower(size)))
 and (p_filters->>'priceMin' is null or x.price >= (p_filters->>'priceMin')::integer)
 and (p_filters->>'priceMax' is null or x.price <= (p_filters->>'priceMax')::integer)
), page as (
 select * from filtered order by
 case when p_sort='price-asc' then price end asc,
 case when p_sort='price-desc' then price end desc,
 sort_order,name,id limit greatest(1,least(coalesce(p_size,24),48))
 offset ((greatest(1,least(coalesce(p_page,1),1000000))-1)::bigint * greatest(1,least(coalesce(p_size,24),48)))
), facets as (
 select 'brand' as kind,brand_slug as id,brand as name,count(*) as count from base group by brand_slug,brand
 union all select 'style',regexp_replace(lower(style),'[^a-z0-9]+','-','g'),style,count(*) from base where style<>'' group by style
 union all select 'colour',regexp_replace(lower(color),'[^a-z0-9]+','-','g'),color,count(*) from base,jsonb_array_elements_text(colors) color group by color
 union all select 'size',lower(size),size,count(*) from base,jsonb_array_elements_text(sizes) size group by size
)
select jsonb_build_object('slugs',coalesce((select jsonb_agg(slug) from page),'[]'::jsonb),
 'total',(select count(*) from filtered),
 'facets',coalesce((select jsonb_object_agg(kind,options) from (
 select kind,jsonb_agg(jsonb_build_object('id',id,'name',name,'count',count) order by name) as options from facets group by kind) f),'{}'::jsonb),
 'price',(select jsonb_build_object('min',min(price),'max',max(price)) from base));
$$;
revoke all on function public.catalog_page(text,text,jsonb,text,integer,integer) from public;
grant execute on function public.catalog_page(text,text,jsonb,text,integer,integer) to anon,authenticated;
create index if not exists product_variants_active_price_idx on public.product_variants(product_id,price_pkr) where active;
create index if not exists products_catalog_order_idx on public.products(sort_order,name,id) where status='published';
