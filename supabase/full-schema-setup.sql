-- =========================================================================
-- OLDVERGE STOREFRONT - COMPLETE DATABASE SETUP SCRIPT
-- Concatenated in chronological order from supabase/migrations/
-- Safe to run in Supabase SQL Editor
-- =========================================================================

-- >>> START MIGRATION: 20261019000100_core_catalog.sql <<<
-- OLDVERGE core catalogue: categories, brands, products, variants, images.
-- Money is whole PKR in integer columns (never floats). Every table has RLS enabled in the
-- policies migration; grants are managed explicitly (nothing is granted by default).

create schema if not exists private;
comment on schema private is 'Not exposed through the Data API. Holds guest-access hashes, idempotency records, rate limits and webhook records.';
revoke all on schema private from public;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 80),
  parent_id uuid references public.categories (id) on delete restrict,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 1 and 80),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  legacy_id text unique,
  name text not null check (char_length(name) between 1 and 160),
  description text not null default '' check (char_length(description) <= 4000),
  category_id uuid not null references public.categories (id) on delete restrict,
  brand_id uuid references public.brands (id) on delete restrict,
  kind text not null check (kind in ('watch', 'clothing')),
  style text check (style is null or char_length(style) <= 60),
  -- Products that are colour siblings of each other share a group_key (the existing colour-swatch routes).
  group_key text check (group_key is null or group_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  -- Owner has verified price, stock and photo for real selling. Browsing and buying are separate gates.
  ready_to_sell boolean not null default false,
  sort_order integer not null default 0,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not ready_to_sell or status = 'published')
);
create index products_status_idx on public.products (status, sort_order);
create index products_category_idx on public.products (category_id);
create index products_brand_idx on public.products (brand_id);
create index products_group_idx on public.products (group_key) where group_key is not null;

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text not null unique check (sku ~ '^[A-Za-z0-9][A-Za-z0-9._-]{2,39}$'),
  color_name text check (color_name is null or char_length(color_name) between 1 and 40),
  color_hex text check (color_hex is null or color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  size_label text check (size_label is null or char_length(size_label) between 1 and 20),
  price_pkr integer not null check (price_pkr >= 0 and price_pkr <= 100000000),
  currency text not null default 'PKR' check (currency = 'PKR'),
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- One variant per option combination, including the case where an option is null.
create unique index product_variants_option_uidx
  on public.product_variants (product_id, coalesce(color_name, ''), coalesce(size_label, ''));
create index product_variants_product_idx on public.product_variants (product_id, sort_order);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  bucket text not null check (bucket in ('product-public', 'product-private')),
  path text not null check (char_length(path) between 3 and 300 and path !~ '\.\.' and path !~ '^/'),
  kind text not null default 'photo' check (kind in ('photo', 'cutout')),
  alt_text text not null default '' check (char_length(alt_text) <= 200),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  source_name text,
  source_url text,
  licence text,
  attribution text,
  retrieved_on date,
  approval_status text not null default 'unverified' check (approval_status in ('unverified', 'approved', 'rejected')),
  approved_by uuid,
  approved_at timestamptz,
  checksum_sha256 text check (checksum_sha256 is null or checksum_sha256 ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket, path),
  -- Only approved images may live in the public bucket (a public bucket cannot hide drafts).
  check (bucket <> 'product-public' or approval_status = 'approved')
);
create unique index product_images_one_cover_uidx on public.product_images (product_id) where is_cover;
create index product_images_product_idx on public.product_images (product_id, sort_order);

-- Editorial and site images (hero, category tiles, story). Same approval rules as product images.
create table public.site_images (
  key text primary key check (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  bucket text not null check (bucket in ('product-public', 'product-private')),
  path text not null check (char_length(path) between 3 and 300 and path !~ '\.\.' and path !~ '^/'),
  alt_text text not null default '' check (char_length(alt_text) <= 200),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  source_name text,
  source_url text,
  licence text,
  approval_status text not null default 'unverified' check (approval_status in ('unverified', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (bucket <> 'product-public' or approval_status = 'approved')
);

create trigger categories_touch before update on public.categories for each row execute function private.touch_updated_at();
create trigger brands_touch before update on public.brands for each row execute function private.touch_updated_at();
create trigger products_touch before update on public.products for each row execute function private.touch_updated_at();
create trigger product_variants_touch before update on public.product_variants for each row execute function private.touch_updated_at();
create trigger product_images_touch before update on public.product_images for each row execute function private.touch_updated_at();
create trigger site_images_touch before update on public.site_images for each row execute function private.touch_updated_at();

alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.site_images enable row level security;


-- >>> START MIGRATION: 20261019000200_accounts_admin_config.sql <<<
-- Accounts, admin membership, store configuration, shipping, payment methods and policies.

-- ---------------------------------------------------------------- admin membership
-- Lives in the private schema: not reachable through the Data API. Rows are created only by
-- a deliberate server-side statement (see docs/supabase-setup.md), never by signup or profile edits.
create table private.admin_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'staff')),
  created_at timestamptz not null default now(),
  created_by text
);

create table private.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into private.settings (key, value) values
  ('require_mfa', 'false'::jsonb),             -- when true, admin access needs an aal2 (TOTP) session
  ('reservation_minutes', '30'::jsonb),        -- online-payment stock reservation window
  ('order_access_days', '90'::jsonb);          -- lifetime of a guest order access link

create or replace function public.is_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  mfa boolean;
begin
  if uid is null then return false; end if;
  if not exists (select 1 from private.admin_members m where m.user_id = uid) then return false; end if;
  select coalesce((s.value)::text::boolean, false) into mfa from private.settings s where s.key = 'require_mfa';
  if coalesce(mfa, false) and coalesce((select auth.jwt()) ->> 'aal', '') <> 'aal2' then return false; end if;
  return true;
end;
$$;

create or replace function public.admin_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.is_admin() then (select m.role from private.admin_members m where m.user_id = (select auth.uid())) end;
$$;

-- ---------------------------------------------------------------- customers
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  phone text not null default '' check (char_length(phone) <= 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null default 'Home' check (char_length(label) between 1 and 40),
  recipient text not null check (char_length(recipient) between 1 and 120),
  phone text not null check (char_length(phone) between 5 and 30),
  line1 text not null check (char_length(line1) between 1 and 200),
  line2 text not null default '' check (char_length(line2) <= 200),
  city text not null check (char_length(city) between 1 and 80),
  province text not null check (char_length(province) between 1 and 80),
  postal_code text not null default '' check (char_length(postal_code) <= 12),
  country text not null default 'PK' check (country = 'PK'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);
create unique index addresses_one_default_uidx on public.addresses (user_id) where is_default;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only a display name is read from signup metadata. Roles are never derived from user-editable data.
  insert into public.profiles (user_id, display_name)
  values (new.id, left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), ''), 80))
  on conflict (user_id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();

create or replace function private.limit_addresses()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.addresses a where a.user_id = new.user_id) >= 10 then
    raise exception 'ov_error:too_many_addresses' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger addresses_limit before insert on public.addresses for each row execute function private.limit_addresses();
create trigger profiles_touch before update on public.profiles for each row execute function private.touch_updated_at();
create trigger addresses_touch before update on public.addresses for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------- store settings
create table public.store_settings (
  key text primary key check (key ~ '^[a-z0-9_.]+$'),
  value jsonb not null,
  is_public boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.store_settings (key, value, is_public) values
  ('ordering_enabled', 'false'::jsonb, true),
  ('max_quantity_per_line', '9'::jsonb, true),
  ('max_lines', '20'::jsonb, true),
  ('tax_mode', '"not_calculated"'::jsonb, true),
  ('contact.email', 'null'::jsonb, true),
  ('contact.phone', 'null'::jsonb, true),
  ('contact.whatsapp', 'null'::jsonb, true),
  ('contact.instagram', 'null'::jsonb, true),
  ('contact.address', 'null'::jsonb, true),
  ('notice.footer', '"Displayed prices are samples. Orders are not open yet."'::jsonb, true);
create trigger store_settings_touch before update on public.store_settings for each row execute function private.touch_updated_at();

-- ordering_enabled can only be changed through public.admin_set_ordering_enabled (readiness checks).
create or replace function private.guard_ordering_setting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.key = 'ordering_enabled' and new.value is distinct from old.value
     and coalesce(current_setting('oldverge.ordering_toggle', true), '') <> 'on' then
    raise exception 'ov_error:use_admin_set_ordering_enabled' using errcode = 'P0001';
  end if;
  if old.key = 'ordering_enabled' and new.key <> old.key then
    raise exception 'ov_error:protected_setting' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger store_settings_guard before update on public.store_settings for each row execute function private.guard_ordering_setting();

create or replace function private.protect_setting_rows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.key = 'ordering_enabled' then
    raise exception 'ov_error:protected_setting' using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT' and new.key = 'ordering_enabled' and exists (select 1 from public.store_settings where key = 'ordering_enabled') then
    raise exception 'ov_error:protected_setting' using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;
create trigger store_settings_protect before insert or delete on public.store_settings for each row execute function private.protect_setting_rows();

-- ---------------------------------------------------------------- shipping and payment (owner-approved only)
create table public.shipping_zones (
  code text primary key check (code ~ '^[a-z0-9_]+$'),
  name text not null check (char_length(name) between 1 and 80),
  -- null means every province. Otherwise the shipping address province must be in this list.
  provinces text[],
  created_at timestamptz not null default now()
);

create table public.shipping_methods (
  code text primary key check (code ~ '^[a-z0-9_]+$'),
  label text not null check (char_length(label) between 1 and 80),
  description text not null default '' check (char_length(description) <= 300),
  estimate_text text not null default '' check (char_length(estimate_text) <= 120),
  enabled boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shipping_rates (
  id uuid primary key default gen_random_uuid(),
  method_code text not null references public.shipping_methods (code) on delete cascade,
  zone_code text not null references public.shipping_zones (code) on delete cascade,
  price_pkr integer not null check (price_pkr >= 0 and price_pkr <= 10000000),
  free_over_pkr integer check (free_over_pkr is null or free_over_pkr > 0),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (method_code, zone_code)
);

create table public.payment_methods (
  code text primary key check (code ~ '^[a-z0-9_]+$'),
  label text not null check (char_length(label) between 1 and 80),
  description text not null default '' check (char_length(description) <= 300),
  kind text not null check (kind in ('cod', 'online')),
  provider text,
  enabled boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Cash on delivery exists as a disabled row only. It must be explicitly approved and enabled by the owner.
insert into public.payment_methods (code, label, description, kind, enabled) values
  ('cod', 'Cash on delivery', 'Pay the courier when the order arrives.', 'cod', false);
create trigger shipping_methods_touch before update on public.shipping_methods for each row execute function private.touch_updated_at();
create trigger payment_methods_touch before update on public.payment_methods for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------- policies
-- Published text only. Drafts live in policy_drafts, which clients cannot read.
create table public.policy_pages (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 120),
  -- sections: [{ "heading": text, "body": [paragraph, ...] }]
  published_sections jsonb check (published_sections is null or jsonb_typeof(published_sections) = 'array'),
  version integer not null default 0,
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create table public.policy_drafts (
  slug text primary key references public.policy_pages (slug) on delete cascade,
  sections jsonb not null default '[]'::jsonb check (jsonb_typeof(sections) = 'array'),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
insert into public.policy_pages (slug, title) values
  ('shipping', 'Shipping Policy'),
  ('refund-policy', 'Returns & Refunds'),
  ('privacy-policy', 'Privacy Policy'),
  ('terms-and-conditions', 'Terms & Conditions');
insert into public.policy_drafts (slug) select slug from public.policy_pages;
create trigger policy_drafts_touch before update on public.policy_drafts for each row execute function private.touch_updated_at();
create trigger policy_pages_touch before update on public.policy_pages for each row execute function private.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.store_settings enable row level security;
alter table public.shipping_zones enable row level security;
alter table public.shipping_methods enable row level security;
alter table public.shipping_rates enable row level security;
alter table public.payment_methods enable row level security;
alter table public.policy_pages enable row level security;
alter table public.policy_drafts enable row level security;
alter table private.admin_members enable row level security;
alter table private.settings enable row level security;


-- >>> START MIGRATION: 20261019000300_orders_inventory_support.sql <<<
-- Orders, immutable snapshots, inventory, reservations, returns/refunds, support records,
-- notification outbox and the admin audit log.

-- ---------------------------------------------------------------- orders
create or replace function private.new_order_number()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  candidate text;
begin
  loop
    -- Non-sequential, readable, unique: OV-<yymmdd>-<8 hex>.
    candidate := 'OV-' || to_char(now() at time zone 'utc', 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (select 1 from public.orders o where o.order_number = candidate);
  end loop;
  return candidate;
end;
$$;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references auth.users (id) on delete set null,
  customer_email text not null check (char_length(customer_email) between 3 and 254),
  customer_name text not null check (char_length(customer_name) between 1 and 120),
  customer_phone text not null check (char_length(customer_phone) between 5 and 30),
  -- Historical snapshot: later address edits never change an order.
  shipping_address jsonb not null check (jsonb_typeof(shipping_address) = 'object'),
  currency text not null default 'PKR' check (currency = 'PKR'),
  subtotal_pkr integer not null check (subtotal_pkr >= 0),
  shipping_pkr integer not null check (shipping_pkr >= 0),
  tax_pkr integer not null default 0 check (tax_pkr >= 0),
  tax_status text not null default 'not_calculated' check (tax_status in ('not_calculated', 'included', 'added')),
  total_pkr integer not null check (total_pkr >= 0),
  payment_method_code text not null,
  payment_method_label text not null,
  payment_status text not null check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
  fulfilment_status text not null default 'unfulfilled' check (fulfilment_status in ('unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled')),
  shipping_method_code text not null,
  shipping_method_label text not null,
  tracking_carrier text,
  tracking_number text,
  tracking_url text,
  -- reserved: held for a pending online payment; committed: removed from on_hand;
  -- released: reservation given back (expiry, failure or cancel); restocked: committed stock returned by a cancel.
  stock_state text not null check (stock_state in ('reserved', 'committed', 'released', 'restocked')),
  needs_attention boolean not null default false,
  attention_reason text,
  is_test boolean not null default false,
  placed_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_pkr = subtotal_pkr + shipping_pkr + tax_pkr)
);
create index orders_user_idx on public.orders (user_id, placed_at desc);
create index orders_status_idx on public.orders (fulfilment_status, payment_status, placed_at desc);
create index orders_placed_idx on public.orders (placed_at desc);
create index orders_email_idx on public.orders (lower(customer_email));

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  product_slug text not null,
  sku text not null,
  product_name text not null,
  color text,
  size text,
  unit_price_pkr integer not null check (unit_price_pkr >= 0),
  quantity integer not null check (quantity between 1 and 99),
  line_total_pkr integer not null check (line_total_pkr >= 0),
  image_path text,
  created_at timestamptz not null default now(),
  check (line_total_pkr = unit_price_pkr * quantity)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_variant_idx on public.order_items (variant_id) where variant_id is not null;

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  kind text not null check (char_length(kind) between 1 and 60),
  from_state text,
  to_state text,
  actor_kind text not null check (actor_kind in ('system', 'customer', 'admin')),
  actor_id uuid,
  message text not null default '' check (char_length(message) <= 500),
  visible_to_customer boolean not null default true,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);

-- Internal notes: admin only, never shown to customers.
create table public.order_notes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  author_id uuid,
  note text not null check (char_length(note) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index order_notes_order_idx on public.order_notes (order_id, created_at);

create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text not null,
  external_ref text,
  amount_pkr integer not null check (amount_pkr >= 0),
  currency text not null default 'PKR' check (currency = 'PKR'),
  status text not null check (status in ('created', 'pending', 'succeeded', 'failed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, external_ref)
);
create index payment_attempts_order_idx on public.payment_attempts (order_id);

-- Guest access: only a hash of an unguessable capability is stored, never the token itself.
create table private.order_access_tokens (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index order_access_tokens_order_idx on private.order_access_tokens (order_id);

-- Idempotency: one row per (scope, key). scope_hash is the hash of the signed-in user id or of the
-- guest checkout secret, so nobody can read or replay another checkout by guessing a key.
create table private.checkout_requests (
  scope_hash bytea not null check (octet_length(scope_hash) = 32),
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 100),
  fingerprint bytea not null check (octet_length(fingerprint) = 32),
  order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (scope_hash, idempotency_key)
);

create table private.rate_limits (
  bucket_key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (bucket_key, window_start)
);

create table private.webhook_events (
  provider text not null,
  event_id text not null,
  received_at timestamptz not null default now(),
  status text not null default 'received' check (status in ('received', 'processed', 'ignored', 'rejected')),
  order_id uuid,
  note text,
  primary key (provider, event_id)
);

-- ---------------------------------------------------------------- inventory
-- Unknown stock is not zero and not unlimited: a variant is purchasable only when an admin has
-- confirmed the count (stock_verified).
create table public.inventory (
  variant_id uuid primary key references public.product_variants (id) on delete cascade,
  on_hand integer not null default 0 check (on_hand >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  low_stock_threshold integer not null default 2 check (low_stock_threshold >= 0),
  stock_verified boolean not null default false,
  verified_at timestamptz,
  verified_by uuid,
  updated_at timestamptz not null default now(),
  check (reserved <= on_hand)
);

create or replace function private.create_inventory_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.inventory (variant_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
create trigger product_variants_inventory after insert on public.product_variants for each row execute function private.create_inventory_row();

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  kind text not null check (kind in ('initial_count', 'adjustment', 'reserve', 'release', 'sale', 'cancel_restock', 'return_restock', 'commit_reservation')),
  delta_on_hand integer not null default 0,
  delta_reserved integer not null default 0,
  reason text not null default '' check (char_length(reason) <= 300),
  order_id uuid references public.orders (id) on delete set null,
  actor_id uuid,
  -- Idempotent operation identifier: replaying the same admin operation does nothing.
  op_key text unique,
  created_at timestamptz not null default now()
);
create index inventory_movements_variant_idx on public.inventory_movements (variant_id, created_at desc);

create or replace function private.forbid_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'ov_error:append_only' using errcode = 'P0001';
end;
$$;
create trigger inventory_movements_immutable before update or delete on public.inventory_movements for each row execute function private.forbid_change();
create trigger order_events_immutable before update or delete on public.order_events for each row execute function private.forbid_change();

create table public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  quantity integer not null check (quantity > 0),
  status text not null default 'active' check (status in ('active', 'committed', 'released')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (order_id, variant_id)
);
create index stock_reservations_active_idx on public.stock_reservations (expires_at) where status = 'active';
create index stock_reservations_variant_idx on public.stock_reservations (variant_id) where status = 'active';

-- ---------------------------------------------------------------- returns and refunds (manual records)
create table public.order_returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  status text not null default 'requested' check (status in ('requested', 'approved', 'rejected', 'received', 'closed')),
  reason text not null check (char_length(reason) between 1 and 500),
  admin_note text not null default '' check (char_length(admin_note) <= 500),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index order_returns_order_idx on public.order_returns (order_id);

create table public.order_return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.order_returns (id) on delete cascade,
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  quantity integer not null check (quantity between 1 and 99),
  restocked_at timestamptz,
  unique (return_id, order_item_id)
);

-- A refund RECORD is not a refund. status 'confirmed' means the money was actually returned
-- (by the provider, or by an explicit audited manual confirmation).
create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  return_id uuid references public.order_returns (id) on delete set null,
  amount_pkr integer not null check (amount_pkr > 0),
  method text not null check (method in ('manual', 'provider')),
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'failed', 'cancelled')),
  provider text,
  provider_ref text,
  note text not null default '' check (char_length(note) <= 500),
  requested_by uuid,
  confirmed_by uuid,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);
create index refunds_order_idx on public.refunds (order_id);

-- ---------------------------------------------------------------- support, newsletter, outbox, audit
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'contact' check (kind in ('contact', 'return_request')),
  first_name text not null check (char_length(first_name) between 1 and 80),
  last_name text not null default '' check (char_length(last_name) <= 80),
  email text not null check (char_length(email) between 3 and 254),
  phone text not null default '' check (char_length(phone) <= 30),
  topics text[] not null default '{}' check (cardinality(topics) <= 8),
  order_number text check (order_number is null or char_length(order_number) <= 40),
  message text not null check (char_length(message) between 1 and 4000),
  status text not null default 'new' check (status in ('new', 'read', 'replied', 'spam', 'archived')),
  admin_note text not null default '' check (char_length(admin_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contact_messages_status_idx on public.contact_messages (status, created_at desc);

create table public.newsletter_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) between 3 and 254),
  consent_text text not null check (char_length(consent_text) between 1 and 500),
  consent_at timestamptz not null default now(),
  source text not null default 'footer' check (char_length(source) <= 40),
  unsubscribe_token_hash bytea not null check (octet_length(unsubscribe_token_hash) = 32),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index newsletter_email_uidx on public.newsletter_subscriptions (lower(email));

create table public.notification_outbox (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (char_length(kind) between 1 and 60),
  dedupe_key text not null unique,
  -- Minimal payload: ids and codes, never full addresses or raw request bodies.
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text check (last_error is null or char_length(last_error) <= 300),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index notification_outbox_due_idx on public.notification_outbox (next_attempt_at) where status in ('pending', 'failed');

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create trigger admin_audit_log_immutable before update or delete on public.admin_audit_log for each row execute function private.forbid_change();

create trigger orders_touch before update on public.orders for each row execute function private.touch_updated_at();
create trigger payment_attempts_touch before update on public.payment_attempts for each row execute function private.touch_updated_at();
create trigger order_returns_touch before update on public.order_returns for each row execute function private.touch_updated_at();
create trigger contact_messages_touch before update on public.contact_messages for each row execute function private.touch_updated_at();

alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.order_notes enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.inventory enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.stock_reservations enable row level security;
alter table public.order_returns enable row level security;
alter table public.order_return_items enable row level security;
alter table public.refunds enable row level security;
alter table public.contact_messages enable row level security;
alter table public.newsletter_subscriptions enable row level security;
alter table public.notification_outbox enable row level security;
alter table public.admin_audit_log enable row level security;
alter table private.order_access_tokens enable row level security;
alter table private.checkout_requests enable row level security;
alter table private.rate_limits enable row level security;
alter table private.webhook_events enable row level security;

-- ---------------------------------------------------------------- audit triggers for admin-editable tables
create or replace function private.audit_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  ent_id text;
  before_row jsonb;
  after_row jsonb;
begin
  -- System/service operations are not admin actions, except role membership changes, which are
  -- always recorded (made by the project owner with a server-side statement).
  if actor is null and tg_table_name <> 'admin_members' then
    return coalesce(new, old);
  end if;
  before_row := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  after_row := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  ent_id := coalesce(after_row ->> 'id', after_row ->> 'code', after_row ->> 'key', after_row ->> 'slug', before_row ->> 'id', before_row ->> 'code', before_row ->> 'key', before_row ->> 'slug', after_row ->> 'user_id', before_row ->> 'user_id');
  insert into public.admin_audit_log (actor_id, action, entity, entity_id, before_data, after_data)
  values (actor, lower(tg_op), tg_table_schema || '.' || tg_table_name, ent_id, before_row, after_row);
  return coalesce(new, old);
end;
$$;

create trigger audit_categories after insert or update or delete on public.categories for each row execute function private.audit_change();
create trigger audit_brands after insert or update or delete on public.brands for each row execute function private.audit_change();
create trigger audit_products after insert or update or delete on public.products for each row execute function private.audit_change();
create trigger audit_product_variants after insert or update or delete on public.product_variants for each row execute function private.audit_change();
create trigger audit_product_images after insert or update or delete on public.product_images for each row execute function private.audit_change();
create trigger audit_site_images after insert or update or delete on public.site_images for each row execute function private.audit_change();
create trigger audit_store_settings after insert or update or delete on public.store_settings for each row execute function private.audit_change();
create trigger audit_shipping_zones after insert or update or delete on public.shipping_zones for each row execute function private.audit_change();
create trigger audit_shipping_methods after insert or update or delete on public.shipping_methods for each row execute function private.audit_change();
create trigger audit_shipping_rates after insert or update or delete on public.shipping_rates for each row execute function private.audit_change();
create trigger audit_payment_methods after insert or update or delete on public.payment_methods for each row execute function private.audit_change();
create trigger audit_policy_pages after update on public.policy_pages for each row execute function private.audit_change();
create trigger audit_contact_messages after update on public.contact_messages for each row execute function private.audit_change();
create trigger audit_admin_members after insert or update or delete on private.admin_members for each row execute function private.audit_change();


-- >>> START MIGRATION: 20261019000400_catalog_checkout_functions.sql <<<
-- Catalogue helpers, quoting, atomic order creation, payment events and stock handling.
-- Conventions: SECURITY DEFINER functions set search_path = '' and schema-qualify everything.
-- Errors are raised as  ov_error:<code>  (SQLSTATE P0001) with an optional JSON detail.
-- Execute grants are set explicitly in the grants migration; nothing is callable by default.

create or replace function private.get_setting(p_key text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select s.value from public.store_settings s where s.key = p_key),
    (select s.value from private.settings s where s.key = p_key)
  );
$$;

create or replace function private.fail(p_code text, p_detail jsonb default null)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_detail is null then
    raise exception 'ov_error:%', p_code using errcode = 'P0001';
  else
    raise exception 'ov_error:%', p_code using errcode = 'P0001', detail = p_detail::text;
  end if;
end;
$$;

-- ---------------------------------------------------------------- public catalogue helpers
-- Exact stock counts are never public: only booleans.
create or replace function public.catalog_availability(p_variant_ids uuid[])
returns table (variant_id uuid, in_stock boolean, low_stock boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select v.id,
         (i.stock_verified and (i.on_hand - i.reserved) > 0),
         (i.stock_verified and (i.on_hand - i.reserved) > 0 and (i.on_hand - i.reserved) <= i.low_stock_threshold)
  from public.product_variants v
  join public.products p on p.id = v.product_id and p.status = 'published'
  join public.inventory i on i.variant_id = v.id
  where v.id = any (p_variant_ids[1:200]) and v.active;
$$;

create or replace function public.search_catalog(p_query text, p_limit integer default 24)
returns table (slug text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  q text := btrim(coalesce(p_query, ''));
  tokens text[];
  lim integer := greatest(1, least(coalesce(p_limit, 24), 50));
begin
  if char_length(q) = 0 or char_length(q) > 80 then
    return;
  end if;
  tokens := regexp_split_to_array(lower(q), '\s+');
  if cardinality(tokens) > 6 then
    tokens := tokens[1:6];
  end if;
  return query
  select p.slug
  from public.products p
  left join public.brands b on b.id = p.brand_id
  where p.status = 'published'
    and not exists (
      select 1 from unnest(tokens) as t(tok)
      where not (
        lower(p.name) like '%' || replace(replace(replace(t.tok, '\', '\\'), '%', '\%'), '_', '\_') || '%' escape '\'
        or lower(coalesce(b.name, '')) like '%' || replace(replace(replace(t.tok, '\', '\\'), '%', '\%'), '_', '\_') || '%' escape '\'
        or lower(coalesce(p.style, '')) like '%' || replace(replace(replace(t.tok, '\', '\\'), '%', '\%'), '_', '\_') || '%' escape '\'
        or exists (
          select 1 from public.product_variants v
          where v.product_id = p.id and v.active
            and lower(coalesce(v.color_name, '')) like '%' || replace(replace(replace(t.tok, '\', '\\'), '%', '\%'), '_', '\_') || '%' escape '\'
        )
      )
    )
  order by p.sort_order, p.name
  limit lim;
end;
$$;
create index if not exists products_name_lower_idx on public.products (lower(name) text_pattern_ops);

-- ---------------------------------------------------------------- readiness
create or replace function public.product_readiness(p_product_id uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  problems text[] := '{}';
  prod public.products;
begin
  if not public.is_admin() then
    perform private.fail('forbidden');
  end if;
  select * into prod from public.products where id = p_product_id;
  if not found then
    return array['product_not_found'];
  end if;
  if not exists (select 1 from public.product_variants v where v.product_id = prod.id and v.active) then
    problems := array_append(problems, 'no_active_variant');
  end if;
  if exists (select 1 from public.product_variants v where v.product_id = prod.id and v.active and v.price_pkr <= 0) then
    problems := array_append(problems, 'price_missing');
  end if;
  if exists (
    select 1 from public.product_variants v join public.inventory i on i.variant_id = v.id
    where v.product_id = prod.id and v.active and not i.stock_verified
  ) then
    problems := array_append(problems, 'stock_not_verified');
  end if;
  if not exists (
    select 1 from public.product_images im
    where im.product_id = prod.id and im.is_cover and im.approval_status = 'approved'
  ) then
    problems := array_append(problems, 'no_approved_cover_image');
  end if;
  return problems;
end;
$$;

create or replace function private.guard_product_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  problems text[] := '{}';
begin
  if new.status = 'archived' then
    new.ready_to_sell := false;
  end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    if tg_op = 'UPDATE' and not exists (select 1 from public.product_variants v where v.product_id = new.id and v.active) then
      problems := array_append(problems, 'no_active_variant');
    end if;
    if exists (select 1 from public.categories c where c.id = new.category_id and not c.active) then
      problems := array_append(problems, 'category_inactive');
    end if;
    if cardinality(problems) > 0 then
      perform private.fail('not_publishable', to_jsonb(problems));
    end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  if new.ready_to_sell and (tg_op = 'INSERT' or not old.ready_to_sell) then
    if tg_op = 'INSERT' then
      perform private.fail('not_ready_to_sell', '["new_product_cannot_be_ready"]'::jsonb);
    end if;
    if exists (select 1 from public.product_variants v where v.product_id = new.id and v.active and v.price_pkr <= 0) then
      problems := array_append(problems, 'price_missing');
    end if;
    if exists (
      select 1 from public.product_variants v join public.inventory i on i.variant_id = v.id
      where v.product_id = new.id and v.active and not i.stock_verified
    ) then
      problems := array_append(problems, 'stock_not_verified');
    end if;
    if not exists (select 1 from public.product_variants v where v.product_id = new.id and v.active) then
      problems := array_append(problems, 'no_active_variant');
    end if;
    if not exists (select 1 from public.product_images im where im.product_id = new.id and im.is_cover and im.approval_status = 'approved') then
      problems := array_append(problems, 'no_approved_cover_image');
    end if;
    if cardinality(problems) > 0 then
      perform private.fail('not_ready_to_sell', to_jsonb(problems));
    end if;
  end if;
  return new;
end;
$$;
create trigger products_guard before insert or update on public.products for each row execute function private.guard_product_state();

-- ---------------------------------------------------------------- stock handling (callers hold the order row lock)
create or replace function private.release_order_reservations(p_order_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  -- Lock inventory rows in a fixed order (variant id ascending) to avoid deadlocks.
  perform 1 from public.inventory i
   where i.variant_id in (select sr.variant_id from public.stock_reservations sr where sr.order_id = p_order_id and sr.status = 'active')
   order by i.variant_id for update;
  for r in
    select sr.id, sr.variant_id, sr.quantity from public.stock_reservations sr
     where sr.order_id = p_order_id and sr.status = 'active' order by sr.variant_id
  loop
    update public.stock_reservations set status = 'released', resolved_at = now() where id = r.id and status = 'active';
    if found then
      update public.inventory set reserved = reserved - r.quantity, updated_at = now() where variant_id = r.variant_id;
      insert into public.inventory_movements (variant_id, kind, delta_reserved, reason, order_id)
      values (r.variant_id, 'release', -r.quantity, left(p_reason, 300), p_order_id);
    end if;
  end loop;
  update public.orders set stock_state = 'released' where id = p_order_id and stock_state = 'reserved';
end;
$$;

create or replace function private.commit_order_reservations(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  perform 1 from public.inventory i
   where i.variant_id in (select sr.variant_id from public.stock_reservations sr where sr.order_id = p_order_id and sr.status = 'active')
   order by i.variant_id for update;
  for r in
    select sr.id, sr.variant_id, sr.quantity from public.stock_reservations sr
     where sr.order_id = p_order_id and sr.status = 'active' order by sr.variant_id
  loop
    update public.stock_reservations set status = 'committed', resolved_at = now() where id = r.id and status = 'active';
    if found then
      update public.inventory set on_hand = on_hand - r.quantity, reserved = reserved - r.quantity, updated_at = now() where variant_id = r.variant_id;
      insert into public.inventory_movements (variant_id, kind, delta_on_hand, delta_reserved, reason, order_id)
      values (r.variant_id, 'commit_reservation', -r.quantity, -r.quantity, 'payment confirmed', p_order_id);
    end if;
  end loop;
  update public.orders set stock_state = 'committed' where id = p_order_id and stock_state = 'reserved';
end;
$$;

-- Puts committed stock back after a cancel of an order that never shipped. At most once per order.
create or replace function private.restock_cancelled_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  if not exists (select 1 from public.orders o where o.id = p_order_id and o.stock_state = 'committed') then
    return;
  end if;
  perform 1 from public.inventory i
   where i.variant_id in (select oi.variant_id from public.order_items oi where oi.order_id = p_order_id and oi.variant_id is not null)
   order by i.variant_id for update;
  for r in
    select oi.variant_id, sum(oi.quantity)::integer as qty from public.order_items oi
     where oi.order_id = p_order_id and oi.variant_id is not null group by oi.variant_id order by oi.variant_id
  loop
    update public.inventory set on_hand = on_hand + r.qty, updated_at = now() where variant_id = r.variant_id;
    insert into public.inventory_movements (variant_id, kind, delta_on_hand, reason, order_id)
    values (r.variant_id, 'cancel_restock', r.qty, 'order cancelled before shipping', p_order_id);
  end loop;
  update public.orders set stock_state = 'restocked' where id = p_order_id;
end;
$$;

-- Expired online-payment reservations are released (lazily by checkout and by the maintenance job).
create or replace function private.expire_stale_orders(p_variant_ids uuid[] default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  o record;
  n integer := 0;
begin
  for o in
    select distinct sr.order_id from public.stock_reservations sr
     where sr.status = 'active' and sr.expires_at <= now()
       and (p_variant_ids is null or sr.variant_id = any (p_variant_ids))
     order by sr.order_id
  loop
    perform 1 from public.orders x where x.id = o.order_id for update;
    if exists (select 1 from public.orders x where x.id = o.order_id and x.stock_state = 'reserved' and x.payment_status = 'pending') then
      perform private.release_order_reservations(o.order_id, 'payment window expired');
      update public.orders set payment_status = 'failed', fulfilment_status = 'cancelled', cancelled_at = now(), cancel_reason = 'payment_window_expired'
       where id = o.order_id;
      insert into public.order_events (order_id, kind, from_state, to_state, actor_kind, message)
      values (o.order_id, 'payment_expired', 'pending', 'failed', 'system', 'The payment window expired and the items were released.');
      n := n + 1;
    end if;
  end loop;
  return n;
end;
$$;

-- ---------------------------------------------------------------- quoting
-- Builds the server-derived quote. Locks nothing itself; create_order locks inventory first.
create or replace function private.build_quote(
  p_lines jsonb,
  p_shipping_method text,
  p_province text,
  p_payment_method text,
  p_check_stock boolean
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  max_lines integer := coalesce((private.get_setting('max_lines'))::text::integer, 20);
  max_qty integer := coalesce((private.get_setting('max_quantity_per_line'))::text::integer, 9);
  e jsonb;
  merged jsonb;
  line record;
  out_lines jsonb := '[]'::jsonb;
  subtotal bigint := 0;
  avail integer;
  pay public.payment_methods;
  meth public.shipping_methods;
  v_zone text;
  rate public.shipping_rates;
  ship integer;
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 or jsonb_array_length(p_lines) > 100 then
    perform private.fail('invalid_lines');
  end if;
  for e in select * from jsonb_array_elements(p_lines) loop
    if jsonb_typeof(e) <> 'object'
       or coalesce(e ->> 'variant_id', '') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
       or coalesce(e ->> 'quantity', '') !~ '^[0-9]{1,3}$' then
      perform private.fail('invalid_lines');
    end if;
  end loop;
  select jsonb_agg(jsonb_build_object('variant_id', m.vid, 'quantity', m.qty) order by m.vid)
    into merged
    from (select (x ->> 'variant_id')::uuid as vid, sum((x ->> 'quantity')::integer) as qty
            from jsonb_array_elements(p_lines) x group by 1) m;
  if jsonb_array_length(merged) > max_lines then
    perform private.fail('too_many_lines');
  end if;

  for line in
    select (m ->> 'variant_id')::uuid as variant_id, (m ->> 'quantity')::integer as qty
      from jsonb_array_elements(merged) m order by 1
  loop
    if line.qty < 1 or line.qty > max_qty then
      perform private.fail('invalid_quantity', jsonb_build_object('variant_id', line.variant_id, 'max', max_qty));
    end if;
    declare
      v public.product_variants;
      p public.products;
      inv public.inventory;
      cover text;
    begin
      select * into v from public.product_variants where id = line.variant_id;
      if not found or not v.active then
        perform private.fail('variant_unavailable', jsonb_build_object('variant_id', line.variant_id));
      end if;
      select * into p from public.products where id = v.product_id;
      if p.status <> 'published' or not p.ready_to_sell or v.price_pkr <= 0 then
        perform private.fail('variant_unavailable', jsonb_build_object('variant_id', line.variant_id));
      end if;
      select * into inv from public.inventory where variant_id = v.id;
      if not found or not inv.stock_verified then
        perform private.fail('variant_unavailable', jsonb_build_object('variant_id', line.variant_id));
      end if;
      if p_check_stock then
        avail := inv.on_hand - inv.reserved;
        if avail < line.qty then
          perform private.fail('insufficient_stock', jsonb_build_object('variant_id', line.variant_id, 'available', greatest(avail, 0)));
        end if;
      end if;
      select im.bucket || '/' || im.path into cover from public.product_images im
        where im.product_id = p.id and im.is_cover and im.approval_status = 'approved' limit 1;
      subtotal := subtotal + (v.price_pkr::bigint * line.qty);
      out_lines := out_lines || jsonb_build_array(jsonb_build_object(
        'variant_id', v.id, 'sku', v.sku, 'product_slug', p.slug, 'product_name', p.name,
        'color', v.color_name, 'size', v.size_label, 'unit_price_pkr', v.price_pkr, 'quantity', line.qty,
        'line_total_pkr', v.price_pkr * line.qty, 'image_path', cover));
    end;
  end loop;
  if subtotal > 1000000000 then
    perform private.fail('amount_too_large');
  end if;

  select * into pay from public.payment_methods where code = p_payment_method;
  if not found or not pay.enabled then
    perform private.fail('payment_method_unavailable');
  end if;
  select * into meth from public.shipping_methods where code = p_shipping_method;
  if not found or not meth.enabled then
    perform private.fail('shipping_unavailable');
  end if;
  select z.code into v_zone
    from public.shipping_zones z
    join public.shipping_rates r on r.zone_code = z.code and r.method_code = meth.code and r.enabled
   where z.provinces is null or lower(btrim(coalesce(p_province, ''))) = any (select lower(btrim(x)) from unnest(z.provinces) x)
   order by (z.provinces is null), z.code
   limit 1;
  if v_zone is null then
    perform private.fail('shipping_unavailable');
  end if;
  select * into rate from public.shipping_rates where method_code = meth.code and shipping_rates.zone_code = v_zone;
  ship := case when rate.free_over_pkr is not null and subtotal >= rate.free_over_pkr then 0 else rate.price_pkr end;

  return jsonb_build_object(
    'currency', 'PKR',
    'lines', out_lines,
    'subtotal_pkr', subtotal,
    'shipping_pkr', ship,
    'shipping_method', jsonb_build_object('code', meth.code, 'label', meth.label, 'estimate_text', meth.estimate_text),
    'tax_pkr', 0,
    'tax_status', 'not_calculated',
    'total_pkr', subtotal + ship,
    'payment_method', jsonb_build_object('code', pay.code, 'label', pay.label, 'kind', pay.kind)
  );
end;
$$;

-- Read-only quote for the checkout review step (called by the quote-order Edge Function).
create or replace function public.quote_order(p_lines jsonb, p_shipping_method text, p_province text, p_payment_method text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if coalesce((private.get_setting('ordering_enabled'))::text::boolean, false) is not true then
    perform private.fail('ordering_closed');
  end if;
  return private.build_quote(p_lines, p_shipping_method, p_province, p_payment_method, true);
end;
$$;

-- ---------------------------------------------------------------- order creation
create or replace function private.norm_text(p_value jsonb, p_min integer, p_max integer, p_code text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  t text;
begin
  if p_value is null or jsonb_typeof(p_value) <> 'string' then
    if p_min = 0 then return ''; end if;
    perform private.fail('invalid_field', jsonb_build_object('field', p_code));
  end if;
  t := btrim(regexp_replace(p_value #>> '{}', '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g'));
  if char_length(t) < p_min or char_length(t) > p_max then
    perform private.fail('invalid_field', jsonb_build_object('field', p_code));
  end if;
  return t;
end;
$$;

create or replace function public.create_order(
  p_order_id uuid,
  p_user_id uuid,
  p_scope_hash bytea,
  p_idempotency_key text,
  p_payload jsonb,
  p_expected_total integer,
  p_token_hash bytea,
  p_is_test boolean default false
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  contact jsonb := p_payload -> 'contact';
  addr jsonb := p_payload -> 'address';
  v_name text;
  v_email text;
  v_phone text;
  a_recipient text; a_phone text; a_line1 text; a_line2 text; a_city text; a_province text; a_postal text;
  v_ship text := p_payload ->> 'shipping_method';
  v_pay text := p_payload ->> 'payment_method';
  merged jsonb;
  variant_ids uuid[];
  fingerprint bytea;
  inserted integer;
  existing private.checkout_requests;
  quote jsonb;
  pay public.payment_methods;
  v_order public.orders;
  v_state text;
  v_payment_status text;
  v_expires timestamptz;
  v_reserve_minutes integer := coalesce((private.get_setting('reservation_minutes'))::text::integer, 30);
  v_token_days integer := coalesce((private.get_setting('order_access_days'))::text::integer, 90);
  item jsonb;
  new_number text;
begin
  if coalesce((private.get_setting('ordering_enabled'))::text::boolean, false) is not true then
    perform private.fail('ordering_closed');
  end if;
  if p_scope_hash is null or octet_length(p_scope_hash) <> 32 or p_token_hash is null or octet_length(p_token_hash) <> 32 then
    perform private.fail('invalid_request');
  end if;
  if p_idempotency_key is null or char_length(p_idempotency_key) not between 16 and 100 then
    perform private.fail('invalid_idempotency_key');
  end if;
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or contact is null or addr is null
     or jsonb_typeof(contact) <> 'object' or jsonb_typeof(addr) <> 'object' then
    perform private.fail('invalid_request');
  end if;

  v_name := private.norm_text(contact -> 'name', 1, 120, 'name');
  v_email := lower(private.norm_text(contact -> 'email', 3, 254, 'email'));
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    perform private.fail('invalid_field', '{"field":"email"}'::jsonb);
  end if;
  v_phone := private.norm_text(contact -> 'phone', 5, 30, 'phone');
  if v_phone !~ '^\+?[0-9][0-9 ()\-]{3,28}[0-9]$' then
    perform private.fail('invalid_field', '{"field":"phone"}'::jsonb);
  end if;
  a_recipient := private.norm_text(coalesce(addr -> 'recipient', to_jsonb(v_name)), 1, 120, 'recipient');
  a_phone := private.norm_text(coalesce(addr -> 'phone', to_jsonb(v_phone)), 5, 30, 'address_phone');
  a_line1 := private.norm_text(addr -> 'line1', 1, 200, 'line1');
  a_line2 := private.norm_text(addr -> 'line2', 0, 200, 'line2');
  a_city := private.norm_text(addr -> 'city', 1, 80, 'city');
  a_province := private.norm_text(addr -> 'province', 1, 80, 'province');
  a_postal := private.norm_text(addr -> 'postal_code', 0, 12, 'postal_code');
  if coalesce(addr ->> 'country', 'PK') <> 'PK' then
    perform private.fail('invalid_field', '{"field":"country"}'::jsonb);
  end if;
  if v_ship is null or v_pay is null or v_ship !~ '^[a-z0-9_]+$' or v_pay !~ '^[a-z0-9_]+$' then
    perform private.fail('invalid_request');
  end if;

  -- Canonical, order-independent line list; its sha256 plus the other inputs is the request fingerprint.
  if jsonb_typeof(p_payload -> 'lines') <> 'array' or jsonb_array_length(p_payload -> 'lines') = 0 or jsonb_array_length(p_payload -> 'lines') > 100 then
    perform private.fail('invalid_lines');
  end if;
  for item in select * from jsonb_array_elements(p_payload -> 'lines') loop
    if jsonb_typeof(item) <> 'object'
       or coalesce(item ->> 'variant_id', '') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
       or coalesce(item ->> 'quantity', '') !~ '^[0-9]{1,3}$' then
      perform private.fail('invalid_lines');
    end if;
  end loop;
  select jsonb_agg(jsonb_build_object('variant_id', m.vid, 'quantity', m.qty) order by m.vid), array_agg(m.vid order by m.vid)
    into merged, variant_ids
    from (select (x ->> 'variant_id')::uuid as vid, sum((x ->> 'quantity')::integer) as qty
            from jsonb_array_elements(p_payload -> 'lines') x group by 1) m;
  fingerprint := sha256(convert_to(jsonb_build_object(
    'lines', merged, 'shipping', v_ship, 'payment', v_pay, 'name', v_name, 'email', v_email, 'phone', v_phone,
    'address', jsonb_build_object('recipient', a_recipient, 'phone', a_phone, 'line1', a_line1, 'line2', a_line2, 'city', a_city, 'province', a_province, 'postal', a_postal)
  )::text, 'UTF8'));

  -- Idempotency. A concurrent identical request waits here for the first to commit, then replays it.
  insert into private.checkout_requests (scope_hash, idempotency_key, fingerprint)
  values (p_scope_hash, p_idempotency_key, fingerprint)
  on conflict (scope_hash, idempotency_key) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    select * into existing from private.checkout_requests where scope_hash = p_scope_hash and idempotency_key = p_idempotency_key;
    if existing.fingerprint is distinct from fingerprint then
      perform private.fail('idempotency_conflict');
    end if;
    if existing.order_id is null then
      perform private.fail('request_in_progress');
    end if;
    select * into v_order from public.orders where id = existing.order_id;
    return jsonb_build_object('replayed', true, 'order_id', v_order.id, 'order_number', v_order.order_number,
      'payment_status', v_order.payment_status, 'fulfilment_status', v_order.fulfilment_status, 'total_pkr', v_order.total_pkr);
  end if;

  -- Lock stock rows in a fixed order, then release anything expired for these variants.
  perform 1 from public.inventory i where i.variant_id = any (variant_ids) order by i.variant_id for update;
  perform private.expire_stale_orders(variant_ids);

  quote := private.build_quote(merged, v_ship, a_province, v_pay, true);
  if p_expected_total is null or (quote ->> 'total_pkr')::integer <> p_expected_total then
    perform private.fail('price_changed', quote);
  end if;

  select * into pay from public.payment_methods where code = v_pay;
  if pay.kind = 'cod' then
    v_state := 'committed';
    v_payment_status := 'unpaid';
  else
    v_state := 'reserved';
    v_payment_status := 'pending';
    v_expires := now() + make_interval(mins => v_reserve_minutes);
  end if;

  new_number := private.new_order_number();
  insert into public.orders (
    id, order_number, user_id, customer_email, customer_name, customer_phone, shipping_address,
    subtotal_pkr, shipping_pkr, tax_pkr, tax_status, total_pkr, payment_method_code, payment_method_label,
    payment_status, fulfilment_status, shipping_method_code, shipping_method_label, stock_state, is_test)
  values (
    p_order_id, new_number, p_user_id, v_email, v_name, v_phone,
    jsonb_build_object('recipient', a_recipient, 'phone', a_phone, 'line1', a_line1, 'line2', a_line2,
                       'city', a_city, 'province', a_province, 'postal_code', a_postal, 'country', 'PK'),
    (quote ->> 'subtotal_pkr')::integer, (quote ->> 'shipping_pkr')::integer, 0, 'not_calculated', (quote ->> 'total_pkr')::integer,
    pay.code, pay.label, v_payment_status, 'unfulfilled', quote -> 'shipping_method' ->> 'code', quote -> 'shipping_method' ->> 'label', v_state, coalesce(p_is_test, false))
  returning * into v_order;

  insert into public.order_items (order_id, variant_id, product_slug, sku, product_name, color, size, unit_price_pkr, quantity, line_total_pkr, image_path)
  select v_order.id, (l ->> 'variant_id')::uuid, l ->> 'product_slug', l ->> 'sku', l ->> 'product_name', l ->> 'color', l ->> 'size',
         (l ->> 'unit_price_pkr')::integer, (l ->> 'quantity')::integer, (l ->> 'line_total_pkr')::integer, l ->> 'image_path'
    from jsonb_array_elements(quote -> 'lines') l;

  if pay.kind = 'cod' then
    update public.inventory i set on_hand = i.on_hand - q.qty, updated_at = now()
      from (select (l ->> 'variant_id')::uuid as vid, (l ->> 'quantity')::integer as qty from jsonb_array_elements(quote -> 'lines') l) q
     where i.variant_id = q.vid;
    insert into public.inventory_movements (variant_id, kind, delta_on_hand, reason, order_id)
    select (l ->> 'variant_id')::uuid, 'sale', -(l ->> 'quantity')::integer, 'order placed (cash on delivery)', v_order.id
      from jsonb_array_elements(quote -> 'lines') l;
  else
    update public.inventory i set reserved = i.reserved + q.qty, updated_at = now()
      from (select (l ->> 'variant_id')::uuid as vid, (l ->> 'quantity')::integer as qty from jsonb_array_elements(quote -> 'lines') l) q
     where i.variant_id = q.vid;
    insert into public.stock_reservations (order_id, variant_id, quantity, expires_at)
    select v_order.id, (l ->> 'variant_id')::uuid, (l ->> 'quantity')::integer, v_expires from jsonb_array_elements(quote -> 'lines') l;
    insert into public.inventory_movements (variant_id, kind, delta_reserved, reason, order_id)
    select (l ->> 'variant_id')::uuid, 'reserve', (l ->> 'quantity')::integer, 'online payment pending', v_order.id
      from jsonb_array_elements(quote -> 'lines') l;
  end if;

  insert into private.order_access_tokens (order_id, token_hash, expires_at)
  values (v_order.id, p_token_hash, now() + make_interval(days => v_token_days))
  on conflict (token_hash) do nothing;

  insert into public.order_events (order_id, kind, to_state, actor_kind, actor_id, message)
  values (v_order.id, 'order_placed', v_order.fulfilment_status, case when p_user_id is null then 'customer' else 'customer' end, p_user_id,
          case when pay.kind = 'cod' then 'Order received. Payment is due on delivery.' else 'Order received. Waiting for payment.' end);

  insert into public.notification_outbox (kind, dedupe_key, payload)
  values ('order_confirmation', 'order:' || v_order.id || ':confirmation', jsonb_build_object('order_id', v_order.id)),
         ('admin_new_order', 'order:' || v_order.id || ':admin', jsonb_build_object('order_id', v_order.id))
  on conflict (dedupe_key) do nothing;

  update private.checkout_requests set order_id = v_order.id where scope_hash = p_scope_hash and idempotency_key = p_idempotency_key;

  return jsonb_build_object('replayed', false, 'order_id', v_order.id, 'order_number', v_order.order_number,
    'payment_status', v_order.payment_status, 'fulfilment_status', v_order.fulfilment_status, 'total_pkr', v_order.total_pkr,
    'payment_method', jsonb_build_object('code', pay.code, 'kind', pay.kind), 'expires_at', v_expires);
end;
$$;

-- Customer-safe projection for a guest holding a valid access capability. The caller (an Edge Function)
-- rate-limits and passes only the SHA-256 of the presented token.
create or replace function public.get_order_for_access(p_order_number text, p_token_hash bytea)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  o public.orders;
begin
  if p_order_number is null or p_token_hash is null or octet_length(p_token_hash) <> 32 then
    return null;
  end if;
  select ord.* into o
    from public.orders ord
    join private.order_access_tokens t on t.order_id = ord.id
   where ord.order_number = p_order_number and t.token_hash = p_token_hash
     and t.revoked_at is null and t.expires_at > now();
  if not found then
    return null;
  end if;
  return public.order_projection(o.id);
end;
$$;

create or replace function public.order_projection(p_order_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'order_number', o.order_number,
    'placed_at', o.placed_at,
    'customer_name', o.customer_name,
    'email_hint', regexp_replace(o.customer_email, '^(.).*(@.*)$', '\1***\2'),
    'shipping_address', o.shipping_address,
    'currency', o.currency,
    'subtotal_pkr', o.subtotal_pkr, 'shipping_pkr', o.shipping_pkr, 'tax_pkr', o.tax_pkr, 'tax_status', o.tax_status, 'total_pkr', o.total_pkr,
    'payment_method', o.payment_method_label, 'payment_status', o.payment_status,
    'fulfilment_status', o.fulfilment_status,
    'shipping_method', o.shipping_method_label,
    'tracking_carrier', o.tracking_carrier, 'tracking_number', o.tracking_number, 'tracking_url', o.tracking_url,
    'items', coalesce((select jsonb_agg(jsonb_build_object(
        'product_slug', i.product_slug, 'product_name', i.product_name, 'sku', i.sku, 'color', i.color, 'size', i.size,
        'unit_price_pkr', i.unit_price_pkr, 'quantity', i.quantity, 'line_total_pkr', i.line_total_pkr, 'image_path', i.image_path)
        order by i.created_at, i.id) from public.order_items i where i.order_id = o.id), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(jsonb_build_object('kind', e.kind, 'message', e.message, 'created_at', e.created_at) order by e.created_at, e.id)
        from public.order_events e where e.order_id = o.id and e.visible_to_customer), '[]'::jsonb)
  )
  from public.orders o where o.id = p_order_id;
$$;

-- ---------------------------------------------------------------- payment events (provider adapters call this)
create or replace function public.apply_payment_event(
  p_provider text,
  p_event_id text,
  p_order_id uuid,
  p_amount_pkr integer,
  p_currency text,
  p_status text,
  p_external_ref text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  o public.orders;
  inserted integer;
  result text;
begin
  if p_status not in ('succeeded', 'failed', 'cancelled') then
    perform private.fail('invalid_request');
  end if;
  insert into private.webhook_events (provider, event_id, order_id) values (p_provider, p_event_id, p_order_id)
  on conflict (provider, event_id) do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    return jsonb_build_object('result', 'duplicate');     -- replay protection
  end if;

  select * into o from public.orders where id = p_order_id for update;
  if not found then
    update private.webhook_events set status = 'rejected', note = 'unknown order' where provider = p_provider and event_id = p_event_id;
    return jsonb_build_object('result', 'rejected');
  end if;
  if p_currency is distinct from o.currency or p_amount_pkr is distinct from o.total_pkr then
    update private.webhook_events set status = 'rejected', note = 'amount or currency mismatch' where provider = p_provider and event_id = p_event_id;
    update public.orders set needs_attention = true, attention_reason = 'payment_amount_mismatch' where id = o.id;
    return jsonb_build_object('result', 'rejected');
  end if;

  insert into public.payment_attempts (order_id, provider, external_ref, amount_pkr, status)
  values (o.id, p_provider, coalesce(p_external_ref, p_event_id), p_amount_pkr,
          case p_status when 'succeeded' then 'succeeded' when 'failed' then 'failed' else 'cancelled' end)
  on conflict (provider, external_ref) do update set status = excluded.status;

  if p_status = 'succeeded' then
    if o.payment_status = 'paid' then
      result := 'ignored';                       -- already paid: out-of-order or repeated
    elsif o.stock_state = 'reserved' then
      perform private.commit_order_reservations(o.id);
      update public.orders set payment_status = 'paid' where id = o.id;
      insert into public.order_events (order_id, kind, from_state, to_state, actor_kind, message)
      values (o.id, 'payment_confirmed', o.payment_status, 'paid', 'system', 'Payment confirmed.');
      result := 'processed';
    else
      -- Paid after the reservation was released (expiry or cancel): never silently oversell; flag for an admin.
      update public.orders set payment_status = 'paid', needs_attention = true, attention_reason = 'payment_after_release' where id = o.id;
      insert into public.order_events (order_id, kind, from_state, to_state, actor_kind, message, visible_to_customer)
      values (o.id, 'payment_after_release', o.payment_status, 'paid', 'system', 'Payment arrived after the items were released. Needs admin reconciliation.', false);
      result := 'needs_reconciliation';
    end if;
  else
    if o.payment_status = 'paid' then
      result := 'ignored';                       -- a late failure cannot undo a confirmed payment
    elsif o.stock_state = 'reserved' then
      perform private.release_order_reservations(o.id, 'payment ' || p_status);
      update public.orders set payment_status = 'failed', fulfilment_status = 'cancelled', cancelled_at = now(), cancel_reason = 'payment_' || p_status where id = o.id;
      insert into public.order_events (order_id, kind, from_state, to_state, actor_kind, message)
      values (o.id, 'payment_failed', o.payment_status, 'failed', 'system', 'Payment was not completed. The items were released.');
      result := 'processed';
    else
      result := 'ignored';
    end if;
  end if;
  update private.webhook_events set status = case when result = 'processed' then 'processed' else 'ignored' end, note = result
   where provider = p_provider and event_id = p_event_id;
  return jsonb_build_object('result', result);
end;
$$;

-- ---------------------------------------------------------------- maintenance, rate limit, outbox
create or replace function public.run_maintenance()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  expired integer;
  pruned integer;
begin
  expired := private.expire_stale_orders(null);
  delete from private.rate_limits where window_start < now() - interval '1 day';
  get diagnostics pruned = row_count;
  return jsonb_build_object('expired_orders', expired, 'rate_limit_rows_pruned', pruned);
end;
$$;

-- Atomic fixed-window counter. Returns true when the call is allowed.
create or replace function public.hit_rate_limit(p_key text, p_max integer, p_window_seconds integer)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  n integer;
begin
  if p_key is null or p_max < 1 or p_window_seconds < 1 then
    return false;
  end if;
  insert into private.rate_limits (bucket_key, window_start, hits) values (left(p_key, 200), w, 1)
  on conflict (bucket_key, window_start) do update set hits = private.rate_limits.hits + 1
  returning hits into n;
  return n <= p_max;
end;
$$;

create or replace function public.claim_outbox(p_limit integer default 10)
returns setof public.notification_outbox
language sql
volatile
security definer
set search_path = ''
as $$
  update public.notification_outbox o
     set attempts = o.attempts + 1, next_attempt_at = now() + interval '5 minutes' * least(o.attempts + 1, 12)
   where o.id in (
     select x.id from public.notification_outbox x
      where x.status in ('pending', 'failed') and x.next_attempt_at <= now() and x.attempts < 8
      order by x.created_at limit greatest(1, least(p_limit, 50))
      for update skip locked)
  returning o.*;
$$;

create or replace function public.finish_outbox(p_id uuid, p_status text, p_error text default null)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.notification_outbox
     set status = case when p_status in ('sent', 'skipped') then p_status else 'failed' end,
         sent_at = case when p_status = 'sent' then now() else sent_at end,
         last_error = left(p_error, 300)
   where id = p_id;
$$;

-- ---------------------------------------------------------------- support (called by Edge Functions)
create or replace function public.submit_contact(p_payload jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  topics text[];
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    perform private.fail('invalid_request');
  end if;
  select coalesce(array_agg(left(t, 40)), '{}') into topics
    from (select jsonb_array_elements_text(case when jsonb_typeof(p_payload -> 'topics') = 'array' then p_payload -> 'topics' else '[]'::jsonb end) as t limit 8) s;
  insert into public.contact_messages (kind, first_name, last_name, email, phone, topics, order_number, message)
  values (
    case when p_payload ->> 'kind' = 'return_request' then 'return_request' else 'contact' end,
    private.norm_text(p_payload -> 'first_name', 1, 80, 'first_name'),
    private.norm_text(p_payload -> 'last_name', 0, 80, 'last_name'),
    lower(private.norm_text(p_payload -> 'email', 3, 254, 'email')),
    private.norm_text(p_payload -> 'phone', 0, 30, 'phone'),
    topics,
    nullif(private.norm_text(p_payload -> 'order_number', 0, 40, 'order_number'), ''),
    private.norm_text(p_payload -> 'message', 1, 4000, 'message'))
  returning id into new_id;
  insert into public.notification_outbox (kind, dedupe_key, payload)
  values ('admin_new_contact_message', 'contact:' || new_id, jsonb_build_object('message_id', new_id));
  return new_id;
end;
$$;

create or replace function public.newsletter_subscribe(p_email text, p_consent_text text, p_source text, p_token_hash bytea)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 254 then
    perform private.fail('invalid_field', '{"field":"email"}'::jsonb);
  end if;
  if p_token_hash is null or octet_length(p_token_hash) <> 32 or coalesce(char_length(p_consent_text), 0) not between 1 and 500 then
    perform private.fail('invalid_request');
  end if;
  -- Re-subscribing an existing address is a silent no-op (no disclosure of who is subscribed),
  -- except that an unsubscribed address may opt in again with fresh consent evidence.
  insert into public.newsletter_subscriptions (email, consent_text, source, unsubscribe_token_hash)
  values (v_email, p_consent_text, left(coalesce(p_source, 'footer'), 40), p_token_hash)
  on conflict (lower(email)) do update
    set unsubscribed_at = null, consent_text = excluded.consent_text, consent_at = now(), unsubscribe_token_hash = excluded.unsubscribe_token_hash
    where public.newsletter_subscriptions.unsubscribed_at is not null;
end;
$$;

create or replace function public.newsletter_unsubscribe(p_token_hash bytea)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  update public.newsletter_subscriptions set unsubscribed_at = now()
   where unsubscribe_token_hash = p_token_hash and unsubscribed_at is null;
  get diagnostics n = row_count;
  return n > 0;
end;
$$;


-- >>> START MIGRATION: 20261019000500_admin_functions.sql <<<
-- Admin operations. Every function re-checks public.is_admin() (current protected membership)
-- on every call; hiding admin navigation is never the control. Functions run as the owner so they can
-- touch tables that have no direct client write grants (inventory, orders, refunds ...).

create or replace function private.require_admin(p_owner_only boolean default false)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if not public.is_admin() then
    raise exception 'ov_error:forbidden' using errcode = '42501';
  end if;
  if p_owner_only and public.admin_role() <> 'owner' then
    raise exception 'ov_error:owner_only' using errcode = '42501';
  end if;
  return uid;
end;
$$;

create or replace function private.audit_action(p_actor uuid, p_action text, p_entity text, p_entity_id text, p_after jsonb default null)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.admin_audit_log (actor_id, action, entity, entity_id, after_data) values (p_actor, p_action, p_entity, p_entity_id, p_after);
$$;

-- ---------------------------------------------------------------- inventory
create or replace function public.admin_adjust_inventory(
  p_variant_id uuid,
  p_mode text,
  p_quantity integer,
  p_reason text,
  p_op_key text default null,
  p_verify boolean default true
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_admin();
  inv public.inventory;
  new_on_hand integer;
  delta integer;
  prior_verified boolean;
  existing public.inventory_movements;
begin
  if p_mode not in ('set', 'delta') or p_quantity is null or char_length(btrim(coalesce(p_reason, ''))) < 3 then
    perform private.fail('invalid_request');
  end if;
  if p_op_key is not null then
    select * into existing from public.inventory_movements where op_key = p_op_key;
    if found then
      select * into inv from public.inventory where variant_id = existing.variant_id;
      return jsonb_build_object('replayed', true, 'on_hand', inv.on_hand, 'reserved', inv.reserved);
    end if;
  end if;
  select * into inv from public.inventory where variant_id = p_variant_id for update;
  if not found then
    perform private.fail('variant_unavailable');
  end if;
  prior_verified := inv.stock_verified;
  new_on_hand := case p_mode when 'set' then p_quantity else inv.on_hand + p_quantity end;
  if new_on_hand < 0 or new_on_hand > 1000000 then
    perform private.fail('invalid_quantity');
  end if;
  if new_on_hand < inv.reserved then
    perform private.fail('below_reserved', jsonb_build_object('reserved', inv.reserved));
  end if;
  delta := new_on_hand - inv.on_hand;
  update public.inventory
     set on_hand = new_on_hand,
         stock_verified = case when p_verify then true else stock_verified end,
         verified_at = case when p_verify then now() else verified_at end,
         verified_by = case when p_verify then actor else verified_by end,
         updated_at = now()
   where variant_id = p_variant_id;
  insert into public.inventory_movements (variant_id, kind, delta_on_hand, reason, actor_id, op_key)
  values (p_variant_id, case when not prior_verified and p_mode = 'set' then 'initial_count' else 'adjustment' end, delta, left(btrim(p_reason), 300), actor, p_op_key);
  return jsonb_build_object('replayed', false, 'on_hand', new_on_hand, 'reserved', inv.reserved);
end;
$$;

create or replace function public.admin_set_low_stock_threshold(p_variant_id uuid, p_threshold integer)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_admin();
begin
  if p_threshold is null or p_threshold < 0 or p_threshold > 100000 then
    perform private.fail('invalid_quantity');
  end if;
  update public.inventory set low_stock_threshold = p_threshold, updated_at = now() where variant_id = p_variant_id;
  perform private.audit_action(actor, 'update', 'public.inventory', p_variant_id::text, jsonb_build_object('low_stock_threshold', p_threshold));
end;
$$;

-- ---------------------------------------------------------------- images
create or replace function public.admin_approve_image(p_image_id uuid, p_public_path text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_admin();
begin
  if p_public_path is null or char_length(p_public_path) not between 3 and 300 or p_public_path ~ '\.\.' or p_public_path ~ '^/' then
    perform private.fail('invalid_request');
  end if;
  -- Approval needs provenance recorded (source and licence) so a stand-in is never approved by accident.
  if exists (select 1 from public.product_images im where im.id = p_image_id and (coalesce(btrim(im.source_name), '') = '' or coalesce(btrim(im.licence), '') = '')) then
    perform private.fail('provenance_required');
  end if;
  update public.product_images
     set bucket = 'product-public', path = p_public_path, approval_status = 'approved', approved_by = actor, approved_at = now()
   where id = p_image_id;
  if not found then
    perform private.fail('not_found');
  end if;
end;
$$;

create or replace function public.admin_reject_image(p_image_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_admin();
begin
  update public.product_images set approval_status = 'rejected', is_cover = false where id = p_image_id and bucket = 'product-private';
  if not found then
    perform private.fail('not_found');
  end if;
  perform private.audit_action(actor, 'reject', 'public.product_images', p_image_id::text);
end;
$$;

create or replace function public.admin_delete_draft_product(p_product_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_admin();
begin
  if not exists (select 1 from public.products p where p.id = p_product_id and p.status = 'draft') then
    perform private.fail('only_drafts_can_be_deleted');
  end if;
  if exists (select 1 from public.order_items oi join public.product_variants v on v.id = oi.variant_id where v.product_id = p_product_id) then
    perform private.fail('product_has_orders');
  end if;
  delete from public.products where id = p_product_id;
  perform private.audit_action(actor, 'delete_draft', 'public.products', p_product_id::text);
end;
$$;

-- ---------------------------------------------------------------- store readiness and ordering switch
create or replace function public.admin_ordering_readiness()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  problems text[] := '{}';
begin
  perform private.require_admin();
  if not exists (select 1 from public.payment_methods where enabled) then problems := array_append(problems, 'no_enabled_payment_method'); end if;
  if not exists (
    select 1 from public.shipping_methods m join public.shipping_rates r on r.method_code = m.code and r.enabled
     where m.enabled) then problems := array_append(problems, 'no_enabled_shipping_rate'); end if;
  if not exists (
    select 1 from public.products p join public.product_variants v on v.product_id = p.id and v.active and v.price_pkr > 0
      join public.inventory i on i.variant_id = v.id and i.stock_verified
     where p.status = 'published' and p.ready_to_sell) then problems := array_append(problems, 'no_purchasable_product'); end if;
  if not exists (
    select 1 from public.store_settings s
     where s.key in ('contact.email', 'contact.phone', 'contact.whatsapp') and s.value <> 'null'::jsonb and s.value <> '""'::jsonb) then problems := array_append(problems, 'no_contact_channel'); end if;
  if exists (
    select 1 from public.policy_pages pp
     -- Seeded placeholder text does not count: an admin must have published each policy (updated_by is set by admin_publish_policy).
       where pp.slug in ('shipping', 'refund-policy', 'privacy-policy', 'terms-and-conditions') and (pp.published_at is null or pp.updated_by is null)) then problems := array_append(problems, 'policies_not_published'); end if;
  return jsonb_build_object('ready', cardinality(problems) = 0, 'problems', to_jsonb(problems));
end;
$$;

create or replace function public.admin_set_ordering_enabled(p_enabled boolean)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_admin(true);
  readiness jsonb;
begin
  if p_enabled then
    readiness := public.admin_ordering_readiness();
    if not (readiness ->> 'ready')::boolean then
      perform private.fail('not_ready_for_ordering', readiness -> 'problems');
    end if;
  end if;
  perform set_config('oldverge.ordering_toggle', 'on', true);
  update public.store_settings set value = to_jsonb(p_enabled), updated_by = actor where key = 'ordering_enabled';
  perform set_config('oldverge.ordering_toggle', 'off', true);
  return jsonb_build_object('ordering_enabled', p_enabled);
end;
$$;

create or replace function public.admin_publish_policy(p_slug text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_admin(true);
  v integer;
begin
  update public.policy_pages pp
     set published_sections = d.sections, version = pp.version + 1, published_at = now(), updated_by = actor
    from public.policy_drafts d
   where pp.slug = p_slug and d.slug = pp.slug and jsonb_array_length(d.sections) > 0
  returning pp.version into v;
  if not found then
    perform private.fail('policy_draft_empty');
  end if;
  return jsonb_build_object('slug', p_slug, 'version', v);
end;
$$;

-- ---------------------------------------------------------------- orders
create or replace function private.add_event(p_order_id uuid, p_kind text, p_from text, p_to text, p_actor uuid, p_message text, p_visible boolean default true)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.order_events (order_id, kind, from_state, to_state, actor_kind, actor_id, message, visible_to_customer)
  values (p_order_id, p_kind, p_from, p_to, 'admin', p_actor, left(coalesce(p_message, ''), 500), p_visible);
$$;

create or replace function public.admin_set_fulfilment(p_order_id uuid, p_to text, p_note text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_admin();
  o public.orders;
  allowed boolean;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then perform private.fail('not_found'); end if;
  -- Transition matrix. Cancellation has its own function (it also handles stock and refunds).
  allowed := (o.fulfilment_status = 'unfulfilled' and p_to = 'processing')
          or (o.fulfilment_status = 'processing' and p_to = 'shipped')
          or (o.fulfilment_status = 'shipped' and p_to = 'delivered');
  if not allowed then
    perform private.fail('invalid_transition', jsonb_build_object('from', o.fulfilment_status, 'to', p_to));
  end if;
  if p_to in ('processing', 'shipped') and o.payment_status in ('pending', 'failed') then
    perform private.fail('payment_not_settled');
  end if;
  update public.orders set fulfilment_status = p_to where id = o.id;
  perform private.add_event(o.id, 'fulfilment_' || p_to, o.fulfilment_status, p_to, actor, coalesce(p_note, 'Order ' || p_to || '.'));
  return jsonb_build_object('fulfilment_status', p_to);
end;
$$;

create or replace function public.admin_record_shipment(
  p_order_id uuid, p_carrier text, p_tracking_number text, p_tracking_url text default null, p_mark_shipped boolean default true
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_admin();
  o public.orders;
  new_status text;
begin
  if char_length(btrim(coalesce(p_carrier, ''))) not between 1 and 80
     or char_length(btrim(coalesce(p_tracking_number, ''))) not between 1 and 80
     or (p_tracking_url is not null and (p_tracking_url !~ '^https://[^\s]{4,250}$')) then
    perform private.fail('invalid_request');
  end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then perform private.fail('not_found'); end if;
  if o.fulfilment_status in ('cancelled', 'delivered') then
    perform private.fail('invalid_transition', jsonb_build_object('from', o.fulfilment_status));
  end if;
  new_status := o.fulfilment_status;
  if p_mark_shipped and o.fulfilment_status in ('unfulfilled', 'processing') then
    if o.payment_status in ('pending', 'failed') then perform private.fail('payment_not_settled'); end if;
    new_status := 'shipped';
  end if;
  update public.orders
     set tracking_carrier = btrim(p_carrier), tracking_number = btrim(p_tracking_number), tracking_url = p_tracking_url, fulfilment_status = new_status
   where id = o.id;
  perform private.add_event(o.id, 'shipment_recorded', o.fulfilment_status, new_status, actor,
    'Dispatched with ' || btrim(p_carrier) || ', tracking ' || btrim(p_tracking_number) || '. (Recorded manually.)');
  return jsonb_build_object('fulfilment_status', new_status);
end;
$$;

create or replace function public.admin_cancel_order(p_order_id uuid, p_reason text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_admin();
  o public.orders;
begin
  if char_length(btrim(coalesce(p_reason, ''))) < 3 then perform private.fail('invalid_request'); end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then perform private.fail('not_found'); end if;
  if o.fulfilment_status not in ('unfulfilled', 'processing') then
    perform private.fail('invalid_transition', jsonb_build_object('from', o.fulfilment_status, 'to', 'cancelled'));
  end if;
  if o.stock_state = 'reserved' then
    perform private.release_order_reservations(o.id, 'order cancelled');
  elsif o.stock_state = 'committed' then
    perform private.restock_cancelled_order(o.id);
  end if;
  update public.orders
     set fulfilment_status = 'cancelled', cancelled_at = now(), cancel_reason = left(btrim(p_reason), 300),
         payment_status = case when payment_status = 'pending' then 'failed' else payment_status end,
         needs_attention = case when payment_status in ('paid', 'partially_refunded') then true else needs_attention end,
         attention_reason = case when payment_status in ('paid', 'partially_refunded') then 'refund_required' else attention_reason end
   where id = o.id;
  perform private.add_event(o.id, 'order_cancelled', o.fulfilment_status, 'cancelled', actor, 'Order cancelled.');
  return jsonb_build_object('fulfilment_status', 'cancelled', 'refund_required', o.payment_status in ('paid', 'partially_refunded'));
end;
$$;

-- Cash on delivery: the admin records that the courier handed over the money.
create or replace function public.admin_mark_cod_paid(p_order_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_admin();
  o public.orders;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then perform private.fail('not_found'); end if;
  if o.payment_status <> 'unpaid' or o.fulfilment_status = 'cancelled'
     or not exists (select 1 from public.payment_methods pm where pm.code = o.payment_method_code and pm.kind = 'cod') then
    perform private.fail('invalid_transition', jsonb_build_object('from', o.payment_status));
  end if;
  update public.orders set payment_status = 'paid' where id = o.id;
  perform private.add_event(o.id, 'payment_recorded', 'unpaid', 'paid', actor, 'Cash payment recorded.');
end;
$$;

create or replace function public.admin_add_order_note(p_order_id uuid, p_note text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_admin();
begin
  insert into public.order_notes (order_id, author_id, note) values (p_order_id, actor, left(btrim(p_note), 2000));
end;
$$;

create or replace function public.admin_clear_attention(p_order_id uuid, p_note text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_admin();
begin
  if char_length(btrim(coalesce(p_note, ''))) < 3 then perform private.fail('invalid_request'); end if;
  update public.orders set needs_attention = false, attention_reason = null where id = p_order_id;
  insert into public.order_notes (order_id, author_id, note) values (p_order_id, actor, 'Attention cleared: ' || left(btrim(p_note), 1900));
end;
$$;

create or replace function public.admin_revoke_order_access(p_order_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_admin();
begin
  update private.order_access_tokens set revoked_at = now() where order_id = p_order_id and revoked_at is null;
  perform private.audit_action(actor, 'revoke_access', 'public.orders', p_order_id::text);
end;
$$;

-- ---------------------------------------------------------------- returns and refunds (manual records)
create or replace function public.admin_create_return(p_order_id uuid, p_reason text, p_items jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_admin();
  rid uuid;
  it jsonb;
  oi public.order_items;
  already integer;
begin
  if char_length(btrim(coalesce(p_reason, ''))) not between 1 and 500 or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    perform private.fail('invalid_request');
  end if;
  if not exists (select 1 from public.orders o where o.id = p_order_id) then perform private.fail('not_found'); end if;
  insert into public.order_returns (order_id, reason, created_by) values (p_order_id, btrim(p_reason), actor) returning id into rid;
  for it in select * from jsonb_array_elements(p_items) loop
    select * into oi from public.order_items where id = (it ->> 'order_item_id')::uuid and order_id = p_order_id;
    if not found or coalesce(it ->> 'quantity', '') !~ '^[0-9]{1,2}$' then perform private.fail('invalid_request'); end if;
    select coalesce(sum(ri.quantity), 0) into already from public.order_return_items ri
      join public.order_returns r on r.id = ri.return_id where ri.order_item_id = oi.id and r.status <> 'rejected' and r.id <> rid;
    if (it ->> 'quantity')::integer < 1 or (it ->> 'quantity')::integer + already > oi.quantity then
      perform private.fail('invalid_quantity', jsonb_build_object('order_item_id', oi.id));
    end if;
    insert into public.order_return_items (return_id, order_item_id, quantity) values (rid, oi.id, (it ->> 'quantity')::integer);
  end loop;
  perform private.add_event(p_order_id, 'return_opened', null, 'requested', actor, 'A return was opened for this order.', true);
  return rid;
end;
$$;

create or replace function public.admin_set_return_status(p_return_id uuid, p_to text, p_note text default null)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_admin();
  r public.order_returns;
  allowed boolean;
begin
  select * into r from public.order_returns where id = p_return_id for update;
  if not found then perform private.fail('not_found'); end if;
  allowed := (r.status = 'requested' and p_to in ('approved', 'rejected'))
          or (r.status = 'approved' and p_to = 'received')
          or (r.status in ('rejected', 'received') and p_to = 'closed');
  if not allowed then perform private.fail('invalid_transition', jsonb_build_object('from', r.status, 'to', p_to)); end if;
  update public.order_returns set status = p_to, admin_note = coalesce(left(p_note, 500), admin_note) where id = r.id;
  perform private.add_event(r.order_id, 'return_' || p_to, r.status, p_to, actor, 'Return ' || p_to || '.', true);
end;
$$;

-- Returned goods go back on sale only after an admin confirms they are sellable, and only once.
create or replace function public.admin_restock_return_item(p_return_item_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_admin();
  ri public.order_return_items;
  r public.order_returns;
  oi public.order_items;
begin
  select * into ri from public.order_return_items where id = p_return_item_id for update;
  if not found then perform private.fail('not_found'); end if;
  select * into r from public.order_returns where id = ri.return_id;
  if r.status <> 'received' or ri.restocked_at is not null then
    perform private.fail('invalid_transition', jsonb_build_object('status', r.status));
  end if;
  select * into oi from public.order_items where id = ri.order_item_id;
  if oi.variant_id is null then perform private.fail('variant_unavailable'); end if;
  perform 1 from public.inventory where variant_id = oi.variant_id for update;
  update public.inventory set on_hand = on_hand + ri.quantity, updated_at = now() where variant_id = oi.variant_id;
  insert into public.inventory_movements (variant_id, kind, delta_on_hand, reason, order_id, actor_id)
  values (oi.variant_id, 'return_restock', ri.quantity, 'returned item confirmed sellable', r.order_id, actor);
  update public.order_return_items set restocked_at = now() where id = ri.id;
end;
$$;

create or replace function public.admin_request_refund(p_order_id uuid, p_amount_pkr integer, p_note text, p_return_id uuid default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_admin();
  o public.orders;
  confirmed_total integer;
  open_total integer;
  rid uuid;
begin
  if p_amount_pkr is null or p_amount_pkr < 1 or char_length(btrim(coalesce(p_note, ''))) < 3 then perform private.fail('invalid_request'); end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then perform private.fail('not_found'); end if;
  if o.payment_status not in ('paid', 'partially_refunded') then perform private.fail('nothing_to_refund'); end if;
  select coalesce(sum(amount_pkr) filter (where status = 'confirmed'), 0), coalesce(sum(amount_pkr) filter (where status = 'requested'), 0)
    into confirmed_total, open_total from public.refunds where order_id = o.id;
  if confirmed_total + open_total + p_amount_pkr > o.total_pkr then perform private.fail('refund_exceeds_total'); end if;
  -- Only manual refunds can be recorded here. Provider refunds need a configured provider adapter.
  insert into public.refunds (order_id, return_id, amount_pkr, method, note, requested_by)
  values (o.id, p_return_id, p_amount_pkr, 'manual', left(btrim(p_note), 500), actor) returning id into rid;
  return rid;
end;
$$;

-- Marks money as returned. Only this audited confirmation changes the order's payment state.
create or replace function public.admin_confirm_refund(p_refund_id uuid, p_note text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_admin();
  rf public.refunds;
  o public.orders;
  confirmed_total integer;
  new_status text;
begin
  if char_length(btrim(coalesce(p_note, ''))) < 3 then perform private.fail('invalid_request'); end if;
  select * into rf from public.refunds where id = p_refund_id for update;
  if not found then perform private.fail('not_found'); end if;
  if rf.status <> 'requested' or rf.method <> 'manual' then perform private.fail('invalid_transition', jsonb_build_object('from', rf.status)); end if;
  select * into o from public.orders where id = rf.order_id for update;
  update public.refunds set status = 'confirmed', confirmed_by = actor, confirmed_at = now(), note = left(rf.note || ' | confirmed: ' || btrim(p_note), 500) where id = rf.id;
  select coalesce(sum(amount_pkr), 0) into confirmed_total from public.refunds where order_id = o.id and status = 'confirmed';
  new_status := case when confirmed_total >= o.total_pkr then 'refunded' else 'partially_refunded' end;
  update public.orders set payment_status = new_status, needs_attention = case when attention_reason = 'refund_required' then false else needs_attention end,
         attention_reason = case when attention_reason = 'refund_required' then null else attention_reason end where id = o.id;
  perform private.add_event(o.id, 'refund_confirmed', o.payment_status, new_status, actor, 'A refund of PKR ' || rf.amount_pkr || ' was recorded as returned to you.');
  return jsonb_build_object('payment_status', new_status);
end;
$$;

-- ---------------------------------------------------------------- dashboard and export
create or replace function public.admin_dashboard_stats(p_from timestamptz default null, p_to timestamptz default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  f timestamptz := coalesce(p_from, now() - interval '30 days');
  t timestamptz := coalesce(p_to, now());
  result jsonb;
begin
  perform private.require_admin();
  select jsonb_build_object(
    'from', f, 'to', t,
    -- Revenue: real (non-test) orders that are paid or partly refunded and not cancelled, minus confirmed refunds.
    'revenue_pkr', coalesce((select sum(o.total_pkr) from public.orders o
        where o.placed_at between f and t and not o.is_test and o.fulfilment_status <> 'cancelled'
          and o.payment_status in ('paid', 'partially_refunded')), 0)
      - coalesce((select sum(r.amount_pkr) from public.refunds r join public.orders o on o.id = r.order_id
        where r.status = 'confirmed' and o.placed_at between f and t and not o.is_test and o.fulfilment_status <> 'cancelled'), 0),
    'awaiting_cod_pkr', coalesce((select sum(o.total_pkr) from public.orders o
        where o.placed_at between f and t and not o.is_test and o.fulfilment_status <> 'cancelled' and o.payment_status = 'unpaid'), 0),
    'orders_total', (select count(*) from public.orders o where o.placed_at between f and t and not o.is_test),
    'by_fulfilment', coalesce((select jsonb_object_agg(s.fulfilment_status, s.n) from (
        select o.fulfilment_status, count(*) as n from public.orders o where o.placed_at between f and t and not o.is_test group by 1) s), '{}'::jsonb),
    'by_payment', coalesce((select jsonb_object_agg(s.payment_status, s.n) from (
        select o.payment_status, count(*) as n from public.orders o where o.placed_at between f and t and not o.is_test group by 1) s), '{}'::jsonb),
    'needs_attention', (select count(*) from public.orders o where o.needs_attention),
    'unread_messages', (select count(*) from public.contact_messages m where m.status = 'new'),
    'failed_notifications', (select count(*) from public.notification_outbox n where n.status = 'failed'),
    'low_stock', coalesce((select jsonb_agg(x) from (
        select jsonb_build_object('variant_id', v.id, 'sku', v.sku, 'product', p.name, 'available', i.on_hand - i.reserved, 'threshold', i.low_stock_threshold) as x
          from public.inventory i join public.product_variants v on v.id = i.variant_id join public.products p on p.id = v.product_id
         where i.stock_verified and v.active and p.status = 'published' and (i.on_hand - i.reserved) <= i.low_stock_threshold
         order by (i.on_hand - i.reserved), p.name limit 20) q), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

create or replace function public.admin_export_orders(p_from timestamptz, p_to timestamptz, p_limit integer default 1000)
returns table (
  order_number text, placed_at timestamptz, customer_name text, customer_email text, customer_phone text, city text, province text,
  payment_method text, payment_status text, fulfilment_status text, subtotal_pkr integer, shipping_pkr integer, total_pkr integer, is_test boolean
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_admin();
  lim integer := greatest(1, least(coalesce(p_limit, 1000), 5000));
begin
  perform private.audit_action(actor, 'export', 'public.orders', null, jsonb_build_object('from', p_from, 'to', p_to, 'limit', lim));
  return query
  select o.order_number, o.placed_at, o.customer_name, o.customer_email, o.customer_phone,
         o.shipping_address ->> 'city', o.shipping_address ->> 'province',
         o.payment_method_label, o.payment_status, o.fulfilment_status, o.subtotal_pkr, o.shipping_pkr, o.total_pkr, o.is_test
    from public.orders o
   where o.placed_at between coalesce(p_from, now() - interval '30 days') and coalesce(p_to, now())
   order by o.placed_at desc limit lim;
end;
$$;

create or replace function public.admin_run_maintenance()
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return public.run_maintenance();
end;
$$;


-- >>> START MIGRATION: 20261019000600_admin_queries.sql <<<
-- Admin read models for orders. Customers read their own orders with a column-restricted SELECT;
-- admins read everything (including internal flags and notes) only through these functions.

create or replace function public.admin_list_orders(
  p_search text default null,
  p_fulfilment text default null,
  p_payment text default null,
  p_attention boolean default null,
  p_include_test boolean default true,
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  lim integer := greatest(1, least(coalesce(p_limit, 25), 100));
  off integer := greatest(0, coalesce(p_offset, 0));
  pattern text;
  total bigint;
  rows jsonb;
begin
  perform private.require_admin();
  pattern := case when coalesce(btrim(p_search), '') = '' then null
                  else '%' || replace(replace(replace(lower(left(btrim(p_search), 80)), '\', '\\'), '%', '\%'), '_', '\_') || '%' end;
  select count(*) into total from public.orders o
   where (pattern is null or lower(o.order_number) like pattern escape '\' or lower(o.customer_email) like pattern escape '\' or lower(o.customer_name) like pattern escape '\')
     and (p_fulfilment is null or o.fulfilment_status = p_fulfilment)
     and (p_payment is null or o.payment_status = p_payment)
     and (p_attention is null or o.needs_attention = p_attention)
     and (coalesce(p_include_test, true) or not o.is_test);
  select coalesce(jsonb_agg(r order by r.placed_at desc), '[]'::jsonb) into rows from (
    select o.id, o.order_number, o.placed_at, o.customer_name, o.customer_email, o.total_pkr, o.payment_status, o.fulfilment_status,
           o.payment_method_label, o.needs_attention, o.attention_reason, o.is_test,
           (select coalesce(sum(i.quantity), 0) from public.order_items i where i.order_id = o.id) as item_count
      from public.orders o
     where (pattern is null or lower(o.order_number) like pattern escape '\' or lower(o.customer_email) like pattern escape '\' or lower(o.customer_name) like pattern escape '\')
       and (p_fulfilment is null or o.fulfilment_status = p_fulfilment)
       and (p_payment is null or o.payment_status = p_payment)
       and (p_attention is null or o.needs_attention = p_attention)
       and (coalesce(p_include_test, true) or not o.is_test)
     order by o.placed_at desc limit lim offset off) r;
  return jsonb_build_object('total', total, 'rows', rows);
end;
$$;

create or replace function public.admin_get_order(p_order_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  perform private.require_admin();
  select jsonb_build_object(
    'order', to_jsonb(o) - 'user_id',
    'has_account', o.user_id is not null,
    'items', coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at, i.id) from public.order_items i where i.order_id = o.id), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at, e.id) from public.order_events e where e.order_id = o.id), '[]'::jsonb),
    'notes', coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at) from public.order_notes n where n.order_id = o.id), '[]'::jsonb),
    'payment_attempts', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at) from public.payment_attempts p where p.order_id = o.id), '[]'::jsonb),
    'reservations', coalesce((select jsonb_agg(to_jsonb(s) order by s.created_at) from public.stock_reservations s where s.order_id = o.id), '[]'::jsonb),
    'returns', coalesce((select jsonb_agg(jsonb_build_object('return', to_jsonb(r),
        'items', coalesce((select jsonb_agg(to_jsonb(ri)) from public.order_return_items ri where ri.return_id = r.id), '[]'::jsonb)) order by r.created_at)
        from public.order_returns r where r.order_id = o.id), '[]'::jsonb),
    'refunds', coalesce((select jsonb_agg(to_jsonb(f) order by f.created_at) from public.refunds f where f.order_id = o.id), '[]'::jsonb)
  ) into result
  from public.orders o where o.id = p_order_id;
  if result is null then
    perform private.fail('not_found');
  end if;
  return result;
end;
$$;


-- >>> START MIGRATION: 20261019000700_rls_grants_storage.sql <<<
-- Row-level security policies, explicit table/column grants, function EXECUTE grants and Storage.
-- Nothing is granted by default. Every grant below is deliberate and is asserted by supabase/tests.

-- ---------------------------------------------------------------- start from nothing
revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke all on all tables in schema private from public, anon, authenticated;
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private') and p.prokind = 'f'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

-- ---------------------------------------------------------------- public catalogue (read)
create policy categories_read on public.categories for select to anon, authenticated using (active or public.is_admin());
create policy categories_admin_write on public.categories for insert to authenticated with check (public.is_admin());
create policy categories_admin_update on public.categories for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy brands_read on public.brands for select to anon, authenticated using (active or public.is_admin());
create policy brands_admin_write on public.brands for insert to authenticated with check (public.is_admin());
create policy brands_admin_update on public.brands for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy products_read on public.products for select to anon, authenticated using (status = 'published' or public.is_admin());
create policy products_admin_write on public.products for insert to authenticated with check (public.is_admin());
create policy products_admin_update on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy variants_read on public.product_variants for select to anon, authenticated
  using (public.is_admin() or (active and exists (select 1 from public.products p where p.id = product_id and p.status = 'published')));
create policy variants_admin_write on public.product_variants for insert to authenticated with check (public.is_admin());
create policy variants_admin_update on public.product_variants for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy images_read on public.product_images for select to anon, authenticated
  using (public.is_admin() or (approval_status = 'approved' and bucket = 'product-public'
        and exists (select 1 from public.products p where p.id = product_id and p.status = 'published')));
create policy images_admin_write on public.product_images for insert to authenticated with check (public.is_admin());
create policy images_admin_update on public.product_images for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy images_admin_delete on public.product_images for delete to authenticated using (public.is_admin());

create policy site_images_read on public.site_images for select to anon, authenticated
  using (public.is_admin() or (approval_status = 'approved' and bucket = 'product-public'));
create policy site_images_admin_write on public.site_images for insert to authenticated with check (public.is_admin());
create policy site_images_admin_update on public.site_images for update to authenticated using (public.is_admin()) with check (public.is_admin());

grant select on public.categories, public.brands, public.products, public.product_variants, public.product_images, public.site_images to anon, authenticated;
grant insert, update on public.categories, public.brands, public.products, public.product_variants, public.product_images, public.site_images to authenticated;
grant delete on public.product_images to authenticated;

-- ---------------------------------------------------------------- settings, shipping, payment, policies
create policy store_settings_read on public.store_settings for select to anon, authenticated using (is_public or public.is_admin());
create policy store_settings_admin_insert on public.store_settings for insert to authenticated with check (public.is_admin());
create policy store_settings_admin_update on public.store_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.store_settings to anon, authenticated;
grant insert, update (value, is_public) on public.store_settings to authenticated;

create policy shipping_zones_read on public.shipping_zones for select to anon, authenticated using (true);
create policy shipping_zones_admin_write on public.shipping_zones for insert to authenticated with check (public.is_admin());
create policy shipping_zones_admin_update on public.shipping_zones for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy shipping_methods_read on public.shipping_methods for select to anon, authenticated using (enabled or public.is_admin());
create policy shipping_methods_admin_write on public.shipping_methods for insert to authenticated with check (public.is_admin());
create policy shipping_methods_admin_update on public.shipping_methods for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy shipping_rates_read on public.shipping_rates for select to anon, authenticated using (public.is_admin() or (enabled and exists (select 1 from public.shipping_methods m where m.code = method_code and m.enabled)));
create policy shipping_rates_admin_write on public.shipping_rates for insert to authenticated with check (public.is_admin());
create policy shipping_rates_admin_update on public.shipping_rates for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy payment_methods_read on public.payment_methods for select to anon, authenticated using (enabled or public.is_admin());
create policy payment_methods_admin_write on public.payment_methods for insert to authenticated with check (public.is_admin());
create policy payment_methods_admin_update on public.payment_methods for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.shipping_zones, public.shipping_methods, public.shipping_rates, public.payment_methods to anon, authenticated;
grant insert, update on public.shipping_zones, public.shipping_methods, public.shipping_rates, public.payment_methods to authenticated;

create policy policy_pages_read on public.policy_pages for select to anon, authenticated using (published_at is not null or public.is_admin());
create policy policy_pages_admin_update on public.policy_pages for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.policy_pages to anon, authenticated;
grant update (title) on public.policy_pages to authenticated;
create policy policy_drafts_admin_select on public.policy_drafts for select to authenticated using (public.is_admin());
create policy policy_drafts_admin_update on public.policy_drafts for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.policy_drafts to authenticated;
grant update (sections) on public.policy_drafts to authenticated;

-- ---------------------------------------------------------------- customers
create policy profiles_own_select on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy profiles_own_update on public.profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select on public.profiles to authenticated;
grant update (display_name, phone) on public.profiles to authenticated;

create policy addresses_own_select on public.addresses for select to authenticated using (user_id = (select auth.uid()));
create policy addresses_own_insert on public.addresses for insert to authenticated with check (user_id = (select auth.uid()));
create policy addresses_own_update on public.addresses for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy addresses_own_delete on public.addresses for delete to authenticated using (user_id = (select auth.uid()));
grant select, delete on public.addresses to authenticated;
grant insert (label, recipient, phone, line1, line2, city, province, postal_code, is_default) on public.addresses to authenticated;
grant update (label, recipient, phone, line1, line2, city, province, postal_code, is_default) on public.addresses to authenticated;

-- ---------------------------------------------------------------- orders (customers read their own, nothing else)
create policy orders_own_select on public.orders for select to authenticated using (user_id = (select auth.uid()));
-- user_id and visible_to_customer must be selectable because the row policies read them as the caller.
grant select (id, user_id, order_number, placed_at, customer_name, customer_email, customer_phone, shipping_address, currency,
              subtotal_pkr, shipping_pkr, tax_pkr, tax_status, total_pkr, payment_method_code, payment_method_label, payment_status,
              fulfilment_status, shipping_method_code, shipping_method_label, tracking_carrier, tracking_number, tracking_url,
              cancelled_at, cancel_reason, created_at, updated_at)
  on public.orders to authenticated;

create policy order_items_own_select on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
grant select on public.order_items to authenticated;

create policy order_events_own_select on public.order_events for select to authenticated
  using (visible_to_customer and exists (select 1 from public.orders o where o.id = order_id and o.user_id = (select auth.uid())));
grant select (id, order_id, kind, from_state, to_state, message, visible_to_customer, created_at) on public.order_events to authenticated;

-- ---------------------------------------------------------------- admin-only reads (no customer access at all)
create policy order_notes_admin on public.order_notes for select to authenticated using (public.is_admin());
create policy payment_attempts_admin on public.payment_attempts for select to authenticated using (public.is_admin());
create policy inventory_admin on public.inventory for select to authenticated using (public.is_admin());
create policy inventory_movements_admin on public.inventory_movements for select to authenticated using (public.is_admin());
create policy stock_reservations_admin on public.stock_reservations for select to authenticated using (public.is_admin());
create policy order_returns_admin on public.order_returns for select to authenticated using (public.is_admin());
create policy order_return_items_admin on public.order_return_items for select to authenticated using (public.is_admin());
create policy refunds_admin on public.refunds for select to authenticated using (public.is_admin());
create policy outbox_admin on public.notification_outbox for select to authenticated using (public.is_admin());
create policy audit_admin on public.admin_audit_log for select to authenticated using (public.is_admin());
grant select on public.order_notes, public.payment_attempts, public.inventory, public.inventory_movements, public.stock_reservations,
                public.order_returns, public.order_return_items, public.refunds, public.notification_outbox, public.admin_audit_log to authenticated;

create policy contact_messages_admin_select on public.contact_messages for select to authenticated using (public.is_admin());
create policy contact_messages_admin_update on public.contact_messages for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.contact_messages to authenticated;
grant update (status, admin_note) on public.contact_messages to authenticated;

create policy newsletter_admin_select on public.newsletter_subscriptions for select to authenticated using (public.is_admin());
grant select (id, email, consent_text, consent_at, source, unsubscribed_at, created_at) on public.newsletter_subscriptions to authenticated;

-- ---------------------------------------------------------------- function EXECUTE grants
-- Policy expressions run as the caller, so the identity helpers must be callable.
grant execute on function public.is_admin(), public.admin_role() to anon, authenticated;
grant execute on function public.catalog_availability(uuid[]), public.search_catalog(text, integer) to anon, authenticated;

-- Admin operations: callable by signed-in users but every one re-checks protected admin membership.
grant execute on function
  public.product_readiness(uuid),
  public.admin_adjust_inventory(uuid, text, integer, text, text, boolean),
  public.admin_set_low_stock_threshold(uuid, integer),
  public.admin_approve_image(uuid, text),
  public.admin_reject_image(uuid),
  public.admin_delete_draft_product(uuid),
  public.admin_ordering_readiness(),
  public.admin_set_ordering_enabled(boolean),
  public.admin_publish_policy(text),
  public.admin_set_fulfilment(uuid, text, text),
  public.admin_record_shipment(uuid, text, text, text, boolean),
  public.admin_cancel_order(uuid, text),
  public.admin_mark_cod_paid(uuid),
  public.admin_add_order_note(uuid, text),
  public.admin_clear_attention(uuid, text),
  public.admin_revoke_order_access(uuid),
  public.admin_create_return(uuid, text, jsonb),
  public.admin_set_return_status(uuid, text, text),
  public.admin_restock_return_item(uuid),
  public.admin_request_refund(uuid, integer, text, uuid),
  public.admin_confirm_refund(uuid, text),
  public.admin_dashboard_stats(timestamptz, timestamptz),
  public.admin_export_orders(timestamptz, timestamptz, integer),
  public.admin_run_maintenance(),
  public.admin_list_orders(text, text, text, boolean, boolean, integer, integer),
  public.admin_get_order(uuid)
  to authenticated;

-- Server-only operations: the Edge Functions call these with the service role after their own checks.
grant execute on function
  public.quote_order(jsonb, text, text, text),
  public.create_order(uuid, uuid, bytea, text, jsonb, integer, bytea, boolean),
  public.get_order_for_access(text, bytea),
  public.order_projection(uuid),
  public.apply_payment_event(text, text, uuid, integer, text, text, text),
  public.run_maintenance(),
  public.hit_rate_limit(text, integer, integer),
  public.claim_outbox(integer),
  public.finish_outbox(uuid, text, text),
  public.submit_contact(jsonb),
  public.newsletter_subscribe(text, text, text, bytea),
  public.newsletter_unsubscribe(bytea)
  to service_role;
grant usage on schema private to service_role;

-- ---------------------------------------------------------------- Storage
-- product-public: approved, world-readable images only. product-private: unapproved originals and drafts
-- (admin only; a public bucket cannot hide drafts, so they never go there). order-private: attachments,
-- readable only through short-lived signed URLs issued by a server function (no client policies).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('product-public', 'product-public', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('product-private', 'product-private', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('order-private', 'order-private', false, 5242880, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "product-public read" on storage.objects for select to anon, authenticated using (bucket_id = 'product-public');
create policy "product-public admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'product-public' and public.is_admin());
create policy "product-public admin update" on storage.objects for update to authenticated using (bucket_id = 'product-public' and public.is_admin()) with check (bucket_id = 'product-public' and public.is_admin());
create policy "product-public admin delete" on storage.objects for delete to authenticated using (bucket_id = 'product-public' and public.is_admin());
create policy "product-private admin select" on storage.objects for select to authenticated using (bucket_id = 'product-private' and public.is_admin());
create policy "product-private admin insert" on storage.objects for insert to authenticated with check (bucket_id = 'product-private' and public.is_admin());
create policy "product-private admin update" on storage.objects for update to authenticated using (bucket_id = 'product-private' and public.is_admin()) with check (bucket_id = 'product-private' and public.is_admin());
create policy "product-private admin delete" on storage.objects for delete to authenticated using (bucket_id = 'product-private' and public.is_admin());


-- >>> START MIGRATION: 20261019000800_profile_backfill.sql <<<
-- Users that existed before the sign-up trigger get a profile row too (customers can update but not insert profiles).
insert into public.profiles (user_id, display_name)
select u.id, left(coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), ''), 80)
  from auth.users u
on conflict (user_id) do nothing;


-- >>> START MIGRATION: 20261019000900_image_integrity.sql <<<
-- Image approval can only happen through admin_approve_image / admin_reject_image (which require provenance and,
-- via the Edge Function, a verified copy in the public bucket). Direct table writes by an API user may not approve
-- an image, move it to the public bucket or set approval metadata. System/owner SQL (no JWT) is unaffected.

create or replace function private.guard_image_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or coalesce(current_setting('oldverge.image_action', true), '') = 'on' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.approval_status <> 'unverified' or new.bucket <> 'product-private' or new.approved_by is not null or new.approved_at is not null then
      perform private.fail('image_approval_via_function_only');
    end if;
  elsif new.approval_status is distinct from old.approval_status or new.bucket is distinct from old.bucket
     or new.path is distinct from old.path or new.approved_by is distinct from old.approved_by or new.approved_at is distinct from old.approved_at then
    perform private.fail('image_approval_via_function_only');
  end if;
  return new;
end;
$$;
create trigger product_images_guard before insert or update on public.product_images for each row execute function private.guard_image_state();

create or replace function public.admin_approve_image(p_image_id uuid, p_public_path text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_admin();
begin
  if p_public_path is null or char_length(p_public_path) not between 3 and 300 or p_public_path ~ '\.\.' or p_public_path ~ '^/' then
    perform private.fail('invalid_request');
  end if;
  if exists (select 1 from public.product_images im where im.id = p_image_id and (coalesce(btrim(im.source_name), '') = '' or coalesce(btrim(im.licence), '') = '')) then
    perform private.fail('provenance_required');
  end if;
  perform set_config('oldverge.image_action', 'on', true);
  update public.product_images
     set bucket = 'product-public', path = p_public_path, approval_status = 'approved', approved_by = actor, approved_at = now()
   where id = p_image_id;
  perform set_config('oldverge.image_action', 'off', true);
  if not found then
    perform private.fail('not_found');
  end if;
end;
$$;

create or replace function public.admin_reject_image(p_image_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_admin();
begin
  perform set_config('oldverge.image_action', 'on', true);
  update public.product_images set approval_status = 'rejected', is_cover = false where id = p_image_id and bucket = 'product-private';
  perform set_config('oldverge.image_action', 'off', true);
  if not found then
    perform private.fail('not_found');
  end if;
  perform private.audit_action(actor, 'reject', 'public.product_images', p_image_id::text);
end;
$$;

-- Atomic cover change: only an approved image of the same product can be the cover.
create or replace function public.admin_set_cover_image(p_image_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_admin();
  im public.product_images;
begin
  select * into im from public.product_images where id = p_image_id for update;
  if not found then perform private.fail('not_found'); end if;
  if im.approval_status <> 'approved' then perform private.fail('image_not_approved'); end if;
  update public.product_images set is_cover = false where product_id = im.product_id and is_cover and id <> im.id;
  update public.product_images set is_cover = true where id = im.id;
  perform private.audit_action(actor, 'set_cover', 'public.product_images', p_image_id::text);
end;
$$;

-- Friendly validation instead of a raw check-constraint error.
create or replace function public.admin_add_order_note(p_order_id uuid, p_note text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_admin();
  note text := btrim(coalesce(p_note, ''));
begin
  if char_length(note) not between 1 and 2000 then
    perform private.fail('invalid_request');
  end if;
  if not exists (select 1 from public.orders o where o.id = p_order_id) then
    perform private.fail('not_found');
  end if;
  insert into public.order_notes (order_id, author_id, note) values (p_order_id, actor, note);
end;
$$;

revoke all on function public.admin_set_cover_image(uuid) from public, anon, authenticated;
grant execute on function public.admin_set_cover_image(uuid) to authenticated;

revoke all on function private.guard_image_state() from public, anon, authenticated;


-- >>> START MIGRATION: 20261019001000_security_review_fixes.sql <<<
-- Fixes from the independent security review (2026-10-18). Additive: replaces functions and policies only.

-- 1. Protected private settings cannot be overridden by an admin-editable public.store_settings row.
create or replace function private.get_setting(p_key text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select s.value from private.settings s where s.key = p_key),
    (select s.value from public.store_settings s where s.key = p_key)
  );
$$;

-- 2. Approve/reject report not_found correctly (PERFORM resets FOUND, so use ROW_COUNT), and approval requires
--    that the validated copy already exists in the public bucket (only the service role can write there now).
create or replace function public.admin_approve_image(p_image_id uuid, p_public_path text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_admin();
  n integer;
begin
  if p_public_path is null or char_length(p_public_path) not between 3 and 300 or p_public_path ~ '\.\.' or p_public_path ~ '^/' then
    perform private.fail('invalid_request');
  end if;
  if exists (select 1 from public.product_images im where im.id = p_image_id and (coalesce(btrim(im.source_name), '') = '' or coalesce(btrim(im.licence), '') = '')) then
    perform private.fail('provenance_required');
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'product-public' and o.name = p_public_path) then
    perform private.fail('public_copy_missing');
  end if;
  perform set_config('oldverge.image_action', 'on', true);
  update public.product_images
     set bucket = 'product-public', path = p_public_path, approval_status = 'approved', approved_by = actor, approved_at = now()
   where id = p_image_id and bucket = 'product-private';
  get diagnostics n = row_count;
  perform set_config('oldverge.image_action', 'off', true);
  if n = 0 then
    perform private.fail('not_found');
  end if;
end;
$$;

create or replace function public.admin_reject_image(p_image_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  actor uuid := private.require_admin();
  n integer;
begin
  perform set_config('oldverge.image_action', 'on', true);
  update public.product_images set approval_status = 'rejected', is_cover = false where id = p_image_id and bucket = 'product-private';
  get diagnostics n = row_count;
  perform set_config('oldverge.image_action', 'off', true);
  if n = 0 then
    perform private.fail('not_found');
  end if;
  perform private.audit_action(actor, 'reject', 'public.product_images', p_image_id::text);
end;
$$;

-- 3. Public bucket: no client writes (the admin-approve-image Edge Function copies validated bytes with the
--    service role) and no listing (public object URLs keep working without a SELECT policy).
drop policy if exists "product-public read" on storage.objects;
drop policy if exists "product-public admin insert" on storage.objects;
drop policy if exists "product-public admin update" on storage.objects;
drop policy if exists "product-public admin delete" on storage.objects;

-- 4. site_images: API users may only add unverified private rows and may not change approval, bucket or path.
--    Approving a site image is an owner SQL / migration-script step (no JWT), recorded in the audit log.
create or replace function private.guard_site_image_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.approval_status <> 'unverified' or new.bucket <> 'product-private' then
      perform private.fail('image_approval_via_function_only');
    end if;
  elsif new.approval_status is distinct from old.approval_status or new.bucket is distinct from old.bucket or new.path is distinct from old.path then
    perform private.fail('image_approval_via_function_only');
  end if;
  return new;
end;
$$;
revoke all on function private.guard_site_image_state() from public;
create trigger site_images_guard before insert or update on public.site_images for each row execute function private.guard_site_image_state();


-- >>> START MIGRATION: 20261019001100_customer_cart.sql <<<
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


