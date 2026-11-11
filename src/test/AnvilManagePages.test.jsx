import React from 'react';
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const messageSpies = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  loading: vi.fn(),
  info: vi.fn(),
  destroy: vi.fn(),
}));

vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal();
  return { ...antd, message: messageSpies };
});

vi.mock('../components/ModelViewer', () => ({
  default: () => <div data-testid="model-viewer">model</div>,
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
  addCollaborator: vi.fn(),
  updateRole: vi.fn(),
  resetContainerPassword: vi.fn(),
  getContainerOperationLogs: vi.fn(),
  getContainerStatus: vi.fn(),
}));

vi.mock('../api/machine_api', () => ({
  listAllMachineBrefInformation: vi.fn(),
  getDetailInformation: vi.fn(),
  getMachineStatus: vi.fn(),
  registerMachine: vi.fn(),
  removeMachine: vi.fn(),
  renewMachineTrust: vi.fn(),
  setMachineMaintenance: vi.fn(),
  updateMachine: vi.fn(),
  addMachinePermission: vi.fn(),
  removeMachinePermission: vi.fn(),
  listMachinePermissions: vi.fn(),
}));

vi.mock('../api/user_api', () => ({
  getUserPermissions: vi.fn(),
  getUserDetailInformation: vi.fn(),
  listAllUserBrefInformation: vi.fn(),
  deleteUser: vi.fn(),
  updateUser: vi.fn(),
  resetPassword: vi.fn(),
  logoutUser: vi.fn(),
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  requestRegisterCode: vi.fn(),
}));

vi.mock('../api/rbac_api', () => ({
  getRbacMatrix: vi.fn(),
  getUserRbacGroups: vi.fn(),
  setUserRbacGroups: vi.fn(),
}));

vi.mock('../utils/heartbeat', () => ({
  startContainerStatusHeartbeat: vi.fn(() => () => {}),
  watchIngContainerUntilTerminal: vi.fn(() => () => {}),
  ING_CONTAINER_STATES: new Set([
    'building', 'creating', 'starting', 'stopping', 'restarting', 'pausing', 'unpausing', 'status_unknown',
  ]),
}));

import { PermissionProvider, usePermission } from '../contexts/PermissionContext';
import AppRoutes from '../routes';
import Home from '../pages/Home';
import ManageUser from '../pages/ManageUser';
import ManageMachine from '../pages/ManageMachine';
import MachineDetailPage from '../pages/MachineDetailPage';
import ManageUserInTable from '../pages/ManageUserInTable';
import { resolveContainerActions } from '../utils/containerActions';
import {
  addCollaborator,
  deleteContainer,
  getContainerDetailInformation,
  listAllContainerBrefInformation,
  refreshLastSshLoginTime,
  removeCollaborator,
  restartContainer,
  setLongTermContainer,
  startContainer,
  stopContainer,
  unpauseContainer,
  updateRole,
} from '../api/container_api';
import {
  getDetailInformation,
  getMachineStatus,
  listAllMachineBrefInformation,
  registerMachine,
  removeMachine,
  renewMachineTrust,
  setMachineMaintenance,
  updateMachine,
} from '../api/machine_api';
import {
  deleteUser,
  getUserDetailInformation,
  getUserPermissions,
  listAllUserBrefInformation,
  resetPassword,
} from '../api/user_api';
import { getRbacMatrix, getUserRbacGroups, setUserRbacGroups } from '../api/rbac_api';
import { startContainerStatusHeartbeat } from '../utils/heartbeat';

const ALL_PERMISSIONS = [
  'container:operation',
  'container:manage',
  'bypass_auth_entity',
  'bypass_resource',
  'user:manage',
  'machine:manage',
  'rbac:manage',
];

const ROOT_ACCOUNT = { user_id: 1, username: 'root_user', role: 'ROOT' };
const ALICE_ACCOUNT = { user_id: 2, username: 'alice', role: 'COLLABORATOR' };

const container = (overrides = {}) => ({
  container_id: 1,
  key: 1,
  container_name: 'train-a',
  image_name: 'fuxi/image:1',
  effective_status: 'online',
  machine_id: 1,
  machine_ip: '10.0.0.8',
  port: 1024,
  accounts: [ROOT_ACCOUNT, ALICE_ACCOUNT],
  is_long_term: false,
  long_term_container_can_enable: true,
  disk_usage_percent: 20,
  ...overrides,
});

const user = (overrides = {}) => ({
  user_id: 7,
  key: '7',
  username: 'alice',
  email: 'alice@example.com',
  graduation_year: 2024,
  amount_of_container: 1,
  amount_of_functional_container: 1,
  amount_of_managed_container: 0,
  amount_of_long_term_container: 0,
  ...overrides,
});

const machine = (overrides = {}) => ({
  machine_id: 7,
  machine_name: 'gpu-node-01',
  machine_ip: '10.0.0.9',
  port: 6789,
  machine_type: 'GPU',
  machine_status: 'online',
  effective_status: 'online',
  is_maintenance: false,
  cpu_core_number: 16,
  memory_size_gb: 64,
  gpu_number: 2,
  disk_size_gb: 1024,
  max_cpu_core_number: 12,
  max_memory_gb: 32,
  max_shared_gb: 8,
  max_gpu_number: 2,
  max_disk_size_gb: 512,
  gpu_allow_list: [0, 1],
  runtime_snapshot: {
    collected_at: '2026-10-28T10:00:00Z',
    hostname: 'node-01',
    platform: 'Linux',
    cpu: { usage_percent: 11 },
    memory: { usage_percent: 22, used_gb: 28, total_gb: 64 },
    disk: { percent: 33, used_gb: 330, total_gb: 1024 },
    gpu: [{ index: 0, name: 'RTX 4060', utilization_gpu_percent: 44 }],
  },
  ...overrides,
});

const PermissionReady = ({ children }) => {
  const { loaded } = usePermission();
  return loaded ? children : null;
};

const LocationProbe = () => {
  const location = useLocation();
  return <span data-testid="path">{location.pathname}</span>;
};

const installPermission = (overrides = {}) => {
  const snapshot = {
    entities: ALL_PERMISSIONS,
    userId: 1,
    userName: 'root_user',
    containerResourceUnrestricted: true,
    ...overrides,
  };
  getUserPermissions.mockResolvedValue(snapshot);
  return snapshot;
};

const renderPage = (ui, permission = {}) => {
  installPermission(permission);
  return render(
    <MemoryRouter>
      <PermissionProvider>
        <PermissionReady>{ui}</PermissionReady>
      </PermissionProvider>
    </MemoryRouter>,
  );
};

const renderAppAt = (path, permission = {}) => {
  installPermission(permission);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PermissionProvider>
        <PermissionReady>
          <AppRoutes />
          <LocationProbe />
        </PermissionReady>
      </PermissionProvider>
    </MemoryRouter>,
  );
};

const visibleModalText = () => Array.from(document.querySelectorAll('.ant-modal'))
  .filter(el => el.style.display !== 'none')
  .map(el => el.textContent || '')
  .join('\n');

const closeErrorModals = async () => {
  const modals = Array.from(document.querySelectorAll('.ant-modal')).filter(el => el.style.display !== 'none');
  for (const modal of modals.reverse()) {
    const ok = Array.from(modal.querySelectorAll('button'))
      .find(btn => (btn.textContent || '').replace(/\s/g, '') === '好的');
    if (ok) fireEvent.click(ok);
  }
  await act(async () => { await Promise.resolve(); });
};

const clickOption = async (text) => {
  await waitFor(() => {
    expect(Array.from(document.querySelectorAll('.ant-select-item-option'))
      .some(el => (el.textContent || '').includes(text))).toBe(true);
  });
  const option = Array.from(document.querySelectorAll('.ant-select-item-option'))
    .find(el => (el.textContent || '').includes(text));
  await userEvent.click(option);
};

const openHomeDetail = async (userEventInstance) => {
  await userEventInstance.click(await screen.findByRole('button', { name: /详\s*情/ }));
  return screen.findByRole('dialog');
};

const openPeopleModal = async (userEventInstance) => {
  const detail = await openHomeDetail(userEventInstance);
  await userEventInstance.click(within(detail).getByRole('button', { name: /管理人员/ }));
  await screen.findByText('添加新用户');
  return screen.findByRole('dialog');
};

const chooseAddUser = async (displayName = 'Bob (@bob)') => {
  const dialog = await screen.findByRole('dialog');
  const addCard = dialog.querySelector('.eum-add-card');
  const combo = addCard.querySelector('[role="combobox"]');
  fireEvent.mouseDown(combo.closest('.ant-select').querySelector('.ant-select-selector'));
  await clickOption(displayName);
};

const chooseAddRole = async (label = '管理员') => {
  const dialog = await screen.findByRole('dialog');
  const combos = Array.from(dialog.querySelectorAll('.eum-add-card [role="combobox"]'));
  fireEvent.mouseDown(combos[1].closest('.ant-select').querySelector('.ant-select-selector'));
  await clickOption(label);
};

const chooseMemberRole = async (label = '超级管理员') => {
  const dialog = await screen.findByRole('dialog');
  const combos = Array.from(dialog.querySelectorAll('.eum-list-item [role="combobox"]'))
    .filter(el => !el.disabled);
  const combo = combos[combos.length - 1];
  fireEvent.mouseDown(combo.closest('.ant-select').querySelector('.ant-select-selector'));
  await clickOption(label);
};

const submitAddUser = async (userEventInstance) => {
  await userEventInstance.click(screen.getByRole('button', { name: /添加用户/ }));
};

const confirmButton = async (name) => screen.findByRole('button', { name });

const resetApiDefaults = () => {
  listAllContainerBrefInformation.mockResolvedValue({
    containers_info: [container()],
    total_number: 1,
    total_page: 1,
  });
  getContainerDetailInformation.mockResolvedValue({ container_info: container() });
  refreshLastSshLoginTime.mockResolvedValue({ last_ssh_login_time: null });
  deleteContainer.mockResolvedValue({ success: 1 });
  removeCollaborator.mockResolvedValue({ success: 1 });
  startContainer.mockResolvedValue({ success: 1 });
  stopContainer.mockResolvedValue({ success: 1 });
  restartContainer.mockResolvedValue({ success: 1 });
  setLongTermContainer.mockResolvedValue({ success: 1, is_long_term: true });
  unpauseContainer.mockResolvedValue({ success: 1 });
  addCollaborator.mockResolvedValue({
    accepted: true,
    credentials: [{ login_name: 'bob', password: 'pw-bob' }],
  });
  updateRole.mockResolvedValue({
    accepted: true,
    credentials: [
      { login_name: 'root_user', password: 'pw-old' },
      { login_name: 'root', password: 'pw-root' },
    ],
  });
  listAllUserBrefInformation.mockResolvedValue({
    users: [
      { id: 1, username: 'root_user', name: 'Root' },
      { id: 2, username: 'alice', name: 'Alice' },
      { id: 3, username: 'bob', name: 'Bob' },
    ],
  });
  getUserDetailInformation.mockResolvedValue({ user_info: { username: 'alice' } });
  deleteUser.mockResolvedValue({ success: 1 });
  resetPassword.mockResolvedValue({ new_password: 'pw-new' });
  getRbacMatrix.mockResolvedValue({ groups: [{ id: 2, name: 'group-2', entity_codes: ['a'] }] });
  getUserRbacGroups.mockResolvedValue({ group_ids: [2] });
  setUserRbacGroups.mockResolvedValue({ success: 1 });
  listAllMachineBrefInformation.mockResolvedValue({ machines: [machine()] });
  getDetailInformation.mockResolvedValue(machine());
  getMachineStatus.mockResolvedValue({ machine_status: 'online', is_maintenance: false });
  registerMachine.mockResolvedValue({ success: 1 });
  removeMachine.mockResolvedValue({ success: 1 });
  renewMachineTrust.mockResolvedValue({ uid_reissued: true, uid_mismatch: false });
  setMachineMaintenance.mockResolvedValue({ success: 1 });
  updateMachine.mockResolvedValue({ success: 1 });
  startContainerStatusHeartbeat.mockClear();
};

const originalMatchMedia = window.matchMedia;

beforeAll(async () => {
  await Promise.all([
    import('../layouts/MainLayout'),
    import('../layouts/AdminLayout'),
    import('../pages/Login'),
    import('../pages/ContainerDetailPage'),
  ]);
}, 60000);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  resetApiDefaults();
  installPermission();
  vi.spyOn(globalThis, 'setInterval').mockImplementation(() => 1);
  vi.spyOn(globalThis, 'clearInterval').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  window.matchMedia = originalMatchMedia;
});

afterEach(async () => {
  await closeErrorModals();
  cleanup();
  vi.restoreAllMocks();
  window.matchMedia = originalMatchMedia;
});

describe('Home 入口、操作与凭据', () => {
  it('test_home_route_mounts_page_and_uses_permission_snapshot', async () => {
    installPermission({ entities: ['container:operation'], userId: 2, userName: 'collab_user' });
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container()],
      total_number: 1,
      total_page: 1,
    });
    render(
      <MemoryRouter initialEntries={['/index']}>
        <PermissionProvider>
          <PermissionReady>
            <AppRoutes />
            <LocationProbe />
          </PermissionReady>
        </PermissionProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: '我的容器' })).toBeInTheDocument();
    expect(screen.getByTestId('path')).toHaveTextContent('/index');
    expect(await screen.findByText('train-a')).toBeInTheDocument();
    expect(listAllContainerBrefInformation).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /^停\s*止$/ })).toBeNull();
  });

  it('test_home_restart_accepted_enters_restarting_without_terminal_claim', async () => {
    const userEventInstance = userEvent.setup();
    renderPage(<Home />);

    expect(await screen.findByText('train-a')).toBeInTheDocument();
    await userEventInstance.click(screen.getByRole('button', { name: /^重\s*启$/ }));
    await userEventInstance.click(await confirmButton(/确认\s*重\s*启/));

    expect(await screen.findByText('重启中')).toBeInTheDocument();
    await waitFor(() => expect(startContainerStatusHeartbeat).toHaveBeenCalledTimes(1));
    expect(messageSpies.success).toHaveBeenCalledWith(expect.stringContaining('重启请求已发送'));
    expect(screen.queryByText('已重启')).toBeNull();
  });

  it('test_home_add_admin_credential_modal_after_people_close', async () => {
    const userEventInstance = userEvent.setup();
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({ accounts: [ROOT_ACCOUNT] })],
      total_number: 1,
      total_page: 1,
    });
    getContainerDetailInformation.mockResolvedValue({
      container_info: container({ accounts: [ROOT_ACCOUNT] }),
    });
    renderPage(<Home />);

    await openPeopleModal(userEventInstance);
    await chooseAddUser();
    await chooseAddRole('管理员');
    await submitAddUser(userEventInstance);

    expect(await screen.findByText('重置后bob的密码：')).toBeInTheDocument();
    expect(addCollaborator).toHaveBeenCalledWith({ user_id: 3, container_id: '1', role: 'ADMIN' });
    expect(addCollaborator).toHaveBeenCalledTimes(1);
    expect(messageSpies.success).toHaveBeenCalledWith('新增协作者请求已受理');
    expect(screen.queryByText('用户已添加')).toBeNull();

    await userEventInstance.click(screen.getByRole('button', { name: /完\s*成/ }));
    expect(screen.getByText('重置后bob的密码：')).toBeInTheDocument();
  });

  it('test_home_add_failure_hides_password_and_keeps_account_list', async () => {
    const userEventInstance = userEvent.setup();
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({ accounts: [ROOT_ACCOUNT] })],
      total_number: 1,
      total_page: 1,
    });
    getContainerDetailInformation.mockResolvedValue({
      container_info: container({ accounts: [ROOT_ACCOUNT] }),
    });
    addCollaborator.mockRejectedValueOnce({
      status: 400,
      route: '/api/containers/add_collaborator',
      body: {
        success: 0,
        message: '新增协作者失败',
        error_reason: 'add_collaborator_failed',
        credentials: [{ login_name: 'bob', password: 'pw-secret' }],
      },
    });
    renderPage(<Home />);

    await openPeopleModal(userEventInstance);
    await chooseAddUser();
    await submitAddUser(userEventInstance);

    await waitFor(() => expect(visibleModalText()).toContain('新增协作者失败'));
    expect(visibleModalText()).not.toContain('pw-secret');
    expect(screen.queryByText('重置后bob的密码：')).toBeNull();
    expect(messageSpies.success).not.toHaveBeenCalledWith('新增协作者请求已受理');
    expect(screen.getByText('当前用户列表 (1人)')).toBeInTheDocument();
    expect(screen.queryByText('用户已添加')).toBeNull();
  });

  it('test_home_member_guard_failures_show_chinese_reasons', async () => {
    const userEventInstance = userEvent.setup();
    addCollaborator.mockRejectedValueOnce({
      status: 400,
      route: '/api/containers/add_collaborator',
      body: {
        success: 0,
        message: 'Failed to add collaborator',
        error_reason: 'container_offline',
      },
    });
    updateRole
      .mockRejectedValueOnce({
        status: 409,
        route: '/api/containers/update_role',
        body: { success: 0, message: 'Failed to update role', error_reason: 'container_paused' },
      })
      .mockRejectedValueOnce({
        status: 409,
        route: '/api/containers/update_role',
        body: { success: 0, message: 'Failed to update role', error_reason: 'container_busy' },
      });

    renderPage(<Home />);
    await openPeopleModal(userEventInstance);
    await chooseAddUser();
    await submitAddUser(userEventInstance);
    await waitFor(() => expect(visibleModalText()).toContain('容器未在线，无法添加协作者'));
    await closeErrorModals();

    await chooseMemberRole('管理员');
    await waitFor(() => expect(visibleModalText()).toContain('容器已冻结，无法更新角色'));
    await closeErrorModals();

    await chooseMemberRole('管理员');
    await waitFor(() => expect(visibleModalText()).toContain('容器正在处理中，暂时无法更新角色'));
    expect(updateRole).toHaveBeenCalledTimes(2);
  });

  it('test_home_root_handover_partial_completion_uses_authoritative_refresh', async () => {
    const userEventInstance = userEvent.setup();
    const original = container({ accounts: [ROOT_ACCOUNT, ALICE_ACCOUNT] });
    const partial = container({
      accounts: [
        { ...ROOT_ACCOUNT, role: 'ADMIN' },
        { ...ALICE_ACCOUNT, role: 'COLLABORATOR' },
      ],
    });
    listAllContainerBrefInformation
      .mockResolvedValueOnce({ containers_info: [original], total_number: 1, total_page: 1 })
      .mockResolvedValue({ containers_info: [partial], total_number: 1, total_page: 1 });
    getContainerDetailInformation
      .mockResolvedValueOnce({ container_info: original })
      .mockResolvedValue({ container_info: partial });
    renderPage(<Home />);

    await openPeopleModal(userEventInstance);
    await chooseMemberRole('超级管理员');
    expect(await screen.findByText('重置后root_user的密码：')).toBeInTheDocument();
    await userEventInstance.click(screen.getByRole('button', { name: /关\s*闭/ }));

    const detail = await openHomeDetail(userEventInstance);
    expect(within(detail).getByText('管理员')).toBeInTheDocument();
    expect(within(detail).getByText('协作者')).toBeInTheDocument();
    expect(within(detail).queryByText('超级管理员')).toBeNull();
    expect(messageSpies.success).not.toHaveBeenCalledWith(expect.stringContaining('ROOT 交接成功'));
    expect(messageSpies.success).not.toHaveBeenCalledWith(expect.stringContaining('已交接'));
  });

  it('test_home_root_handover_rejections_keep_no_password_and_authoritative_roles', async () => {
    const userEventInstance = userEvent.setup();
    updateRole.mockRejectedValueOnce(Object.assign(new Error('凭据响应异常，请稍后重试'), {
      status: 200,
      route: '/api/containers/update_role',
    }));
    renderPage(<Home />);

    const people = await openPeopleModal(userEventInstance);
    await chooseMemberRole('超级管理员');

    await waitFor(() => expect(visibleModalText()).toContain('凭据响应异常'));
    expect(screen.queryByText('重置后root_user的密码：')).toBeNull();
    expect(screen.queryByText('重置后root的密码：')).toBeNull();
    expect(messageSpies.success).not.toHaveBeenCalledWith('ROOT 交接请求已受理');
    expect(updateRole).toHaveBeenCalledTimes(1);
    const aliceRow = within(people).getByText('@alice').closest('.eum-list-item');
    expect(within(aliceRow).getAllByText('协作者').length).toBeGreaterThan(0);
  });

  it('test_home_silent_refresh_role_and_disk_updates_actions', async () => {
    const first = container({
      accounts: [ROOT_ACCOUNT, { ...ALICE_ACCOUNT, role: 'COLLABORATOR' }],
      disk_total_gb: 120,
      disk_limit_gb: 150,
    });
    const second = container({
      accounts: [ROOT_ACCOUNT, { ...ALICE_ACCOUNT, role: 'ADMIN' }],
      disk_total_gb: 180,
      disk_limit_gb: 210,
      disk_usage_percent: 100,
    });
    listAllContainerBrefInformation
      .mockResolvedValueOnce({ containers_info: [first], total_number: 1, total_page: 1 })
      .mockResolvedValue({ containers_info: [second], total_number: 1, total_page: 1 });
    renderPage(<Home />, { entities: ['container:operation'], userId: 2, userName: 'alice' });

    const card = (await screen.findByText('train-a')).closest('.home-container-card');
    expect(within(card).getByText('磁盘 120G / 150G')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^停\s*止$/ })).toBeNull();

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => expect(screen.getByRole('button', { name: /^停\s*止$/ })).toBeEnabled());
    await waitFor(() => expect(within(card).getByText('磁盘 180G / 210G')).toBeInTheDocument());
    expect(listAllContainerBrefInformation.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('test_home_card_and_detail_modal_share_action_resolution', async () => {
    const userEventInstance = userEvent.setup();
    renderPage(<Home />);

    const card = (await screen.findByText('train-a')).closest('.home-container-card');
    expect(within(card).getByRole('button', { name: /^停\s*止$/ })).toBeEnabled();
    expect(within(card).getByRole('button', { name: /^启\s*动$/ })).toBeDisabled();
    expect(within(card).getByRole('button', { name: /^重\s*启$/ })).toBeEnabled();
    expect(within(card).getByRole('checkbox')).toBeEnabled();

    const detail = await openHomeDetail(userEventInstance);
    expect(within(detail).getByRole('button', { name: /删除容器/ })).toBeEnabled();
    expect(within(detail).getByRole('button', { name: /^关\s*闭$/ })).toBeEnabled();
    expect(within(detail).queryByRole('button', { name: /^停\s*止$/ })).toBeNull();
    expect(within(detail).queryByRole('button', { name: /^启\s*动$/ })).toBeNull();
    expect(within(detail).queryByRole('button', { name: /^重\s*启$/ })).toBeNull();
    expect(within(detail).queryByRole('checkbox')).toBeNull();
  });

  it('test_home_root_handover_credential_modal_after_people_close', async () => {
    const userEventInstance = userEvent.setup();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    updateRole
      .mockResolvedValueOnce({ accepted: true, credentials: [] })
      .mockResolvedValueOnce({
        accepted: true,
        credentials: [
          { login_name: 'root_user', password: 'pw-old' },
          { login_name: 'root', password: 'pw-root' },
          { login_name: 'old-root', password: 'pw-third' },
        ],
      });
    renderPage(<Home />);

    await openPeopleModal(userEventInstance);
    await chooseMemberRole('管理员');
    await waitFor(() => expect(messageSpies.success).toHaveBeenCalledWith('角色已更新'));
    expect(screen.queryByText(/重置后.*的密码：/)).toBeNull();
    expect(updateRole).toHaveBeenNthCalledWith(1, {
      container_id: '1',
      user_id: 2,
      updated_role: 'ADMIN',
    });

    await chooseMemberRole('超级管理员');
    expect(await screen.findByText('重置后root_user的密码：')).toBeInTheDocument();
    expect(screen.getByText('重置后root的密码：')).toBeInTheDocument();
    expect(screen.getByText('重置后old-root的密码：')).toBeInTheDocument();
    expect(visibleModalText()).not.toContain('添加新用户');
    expect(updateRole).toHaveBeenCalledTimes(2);
    expect(updateRole).toHaveBeenNthCalledWith(2, {
      container_id: '1',
      user_id: 2,
      updated_role: 'ROOT',
    });

    await userEventInstance.click(screen.getByRole('button', { name: /关\s*闭/ }));
    expect(screen.queryByText(/重置后.*的密码：/)).toBeNull();
    const logged = logSpy.mock.calls.flat().map(value => String(value)).join(' ');
    expect(logged).not.toContain('pw-old');
    expect(logged).not.toContain('pw-root');
    expect(logged).not.toContain('pw-third');
    logSpy.mockRestore();
  });

  it('test_home_paused_card_and_modal_do_not_offer_unpause', async () => {
    const userEventInstance = userEvent.setup();
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({ effective_status: 'paused' })],
      total_number: 1,
      total_page: 1,
    });
    renderPage(<Home />, { entities: ['container:manage'], userId: 1, userName: 'root_user' });
    const card = (await screen.findByText('train-a')).closest('.home-container-card');
    expect(within(card).queryByRole('button', { name: /解冻/ })).toBeNull();
    await userEventInstance.click(within(card).getByRole('button', { name: /详\s*情/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByRole('button', { name: /解冻/ })).toBeNull();
    expect(unpauseContainer).not.toHaveBeenCalled();
  });

  it('test_home_collaborator_role_hides_delete_and_disables_long_term', async () => {
    const userEventInstance = userEvent.setup();
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({ accounts: [ROOT_ACCOUNT, ALICE_ACCOUNT] })],
      total_number: 1,
      total_page: 1,
    });
    getContainerDetailInformation.mockResolvedValue({
      container_info: container({ accounts: [ROOT_ACCOUNT, ALICE_ACCOUNT] }),
    });
    renderPage(<Home />, { entities: ['container:operation'], userId: 2, userName: 'alice' });

    const card = (await screen.findByText('train-a')).closest('.home-container-card');
    expect(within(card).getByRole('checkbox')).toBeDisabled();
    expect(within(card).getByRole('checkbox').closest('label')?.querySelector('[title]'))
      .toHaveAttribute('title', '当前账号没有执行该操作的权限');
    expect(within(card).queryByRole('button', { name: /^停\s*止$/ })).toBeNull();
    expect(within(card).queryByRole('button', { name: /^启\s*动$/ })).toBeNull();

    const detail = await openHomeDetail(userEventInstance);
    expect(within(detail).queryByRole('button', { name: /删除容器/ })).toBeNull();
    expect(within(detail).queryByRole('checkbox')).toBeNull();
    expect(deleteContainer).not.toHaveBeenCalled();
  });

  it('test_home_paused_long_term_cancel_disabled_with_reason', async () => {
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({
        effective_status: 'paused',
        is_long_term: true,
        freeze_state: { is_frozen: true, days_frozen: 2 },
      })],
      total_number: 1,
      total_page: 1,
    });
    renderPage(<Home />);

    const card = (await screen.findByText('train-a')).closest('.home-container-card');
    const checkbox = within(card).getByRole('checkbox');
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeDisabled();
    expect(checkbox.closest('label')?.querySelector('[title]')).toHaveAttribute('title', '容器已冻结');
  });
});
const renderMachineDetail = (permission = {}, data = machine()) => {
  installPermission(permission);
  getDetailInformation.mockResolvedValue(data);
  return render(
    <MemoryRouter initialEntries={['/index/machines/7']}>
      <PermissionProvider>
        <PermissionReady>
          <Routes>
            <Route path="/index/machines/:machineId" element={<MachineDetailPage />} />
          </Routes>
        </PermissionReady>
      </PermissionProvider>
    </MemoryRouter>,
  );
};

const limitBlock = key => document.querySelector(`[data-limit="${key}"]`);
const limitInput = key => within(limitBlock(key)).getByRole('spinbutton');
const commitLimit = async (key, raw) => {
  const input = limitInput(key);
  await act(async () => {
    fireEvent.change(input, { target: { value: String(raw) } });
  });
  await waitFor(() => expect(limitInput(key).value).toBe(String(raw)));
  await act(async () => {
    fireEvent.focusOut(input);
  });
};

const renderManageMachine = (permission = {}, machines = [machine()]) => {
  listAllMachineBrefInformation.mockResolvedValue({ machines });
  return renderPage(<ManageMachine />, permission);
};

describe('MachineDetail 与 ManageMachine', () => {
  it('test_machine_detail_route_uses_path_id_and_repair_permission_gate', async () => {
    const first = renderMachineDetail({
      entities: ['machine:manage', 'machine:view', 'container:operation'],
      userId: 1,
      userName: 'root_user',
    });
    expect(await screen.findByText('gpu-node-01')).toBeInTheDocument();
    expect(getDetailInformation).toHaveBeenCalledWith(7);
    expect(screen.getByRole('button', { name: /修复连接/ })).toBeInTheDocument();
    first.unmount();

    renderMachineDetail({ entities: ['machine:view'], userId: 2, userName: 'viewer' });
    expect(await screen.findByText('gpu-node-01')).toBeInTheDocument();
    expect(getDetailInformation).toHaveBeenCalledWith(7);
    expect(screen.queryByRole('button', { name: /修复连接/ })).toBeNull();
  });

  it('test_machine_detail_explicit_null_port_clears_platform_default', async () => {
    const userEventInstance = userEvent.setup();
    renderMachineDetail({
      entities: ['machine:manage'],
      userId: 1,
      userName: 'root_user',
    });
    expect(await screen.findByText('端口 6789')).toBeInTheDocument();
    getDetailInformation.mockResolvedValue(machine({ port: null }));

    await userEventInstance.click(screen.getByRole('button', { name: /编\s*辑/ }));
    const dialog = await screen.findByRole('dialog');
    const portInput = within(dialog).getByPlaceholderText('留空用平台默认');
    fireEvent.change(portInput, { target: { value: '' } });
    await userEventInstance.click(within(dialog).getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(updateMachine).toHaveBeenCalledWith(7, expect.objectContaining({ port: null })));
    expect(await screen.findByText('端口 未配置（平台默认）')).toBeInTheDocument();
  });

  it('test_machine_detail_maintenance_switch_independent_of_machine_status', async () => {
    const userEventInstance = userEvent.setup();
    let pollStatus;
    globalThis.setInterval.mockImplementation((callback, delay) => {
      if (delay === 5000) pollStatus = callback;
      return 1;
    });
    renderMachineDetail({
      entities: ['machine:manage'],
      userId: 1,
      userName: 'root_user',
    });
    expect(await screen.findByText('gpu-node-01')).toBeInTheDocument();
    getDetailInformation.mockResolvedValue(machine({ is_maintenance: true, machine_status: 'online' }));

    await userEventInstance.click(screen.getByRole('button', { name: /编\s*辑/ }));
    const dialog = await screen.findByRole('dialog');
    await userEventInstance.click(within(dialog).getByRole('switch'));
    await userEventInstance.click(within(dialog).getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(updateMachine).toHaveBeenCalled());
    await waitFor(() => expect(setMachineMaintenance).toHaveBeenCalledWith(7, true));
    expect(updateMachine.mock.invocationCallOrder[0])
      .toBeLessThan(setMachineMaintenance.mock.invocationCallOrder[0]);
    expect(updateMachine.mock.calls[0][1]).not.toHaveProperty('machine_status');
    await waitFor(() => expect(screen.getAllByText('维护中').length).toBeGreaterThan(0));

    getMachineStatus.mockResolvedValue({ machine_status: 'offline' });
    await act(async () => {
      await pollStatus?.();
    });
    expect(getMachineStatus).toHaveBeenCalledWith(7, expect.any(Number));
    expect(screen.getAllByText('维护中').length).toBeGreaterThan(0);
  });

  it('test_machine_detail_renew_trust_confirm_success_failure_and_permission', async () => {
    const userEventInstance = userEvent.setup();
    const first = renderMachineDetail({
      entities: ['machine:manage'],
      userId: 1,
      userName: 'root_user',
    });
    expect(await screen.findByText('gpu-node-01')).toBeInTheDocument();
    await userEventInstance.click(screen.getByRole('button', { name: /修复连接/ }));
    let dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('确认修复连接')).toBeInTheDocument();
    await userEventInstance.click(within(dialog).getByRole('button', { name: /修\s*复/ }));
    await waitFor(() => expect(renewMachineTrust).toHaveBeenCalledWith(7));
    expect(messageSpies.success).toHaveBeenCalledWith(expect.stringContaining('连接信任已重建'));
    expect(messageSpies.success).toHaveBeenCalledWith(expect.stringContaining('已重发身份牌'));
    first.unmount();

    renewMachineTrust.mockRejectedValueOnce({
      status: 500,
      route: '/api/machines/renew_machine_trust',
      body: { success: 0, message: 'renew failed' },
    });
    renderMachineDetail({
      entities: ['machine:manage'],
      userId: 1,
      userName: 'root_user',
    });
    expect(await screen.findByText('gpu-node-01')).toBeInTheDocument();
    await userEventInstance.click(screen.getByRole('button', { name: /修复连接/ }));
    dialog = await screen.findByRole('dialog');
    await userEventInstance.click(within(dialog).getByRole('button', { name: /修\s*复/ }));
    await waitFor(() => expect(visibleModalText()).toContain('renew failed'));
    await closeErrorModals();
    expect(registerMachine).not.toHaveBeenCalled();
    cleanup();

    renderMachineDetail({ entities: ['machine:view'], userId: 2, userName: 'viewer' });
    expect(await screen.findByText('gpu-node-01')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /修复连接/ })).toBeNull();
  });

  it('test_manage_machine_add_host_sends_only_trust_anchor_fields', async () => {
    const userEventInstance = userEvent.setup();
    renderManageMachine({
      entities: ['machine:manage', 'bypass_auth_entity'],
      userId: 1,
      userName: 'root_user',
    });
    expect(await screen.findByText('机器列表')).toBeInTheDocument();

    await userEventInstance.click(screen.getByRole('button', { name: /添加宿主机/ }));
    let dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByPlaceholderText('例如 GPU-A100-01'), { target: { value: 'gpu-new' } });
    fireEvent.change(within(dialog).getByPlaceholderText('192.168.x.x'), { target: { value: '10.0.0.10' } });
    fireEvent.change(within(dialog).getByPlaceholderText('可选，机器位置、用途或维护说明'), {
      target: { value: '机房 A' },
    });
    await userEventInstance.click(within(dialog).getByRole('button', { name: /^添\s*加$/ }));

    await waitFor(() => expect(registerMachine).toHaveBeenCalledTimes(1));
    expect(registerMachine.mock.calls[0][0]).toEqual({
      machine_name: 'gpu-new',
      machine_ip: '10.0.0.10',
      machine_description: '机房 A',
    });
    expect(registerMachine.mock.calls[0][0]).not.toHaveProperty('max_memory_gb');
    expect(registerMachine.mock.calls[0][0]).not.toHaveProperty('max_cpu_core_number');

    await userEventInstance.click(screen.getByRole('button', { name: /添加宿主机/ }));
    dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByPlaceholderText('例如 GPU-A100-01'), { target: { value: 'gpu-empty-desc' } });
    fireEvent.change(within(dialog).getByPlaceholderText('192.168.x.x'), { target: { value: '10.0.0.11' } });
    await userEventInstance.click(within(dialog).getByRole('button', { name: /^添\s*加$/ }));

    await waitFor(() => expect(registerMachine).toHaveBeenCalledTimes(2));
    expect(registerMachine.mock.calls[1][0].machine_description).toBe('');
  });

  it('test_machine_detail_update_failed_422_shows_route_chinese_with_numbers', async () => {
    const userEventInstance = userEvent.setup();
    updateMachine.mockRejectedValueOnce({
      status: 422,
      route: 'https://host/api/machines/update_machine',
      body: {
        success: 0,
        message: 'max_shared_gb 16GB cannot exceed max_memory_gb 8GB',
        error_reason: 'update_failed',
      },
    });
    renderMachineDetail({ entities: ['machine:manage'], userId: 1, userName: 'root_user' });
    expect(await screen.findByText('gpu-node-01')).toBeInTheDocument();

    await commitLimit('memory', 4);
    await userEventInstance.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(visibleModalText()).toContain('更新机器失败'));
    expect(visibleModalText()).toContain('请求参数校验失败，请修正后重试。');
    expect(visibleModalText()).toContain('max_shared_gb 16GB');
    expect(visibleModalText()).not.toContain('容器创建超限');
    expect(visibleModalText()).not.toContain('invalid_config');
  });

  it('test_machine_detail_invalid_payload_400_uses_machine_route_chinese', async () => {
    const userEventInstance = userEvent.setup();
    updateMachine.mockRejectedValueOnce({
      status: 400,
      route: 'https://host/api/machines/update_machine',
      body: {
        success: 0,
        message: 'invalid request',
        error_reason: 'invalid_payload',
      },
    });
    renderMachineDetail({ entities: ['machine:manage'], userId: 1, userName: 'root_user' });
    expect(await screen.findByText('gpu-node-01')).toBeInTheDocument();

    await commitLimit('memory', 4);
    await userEventInstance.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(visibleModalText()).toContain('机器配置限额参数无效'));
    expect(visibleModalText()).toContain('请求无效，请检查输入后重试。');
    expect(visibleModalText()).not.toContain('invalid_config');
  });

  it('test_machine_detail_responsive_dom_and_optional_metrics', async () => {
    const longMachine = machine({
      machine_name: 'gpu-node-with-a-very-long-name-that-must-wrap',
      machine_description: '这是一段很长的机器描述，用于验证窄屏卡片内的文本存在与控件接线，不声称真实像素布局。',
      runtime_snapshot: {
        collected_at: '2026-10-28T10:00:00Z',
        cpu: { usage_percent: 11 },
        memory: { usage_percent: 22 },
        disk: { percent: 33 },
        gpu: [{ index: 0, name: 'NVIDIA-H100-80GB-HBM3-very-long-no-space-name' }],
      },
    });
    const view = renderMachineDetail({ entities: ['machine:view'], userId: 1, userName: 'root_user' }, longMachine);
    expect(await screen.findByText(longMachine.machine_name)).toBeInTheDocument();
    expect(screen.getByText('硬件分配限制')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /保\s*存/ })).toBeInTheDocument();
    expect(screen.getByText(/NVIDIA-H100/)).toBeInTheDocument();
    view.unmount();

    const missing = machine({ runtime_snapshot: {}, gpu_number: 0, max_gpu_number: 0, gpu_allow_list: [] });
    getDetailInformation.mockResolvedValue(missing);
    renderMachineDetail({ entities: ['machine:view'], userId: 1, userName: 'root_user' }, missing);
    expect(await screen.findByText('gpu-node-01')).toBeInTheDocument();
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    expect(getDetailInformation).toHaveBeenCalledTimes(2);
    expect(screen.getByText('暂无 GPU')).toBeInTheDocument();
  });
});
const machineCardFor = (name = 'gpu-node-01') => screen.getByText(name).closest('.mm-machine-card');
const machineContainerCardFor = (name = 'train-a') => screen.getByText(name).closest('.mm-container-card');

describe('ManageMachine 路由、删除、解冻与静默刷新', () => {
  it('test_manage_machine_route_requires_bypass_and_renders_page', async () => {
    renderAppAt('/admin/machines', {
      entities: ['machine:manage'],
      userId: 1,
      userName: 'root_user',
    });
    await waitFor(() => expect(visibleModalText()).toContain('需要操作员权限'));
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/index'));
    cleanup();

    renderAppAt('/admin/machines', {
      entities: ['machine:manage', 'bypass_auth_entity'],
      userId: 1,
      userName: 'root_user',
    });
    expect(await screen.findByText('机器列表')).toBeInTheDocument();
    expect(screen.getByTestId('path')).toHaveTextContent('/admin/machines');
    expect(listAllMachineBrefInformation).toHaveBeenCalled();
  });

  it('test_manage_machine_delete_blocked_when_containers_remain', async () => {
    const userEventInstance = userEvent.setup();
    listAllContainerBrefInformation.mockImplementation(async (params = {}) => {
      if (params.page_size === 1) return { total_number: 3 };
      return { containers_info: [container()], total_number: 1, total_page: 1 };
    });
    renderManageMachine({
      entities: ['machine:manage', 'bypass_auth_entity'],
      userId: 1,
      userName: 'root_user',
    });
    expect(await screen.findByText('机器列表')).toBeInTheDocument();
    expect(await screen.findByText('gpu-node-01')).toBeInTheDocument();

    await userEventInstance.click(within(machineCardFor()).getByRole('button', { name: /删\s*除/ }));
    let dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('该机器仍有 3 个容器，请先手动清理后再删除。')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /^删\s*除$/ })).toBeDisabled();
    expect(removeMachine).not.toHaveBeenCalled();
    await userEventInstance.click(within(dialog).getByRole('button', { name: /取\s*消/ }));
    cleanup();

    removeMachine.mockClear();
    listAllContainerBrefInformation.mockImplementation(async (params = {}) => {
      if (params.page_size === 1) return { total_number: 0 };
      return { containers_info: [container()], total_number: 1, total_page: 1 };
    });
    renderManageMachine({
      entities: ['machine:manage', 'bypass_auth_entity'],
      userId: 1,
      userName: 'root_user',
    });
    expect(await screen.findByText('机器列表')).toBeInTheDocument();
    expect(await screen.findByText('gpu-node-01')).toBeInTheDocument();
    await userEventInstance.click(within(machineCardFor()).getByRole('button', { name: /删\s*除/ }));
    dialog = await screen.findByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: /^删\s*除$/ });
    await waitFor(() => expect(confirm).toBeEnabled());
    await userEventInstance.click(confirm);
    await waitFor(() => expect(removeMachine).toHaveBeenCalledWith([7]));
  });

  it('test_manage_machine_paused_card_unpause_matches_shared_resolution', async () => {
    const userEventInstance = userEvent.setup();
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [container({ effective_status: 'paused' })],
      total_number: 1,
      total_page: 1,
    });
    renderManageMachine({
      entities: ['container:manage', 'bypass_auth_entity'],
      userId: 1,
      userName: 'root_user',
    });
    expect(await screen.findByText('机器列表')).toBeInTheDocument();
    const card = await waitFor(() => machineContainerCardFor());
    const expected = resolveContainerActions({
      container: container({ effective_status: 'paused' }),
      context: { permissions: ['container:manage'], containerRole: null, readOnly: false },
    });
    expect(expected.actions.unpause).toMatchObject({ visible: true, enabled: true });
    const button = within(card).getByRole('button', { name: /解冻/ });
    expect(button).toBeEnabled();
    await userEventInstance.click(button);
    await userEventInstance.click(await screen.findByRole('button', { name: /确认解冻/ }));
    await waitFor(() => expect(unpauseContainer).toHaveBeenCalledWith(1));
    expect(messageSpies.success).toHaveBeenCalledWith('解冻指令已发送');
  });

  it('test_manage_machine_silent_refresh_updates_machine_and_role_keeps_page', async () => {
    const userEventInstance = userEvent.setup();
    const timerCallbacks = [];
    globalThis.setInterval.mockImplementation((callback) => {
      timerCallbacks.push(callback);
      return timerCallbacks.length;
    });
    const pageZero = [
      container({ container_id: 11, key: 11, container_name: 'online-a' }),
      container({ container_id: 12, key: 12, container_name: 'online-b' }),
      container({ container_id: 13, key: 13, container_name: 'online-c' }),
      container({ container_id: 14, key: 14, container_name: 'online-d' }),
    ];
    const pageOne = [
      container({
        container_id: 21,
        key: 21,
        container_name: 'paused-e',
        effective_status: 'paused',
        accounts: [ROOT_ACCOUNT, { ...ALICE_ACCOUNT, role: 'COLLABORATOR' }],
      }),
    ];
    const firstSnapshot = {
      cpu: { usage_percent: 11 },
      memory: { usage_percent: 22 },
      gpu: [{ utilization_gpu_percent: 33 }],
    };
    const secondSnapshot = {
      cpu: { usage_percent: 55 },
      memory: { usage_percent: 66 },
      gpu: [{ utilization_gpu_percent: 77 }],
    };
    listAllContainerBrefInformation.mockImplementation(async (params = {}) => {
      if (params.page_size === 1) return { total_number: 0 };
      if (params.page_number === 0 || params.page_number === undefined) {
        return { containers_info: pageZero, total_number: 6, total_page: 3 };
      }
      return { containers_info: pageOne, total_number: 6, total_page: 3 };
    });
    getDetailInformation.mockResolvedValue(machine({ runtime_snapshot: null }));
    renderManageMachine(
      { entities: ['container:operation', 'bypass_auth_entity'], userId: 2, userName: 'alice' },
      [machine({ runtime_snapshot: firstSnapshot })],
    );
    expect(await screen.findByText('机器列表')).toBeInTheDocument();
    expect(await screen.findByText('online-a')).toBeInTheDocument();
    await waitFor(() => {
      const meterCard = machineCardFor();
      expect(within(meterCard).getByText('11%')).toBeInTheDocument();
      expect(within(meterCard).getByText('22%')).toBeInTheDocument();
      expect(within(meterCard).getByText('33%')).toBeInTheDocument();
    });

    await userEventInstance.click(screen.getByRole('button', { name: '下一页' }));
    expect(await screen.findByText('paused-e')).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    expect(within(machineContainerCardFor('paused-e')).queryByRole('button', { name: /^停\s*止$/ })).toBeNull();

    listAllMachineBrefInformation.mockResolvedValue({
      machines: [machine({ machine_status: 'offline', runtime_snapshot: secondSnapshot })],
    });
    listAllContainerBrefInformation.mockImplementation(async (params = {}) => {
      if (params.page_size === 1) return { total_number: 0 };
      if (params.page_number === 0 || params.page_number === undefined) {
        return { containers_info: pageZero, total_number: 6, total_page: 3 };
      }
      return {
        containers_info: [container({
          container_id: 21,
          key: 21,
          container_name: 'paused-e',
          effective_status: 'paused',
          accounts: [ROOT_ACCOUNT, { ...ALICE_ACCOUNT, role: 'ADMIN' }],
        })],
        total_number: 6,
        total_page: 3,
      };
    });

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      for (const callback of timerCallbacks) await callback();
    });

    await waitFor(() => expect(screen.getByText('2 / 3')).toBeInTheDocument());
    expect(listAllMachineBrefInformation.mock.calls.length).toBeGreaterThanOrEqual(2);
    await waitFor(() => expect(within(machineContainerCardFor('paused-e')).getByRole('button', { name: /^停\s*止$/ })).toBeDisabled());
    await waitFor(() => {
      const meterCard = machineCardFor();
      expect(within(meterCard).getByText('55%')).toBeInTheDocument();
      expect(within(meterCard).getByText('66%')).toBeInTheDocument();
      expect(within(meterCard).getByText('77%')).toBeInTheDocument();
    });
  });
});
const manageUserContainer = (overrides = {}) => container({
  accounts: [ROOT_ACCOUNT, { user_id: 7, username: 'alice', role: 'COLLABORATOR' }],
  ...overrides,
});

const renderManageUserPage = (permission = {
  entities: ['bypass_auth_entity', 'user:manage', 'container:manage', 'rbac:manage'],
  userId: 1,
  userName: 'root_user',
}, users = [user()], containers = [manageUserContainer()]) => {
  listAllUserBrefInformation.mockResolvedValue({ users });
  listAllContainerBrefInformation.mockResolvedValue({
    containers_info: containers,
    total_number: containers.length,
    total_page: 1,
  });
  return renderPage(<ManageUser />, permission);
};

const manageUserCard = () => document.querySelector('.fuxi-nested-entity-card');
const manageUserContainerCard = (name = 'train-a') => screen.getByText(name).closest('.fuxi-nested-child-card');

describe('ManageUser 路由、权限组、失败与共享门禁', () => {
  it('test_manage_user_route_requires_bypass_and_renders_page', async () => {
    renderAppAt('/admin/users', {
      entities: ['user:manage'],
      userId: 1,
      userName: 'root_user',
    });
    await waitFor(() => expect(visibleModalText()).toContain('需要操作员权限'));
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/index'));
    cleanup();

    renderAppAt('/admin/users', {
      entities: ['user:manage', 'bypass_auth_entity'],
      userId: 1,
      userName: 'root_user',
    });
    expect(await screen.findByText('用户与容器关系')).toBeInTheDocument();
    expect(screen.getByTestId('path')).toHaveTextContent('/admin/users');
    expect(listAllUserBrefInformation).toHaveBeenCalled();
  });

  it('test_manage_user_replace_rbac_groups_submits_deduped_ids', async () => {
    const userEventInstance = userEvent.setup();
    getRbacMatrix.mockResolvedValue({ groups: [
      { id: 2, name: 'group-2', entity_codes: [] },
      { id: 2, name: 'group-2-duplicate', entity_codes: [] },
      { id: 5, name: 'group-5', entity_codes: [] },
    ] });
    getUserRbacGroups.mockResolvedValue({ group_ids: [2, 2, 5] });
    renderManageUserPage();

    await screen.findByText('\u7528\u6237\u4e0e\u5bb9\u5668\u5173\u7cfb');
    await waitFor(() => expect(manageUserCard()).not.toBeNull());
    await userEventInstance.click(within(manageUserCard()).getByRole('button', { name: /\u6743\u9650\u7ec4/ }));
    const dialog = await screen.findByRole('dialog');
    await within(dialog).findByText('group-5');
    await userEventInstance.click(within(dialog).getByRole('button', { name: /\u4fdd\s*\u5b58/ }));
    await waitFor(() => expect(setUserRbacGroups).toHaveBeenCalledWith(7, [2, 5]));
  });

  it('test_manage_user_reset_and_delete_keep_user_scope', async () => {
    const userEventInstance = userEvent.setup();
    resetPassword.mockResolvedValue({ new_password: 'pw-new' });
    renderManageUserPage();

    expect(await screen.findByText('用户与容器关系')).toBeInTheDocument();
    await waitFor(() => expect(manageUserCard()).not.toBeNull());
    await userEventInstance.click(within(manageUserCard()).getByRole('button', { name: /重\s*置/ }));
    let dialog = await screen.findByRole('dialog');
    await userEventInstance.click(within(dialog).getByRole('button', { name: /确认重置/ }));
    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith({ user_id: 7 }));
    await waitFor(() => expect(visibleModalText()).toContain('新密码：pw-new'));
    await closeErrorModals();

    await userEventInstance.click(within(manageUserCard()).getByRole('button', { name: /删\s*除/ }));
    dialog = await screen.findByRole('dialog');
    await userEventInstance.click(within(dialog).getByRole('button', { name: /确认删除/ }));
    await waitFor(() => expect(deleteUser).toHaveBeenCalledWith(7));
    expect(deleteContainer).not.toHaveBeenCalled();
  });

  it('test_manage_user_remove_offline_shows_chinese_guard_reason', async () => {
    const userEventInstance = userEvent.setup();
    removeCollaborator.mockRejectedValueOnce({
      status: 400,
      route: '/api/containers/remove_collaborator',
      body: {
        success: 0,
        message: 'Failed to remove collaborator',
        error_reason: 'container_offline',
      },
    });
    renderManageUserPage();

    expect(await screen.findByText('train-a')).toBeInTheDocument();
    await userEventInstance.click(within(manageUserContainerCard()).getByRole('button', { name: /解\s*除/ }));
    const dialog = await screen.findByRole('dialog');
    await userEventInstance.click(within(dialog).getByRole('button', { name: /确认移除/ }));

    await waitFor(() => expect(visibleModalText()).toContain('容器未在线，无法移除协作者'));
    expect(visibleModalText()).not.toContain('Failed to remove collaborator');
    expect(visibleModalText()).not.toContain('请求无效，请检查输入后重试');
  });

  it('test_manage_user_silent_refresh_updates_fields_keeps_page', async () => {
    const userEventInstance = userEvent.setup();
    const firstPage = [
      manageUserContainer({ container_id: 11, key: 11, container_name: 'train-a' }),
      manageUserContainer({ container_id: 12, key: 12, container_name: 'train-b' }),
      manageUserContainer({ container_id: 13, key: 13, container_name: 'train-c' }),
      manageUserContainer({ container_id: 14, key: 14, container_name: 'train-d' }),
    ];
    const secondPage = [
      manageUserContainer({
        container_id: 15,
        key: 15,
        container_name: 'train-e',
        accounts: [ROOT_ACCOUNT, { user_id: 7, username: 'alice', role: 'ADMIN' }],
        disk_total_gb: 140,
        disk_limit_gb: 160,
      }),
      manageUserContainer({ container_id: 16, key: 16, container_name: 'train-f' }),
    ];
    listAllUserBrefInformation
      .mockResolvedValueOnce({ users: [user({ amount_of_container: 6 })] })
      .mockResolvedValue({ users: [user({ amount_of_container: 7 })] });
    listAllContainerBrefInformation.mockImplementation(async (params = {}) => {
      if (params.page_number === 1) {
        return { containers_info: secondPage, total_number: 6, total_page: 2 };
      }
      return { containers_info: firstPage, total_number: 6, total_page: 2 };
    });
    renderPage(<ManageUser />, {
      entities: ['bypass_auth_entity', 'user:manage', 'container:manage'],
      userId: 1,
      userName: 'root_user',
    });

    expect(await screen.findByText('train-a')).toBeInTheDocument();
    await userEventInstance.click(screen.getByRole('button', { name: /下一页/ }));
    expect(await screen.findByText('train-e')).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => expect(screen.getByText('2 / 2')).toBeInTheDocument());
    await waitFor(() => expect(within(manageUserContainerCard('train-e')).getAllByText('管理员').length).toBeGreaterThan(0));
    expect(within(manageUserContainerCard('train-e')).getByText('磁盘 140G / 160G')).toBeInTheDocument();
    expect(listAllContainerBrefInformation.mock.calls.some(([params]) => params.page_number === 1 && params.page_size === 4)).toBe(true);
  });

  it('test_manage_user_shared_actions_match_other_pages', async () => {
    const userEventInstance = userEvent.setup();
    const onlineRoot = container({
      container_id: 30,
      key: 30,
      container_name: 'online-shared',
      effective_status: 'online',
      accounts: [ROOT_ACCOUNT],
    });
    const pausedLongTerm = container({
      container_id: 31,
      key: 31,
      container_name: 'paused-shared',
      effective_status: 'paused',
      is_long_term: true,
      accounts: [ROOT_ACCOUNT, { user_id: 7, username: 'alice', role: 'COLLABORATOR' }],
    });
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [onlineRoot, pausedLongTerm],
      total_number: 2,
      total_page: 1,
    });
    renderPage(<Home />, { entities: ['container:manage'], userId: 1, userName: 'root_user' });
    let onlineCard = (await screen.findByText('online-shared')).closest('.home-container-card');
    let pausedCard = screen.getByText('paused-shared').closest('.home-container-card');
    expect(within(onlineCard).getByRole('button', { name: /^启\s*动$/ })).toBeDisabled();
    expect(within(onlineCard).getByRole('button', { name: /^停\s*止$/ })).toBeEnabled();
    expect(within(onlineCard).getByRole('button', { name: /^重\s*启$/ })).toBeEnabled();
    expect(within(onlineCard).getByRole('checkbox')).toBeEnabled();
    expect(within(pausedCard).queryByRole('button', { name: /解冻/ })).toBeNull();
    expect(within(pausedCard).getByRole('checkbox')).toBeChecked();
    expect(within(pausedCard).getByRole('checkbox')).toBeDisabled();
    await userEventInstance.click(within(onlineCard).getByRole('button', { name: /详\s*情/ }));
    const detail = await screen.findByRole('dialog');
    expect(within(detail).getByRole('button', { name: /删除容器/ })).toBeEnabled();
    await userEventInstance.click(within(detail).getByRole('button', { name: /^关\s*闭$/ }));
    cleanup();

    listAllMachineBrefInformation.mockResolvedValue({ machines: [machine()] });
    renderManageMachine(
      { entities: ['container:manage', 'bypass_auth_entity'], userId: 1, userName: 'root_user' },
      [machine()],
    );
    expect(await screen.findByText('机器列表')).toBeInTheDocument();
    onlineCard = await waitFor(() => machineContainerCardFor('online-shared'));
    pausedCard = machineContainerCardFor('paused-shared');
    expect(within(onlineCard).getByRole('button', { name: /^启\s*动$/ })).toBeDisabled();
    expect(within(onlineCard).getByRole('button', { name: /^停\s*止$/ })).toBeEnabled();
    expect(within(onlineCard).getByRole('button', { name: /^重\s*启$/ })).toBeEnabled();
    expect(within(onlineCard).getByRole('checkbox')).toBeEnabled();
    expect(within(pausedCard).getByRole('button', { name: /解冻/ })).toBeEnabled();
    expect(within(pausedCard).getByRole('checkbox')).toBeChecked();
    expect(within(pausedCard).getByRole('checkbox')).toBeDisabled();
    expect(within(onlineCard).queryByRole('button', { name: /删\s*除/ })).toBeNull();
    expect(within(pausedCard).queryByRole('button', { name: /删\s*除/ })).toBeNull();
    cleanup();

    renderManageUserPage(
      { entities: ['bypass_auth_entity', 'user:manage', 'container:manage'], userId: 1, userName: 'root_user' },
      [user()],
      [onlineRoot, pausedLongTerm],
    );
    expect(await screen.findByText('online-shared')).toBeInTheDocument();
    onlineCard = manageUserContainerCard('online-shared');
    pausedCard = manageUserContainerCard('paused-shared');
    expect(within(onlineCard).getByRole('button', { name: /^启\s*动$/ })).toBeDisabled();
    expect(within(onlineCard).getByRole('button', { name: /^停\s*止$/ })).toBeEnabled();
    expect(within(onlineCard).getByRole('button', { name: /^重\s*启$/ })).toBeEnabled();
    expect(within(onlineCard).getByRole('checkbox')).toBeEnabled();
    expect(within(pausedCard).getByRole('button', { name: /解冻/ })).toBeEnabled();
    expect(within(pausedCard).getByRole('checkbox')).toBeChecked();
    expect(within(pausedCard).getByRole('checkbox')).toBeDisabled();
    expect(within(onlineCard).queryByRole('button', { name: /删\s*除/ })).toBeNull();
    expect(within(pausedCard).queryByRole('button', { name: /删\s*除/ })).toBeNull();
  });

  it('test_manage_user_paused_long_term_cancel_disabled_with_reason', async () => {
    const pausedLongTerm = manageUserContainer({
      container_id: 31,
      key: 31,
      container_name: 'paused-long-term',
      effective_status: 'paused',
      is_long_term: true,
      freeze_state: { is_frozen: true, days_frozen: 2 },
    });
    renderManageUserPage(undefined, [user()], [pausedLongTerm]);
    expect(await screen.findByText('paused-long-term')).toBeInTheDocument();
    const checkbox = within(manageUserContainerCard('paused-long-term')).getByRole('checkbox');
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeDisabled();
    expect(checkbox.closest('label')?.querySelector('[title]')).toHaveAttribute('title', '容器已冻结');
  });

  it('test_manage_user_container_title_does_not_select_user_row', async () => {
    const userEventInstance = userEvent.setup();
    listAllUserBrefInformation.mockResolvedValue({ users: [user()] });
    listAllContainerBrefInformation.mockResolvedValue({
      containers_info: [manageUserContainer()],
      total_number: 1,
      total_page: 1,
    });
    installPermission({
      entities: ['bypass_auth_entity', 'user:manage', 'container:manage'],
      userId: 1,
      userName: 'root_user',
    });
    render(
      <MemoryRouter>
        <PermissionProvider>
          <PermissionReady>
            <ManageUser />
            <LocationProbe />
          </PermissionReady>
        </PermissionProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText('train-a')).toBeInTheDocument();
    const card = manageUserCard();
    await userEventInstance.click(card);
    expect(card).toHaveClass('fuxi-nested-entity-card-selected');
    await userEventInstance.click(within(manageUserContainerCard()).getByRole('button', { name: 'train-a' }));
    expect(screen.getByTestId('path')).toHaveTextContent('/index/containers/1');
    expect(manageUserCard()).toHaveClass('fuxi-nested-entity-card-selected');
  });

  it('test_manage_user_admin_and_manage_operator_start_stop_matrix', async () => {
    const onlineContainer = manageUserContainer({
      container_id: 41,
      key: 41,
      container_name: 'online-action',
      effective_status: 'online',
    });
    const offlineContainer = manageUserContainer({
      container_id: 42,
      key: 42,
      container_name: 'offline-action',
      effective_status: 'offline',
    });

    renderManageUserPage(
      { entities: ['bypass_auth_entity', 'user:manage', 'container:manage'], userId: 1, userName: 'root_user' },
      [user()],
      [onlineContainer, offlineContainer],
    );
    expect(await screen.findByText('online-action')).toBeInTheDocument();
    let onlineCard = manageUserContainerCard('online-action');
    let offlineCard = manageUserContainerCard('offline-action');
    expect(within(onlineCard).getByRole('button', { name: /^停\s*止$/ })).toBeEnabled();
    expect(within(onlineCard).getByRole('button', { name: /^启\s*动$/ })).toBeDisabled();
    expect(within(offlineCard).getByRole('button', { name: /^启\s*动$/ })).toBeEnabled();
    expect(within(offlineCard).getByRole('button', { name: /^停\s*止$/ })).toBeDisabled();
    cleanup();

    const adminOnline = manageUserContainer({
      container_id: 51,
      key: 51,
      container_name: 'admin-online',
      effective_status: 'online',
      accounts: [ROOT_ACCOUNT, { user_id: 7, username: 'alice', role: 'ADMIN' }],
    });
    const adminOffline = manageUserContainer({
      container_id: 52,
      key: 52,
      container_name: 'admin-offline',
      effective_status: 'offline',
      accounts: [ROOT_ACCOUNT, { user_id: 7, username: 'alice', role: 'ADMIN' }],
    });
    renderManageUserPage(
      { entities: ['bypass_auth_entity', 'user:manage', 'container:operation'], userId: 1, userName: 'root_user' },
      [user()],
      [adminOnline, adminOffline],
    );
    expect(await screen.findByText('admin-online')).toBeInTheDocument();
    onlineCard = manageUserContainerCard('admin-online');
    offlineCard = manageUserContainerCard('admin-offline');
    expect(within(onlineCard).getByRole('button', { name: /^停\s*止$/ })).toBeEnabled();
    expect(within(onlineCard).getByRole('button', { name: /^启\s*动$/ })).toBeDisabled();
    expect(within(offlineCard).getByRole('button', { name: /^启\s*动$/ })).toBeEnabled();
    expect(within(offlineCard).getByRole('button', { name: /^停\s*止$/ })).toBeDisabled();
  });
});

const inTableLongTerm = (overrides = {}) => ({
  stateKnown: true,
  direction: 'disable',
  actionKey: 'long_term_disable',
  checked: true,
  visible: true,
  enabled: true,
  disabled: false,
  reason: null,
  loading: false,
  pending: false,
  ...overrides,
});

const inTableProps = (overrides = {}) => ({
  dataSource: [user()],
  usersLoading: false,
  expandedRowKeys: ['7'],
  setExpandedRowKeys: () => {},
  selectedRowKey: '7',
  setSelectedRowKey: () => {},
  fetchContainersForUser: () => {},
  getUserContainers: () => [container({
    key: '12',
    container_id: 12,
    container_name: 'train-a',
    userRole: 'COLLABORATOR',
    longTerm: inTableLongTerm(),
  })],
  containerMap: {
    7: {
      data: [container({ key: '12', container_id: 12, container_name: 'train-a' })],
      loading: false,
      total_number: 1,
      total_page: 1,
      page: 0,
      page_size: 4,
    },
  },
  handleLongTermChange: () => {},
  handleRemoveUserFromContainer: () => {},
  handleDeleteUser: () => {},
  handleResetPassword: () => {},
  showUserGroupsAction: false,
  handleOpenUserGroups: () => {},
  toggleExpand: () => {},
  renderContainerStatus: status => <span>{status}</span>,
  renderContainerRoleTag: role => <span>{role}</span>,
  EditUserRow: () => <div>editor</div>,
  ...overrides,
});

describe('ManageUserInTable 移动与 paused 长期列', () => {
  it('test_manage_user_in_table_mobile_expands_real_cards', async () => {
    const original = window.matchMedia;
    window.matchMedia = () => ({
      matches: true,
      media: '(max-width: 768px)',
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() { return false; },
    });
    render(<ManageUserInTable {...inTableProps()} />);

    expect(await screen.findByText('alice')).toBeInTheDocument();
    expect(screen.getByText('train-a')).toBeInTheDocument();
    expect(document.querySelector('.app-table-mobile-card')).not.toBeNull();
    expect(document.querySelector('.manage-user-expanded')).not.toBeNull();
    window.matchMedia = original;
  });

  it('test_manage_user_in_table_paused_long_term_renders_parent_disabled', async () => {
    const pausedLongTerm = inTableLongTerm({
      enabled: false,
      disabled: true,
      reason: 'container_paused',
    });
    render(<ManageUserInTable {...inTableProps({
      getUserContainers: () => [container({
        key: '12',
        container_id: 12,
        container_name: 'train-a',
        userRole: 'COLLABORATOR',
        longTerm: pausedLongTerm,
      })],
    })} />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeDisabled();
    expect(checkbox.closest('label')?.querySelector('[title]')).toHaveAttribute('title', '容器已冻结');
  });
});
