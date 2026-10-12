// Helper to handle authentication/authorization error navigation and cleanup
export function clearAuth() {
  try {
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUserName');
    document.cookie = 'auth_token=; Max-Age=0; path=/';
  } catch (e) {
    // ignore
  }
}

export function handleAuthError(status, navigate) {
  // 401: clear login info and go to login (root)
  if (Number(status) === 401) {
    clearAuth();
    navigate('/');
    return;
  }

  // 403: do NOT clear login info; only navigate to /index
  if (Number(status) === 403) {
    navigate('/index');
    return;
  }

  // default fallback: navigate to root
  navigate('/');
}

export default handleAuthError;
