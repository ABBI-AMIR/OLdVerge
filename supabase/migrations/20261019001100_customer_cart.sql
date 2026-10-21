-- =========================================================================
-- Migration 20261019001100_customer_cart.sql
-- Persistent customer shopping carts in Supabase:
-- Allows authenticated customers to synchronize and persist their cart lines across devices.
-- Guest carts remain stored locally in the browser and merge cleanly upon sign-in.
-- =========================================================================

create table public.customer_cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity integer not null check (quantity between 1 and 9),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_customer_cart_user_variant unique (user_id, variant_id)
);

comment on table public.customer_cart_items is 'Customer shopping carts persisted across devices for authenticated accounts.';

create index idx_customer_cart_user on public.customer_cart_items (user_id);
create index idx_customer_cart_variant on public.customer_cart_items (variant_id);

create trigger touch_customer_cart_updated_at
before update on public.customer_cart_items
for each row execute function private.touch_updated_at();

alter table public.customer_cart_items enable row level security;

-- Row Level Security: Customers can only access and manipulate their own cart items.
create policy customer_cart_select on public.customer_cart_items
  for select to authenticated
  using (auth.uid() = user_id);

create policy customer_cart_insert on public.customer_cart_items
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy customer_cart_update on public.customer_cart_items
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy customer_cart_delete on public.customer_cart_items
  for delete to authenticated
  using (auth.uid() = user_id);

-- Explicit privileges
revoke all on public.customer_cart_items from public, anon;
grant select, insert, update, delete on public.customer_cart_items to authenticated;
grant all on public.customer_cart_items to service_role;

-- Synchronize / merge cart items atomically on login or checkout.
-- Takes [{ variant_id: uuid, quantity: int }] and merges with user's remote cart.
-- If user already has an item, quantities are combined (capped at 9).
-- Verifies variant exists, is active, and parent product is published.
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
        set quantity = least(9, cci.quantity + excluded.quantity),
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
