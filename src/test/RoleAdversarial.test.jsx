import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';

const antdMessage = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  loading: vi.fn(),
}));

vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal();
  return { ...antd, message: antdMessage };
});

vi.mock('../contexts/PermissionContext', () => ({
  usePermission: () => ({
    entities: ['container:operation', 'container:manage'],
    userId: 1,
    userName: 'root_user',
    loaded: true,
    hasPermission: () => true,
  }),
}));

vi.mock('../utils/showErrorModal', () => ({ default: vi.fn() }));

// 只 mock 与 ROOT 交接无关的 API；updateRole 保留真实实现，连到受控 fetch。
vi.mock('../api/container_api', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    addCollaborator: vi.fn(),
    deleteContainer: vi.fn(),
    getContainerDetailInformation: vi.fn(),
    getContainerOperationLogs: vi.fn(),
    removeCollaborator: vi.fn(),
    resetContainerPassword: vi.fn(),
    restartContainer: vi.fn(),
    setLongTermContainer: vi.fn(),
    startContainer: vi.fn(),
    stopContainer: vi.fn(),
    unpauseContainer: vi.fn(),
  };
});

vi.mock('../api/user_api', () => ({
  listAllUserBrefInformation: vi.fn(),
}));

import {
  getContainerDetailInformation,
  getContainerOperationLogs,
  updateRole,
} from '../api/container_api';
import { listAllUserBrefInformation } from '../api/user_api';
import showErrorModal from '../utils/showErrorModal';
import ContainerDetailPage from '../pages/ContainerDetailPage';
import EditUserModal from '../components/EditUserModal';

const SEED = 0x5eed1234;
const seededOrder = (items, seed = SEED) => {
  let state = seed >>> 0;
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const credential = (loginName, password) => ({ login_name: loginName, password });
const rootCredential = credential('root', 'pw-root-adversarial');
const ownerA = credential('owner_a', 'pw-owner-a');
const ownerB = credential('legacy_owner_b', 'pw-owner-b');

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
const detailB = detail({
  container_id: 13,
  container_name: 'train-b',
  accounts: [
    { user_id: 1, username: 'root_user', role: 'ROOT' },
    { user_id: 3, username: 'bob', role: 'COLLABORATOR' },
  ],
});
const users = [
  { id: 1, username: 'root_user', name: 'Root User' },
  { id: 2, username: 'alice', name: 'Alice' },
  { id: 3, username: 'bob', name: 'Bob' },
];
const editContainer = {
  key: 12,
  container_id: 12,
  container_name: 'train-a',
  accounts,
};

const apiResponse = (body, { status = 200 } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: 'status',
  url: 'http://localhost/api/containers/update_role',
  json: async () => body,
  text: async () => JSON.stringify(body),
});

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

const renderDetail = () => render(
  <MemoryRouter initialEntries={['/index/containers/12']}>
    <Routes>
      <Route path="/index/containers/:containerId" element={<ContainerDetailPage />} />
    </Routes>
  </MemoryRouter>,
);

const DetailWithNavigation = () => {
  const navigate = useNavigate();
  return (
    <>
      <ContainerDetailPage />
      <button type="button" onClick={() => navigate('/index/containers/13')}>go-container-13</button>
      <button type="button" onClick={() => navigate('/index/containers/12')}>go-container-12</button>
    </>
  );
};

const renderDetailWithNavigation = () => render(
  <MemoryRouter initialEntries={['/index/containers/12']}>
    <Routes>
      <Route path="/index/containers/:containerId" element={<DetailWithNavigation />} />
    </Routes>
  </MemoryRouter>,
);

const HomeModalHarness = ({ onCredentialAccepted }) => {
  const [visible, setVisible] = useState(true);
  return (
    <EditUserModal
      visible={visible}
      container={editContainer}
      usersList={users}
      onClose={() => setVisible(false)}
      onBack={() => setVisible(false)}
      onCredentialAccepted={onCredentialAccepted}
    />
  );
};

const clickOption = async (text) => {
  await waitFor(() => {
    expect([...document.querySelectorAll('.ant-select-item-option')].some(el => el.textContent.includes(text))).toBe(true);
  });
  const option = [...document.querySelectorAll('.ant-select-item-option')].find(el => el.textContent.includes(text));
  await userEvent.click(option);
};

const selectDetailRole = async (optionName) => {
  const combos = [...document.querySelectorAll('.container-people-actions [role="combobox"]')].filter(el => !el.disabled);
  const combo = combos[combos.length - 1];
  fireEvent.mouseDown(combo.closest('.ant-select')?.querySelector('.ant-select-selector') || combo);
  await clickOption(optionName);
};

const selectEditRole = async (optionName) => {
  const combos = [...document.querySelectorAll('.eum-modal [role="combobox"]')].filter(el => !el.disabled);
  const combo = combos[combos.length - 1];
  fireEvent.mouseDown(combo.closest('.ant-select')?.querySelector('.ant-select-selector') || combo);
  await clickOption(optionName);
};

const aliceRoleSelect = () => {
  const selects = [...document.querySelectorAll('.eum-role-select')];
  return selects[selects.length - 1];
};

const isSelectDisabled = (select) => {
  const input = select?.querySelector('[role="combobox"]');
  return Boolean(select?.classList.contains('ant-select-disabled') || input?.disabled);
};

const peopleRow = (username, id) => screen.getByText(`@${username} · ID ${id}`).closest('.container-people-item');

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();

  getContainerDetailInformation.mockReset();
  getContainerOperationLogs.mockReset();
  listAllUserBrefInformation.mockReset();
  showErrorModal.mockReset();

  getContainerDetailInformation.mockImplementation(async (id) => ({
    container_info: Number(id) === 13 ? detailB : detail(),
  }));
  getContainerOperationLogs.mockResolvedValue({ logs: [] });
  listAllUserBrefInformation.mockResolvedValue({ users });

  vi.spyOn(globalThis, 'setInterval').mockImplementation(() => 1);
  vi.spyOn(globalThis, 'clearInterval').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  cleanup();
});

describe('update_role API 对抗', () => {
  it('test_api_root_two_concurrent_out_of_order_responses_keep_results_isolated', async () => {
    const pending = [];
    const fetchMock = vi.fn(() => {
      const request = deferred();
      pending.push(request);
      return request.promise;
    });
    vi.stubGlobal('fetch', fetchMock);

    const first = updateRole({ container_id: 12, user_id: 2, updated_role: 'ROOT' });
    const second = updateRole({ container_id: 13, user_id: 3, updated_role: 'ROOT' });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const firstCredentials = seededOrder([ownerA, rootCredential], SEED);
    const secondCredentials = seededOrder([ownerB, ownerA, rootCredential], SEED ^ 0x9e3779b9);
    pending[1].resolve(apiResponse({ success: 1, accepted: true, credentials: secondCredentials }));
    await expect(second).resolves.toMatchObject({ credentials: secondCredentials });
    pending[0].resolve(apiResponse({ success: 1, accepted: true, credentials: firstCredentials }));
    await expect(first).resolves.toMatchObject({ credentials: firstCredentials });

    const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(init.body));
    expect(bodies).toEqual([
      { container_id: 12, user_id: 2, updated_role: 'ROOT' },
      { container_id: 13, user_id: 3, updated_role: 'ROOT' },
    ]);
    bodies.forEach(body => expect(body).not.toHaveProperty('transfer_root'));
  });

  it('test_api_root_omits_flag_and_consumes_seeded_two_and_n_plus_one', async () => {
    const two = seededOrder([ownerA, rootCredential], SEED);
    const three = seededOrder([ownerA, ownerB, rootCredential], SEED ^ 0x85ebca6b);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(apiResponse({ success: 1, accepted: true, credentials: two }))
      .mockResolvedValueOnce(apiResponse({ success: 1, accepted: true, credentials: three }));
    vi.stubGlobal('fetch', fetchMock);

    const first = await updateRole({ container_id: 12, user_id: 2, updated_role: 'ROOT' });
    const second = await updateRole({ container_id: 12, user_id: 2, updated_role: 'ROOT' });
    expect(first.credentials).toEqual(two);
    expect(second.credentials).toEqual(three);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    fetchMock.mock.calls.forEach(([, init]) => {
      const body = JSON.parse(init.body);
      expect(body).toEqual({ container_id: 12, user_id: 2, updated_role: 'ROOT' });
      expect(body).not.toHaveProperty('transfer_root');
    });
  });

  it.each([
    { label: 'single', credentials: [rootCredential] },
    { label: 'empty', credentials: [] },
    { label: 'duplicate-login', credentials: [ownerA, { ...rootCredential, login_name: ownerA.login_name }] },
    { label: 'duplicate-password', credentials: [ownerA, { ...rootCredential, password: ownerA.password }] },
  ])('test_api_root_rejects_$label', async ({ credentials }) => {
    const fetchMock = vi.fn().mockResolvedValueOnce(apiResponse({
      success: 1,
      accepted: true,
      credentials,
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(updateRole({ container_id: 12, user_id: 2, updated_role: 'ROOT' })).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('test_api_root_error_with_sensitive_message_and_credentials_is_sanitized', async () => {
    const secret = 'pw-sensitive-adversarial';
    const fetchMock = vi.fn().mockResolvedValueOnce(apiResponse({
      success: 0,
      error_reason: 'invalid_config',
      message: `请求失败：${secret}`,
      credentials: [credential('root', secret)],
      root_password: secret,
    }, { status: 400 }));
    vi.stubGlobal('fetch', fetchMock);

    let error;
    try {
      await updateRole({ container_id: 12, user_id: 2, updated_role: 'ROOT' });
    } catch (err) {
      error = err;
    }
    expect(error).toBeTruthy();
    expect(error.status).toBe(400);
    expect(error.message).not.toContain(secret);
    expect(JSON.stringify(error)).not.toContain(secret);
    expect(error.body).toBeUndefined();
    expect(error.credentials).toBeUndefined();
  });
});

describe('详情页 ROOT 晚到、失败与异常响应', () => {
  it('test_detail_root_late_credentials_after_route_switch_do_not_render_on_new_container', async () => {
    const pending = [];
    const fetchMock = vi.fn(() => {
      const request = deferred();
      pending.push(request);
      return request.promise;
    });
    vi.stubGlobal('fetch', fetchMock);

    renderDetailWithNavigation();
    await screen.findByText('train-a');
    await selectDetailRole('超级管理员');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole('button', { name: 'go-container-13' }));
    await screen.findByText('train-b');

    await act(async () => {
      pending[0].resolve(apiResponse({
        success: 1,
        accepted: true,
        credentials: seededOrder([ownerA, rootCredential], SEED),
      }));
      await pending[0].promise;
    });
    // 旧请求 finally 释放 peopleSaving 后才允许新页角色操作；不依赖旧成功 toast 作为信号。
    await waitFor(() => {
      const combos = [...document.querySelectorAll('.container-people-actions [role="combobox"]')];
      expect(combos.some(el => !el.disabled)).toBe(true);
    });
    await flush();

    expect(screen.queryByText('重置后owner_a的密码：')).not.toBeInTheDocument();
    expect(screen.queryByText('重置后root的密码：')).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain(ownerA.password);
    expect(document.body.textContent).not.toContain(rootCredential.password);
    expect(antdMessage.success).not.toHaveBeenCalledWith('ROOT 交接请求已受理');
  });

  it('test_detail_open_credentials_are_closed_when_container_changes', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(apiResponse({
      success: 1,
      accepted: true,
      credentials: seededOrder([ownerA, rootCredential], SEED),
    }));
    vi.stubGlobal('fetch', fetchMock);

    renderDetailWithNavigation();
    await screen.findByText('train-a');
    await selectDetailRole('超级管理员');
    expect(await screen.findByText('重置后owner_a的密码：')).toBeInTheDocument();
    expect(await screen.findByText('重置后root的密码：')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'go-container-13' }));
    await screen.findByText('train-b');
    await flush();

    expect(screen.queryByText('重置后owner_a的密码：')).not.toBeInTheDocument();
    expect(screen.queryByText('重置后root的密码：')).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain(ownerA.password);
    expect(document.body.textContent).not.toContain(rootCredential.password);
  });

  it('test_detail_reset_confirm_is_cleared_when_container_changes', async () => {
    renderDetailWithNavigation();
    await screen.findByText('train-a');
    await userEvent.click(screen.getAllByRole('button', { name: '重置密码' })[1]);
    expect(await screen.findByText('确认重置密码')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'go-container-13' }));
    await screen.findByText('train-b');
    await flush();

    await waitFor(() => {
      const confirmButton = screen.queryByRole('button', { name: /确认重置/ });
      if (confirmButton) expect(confirmButton).not.toBeVisible();
    });
  });

  it('test_detail_old_root_response_after_returning_to_same_container_is_rejected', async () => {
    const pending = [];
    const fetchMock = vi.fn(() => {
      const request = deferred();
      pending.push(request);
      return request.promise;
    });
    vi.stubGlobal('fetch', fetchMock);

    renderDetailWithNavigation();
    await screen.findByText('train-a');
    await selectDetailRole('超级管理员');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'go-container-13' }));
    await screen.findByText('train-b');
    fireEvent.click(screen.getByRole('button', { name: 'go-container-12' }));
    await screen.findByText('train-a');

    await act(async () => {
      pending[0].resolve(apiResponse({
        success: 1,
        accepted: true,
        credentials: seededOrder([ownerA, rootCredential], SEED),
      }));
      await pending[0].promise;
    });
    await waitFor(() => {
      const combos = [...document.querySelectorAll('.container-people-actions [role="combobox"]')];
      expect(combos.some(el => !el.disabled)).toBe(true);
    });
    await flush();

    expect(screen.queryByText('重置后owner_a的密码：')).not.toBeInTheDocument();
    expect(screen.queryByText('重置后root的密码：')).not.toBeInTheDocument();
    expect(antdMessage.success).not.toHaveBeenCalledWith('ROOT 交接请求已受理');
    expect(document.body.textContent).not.toContain(ownerA.password);
    expect(document.body.textContent).not.toContain(rootCredential.password);
  });

  it('test_detail_root_late_credentials_after_unmount_do_not_render', async () => {
    const pending = [];
    const fetchMock = vi.fn(() => {
      const request = deferred();
      pending.push(request);
      return request.promise;
    });
    vi.stubGlobal('fetch', fetchMock);

    const { unmount } = renderDetail();
    await screen.findByText('train-a');
    await selectDetailRole('超级管理员');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    unmount();
    await act(async () => {
      pending[0].resolve(apiResponse({
        success: 1,
        accepted: true,
        credentials: seededOrder([ownerA, rootCredential], SEED),
      }));
      await pending[0].promise;
    });
    await flush();

    expect(document.body.textContent).not.toContain(ownerA.password);
    expect(document.body.textContent).not.toContain(rootCredential.password);
  });

  it('test_detail_root_rejection_does_not_fake_success_or_credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(apiResponse({
      success: 0,
      error_reason: 'container_offline',
      message: '容器离线',
    }, { status: 409 }));
    vi.stubGlobal('fetch', fetchMock);

    renderDetail();
    await screen.findByText('train-a');
    await selectDetailRole('超级管理员');
    await waitFor(() => expect(showErrorModal).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({ container_id: 12, user_id: 2, updated_role: 'ROOT' });
    expect(body).not.toHaveProperty('transfer_root');
    expect(antdMessage.success).not.toHaveBeenCalledWith('ROOT 交接请求已受理');
    expect(antdMessage.success).not.toHaveBeenCalledWith('角色已更新');
    expect(screen.queryByText(/重置后/)).not.toBeInTheDocument();

    const aliceRow = peopleRow('alice', 2);
    expect(within(aliceRow).getAllByText('协作者').length).toBeGreaterThan(0);
    expect(within(aliceRow).queryByText('超级管理员')).toBeNull();
  });

  it('test_detail_non_root_two_credentials_do_not_open_root_handover_modal', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(apiResponse({
      success: 1,
      accepted: true,
      credentials: seededOrder([ownerA, rootCredential], SEED),
    }));
    vi.stubGlobal('fetch', fetchMock);

    renderDetail();
    await screen.findByText('train-a');
    await selectDetailRole('管理员');
    await waitFor(() => expect(antdMessage.success).toHaveBeenCalledWith('角色已更新'));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({ container_id: 12, user_id: 2, updated_role: 'ADMIN' });
    expect(body).not.toHaveProperty('transfer_root');
    expect(screen.queryByText(/重置后/)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain(ownerA.password);
    expect(document.body.textContent).not.toContain(rootCredential.password);
  });
});

describe('Home/EditUserModal ROOT 重复提交对抗', () => {
  it('test_home_root_pending_disables_duplicate_and_closed_modal_ignores_late_credentials', async () => {
    const pending = [];
    const fetchMock = vi.fn(() => {
      const request = deferred();
      pending.push(request);
      return request.promise;
    });
    const onCredentialAccepted = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    render(<HomeModalHarness onCredentialAccepted={onCredentialAccepted} />);
    await screen.findByRole('dialog');
    await selectEditRole('超级管理员');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await flush();

    const disabled = isSelectDisabled(aliceRoleSelect());
    if (!disabled) {
      // 旧实现允许在途再次选 ROOT；保留该路径以复现重复 update_role。
      await selectEditRole('超级管理员');
      await flush();
    }
    const callCount = fetchMock.mock.calls.length;
    fetchMock.mock.calls.forEach(([, init]) => {
      expect(JSON.parse(init.body)).not.toHaveProperty('transfer_root');
    });

    await userEvent.click(screen.getByRole('button', { name: /完\s*成/ }));
    await flush();

    await act(async () => {
      pending.forEach((request) => request.resolve(apiResponse({
        success: 1,
        accepted: true,
        credentials: seededOrder([ownerA, rootCredential], SEED),
      })));
      await Promise.all(pending.map((request) => request.promise));
    });
    await flush();
    const callbackCount = onCredentialAccepted.mock.calls.length;
    cleanup();

    expect(callCount).toBe(1);
    expect(disabled).toBe(true);
    expect(callbackCount).toBe(0);
  });
});
