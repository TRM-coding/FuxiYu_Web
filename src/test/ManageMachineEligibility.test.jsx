import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

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
      info: vi.fn(),
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
vi.mock('../utils/authHelpers', () => ({ handleAuthError: vi.fn() }));
vi.mock('../utils/heartbeat', () => ({
  startContainerStatusHeartbeat: vi.fn(() => () => {}),
  watchIngContainerUntilTerminal: vi.fn(() => () => {}),
  ING_CONTAINER_STATES: new Set(['building', 'creating', 'starting', 'stopping', 'restarting', 'pausing', 'unpausing', 'status_unknown']),
}));

vi.mock('../api/machine_api', () => ({
  listAllMachineBrefInformation: vi.fn(),
  getDetailInformation: vi.fn(),
  registerMachine: vi.fn(),
  removeMachine: vi.fn(),
  addMachinePermission: vi.fn(),
  removeMachinePermission: vi.fn(),
  listMachinePermissions: vi.fn(),
}));

vi.mock('../api/container_api', () => ({
  listAllContainerBrefInformation: vi.fn(),
  getContainerDetailInformation: vi.fn(),
  addCollaborator: vi.fn(),
  removeCollaborator: vi.fn(),
  updateRole: vi.fn(),
  createContainer: vi.fn(),
  deleteContainer: vi.fn(),
  startContainer: vi.fn(),
  stopContainer: vi.fn(),
  restartContainer: vi.fn(),
  setLongTermContainer: vi.fn(),
  refreshLastSshLoginTime: vi.fn(),
  unpauseContainer: vi.fn(),
}));

vi.mock('../api/user_api', () => ({
  listAllUserBrefInformation: vi.fn().mockResolvedValue({ users: [] }),
  getUserDetailInformation: vi.fn(),
}));

import { message } from 'antd';
import {
  deleteContainer,
  listAllContainerBrefInformation,
  setLongTermContainer,
  stopContainer,
  unpauseContainer,
} from '../api/container_api';
import { getDetailInformation, listAllMachineBrefInformation } from '../api/machine_api';
import showErrorModal from '../utils/showErrorModal';
import ManageMachine from '../pages/ManageMachine';

const ROOT_ACCOUNT = { user_id: 1, username: 'root_user', role: 'ROOT' };

const container = (overrides = {}) => ({
  container_id: 12,
  container_name: 'train-a',
  image_name: 'fuxi/image:1',
  effective_status: 'online',
  machine_id: 3,
  machine_ip: '10.0.0.8',
  port: 1024,
  accounts: [ROOT_ACCOUNT],
  is_long_term: false,
  long_term_container_can_enable: true,
  disk_usage_percent: 20,
  ...overrides,
});

const renderPage = () => render(
  <MemoryRouter>
    <ManageMachine />
  </MemoryRouter>,
);

beforeEach(() => {
  vi.clearAllMocks();
  permissionState.entities = ['container:operation', 'container:manage', 'bypass_auth_entity', 'bypass_resource'];
  permissionState.userId = 1;
  permissionState.userName = 'root_user';
  listAllMachineBrefInformation.mockResolvedValue({
    machines: [{
      machine_id: 3,
      machine_name: 'gpu-a',
      machine_ip: '10.0.0.8',
      machine_type: 'GPU',
      machine_status: 'online',
      runtime_snapshot: null,
    }],
  });
  getDetailInformation.mockResolvedValue({ machine_id: 3, machine_status: 'online' });
  listAllContainerBrefInformation.mockResolvedValue({
    containers_info: [container()],
    total_number: 1,
    total_page: 1,
  });
  deleteContainer.mockResolvedValue({ success: 1 });
  stopContainer.mockResolvedValue({ success: 1 });
  unpauseContainer.mockResolvedValue({ success: 1 });
  setLongTermContainer.mockResolvedValue({ success: 1, is_long_term: true });
});

const waitForCard = async () => {
  expect(await screen.findByText('train-a')).toBeInTheDocument();
  return screen.getByText('train-a').closest('.mm-container-card');
};

describe('ManageMachine 共享动作与提交前重解析', () => {
  it('online 卡片 stop/restart 可用、start 禁用；无新增详情/删除按钮', async () => {
    renderPage();
    const card = await waitForCard();
    await waitFor(() => expect(within(card).getByRole('button', { name: /^停\s*止$/ })).toBeEnabled());
    expect(within(card).getByRole('button', { name: /^重\s*启$/ })).toBeEnabled();
    expect(within(card).getByRole('button', { name: /^启\s*动$/ })).toBeDisabled();
    expect(within(card).queryByRole('button', { name: /详\s*情/ })).toBeNull();
    expect(within(card).queryByRole('button', { name: /删\s*除/ })).toBeNull();
  });

  it('COLLABORATOR 且无资源通配时启停不可见，长期入口禁用可见', async () => {
    permissionState.entities = ['container:operation'];
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({
        accounts: [{ user_id: 1, username: 'root_user', role: 'COLLABORATOR' }],
      })],
      total_number: 1,
      total_page: 1,
    });

    renderPage();
    const card = await waitForCard();
    expect(within(card).queryByRole('button', { name: /^启\s*动$/ })).toBeNull();
    expect(within(card).queryByRole('button', { name: /^停\s*止$/ })).toBeNull();
    expect(within(card).queryByRole('button', { name: /^重\s*启$/ })).toBeNull();
    const checkbox = within(card).getByRole('checkbox');
    expect(checkbox).toBeDisabled();
    expect(checkbox.closest('label')?.querySelector('[title]'))
      .toHaveAttribute('title', '当前账号没有执行该操作的权限');
  });

  it('failed 容器 start/restart 禁用且长期拒绝；删除入口不额外出现', async () => {
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({ effective_status: 'failed' })],
      total_number: 1,
      total_page: 1,
    });
    renderPage();
    const card = await waitForCard();
    expect(within(card).getByRole('button', { name: /^启\s*动$/ })).toBeDisabled();
    expect(within(card).getByRole('button', { name: /^重\s*启$/ })).toBeDisabled();
    const checkbox = within(card).getByRole('checkbox');
    expect(checkbox).toBeDisabled();
    expect(checkbox.closest('label')?.querySelector('[title]')).toHaveAttribute('title', '容器异常');
    expect(within(card).queryByRole('button', { name: /删\s*除/ })).toBeNull();
  });

  it('长期启用配额 false / 磁盘 100% 禁用；冻结行残留的已长期容器允许取消', async () => {
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [
        container({ container_id: 12, long_term_container_can_enable: false }),
        container({ container_id: 13, container_name: 'train-b', disk_usage_percent: 100 }),
        container({
          container_id: 14,
          container_name: 'train-c',
          is_long_term: true,
          freeze_state: { is_frozen: true, days_frozen: 2 },
          long_term_container_can_enable: false,
          disk_usage_percent: 100,
        }),
      ],
      total_number: 3,
      total_page: 1,
    });
    renderPage();
    await screen.findByText('train-a');
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeDisabled();
    expect(checkboxes[0].closest('label')?.querySelector('[title]'))
      .toHaveAttribute('title', '绑定用户已达到长期容器上限');
    expect(checkboxes[1]).toBeDisabled();
    expect(checkboxes[1].closest('label')?.querySelector('[title]'))
      .toHaveAttribute('title', '磁盘用量已达上限，无法设为长期容器');
    expect(checkboxes[2]).toBeChecked();
    expect(checkboxes[2]).toBeEnabled();
  });

  it('is_long_term 非法只禁用长期，不连带启停', async () => {
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({ effective_status: 'offline', is_long_term: 'false' })],
      total_number: 1,
      total_page: 1,
    });
    renderPage();
    const card = await waitForCard();
    const checkbox = within(card).getByRole('checkbox');
    expect(checkbox).toBeDisabled();
    expect(checkbox.closest('label')?.querySelector('[title]')).toHaveAttribute('title', '长期标记未知，无法切换长期状态');
    expect(within(card).getByRole('button', { name: /^启\s*动$/ })).toBeEnabled();
  });

  it('长期失败重读权威列表，不提前更新勾选', async () => {
    const user = userEvent.setup();
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({ effective_status: 'offline' })],
      total_number: 1,
      total_page: 1,
    });
    setLongTermContainer.mockRejectedValueOnce({ status: 409, body: { message: 'long term busy' } });

    renderPage();
    const card = await waitForCard();
    await user.click(within(card).getByRole('checkbox'));
    await waitFor(() => expect(setLongTermContainer).toHaveBeenCalledWith({ container_id: 12, is_long_term: true }));
    await waitFor(() => expect(showErrorModal).toHaveBeenCalled());
    await waitFor(() => expect(listAllContainerBrefInformation.mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(within(card).getByRole('checkbox')).not.toBeChecked();
  });

  it('解冻受理固定文案；失败清 pending/loading 并重读，无“已解冻”', async () => {
    const user = userEvent.setup();
    permissionState.entities = ['container:manage'];
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({ effective_status: 'paused' })],
      total_number: 1,
      total_page: 1,
    });

    const { unmount } = renderPage();
    let card = await waitForCard();
    await user.click(within(card).getByRole('button', { name: /解冻/ }));
    await user.click(await screen.findByRole('button', { name: /确认解冻/ }));
    await waitFor(() => expect(unpauseContainer).toHaveBeenCalledWith(12));
    expect(message.success).toHaveBeenCalledWith('解冻指令已发送');
    expect(screen.queryByText('已解冻')).toBeNull();
    unmount();

    unpauseContainer.mockRejectedValueOnce({
      status: 409,
      body: { message: 'unpause failed', error_reason: 'unpause_failed' },
      route: '/api/containers/unpause_container',
    });
    renderPage();
    card = await waitForCard();
    await user.click(within(card).getByRole('button', { name: /解冻/ }));
    await user.click(await screen.findByRole('button', { name: /确认解冻/ }));
    await waitFor(() => expect(showErrorModal).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.objectContaining({ message: 'unpause failed' }),
    })));
    expect(within(card).getByText('磁盘已冻结')).toBeInTheDocument();
    expect(within(card).queryByText('解冻中')).toBeNull();
    await waitFor(() => expect(within(card).getByRole('button', { name: /解冻/ })).toBeEnabled());
    await waitFor(() => expect(listAllContainerBrefInformation.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('打开确认框后状态变为 failed：确认时重解析，不调用停止 API', async () => {
    const user = userEvent.setup();
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({ effective_status: 'online' })],
      total_number: 1,
      total_page: 1,
    });
    renderPage();
    const card = await waitForCard();
    await user.click(within(card).getByRole('button', { name: /^停\s*止$/ }));
    expect(await screen.findByText('确认停止容器')).toBeInTheDocument();

    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({ effective_status: 'failed' })],
      total_number: 1,
      total_page: 1,
    });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(within(card).getByText('异常')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /确认\s*停\s*止/ }));

    expect(stopContainer).not.toHaveBeenCalled();
    expect(message.warning).toHaveBeenCalled();
  });

  it('打开确认框后权限失效：确认时重解析，不调用停止 API', async () => {
    const user = userEvent.setup();
    const { rerender } = renderPage();
    const card = await waitForCard();
    await user.click(within(card).getByRole('button', { name: /^停\s*止$/ }));
    expect(await screen.findByText('确认停止容器')).toBeInTheDocument();

    permissionState.entities = [];
    rerender(
      <MemoryRouter>
        <ManageMachine />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: /确认\s*停止/ }));

    expect(stopContainer).not.toHaveBeenCalled();
    expect(message.warning).toHaveBeenCalled();
  });
});
