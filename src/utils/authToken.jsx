export function getAuthToken() {
  try {
    const cookieMatch = typeof document !== 'undefined'
      ? document.cookie.match(/(?:^|; )auth_token=([^;]*)/)
      : null;
    const cookieToken = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || cookieToken || null;
  } catch (e) {
    return null;
  }
}

export function getAuthTokenHeader() {
  const token = getAuthToken();
  return token ? { token } : {};
}

export default getAuthToken;
