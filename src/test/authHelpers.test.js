import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clearAuth, shouldHandleAuthExpiry } from '../utils/authHelpers';

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
});
