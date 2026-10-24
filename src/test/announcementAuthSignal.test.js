import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listTemplates } from '../api/announcement_api';

// 回归锁：announcement_api 对 requestManager 由"静态 + 动态"混合导入改为统一静态导入，
// 401 仍只发 abortAll('auth') → 'auth:expired' 信号（交给 App 级监听器统一处置），
// 这里既不跳转也不碰本地存储 / cookie。403 是一般权限拒绝，不发认证信号（Q04）：
// 覆盖所有包装器的完整矩阵见 apiAuthSignal.test.js。
describe('announcement_api 401 认证信号（导入统一后语义不变）', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const trackExpired = () => {
    const handler = vi.fn();
    window.addEventListener('auth:expired', handler);
    return {
      handler,
      stop: () => window.removeEventListener('auth:expired', handler),
    };
  };

  it('401 时派发 auth:expired，并抛出带 status / route 的错误', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      url: 'https://ctrl/api/announcements/templates',
      json: async () => ({ message: 'expired' }),
      text: async () => '',
    });
    const { handler, stop } = trackExpired();
    try {
      await expect(listTemplates()).rejects.toMatchObject({ status: 401 });
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail).toMatchObject({ reason: 'auth' });
    } finally {
      stop();
    }
  });

  it('403 是一般拒绝：抛出 403，但不发认证信号', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      url: 'https://ctrl/api/announcements/templates',
      json: async () => ({ message: 'forbidden' }),
      text: async () => '',
    });
    const { handler, stop } = trackExpired();
    try {
      await expect(listTemplates()).rejects.toMatchObject({ status: 403 });
      expect(handler).not.toHaveBeenCalled();
    } finally {
      stop();
    }
  });

  it('200 正常解析 JSON，不派发认证信号', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ templates: [] }),
    });
    const { handler, stop } = trackExpired();
    try {
      await expect(listTemplates()).resolves.toEqual({ templates: [] });
      expect(handler).not.toHaveBeenCalled();
    } finally {
      stop();
    }
  });
});