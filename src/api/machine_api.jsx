import { BACKEND_BASE_URL, REQUEST_TIMEOUT, CREDENTIALS, API_ROUTES } from '../configs/backend_config';
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
    // try to parse JSON body first
    let body = null;
    try {
      body = await res.json();
    } catch (e) {
      body = await res.text().catch(() => null);
    }
    const text = body && typeof body === 'string' ? body : (body ? JSON.stringify(body) : null);
    const err = new Error(`${action} failed: ${res.status} ${text || res.statusText}`);
    err.status = res.status;
    err.body = body;
    if (res.status === 401 || res.status === 403) {
      try { abortAll('auth'); } catch (e) {}
    }
    throw err;
  }
  return res.json();
};

const getTokenHeader = () => {
  try {
    const token = localStorage.getItem('authToken');
    return token ? { token } : {};
  } catch (e) {
    return {};
  }
};

export const addMachine = async (machineData = {}, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const res = await fetch(`${BACKEND_BASE_URL}${API_ROUTES.MACHINES_ADD}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getTokenHeader(),
      },
      body: JSON.stringify(machineData),
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Add machine');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch (e) {}
    if (err.name === 'AbortError') throw new Error('Add machine request timed out');
    throw err;
  }
};

export const removeMachine = async (machine_ids = [], timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const res = await fetch(`${BACKEND_BASE_URL}${API_ROUTES.MACHINES_REMOVE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getTokenHeader(),
      },
      body: JSON.stringify({ machine_ids }),
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Remove machine');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch (e) {}
    if (err.name === 'AbortError') throw new Error('Remove machine request timed out');
    throw err;
  }
};

export const updateMachine = async (machine_id = 0, fields = {}, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const res = await fetch(`${BACKEND_BASE_URL}${API_ROUTES.MACHINES_UPDATE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getTokenHeader(),
      },
      body: JSON.stringify({ machine_id, fields }),
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Update machine');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch (e) {}
    if (err.name === 'AbortError') throw new Error('Update machine request timed out');
    throw err;
  }
};

export const getDetailInformation = async (machine_id = 0, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const res = await fetch(`${BACKEND_BASE_URL}${API_ROUTES.MACHINES_GET_DETAIL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getTokenHeader(),
      },
      body: JSON.stringify({ machine_id }),
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Get machine detail');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch (e) {}
    if (err.name === 'AbortError') throw new Error('Get machine detail request timed out');
    throw err;
  }
};

export const listAllMachineBrefInformation = async ({ page_number = 1, page_size = 10 } = {}, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const res = await fetch(`${BACKEND_BASE_URL}${API_ROUTES.MACHINES_LIST}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getTokenHeader(),
      },
      body: JSON.stringify({ page_number, page_size }),
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'List machines');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch (e) {}
    if (err.name === 'AbortError') throw new Error('List machines request timed out');
    throw err;
  }
};
