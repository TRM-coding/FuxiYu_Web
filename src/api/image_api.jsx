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

export const listImageBrefInformation = async ({ page_number = 1, page_size = 50, image_search = '', mine_only = false } = {}, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const url = new URL(API_ROUTES.IMAGES_LIST, BACKEND_ORIGIN);
    url.searchParams.set('page_number', String(page_number));
    url.searchParams.set('page_size', String(page_size));
    const keyword = String(image_search || '').trim();
    if (keyword) url.searchParams.set('image_search', keyword);
    if (mine_only) url.searchParams.set('mine_only', 'true');
    const res = await fetch(url.toString(), {
      method: 'GET',
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'List images');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch (e) {}
    if (err.name === 'AbortError') throw new Error('List images request timed out');
    throw err;
  }
};

export const getImageDetailInformation = async (image_id, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const url = new URL(API_ROUTES.IMAGES_GET_DETAIL, BACKEND_ORIGIN);
    url.searchParams.set('image_id', String(image_id));
    const res = await fetch(url.toString(), {
      method: 'GET',
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Get image detail');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch (e) {}
    if (err.name === 'AbortError') throw new Error('Get image detail request timed out');
    throw err;
  }
};

export const createImage = async (payload = {}, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const url = new URL(API_ROUTES.IMAGES_CREATE, BACKEND_ORIGIN).toString();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Create image');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch (e) {}
    if (err.name === 'AbortError') throw new Error('Create image request timed out');
    throw err;
  }
};

export const updateImage = async (payload = {}, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const url = new URL(API_ROUTES.IMAGES_UPDATE, BACKEND_ORIGIN).toString();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Update image');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch (e) {}
    if (err.name === 'AbortError') throw new Error('Update image request timed out');
    throw err;
  }
};

export const setImageValidRange = async ({ image_id, valid_range } = {}, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const url = new URL(API_ROUTES.IMAGES_SET_VALID_RANGE, BACKEND_ORIGIN).toString();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_id, valid_range }),
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Set image valid range');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch (e) {}
    if (err.name === 'AbortError') throw new Error('Set image valid range request timed out');
    throw err;
  }
};

// 整组替换（set 语义）：传 [] 即清空名单。仅 valid_range=custom 时可调，其余态后端 400。
export const setImageVisibleUsers = async ({ image_id, user_ids = [] } = {}, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const url = new URL(API_ROUTES.IMAGES_SET_VISIBLE_USERS, BACKEND_ORIGIN).toString();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_id, user_ids }),
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Set image visible users');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch (e) {}
    if (err.name === 'AbortError') throw new Error('Set image visible users request timed out');
    throw err;
  }
};

export const deleteImage = async (image_id, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const url = new URL(API_ROUTES.IMAGES_DELETE, BACKEND_ORIGIN).toString();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_id }),
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Delete image');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch (e) {}
    if (err.name === 'AbortError') throw new Error('Delete image request timed out');
    throw err;
  }
};
