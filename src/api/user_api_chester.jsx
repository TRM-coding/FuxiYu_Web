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

// NOTE: Only `loginUser` and `registerUser` are implemented per API_DOC.md
