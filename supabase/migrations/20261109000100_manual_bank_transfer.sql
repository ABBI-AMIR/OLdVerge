-- Manual bank transfers commit the ordered stock until the owner verifies or cancels.
alter table public.payment_methods drop constraint payment_methods_kind_check;
alter table public.payment_methods add constraint payment_methods_kind_check check (kind in ('cod','online','bank_transfer'));
insert into public.payment_methods(code,label,description,kind,enabled,sort_order)
values ('allied_bank','Allied Bank transfer','Place your order first, then transfer the exact total and send the receipt with your order number on WhatsApp.','bank_transfer',false,20);

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
  elsif pay.kind = 'bank_transfer' then
    v_state := 'committed';
    v_payment_status := 'pending';
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

  if pay.kind in ('cod','bank_transfer') then
    update public.inventory i set on_hand = i.on_hand - q.qty, updated_at = now()
      from (select (l ->> 'variant_id')::uuid as vid, (l ->> 'quantity')::integer as qty from jsonb_array_elements(quote -> 'lines') l) q
     where i.variant_id = q.vid;
    insert into public.inventory_movements (variant_id, kind, delta_on_hand, reason, order_id)
    select (l ->> 'variant_id')::uuid, 'sale', -(l ->> 'quantity')::integer, 'order placed (' || pay.label || ')', v_order.id
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

create function public.admin_confirm_bank_transfer(p_order_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := private.require_admin();
  o public.orders;
begin
  select * into strict o from public.orders where id=p_order_id for update;
  if o.payment_method_code <> 'allied_bank' or o.payment_status <> 'pending'
     or o.fulfilment_status = 'cancelled' or o.stock_state <> 'committed' then
    perform private.fail('invalid_transition');
  end if;
  update public.orders set payment_status='paid' where id=o.id;
  perform private.add_event(o.id,'payment_recorded','pending','paid',actor,'Bank transfer verified by the store.');
end;
$$;
revoke all on function public.admin_confirm_bank_transfer(uuid) from public, anon;
grant execute on function public.admin_confirm_bank_transfer(uuid) to authenticated;
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
    'payment_method_code', o.payment_method_code, 'payment_method', o.payment_method_label, 'payment_status', o.payment_status,
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
