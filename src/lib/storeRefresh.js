// Refresh only visible tabs; stores deduplicate requests and enforce their own stale time.
export function startStoreRefresh({ document: doc = globalThis.document, events = globalThis.window, refresh, interval = 60000 } = {}) {
  let stopped = false;
  const run = () => { if (!stopped && doc.visibilityState === 'visible') refresh(); };
  const timer = setInterval(run, interval);
  events.addEventListener('focus', run); events.addEventListener('online', run); doc.addEventListener('visibilitychange', run);
  return () => { stopped = true; clearInterval(timer); events.removeEventListener('focus', run); events.removeEventListener('online', run); doc.removeEventListener('visibilitychange', run); };
}
