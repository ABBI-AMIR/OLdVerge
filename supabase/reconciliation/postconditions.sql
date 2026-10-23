-- Aggregate metadata / migration postconditions only. No customer fields or commerce writes.
select
  (select value='false'::jsonb from public.store_settings where key='ordering_enabled') as ordering_closed,
  (select value='true'::jsonb from private.settings where key='require_mfa') as admin_mfa_required,
  not exists(select 1 from auth.users u where not exists(select 1 from public.profiles p where p.user_id=u.id)) as profiles_backfilled,
  (select count(*)=3 from private.settings where key in ('require_mfa','reservation_minutes','order_access_days')) as private_settings_present,
  (select count(*)=10 from public.store_settings where key in ('ordering_enabled','max_quantity_per_line','max_lines','tax_mode','contact.email','contact.phone','contact.whatsapp','contact.instagram','contact.address','notice.footer')) as public_settings_present,
  exists(select 1 from public.payment_methods where code='cod' and kind='cod' and not enabled) as cod_disabled,
  (select count(*)=4 from public.policy_pages p join public.policy_drafts d using(slug) where slug in ('shipping','refund-policy','privacy-policy','terms-and-conditions')) as policy_rows_present,
  (select count(*)=3 from storage.buckets where id in ('product-public','product-private','order-private')) as buckets_present;
