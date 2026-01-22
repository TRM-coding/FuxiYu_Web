import { BACKEND_BASE_URL, API_ROUTES, REQUEST_TIMEOUT, CREDENTIALS } from '../configs/backend_config';


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

export const loginUser = async ({ username, password }, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const res = await fetch(`${BACKEND_BASE_URL}${API_ROUTES.LOGIN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      signal: controller.signal,
      credentials: CREDENTIALS
    });
    clearTimeout(timer);
    return await ensureOk(res, 'Login');
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error('Login request timed out');
    }
    throw err;
  }
};

export const registerUser = async ({ username, email, password, graduation_year = null }, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const res = await fetch(`${BACKEND_BASE_URL}${API_ROUTES.REGISTER}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, graduation_year }),
      signal: controller.signal,
      credentials: CREDENTIALS
    });
    clearTimeout(timer);
    return await ensureOk(res, 'Register');
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error('Register request timed out');
    }
    throw err;
  }
};

const getTokenHeader = () => {
  try {
    const token = localStorage.getItem('authToken');
    return token ? { token } : {};
  } catch (e) {
    return {};
  }
};

export const changePasswordUser = async ({ user_id, old_password, new_password } = {}, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const res = await fetch(`${BACKEND_BASE_URL}${API_ROUTES.USERS_CHANGE_PASSWORD}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getTokenHeader(),
      },
      body: JSON.stringify({ user_id, old_password, new_password }),
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    return await ensureOk(res, 'Change password');
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('Change password request timed out');
    throw err;
  }
};

export const deleteUser = async (user_id = 0, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const res = await fetch(`${BACKEND_BASE_URL}${API_ROUTES.USERS_DELETE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getTokenHeader(),
      },
      body: JSON.stringify({ user_id }),
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    return await ensureOk(res, 'Delete user');
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('Delete user request timed out');
    throw err;
  }
};

export const getUserDetailInformation = async (user_id = 0, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const url = new URL(`${BACKEND_BASE_URL}${API_ROUTES.USERS_GET_DETAIL}`);
    url.searchParams.set('user_id', String(user_id));
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        ...getTokenHeader(),
      },
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    return await ensureOk(res, 'Get user detail');
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('Get user detail request timed out');
    throw err;
  }
};

export const listAllUserBrefInformation = async ({ page_number = 1, page_size = 10 } = {}, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const url = new URL(`${BACKEND_BASE_URL}${API_ROUTES.USERS_LIST}`);
    url.searchParams.set('page_number', String(page_number));
    url.searchParams.set('page_size', String(page_size));
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        ...getTokenHeader(),
      },
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    return await ensureOk(res, 'List users');
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('List users request timed out');
    throw err;
  }
};

export default {
  loginUser,
  registerUser,
  changePasswordUser,
  deleteUser,
  getUserDetailInformation,
  listAllUserBrefInformation,
};
