import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';

const permissionState = vi.hoisted(() => ({
  entities: ['container:operation', 'container:manage'],
  userId: 1,
  userName: 'root_user',
  containerResourceUnrestricted: false,
}));

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
    ...permissionState,
    loaded: true,
    hasPermission: code => permissionState.entities.includes(code),
  }),
}));

vi.mock('../api/user_api', () => ({
  listAllUserBrefInformation: vi.fn(),
}));

vi.mock('../configs/backend_config', () => ({
  BACKEND_ORIGIN: 'http://localhost',
  REQUEST_TIMEOUT: 300,
  MOUNT_USAGE_TIMEOUT: 300,
  POLL_TIMEOUT: 300,
  CREDENTIALS: 'include',
  API_ROUTES: {
    CONTAINERS_CREATE: '/api/containers/create_container',
    CONTAINERS_DELETE: '/api/containers/delete_container',
    CONTAINERS_ADD_COLLABORATOR: '/api/containers/add_collaborator',
    CONTAINERS_REMOVE_COLLABORATOR: '/api/containers/remove_collaborator',
    CONTAINERS_UPDATE_ROLE: '/api/containers/update_role',
    CONTAINERS_RESET_PASSWORD: '/api/containers/reset_container_password',
    CONTAINERS_GET_DETAIL: '/api/containers/get_container_detail_information',
    CONTAINERS_OPERATION_LOGS: '/api/containers/get_container_operation_logs',
    CONTAINERS_STATUS: '/api/containers/container_status',
    CONTAINERS_LIST: '/api/containers/list_all_container_bref_information',
    CONTAINERS_START: '/api/containers/start_container',
    CONTAINERS_STOP: '/api/containers/stop_container',
    CONTAINERS_RESTART: '/api/containers/restart_container',
    CONTAINERS_UNPAUSE: '/api/containers/unpause_container',
    CONTAINERS_SET_LONG_TERM: '/api/containers/set_long_term_container',
    CONTAINERS_LIST_DELETED: '/api/containers/list_deleted_containers',
    CONTAINERS_GET_DELETED_MOUNT_USAGE: '/api/containers/get_deleted_container_mount_usage',
    CONTAINERS_CLEAN_DELETED_MOUNT: '/api/containers/clean_deleted_container_mount',
    CONTAINERS_RESURRECT_DELETED: '/api/containers/resurrect_container',
  },
}));

import { listAllUserBrefInformation } from '../api/user_api';
import { message } from 'antd';
import ContainerDetailPage from '../pages/ContainerDetailPage';
import CredentialModal from '../components/CredentialModal';

vi.setConfig({ testTimeout: 30000 });

const PATH = {
  detail: '/api/containers/get_container_detail_information',
  logs: '/api/containers/get_container_operation_logs',
  add: '/api/containers/add_collaborator',
  remove: '/api/containers/remove_collaborator',
  update: '/api/containers/update_role',
  reset: '/api/containers/reset_container_password',
  start: '/api/containers/start_container',
  stop: '/api/containers/stop_container',
  restart: '/api/containers/restart_container',
  unpause: '/api/containers/unpause_container',
  delete: '/api/containers/delete_container',
  longTerm: '/api/containers/set_long_term_container',
};

const accounts = [
  { user_id: 1, username: 'root_user', role: 'ROOT' },
  { user_id: 2, username: 'alice', role: 'COLLABORATOR' },
];

const users = [
  { id: 1, username: 'root_user', name: 'Root User' },
  { id: 2, username: 'alice', name: 'Alice' },
  { id: 3, username: 'bob', name: 'Bob' },
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
  disk_usage: { total_gb: 10, limit_gb: 100 },
  accounts,
  runtime_metrics: {},
  ...overrides,
});

const jsonResponse = (body, { status = 200, url = 'http://localhost/api/test' } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: 'status',
  url,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

const detailResponse = (overrides = {}) => jsonResponse({
  success: 1,
  container_info: detail(overrides),
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

const fetchState = {
  detail: [],
  logs: [],
  handlers: {},
  defaultDetail: null,
};

const fetchMock = vi.fn((url, init = {}) => {
  const path = new URL(url).pathname;
  const respond = (value) => Promise.resolve(value).then((response) => (
    response && typeof response === 'object'
      ? { ...response, url: String(url) }
      : response
  ));
  if (fetchState.handlers[path]) return respond(fetchState.handlers[path](url, init));
  if (path.endsWith(PATH.detail)) {
    const next = fetchState.detail.shift();
    if (typeof next === 'function') return respond(next());
    return respond(next || jsonResponse({
      success: 1,
      container_info: fetchState.defaultDetail || detail(),
    }));
  }
  if (path.endsWith(PATH.logs)) {
    const next = fetchState.logs.shift();
    if (typeof next === 'function') return respond(next());
    return respond(next || jsonResponse({ success: 1, logs: [] }));
  }
  return respond(jsonResponse({ success: 1 }));
});

const callsTo = (suffix) => fetchMock.mock.calls.filter(([url]) => String(url).includes(suffix));

const bodyOf = (call) => JSON.parse(call[1].body || '{}');

const resetPageState = () => {
  fetchState.detail = [];
  fetchState.logs = [];
  fetchState.handlers = {};
  fetchState.defaultDetail = detail();
  permissionState.entities = ['container:operation', 'container:manage'];
  permissionState.userId = 1;
  permissionState.userName = 'root_user';
  permissionState.containerResourceUnrestricted = false;
  listAllUserBrefInformation.mockResolvedValue({ users });
  fetchMock.mockClear();
};

const renderDetail = (containerId = 12, { withNavigation = false } = {}) => {
  const DetailWithNavigation = () => {
    const navigate = useNavigate();
    return (
      <>
        <ContainerDetailPage />
        <button type="button" onClick={() => navigate('/index/containers/13')}>go-13</button>
        <button type="button" onClick={() => navigate('/index/containers/12')}>go-12</button>
      </>
    );
  };
  return render(
    <MemoryRouter initialEntries={[`/index/containers/${containerId}`]}>
      <Routes>
        <Route
          path="/index/containers/:containerId"
          element={withNavigation ? <DetailWithNavigation /> : <ContainerDetailPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
};

const waitForDetail = async (name = 'train-a') => {
  expect(await screen.findByText(name)).toBeInTheDocument();
};

const operationCard = () => screen.getByText('容器操作').closest('.container-operations-card');

const clickOption = async (text) => {
  await waitFor(() => {
    expect([...document.querySelectorAll('.ant-select-item-option')].some(el => el.textContent.includes(text))).toBe(true);
  });
  const option = [...document.querySelectorAll('.ant-select-item-option')].find(el => el.textContent.includes(text));
  await userEvent.click(option);
};

const selectAddUser = async (text = 'bob') => {
  fireEvent.mouseDown(document.querySelector('.container-people-add .ant-select-selector'));
  await clickOption(text);
};

const selectAddRole = async (text) => {
  const selectors = document.querySelectorAll('.container-people-add .ant-select-selector');
  fireEvent.mouseDown(selectors[1]);
  await clickOption(text);
};

const selectPeopleRole = async (text) => {
  const combos = [...document.querySelectorAll('.container-people-actions [role="combobox"]')].filter(el => !el.disabled);
  const combo = combos[combos.length - 1];
  fireEvent.mouseDown(combo.closest('.ant-select')?.querySelector('.ant-select-selector') || combo);
  await clickOption(text);
};

const waitForErrorDialog = async () => {
  const button = await screen.findByRole('button', { name: /好\s*的/ }, { timeout: 3000 });
  return button.closest('.ant-modal');
};

const closeErrorDialog = async () => {
  const button = screen.queryByRole('button', { name: /好\s*的/ });
  if (button) {
    await userEvent.click(button);
    await waitFor(() => expect(screen.queryByRole('button', { name: /好\s*的/ })).not.toBeInTheDocument());
  }
};

const credentialTexts = () => screen.queryAllByText(/重置后.*的密码：/);

let pollingCallback;
const realSetInterval = globalThis.setInterval;
const realClearInterval = globalThis.clearInterval;
let originalClipboardDescriptor;

beforeEach(() => {
  vi.clearAllMocks();
  resetPageState();
  pollingCallback = null;
  localStorage.clear();
  sessionStorage.clear();
  originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(globalThis, 'setInterval').mockImplementation((callback, delay, ...args) => {
    if (delay === 5000) {
      pollingCallback = callback;
      return 1;
    }
    return realSetInterval(callback, delay, ...args);
  });
  vi.spyOn(globalThis, 'clearInterval').mockImplementation((id) => {
    if (id !== 1) realClearInterval(id);
  });
});

afterEach(async () => {
  await closeErrorDialog();
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, 'clipboard', originalClipboardDescriptor);
  } else {
    delete navigator.clipboard;
  }
  delete document.visibilityState;
});

describe('AnvilDetailCredentials 独立回归', () => {
  it('test_detail_route_id_drives_api_and_backend_container_id_renders', async () => {
    fetchState.defaultDetail = detail({ container_id: 99, container_name: 'train-backend' });
    renderDetail(12);
    await waitForDetail('train-backend');
    const detailCalls = callsTo(PATH.detail);
    expect(detailCalls).toHaveLength(1);
    expect(bodyOf(detailCalls[0])).toEqual({ container_id: 12 });
    expect(screen.getByText('ID 99')).toBeInTheDocument();
  });

  it('test_detail_start_accepted_shows_transition_then_server_online', async () => {
    fetchState.defaultDetail = detail({ effective_status: 'offline' });
    fetchState.handlers[PATH.start] = () => Promise.resolve(jsonResponse({ success: 1 }));
    const gate = deferred();
    renderDetail();
    await waitForDetail();
    fetchState.detail.push(() => gate.promise);
    await userEvent.click(within(operationCard()).getByRole('button', { name: /^启\s*动$/ }));
    await userEvent.click(await screen.findByRole('button', { name: /确认\s*启\s*动/ }));
    await waitFor(() => expect(callsTo(PATH.start)).toHaveLength(1));
    expect(await screen.findByText('启动中')).toBeInTheDocument();
    await act(async () => {
      gate.resolve(detailResponse({ effective_status: 'online' }));
      await gate.promise;
    });
    expect(await screen.findByText('运行中')).toBeInTheDocument();
  });

  it('test_detail_add_admin_collaborator_shows_one_credential_without_optimistic_insert', async () => {
    fetchState.handlers[PATH.add] = () => Promise.resolve(jsonResponse({
      success: 1,
      accepted: true,
      credentials: [{ login_name: 'bob', password: 'pw-bob' }],
    }));
    renderDetail();
    await waitForDetail();
    await selectAddUser('bob');
    await selectAddRole('管理员');
    await userEvent.click(screen.getByRole('button', { name: /添加/ }));
    await waitFor(() => expect(callsTo(PATH.add)).toHaveLength(1));
    expect(bodyOf(callsTo(PATH.add)[0])).toEqual({ user_id: 3, container_id: 12, role: 'ADMIN' });
    expect(await screen.findByText('重置后bob的密码：')).toBeInTheDocument();
    expect(credentialTexts()).toHaveLength(1);
    expect(screen.queryByText('@bob · ID 3')).not.toBeInTheDocument();
    expect(message.success).toHaveBeenCalledWith('新增协作者请求已受理');
    await userEvent.click(screen.getByRole('button', { name: /关\s*闭/ }));
  });

  it('test_detail_credential_envelope_failures_never_render_passwords', async () => {
    const runCase = async (kind, response, path) => {
      cleanup();
      resetPageState();
      fetchState.handlers[path] = () => Promise.resolve(jsonResponse(response));
      renderDetail();
      await waitForDetail();
      if (kind === 'add') {
        await selectAddUser('bob');
        await userEvent.click(screen.getByRole('button', { name: /添加/ }));
      } else if (kind === 'reset') {
        await userEvent.click(screen.getAllByRole('button', { name: '重置密码' })[1]);
        await userEvent.click(await screen.findByRole('button', { name: /确认重置/ }));
      } else {
        await selectPeopleRole('超级管理员');
      }
      await waitFor(() => expect(callsTo(path)).toHaveLength(1));
      await waitForErrorDialog();
      expect(credentialTexts()).toHaveLength(0);
      expect(screen.queryByText(/重置后/)).not.toBeInTheDocument();
      await closeErrorDialog();
    };

    await runCase('add', { success: 1, accepted: true, credentials: [] }, PATH.add);
    await runCase('add', {
      success: 1,
      credentials: [{ login_name: 'bob', password: 'pw-bob' }],
    }, PATH.add);
    await runCase('reset', {
      success: 1,
      accepted: true,
      credentials: [{ login_name: 'alice', password: '' }],
    }, PATH.reset);
    await runCase('root', {
      success: 1,
      accepted: true,
      credentials: [{ login_name: 'root', password: 'pw-root' }],
    }, PATH.update);
  });

  it('test_detail_reset_hidden_for_admin_and_bypass_entity_without_resource', async () => {
    permissionState.entities = ['container:operation', 'bypass_auth_entity'];
    permissionState.userId = 2;
    permissionState.userName = 'alice';
    permissionState.containerResourceUnrestricted = false;
    fetchState.defaultDetail = detail({
      accounts: [
        { user_id: 1, username: 'root_user', role: 'ROOT' },
        { user_id: 2, username: 'alice', role: 'ADMIN' },
      ],
    });
    renderDetail();
    await waitForDetail();
    expect(screen.queryByRole('button', { name: '重置密码' })).not.toBeInTheDocument();

    cleanup();
    resetPageState();
    permissionState.entities = ['container:operation', 'bypass_auth_entity'];
    permissionState.userId = 2;
    permissionState.userName = 'alice';
    fetchState.defaultDetail = detail({
      accounts: [{ user_id: 2, username: 'alice', role: 'COLLABORATOR' }],
    });
    renderDetail();
    await waitForDetail();
    expect(screen.queryByRole('button', { name: '重置密码' })).not.toBeInTheDocument();
    expect(callsTo(PATH.reset)).toHaveLength(0);
  });

  it('test_detail_reset_disabled_for_offline_host_offline_and_maintenance', async () => {
    for (const status of ['offline', 'host_offline', 'host_maintenance', 'starting']) {
      cleanup();
      resetPageState();
      fetchState.defaultDetail = detail({ effective_status: status });
      renderDetail();
      await waitForDetail();
      const buttons = screen.getAllByRole('button', { name: '重置密码' });
      expect(buttons.length).toBeGreaterThan(0);
      expect(buttons[0]).toBeDisabled();
      fireEvent.click(buttons[1]);
      expect(screen.queryByText('确认重置密码')).not.toBeInTheDocument();
      expect(callsTo(PATH.reset)).toHaveLength(0);
    }
  });

  it('test_detail_reset_missing_user_id_disabled_reason_without_request', async () => {
    fetchState.defaultDetail = detail({
      accounts: [accounts[0], { username: 'unbound_user', role: 'COLLABORATOR' }],
    });
    renderDetail();
    await waitForDetail();
    const card = screen.getByText('@unbound_user · ID -').closest('.container-people-item');
    const button = within(card).getByRole('button', { name: '重置密码' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', expect.stringMatching(/用户.*ID|绑定/));
    fireEvent.click(button);
    expect(screen.queryByText('确认重置密码')).not.toBeInTheDocument();
    expect(callsTo(PATH.reset)).toHaveLength(0);
    expect(credentialTexts()).toHaveLength(0);
    expect(message.success).not.toHaveBeenCalled();
  });

  it.each([
    ['offline', /在线|状态/],
    ['host_offline', /在线|状态|宿主机/],
    ['host_maintenance', /在线|状态|维护/],
    ['starting', /在线|状态/],
    ['method_revoked', /权限/],
    ['root_revoked', /权限/],
    ['target_removed', /账号|绑定/],
  ])('test_detail_reset_presubmit_change_warns_without_request_or_password: %s', async (change, reason) => {
    renderDetail();
    await waitForDetail();
    await userEvent.click(screen.getAllByRole('button', { name: '重置密码' })[1]);
    const dialog = await screen.findByRole('dialog', { name: /确认重置密码/ });
    let next = detail();
    if (change === 'method_revoked') permissionState.entities = [];
    else if (change === 'root_revoked') next = detail({ accounts: [{ ...accounts[0], role: 'ADMIN' }, accounts[1]] });
    else if (change === 'target_removed') next = detail({ accounts: [accounts[0]] });
    else next = detail({ effective_status: change });
    fetchState.detail.push(() => Promise.resolve(jsonResponse({ success: 1, container_info: next })));
    await act(async () => { await pollingCallback(); });
    await userEvent.click(within(dialog).getByRole('button', { name: /确认重置/ }));
    expect(message.warning).toHaveBeenCalledWith(expect.stringMatching(reason));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: /确认重置密码/ })).not.toBeInTheDocument());
    expect(callsTo(PATH.reset)).toHaveLength(0);
    expect(credentialTexts()).toHaveLength(0);
    expect(message.success).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('test_detail_reset_failure_keeps_console_free_of_password', async () => {
    fetchState.handlers[PATH.reset] = () => Promise.resolve(jsonResponse({
      success: 0,
      error_reason: 'container_offline',
      message: 'offline',
      credentials: [{ login_name: 'alice', password: 'secret-pw' }],
    }, { status: 409 }));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    renderDetail();
    await waitForDetail();
    await userEvent.click(screen.getAllByRole('button', { name: '重置密码' })[1]);
    await userEvent.click(await screen.findByRole('button', { name: /确认重置/ }));
    const dialog = await waitForErrorDialog();
    expect(dialog.textContent).not.toContain('secret-pw');
    expect(errorSpy.mock.calls.flat().join(' ')).not.toContain('secret-pw');
    expect(logSpy.mock.calls.flat().join(' ')).not.toContain('secret-pw');
    expect(credentialTexts()).toHaveLength(0);
    await closeErrorDialog();
  });

  it('test_detail_root_handover_renders_n_plus_one_credentials', async () => {
    const credentials = [
      { login_name: 'root_user', password: 'pw-owner' },
      { login_name: 'legacy_root', password: 'pw-legacy' },
      { login_name: 'root', password: 'pw-root' },
    ];
    fetchState.handlers[PATH.update] = () => Promise.resolve(jsonResponse({
      success: 1,
      accepted: true,
      credentials,
    }));
    renderDetail();
    await waitForDetail();
    await selectPeopleRole('超级管理员');
    await waitFor(() => expect(callsTo(PATH.update)).toHaveLength(1));
    expect(bodyOf(callsTo(PATH.update)[0])).toEqual({
      container_id: 12,
      user_id: 2,
      updated_role: 'ROOT',
    });
    expect(bodyOf(callsTo(PATH.update)[0])).not.toHaveProperty('transfer_root');
    expect(await screen.findByText('重置后root_user的密码：')).toBeInTheDocument();
    expect(screen.getByText('重置后legacy_root的密码：')).toBeInTheDocument();
    expect(screen.getByText('重置后root的密码：')).toBeInTheDocument();
    expect(document.querySelectorAll('.credential-modal-item')).toHaveLength(3);
    await userEvent.click(screen.getByRole('button', { name: /关\s*闭/ }));
  });

  it('test_detail_delete_disabled_reason_and_no_request', async () => {
    const cases = [
      ['starting', '容器正在处理中，暂不可操作'],
      ['host_offline', '宿主机离线，暂不可操作'],
      ['host_maintenance', '宿主机维护中，暂不可操作'],
      ['status_unknown', '容器状态未知，已保守禁用'],
    ];
    for (const [status, expectedTitle] of cases) {
      cleanup();
      resetPageState();
      fetchState.defaultDetail = detail({ effective_status: status });
      renderDetail();
      await waitForDetail();
      const button = within(operationCard()).getByRole('button', { name: /删\s*除/ });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', expectedTitle);
      fireEvent.click(button);
      expect(screen.queryByText('确认删除容器')).not.toBeInTheDocument();
      expect(callsTo(PATH.delete)).toHaveLength(0);
    }
  });

  it('test_detail_delete_and_unpause_confirms_recheck_status_before_api', async () => {
    cleanup();
    resetPageState();
    fetchState.defaultDetail = detail({ effective_status: 'paused' });
    fetchState.handlers[PATH.unpause] = () => Promise.resolve(jsonResponse({ success: 1 }));
    renderDetail();
    await waitForDetail();
    await userEvent.click(within(operationCard()).getByRole('button', { name: /解冻/ }));
    const unpauseDialog = await screen.findByRole('dialog');
    fetchState.detail.push(() => Promise.resolve(detailResponse({ effective_status: 'online' })));
    await act(async () => {
      await pollingCallback();
    });
    await waitFor(() => expect(screen.getAllByText('运行中').length).toBeGreaterThan(0));
    await userEvent.click(within(unpauseDialog).getByRole('button', { name: /确认\s*解冻/ }));
    await waitFor(() => expect(within(unpauseDialog).queryByRole('button', { name: /确认\s*解冻/ })).not.toBeInTheDocument());
    expect(callsTo(PATH.unpause)).toHaveLength(0);
    expect(antdMessage.warning).toHaveBeenCalled();

    cleanup();
    resetPageState();
    fetchState.defaultDetail = detail({ effective_status: 'online' });
    renderDetail();
    await waitForDetail();
    await userEvent.click(within(operationCard()).getByRole('button', { name: /删\s*除/ }));
    const deleteDialog = await screen.findByRole('dialog');
    fetchState.detail.push(() => Promise.resolve(detailResponse({ effective_status: 'starting' })));
    await act(async () => {
      await pollingCallback();
    });
    await waitFor(() => expect(screen.getAllByText('启动中').length).toBeGreaterThan(0));
    await userEvent.click(within(deleteDialog).getByRole('button', { name: /删\s*除/ }));
    await waitFor(() => expect(within(deleteDialog).queryByRole('button', { name: /^删\s*除$/ })).not.toBeInTheDocument());
    expect(callsTo(PATH.delete)).toHaveLength(0);
    expect(antdMessage.warning).toHaveBeenCalled();
  });

  it('test_detail_action_confirm_modal_has_no_long_term_controls', async () => {
    fetchState.defaultDetail = detail({
      is_long_term: true,
      freeze_state: { is_frozen: true, days_frozen: 2 },
      long_term_container_can_enable: false,
      disk_usage_percent: 100,
    });
    renderDetail();
    await waitForDetail();
    expect(within(operationCard()).getByRole('checkbox')).toBeInTheDocument();
    await userEvent.click(within(operationCard()).getByRole('button', { name: /^停\s*止$/ }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).queryByRole('checkbox')).toBeNull();
    expect(within(dialog).queryByText(/长期容器/)).toBeNull();
    expect(within(dialog).getByText('确认停止容器')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: /取\s*消/ }));
  });

  it('test_detail_escape_closes_and_clears_credentials', async () => {
    fetchState.handlers[PATH.reset] = () => Promise.resolve(jsonResponse({
      success: 1,
      accepted: true,
      credentials: [{ login_name: 'alice', password: 'pw-escape' }],
    }));
    renderDetail();
    await waitForDetail();
    await userEvent.click(screen.getAllByRole('button', { name: '重置密码' })[1]);
    await userEvent.click(await screen.findByRole('button', { name: /确认重置/ }));
    expect(await screen.findByText('重置后alice的密码：')).toBeInTheDocument();
    const wraps = [...document.querySelectorAll('.ant-modal-wrap')];
    const wrap = wraps[wraps.length - 1];
    wrap?.focus();
    fireEvent.keyDown(wrap || document, { key: 'Escape', code: 'Escape', keyCode: 27, which: 27 });
    fireEvent.keyUp(wrap || document, { key: 'Escape', code: 'Escape', keyCode: 27, which: 27 });
    await waitFor(() => expect(screen.queryByText('重置后alice的密码：')).not.toBeInTheDocument());
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('test_detail_top_level_root_password_is_not_rendered_or_stored', async () => {
    fetchState.handlers[PATH.reset] = () => Promise.resolve(jsonResponse({
      success: 1,
      accepted: true,
      root_password: 'top-secret',
      credentials: [{ login_name: 'alice', password: 'pw-alice' }],
    }));
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    renderDetail();
    await waitForDetail();
    await userEvent.click(screen.getAllByRole('button', { name: '重置密码' })[1]);
    await userEvent.click(await screen.findByRole('button', { name: /确认重置/ }));
    expect(await screen.findByText('重置后alice的密码：')).toBeInTheDocument();
    expect(screen.queryByText('top-secret')).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain('top-secret');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(errorSpy.mock.calls.flat().join(' ')).not.toContain('top-secret');
    expect(logSpy.mock.calls.flat().join(' ')).not.toContain('top-secret');
    expect(callsTo(PATH.reset)).toHaveLength(1);
    expect(JSON.parse(callsTo(PATH.reset)[0][1].body)).toEqual({ container_id: 12, user_id: 2 });
    await userEvent.click(screen.getByRole('button', { name: /关\s*闭/ }));
  });

  it('test_detail_single_credential_unmount_remount_no_lookup_no_abort_and_late_no_error', async () => {
    const lateResponse = deferred();
    let resetCalls = 0;
    let lateSignal = null;
    fetchState.handlers[PATH.reset] = (url, init) => {
      resetCalls += 1;
      if (resetCalls === 1) {
        return Promise.resolve(jsonResponse({
          success: 1,
          accepted: true,
          credentials: [{ login_name: 'alice', password: 'pw-once' }],
        }));
      }
      lateSignal = init.signal;
      return lateResponse.promise;
    };
    const firstView = renderDetail();
    await waitForDetail();
    await userEvent.click(screen.getAllByRole('button', { name: '重置密码' })[1]);
    await userEvent.click(await screen.findByRole('button', { name: /确认重置/ }));
    expect(await screen.findByText('重置后alice的密码：')).toBeInTheDocument();
    expect(document.querySelectorAll('.credential-modal-item')).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: /复制/ }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('pw-once');
    await userEvent.click(screen.getByRole('button', { name: /关\s*闭/ }));
    await waitFor(() => expect(screen.queryByText('重置后alice的密码：')).not.toBeInTheDocument());

    await userEvent.click(screen.getAllByRole('button', { name: '重置密码' })[1]);
    await userEvent.click(await screen.findByRole('button', { name: /确认重置/ }));
    await waitFor(() => expect(resetCalls).toBe(2));
    expect(lateSignal).toBeTruthy();
    firstView.unmount();
    expect(lateSignal.aborted).toBe(false);
    await act(async () => {
      lateResponse.resolve(jsonResponse({
        success: 1,
        accepted: true,
        credentials: [{ login_name: 'alice', password: 'pw-late' }],
      }));
      await lateResponse.promise;
    });
    expect(screen.queryByRole('button', { name: /好\s*的/ })).not.toBeInTheDocument();
    expect(screen.queryByText('重置后alice的密码：')).not.toBeInTheDocument();

    const secondView = renderDetail();
    await waitForDetail();
    expect(screen.queryByText('重置后alice的密码：')).not.toBeInTheDocument();
    expect(resetCalls).toBe(2);
    expect(document.body.textContent).not.toContain('pw-late');
    secondView.unmount();
  });

  it('test_detail_credential_timeout_shows_error_without_retry_or_password', async () => {
    fetchState.handlers[PATH.reset] = (url, init) => new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => {
        const error = new Error('Aborted');
        error.name = 'AbortError';
        reject(error);
      });
    });
    renderDetail();
    await waitForDetail();
    await userEvent.click(screen.getAllByRole('button', { name: '重置密码' })[1]);
    await userEvent.click(await screen.findByRole('button', { name: /确认重置/ }));
    const dialog = await waitForErrorDialog();
    expect(dialog.textContent).not.toContain('pw-');
    expect(callsTo(PATH.reset)).toHaveLength(1);
    expect(credentialTexts()).toHaveLength(0);
    await closeErrorDialog();
    expect(callsTo(PATH.reset)).toHaveLength(1);
  });

  it('test_detail_foreground_error_modal_releases_loading_before_wait', async () => {
    const manual = deferred();
    fetchState.detail.push(() => manual.promise);
    renderDetail();
    await waitFor(() => expect(document.querySelector('.ant-spin')).not.toBeNull());
    await act(async () => {
      manual.reject(new Error('refresh failed'));
      await Promise.resolve();
    });
    await waitForErrorDialog();
    expect(document.querySelector('.ant-spin')).toBeNull();
    await closeErrorDialog();
  });

  it('test_detail_member_guard_failure_does_not_retry_or_bypass', async () => {
    const runFailure = async ({ path, reason, status, messageText, trigger, expectedText }) => {
      cleanup();
      resetPageState();
      fetchState.handlers[path] = () => Promise.resolve(jsonResponse({
        success: 0,
        error_reason: reason,
        message: messageText,
      }, { status }));
      renderDetail();
      await waitForDetail();
      await trigger();
      expect(callsTo(path)).toHaveLength(1);
      const dialog = await waitForErrorDialog();
      expect(dialog.textContent).toContain(expectedText);
      expect(callsTo(path)).toHaveLength(1);
      await closeErrorDialog();
    };

    await runFailure({
      path: PATH.update,
      reason: 'container_paused',
      status: 409,
      messageText: 'Failed to update role',
      expectedText: '容器已冻结，无法更新角色',
      trigger: async () => {
        await selectPeopleRole('管理员');
      },
    });
    await runFailure({
      path: PATH.add,
      reason: 'container_offline',
      status: 400,
      messageText: 'Failed to add collaborator',
      expectedText: '容器未在线，无法添加协作者',
      trigger: async () => {
        await selectAddUser('bob');
        await userEvent.click(screen.getByRole('button', { name: /添加/ }));
      },
    });
    await runFailure({
      path: PATH.remove,
      reason: 'container_failed',
      status: 409,
      messageText: 'Failed to remove collaborator',
      expectedText: '容器状态异常，无法移除协作者',
      trigger: async () => {
        const row = screen.getByText('@alice · ID 2').closest('.container-people-item');
        const button = within(row).getAllByRole('button').find(el => el.querySelector('.anticon-delete'));
        await userEvent.click(button);
      },
    });
  });

  it('test_detail_action_failure_preserves_error_reason', async () => {
    fetchState.defaultDetail = detail({ effective_status: 'offline' });
    fetchState.handlers[PATH.start] = () => Promise.resolve(jsonResponse({
      success: 0,
      error_reason: 'start_failed',
      message: 'start failed',
    }, { status: 409 }));
    renderDetail();
    await waitForDetail();
    await userEvent.click(within(operationCard()).getByRole('button', { name: /^启\s*动$/ }));
    await userEvent.click(await screen.findByRole('button', { name: /确认\s*启\s*动/ }));
    const dialog = await waitForErrorDialog();
    expect(dialog.textContent).toContain('start failed');
    expect(dialog.textContent).toContain('启动失败');
    expect(screen.queryByText('启动容器')).not.toBeInTheDocument();
    await closeErrorDialog();
  });

  it('test_detail_long_term_disk_100_only_disables_enable', async () => {
    fetchState.defaultDetail = detail({
      is_long_term: false,
      long_term_container_can_enable: true,
      disk_usage_percent: 100,
      disk_usage: { total_gb: 100, limit_gb: 100 },
    });
    renderDetail();
    await waitForDetail();
    const checkbox = within(operationCard()).getByRole('checkbox');
    expect(checkbox).toBeDisabled();
    const title = checkbox.closest('label')?.querySelector('[title]')?.getAttribute('title') || '';
    expect(title).toContain('磁盘');
    expect(within(operationCard()).getByRole('button', { name: /删\s*除/ })).toBeEnabled();
    expect(callsTo(PATH.longTerm)).toHaveLength(0);
  });

  it('test_detail_long_bind_path_copy_control_preserves_title', async () => {
    const longPath = `/home/alice/containers/${'very-long-segment-'.repeat(20)}train-a`;
    fetchState.defaultDetail = detail({ bind_mount_path: longPath });
    renderDetail();
    await waitForDetail();
    const field = screen.getByText('宿主 bind 路径').closest('.detail-field');
    const chip = within(field).getByRole('button', { name: longPath });
    expect(chip).toHaveAttribute('title', longPath);
    expect(chip).toHaveTextContent(longPath);
    await userEvent.click(chip);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(longPath);
  });

  it('test_credential_copy_failure_keeps_password_visible_until_close', async () => {
    const CredentialHarness = () => {
      const [open, setOpen] = useState(true);
      const [credentials, setCredentials] = useState([
        { login_name: 'alice', password: 'pw-copy' },
      ]);
      return (
        <CredentialModal
          open={open}
          credentials={credentials}
          onClose={() => {
            setOpen(false);
            setCredentials([]);
          }}
        />
      );
    };
    navigator.clipboard.writeText.mockRejectedValueOnce(new Error('denied'));
    render(<CredentialHarness />);
    expect(screen.getByText('重置后alice的密码：')).toBeInTheDocument();
    expect(screen.getByText('pw-copy')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /复制/ }));
    await waitFor(() => expect(antdMessage.error).toHaveBeenCalled());
    expect(screen.getByText('重置后alice的密码：')).toBeInTheDocument();
    expect(screen.getByText('pw-copy')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /关\s*闭/ }));
    expect(screen.queryByText('重置后alice的密码：')).not.toBeInTheDocument();
    expect(screen.queryByText('pw-copy')).not.toBeInTheDocument();
  });
});
