-- Queue once when an order first becomes cancelled. Existing cancelled orders
-- are intentionally left alone, including previous staging tests.
create or replace function private.queue_order_cancellation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notification_outbox(kind, dedupe_key, payload)
  values ('order_cancelled', 'order:' || new.id || ':cancelled', jsonb_build_object('order_id', new.id))
  on conflict (dedupe_key) do nothing;
  return new;
end;
$$;
revoke all on function private.queue_order_cancellation() from public, anon, authenticated;
create trigger orders_queue_cancellation
after update of fulfilment_status on public.orders
for each row when (new.fulfilment_status = 'cancelled' and old.fulfilment_status is distinct from 'cancelled')
execute function private.queue_order_cancellation();
