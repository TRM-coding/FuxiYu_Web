import React from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

/**
 * 成员增删改的真实错误消费链：
 * Ctrl 响应 → container_api 包装器 → ContainerDetailPage catch → showErrorModal → 用户看到的弹窗。
 *
 * 这里只 mock 与本缺陷无关的详情/历史/候选用户读取；add/remove/update 使用真实包装器，
 * showErrorModal 也使用真实组件，避免只断言字典或 mock 参数。
 */

const permissionState = vi.hoisted(() => ({
  entities: ['container:operation', 'container:manage', 'bypass_auth_entity', 'bypass_resource'],
  userId: 1,
  userName: 'root_user',
  containerResourceUnrestricted: true,
}));

vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal();
  return {
    ...antd,
    message: {
      success: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
      loading: vi.fn(),
      destroy: vi.fn(),
    },
  };
});

vi.mock('../contexts/PermissionContext', () => ({
  usePermission: () => ({
    ...permissionState,
    loaded: true,
    hasPermission: code => permissionState.entities.includes(code),
  }),
}));

vi.mock('../api/user_api', () => ({
  listAllUserBrefInformation: vi.fn(),
}));

vi.mock('../api/container_api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getContainerDetailInformation: vi.fn(),
    getContainerOperationLogs: vi.fn(),
  };
});

import {
  addCollaborator,
  getContainerDetailInformation,
  getContainerOperationLogs,
  removeCollaborator,
  updateRole,
} from '../api/container_api';
import { listAllUserBrefInformation } from '../api/user_api';
import { toErrorModalInput } from '../utils/errorModalInput';
import showErrorModal from '../utils/showErrorModal';
import ContainerDetailPage from '../pages/ContainerDetailPage';

const detail = () => ({
  container_id: 4,
  container_name: 'audit-role-error',
  effective_status: 'online',
  machine_id: 1,
  machine_ip: '127.0.0.1',
  port: 2222,
  accounts: [
    { user_id: 1, username: 'root_user', role: 'ROOT' },
    { user_id: 2, username: 'collab', role: 'COLLABORATOR' },
  ],
  is_long_term: false,
  long_term_container_can_enable: true,
  disk_usage_percent: 20,
  runtime_metrics: {},
});

const renderPage = () => render(
  <MemoryRouter initialEntries={['/index/containers/4']}>
    <Routes>
      <Route path="/index/containers/:containerId" element={<ContainerDetailPage />} />
    </Routes>
  </MemoryRouter>,
);

const visibleDialogs = () => Array.from(document.querySelectorAll('.ant-modal'))
  .filter(el => el.style.display !== 'none');

const lastDialogText = () => {
  const dialogs = visibleDialogs();
  if (!dialogs.length) throw new Error('当前没有可见的错误弹窗');
  return dialogs[dialogs.length - 1].textContent || '';
};

const waitForErrorDialog = async () => {
  await waitFor(() => expect(visibleDialogs().length).toBeGreaterThan(0));
  return lastDialogText();
};

const closeErrorDialog = async () => {
  for (let i = 0; i < 3; i += 1) {
    const buttons = Array.from(document.querySelectorAll('.ant-modal button'))
      .filter(btn => (btn.textContent || '').replace(/\s/g, '') === '好的');
    if (!buttons.length) break;
    await userEvent.click(buttons[buttons.length - 1]);
  }
  await waitFor(() => expect(visibleDialogs()).toHaveLength(0));
};

const ctrlResponse = ({ status, body, path }) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status === 400 ? 'Bad Request' : 'Error',
  url: `https://web.local${path}`,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

let fetchResponder;

// jsdom 没实现伪元素 getComputedStyle；只在本地去掉第二个参数，避免 rc-util 量滚动条时报错。
const originalGetComputedStyle = window.getComputedStyle;

beforeAll(() => {
  window.getComputedStyle = (el) => originalGetComputedStyle.call(window, el);
});

afterAll(() => {
  window.getComputedStyle = originalGetComputedStyle;
});

const useMemberCtrlError = ({
  path,
  status,
  reason,
  message,
  extra = {},
}) => {
  fetchResponder = (requestPath) => {
    if (requestPath.endsWith(path)) {
      return ctrlResponse({
        status,
        path: requestPath,
        body: { success: 0, message, error_reason: reason, ...extra },
      });
    }
    return ctrlResponse({ status: 200, path: requestPath, body: { success: 1 } });
  };
};

const memberRow = async (username) => {
  const text = await screen.findByText(`@${username} · ID 2`);
  return text.closest('.container-people-item');
};

const clickRemove = async (username) => {
  const row = await memberRow(username);
  const removeButton = row.querySelector('button.ant-btn-dangerous');
  expect(removeButton).not.toBeNull();
  await userEvent.click(removeButton);
};

const selectRole = async (optionName) => {
  const combos = [...document.querySelectorAll('.container-people-actions [role="combobox"]')]
    .filter(el => !el.disabled);
  const combo = combos[combos.length - 1];
  fireEvent.mouseDown(combo.closest('.ant-select')?.querySelector('.ant-select-selector') || combo);
  await waitFor(() => {
    expect([...document.querySelectorAll('.ant-select-item-option')]
      .some(el => el.textContent.includes(optionName))).toBe(true);
  });
  const option = [...document.querySelectorAll('.ant-select-item-option')]
    .find(el => el.textContent.includes(optionName));
  await userEvent.click(option);
};

const selectAddUser = async () => {
  expect(await screen.findByText('audit-role-error')).toBeInTheDocument();
  fireEvent.mouseDown(document.querySelector('.container-people-add .ant-select-selector'));
  await waitFor(() => {
    expect([...document.querySelectorAll('.ant-select-item-option')]
      .some(el => el.textContent.includes('Bob'))).toBe(true);
  });
  const option = [...document.querySelectorAll('.ant-select-item-option')]
    .find(el => el.textContent.includes('Bob'));
  await userEvent.click(option);
};

beforeEach(() => {
  vi.clearAllMocks();
  permissionState.entities = ['container:operation', 'container:manage', 'bypass_auth_entity', 'bypass_resource'];
  permissionState.containerResourceUnrestricted = true;
  getContainerDetailInformation.mockResolvedValue({ container_info: detail() });
  getContainerOperationLogs.mockResolvedValue({ logs: [] });
  listAllUserBrefInformation.mockResolvedValue({
    users: [
      { id: 1, username: 'root_user', name: 'Root' },
      { id: 2, username: 'collab', name: 'Collab' },
      { id: 3, username: 'bob', name: 'Bob' },
    ],
  });
  fetchResponder = () => ctrlResponse({ status: 200, path: '/api/noop', body: { success: 1 } });
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    const requestPath = new URL(String(url)).pathname;
    return fetchResponder(requestPath);
  }));
  vi.spyOn(globalThis, 'setInterval').mockImplementation(() => 1);
  vi.spyOn(globalThis, 'clearInterval').mockImplementation(() => {});
});

afterEach(async () => {
  await closeErrorDialog();
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('成员增删改失败：下游真实弹窗显示守卫原因', () => {
  it('离线移除成员：显示中文原因，不残留英文守卫原文或通用 400 提示', async () => {
    useMemberCtrlError({
      path: '/api/containers/remove_collaborator',
      status: 400,
      reason: 'container_offline',
      message: 'Container operation remove_collaborator is not allowed while effective_status is offline',
    });
    renderPage();
    await clickRemove('collab');

    const text = await waitForErrorDialog();
    expect(text).toContain('容器未在线，无法移除协作者');
    // 修复前同一句英文会在 message 和 content 各出现一次；现在准确中文原因只呈现一次。
    expect(text.match(/容器未在线，无法移除协作者/g)).toHaveLength(1);
    expect(text).not.toContain('Container operation');
    expect(text).not.toContain('请求无效，请检查输入后重试');
    expect(text).not.toContain('未收录的错误原因');
  });

  it('离线新增成员：包装器保留 error_reason，并隐藏通用英文失败文案与 400 提示', async () => {
    useMemberCtrlError({
      path: '/api/containers/add_collaborator',
      status: 400,
      reason: 'container_offline',
      message: 'Failed to add collaborator',
      extra: { credentials: [{ login_name: 'bob', password: 'member-secret' }] },
    });
    renderPage();
    await selectAddUser();
    await userEvent.click(screen.getByRole('button', { name: /添加/ }));

    const text = await waitForErrorDialog();
    expect(text).toContain('容器未在线，无法添加协作者');
    expect(text).not.toContain('Failed to add collaborator');
    expect(text).not.toContain('请求无效，请检查输入后重试');
    expect(text).not.toContain('未收录的错误原因');
    expect(text).not.toContain('member-secret');
  });

  it('冻结容器更新角色：显示冻结中文原因，不退回未知原因或 409 通用提示', async () => {
    useMemberCtrlError({
      path: '/api/containers/update_role',
      status: 409,
      reason: 'container_paused',
      message: 'Failed to update role',
    });
    renderPage();
    await memberRow('collab');
    await selectRole('管理员');

    const text = await waitForErrorDialog();
    expect(text).toContain('容器已冻结，无法更新角色');
    expect(text).not.toContain('Failed to update role');
    expect(text).not.toContain('请求冲突，请检查是否存在重复内容。');
    expect(text).not.toContain('未收录的错误原因');
  });

  it('冻结容器移除成员：同样映射为冻结中文原因', async () => {
    useMemberCtrlError({
      path: '/api/containers/remove_collaborator',
      status: 409,
      reason: 'container_paused',
      message: 'Container operation remove_collaborator is not allowed while effective_status is paused',
    });
    renderPage();
    await clickRemove('collab');

    const text = await waitForErrorDialog();
    expect(text).toContain('容器已冻结，无法移除协作者');
    expect(text).not.toContain('Container operation');
    expect(text).not.toContain('请求冲突，请检查是否存在重复内容。');
    expect(text).not.toContain('未收录的错误原因');
  });

  it.each([
    {
      name: 'remove failed',
      path: '/api/containers/remove_collaborator',
      status: 409,
      reason: 'container_failed',
      message: 'Container operation remove_collaborator is not allowed while effective_status is failed',
      run: () => removeCollaborator({ user_id: 2, container_id: 4 }),
      text: '容器状态异常，无法移除协作者',
      generic: '请求冲突，请检查是否存在重复内容。',
    },
    {
      name: 'remove busy',
      path: '/api/containers/remove_collaborator',
      status: 409,
      reason: 'container_busy',
      message: 'Container operation remove_collaborator is not allowed while effective_status is stopping',
      run: () => removeCollaborator({ user_id: 2, container_id: 4 }),
      text: '容器正在处理中，暂时无法移除协作者',
      generic: '请求冲突，请检查是否存在重复内容。',
    },
    {
      name: 'remove status unknown',
      path: '/api/containers/remove_collaborator',
      status: 409,
      reason: 'container_status_unknown',
      message: 'Container operation remove_collaborator is not allowed while effective_status is status_unknown',
      run: () => removeCollaborator({ user_id: 2, container_id: 4 }),
      text: '容器状态未知，暂时无法移除协作者',
      generic: '请求冲突，请检查是否存在重复内容。',
    },
    {
      name: 'remove host offline',
      path: '/api/containers/remove_collaborator',
      status: 503,
      reason: 'container_host_offline',
      message: 'MACHINE remove aborted: machine is offline',
      run: () => removeCollaborator({ user_id: 2, container_id: 4 }),
      text: '所在机器不在线，暂时无法操作其上的容器',
      generic: '服务暂不可用，请稍后再试。',
    },
    {
      name: 'remove host maintenance',
      path: '/api/containers/remove_collaborator',
      status: 503,
      reason: 'container_host_maintenance',
      message: 'MACHINE remove aborted: machine is maintenance',
      run: () => removeCollaborator({ user_id: 2, container_id: 4 }),
      text: '所在机器正在维护中，暂时无法操作其上的容器',
      generic: '服务暂不可用，请稍后再试。',
    },
    {
      name: 'add busy',
      path: '/api/containers/add_collaborator',
      status: 409,
      reason: 'container_busy',
      message: 'Failed to add collaborator',
      run: () => addCollaborator({ user_id: 3, container_id: 4, role: 'COLLABORATOR' }),
      text: '容器正在处理中，暂时无法添加协作者',
      generic: '请求冲突，请检查是否存在重复内容。',
    },
    {
      name: 'update failed',
      path: '/api/containers/update_role',
      status: 409,
      reason: 'container_failed',
      message: 'Failed to update role',
      run: () => updateRole({ container_id: 4, user_id: 2, updated_role: 'ADMIN' }),
      text: '容器状态异常，无法更新角色',
      generic: '请求冲突，请检查是否存在重复内容。',
    },
  ])('$name：包装器 + 归一化 + 真实弹窗保留中文守卫原因', async (row) => {
    useMemberCtrlError(row);
    let err = null;
    try {
      await row.run();
    } catch (caught) {
      err = caught;
    }
    expect(err).toBeTruthy();
    await act(async () => {
      // showErrorModal 会等待用户确认，不能 await；这里只等它完成首次渲染。
      showErrorModal(toErrorModalInput(err));
    });

    const text = await waitForErrorDialog();
    expect(text).toContain(row.text);
    expect(text).not.toContain('未收录的错误原因');
    expect(text).not.toContain('Container operation');
    expect(text).not.toContain('MACHINE remove aborted');
    expect(text).not.toContain('Failed to add collaborator');
    expect(text).not.toContain('Failed to update role');
    expect(text).not.toContain(row.generic);
  });

  it('401/403 保留专门认证/权限提示，不当作普通 400 或成员状态错误', async () => {
    useMemberCtrlError({
      path: '/api/containers/remove_collaborator',
      status: 403,
      reason: 'insufficient_permission',
      message: 'forbidden',
    });
    renderPage();
    await clickRemove('collab');

    let text = await waitForErrorDialog();
    expect(text).toContain('原因：权限不足');
    expect(text).toContain('权限不足，您没有执行此操作的权限。');
    expect(text).not.toContain('请求无效，请检查输入后重试');
    await closeErrorDialog();

    useMemberCtrlError({
      path: '/api/containers/remove_collaborator',
      status: 401,
      reason: 'invalid_token',
      message: 'invalid token',
    });
    await clickRemove('collab');

    text = await waitForErrorDialog();
    expect(text).toContain('原因：身份验证失败，请重新登录');
    expect(text).toContain('未授权，请登录后重试。');
    expect(text).not.toContain('请求无效，请检查输入后重试');
  });
});
