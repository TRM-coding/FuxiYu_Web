import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Q27：权限查询必须在 finally 注销控制器并清理计时器。
 *
 * 这里替换 requestManager 的 create/unregister 为可观测版本，但仍委托真实实现：
 * - activeControllers 模拟全局集合里“尚未结束”的控制器；
 * - unregister 用真实实现删除，验证成功/401/异常后集合归零；
 * - abortAll 保持真实实现，本文件不通过 abortAll 清理，避免污染它的身份语义。
 */
const manager = vi.hoisted(() => ({
  activeControllers: new Set(),
  createController: vi.fn(),
  unregisterController: vi.fn(),
  abortAll: vi.fn(),
}));

vi.mock('../utils/requestManager', async (importOriginal) => {
  const actual = await importOriginal();
  manager.createController.mockImplementation(() => {
    const controller = actual.createController();
    manager.activeControllers.add(controller);
    return controller;
  });
  manager.unregisterController.mockImplementation((controller) => {
    manager.activeControllers.delete(controller);
    return actual.unregisterController(controller);
  });
  manager.abortAll.mockImplementation(actual.abortAll);
  return {
    createController: manager.createController,
    unregisterController: manager.unregisterController,
    abortAll: manager.abortAll,
    isAbortError: actual.isAbortError,
  };
});

import { getUserPermissions } from '../api/user_api';

const successResponse = () => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  url: 'https://ctrl/api/users/me/permissions',
  json: async () => ({
    success: 1,
    entities: ['image:view'],
    image_resource_unrestricted: true,
    user_id: 3,
    username: 'editor',
  }),
});

const unauthorizedResponse = () => ({
  ok: false,
  status: 401,
  statusText: 'Unauthorized',
  url: 'https://ctrl/api/users/me/permissions',
  json: async () => ({ success: 0, message: 'invalid or missing token', error_reason: 'invalid_token' }),
  text: async () => 'invalid or missing token',
});

const expectReleased = () => {
  expect(manager.activeControllers.size).toBe(0);
  expect(manager.unregisterController).toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
  // 释放路径不能借用全局 abortAll：它只属于认证失效等明确的全局语义。
  expect(manager.abortAll).not.toHaveBeenCalled();
};

beforeEach(() => {
  vi.useFakeTimers();
  manager.activeControllers.clear();
  manager.createController.mockClear();
  manager.unregisterController.mockClear();
  manager.abortAll.mockClear();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Q27 getUserPermissions 控制器释放', () => {
  it('test_q27_success_unregisters_controller', async () => {
    fetch.mockResolvedValue(successResponse());

    const result = await getUserPermissions();

    expect(result).toMatchObject({ userId: 3, userName: 'editor' });
    expect(manager.createController).toHaveBeenCalledTimes(1);
    expect(manager.unregisterController).toHaveBeenCalledTimes(1);
    expect(manager.unregisterController).toHaveBeenCalledWith(
      manager.createController.mock.results[0].value,
    );
    expectReleased();
  });

  it('test_q27_error_unregisters_controller', async () => {
    fetch.mockResolvedValue(unauthorizedResponse());
    await expect(getUserPermissions()).rejects.toMatchObject({ status: 401 });
    expectReleased();

    manager.activeControllers.clear();
    manager.createController.mockClear();
    manager.unregisterController.mockClear();
    manager.abortAll.mockClear();
    fetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(getUserPermissions()).rejects.toThrow('Failed to fetch');
    expectReleased();
  });

  it('test_q27_repeated_queries_no_accumulation', async () => {
    const abortError = Object.assign(new Error('请求超时'), { name: 'AbortError' });
    fetch
      .mockResolvedValueOnce(successResponse())
      .mockResolvedValueOnce(unauthorizedResponse())
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(abortError);

    await getUserPermissions();
    await expect(getUserPermissions()).rejects.toMatchObject({ status: 401 });
    await expect(getUserPermissions()).rejects.toThrow('Failed to fetch');
    // 超时/中止同样必须走 finally，不能被漏成“已完成但仍在集合里”的控制器。
    await expect(getUserPermissions()).rejects.toMatchObject({ name: 'AbortError' });

    expect(manager.createController).toHaveBeenCalledTimes(4);
    expect(manager.unregisterController).toHaveBeenCalledTimes(4);
    expectReleased();
  });
});
