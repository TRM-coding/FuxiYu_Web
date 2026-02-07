// Utility to manage in-flight request AbortControllers so the app can cancel
// all ongoing requests (for example when authentication expires).
// - createController(): returns an AbortController registered in the global set
// - unregisterController(ac): remove controller when request finishes
// - abortAll(reason): aborts all controllers and emits events; if reason === 'auth' also emits 'auth:expired'
// - isAbortError(err): helper to detect aborts so callers can ignore them

const controllers = new Set();

export function createController() {
  const ac = new AbortController();
  // register
  controllers.add(ac);
  // ensure we remove when already aborted
  const cleanup = () => controllers.delete(ac);
  try {
    ac.signal.addEventListener('abort', cleanup, { once: true });
  } catch (e) {
    // some environments may not support addEventListener on signal
  }
  // attach cleanup for explicit unregister
  ac._rm = cleanup;
  return ac;
}

export function unregisterController(ac) {
  if (!ac) return;
  try {
    if (typeof ac._rm === 'function') ac._rm();
  } catch (e) {
    // ignore
  }
  controllers.delete(ac);
}

export function abortAll(reason = 'aborted') {
  // Abort all registered controllers
  for (const ac of Array.from(controllers)) {
    try {
      ac.abort();
    } catch (e) {
      // ignore
    }
  }
  controllers.clear();

  // Emit a DOM-level event so other parts of the app can react if needed
  try {
    if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('requestManager:abortAll', { detail: { reason } }));
      if (reason === 'auth') {
        // signal to app-level listeners that auth expired
        window.dispatchEvent(new CustomEvent('auth:expired', { detail: { reason } }));
      }
    }
  } catch (e) {
    // ignore
  }
}

export function isAbortError(err) {
  if (!err) return false;
  return err.name === 'AbortError' || err.code === 'ERR_CANCELED' || String(err.message || '').toLowerCase().includes('aborted');
}

export default {
  createController,
  unregisterController,
  abortAll,
  isAbortError
};
