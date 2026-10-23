import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock('./config.js', () => ({ backend: { configured: true, key: 'public-test-key', functionsUrl: 'https://project.test/functions/v1' } }));
vi.mock('./supabase.js', () => ({ supabase: { auth: { getSession } } }));
import { callFunction } from './api.js';

beforeEach(() => {
  vi.useFakeTimers();
  getSession.mockReset().mockResolvedValue({ data: { session: null } });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"saved":true}')));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

it('maps a rejected session lookup to a safe error and releases resources', async () => {
  getSession.mockRejectedValue(new Error('private auth failure'));
  const signal = new AbortController().signal;
  const remove = vi.spyOn(signal, 'removeEventListener');
  await expect(callFunction('submit-contact', {}, { signal })).resolves.toMatchObject({ ok: false, status: 0, data: { error: 'network_error' } });
  expect(fetch).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
  expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
});

it('bounds a hanging session lookup and never sends a late request', async () => {
  let resolve;
  getSession.mockReturnValue(new Promise((done) => { resolve = done; }));
  const pending = callFunction('create-order', {});
  await vi.advanceTimersByTimeAsync(20000);
  await expect(pending).resolves.toMatchObject({ ok: false, status: 0 });
  resolve({ data: { session: { access_token: 'late' } } });
  await Promise.resolve();
  expect(fetch).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});

it('refuses already aborted calls before reading identity or sending a request', async () => {
  const controller = new AbortController(); controller.abort();
  expect(await callFunction('create-order', {}, { signal: controller.signal })).toMatchObject({ ok: false, status: 0 });
  expect(getSession).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

it('cancels session lookup on caller abort and cleans its listener after success', async () => {
  getSession.mockReturnValueOnce(new Promise(() => {}));
  const controller = new AbortController();
  const pending = callFunction('create-order', {}, { signal: controller.signal });
  controller.abort();
  await expect(pending).resolves.toMatchObject({ ok: false, status: 0 });
  const signal = new AbortController().signal;
  const remove = vi.spyOn(signal, 'removeEventListener');
  expect(await callFunction('quote-order', {}, { token: null, signal })).toMatchObject({ ok: true, status: 200 });
  expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
  expect(vi.getTimerCount()).toBe(0);
});
