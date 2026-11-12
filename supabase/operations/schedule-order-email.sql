-- Run in the target project after deploying process-outbox and configuring the live sender.
-- Enable pg_cron and pg_net. In Vault, set order_email_worker_url to the project's
-- HTTPS /functions/v1/process-outbox URL and order_email_cron_secret to its CRON_SECRET.
do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'order_email_worker_url'
    and decrypted_secret ~ '^https://[a-z0-9]+\.supabase\.co/functions/v1/process-outbox$')
    or not exists (select 1 from vault.decrypted_secrets where name = 'order_email_cron_secret'
    and length(decrypted_secret) >= 16) then
    raise exception 'Configure the worker URL and cron secret in Vault first';
  end if;
end $$;

select cron.schedule('oldverge-order-email', '* * * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'order_email_worker_url'),
    headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',
      (select decrypted_secret from vault.decrypted_secrets where name = 'order_email_cron_secret')),
    body := '{}'::jsonb, timeout_milliseconds := 120000
  ) where exists (select 1 from public.notification_outbox
    where status in ('pending','failed') and attempts < 8 and next_attempt_at <= now());
$job$);
