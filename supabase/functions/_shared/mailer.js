// Staging only. There is deliberately no live-delivery URL or configurable provider host.
import { readBoundedBody } from './http.js';

export const STAGING_EMAIL = Object.freeze({
  projectUrl: 'https://qeczhyiwgvglilwqbveh.supabase.co',
  siteUrl: 'https://o-ld-verge.vercel.app',
  sandboxId: '4975389',
});
const EMAIL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,63}$/;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODES = new Set(['email_invalid_payload','email_recipient_blocked','email_lookup_failed','email_non_test_order','email_provider_rejected','email_provider_invalid_response','email_timeout','email_send_failed']);

export class MailDeliveryError extends Error {
  constructor(code) { super(safeCode(code) ? code : 'email_send_failed'); this.code = this.message; }
}
const safeCode = (code) => typeof code === 'string' && (CODES.has(code) || /^email_provider_http_[345]\d{2}$/.test(code));
export const mailFailureCode = (error) => safeCode(error?.code) ? error.code : 'email_send_failed';
const fail = (code) => { throw new MailDeliveryError(code); };
const email = (value) => typeof value === 'string' && value.length <= 254 && EMAIL.test(value) ? value.toLowerCase() : fail('email_invalid_payload');
const text = (value, max = 4000) => typeof value === 'string' && value.length <= max ? value : fail('email_invalid_payload');
const escapeHtml = (value) => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = (value) => Number.isSafeInteger(value) && value >= 0 && value <= 1000000000 ? `PKR ${value.toLocaleString('en-US')}` : fail('email_invalid_payload');

function config(env) {
  if (env.get('COMMERCE_EMAIL_PROVIDER') !== 'mailtrap_sandbox' || env.get('SUPABASE_URL') !== STAGING_EMAIL.projectUrl
    || env.get('COMMERCE_EMAIL_SITE_URL') !== STAGING_EMAIL.siteUrl || env.get('MAILTRAP_SANDBOX_ID') !== STAGING_EMAIL.sandboxId) return null;
  const apiToken = env.get('MAILTRAP_SANDBOX_API_TOKEN');
  if (typeof apiToken !== 'string' || !/^[\x21-\x7e]{16,512}$/.test(apiToken)) return null;
  try {
    const recipients = String(env.get('COMMERCE_EMAIL_ALLOWED_RECIPIENTS') || '').split(',').map(s => s.trim());
    if (!recipients.length || recipients.length > 10) return null;
    const allowed = new Set(recipients.map(email));
    const adminTo = email(env.get('COMMERCE_EMAIL_ADMIN_TO'));
    if (!allowed.has(adminTo)) return null;
    return { apiToken, allowed, adminTo };
  } catch { return null; }
}

/** No provider call, row claim or data mutation when configuration is incomplete/incorrect. */
export function createStagingMailer({env, admin, fetch: request = fetch}) {
  const settings = config(env);
  if (!settings) return null;
  const recipient = (value) => {
    const address = email(value);
    if (!settings.allowed.has(address)) fail('email_recipient_blocked');
    return address;
  };
  const read = async (table, columns, id, signal) => {
    if (typeof id !== 'string' || !UUID.test(id)) fail('email_invalid_payload');
    const {data,error} = await admin.from(table).select(columns).eq('id',id).abortSignal(signal).maybeSingle();
    if (error || !data) fail('email_lookup_failed');
    return data;
  };
  const newsletterLink = (action, token) => {
    if (typeof token !== 'string' || !TOKEN.test(token)) fail('email_invalid_payload');
    return `${STAGING_EMAIL.siteUrl}/newsletter/${action}#${new URLSearchParams({token})}`;
  };
  async function render(kind, payload, signal) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) fail('email_invalid_payload');
    if (kind === 'newsletter_confirmation') {
      const to = recipient(payload.email);
      return {to,subject:'Confirm your newsletter subscription',lines:[
        'Confirm that you want to receive OLDVERGE news:',newsletterLink('confirm',payload.confirmation_token),
        'If you did not request this, ignore this message.',
        'Unsubscribe:',newsletterLink('unsubscribe',payload.unsubscribe_token),
      ]};
    }
    if (kind === 'order_confirmation' || kind === 'admin_new_order') {
      const order = await read('orders','order_number,customer_email,customer_name,total_pkr,currency,payment_status,fulfilment_status,is_test',payload.order_id,signal);
      if (order.is_test !== true) fail('email_non_test_order');
      // Validate the customer's allowlist even for admin notices; never capture unrelated customer data.
      const customer = recipient(order.customer_email);
      if (order.currency !== 'PKR' || !/^OV-\d{6}-[0-9A-F]{8}$/.test(order.order_number)) fail('email_invalid_payload');
      const title = kind === 'order_confirmation' ? 'Order received' : 'New test order';
      return {to:kind === 'order_confirmation' ? customer : recipient(settings.adminTo),subject:`${title}: ${order.order_number}`,lines:[
        `${title}: ${order.order_number}`,`Customer: ${text(order.customer_name,160)}`,
        `Total: ${money(order.total_pkr)}`,`Payment status: ${text(order.payment_status,40)}`,
        `Fulfilment status: ${text(order.fulfilment_status,40)}`,
        ...(kind === 'admin_new_order' ? [`Review in staging admin: ${STAGING_EMAIL.siteUrl}/admin/orders/${payload.order_id}`]
          : ['Keep the access code from your checkout confirmation for guest order lookup.',`Account: ${STAGING_EMAIL.siteUrl}/account`]),
      ]};
    }
    if (kind === 'admin_new_contact_message') {
      const message = await read('contact_messages','first_name,last_name,email,kind,message',payload.message_id,signal);
      const sender = recipient(message.email);
      return {to:recipient(settings.adminTo),subject:'New staging contact message',lines:[
        `From: ${text(message.first_name,80)} ${text(message.last_name,80)}`,`Email: ${sender}`,
        `Type: ${text(message.kind,40)}`,text(message.message),`Staging admin: ${STAGING_EMAIL.siteUrl}/admin`,
      ]};
    }
    fail('email_invalid_payload');
  }
  return {
    async send(kind, payload) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(),10000);
      try {
        const message = await render(kind,payload,controller.signal);
        const lines = ['STAGING TEST — captured in Mailtrap. No real purchase is implied.','',...message.lines];
        const response = await request(`https://sandbox.api.mailtrap.io/api/send/${STAGING_EMAIL.sandboxId}`,{
          method:'POST',redirect:'error',signal:controller.signal,
          headers:{'Content-Type':'application/json','Api-Token':settings.apiToken},
          body:JSON.stringify({from:{email:'oldverge-staging@example.test',name:'OLDVERGE Staging — Test Only'},to:[{email:message.to}],
            subject:`[STAGING] ${message.subject}`,text:lines.join('\n'),
            html:`<!doctype html><html><body>${lines.map(line=>line.startsWith(`${STAGING_EMAIL.siteUrl}/`)
              ? `<p><a href="${escapeHtml(line)}">${escapeHtml(line)}</a></p>` : `<p>${escapeHtml(line)}</p>`).join('')}</body></html>`}),
        });
        if (!response.ok) {
          // Preserve only the numeric HTTP status, never provider text or credentials.
          // A broken error-body stream must not obscure the known rejection.
          try { await response.body?.cancel(); } catch { /* status is authoritative */ }
          fail(`email_provider_http_${response.status}`);
        }
        let result;
        try { result = JSON.parse(new TextDecoder().decode(await readBoundedBody(response,16384))); }
        catch { fail('email_provider_invalid_response'); }
        if (result?.success !== true || !Array.isArray(result.message_ids) || result.message_ids.length !== 1
          || typeof result.message_ids[0] !== 'string' || !result.message_ids[0]) fail('email_provider_invalid_response');
        // Never log message content, recipient, capability links, provider body or API token.
      } catch (error) {
        if (controller.signal.aborted) fail('email_timeout');
        throw new MailDeliveryError(mailFailureCode(error));
      } finally { clearTimeout(timer); }
    },
  };
}
