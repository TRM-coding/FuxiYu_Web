import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { resolveContainerActions } from '../utils/containerActions';

const permissionState = vi.hoisted(() => ({
  entities: ['bypass_auth_entity', 'container:operation', 'container:manage'],
  userId: 1,
  userName: 'root_user',
}));

const ingWatcherSeam = vi.hoisted(() => ({ onProgress: null, onTerminal: null }));

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
    hasAnyManage: () => false,
  }),
}));

vi.mock('../utils/showErrorModal', () => ({ default: vi.fn() }));
vi.mock('../utils/authHelpers', () => ({ handleAuthError: vi.fn() }));
vi.mock('../utils/heartbeat', () => ({
  startContainerStatusHeartbeat: vi.fn(() => () => {}),
  watchIngContainerUntilTerminal: vi.fn(({ onProgress, onTerminal }) => {
    ingWatcherSeam.onProgress = onProgress;
    ingWatcherSeam.onTerminal = onTerminal;
    return () => {};
  }),
  ING_CONTAINER_STATES: new Set(['building', 'creating', 'starting', 'stopping', 'restarting', 'pausing', 'unpausing', 'status_unknown']),
}));

vi.mock('../api/user_api', () => ({
  listAllUserBrefInformation: vi.fn(),
  deleteUser: vi.fn(),
  updateUser: vi.fn(),
  resetPassword: vi.fn(),
}));

vi.mock('../api/rbac_api', () => ({
  getRbacMatrix: vi.fn(),
  getUserRbacGroups: vi.fn(),
  setUserRbacGroups: vi.fn(),
}));

vi.mock('../api/container_api', () => ({
  listAllContainerBrefInformation: vi.fn(),
  getContainerDetailInformation: vi.fn(),
  removeCollaborator: vi.fn(),
  setLongTermContainer: vi.fn(),
  startContainer: vi.fn(),
  stopContainer: vi.fn(),
  restartContainer: vi.fn(),
  unpauseContainer: vi.fn(),
}));

import { message } from 'antd';
import { listAllUserBrefInformation } from '../api/user_api';
import {
  listAllContainerBrefInformation,
  setLongTermContainer,
  startContainer,
  stopContainer,
  unpauseContainer,
} from '../api/container_api';
import showErrorModal from '../utils/showErrorModal';
import ManageUser from '../pages/ManageUser';

const OPERATOR_ROOT = { user_id: 1, username: 'root_user', role: 'ROOT' };

const container = (overrides = {}) => ({
  container_id: 12,
  container_name: 'train-a',
  image_name: 'fuxi/image:1',
  effective_status: 'online',
  machine_id: 3,
  machine_ip: '10.0.0.8',
  port: 1024,
  accounts: [OPERATOR_ROOT],
  is_long_term: false,
  long_term_container_can_enable: true,
  disk_usage_percent: 20,
  ...overrides,
});

const USER = {
  user_id: 7,
  username: 'alice',
  email: 'alice@example.com',
  amount_of_container: 1,
  amount_of_functional_container: 1,
  amount_of_managed_container: 0,
  amount_of_long_term_container: 0,
};

const USER_B = {
  ...USER,
  user_id: 8,
  username: 'bob',
  email: 'bob@example.com',
};

const renderPage = () => render(
  <MemoryRouter>
    <ManageUser />
  </MemoryRouter>,
);

beforeEach(() => {
  vi.clearAllMocks();
  ingWatcherSeam.onProgress = null;
  ingWatcherSeam.onTerminal = null;
  permissionState.entities = ['bypass_auth_entity', 'container:operation', 'container:manage'];
  permissionState.userId = 1;
  permissionState.userName = 'root_user';
  listAllUserBrefInformation.mockResolvedValue({ users: [USER] });
  listAllContainerBrefInformation.mockResolvedValue({
    containers_info: [container()],
    total_number: 1,
    total_page: 1,
  });
  setLongTermContainer.mockResolvedValue({ success: 1, is_long_term: true });
  startContainer.mockResolvedValue({ success: 1 });
  stopContainer.mockResolvedValue({ success: 1 });
  unpauseContainer.mockResolvedValue({ success: 1 });
});

const waitForCard = async () => {
  expect(await screen.findByText('train-a')).toBeInTheDocument();
  return screen.getByText('train-a').closest('.fuxi-nested-child-card');
};

describe('ManageUser 共享动作资格且不新增删除入口', () => {
  it('卡片使用共享结果；无容器删除/详情新增按钮', async () => {
    renderPage();
    const card = await waitForCard();
    await waitFor(() => expect(within(card).getByRole('button', { name: /^停\s*止$/ })).toBeEnabled());
    expect(within(card).getByRole('button', { name: /^启\s*动$/ })).toBeDisabled();
    expect(within(card).queryByRole('button', { name: /删\s*除容器/ })).toBeNull();
    expect(within(card).queryByRole('button', { name: /详\s*情/ })).toBeNull();
    expect(within(card).getByRole('checkbox')).not.toBeDisabled();
  });

  it('COLLABORATOR 无资源通配时启停隐藏，长期入口保留但禁用', async () => {
    permissionState.entities = ['bypass_auth_entity', 'container:operation'];
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({
        accounts: [{ user_id: 1, username: 'root_user', role: 'COLLABORATOR' }],
      })],
      total_number: 1,
      total_page: 1,
    });

    renderPage();
    const card = await waitForCard();
    expect(within(card).queryByRole('button', { name: /^停\s*止$/ })).toBeNull();
    expect(within(card).queryByRole('button', { name: /^启\s*动$/ })).toBeNull();
    const checkbox = within(card).getByRole('checkbox');
    expect(checkbox).toBeDisabled();
    expect(checkbox.closest('label')?.querySelector('[title]'))
      .toHaveAttribute('title', '当前账号没有执行该操作的权限');
  });

  it('长期只消费既有字段：配额 false/磁盘 100% 禁用；非法 is_long_term 只禁用长期', async () => {
    const user = userEvent.setup();
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [
        container({ container_id: 12, effective_status: 'offline', long_term_container_can_enable: false }),
        container({ container_id: 13, container_name: 'train-b', effective_status: 'offline', disk_usage_percent: 100 }),
        container({ container_id: 14, container_name: 'train-c', effective_status: 'offline', is_long_term: 'false' }),
      ],
      total_number: 3,
      total_page: 1,
    });
    renderPage();
    await screen.findByText('train-a');
    const cards = Array.from(document.querySelectorAll('.fuxi-nested-child-card'));
    const first = cards.find(card => card.textContent.includes('train-a'));
    const second = cards.find(card => card.textContent.includes('train-b'));
    const third = cards.find(card => card.textContent.includes('train-c'));
    expect(within(first).getByRole('checkbox')).toBeDisabled();
    expect(within(first).getByRole('checkbox').closest('label')?.querySelector('[title]'))
      .toHaveAttribute('title', '绑定用户已达到长期容器上限');
    expect(within(second).getByRole('checkbox')).toBeDisabled();
    expect(within(second).getByRole('checkbox').closest('label')?.querySelector('[title]'))
      .toHaveAttribute('title', '磁盘用量已达上限，无法设为长期容器');
    const thirdCheckbox = within(third).getByRole('checkbox');
    expect(thirdCheckbox).toBeDisabled();
    expect(thirdCheckbox.closest('label')?.querySelector('[title]'))
      .toHaveAttribute('title', '长期标记未知，无法切换长期状态');
    expect(within(third).getByRole('button', { name: /^启\s*动$/ })).toBeEnabled();
    await user.click(within(third).getByRole('button', { name: /^启\s*动$/ }));
    expect(await screen.findByText('确认启动容器')).toBeInTheDocument();
  });

  it('长期取消：冻结行残留但 online 允许；409 不提示成功并重读', async () => {
    const user = userEvent.setup();
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({
        is_long_term: true,
        freeze_state: { is_frozen: true, days_frozen: 2 },
        long_term_container_can_enable: false,
        disk_usage_percent: 100,
      })],
      total_number: 1,
      total_page: 1,
    });
    setLongTermContainer.mockRejectedValueOnce({
      status: 409,
      body: { message: 'long term changed', error_reason: 'long_term_state_changed' },
      route: '/api/containers/set_long_term_container',
    });

    renderPage();
    const card = await waitForCard();
    const checkbox = within(card).getByRole('checkbox');
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeEnabled();
    await user.click(checkbox);

    await waitFor(() => expect(setLongTermContainer).toHaveBeenCalledWith({ container_id: 12, is_long_term: false }));
    await waitFor(() => expect(showErrorModal).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.objectContaining({ message: 'long term changed' }),
    })));
    expect(message.success).not.toHaveBeenCalledWith('已取消长期容器');
    expect(within(card).getByRole('checkbox')).toBeChecked();
    expect(listAllContainerBrefInformation.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('test_q35_manage_user_unpause_failure_recovery', async () => {
    const user = userEvent.setup();
    permissionState.entities = ['bypass_auth_entity', 'container:manage'];
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({ effective_status: 'paused' })],
      total_number: 1,
      total_page: 1,
    });
    unpauseContainer.mockRejectedValueOnce({
      status: 409,
      body: { message: 'unpause failed', error_reason: 'unpause_failed' },
      route: '/api/containers/unpause_container',
    });

    renderPage();
    const card = await waitForCard();
    await user.click(within(card).getByRole('button', { name: /解冻/ }));
    await user.click(await screen.findByRole('button', { name: /确认解冻/ }));

    await waitFor(() => expect(showErrorModal).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.objectContaining({ message: 'unpause failed' }),
    })));
    expect(message.success).not.toHaveBeenCalledWith('已解冻');
    expect(screen.queryByText('已解冻')).toBeNull();
    expect(within(card).getByText('磁盘已冻结')).toBeInTheDocument();
    expect(within(card).queryByText('解冻中')).toBeNull();
    await waitFor(() => expect(within(card).getByRole('button', { name: /解冻/ })).toBeEnabled());
    await waitFor(() => expect(listAllContainerBrefInformation.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('打开启动确认后状态变为 failed：确认时重解析，不调用 API', async () => {
    const user = userEvent.setup();
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({ effective_status: 'offline' })],
      total_number: 1,
      total_page: 1,
    });
    renderPage();
    const card = await waitForCard();
    await user.click(within(card).getByRole('button', { name: /^启\s*动$/ }));
    expect(await screen.findByText('确认启动容器')).toBeInTheDocument();

    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({ effective_status: 'failed' })],
      total_number: 1,
      total_page: 1,
    });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(within(card).getByText('异常')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /确认\s*启\s*动/ }));

    expect(startContainer).not.toHaveBeenCalled();
    expect(message.warning).toHaveBeenCalled();
  });

  it('打开启动确认后权限失效：确认时重解析，不调用 API', async () => {
    const user = userEvent.setup();
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({ effective_status: 'offline' })],
      total_number: 1,
      total_page: 1,
    });
    const { rerender } = renderPage();
    const card = await waitForCard();
    await user.click(within(card).getByRole('button', { name: /^启\s*动$/ }));
    expect(await screen.findByText('确认启动容器')).toBeInTheDocument();

    permissionState.entities = [];
    rerender(
      <MemoryRouter>
        <ManageUser />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: /确认\s*启\s*动/ }));

    expect(startContainer).not.toHaveBeenCalled();
    expect(message.warning).toHaveBeenCalled();
  });

  it('ing 看护更新状态时同步提交前快照，确认时按最新状态解析', async () => {
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
      containers_info: [container({ effective_status: 'restarting' })],
      total_number: 1,
      total_page: 1,
    });
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(within(card).getByText('重启中')).toBeInTheDocument());
    await waitFor(() => expect(ingWatcherSeam.onProgress).toBeTypeOf('function'));

    await act(async () => {
      ingWatcherSeam.onProgress({ effective_status: 'online' });
    });
    await waitFor(() => expect(within(card).getByText('运行中')).toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: /确认\s*停\s*止/ }));

    await waitFor(() => expect(stopContainer).toHaveBeenCalledWith(12));
  });

  const sharedContainer = (overrides = {}) => container({
    effective_status: 'restarting',
    accounts: [
      OPERATOR_ROOT,
      { user_id: 7, username: 'alice', role: 'COLLABORATOR' },
      { user_id: 8, username: 'bob', role: 'COLLABORATOR' },
    ],
    ...overrides,
  });

  const setupTwoUsersSharingContainer = () => {
    listAllUserBrefInformation.mockResolvedValue({ users: [USER, USER_B] });
    listAllContainerBrefInformation.mockImplementation(async ({ user_id }) => {
      const uid = Number(user_id);
      if (uid === 7 || uid === 8) {
        return {
          containers_info: [sharedContainer()],
          total_number: 1,
          total_page: 1,
        };
      }
      return { containers_info: [], total_number: 0, total_page: 1 };
    });
  };

  const sharedCards = () => screen.getAllByText('train-a')
    .map(node => node.closest('.fuxi-nested-child-card'))
    .filter(Boolean);

  it('两个用户展开同一容器 progress 时两张卡片同步更新', async () => {
    setupTwoUsersSharingContainer();
    renderPage();
    await waitFor(() => expect(sharedCards()).toHaveLength(2));
    for (const card of sharedCards()) {
      expect(within(card).getByText('重启中')).toBeInTheDocument();
    }
    await waitFor(() => expect(ingWatcherSeam.onProgress).toBeTypeOf('function'));

    await act(async () => {
      ingWatcherSeam.onProgress({ effective_status: 'online' });
    });

    await waitFor(() => {
      for (const card of sharedCards()) {
        expect(within(card).getByText('运行中')).toBeInTheDocument();
      }
    });
  });

  it('两个用户展开同一容器 terminal 时两张卡片同步更新', async () => {
    setupTwoUsersSharingContainer();
    renderPage();
    await waitFor(() => expect(sharedCards()).toHaveLength(2));
    await waitFor(() => expect(ingWatcherSeam.onTerminal).toBeTypeOf('function'));

    await act(async () => {
      ingWatcherSeam.onTerminal({ effective_status: 'offline' });
    });

    await waitFor(() => {
      for (const card of sharedCards()) {
        expect(within(card).getByText('已停止')).toBeInTheDocument();
      }
    });
  });

  const resolveFor = (containerOverrides = {}, contextOverrides = {}) => resolveContainerActions({
    container: {
      effective_status: 'online',
      is_long_term: false,
      long_term_container_can_enable: true,
      disk_usage_percent: 20,
      ...containerOverrides,
    },
    context: {
      permissions: ['container:operation'],
      containerRole: 'ROOT',
      readOnly: false,
      ...contextOverrides,
    },
  });

  it('test_q35_manage_user_shared_action_consistency', () => {
    const result = resolveFor();
    expect(result.actions.stop).toMatchObject({ visible: true, enabled: true });
    expect(result.actions.start).toMatchObject({ visible: true, enabled: false });
    expect(result.actions.delete).toMatchObject({ visible: true, enabled: true });
    expect(result.longTerm).toMatchObject({ visible: true, enabled: true, direction: 'enable' });

    for (const file of [
      'src/pages/ManageUser.jsx',
      'src/pages/ManageMachine.jsx',
      'src/pages/ContainerDetailPage.jsx',
      'src/pages/Home.jsx',
    ]) {
      const source = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
      expect(source, file).toContain('resolveContainerActions');
    }
  });

  it('test_q35_manage_user_role_matrix', () => {
    const root = resolveFor();
    const admin = resolveFor({}, { containerRole: 'ADMIN' });
    const collaborator = resolveFor({}, { containerRole: 'COLLABORATOR' });
    const missing = resolveFor({}, { containerRole: null });

    expect(root.actions.stop.enabled).toBe(true);
    expect(admin.actions.stop.enabled).toBe(true);
    expect(admin.longTerm.enabled).toBe(false);
    expect(collaborator.actions.stop.visible).toBe(false);
    expect(collaborator.longTerm).toMatchObject({ visible: true, enabled: false });
    expect(missing.actions.stop.visible).toBe(false);
    expect(missing.longTerm).toMatchObject({ visible: true, enabled: false });
    expect(missing.actions.delete.visible).toBe(false);
  });

  it('test_q35_manage_user_long_term_fields', () => {
    const quotaFull = resolveFor({ effective_status: 'offline', long_term_container_can_enable: false });
    expect(quotaFull.longTerm).toMatchObject({ visible: true, enabled: false, reason: 'long_term_limit_reached' });

    const diskFull = resolveFor({ effective_status: 'offline', disk_usage_percent: 100 });
    expect(diskFull.longTerm).toMatchObject({ visible: true, enabled: false, reason: 'disk_usage_over_limit' });

    const pausedResidual = resolveFor({
      effective_status: 'online',
      is_long_term: true,
      freeze_state: { is_frozen: true, days_frozen: 3 },
      long_term_container_can_enable: false,
      disk_usage_percent: 100,
    });
    expect(pausedResidual.longTerm).toMatchObject({ visible: true, enabled: true, checked: true });

    const paused = resolveFor({ effective_status: 'paused' }, { permissions: ['container:manage'] });
    expect(paused.actions.unpause).toMatchObject({ visible: true, enabled: true });
  });

  it('test_q35_manage_user_no_delete_or_modal_contract', async () => {
    renderPage();
    const card = await waitForCard();
    expect(within(card).queryByRole('button', { name: /删\s*除容器/ })).toBeNull();
    expect(within(card).queryByRole('button', { name: /详\s*情/ })).toBeNull();

    const source = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/ManageUser.jsx'), 'utf8');
    expect(source).not.toMatch(/ContainerDetailModal/);
    expect(source).not.toMatch(/openContainerDetail/);
    expect(source).not.toMatch(/detailModalVisible/);
    expect(source).not.toMatch(/deleteContainer\(/);
  });

  it('test_q59_parent_controls_second_page_with_page_size_four', async () => {
    const user = userEvent.setup();
    const firstPage = ['train-a', 'train-b', 'train-c', 'train-d'].map((name, index) => container({
      container_id: 100 + index,
      container_name: name,
    }));
    const secondPage = ['train-e', 'train-f'].map((name, index) => container({
      container_id: 110 + index,
      container_name: name,
    }));
    listAllContainerBrefInformation.mockImplementation(async ({ page_number = 0 }) => ({
      containers_info: page_number === 1 ? secondPage : firstPage,
      total_number: 6,
      total_page: 2,
    }));

    renderPage();
    await user.click(await screen.findByText('表格'));
    expect(await screen.findByText('alice')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /编辑用户/ }));

    const expanded = await waitFor(() => {
      const node = document.querySelector('.manage-user-expanded');
      expect(node).not.toBeNull();
      return node;
    });
    const pagination = expanded.querySelector('.ant-pagination');
    expect(pagination).not.toBeNull();
    listAllContainerBrefInformation.mockClear();

    fireEvent.click(within(pagination).getByTitle('2'));

    await waitFor(() => expect(listAllContainerBrefInformation).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 7,
      page_number: 1,
      page_size: 4,
    })));
    expect(await screen.findByText('train-e')).toBeInTheDocument();
    expect(listAllContainerBrefInformation.mock.calls.every(([params]) => params.page_size === 4)).toBe(true);
  });
});
