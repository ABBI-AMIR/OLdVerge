-- Require MFA for existing and newly provisioned administrators.
update private.settings set value = 'true'::jsonb where key = 'require_mfa';
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
  if not exists (select 1 from public.payment_methods m where m.code = o.payment_method_code and m.kind = 'online' and m.provider = p_provider) then
    update private.webhook_events set status = 'rejected', note = 'payment provider mismatch' where provider = p_provider and event_id = p_event_id;
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


revoke all on function public.apply_payment_event(text,text,uuid,integer,text,text,text) from public, anon, authenticated;
grant execute on function public.apply_payment_event(text,text,uuid,integer,text,text,text) to service_role;

-- RLS remains active; both clearing the previous default and saving roll back on failure.
create or replace function public.save_customer_address(p_id uuid, p_values jsonb)
returns setof public.addresses language plpgsql security invoker set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'ov_error:unauthenticated' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 1));
  if p_id is not null and not exists(select 1 from public.addresses where id = p_id and user_id = v_uid) then
    raise exception 'ov_error:not_found';
  end if;
  if (p_values->>'is_default')::boolean then
    update public.addresses set is_default = false where user_id = v_uid and is_default;
  end if;
  if p_id is null then
    return query insert into public.addresses (label,recipient,phone,line1,line2,city,province,postal_code,is_default)
    values (p_values->>'label',p_values->>'recipient',p_values->>'phone',p_values->>'line1',p_values->>'line2',p_values->>'city',p_values->>'province',p_values->>'postal_code',coalesce((p_values->>'is_default')::boolean,false)) returning *;
  else
    return query update public.addresses set label=p_values->>'label',recipient=p_values->>'recipient',phone=p_values->>'phone',line1=p_values->>'line1',line2=p_values->>'line2',city=p_values->>'city',province=p_values->>'province',postal_code=p_values->>'postal_code',is_default=coalesce((p_values->>'is_default')::boolean,false)
    where id = p_id and user_id = v_uid returning *;
  end if;
end;
$$;
revoke all on function public.save_customer_address(uuid,jsonb) from public, anon;
grant execute on function public.save_customer_address(uuid,jsonb) to authenticated;

alter table public.newsletter_subscriptions add column confirmed_at timestamptz;
create table private.newsletter_confirmations (
 token_hash bytea primary key, subscription_id uuid not null references public.newsletter_subscriptions(id) on delete cascade,
 expires_at timestamptz not null default now() + interval '24 hours'
);
revoke all on private.newsletter_confirmations from public, anon, authenticated;
create or replace function public.request_newsletter_confirmation(p_email text, p_token_hash bytea)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 select id into v_id from public.newsletter_subscriptions where lower(email)=lower(p_email) and confirmed_at is null and unsubscribed_at is null for update;
 if v_id is null then return false; end if;
 delete from private.newsletter_confirmations where subscription_id=v_id;
 insert into private.newsletter_confirmations(token_hash,subscription_id) values(p_token_hash,v_id);
 return true;
end; $$;
create or replace function public.confirm_newsletter(p_token_hash bytea)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 delete from private.newsletter_confirmations where token_hash=p_token_hash and expires_at>now() returning subscription_id into v_id;
 if v_id is null then return false; end if;
 update public.newsletter_subscriptions set confirmed_at=now() where id=v_id and unsubscribed_at is null;
 return found;
end; $$;
revoke all on function public.request_newsletter_confirmation(text,bytea), public.confirm_newsletter(bytea) from public, anon, authenticated;
grant execute on function public.request_newsletter_confirmation(text,bytea), public.confirm_newsletter(bytea) to service_role;
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
    set confirmed_at = null, unsubscribed_at = null, consent_text = excluded.consent_text, consent_at = now(), unsubscribe_token_hash = excluded.unsubscribe_token_hash
    where public.newsletter_subscriptions.unsubscribed_at is not null or public.newsletter_subscriptions.confirmed_at is null;
end;
$$;


revoke all on function public.newsletter_subscribe(text,text,text,bytea) from public, anon, authenticated;
grant execute on function public.newsletter_subscribe(text,text,text,bytea) to service_role;

alter table private.newsletter_confirmations enable row level security;
