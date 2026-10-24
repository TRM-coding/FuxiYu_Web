import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const permissionState = vi.hoisted(() => ({
  entities: ['container:operation', 'container:manage'],
  userId: 1,
  userName: 'root_user',
  containerResourceUnrestricted: false,
}));

vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal();
  return { ...antd, message: { success: vi.fn(), warning: vi.fn(), error: vi.fn(), loading: vi.fn(), destroy: vi.fn() } };
});
vi.mock('../contexts/PermissionContext', () => ({
  usePermission: () => ({
    ...permissionState,
    loaded: true,
    hasPermission: code => permissionState.entities.includes(code),
  }),
}));
vi.mock('../utils/showErrorModal', () => ({ default: vi.fn() }));
vi.mock('../api/container_api', () => ({
  addCollaborator: vi.fn(),
  deleteContainer: vi.fn(),
  getContainerDetailInformation: vi.fn(),
  getContainerOperationLogs: vi.fn().mockResolvedValue({ logs: [] }),
  getContainerStatus: vi.fn().mockResolvedValue({}),
  removeCollaborator: vi.fn(),
  resetContainerPassword: vi.fn(),
  restartContainer: vi.fn(),
  setLongTermContainer: vi.fn(),
  startContainer: vi.fn(),
  stopContainer: vi.fn(),
  unpauseContainer: vi.fn(),
  updateRole: vi.fn(),
}));
vi.mock('../api/user_api', () => ({
  listAllUserBrefInformation: vi.fn(),
}));

import {
  addCollaborator,
  getContainerDetailInformation,
  getContainerOperationLogs,
  resetContainerPassword,
  updateRole,
} from '../api/container_api';
import { listAllUserBrefInformation } from '../api/user_api';
import showErrorModal from '../utils/showErrorModal';
import { message } from 'antd';
import ContainerDetailPage from '../pages/ContainerDetailPage';

const accounts = [
  { user_id: 1, username: 'root_user', role: 'ROOT' },
  { user_id: 2, username: 'alice', role: 'COLLABORATOR' },
];

const detail = (overrides = {}) => ({
  container_id: 12,
  container_name: 'train-a',
  effective_status: 'online',
  machine_id: 3,
  machine_ip: '10.0.0.8',
  port: 1024,
  is_long_term: false,
  long_term_container_can_enable: true,
  disk_usage_percent: 20,
  accounts,
  ...overrides,
});

const renderDetail = () => render(
  <MemoryRouter initialEntries={['/index/containers/12']}>
    <Routes>
      <Route path="/index/containers/:containerId" element={<ContainerDetailPage />} />
    </Routes>
  </MemoryRouter>,
);

const clickOption = async (text) => {
  await waitFor(() => {
    expect([...document.querySelectorAll('.ant-select-item-option')].some(el => el.textContent.includes(text))).toBe(true);
  });
  const option = [...document.querySelectorAll('.ant-select-item-option')].find(el => el.textContent.includes(text));
  await userEvent.click(option);
};

const selectRole = async (optionName) => {
  const combos = [...document.querySelectorAll('.container-people-actions [role="combobox"]')].filter(el => !el.disabled);
  const combo = combos[combos.length - 1];
  fireEvent.mouseDown(combo.closest('.ant-select')?.querySelector('.ant-select-selector') || combo);
  await clickOption(optionName);
};

beforeEach(() => {
  vi.clearAllMocks();
  permissionState.entities = ['container:operation', 'container:manage'];
  permissionState.userId = 1;
  permissionState.userName = 'root_user';
  permissionState.containerResourceUnrestricted = false;
  getContainerDetailInformation.mockResolvedValue({ container_info: detail() });
  getContainerOperationLogs.mockResolvedValue({ logs: [] });
  listAllUserBrefInformation.mockResolvedValue({ users: [
    { id: 2, username: 'alice', name: 'Alice' },
    { id: 3, username: 'bob', name: 'Bob' },
  ] });
  addCollaborator.mockResolvedValue({ accepted: true, credentials: [{ login_name: 'bob', password: 'pw-bob' }] });
  resetContainerPassword.mockResolvedValue({ accepted: true, credentials: [{ login_name: 'alice', password: 'pw-reset' }] });
  updateRole.mockResolvedValue({ accepted: true, credentials: [{ login_name: 'root', password: 'pw-root' }] });
  vi.spyOn(globalThis, 'setInterval').mockImplementation(() => 1);
  vi.spyOn(globalThis, 'clearInterval').mockImplementation(() => {});
});

describe('ContainerDetailPage credential flows', () => {
  it('test_detail_add_collaborator_credentials shows password without optimistic account insert', async () => {
    renderDetail();
    expect(await screen.findByText('train-a')).toBeInTheDocument();
    fireEvent.mouseDown(document.querySelector('.container-people-add .ant-select-selector'));
    await clickOption('bob');
    await userEvent.click(screen.getByRole('button', { name: /添加/ }));
    await waitFor(() => expect(addCollaborator).toHaveBeenCalledWith({ user_id: 3, container_id: 12, role: 'COLLABORATOR' }));
    expect(await screen.findByText('重置后bob的密码：')).toBeInTheDocument();
    expect(message.success).toHaveBeenCalledWith('新增协作者请求已受理');
    expect(screen.queryByText(/用户已添加/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /关\s*闭/ }));
    message.success.mockClear();
    addCollaborator.mockRejectedValueOnce(Object.assign(new Error('请求参数不合法：Input should be \'admin\' or \'collaborator\''), {
      status: 422,
      error_reason: 'invalid_payload',
    }));
    fireEvent.mouseDown(document.querySelector('.container-people-add .ant-select-selector'));
    await clickOption('bob');
    await userEvent.click(screen.getByRole('button', { name: /添加/ }));
    await waitFor(() => expect(showErrorModal).toHaveBeenCalled());
    expect(message.success).not.toHaveBeenCalledWith('新增协作者请求已受理');
    expect(message.success).not.toHaveBeenCalledWith('用户已添加');
    expect(screen.queryByText(/重置后bob/)).not.toBeInTheDocument();
  });

  it('test_detail_reset_permission_guards requires method, ROOT/resource and online, and only detail page', async () => {
    renderDetail();
    expect(await screen.findByText('train-a')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '重置密码' })).toHaveLength(2);

    cleanup();
    permissionState.entities = [];
    renderDetail();
    expect(await screen.findByText('train-a')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '重置密码' })).not.toBeInTheDocument();

    cleanup();
    permissionState.entities = ['container:operation'];
    permissionState.userId = 9;
    permissionState.userName = 'ops';
    permissionState.containerResourceUnrestricted = true;
    renderDetail();
    expect(await screen.findByText('train-a')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '重置密码' }).length).toBeGreaterThan(0);

    cleanup();
    permissionState.containerResourceUnrestricted = false;
    permissionState.userId = 2;
    permissionState.userName = 'alice';
    permissionState.entities = ['container:operation'];
    renderDetail();
    expect(await screen.findByText('train-a')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '重置密码' })).not.toBeInTheDocument();
  });

  it('test_detail_reset_request_and_result submits bound user_id, shows one credential, and keeps errors secret-free', async () => {
    renderDetail();
    await screen.findByText('train-a');
    await userEvent.click(screen.getAllByRole('button', { name: '重置密码' })[1]);
    await userEvent.click(await screen.findByRole('button', { name: /确认重置/ }));
    await waitFor(() => expect(resetContainerPassword).toHaveBeenCalledWith({ container_id: 12, user_id: 2 }));
    expect(await screen.findByText('重置后alice的密码：')).toBeInTheDocument();

    resetContainerPassword.mockRejectedValueOnce(Object.assign(new Error('请求失败'), {
      status: 409,
      error_reason: 'container_offline',
      body: { credentials: [{ login_name: 'alice', password: 'secret' }] },
    }));
    await userEvent.click(screen.getAllByRole('button', { name: '重置密码' })[1]);
    await userEvent.click(await screen.findByRole('button', { name: /确认重置/ }));
    await waitFor(() => expect(showErrorModal).toHaveBeenCalled());
    const args = showErrorModal.mock.calls.at(-1)[0];
    expect(JSON.stringify(args)).not.toContain('secret');
    expect(args.message).not.toContain('secret');
  });

  it('test_detail_root_transfer_single_target sends transfer_root false and does not demote an old root', async () => {
    renderDetail();
    await screen.findByText('train-a');
    await selectRole('超级管理员');
    await waitFor(() => expect(updateRole).toHaveBeenCalledTimes(1));
    expect(updateRole).toHaveBeenCalledWith({
      container_id: 12,
      user_id: 2,
      updated_role: 'ROOT',
      transfer_root: false,
    });
    expect(updateRole).not.toHaveBeenCalledWith(expect.objectContaining({ user_id: 1 }));
  });

  it('test_detail_root_transfer_one_credential shows one root and does not optimistically change role', async () => {
    renderDetail();
    await screen.findByText('train-a');
    await selectRole('超级管理员');
    expect(await screen.findByText('重置后root的密码：')).toBeInTheDocument();
    expect(screen.queryByText('重置后alice的密码：')).not.toBeInTheDocument();
    expect(message.success).toHaveBeenCalledWith('ROOT 提升请求已受理');
    expect(message.success).not.toHaveBeenCalledWith('角色已更新');
  });

  it('test_detail_main_flow_password_integration keeps ordinary role change password-free and unknown results unconfirmed', async () => {
    updateRole.mockResolvedValueOnce({ success: 1, message: 'Role updated successfully' });
    renderDetail();
    await screen.findByText('train-a');
    await selectRole('管理员');
    await waitFor(() => expect(updateRole).toHaveBeenCalledWith({ container_id: 12, user_id: 2, updated_role: 'ADMIN' }));
    expect(message.success).toHaveBeenCalledWith('角色已更新');
    expect(screen.queryByText(/重置后/)).not.toBeInTheDocument();

    updateRole.mockRejectedValueOnce(Object.assign(new Error('结果未知'), { status: 409 }));
    await selectRole('管理员');
    await waitFor(() => expect(showErrorModal).toHaveBeenCalled());
    expect(message.success).not.toHaveBeenCalledWith(expect.stringContaining('Node'));
  });
});
