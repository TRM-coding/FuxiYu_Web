import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const permissionState = vi.hoisted(() => ({
  entities: ['container:operation', 'container:manage', 'bypass_auth_entity', 'bypass_resource'],
  userId: 1,
  userName: 'root_user',
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

vi.mock('../utils/showErrorModal', () => ({ default: vi.fn() }));

vi.mock('../api/container_api', () => ({
  addCollaborator: vi.fn(),
  deleteContainer: vi.fn(),
  getContainerDetailInformation: vi.fn(),
  getContainerStatus: vi.fn(),
  listAllContainerBrefInformation: vi.fn(),
  removeCollaborator: vi.fn(),
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

import { message } from 'antd';
import {
  deleteContainer,
  getContainerDetailInformation,
  getContainerStatus,
  setLongTermContainer,
  startContainer,
  unpauseContainer,
} from '../api/container_api';
import { listAllUserBrefInformation } from '../api/user_api';
import showErrorModal from '../utils/showErrorModal';
import ContainerDetailPage from '../pages/ContainerDetailPage';

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
  accounts: [{ user_id: 1, username: 'root_user', role: 'ROOT' }],
  ...overrides,
});

const renderDetail = () => render(
  <MemoryRouter initialEntries={['/index/containers/12']}>
    <Routes>
      <Route path="/index/containers/:containerId" element={<ContainerDetailPage />} />
      <Route path="/index" element={<div>home page</div>} />
    </Routes>
  </MemoryRouter>,
);

let pollingCallback;

beforeEach(() => {
  pollingCallback = null;
  permissionState.entities = ['container:operation', 'container:manage', 'bypass_auth_entity', 'bypass_resource'];
  permissionState.userId = 1;
  permissionState.userName = 'root_user';
  vi.clearAllMocks();
  listAllUserBrefInformation.mockResolvedValue({ users: [] });
  getContainerDetailInformation.mockResolvedValue({ container_info: detail() });
  getContainerStatus.mockResolvedValue({});
  deleteContainer.mockResolvedValue({ success: 1 });
  startContainer.mockResolvedValue({ success: 1 });
  unpauseContainer.mockResolvedValue({ success: 1 });
  setLongTermContainer.mockResolvedValue({ success: 1, is_long_term: true });
  vi.spyOn(globalThis, 'setInterval').mockImplementation((cb, delay) => {
    if (delay === 5000) pollingCallback = cb;
    return 1;
  });
  vi.spyOn(globalThis, 'clearInterval').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

const operationCard = async () => {
  expect(await screen.findByText('train-a')).toBeInTheDocument();
  return screen.getByText('容器操作').closest('.container-operations-card');
};

describe('ContainerDetailPage 共享资格矩阵', () => {
  it.each([
    ['failed', false],
    ['paused', false],
    ['online', false],
    ['offline', false],
    ['building', true],
    ['creating', true],
    ['starting', true],
    ['stopping', true],
    ['restarting', true],
    ['pausing', true],
    ['unpausing', true],
    ['host_offline', true],
    ['host_maintenance', true],
    ['status_unknown', true],
    ['unknown', true],
    ['', true],
  ])('删除状态 %s disabled=%s', async (status, disabled) => {
    getContainerDetailInformation.mockResolvedValue({ container_info: detail({ effective_status: status }) });
    renderDetail();
    const card = await operationCard();
    const button = within(card).getByRole('button', { name: /删\s*除/ });
    if (disabled) expect(button).toBeDisabled();
    else expect(button).toBeEnabled();
  });

  it('COLLABORATOR 无资源角色不显示删除/启停，长期入口保留但禁用', async () => {
    permissionState.entities = ['container:operation'];
    getContainerDetailInformation.mockResolvedValue({
      container_info: detail({
        accounts: [{ user_id: 1, username: 'root_user', role: 'COLLABORATOR' }],
      }),
    });
    renderDetail();
    const card = await operationCard();
    expect(within(card).queryByRole('button', { name: /删\s*除/ })).toBeNull();
    expect(within(card).queryByRole('button', { name: /^停\s*止$/ })).toBeNull();
    expect(within(card).queryByRole('button', { name: /^重\s*启$/ })).toBeNull();
    const checkbox = within(card).getByRole('checkbox');
    expect(checkbox).toBeDisabled();
    expect(checkbox.closest('label')?.querySelector('[title]'))
      .toHaveAttribute('title', '当前账号没有执行该操作的权限');
  });

  it('长期既有字段拒绝只禁用长期，删除仍可用', async () => {
    getContainerDetailInformation.mockResolvedValue({
      container_info: detail({
        long_term_container_can_enable: false,
        disk_usage_percent: 100,
      }),
    });
    renderDetail();
    const card = await operationCard();
    const checkbox = within(card).getByRole('checkbox');
    expect(checkbox).toBeDisabled();
    expect(checkbox.closest('label')?.querySelector('[title]'))
      .toHaveAttribute('title', '绑定用户已达到长期容器上限');
    expect(within(card).getByRole('button', { name: /删\s*除/ })).toBeEnabled();
  });

  it('is_long_term 缺失/非法只禁用长期，不连带删除/启停', async () => {
    getContainerDetailInformation.mockResolvedValue({
      container_info: detail({ is_long_term: 'false' }),
    });
    renderDetail();
    const card = await operationCard();
    const checkbox = within(card).getByRole('checkbox');
    expect(checkbox).toBeDisabled();
    expect(checkbox.closest('label')?.querySelector('[title]'))
      .toHaveAttribute('title', '长期标记未知，无法切换长期状态');
    expect(within(card).getByRole('button', { name: /删\s*除/ })).toBeEnabled();
    expect(within(card).getByRole('button', { name: /^停\s*止$/ })).toBeEnabled();
  });

  it('长期取消：paused 禁用；online 冻结行残留允许；409 重读且不伪造 checked', async () => {
    const user = userEvent.setup();
    getContainerDetailInformation.mockResolvedValue({
      container_info: detail({
        effective_status: 'paused',
        is_long_term: true,
        freeze_state: { is_frozen: true, days_frozen: 2 },
        long_term_container_can_enable: false,
        disk_usage_percent: 100,
      }),
    });
    const { unmount } = renderDetail();
    let card = await operationCard();
    expect(within(card).getByRole('checkbox')).toBeDisabled();
    expect(within(card).getByRole('checkbox').closest('label')?.querySelector('[title]'))
      .toHaveAttribute('title', '容器已冻结');
    unmount();

    getContainerDetailInformation.mockResolvedValue({
      container_info: detail({
        effective_status: 'online',
        is_long_term: true,
        freeze_state: { is_frozen: true, days_frozen: 2 },
        long_term_container_can_enable: false,
        disk_usage_percent: 100,
      }),
    });
    setLongTermContainer.mockRejectedValueOnce({
      status: 409,
      body: { message: 'long term changed', error_reason: 'long_term_state_changed' },
    });
    renderDetail();
    card = await operationCard();
    const checkbox = within(card).getByRole('checkbox');
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeEnabled();
    await user.click(checkbox);

    await waitFor(() => expect(setLongTermContainer).toHaveBeenCalledWith({ container_id: 12, is_long_term: false }));
    await waitFor(() => expect(showErrorModal).toHaveBeenCalled());
    expect(within(card).getByRole('checkbox')).toBeChecked();
  });

  it('解冻受理只提示指令已发送；权威 online 收敛 pending 为运行中', async () => {
    const user = userEvent.setup();
    getContainerDetailInformation.mockResolvedValue({
      container_info: detail({ effective_status: 'paused' }),
    });
    getContainerStatus.mockResolvedValue({ effective_status: 'online' });
    renderDetail();
    const card = await operationCard();
    await user.click(within(card).getByRole('button', { name: /解冻/ }));
    await user.click(await screen.findByRole('button', { name: /确认\s*解冻/ }));

    await waitFor(() => expect(unpauseContainer).toHaveBeenCalledWith(12));
    expect(message.success).toHaveBeenCalledWith('解冻指令已发送');
    expect(screen.queryByText('已解冻')).toBeNull();
    expect(await screen.findByText('解冻中')).toBeInTheDocument();

    await act(async () => {
      await pollingCallback();
    });
    await waitFor(() => expect(screen.getAllByText('运行中').length).toBeGreaterThan(0));
  });

  it('解冻失败重读权威 paused，不伪造已解冻', async () => {
    const user = userEvent.setup();
    getContainerDetailInformation.mockResolvedValue({
      container_info: detail({ effective_status: 'paused' }),
    });
    unpauseContainer.mockRejectedValueOnce({
      status: 409,
      body: { message: 'unpause failed', error_reason: 'unpause_failed' },
      route: '/api/containers/unpause_container',
    });
    renderDetail();
    const card = await operationCard();
    await user.click(within(card).getByRole('button', { name: /解冻/ }));
    await user.click(await screen.findByRole('button', { name: /确认\s*解冻/ }));

    await waitFor(() => expect(showErrorModal).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.objectContaining({ message: 'unpause failed' }),
    })));
    expect(message.success).not.toHaveBeenCalledWith('已解冻');
    expect(screen.queryByText('已解冻')).toBeNull();
    expect(screen.getByText('已冻结')).toBeInTheDocument();
    await waitFor(() => expect(within(card).getByRole('button', { name: /解冻/ })).toBeEnabled());
  });

  it('打开启动确认后状态变为 failed：提交前重解析，不调用 API', async () => {
    const user = userEvent.setup();
    getContainerDetailInformation.mockResolvedValue({
      container_info: detail({ effective_status: 'offline' }),
    });
    getContainerStatus.mockResolvedValue({ effective_status: 'failed' });
    renderDetail();
    const card = await operationCard();
    await user.click(within(card).getByRole('button', { name: /^启\s*动$/ }));
    expect(await screen.findByText('确认启动容器')).toBeInTheDocument();

    await act(async () => {
      await pollingCallback();
    });
    await user.click(screen.getByRole('button', { name: /确认\s*启\s*动/ }));

    expect(startContainer).not.toHaveBeenCalled();
    expect(message.warning).toHaveBeenCalled();
  });

  it('启动受理后权威轮询为 failed 时保持异常，不被受理结果覆盖', async () => {
    const user = userEvent.setup();
    getContainerDetailInformation.mockResolvedValue({
      container_info: detail({ effective_status: 'offline' }),
    });
    getContainerStatus.mockResolvedValue({ effective_status: 'failed', failed_detail: 'start failed' });
    renderDetail();
    const card = await operationCard();
    await user.click(within(card).getByRole('button', { name: /^启\s*动$/ }));
    await user.click(await screen.findByRole('button', { name: /确认\s*启\s*动/ }));

    await waitFor(() => expect(startContainer).toHaveBeenCalledWith(12));
    await act(async () => {
      await pollingCallback();
    });

    await waitFor(() => expect(screen.getByText('异常')).toBeInTheDocument());
    expect(screen.queryByText('启动中')).toBeNull();
  });

  it('删除 409 保留详情与路由，不提前导航', async () => {
    const user = userEvent.setup();
    getContainerDetailInformation.mockResolvedValue({
      container_info: detail({ effective_status: 'failed' }),
    });
    deleteContainer.mockRejectedValueOnce({
      status: 409,
      body: { message: 'container busy', error_reason: 'container_busy' },
      route: '/api/containers/delete_container',
    });
    renderDetail();
    const card = await operationCard();
    await user.click(within(card).getByRole('button', { name: /删\s*除/ }));
    const confirmDialog = (await screen.findAllByRole('dialog'))
      .find(node => within(node).queryByText('确认删除容器'));
    expect(confirmDialog).toBeTruthy();
    await user.click(within(confirmDialog).getByRole('button', { name: /删\s*除/ }));

    await waitFor(() => expect(showErrorModal).toHaveBeenCalled());
    expect(deleteContainer).toHaveBeenCalledWith(12);
    expect(screen.queryByText('home page')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'train-a' })).toBeInTheDocument();
  });
});
