import { describe, expect, it, vi } from 'vitest';
import { publicDefines } from './publicEnv.js';
import { readBoundedBody, readJson } from '../../supabase/functions/_shared/http.js';
import { inspectImage } from '../../supabase/functions/_shared/images.js';
import { createGateway } from '../admin/api.js';
import { createOrder, submitContact } from '../../supabase/functions/_shared/handlers.js';

const publicEnv = { VITE_SUPABASE_URL: 'https://project.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test01234567890123' };
describe('security regression checks', () => {
  it('requires preview builds to use an explicitly isolated staging backend', () => {
    const env = { ...publicEnv, VERCEL_ENV:'preview', OLDVERGE_DEPLOYMENT_TIER:'staging', STAGING_SUPABASE_URL:publicEnv.VITE_SUPABASE_URL, PRODUCTION_SUPABASE_URL:'https://production.supabase.co' };
    expect(()=>publicDefines(env,{production:true})).not.toThrow();
    for (const override of [{OLDVERGE_DEPLOYMENT_TIER:''},{STAGING_SUPABASE_URL:'https://wrong.supabase.co'},{PRODUCTION_SUPABASE_URL:publicEnv.VITE_SUPABASE_URL},{PRODUCTION_SUPABASE_URL:''},{VITE_CONTACT_FORM_ENDPOINT:'https://external.test'}]) {
      expect(()=>publicDefines({...env,...override},{production:true})).toThrow('staging');
    }
    const defines=publicDefines(env,{production:true});
    expect(JSON.stringify(defines)).not.toContain('production.supabase.co');
    expect(JSON.stringify(defines)).not.toContain('OLDVERGE_DEPLOYMENT_TIER');
  });
  it('permits confirmed development-only projects while rejecting ambiguous or contradictory production declarations', () => {
    const env={...publicEnv, OLDVERGE_DEPLOYMENT_TIER:'staging', STAGING_SUPABASE_URL:publicEnv.VITE_SUPABASE_URL, OLDVERGE_PRODUCTION_BACKEND:'none'};
    expect(()=>publicDefines(env,{production:true})).not.toThrow();
    for(const override of [{OLDVERGE_PRODUCTION_BACKEND:''},{PRODUCTION_SUPABASE_URL:'https://production.supabase.co'},{PRODUCTION_SUPABASE_URL:publicEnv.VITE_SUPABASE_URL},{OLDVERGE_PRODUCTION_BACKEND:'existing',PRODUCTION_SUPABASE_URL:'not-a-url'},{STAGING_SUPABASE_URL:''}]) {
      expect(()=>publicDefines({...env,...override},{production:true})).toThrow('staging');
    }
    expect(JSON.stringify(publicDefines(env,{production:true}))).not.toContain('OLDVERGE_PRODUCTION_BACKEND');
  });
  it('exposes only approved public variables and rejects privileged credentials at build time', () => {
    const defines = publicDefines({ ...publicEnv, VITE_ACCIDENTAL_SECRET: 'private', NEXT_PUBLIC_OTHER_SECRET: 'private', SUPABASE_SERVICE_ROLE_KEY: 'private' }, { production: true });
    expect(Object.keys(defines)).toHaveLength(4);
    expect(JSON.stringify(defines)).not.toContain('private');
    expect(() => publicDefines({ ...publicEnv, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_01234567890123456789' }, { production: true })).toThrow('configuration');
    expect(() => publicDefines({}, { production: true })).toThrow('configuration');
    expect(() => publicDefines({ VITE_STORE_MODE: 'demo' }, { production: true })).not.toThrow();
    expect(() => publicDefines({ VITE_SUPABASE_URL: publicEnv.VITE_SUPABASE_URL }, { production: true })).toThrow();
  });
  it('cancels an oversized chunked stream without reading the remainder', async () => {
    const cancel = vi.fn(); let reads = 0;
    const request = { headers: new Headers({ 'content-type': 'application/json' }), body: new ReadableStream({ pull(c) { reads++; c.enqueue(new Uint8Array(100)); }, cancel }) };
    expect(await readJson(request, 150)).toMatchObject({ status: 413 });
    expect(cancel).toHaveBeenCalled(); expect(reads).toBeLessThan(5);
  });
  it('counts bytes and rejects malformed UTF-8 and incomplete JSON', async () => {
    const request = (body) => new Request('https://test.local', { method: 'POST', headers: { 'content-type': 'application/json' }, body });
    expect(await readJson(request('{"name":"éé"}'), 13)).toMatchObject({ status: 413 });
    expect(await readJson(request(Uint8Array.from([255])))).toMatchObject({ status: 400 });
    expect(await readJson(request('{'))).toMatchObject({ status: 400 });
    expect(await readBoundedBody(request('{}'), 2)).toEqual(new TextEncoder().encode('{}'));
  });
  it('detects JPEG XMP after the dimension header and refuses malformed segment lengths', () => {
    const frame = [255,216,255,192,0,11,8,0,100,0,100,1,1,17,0];
    const xmp = [255,225,0,10,88,77,80,0,0,0,0,0,255,217];
    expect(inspectImage(Uint8Array.from([...frame,...xmp]))).toMatchObject({ hasMetadata: true, width: 100 });
    expect(inspectImage(Uint8Array.from([...frame,255,225,255,255,...new Array(20).fill(0)]))).toBeNull();
  });
  it('retries rolled-back admin transactions once but never retries unrelated failures', async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ error: { code: '40P01' } }).mockResolvedValueOnce({ data: 'ok' });
    const gateway = createGateway({ client: { rpc } });
    expect(await gateway.rpc('admin_cancel_order', { id: 'order' })).toBe('ok');
    expect(rpc).toHaveBeenCalledTimes(2);
    rpc.mockReset().mockResolvedValue({ error: { code: '42501', message: 'permission denied' } });
    await expect(gateway.rpc('anything', {})).rejects.toThrow(); expect(rpc).toHaveBeenCalledTimes(1);
  });
  it('verifies bot tokens against the allowed hostname and rejects provider failures', async () => {
    const settings = { TURNSTILE_SECRET_KEY: 'test', ALLOWED_ORIGINS: 'https://shop.test' };
    const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ success: true, hostname: 'wrong.test' }) }));
    const rpc = vi.fn(async () => ({ data: true }));
    const deps = { env: { get: (key) => settings[key] }, fetch, admin: { rpc } };
    const request = () => new Request('https://shop.test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ first_name: 'Ada', email: 'ada@example.test', message: 'Hello', turnstile_token: 'challenge' }) });
    expect((await submitContact(deps)(request())).status).toBe(400);
    expect(rpc.mock.calls.some(([name]) => name === 'submit_contact')).toBe(false);
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, hostname: 'shop.test' }) });
    expect((await submitContact(deps)(request())).status).toBe(201);
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: false }) });
    expect((await submitContact(deps)(request())).status).toBe(400);
  });
  it('refuses production order/contact submissions without bot protection', async () => {
    const deps = { env: { get: (key) => key === 'TOKEN_SECRET' ? 'test'.repeat(10) : null }, admin: { rpc: async () => ({ data: true }) } };
    const request = () => new Request('https://test.local', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    expect((await createOrder(deps)(request())).status).toBe(503);
    expect((await submitContact(deps)(request())).status).toBe(503);
  });
});
