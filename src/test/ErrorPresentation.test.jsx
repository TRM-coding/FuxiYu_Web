import { describe, it, expect, afterEach, beforeAll, afterAll } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import showErrorModal from '../utils/showErrorModal';

/**
 * showErrorModal 的行为回归：真实渲染弹窗后只看「当前可见弹窗」的文案。
 * 不能读整个 document.body —— 上一次弹窗即使被 hideExistingModals 置成
 * display:none，它的旧节点仍留在 body 里，读 body 会把旧文案算进本次断言。
 * 关注的契约：
 *  - 后端具体 message（含申请值/上限数字）优先保留，不被通用 invalid_config 覆盖；
 *  - 路由/HTTP 的中文提示继续出现，已知原因不硬套成“超限”；
 *  - 未知原因、body/data 包装、网络异常各有可理解的中文兜底。
 */

// jsdom 没实现伪元素 getComputedStyle(elt, pseudoElt)（rc-util 量滚动条宽度会用到），
// 只在本地去掉第二个参数、仍走原实现，避免把别的 console.error 一起压掉。
const originalGetComputedStyle = window.getComputedStyle;

const visibleDialogs = () => Array.from(document.querySelectorAll('.ant-modal'))
  .filter(el => el.style.display !== 'none');

/** 当前可见弹窗的文本：断言只作用在这一个 dialog 上 */
const dialogText = () => {
  const dialogs = visibleDialogs();
  if (!dialogs.length) throw new Error('当前没有可见的错误弹窗');
  return dialogs[dialogs.length - 1].textContent || '';
};

const openModal = async (params) => {
  // 只读“本次新开的那个弹窗”：它一定排在最后一个（旧残留节点只会更靠前）
  const before = visibleDialogs().length;
  await act(async () => {
    showErrorModal(params);
  });
  await waitFor(() => {
    expect(visibleDialogs().length).toBeGreaterThan(before);
  });
};

/**
 * 确定性清理：按 DOM 直接找确认按钮（隐藏弹窗用 role 查询查不到），
 * 逐一点掉后等可见弹窗归零，避免旧节点残留污染下一次断言。
 * 注意 antd 会在两个汉字之间插空格，实际 textContent 是「好 的」，
 * 因此按去掉全部空白后比较，不能直接比对「好的」。
 */
const closeAllDialogs = async () => {
  for (let i = 0; i < 5; i += 1) {
    const buttons = Array.from(document.querySelectorAll('.ant-modal button'))
      .filter(btn => (btn.textContent || '').replace(/\s/g, '') === '好的');
    if (!buttons.length) break;
    await act(async () => {
      buttons[buttons.length - 1].click();
    });
  }
  await waitFor(() => {
    expect(visibleDialogs()).toHaveLength(0);
  });
};

const CREATE_ROUTE = 'https://host/api/containers/create_container';
const MACHINE_ROUTE = 'https://host/api/machines/update_machine';

describe('showErrorModal 错误呈现行为', () => {
  beforeAll(() => {
    window.getComputedStyle = (el) => originalGetComputedStyle.call(window, el);
  });

  afterAll(() => {
    window.getComputedStyle = originalGetComputedStyle;
  });

  afterEach(async () => {
    await closeAllDialogs();
  });

  it('invalid_config 覆盖不了后端具体 message：申请值与上限数字保留，同时给出中文原因与 400 提示', async () => {
    await openModal({
      message: {
        success: 0,
        message: 'Requested shared_memory 8GB cannot exceed requested memory 4GB',
        error_reason: 'invalid_config',
      },
      status: 400,
      route: CREATE_ROUTE,
    });

    const text = dialogText();
    expect(text).toContain('Requested shared_memory 8GB cannot exceed requested memory 4GB');
    expect(text).toContain('8GB');
    expect(text).toContain('4GB');
    expect(text).toContain('原因：容器配置无效或超出宿主机上限');
    expect(text).toContain('请求无效，请检查输入后重试。');
  });

  it('body/data 包装的具体 message 与 error_reason 都能取出并保留数值', async () => {
    await openModal({
      message: {
        success: 0,
        body: {
          message: 'Requested shared_memory 8GB cannot exceed requested memory 4GB',
          error_reason: 'invalid_config',
        },
      },
      status: 400,
      route: CREATE_ROUTE,
    });
    expect(dialogText()).toContain('Requested shared_memory 8GB cannot exceed requested memory 4GB');
    expect(dialogText()).toContain('原因：容器配置无效或超出宿主机上限');
    await closeAllDialogs();

    await openModal({
      message: {
        success: 0,
        data: { message: 'max_shared_gb 16GB cannot exceed max_memory_gb 8GB', error_reason: 'update_failed' },
      },
      status: 422,
      route: MACHINE_ROUTE,
    });
    const text = dialogText();
    expect(text).toContain('max_shared_gb 16GB cannot exceed max_memory_gb 8GB');
    expect(text).toContain('16GB');
    expect(text).toContain('8GB');
    expect(text).toContain('原因：更新机器失败');
    expect(text).toContain('请求参数校验失败，请修正后重试。');
    // 机器限额的服务层拒绝不是容器创建超限，不借用那条文案
    expect(text).not.toContain('容器配置无效或超出宿主机上限');
  });

  it('机器限额的请求模型层非法值走本路由文案（invalid_payload / 400）', async () => {
    await openModal({
      message: { success: 0, message: 'max_shared_gb: Input should be a valid integer', error_reason: 'invalid_payload' },
      status: 400,
      route: MACHINE_ROUTE,
    });

    const text = dialogText();
    expect(text).toContain('max_shared_gb: Input should be a valid integer');
    expect(text).toContain('原因：机器配置限额参数无效');
    expect(text).toContain('请求无效，请检查输入后重试。');
    expect(text).not.toContain('容器配置无效或超出宿主机上限');
  });

  it('已知原因不被当成超限：机器离线只给机器作用域文案', async () => {
    await openModal({
      message: { success: 0, message: 'MACHINE remove aborted: machine is offline', error_reason: 'machine_offline' },
      status: 400,
      route: CREATE_ROUTE,
    });

    const text = dialogText();
    expect(text).toContain('MACHINE remove aborted: machine is offline');
    expect(text).toContain('所在机器不在线，暂时无法操作其上的容器');
    expect(text).not.toContain('超出宿主机上限');
  });

  it('未知 error_reason 有中文兜底并标明未收录，不硬套已知错误', async () => {
    await openModal({
      message: { success: 0, error_reason: 'brand_new_reason' },
      status: 400,
      route: MACHINE_ROUTE,
    });

    const text = dialogText();
    expect(text).toContain('发生未知错误，请重试或联系管理员。');
    expect(text).toContain('未收录的错误原因：brand_new_reason');
    expect(text).toContain('请求无效，请检查输入后重试。');
    expect(text).not.toContain('超出宿主机上限');
  });

  it('网络失败（无状态、无 error_reason）给中文兜底，不直接抛英文原文', async () => {
    await openModal({ message: new TypeError('Failed to fetch') });

    expect(dialogText()).toContain('网络异常或请求超时，无法连接到服务器，请检查网络后重试。');
    expect(dialogText()).not.toContain('Failed to fetch');
  });

  it('无原因的中文自定义文案与 HTTP 状态提示保持原样', async () => {
    await openModal({ message: '保存失败', status: 500, route: MACHINE_ROUTE });

    expect(dialogText()).toContain('保存失败');
    expect(dialogText()).toContain('服务器出现错误，请稍后重试或联系管理员。');
  });

  it('401/403 的中文提示与身份验证原因保持（不改认证流程文案）', async () => {
    await openModal({
      message: { success: 0, message: 'invalid token', error_reason: 'invalid_token' },
      status: 401,
      route: 'https://host/api/users/me/permissions',
    });
    expect(dialogText()).toContain('原因：身份验证失败，请重新登录');
    expect(dialogText()).toContain('未授权，请登录后重试。');
    await closeAllDialogs();

    await openModal({
      message: { success: 0, message: 'forbidden', error_reason: 'insufficient_permission' },
      status: 403,
      route: 'https://host/api/machines/update_machine',
    });
    expect(dialogText()).toContain('原因：权限不足');
    expect(dialogText()).toContain('权限不足，您没有执行此操作的权限。');
  });
});