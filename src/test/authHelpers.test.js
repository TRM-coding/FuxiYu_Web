import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clearAuth, handleAuthError, shouldHandleAuthExpiry } from '../utils/authHelpers';

describe('authHelpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('认证失效的闩：一秒内只认第一次（401 会成批到达，不能每次都跳一次）', () => {
    expect(shouldHandleAuthExpiry(10_000)).toBe(true);
    expect(shouldHandleAuthExpiry(10_500)).toBe(false);
    expect(shouldHandleAuthExpiry(10_999)).toBe(false);
    expect(shouldHandleAuthExpiry(11_000)).toBe(true);
  });

  it('clearAuth 只清历史遗留的本地缓存，不碰 cookie', () => {
    localStorage.setItem('currentUserId', '7');
    localStorage.setItem('currentUserName', 'op1');
    const cookieBefore = document.cookie;

    clearAuth();

    expect(localStorage.getItem('currentUserId')).toBeNull();
    expect(localStorage.getItem('currentUserName')).toBeNull();
    // auth_token 是 HttpOnly，前端那句 document.cookie=... 从来就是空操作——
    // 所以这里刻意不去"清 cookie"，登出只有服务端 /api/users/logout 一条路。
    expect(document.cookie).toBe(cookieBefore);
  });

  // Q04 收尾：退出身份只能由 401（或用户主动 logout）触发。
  // 403 只服务布局 / 页面入口守卫的整页门禁，不清身份；业务失败 catch 不应调用它。
  describe('handleAuthError：只有 401 退出身份', () => {
    const navigate = vi.fn();

    beforeEach(() => {
      navigate.mockReset();
      localStorage.clear();
    });

    it('401：清历史本地身份并回登录页', () => {
      localStorage.setItem('currentUserId', '7');
      localStorage.setItem('currentUserName', 'op1');

      handleAuthError(401, navigate);

      expect(navigate).toHaveBeenCalledWith('/');
      expect(localStorage.getItem('currentUserId')).toBeNull();
      expect(localStorage.getItem('currentUserName')).toBeNull();
    });

    it('403：只回工作区，保留身份（供入口守卫使用）', () => {
      localStorage.setItem('currentUserId', '7');
      localStorage.setItem('currentUserName', 'op1');

      handleAuthError(403, navigate);

      expect(navigate).toHaveBeenCalledWith('/index');
      expect(localStorage.getItem('currentUserId')).toBe('7');
      expect(localStorage.getItem('currentUserName')).toBe('op1');
    });

    it('其它状态码（如 500）：既不导航也不清身份（只由业务方自己弹原因）', () => {
      localStorage.setItem('currentUserId', '7');

      handleAuthError(500, navigate);

      expect(navigate).not.toHaveBeenCalled();
      expect(localStorage.getItem('currentUserId')).toBe('7');
    });
  });
});
