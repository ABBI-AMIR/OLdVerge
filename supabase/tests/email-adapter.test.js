import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
import {createTestDatabase,newUuid,sha256} from './support/db.js';
import {jsonRequest,makeDeps} from './support/function-deps.js';
import {newsletterConfirm,newsletterSubscribe,newsletterUnsubscribe,processOutbox} from '../functions/_shared/handlers.js';
import {createStagingMailer,STAGING_EMAIL} from '../functions/_shared/mailer.js';

const address='adapter@example.test';
const env={SUPABASE_URL:STAGING_EMAIL.projectUrl,COMMERCE_EMAIL_PROVIDER:'mailtrap_sandbox',COMMERCE_EMAIL_SITE_URL:STAGING_EMAIL.siteUrl,
  MAILTRAP_SANDBOX_ID:STAGING_EMAIL.sandboxId,MAILTRAP_SANDBOX_API_TOKEN:'local-test-sandbox-credential',
  COMMERCE_EMAIL_ALLOWED_RECIPIENTS:address,COMMERCE_EMAIL_ADMIN_TO:address};
const call=async(handler,body,headers={})=>{
  const response=await handler(jsonRequest('https://local.functions.test/',body,{headers}));
  return {status:response.status,body:await response.json()};
};
const subscription={email:address,consent:true,consent_text:'I agree to receive OLDVERGE news'};

describe('email pipeline with real isolated PostgreSQL and mocked Mailtrap',()=>{
  let db;
  beforeAll(async()=>{db=await createTestDatabase();});
  afterAll(async()=>{await db.close();});
  const configured=()=>{
    const deps=makeDeps(db,{env});
    deps.fetch=vi.fn(async()=>Response.json({success:true,message_ids:['captured-in-local-test']}));
    deps.mailer=createStagingMailer(deps);
    return deps;
  };
  it('fails closed with no adapter before saving a pending subscriber',async()=>{
    const deps=makeDeps(db);
    const result=await call(newsletterSubscribe(deps),subscription);
    expect(result).toMatchObject({status:503,body:{error:'email_not_configured'}});
    expect((await db.main.query('select count(*)::int as n from public.newsletter_subscriptions')).rows[0].n).toBe(0);
  });
  it('delivers a confirmation, rotates pending links on retry, confirms once and supports unsubscribe',async()=>{
    const deps=configured();
    expect(await call(newsletterSubscribe(deps),subscription)).toMatchObject({status:201,body:{saved:true,pending_confirmation:true}});
    const first=JSON.parse(deps.fetch.mock.calls[0][1].body);
    const readTokens=body=>Object.fromEntries(['confirm','unsubscribe'].map(action=>[action,new URLSearchParams(new URL(body.text.match(new RegExp(`https://[^\\s]+/newsletter/${action}#[^\\s]+`))[0]).hash.slice(1)).get('token')]));
    const old=readTokens(first);
    expect((await db.main.query('select confirmed_at from public.newsletter_subscriptions where email=$1',[address])).rows[0].confirmed_at).toBeNull();
    expect((await call(newsletterSubscribe(deps),subscription)).status).toBe(201);
    const fresh=readTokens(JSON.parse(deps.fetch.mock.calls[1][1].body));
    expect((await call(newsletterConfirm(deps),{token:old.confirm})).body.confirmed).toBe(false);
    expect((await call(newsletterConfirm(deps),{token:fresh.confirm})).body.confirmed).toBe(true);
    expect((await call(newsletterConfirm(deps),{token:fresh.confirm})).body.confirmed).toBe(false);
    // A confirmed subscriber gets the generic response without another email or token replacement.
    expect((await call(newsletterSubscribe(deps),subscription)).status).toBe(201);expect(deps.fetch).toHaveBeenCalledTimes(2);
    expect((await call(newsletterUnsubscribe(deps),{token:old.unsubscribe})).body.unsubscribed).toBe(false);
    expect((await call(newsletterUnsubscribe(deps),{token:fresh.unsubscribe})).body.unsubscribed).toBe(true);
    expect((await db.main.query('select unsubscribe_token_hash from public.newsletter_subscriptions where email=$1',[address])).rows[0].unsubscribe_token_hash).toEqual(sha256(fresh.unsubscribe));
  });
  it('reports provider failure honestly and permits a fresh pending confirmation retry',async()=>{
    const deps=configured();deps.fetch.mockResolvedValueOnce(new Response('PRIVATE credential and recipient',{status:429}));
    expect(await call(newsletterSubscribe(deps),subscription)).toMatchObject({status:503,body:{error:'email_unavailable'}});
    expect((await db.main.query('select confirmed_at from public.newsletter_subscriptions where email=$1',[address])).rows[0].confirmed_at).toBeNull();
    expect((await call(newsletterSubscribe(deps),subscription)).status).toBe(201);
  });
  it('marks only acknowledged outbox deliveries sent and stores sanitized failures, without orders/inventory writes',async()=>{
    const deps=configured();
    const messageId=newUuid(),good=newUuid(),bad=newUuid();
    // Real local contact row / ID-only outbox payload; no orders or raw capabilities stored.
    await db.main.query("insert into public.contact_messages(id,first_name,email,message) values($1,'Test',$2,'Local adapter test')",[messageId,address]);
    deps.admin.from=table=>{
      expect(table).toBe('contact_messages');
      return {select:columns=>{
        expect(columns).toBe('first_name,last_name,email,kind,message');
        return {eq:(column,id)=>{
          expect(column).toBe('id');
          return {abortSignal:()=>({maybeSingle:async()=>({data:(await db.main.query('select first_name,last_name,email,kind,message from public.contact_messages where id=$1',[id])).rows[0],error:null})})};
        }};
      }};
    };
    await db.main.query("insert into public.notification_outbox(id,kind,dedupe_key,payload) values($1,'admin_new_contact_message','local-good',$3),($2,'unknown','local-bad','{}')",[good,bad,JSON.stringify({message_id:messageId})]);
    const result=await call(processOutbox(deps),{}, {'x-cron-secret':deps.env.get('CRON_SECRET')});
    expect(result.body).toEqual({provider:'configured',sent:1,failed:1});
    const rows=(await db.main.query('select id,status,last_error,sent_at from public.notification_outbox where id=any($1)',[[good,bad]])).rows;
    expect(rows.find(r=>r.id===good)).toMatchObject({status:'sent',last_error:null});expect(rows.find(r=>r.id===good).sent_at).not.toBeNull();
    expect(rows.find(r=>r.id===bad)).toMatchObject({status:'failed',last_error:'email_invalid_payload',sent_at:null});
    // Not due again: the second worker must not resend the acknowledged message.
    await call(processOutbox(deps),{}, {'x-cron-secret':deps.env.get('CRON_SECRET')});expect(deps.fetch).toHaveBeenCalledTimes(1);
    // Persist useful status-only diagnostics, without leaking provider bodies or
    // turning a worker retry into an immediate duplicate delivery.
    for (const status of [401,429,503]) {
      const rejectedId=newUuid();
      await db.main.query("insert into public.notification_outbox(id,kind,dedupe_key,payload) values($1,'admin_new_contact_message',$2,$3)",[rejectedId,`local-http-${status}`,JSON.stringify({message_id:messageId})]);
      deps.fetch.mockResolvedValueOnce(new Response('PRIVATE provider credentials',{status}));
      await call(processOutbox(deps),{}, {'x-cron-secret':deps.env.get('CRON_SECRET')});
      expect((await db.main.query('select status,last_error,sent_at from public.notification_outbox where id=$1',[rejectedId])).rows[0]).toMatchObject({status:'failed',last_error:`email_provider_http_${status}`,sent_at:null});
      const calls=deps.fetch.mock.calls.length;
      await call(processOutbox(deps),{}, {'x-cron-secret':deps.env.get('CRON_SECRET')});
      expect(deps.fetch).toHaveBeenCalledTimes(calls);
    }
    // A provider exception containing private material must never enter last_error.
    await db.main.query("insert into public.notification_outbox(id,kind,dedupe_key,payload) values($1,'admin_new_contact_message','local-private-error',$2)",[messageId,JSON.stringify({message_id:messageId})]);
    deps.mailer={send:async()=>{throw new Error('PRIVATE credentials and capability URL');}};
    await call(processOutbox(deps),{}, {'x-cron-secret':deps.env.get('CRON_SECRET')});
    expect((await db.main.query('select last_error from public.notification_outbox where id=$1',[messageId])).rows[0].last_error).toBe('email_send_failed');
    expect((await db.main.query('select count(*)::int as n from public.orders')).rows[0].n).toBe(0);
    expect((await db.main.query('select count(*)::int as n from public.inventory')).rows[0].n).toBe(0);
    expect((await db.main.query("select value from public.store_settings where key='ordering_enabled'")).rows[0].value).toBe(false);
  });
  it('requires real-mode Turnstile success for the exact staging hostname before newsletter writes or delivery',async()=>{
    const testEmail='turnstile@example.test';
    const deps=makeDeps(db,{env:{...env,ORDER_TEST_MODE:'false',TURNSTILE_SECRET_KEY:'local-test-secret',
      ALLOWED_ORIGINS:STAGING_EMAIL.siteUrl,COMMERCE_EMAIL_ALLOWED_RECIPIENTS:`${address},${testEmail}`}});
    let challenge={success:true,hostname:'wrong.example.test'};
    const verify=vi.fn(async()=>Response.json(challenge));
    const deliver=vi.fn(async()=>Response.json({success:true,message_ids:['local-capture']}));
    deps.fetch=(url,options)=>url==='https://challenges.cloudflare.com/turnstile/v0/siteverify'?verify(url,options):deliver(url,options);
    deps.mailer=createStagingMailer(deps);
    const body={...subscription,email:testEmail,turnstile_token:'local-mocked-challenge'};
    expect((await call(newsletterSubscribe(deps),{...body,turnstile_token:''})).status).toBe(400);
    expect(verify).not.toHaveBeenCalled();
    expect((await call(newsletterSubscribe(deps),body)).status).toBe(400);
    challenge={success:false,hostname:'o-ld-verge.vercel.app'};
    expect((await call(newsletterSubscribe(deps),body)).status).toBe(400);
    expect((await db.main.query('select count(*)::int as n from public.newsletter_subscriptions where email=$1',[testEmail])).rows[0].n).toBe(0);
    expect(deliver).not.toHaveBeenCalled();
    challenge={success:true,hostname:'o-ld-verge.vercel.app'};
    expect((await call(newsletterSubscribe(deps),body)).status).toBe(201);
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(verify.mock.calls.at(-1)[1].body.get('response')).toBe('local-mocked-challenge');
    expect((await db.main.query('select confirmed_at from public.newsletter_subscriptions where email=$1',[testEmail])).rows[0].confirmed_at).toBeNull();
  });
});
