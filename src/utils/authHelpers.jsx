// Helper to handle authentication/authorization error navigation and cleanup
//
// 身份的唯一真相是 **HttpOnly cookie**（服务端持有）。前端不维护任何"我在不在登录"
// 的状态：任何一次请求的 401 就是答案。这里只留两件小事——
//   1) 清历史遗留的展示缓存（2026-09 之前前端把 user_id/username 存在 localStorage 当
//      登录标记，那份副本必须下线，见 PermissionContext）
//   2) 一个"闩"：认证失效只处理一次

// 只清历史遗留的展示缓存。**不要**在这里碰 cookie：auth_token 是 HttpOnly，
// 前端既读不到也删不掉（此前那句 `document.cookie = 'auth_token=; ...'` 一直是空操作，
// 却让人以为"前端能登出"）。真正的登出只有服务端的 /api/users/logout。
export function clearAuth() {
  try {
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUserName');
  } catch {
    // ignore
  }
}

// 认证失效的"闩"：401 往往成批到达（一个页面同时发好几个请求），每次跳一次登录页
// 会把页面推来推去——2026-09 实测过 12 次/秒的风暴。一秒内只认第一次。
let _lastAuthExpiryHandledAt = 0;

export function shouldHandleAuthExpiry(now = Date.now()) {
  if (now - _lastAuthExpiryHandledAt < 1000) return false;
  _lastAuthExpiryHandledAt = now;
  return true;
}

export function handleAuthError(status, navigate) {
  // 401：正常由 App 级监听器统一处置（清权限快照 → 回登录页）；页面自己别抢着做
  if (Number(status) === 401) {
    clearAuth();
    navigate('/');
    return;
  }

  // 403: 不清登录信息；只回首页（登录着，但没这个权限）
  if (Number(status) === 403) {
    navigate('/index');
    return;
  }

  // default fallback: navigate to root
  navigate('/');
}

export default handleAuthError;
