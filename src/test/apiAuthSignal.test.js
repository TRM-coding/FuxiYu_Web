import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import * as userApi from '../api/user_api';
import * as containerApi from '../api/container_api';
import * as machineApi from '../api/machine_api';
import * as imageApi from '../api/image_api';
import * as rbacApi from '../api/rbac_api';
import * as settingsApi from '../api/settings_api';
import * as announcementApi from '../api/announcement_api';
import * as operationLogApi from '../api/operation_log_api';
import { createController, unregisterController } from '../utils/requestManager';

/**
 * Q04 回归锁：401 与 403 在**所有** API 包装器里的语义必须分开。
 *
 *  - 401 = 认证失效：保持既有全局策略，只发 abortAll('auth') → 'auth:expired' 信号
 *    （由 App 级监听器统一清权限快照并回登录页），并中断在途请求。
 *  - 403 = 登录着但没有该权限的一般拒绝：**不得** abortAll('auth')、不得发 'auth:expired'、
 *    不得清身份、不得中断其它在途请求；错误只交给调用方展示。
 *
 * 每个模块取一个代表导出函数：ensureOk 是各模块内部的同一段逻辑，逐模块覆盖才能证明
 * 没有任何一个包装器漏掉 403 分支。响应体必须原样保留（数值仍是数值），
 * 因为错误展示依赖后端 message 里的申请值/上限数字。
 */

const FORBIDDEN_BODY = {
  success: 0,
  message: '配额超出本次可申请上限：内存 当前申请 1 GB，本次可申请上限 0 GB',
  error_reason: 'invalid_config',
  limits: { requested: 1, allowed: 0 },
  wild_containers: [144, 145],
};

// [模块名, 调用代表函数]
const WRAPPERS = [
  ['user_api', () => userApi.getUserDetailInformation(7)],
  ['container_api', () => containerApi.listAllContainerBrefInformation({ page_number: 0, page_size: 10 })],
  ['machine_api', () => machineApi.listAllMachineBrefInformation({ page_number: 0, page_size: 10 })],
  ['image_api', () => imageApi.listImageBrefInformation({ page_number: 1, page_size: 10 })],
  ['rbac_api', () => rbacApi.getRbacMatrix()],
  ['settings_api', () => settingsApi.listSystemSettings()],
  ['announcement_api', () => announcementApi.listTemplates()],
  ['operation_log_api', () => operationLogApi.listOperationLogs({ page: 1 })],
];

const stubResponse = (status, { body = FORBIDDEN_BODY, statusText = 'Error' } = {}) => {
  fetch.mockResolvedValue({
    ok: false,
    status,
    statusText,
    url: `https://ctrl/api/test?status=${status}`,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
};

/** 记录 window 上的两类事件；返回停止函数与 handler */
const trackWindowEvents = () => {
  const expired = vi.fn();
  const abortAll = vi.fn();
  window.addEventListener('auth:expired', expired);
  window.addEventListener('requestManager:abortAll', abortAll);
  return {
    expired,
    abortAll,
    stop: () => {
      window.removeEventListener('auth:expired', expired);
      window.removeEventListener('requestManager:abortAll', abortAll);
    },
  };
};

describe('API 包装器 401/403 语义分离（Q04）', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe.each(WRAPPERS)('%s', (_name, call) => {
    it('401：发一次 auth:expired（全局失效策略保持），并中断在途请求', async () => {
      stubResponse(401, { body: { success: 0, message: 'invalid or missing token', error_reason: 'invalid_token' } });
      const events = trackWindowEvents();
      const inflight = createController();
      try {
        await expect(call()).rejects.toMatchObject({ status: 401 });

        expect(events.expired).toHaveBeenCalledTimes(1);
        expect(events.expired.mock.calls[0][0].detail).toMatchObject({ reason: 'auth' });
        expect(events.abortAll).toHaveBeenCalledTimes(1);
        // 401 是全局失效：在途请求一并中断（既有策略）
        expect(inflight.signal.aborted).toBe(true);
      } finally {
        events.stop();
        unregisterController(inflight);
      }
    });

    it('403：一般拒绝，不发认证信号、不清身份、不动其它在途请求，且原样保留响应体', async () => {
      stubResponse(403, { body: FORBIDDEN_BODY, statusText: 'Forbidden' });
      const events = trackWindowEvents();
      const inflight = createController();
      try {
        const err = await call().then(
          () => { throw new Error('403 必须被拒绝，不能当成成功'); },
          (e) => e,
        );

        expect(err.status).toBe(403);
        expect(err.route).toContain('https://ctrl/api/test');
        expect(events.expired).not.toHaveBeenCalled();
        expect(events.abortAll).not.toHaveBeenCalled();
        // 会话保留：其它在途请求不被清掉
        expect(inflight.signal.aborted).toBe(false);

        // 响应体原样保留：错误展示依赖 message 里的申请值/上限数字
        expect(err.body).toEqual(FORBIDDEN_BODY);
        expect(err.body.limits.allowed).toBe(0);
        expect(typeof err.body.limits.allowed).toBe('number');
        expect(err.body.wild_containers).toEqual([144, 145]);
        expect(typeof err.body.wild_containers[0]).toBe('number');
        expect(err.message).toContain('403');
        expect(err.message).toContain('本次可申请上限 0 GB');
      } finally {
        events.stop();
        unregisterController(inflight);
      }
    });

    it('200：正常解析 JSON，不发任何认证信号', async () => {
      fetch.mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        url: 'https://ctrl/api/test',
        json: async () => ({ ok: 1, total: 0 }),
      });
      const events = trackWindowEvents();
      try {
        await expect(call()).resolves.toEqual({ ok: 1, total: 0 });
        expect(events.expired).not.toHaveBeenCalled();
        expect(events.abortAll).not.toHaveBeenCalled();
      } finally {
        events.stop();
      }
    });
  });

  it('非 401/403 错误（如 400）同样不发认证信号，body 数值保留', async () => {
    const body = { success: 0, message: 'image_id is required', error_reason: 'invalid_payload', required: 0 };
    stubResponse(400, { body, statusText: 'Bad Request' });
    const events = trackWindowEvents();
    try {
      const err = await containerApi.listAllContainerBrefInformation().then(
        () => { throw new Error('400 必须被拒绝'); },
        (e) => e,
      );

      expect(err.status).toBe(400);
      expect(events.expired).not.toHaveBeenCalled();
      expect(err.body).toEqual(body);
      expect(err.body.required).toBe(0);
    } finally {
      events.stop();
    }
  });

  it('getUserPermissions：匿名探测的静默 401 不发认证信号（公开注册页必须进得去）', async () => {
    stubResponse(401, { body: { success: 0, message: 'invalid or missing token', error_reason: 'invalid_token' } });
    const events = trackWindowEvents();
    try {
      const err = await userApi.getUserPermissions().then(
        () => { throw new Error('401 必须被拒绝'); },
        (e) => e,
      );

      expect(err.status).toBe(401);
      // 这一条是刻意的例外：Provider 挂载时问「我是谁」，匿名必然 401；
      // 若在此广播 auth:expired，/register 对匿名访客会被推回登录页。
      expect(events.expired).not.toHaveBeenCalled();
      expect(events.abortAll).not.toHaveBeenCalled();
    } finally {
      events.stop();
    }
  });
});
