import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const permissionState = vi.hoisted(() => ({
  entities: ['container:operation', 'container:manage'],
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

vi.mock('../utils/heartbeat', () => ({
  startContainerStatusHeartbeat: vi.fn(() => () => {}),
  watchIngContainerUntilTerminal: vi.fn(() => () => {}),
  ING_CONTAINER_STATES: new Set(['building', 'creating', 'starting', 'stopping', 'restarting', 'pausing', 'unpausing', 'status_unknown']),
}));

vi.mock('../api/container_api', () => ({
  listAllContainerBrefInformation: vi.fn(),
  getContainerDetailInformation: vi.fn(),
  deleteContainer: vi.fn(),
  removeCollaborator: vi.fn(),
  startContainer: vi.fn(),
  stopContainer: vi.fn(),
  restartContainer: vi.fn(),
  refreshLastSshLoginTime: vi.fn(),
  setLongTermContainer: vi.fn(),
  unpauseContainer: vi.fn(),
}));

vi.mock('../api/user_api', () => ({
  listAllUserBrefInformation: vi.fn().mockResolvedValue({ users: [] }),
}));

import { message } from 'antd';
import {
  deleteContainer,
  getContainerDetailInformation,
  listAllContainerBrefInformation,
  refreshLastSshLoginTime,
  setLongTermContainer,
  startContainer,
  stopContainer,
  unpauseContainer,
} from '../api/container_api';
import showErrorModal from '../utils/showErrorModal';
import Home from '../pages/Home';

const ROOT_ACCOUNT = { user_id: 1, username: 'root_user', role: 'ROOT' };

const container = (overrides = {}) => ({
  container_id: 1,
  container_name: 'train-a',
  image_name: 'fuxi/image:1',
  effective_status: 'online',
  machine_id: 1,
  machine_ip: '10.0.0.8',
  port: 1024,
  accounts: [ROOT_ACCOUNT],
  is_long_term: false,
  long_term_container_can_enable: true,
  disk_usage_percent: 20,
  ...overrides,
});

const renderHome = () => render(
  <MemoryRouter>
    <Home />
  </MemoryRouter>,
);

const openDetail = async (user) => {
  await user.click(await screen.findByRole('button', { name: /详\s*情/ }));
  return screen.findByRole('dialog');
};

beforeEach(() => {
  vi.clearAllMocks();
  permissionState.entities = ['container:operation', 'container:manage'];
  permissionState.userId = 1;
  permissionState.userName = 'root_user';
  refreshLastSshLoginTime.mockResolvedValue({ last_ssh_login_time: null });
  deleteContainer.mockResolvedValue({ success: 1 });
  stopContainer.mockResolvedValue({ success: 1 });
  unpauseContainer.mockResolvedValue({ success: 1 });
  setLongTermContainer.mockResolvedValue({ success: 1, is_long_term: true });
  getContainerDetailInformation.mockImplementation(async () => ({
    container_info: container(),
  }));
});

describe('Home 共享动作资格与删除/解冻/长期', () => {
  it('ROOT 的 failed 容器可从详情弹窗删除；删除前重解析后发请求', async () => {
    const user = userEvent.setup();
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({ effective_status: 'failed' })],
    });
    getContainerDetailInformation.mockResolvedValue({
      container_info: container({ effective_status: 'failed' }),
    });

    renderHome();
    const dialog = await openDetail(user);
    const deleteButton = within(dialog).getByRole('button', { name: /删除容器/ });
    expect(deleteButton).toBeEnabled();
    await user.click(deleteButton);
    await user.click(await screen.findByRole('button', { name: /删\s*除/ }));

    await waitFor(() => expect(deleteContainer).toHaveBeenCalledWith(1));
    expect(message.success).toHaveBeenCalledWith(expect.stringContaining('已删除'));
  });

  it('starting 删除可见但禁用并显示原因，不打开确认', async () => {
    const user = userEvent.setup();
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({ effective_status: 'starting' })],
    });
    getContainerDetailInformation.mockResolvedValue({
      container_info: container({ effective_status: 'starting' }),
    });

    renderHome();
    const dialog = await openDetail(user);
    const deleteButton = within(dialog).getByRole('button', { name: /删除容器/ });
    expect(deleteButton).toBeDisabled();
    expect(deleteButton).toHaveAttribute('title', '容器正在处理中，暂不可操作');
    expect(deleteContainer).not.toHaveBeenCalled();
  });

  it('COLLABORATOR 不显示可执行删除，也不自动生成 leave 授权；长期入口禁用可见', async () => {
    const user = userEvent.setup();
    permissionState.entities = ['container:operation'];
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({ accounts: [{ user_id: 9, username: 'other', role: 'ROOT' }] })],
    });
    getContainerDetailInformation.mockResolvedValue({
      container_info: container({ accounts: [{ user_id: 9, username: 'other', role: 'ROOT' }] }),
    });

    renderHome();
    const dialog = await openDetail(user);
    expect(within(dialog).queryByRole('button', { name: /删除容器/ })).toBeNull();
    expect(within(dialog).queryByRole('button', { name: /解除关联/ })).toBeNull();
    expect(within(dialog).queryByRole('checkbox')).toBeNull();
    const card = document.querySelector('.home-container-card');
    const checkbox = within(card).getByRole('checkbox');
    expect(checkbox).toBeDisabled();
    expect(checkbox.closest('label')?.querySelector('[title]'))
      .toHaveAttribute('title', '当前账号没有执行该操作的权限');
  });

  it('删除 409/超时失败保留原行并重读，不提前提示成功', async () => {
    const user = userEvent.setup();
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({ effective_status: 'failed' })],
    });
    getContainerDetailInformation.mockResolvedValue({
      container_info: container({ effective_status: 'failed' }),
    });
    deleteContainer.mockRejectedValueOnce({
      status: 409,
      body: { message: 'container busy', error_reason: 'container_busy' },
      route: '/api/containers/delete_container',
    });

    renderHome();
    const dialog = await openDetail(user);
    await user.click(within(dialog).getByRole('button', { name: /删除容器/ }));
    await user.click(await screen.findByRole('button', { name: /删\s*除/ }));

    await waitFor(() => expect(showErrorModal).toHaveBeenCalledWith(expect.objectContaining({
      title: '删除容器失败',
    })));
    expect(message.success).not.toHaveBeenCalledWith(expect.stringContaining('已删除'));
    expect(document.querySelector('.home-container-card')).not.toBeNull();
    expect(listAllContainerBrefInformation.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('长期启用只消费既有字段：配额 false 与磁盘 100% 禁用，缺字段不额外禁用', async () => {
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [
        container({ container_id: 1, effective_status: 'offline', long_term_container_can_enable: false }),
        container({ container_id: 2, container_name: 'train-b', effective_status: 'offline', disk_usage_percent: 100 }),
        container({ container_id: 3, container_name: 'train-c', effective_status: 'offline', disk_usage_percent: null }),
      ],
    });
    renderHome();
    await screen.findByText('train-a');
    const cards = document.querySelectorAll('.home-container-card');
    expect(within(cards[0]).getByRole('checkbox')).toBeDisabled();
    expect(within(cards[0]).getByRole('checkbox').closest('label')?.querySelector('[title]'))
      .toHaveAttribute('title', '绑定用户已达到长期容器上限');
    expect(within(cards[1]).getByRole('checkbox')).toBeDisabled();
    expect(within(cards[1]).getByRole('checkbox').closest('label')?.querySelector('[title]'))
      .toHaveAttribute('title', '磁盘用量已达上限，无法设为长期容器');
    expect(within(cards[2]).getByRole('checkbox')).toBeEnabled();
  });

  it('is_long_term 非法时只禁用长期，卡片启停/详情仍可用', async () => {
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({ effective_status: 'online', is_long_term: 'false' })],
    });
    renderHome();
    await screen.findByText('train-a');
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
    expect(checkbox.closest('label')?.querySelector('[title]')).toHaveAttribute('title', '长期标记未知，无法切换长期状态');
    expect(screen.getByRole('button', { name: /^停\s*止$/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /详\s*情/ })).toBeEnabled();
  });

  it('长期取消：冻结行残留但状态 online 时允许取消；失败重读且不伪造勾选', async () => {
    const user = userEvent.setup();
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({
        effective_status: 'online',
        is_long_term: true,
        freeze_state: { is_frozen: true, days_frozen: 2, grace_until: '2026-10-20T00:00:00Z' },
        long_term_container_can_enable: false,
        disk_usage_percent: 100,
      })],
    });
    setLongTermContainer.mockRejectedValueOnce({ status: 409, body: { message: 'long term busy' } });

    renderHome();
    await screen.findByText('train-a');
    const card = document.querySelector('.home-container-card');
    const checkbox = within(card).getByRole('checkbox');
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeEnabled();
    await user.click(checkbox);

    await waitFor(() => expect(setLongTermContainer).toHaveBeenCalledWith({ container_id: 1, is_long_term: false }));
    await waitFor(() => expect(showErrorModal).toHaveBeenCalled());
    await waitFor(() => expect(listAllContainerBrefInformation.mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(within(card).getByRole('checkbox')).toBeChecked();
  });

  it('解冻受理只说指令已发送并保持 pending；失败不写 paused 假终态且按钮恢复', async () => {
    const user = userEvent.setup();
    permissionState.entities = ['container:manage'];
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({ effective_status: 'paused' })],
    });

    const { unmount } = renderHome();
    await screen.findByText('train-a');
    let card = document.querySelector('.home-container-card');
    await user.click(within(card).getByRole('button', { name: /解冻/ }));
    await waitFor(() => expect(unpauseContainer).toHaveBeenCalledWith(1));
    expect(message.success).toHaveBeenCalledWith('解冻指令已发送');
    expect(screen.queryByText('已解冻')).toBeNull();
    expect(within(card).getByText('解冻中')).toBeInTheDocument();
    unmount();

    unpauseContainer.mockRejectedValueOnce({
      status: 409,
      body: { message: 'unpause failed', error_reason: 'unpause_failed' },
      route: '/api/containers/unpause_container',
    });
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({ effective_status: 'paused' })],
    });
    renderHome();
    await screen.findByText('train-a');
    card = document.querySelector('.home-container-card');
    await user.click(within(card).getByRole('button', { name: /解冻/ }));

    await waitFor(() => expect(showErrorModal).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.objectContaining({ message: 'unpause failed' }),
    })));
    expect(message.success).not.toHaveBeenCalledWith('已解冻');
    expect(within(card).getByText('已冻结')).toBeInTheDocument();
    expect(within(card).queryByText('解冻中')).toBeNull();
    await waitFor(() => expect(within(card).getByRole('button', { name: /解冻/ })).toBeEnabled());
  });

  it('打开确认框后状态变为 failed：确认时重解析，不调用启动 API', async () => {
    const user = userEvent.setup();
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({ effective_status: 'offline' })],
    });

    renderHome();
    await screen.findByText('train-a');
    await user.click(screen.getByRole('button', { name: /^启\s*动$/ }));
    expect(await screen.findByText('确认启动容器')).toBeInTheDocument();

    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({ effective_status: 'failed' })],
    });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const card = document.querySelector('.home-container-card');
    await waitFor(() => expect(within(card).getByText('异常')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /确认\s*启\s*动/ }));

    expect(startContainer).not.toHaveBeenCalled();
    expect(message.warning).toHaveBeenCalled();
  });

  it('打开确认框后权限失效：确认时重解析，不调用停止 API', async () => {
    const user = userEvent.setup();
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({ effective_status: 'online' })],
    });

    const { rerender } = renderHome();
    await screen.findByText('train-a');
    await user.click(screen.getByRole('button', { name: /^停\s*止$/ }));
    expect(await screen.findByText('确认停止容器')).toBeInTheDocument();

    permissionState.entities = [];
    rerender(
      <MemoryRouter>
        <Home />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: /确认\s*停止/ }));

    expect(stopContainer).not.toHaveBeenCalled();
    expect(message.warning).toHaveBeenCalled();
  });
});
