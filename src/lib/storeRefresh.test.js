import { afterEach, expect, it, vi } from 'vitest';
import { startStoreRefresh } from './storeRefresh.js';
afterEach(() => vi.useRealTimers());
it('refreshes visible tabs on interval/reconnect/focus and removes listeners on unmount', () => {
  vi.useFakeTimers();
  const doc = new EventTarget(); doc.visibilityState='hidden';
  const events = new EventTarget(); const refresh=vi.fn();
  const stop = startStoreRefresh({document:doc,events,refresh,interval:1000});
  vi.advanceTimersByTime(1000); expect(refresh).not.toHaveBeenCalled();
  doc.visibilityState='visible'; doc.dispatchEvent(new Event('visibilitychange'));
  events.dispatchEvent(new Event('online')); events.dispatchEvent(new Event('focus'));
  vi.advanceTimersByTime(1000); expect(refresh).toHaveBeenCalledTimes(4);
  stop(); events.dispatchEvent(new Event('focus')); vi.advanceTimersByTime(5000);
  expect(refresh).toHaveBeenCalledTimes(4);
});
