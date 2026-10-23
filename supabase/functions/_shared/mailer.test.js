import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStagingMailer, mailFailureCode, STAGING_EMAIL } from './mailer.js';

const id='12345678-1234-4234-8234-123456789abc';
const customer='customer@example.test',owner='owner@example.test';
const variables={SUPABASE_URL:STAGING_EMAIL.projectUrl,COMMERCE_EMAIL_PROVIDER:'mailtrap_sandbox',COMMERCE_EMAIL_SITE_URL:STAGING_EMAIL.siteUrl,
  MAILTRAP_SANDBOX_ID:STAGING_EMAIL.sandboxId,MAILTRAP_SANDBOX_API_TOKEN:'unit-test-sandbox-api-credential',
  COMMERCE_EMAIL_ADMIN_TO:owner,COMMERCE_EMAIL_ALLOWED_RECIPIENTS:`${customer},${owner}`};
const newsletter={email:customer,confirmation_token:'c'.repeat(43),unsubscribe_token:'u'.repeat(43)};
const order={order_number:'OV-261023-1234ABCD',customer_email:customer,customer_name:'<img src=x onerror="bad">',total_pkr:8750,currency:'PKR',payment_status:'unpaid',fulfilment_status:'received',is_test:true};
const accepted=()=>Response.json({success:true,message_ids:['captured-message']});
function setup({env={},rows={},response=accepted,lookupError=false}={}){
  const reads=[];
  const admin={from:vi.fn(table=>({select:columns=>({eq:(column,value)=>({abortSignal:signal=>({maybeSingle:async()=>{
    reads.push({table,columns,column,value,signal});return {data:rows[table]??null,error:lookupError?{message:'PRIVATE database error'}:null};
  }})})})}))};
  const fetch=vi.fn(async()=>response());
  const getEnv={get:name=>({...variables,...env})[name]??null};
  return {admin,fetch,reads,env:getEnv,mailer:createStagingMailer({env:getEnv,admin,fetch})};
}
afterEach(()=>vi.useRealTimers());

describe('Mailtrap staging adapter',()=>{
  it('sends newsletter text and escaped HTML with exact staging fragment links to the sandbox only',async()=>{
    const {mailer,fetch,admin}=setup();await mailer.send('newsletter_confirmation',newsletter);
    expect(admin.from).not.toHaveBeenCalled();
    const [url,request]=fetch.mock.calls[0];const body=JSON.parse(request.body);
    expect(url).toBe('https://sandbox.api.mailtrap.io/api/send/4975389');
    expect(request).toMatchObject({method:'POST',redirect:'error',headers:{'Api-Token':variables.MAILTRAP_SANDBOX_API_TOKEN}});
    expect(body.to).toEqual([{email:customer}]);expect(body.from.email).toBe('oldverge-staging@example.test');
    expect(body.subject).toMatch(/^\[STAGING\]/);expect(body.text).toContain(`/newsletter/confirm#token=${newsletter.confirmation_token}`);
    expect(body.text).toContain(`/newsletter/unsubscribe#token=${newsletter.unsubscribe_token}`);
    expect(body.html).toContain('<a href="https://o-ld-verge.vercel.app/newsletter/confirm#token=');
    expect(body.text).not.toContain('?token=');expect(body).not.toHaveProperty('cc');expect(body).not.toHaveProperty('bcc');
  });
  it.each(['order_confirmation','admin_new_order'])('resolves minimal test-order data for %s without writes',async kind=>{
    const {mailer,fetch,reads}=setup({rows:{orders:order}});await mailer.send(kind,{order_id:id});
    const body=JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.to[0].email).toBe(kind==='order_confirmation'?customer:owner);
    expect(body.text).toContain('PKR 8,750');expect(body.text).toContain('Payment status: unpaid');
    expect(body.html).toContain('&lt;img');expect(body.html).not.toContain('<img');
    expect(reads[0]).toMatchObject({table:'orders',column:'id',value:id});
    expect(reads[0].columns).not.toMatch(/phone|address|token|\*/);expect(reads[0].signal).toBeInstanceOf(AbortSignal);
  });
  it('renders a contact alert to the configured allowed admin and escapes contact content',async()=>{
    const {mailer,fetch}=setup({rows:{contact_messages:{first_name:'Test',last_name:'Customer',email:customer,kind:'contact',message:'<script>alert(1)</script> & "hello"'}}});
    await mailer.send('admin_new_contact_message',{message_id:id});
    const body=JSON.parse(fetch.mock.calls[0][1].body);expect(body.to).toEqual([{email:owner}]);
    expect(body.html).toContain('&lt;script&gt;');expect(body.html).not.toContain('<script>');
  });
  it('fails closed for incomplete config, another project/site/sandbox and live provider selection',()=>{
    for(const key of Object.keys(variables))expect(setup({env:{[key]:null}}).mailer,key).toBeNull();
    for(const env of [{SUPABASE_URL:'https://other.supabase.co'},{COMMERCE_EMAIL_SITE_URL:'https://production.example'},
      {MAILTRAP_SANDBOX_ID:'123'},{COMMERCE_EMAIL_PROVIDER:'mailtrap_live'},{COMMERCE_EMAIL_ALLOWED_RECIPIENTS:'*'},
      {COMMERCE_EMAIL_ADMIN_TO:'outside@example.test'},{MAILTRAP_SANDBOX_API_TOKEN:'invalid\r\nheader'}])expect(setup({env}).mailer).toBeNull();
  });
  it('blocks arbitrary recipients, header injection, invalid capabilities, unknown kinds and arbitrary IDs before delivery',async()=>{
    const {mailer,fetch,admin}=setup();
    for(const payload of [{...newsletter,email:'unrelated@example.test'},{...newsletter,email:'a@example.test\r\nBcc:x@example.test'},
      {...newsletter,confirmation_token:'https://untrusted.invalid'},{...newsletter,unsubscribe_token:null}])await expect(mailer.send('newsletter_confirmation',payload)).rejects.toThrow(/email_/);
    await expect(mailer.send('unknown',{})).rejects.toThrow('email_invalid_payload');
    await expect(mailer.send('order_confirmation',{order_id:'unsafe'})).rejects.toThrow('email_invalid_payload');
    expect(fetch).not.toHaveBeenCalled();expect(admin.from).not.toHaveBeenCalled();
  });
  it('blocks non-test orders and non-allowlisted order customers even on admin alerts',async()=>{
    for(const row of [{...order,is_test:false},{...order,customer_email:'outside@example.test'}]){
      const {mailer,fetch}=setup({rows:{orders:row}});await expect(mailer.send('admin_new_order',{order_id:id})).rejects.toThrow(/email_/);expect(fetch).not.toHaveBeenCalled();
    }
  });
  it('does not send if data is missing or the lookup fails',async()=>{
    for(const options of [{},{rows:{orders:order},lookupError:true}]){
      const {mailer,fetch}=setup(options);await expect(mailer.send('order_confirmation',{order_id:id})).rejects.toThrow('email_lookup_failed');expect(fetch).not.toHaveBeenCalled();
    }
  });
  it.each([401,429,500,302])('sanitizes provider HTTP %s without exposing or retrying its response',async status=>{
    const {mailer,fetch}=setup({response:()=>new Response('PRIVATE recipient, token and provider detail',{status})});
    await expect(mailer.send('newsletter_confirmation',newsletter)).rejects.toThrow(`email_provider_http_${status}`);expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('rejects forged diagnostic codes and preserves HTTP status when error-body cancellation fails',async()=>{
    for(const code of ['email_provider_http_429 PRIVATE','email_provider_http_200','email_provider_http_999',null]) {
      expect(mailFailureCode({code})).toBe('email_send_failed');
    }
    const {mailer,fetch}=setup({response:()=>({ok:false,status:429,body:{cancel:async()=>{throw new Error('PRIVATE body');}}})});
    await expect(mailer.send('newsletter_confirmation',newsletter)).rejects.toThrow('email_provider_http_429');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([{success:false,message_ids:['x']},{success:true},{success:true,message_ids:[]},{success:true,message_ids:['x','y']},{}])('requires explicit single-recipient provider acknowledgement: %j',async result=>{
    const {mailer}=setup({response:()=>Response.json(result)});await expect(mailer.send('newsletter_confirmation',newsletter)).rejects.toThrow('email_provider_invalid_response');
  });
  it('bounds provider response parsing and rejects malformed JSON',async()=>{
    for(const body of ['not JSON','x'.repeat(16385)]){
      const {mailer}=setup({response:()=>new Response(body)});await expect(mailer.send('newsletter_confirmation',newsletter)).rejects.toThrow('email_provider_invalid_response');
    }
  });
  it('times out the entire send and clears the timer; transport errors expose only fixed codes',async()=>{
    vi.useFakeTimers();const context=setup();
    context.fetch.mockImplementation((_url,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('PRIVATE timeout details')),{once:true})));
    const result=context.mailer.send('newsletter_confirmation',newsletter).catch(error=>error);
    await vi.advanceTimersByTimeAsync(10000);expect((await result).code).toBe('email_timeout');expect(vi.getTimerCount()).toBe(0);
    context.fetch.mockRejectedValue(new Error('PRIVATE token and body'));
    await expect(context.mailer.send('newsletter_confirmation',newsletter)).rejects.toThrow('email_send_failed');expect(vi.getTimerCount()).toBe(0);
    expect(mailFailureCode(new Error('PRIVATE exception'))).toBe('email_send_failed');
  });
  it('keeps the deadline active while the provider response body is streaming',async()=>{
    vi.useFakeTimers();const context=setup();
    context.fetch.mockImplementation(async(_url,{signal})=>new Response(new ReadableStream({start(controller){
      signal.addEventListener('abort',()=>controller.error(new Error('PRIVATE stream details')),{once:true});
    }})));
    const result=context.mailer.send('newsletter_confirmation',newsletter).catch(error=>error);
    await vi.advanceTimersByTimeAsync(10000);expect((await result).code).toBe('email_timeout');expect(vi.getTimerCount()).toBe(0);
  });
  it('applies the same deadline to order lookup before any provider request',async()=>{
    vi.useFakeTimers();const context=setup();
    context.admin.from.mockImplementation(()=>({select:()=>({eq:()=>({abortSignal:signal=>({maybeSingle:()=>new Promise((_resolve,reject)=>{
      signal.addEventListener('abort',()=>reject(new Error('PRIVATE lookup details')),{once:true});
    })})})})}));
    const result=context.mailer.send('order_confirmation',{order_id:id}).catch(error=>error);
    await vi.advanceTimersByTimeAsync(10000);expect((await result).code).toBe('email_timeout');expect(context.fetch).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
  });
});
