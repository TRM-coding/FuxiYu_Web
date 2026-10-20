import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const permissionState = vi.hoisted(() => ({
  entities: ['bypass_auth_entity', 'container:operation', 'container:manage'],
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
    hasAnyManage: () => false,
  }),
}));

vi.mock('../utils/showErrorModal', () => ({ default: vi.fn() }));
vi.mock('../utils/authHelpers', () => ({ handleAuthError: vi.fn() }));
vi.mock('../utils/heartbeat', () => ({
  startContainerStatusHeartbeat: vi.fn(() => () => {}),
  watchIngContainerUntilTerminal: vi.fn(() => () => {}),
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

import { listAllUserBrefInformation } from '../api/user_api';
import { listAllContainerBrefInformation } from '../api/container_api';
import ManageUser from '../pages/ManageUser';

const OPERATOR_ROOT = { user_id: 1, username: 'root_user', role: 'ROOT' };

const USER = {
  user_id: 7,
  username: 'alice',
  email: 'alice@example.com',
  amount_of_container: 1,
  amount_of_functional_container: 1,
  amount_of_managed_container: 0,
  amount_of_long_term_container: 0,
};

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

const renderPage = () => render(
  <MemoryRouter initialEntries={['/admin/users']}>
    <Routes>
      <Route path="/admin/users" element={<ManageUser />} />
      <Route path="/index/containers/:containerId" element={<div data-testid="container-detail-route">detail</div>} />
    </Routes>
  </MemoryRouter>,
);

const waitForCard = async () => {
  expect(await screen.findByText('train-a')).toBeInTheDocument();
  return screen.getByText('train-a').closest('.fuxi-nested-child-card');
};

beforeEach(() => {
  vi.clearAllMocks();
  permissionState.entities = ['bypass_auth_entity', 'container:operation', 'container:manage'];
  permissionState.userId = 1;
  permissionState.userName = 'root_user';
  listAllUserBrefInformation.mockResolvedValue({ users: [USER] });
  listAllContainerBrefInformation.mockResolvedValue({
    containers_info: [container()],
    total_number: 1,
    total_page: 1,
  });
});

describe('ManageUser 容器详情入口与死弹窗清理', () => {
  it('test_q35_manage_user_container_row_navigates_detail', async () => {
    const user = userEvent.setup();
    renderPage();
    const card = await waitForCard();
    expect(screen.queryByText('容器详细信息')).toBeNull();

    await user.click(within(card).getByRole('button', { name: 'train-a' }));
    expect(await screen.findByTestId('container-detail-route')).toBeInTheDocument();
    expect(screen.queryByText('容器详细信息')).toBeNull();
  });

  it('test_q36_manage_user_no_dead_detail_modal', async () => {
    renderPage();
    await waitForCard();
    expect(screen.queryByText('容器详细信息')).toBeNull();

    const source = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/ManageUser.jsx'), 'utf8');
    expect(source).not.toMatch(/ContainerDetailModal/);
    expect(source).not.toMatch(/openContainerDetail/);
    expect(source).not.toMatch(/detailModalVisible/);
    expect(source).not.toMatch(/setDetailModalVisible/);
  });

  it('test_q35_manage_user_no_new_detail_entry', async () => {
    renderPage();
    const card = await waitForCard();
    expect(within(card).queryByRole('button', { name: /详\s*情/ })).toBeNull();
    expect(within(card).getByRole('button', { name: 'train-a' })).toBeInTheDocument();
  });
});
