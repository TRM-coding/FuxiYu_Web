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
      if (typeof window !== 'undefined' && res.status === 401) {
        try {
          localStorage.removeItem('currentUserId');
          localStorage.removeItem('currentUserName');
          document.cookie = 'auth_token=; Max-Age=0; path=/';
        } catch (e) {}
        try { window.location.href = '/'; } catch (e) {}
      }
    }
    throw err;
  }
  return res.json();
};

export const getRbacMatrix = async (timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const res = await fetch(new URL(API_ROUTES.RBAC_MATRIX, BACKEND_ORIGIN).toString(), {
      method: 'GET',
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Get RBAC matrix');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch (e) {}
    if (err.name === 'AbortError') throw new Error('Get RBAC matrix request timed out');
    throw err;
  }
};

export const updateRbacGroupEntities = async ({ group_id, entity_codes = [] } = {}, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const res = await fetch(new URL(API_ROUTES.RBAC_UPDATE_GROUP_ENTITIES(group_id), BACKEND_ORIGIN).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entity_codes }),
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Update RBAC group entities');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch (e) {}
    if (err.name === 'AbortError') throw new Error('Update RBAC group entities request timed out');
    throw err;
  }
};

export const createRbacGroup = async ({ name, description = '', entity_codes = [] } = {}, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const res = await fetch(new URL(API_ROUTES.RBAC_GROUPS, BACKEND_ORIGIN).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, entity_codes }),
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Create RBAC group');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch (e) {}
    if (err.name === 'AbortError') throw new Error('Create RBAC group request timed out');
    throw err;
  }
};

export default {
  createRbacGroup,
  getRbacMatrix,
  updateRbacGroupEntities,
};
