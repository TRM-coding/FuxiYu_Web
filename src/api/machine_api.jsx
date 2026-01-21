import { BACKEND_BASE_URL, REQUEST_TIMEOUT, CREDENTIALS, API_ROUTES } from '../configs/backend_config';

const createTimeoutController = (timeout) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout || REQUEST_TIMEOUT);
  return { controller, timer };
};

const ensureOk = async (res, action) => {
  if (!res.ok) {
    const text = await res.text().catch(() => null);
    throw new Error(`${action} failed: ${res.status} ${text || res.statusText}`);
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
    return await ensureOk(res, 'Add machine');
  } catch (err) {
    clearTimeout(timer);
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
    return await ensureOk(res, 'Remove machine');
  } catch (err) {
    clearTimeout(timer);
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
    return await ensureOk(res, 'Update machine');
  } catch (err) {
    clearTimeout(timer);
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
    return await ensureOk(res, 'Get machine detail');
  } catch (err) {
    clearTimeout(timer);
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
    return await ensureOk(res, 'List machines');
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('List machines request timed out');
    throw err;
  }
};
