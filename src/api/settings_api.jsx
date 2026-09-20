import { BACKEND_ORIGIN, API_ROUTES, REQUEST_TIMEOUT, CREDENTIALS } from '../configs/backend_config';
import { createController, unregisterController, abortAll } from '../utils/requestManager';

const createTimeoutController = (timeout) => {
  const controller = createController();
  const timer = setTimeout(() => {
    try { controller.abort(); } catch (e) {}
  }, timeout || REQUEST_TIMEOUT);
  return { controller, timer };
};

const ensureOk = async (res, action) => {
  if (!res.ok) {
    let body = null;
    try {
      body = await res.json();
    } catch (e) {
      body = await res.text().catch(() => null);
    }
    const text = body && typeof body === 'string' ? body : (body ? JSON.stringify(body) : null);
    const err = new Error(`${action} failed: ${res.status} ${text || res.statusText}`);
    err.status = res.status;
    err.route = res.url;
    err.body = body;
    if (res.status === 401 || res.status === 403) {
      try { abortAll('auth'); } catch (e) {}
      // 401 只发信号（abortAll → 'auth:expired'），统一由 App 级监听器处置：
      // 不碰 localStorage（本地身份已废除）/ cookie（HttpOnly，删不掉）/ 硬跳转（会打风暴）。
    }
    throw err;
  }
  return res.json();
};

export const listSystemSettings = async (timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const res = await fetch(new URL(API_ROUTES.SETTINGS_LIST, BACKEND_ORIGIN).toString(), {
      method: 'GET',
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'List settings');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch (e) {}
    if (err.name === 'AbortError') throw new Error('List settings request timed out');
    throw err;
  }
};

export const updateSystemSettings = async (values = {}, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const res = await fetch(new URL(API_ROUTES.SETTINGS_UPDATE, BACKEND_ORIGIN).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Update settings');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch (e) {}
    if (err.name === 'AbortError') throw new Error('Update settings request timed out');
    throw err;
  }
};
