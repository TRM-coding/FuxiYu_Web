import { BACKEND_BASE_URL, API_ROUTES, REQUEST_TIMEOUT, CREDENTIALS } from '../configs/backend_config';

export const loginUser = async ({ username, password }, timeout = null) => {
  const requestTimeout = timeout || REQUEST_TIMEOUT;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeout);

  try {
    const res = await fetch(`${BACKEND_BASE_URL}${API_ROUTES.LOGIN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      signal: controller.signal,
      credentials: CREDENTIALS
    });
    
    clearTimeout(timer);
    
    if (!res.ok) {
      const text = await res.text().catch(() => null);
      throw new Error(`Login failed: ${res.status} ${text || res.statusText}`);
    }
    
    return res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new Error('Login request timed out');
    }
    throw err;
  }
};
