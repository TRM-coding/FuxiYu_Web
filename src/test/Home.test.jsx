import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// antd message 在 jsdom 下噪音大，只保留组件实现、替换 message 为 spy
vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal();
  return { ...antd, message: { success: vi.fn(), warning: vi.fn(), error: vi.fn(), loading: vi.fn() } };
});

vi.mock('../contexts/PermissionContext', () => ({
  usePermission: () => ({
    userId: 2,
    userName: 'collab_user',
    loaded: true,
    hasPermission: () => true,
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

// Home 卡片“详情”跳独立详情页，关联退出入口在详情弹窗里；用测试替身直接触发 onLeave 回调，
// 让被测对象仍聚焦 Home 的退出处理本身（真实子组件另有用例覆盖）。
vi.mock('../components/ContainerDetailModal', () => ({
  default: ({ onLeave }) => React.createElement(
    'button',
    { type: 'button', onClick: () => onLeave && onLeave({ key: '1', container_name: 'train-a' }) },
    '解除关联',
  ),
}));

import { message } from 'antd';
import {
  getContainerDetailInformation,
  listAllContainerBrefInformation,
  refreshLastSshLoginTime,
  removeCollaborator,
  restartContainer,
  startContainer,
  stopContainer,
} from '../api/container_api';
import { startContainerStatusHeartbeat } from '../utils/heartbeat';
import showErrorModal from '../utils/showErrorModal';
import Home from '../pages/Home';

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

const CONTAINER = {
  container_id: 1,
  container_name: 'train-a',
  image_name: 'fuxi/image-1:20260825T090016Z',
  effective_status: 'online',
  machine_id: 1,
  machine_ip: '10.0.0.8',
  port: 1024,
  accounts: [
    { user_id: 1, username: 'root_user', role: 'ROOT' },
    { user_id: 2, username: 'collab_user', role: 'COLLABORATOR' },
  ],
};

const renderHome = () => render(
  <MemoryRouter>
    <Home />
  </MemoryRouter>,
);

describe('Home 容器操作失败/受理语义（Q18）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listAllContainerBrefInformation.mockResolvedValue({ containers_info: [CONTAINER] });
    refreshLastSshLoginTime.mockResolvedValue({ last_ssh_login_time: null });
    getContainerDetailInformation.mockResolvedValue({
      container_info: {
        container_id: 1,
        container_name: 'train-a',
        effective_status: 'online',
        machine_id: 1,
        machine_ip: '10.0.0.8',
        port: 1024,
        accounts: CONTAINER.accounts,
      },
    });
    removeCollaborator.mockResolvedValue({ success: 1 });
    startContainer.mockResolvedValue({ success: 1, message: 'Container start request sent' });
    stopContainer.mockResolvedValue({ success: 1, message: 'Container stop request sent' });
    restartContainer.mockResolvedValue({ success: 1, message: 'Container restart request sent' });
  });

  it('停止请求未决时不改本地状态、不提示成功、不启动轮询', async () => {
    const user = userEvent.setup();
    const gate = deferred();
    stopContainer.mockReturnValue(gate.promise);

    renderHome();
    expect(await screen.findByText('train-a')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^停\s*止$/ }));
    await user.click(await screen.findByRole('button', { name: '确认停止' }));

    // API 未 resolve：保持原状态，没有中间态、没有成功提示、没有终态轮询
    const card = document.querySelector('.home-container-card');
    expect(within(card).getByText('运行中')).toBeInTheDocument();
    expect(within(card).queryByText('停止中')).toBeNull();
    expect(message.success).not.toHaveBeenCalledWith(expect.stringContaining('停止请求已发送'));
    expect(startContainerStatusHeartbeat).not.toHaveBeenCalled();
  });

  it('停止受理后才进入 stopping 并启动心跳，提示请求已发送', async () => {
    const user = userEvent.setup();
    const gate = deferred();
    stopContainer.mockReturnValue(gate.promise);

    renderHome();
    expect(await screen.findByText('train-a')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^停\s*止$/ }));
    await user.click(await screen.findByRole('button', { name: '确认停止' }));

    const card = document.querySelector('.home-container-card');
    expect(within(card).getByText('运行中')).toBeInTheDocument();
    expect(startContainerStatusHeartbeat).not.toHaveBeenCalled();

    gate.resolve({ success: 1, message: 'Container stop request sent' });

    // 受理后才置中间态并开始轮询；受理不等于终态，仍停在 stopping
    expect(await screen.findByText('停止中')).toBeInTheDocument();
    await waitFor(() => expect(startContainerStatusHeartbeat).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(message.success).toHaveBeenCalledWith(expect.stringContaining('停止请求已发送')));
    expect(within(card).getByText('停止中')).toBeInTheDocument();
  });

  it('停止失败：保持原状态并呈现具体错误，不提示成功、不启动轮询', async () => {
    const user = userEvent.setup();
    const gate = deferred();
    stopContainer.mockReturnValue(gate.promise);

    renderHome();
    expect(await screen.findByText('train-a')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^停\s*止$/ }));
    await user.click(await screen.findByRole('button', { name: '确认停止' }));

    const card = document.querySelector('.home-container-card');
    expect(within(card).getByText('运行中')).toBeInTheDocument();

    gate.reject({
      status: 500,
      body: { success: 0, message: 'node boom', error_reason: 'stop_failed' },
      route: '/api/containers/stop_container',
    });

    await waitFor(() => expect(showErrorModal).toHaveBeenCalledWith(expect.objectContaining({
      title: '停止容器失败',
      message: expect.objectContaining({ message: 'node boom' }),
    })));
    expect(message.success).not.toHaveBeenCalledWith(expect.stringContaining('停止请求已发送'));
    expect(within(card).getByText('运行中')).toBeInTheDocument();
    expect(within(card).queryByText('停止中')).toBeNull();
    expect(startContainerStatusHeartbeat).not.toHaveBeenCalled();
  });

  it('启动受理后才进入 starting 并启动心跳', async () => {
    const user = userEvent.setup();
    const gate = deferred();
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [{ ...CONTAINER, effective_status: 'offline' }],
    });
    startContainer.mockReturnValue(gate.promise);

    renderHome();
    expect(await screen.findByText('train-a')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^启\s*动$/ }));
    await user.click(await screen.findByRole('button', { name: '确认启动' }));

    const card = document.querySelector('.home-container-card');
    expect(within(card).getByText('已停止')).toBeInTheDocument();
    expect(startContainerStatusHeartbeat).not.toHaveBeenCalled();

    gate.resolve({ success: 1, message: 'Container start request sent' });

    expect(await screen.findByText('启动中')).toBeInTheDocument();
    await waitFor(() => expect(startContainerStatusHeartbeat).toHaveBeenCalledTimes(1));
  });

  it('重启失败：保持原状态并呈现具体错误，不提示成功', async () => {
    const user = userEvent.setup();
    const gate = deferred();
    restartContainer.mockReturnValue(gate.promise);

    renderHome();
    expect(await screen.findByText('train-a')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^重\s*启$/ }));
    await user.click(await screen.findByRole('button', { name: '确认重启' }));

    const card = document.querySelector('.home-container-card');
    expect(within(card).getByText('运行中')).toBeInTheDocument();

    gate.reject({
      status: 409,
      body: { success: 0, message: 'container busy', error_reason: 'container_busy' },
      route: '/api/containers/restart_container',
    });

    await waitFor(() => expect(showErrorModal).toHaveBeenCalledWith(expect.objectContaining({ title: '重启容器失败' })));
    expect(message.success).not.toHaveBeenCalledWith(expect.stringContaining('重启请求已发送'));
    expect(within(card).getByText('运行中')).toBeInTheDocument();
    expect(within(card).queryByText('重启中')).toBeNull();
    expect(startContainerStatusHeartbeat).not.toHaveBeenCalled();
  });

  it('退出关联失败：保留本地行并展示具体错误，不提示成功', async () => {
    const user = userEvent.setup();
    removeCollaborator.mockRejectedValueOnce({
      status: 400,
      body: { success: 0, message: 'container offline', error_reason: 'container_offline' },
      route: '/api/containers/remove_collaborator',
    });

    renderHome();
    expect(await screen.findByText('train-a')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '解除关联' }));
    await user.click(await screen.findByRole('button', { name: '确认退出' }));

    await waitFor(() => expect(showErrorModal).toHaveBeenCalledWith(expect.objectContaining({
      title: '退出容器失败',
      message: expect.objectContaining({ error_reason: 'container_offline' }),
    })));
    expect(message.success).not.toHaveBeenCalledWith(expect.stringContaining('已解除与容器'));
    // 行仍在：卡片列表未被清空
    expect(screen.queryByText('暂无容器')).toBeNull();
  });

  it('退出关联确认成功后才移除本地行并提示成功', async () => {
    const user = userEvent.setup();

    renderHome();
    expect(await screen.findByText('train-a')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '解除关联' }));
    await user.click(await screen.findByRole('button', { name: '确认退出' }));

    await waitFor(() => expect(removeCollaborator).toHaveBeenCalledWith({ user_id: 2, container_id: 1 }));
    await waitFor(() => expect(message.success).toHaveBeenCalledWith(expect.stringContaining('已解除与容器')));
    await waitFor(() => expect(screen.getByText('暂无容器')).toBeInTheDocument());
  });
});
