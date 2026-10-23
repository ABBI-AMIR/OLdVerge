-- Login merges use the larger quantity, never addition: repeated login/retry is idempotent.
create or replace function public.sync_customer_cart(p_lines jsonb default '[]'::jsonb)
returns table (
  id uuid,
  variant_id uuid,
  quantity integer,
  product_id uuid,
  product_slug text,
  product_name text,
  size text,
  color text,
  price_pkr integer,
  available boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_item jsonb;
  v_vid uuid;
  v_qty integer;
  v_exists boolean;
begin
  if v_uid is null then
    raise exception 'ov_error:unauthenticated' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));

  if p_lines is not null and jsonb_typeof(p_lines) = 'array' then
    for v_item in select * from jsonb_array_elements(p_lines)
    loop
      begin
        v_vid := (v_item->>'variant_id')::uuid;
        v_qty := coalesce((v_item->>'quantity')::integer, 1);
      exception when others then
        continue;
      end;

      if v_vid is null or v_qty is null or v_qty < 1 then
        continue;
      end if;

      -- Check variant validity
      select exists (
        select 1 from public.product_variants pv
        join public.products p on p.id = pv.product_id
        where pv.id = v_vid and pv.active = true and p.status = 'published'
      ) into v_exists;

      if v_exists then
        insert into public.customer_cart_items as cci (user_id, variant_id, quantity)
        values (v_uid, v_vid, least(9, v_qty))
        on conflict on constraint uq_customer_cart_user_variant do update
        set quantity = greatest(cci.quantity, excluded.quantity),
            updated_at = now();
      end if;
    end loop;
  end if;

  -- Clean up any cart items where variant or product is no longer active
  delete from public.customer_cart_items as c
  where c.user_id = v_uid
    and not exists (
      select 1 from public.product_variants pv
      join public.products p on p.id = pv.product_id
      where pv.id = c.variant_id and pv.active = true and p.status = 'published'
    );

  return query
  select
    c.id,
    c.variant_id,
    c.quantity,
    p.id as product_id,
    p.slug as product_slug,
    p.name as product_name,
    pv.size_label as size,
    pv.color_name as color,
    pv.price_pkr,
    (coalesce(inv.on_hand, 0) - coalesce(inv.reserved, 0)) >= c.quantity as available
  from public.customer_cart_items as c
  join public.product_variants as pv on pv.id = c.variant_id
  join public.products as p on p.id = pv.product_id
  left join public.inventory as inv on inv.variant_id = c.variant_id
  where c.user_id = v_uid
  order by c.created_at asc;
end;
$$;

revoke all on function public.sync_customer_cart(jsonb) from public, anon;
grant execute on function public.sync_customer_cart(jsonb) to authenticated, service_role;

-- Signed-in edits replace the snapshot atomically, including deletions and checkout clearing.
create or replace function public.replace_customer_cart(p_lines jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'ov_error:unauthenticated' using errcode = '42501'; end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) > 100 then
    raise exception 'ov_error:invalid_lines';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
  delete from public.customer_cart_items where user_id = v_uid;
  perform * from public.sync_customer_cart(p_lines);
end;
$$;
revoke all on function public.replace_customer_cart(jsonb) from public, anon;
grant execute on function public.replace_customer_cart(jsonb) to authenticated;
