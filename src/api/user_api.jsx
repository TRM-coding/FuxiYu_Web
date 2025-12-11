import { BACKEND_BASE_URL, API_ROUTES } from '../configs/backend_config';

export const loginUser = async ({ username, password }) => {
  const res = await fetch(`${BACKEND_BASE_URL}${API_ROUTES.LOGIN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error('Login failed');
  return res.json();
};
