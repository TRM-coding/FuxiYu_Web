import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';

const antdMessage = vi.hoisted(() => ({
  success: vi.fn(), warning: vi.fn(), error: vi.fn(), loading: vi.fn(),
}));

const realSetInterval = globalThis.setInterval;
const realClearInterval = globalThis.clearInterval;

vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal();
  return {
    ...antd,
    message: antdMessage,
  };
});

vi.mock('../contexts/PermissionContext', () => ({
  usePermission: () => ({
    entities: ['container:operation', 'container:manage', 'bypass_resource'],
    userId: 1,
    userName: 'root_user',
    loaded: true,
    hasPermission: () => true,
  }),
}));

vi.mock('../api/container_api', () => ({
  addCollaborator: vi.fn(),
  deleteContainer: vi.fn(),
  getContainerDetailInformation: vi.fn(),
  getContainerOperationLogs: vi.fn(),
  getContainerStatus: vi.fn(),
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

vi.mock('../utils/showErrorModal', () => ({ default: vi.fn() }));

import {
  addCollaborator,
  getContainerDetailInformation,
  getContainerOperationLogs,
  getContainerStatus,
  removeCollaborator,
  resetContainerPassword,
  setLongTermContainer,
  updateRole,
} from '../api/container_api';
import { listAllUserBrefInformation } from '../api/user_api';
import showErrorModal from '../utils/showErrorModal';
import { POLL_TIMEOUT } from '../configs/backend_config';
import ContainerDetailPage from '../pages/ContainerDetailPage';

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
  accounts,
  ...overrides,
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

const operationLog = (id, operation, success = true) => ({
  id,
  operation,
  operator_username: 'root_user',
  success,
  created_at: '2026-10-20T00:00:00Z',
});

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

const peopleCard = () => screen.getByRole('heading', { name: /用户管理/ }).closest('.container-people-card');
const operationCard = () => screen.getByRole('heading', { name: '容器操作' }).closest('.container-operations-card');
const runtimeCard = () => screen.getByRole('heading', { name: '运行指标' }).closest('.detail-card');
const historyCard = () => screen.getByRole('heading', { name: '操作历史' }).closest('.container-log-card');
const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

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

let pollingCallback;
let visibilityState;

beforeEach(() => {
  vi.clearAllMocks();
  pollingCallback = null;
  visibilityState = 'visible';
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => visibilityState,
  });

  getContainerDetailInformation.mockReset();
  getContainerOperationLogs.mockReset();
  getContainerStatus.mockReset();
  addCollaborator.mockReset();
  removeCollaborator.mockReset();
  resetContainerPassword.mockReset();
  setLongTermContainer.mockReset();
  updateRole.mockReset();
  listAllUserBrefInformation.mockReset();
  showErrorModal.mockReset();

  getContainerDetailInformation.mockResolvedValue({ container_info: detail() });
  getContainerOperationLogs.mockResolvedValue({ logs: [] });
  getContainerStatus.mockResolvedValue({});
  listAllUserBrefInformation.mockResolvedValue({ users });
  addCollaborator.mockResolvedValue({ accepted: true, credentials: [{ login_name: 'bob', password: 'pw-bob' }] });
  removeCollaborator.mockResolvedValue({ success: 1 });
  resetContainerPassword.mockResolvedValue({ accepted: true, credentials: [{ login_name: 'alice', password: 'pw-reset' }] });
  setLongTermContainer.mockResolvedValue({ success: 1 });
  updateRole.mockResolvedValue({ success: 1 });

  vi.spyOn(globalThis, 'setInterval').mockImplementation((callback, delay, ...args) => {
    if (delay === 5000) {
      pollingCallback = callback;
      return 1;
    }
    return realSetInterval(callback, delay, ...args);
  });
  vi.spyOn(globalThis, 'clearInterval').mockImplementation((timer) => {
    if (timer !== 1) realClearInterval(timer);
  });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  delete document.visibilityState;
  vi.restoreAllMocks();
});

describe('ContainerDetailPage 详情权威事实自动收敛', () => {
  it('test_async_add_stale_immediate_refresh_then_background_detail_converges_without_manual_refresh', async () => {
    const user = userEvent.setup();
    const initial = detail();
    const withBob = detail({
      accounts: [...accounts, { user_id: 3, username: 'bob', role: 'COLLABORATOR' }],
    });
    const immediateRefresh = deferred();
    getContainerDetailInformation
      .mockResolvedValueOnce({ container_info: initial })
      .mockImplementationOnce(() => immediateRefresh.promise)
      .mockResolvedValueOnce({ container_info: withBob });
    // 旧实现只会轮询 status；即便 status 带着新成员，它也不会合并 accounts。
    getContainerStatus.mockResolvedValue({ effective_status: 'online', accounts: withBob.accounts });

    renderDetail();
    expect(await screen.findByText('train-a')).toBeInTheDocument();

    fireEvent.mouseDown(document.querySelector('.container-people-add .ant-select-selector'));
    await clickOption('bob');
    await user.click(screen.getByRole('button', { name: /添加/ }));

    await waitFor(() => expect(addCollaborator).toHaveBeenCalledWith({ user_id: 3, container_id: 12, role: 'COLLABORATOR' }));
    expect(await screen.findByText('重置后bob的密码：')).toBeInTheDocument();
    expect(antdMessage.success).toHaveBeenCalledWith('新增协作者请求已受理');

    // 受理后的立即重取仍返回旧列表：不能乐观插入，也不能把 accepted 当成已完成。
    await waitFor(() => expect(getContainerDetailInformation).toHaveBeenCalledTimes(2));
    expect(within(peopleCard()).queryByText(/@bob · ID 3/)).toBeNull();
    expect(within(peopleCard()).getByText('@alice · ID 2')).toBeInTheDocument();

    await act(async () => {
      immediateRefresh.resolve({ container_info: initial });
      await immediateRefresh.promise;
    });
    await flush();
    expect(within(peopleCard()).queryByText(/@bob · ID 3/)).toBeNull();

    // 后台下一拍权威详情已包含新增账号：页面无需点击刷新即可显示。
    await act(async () => {
      await pollingCallback();
    });
    expect(await within(peopleCard()).findByText(/@bob · ID 3/)).toBeInTheDocument();
    expect(getContainerDetailInformation).toHaveBeenCalledTimes(3);
  });

  it('test_role_change_eventually_converges_from_authoritative_detail', async () => {
    const initial = detail();
    const promoted = detail({
      accounts: [
        accounts[0],
        { ...accounts[1], role: 'ADMIN' },
      ],
    });
    getContainerDetailInformation
      .mockResolvedValueOnce({ container_info: initial })
      .mockResolvedValueOnce({ container_info: initial })
      .mockResolvedValueOnce({ container_info: promoted });

    renderDetail();
    await screen.findByText('train-a');
    await selectRole('管理员');
    await waitFor(() => expect(updateRole).toHaveBeenCalledWith({
      container_id: 12,
      user_id: 2,
      updated_role: 'ADMIN',
    }));
    await waitFor(() => expect(getContainerDetailInformation).toHaveBeenCalledTimes(2));

    const aliceRow = () => screen.getByText('@alice · ID 2').closest('.container-people-item');
    expect(within(aliceRow()).getByText('协作者', { selector: '.ant-tag' })).toBeInTheDocument();

    await act(async () => {
      await pollingCallback();
    });
    await waitFor(() => expect(getContainerDetailInformation).toHaveBeenCalledTimes(3));
    expect(within(aliceRow()).getByText('管理员', { selector: '.ant-tag' })).toBeInTheDocument();
    expect(within(aliceRow()).queryByText('协作者', { selector: '.ant-tag' })).toBeNull();
  });

  it('test_removal_eventually_converges_from_authoritative_detail', async () => {
    const user = userEvent.setup();
    const initial = detail();
    const withoutAlice = detail({ accounts: [accounts[0]] });
    getContainerDetailInformation
      .mockResolvedValueOnce({ container_info: initial })
      .mockResolvedValueOnce({ container_info: initial })
      .mockResolvedValueOnce({ container_info: withoutAlice });

    renderDetail();
    await screen.findByText('train-a');
    const aliceRow = () => screen.getByText('@alice · ID 2').closest('.container-people-item');
    const removeButton = within(aliceRow()).getAllByRole('button').find(button => button.querySelector('.anticon-delete'));
    expect(removeButton).toBeTruthy();
    await user.click(removeButton);

    await waitFor(() => expect(removeCollaborator).toHaveBeenCalledWith({ user_id: 2, container_id: 12 }));
    await waitFor(() => expect(getContainerDetailInformation).toHaveBeenCalledTimes(2));
    expect(screen.getByText('@alice · ID 2')).toBeInTheDocument();

    await act(async () => {
      await pollingCallback();
    });
    await waitFor(() => expect(getContainerDetailInformation).toHaveBeenCalledTimes(3));
    expect(screen.queryByText('@alice · ID 2')).toBeNull();
    expect(within(peopleCard()).getByText('@root_user · ID 1')).toBeInTheDocument();
  });

  it('test_external_detail_facts_refresh_on_background_tick', async () => {
    const initial = detail({
      last_ssh_login_time: '2026-10-01T00:00:00Z',
      disk_usage: { total_gb: 10, limit_gb: 100 },
      runtime_metrics: { collected_at: '2026-10-01T00:00:00Z', cpu_usage_percent: 10 },
    });
    const updated = detail({
      effective_status: 'paused',
      is_long_term: true,
      last_ssh_login_time: '2026-10-20T10:00:00Z',
      disk_usage: { total_gb: 77, limit_gb: 100 },
      freeze_state: { is_frozen: true, days_frozen: 3 },
      runtime_metrics: { collected_at: '2026-10-20T10:00:05Z', cpu_usage_percent: 30 },
    });
    getContainerDetailInformation
      .mockResolvedValueOnce({ container_info: initial })
      .mockResolvedValueOnce({ container_info: updated });
    getContainerStatus.mockResolvedValue({
      effective_status: 'paused',
      runtime_metrics: updated.runtime_metrics,
    });

    renderDetail();
    await screen.findByText('train-a');
    expect(within(operationCard()).getByRole('checkbox')).not.toBeChecked();

    await act(async () => {
      await pollingCallback();
    });
    await waitFor(() => expect(getContainerDetailInformation).toHaveBeenCalledTimes(2));

    expect(screen.getAllByText('已冻结').length).toBeGreaterThan(0);
    expect(within(operationCard()).getByRole('checkbox')).toBeChecked();
    const runtime = runtimeCard();
    const diskMetric = within(runtime)
      .getByText('磁盘', { selector: '.detail-metric-label' })
      .closest('.detail-metric');
    expect(diskMetric).toHaveTextContent('77 GB');
    const cpuMetric = within(runtime)
      .getByText('CPU', { selector: '.detail-metric-label' })
      .closest('.detail-metric');
    expect(cpuMetric).toHaveTextContent('30%');
    const sshItem = within(runtime).getByText('上次SSH').closest('.detail-runtime-item');
    expect(sshItem).toHaveTextContent(/2026\/10\/20/);
    expect(within(runtime).getByText('长期容器')).toBeInTheDocument();
    expect(getContainerStatus).not.toHaveBeenCalled();
  });

  it('test_late_old_route_detail_response_does_not_overwrite_current_route', async () => {
    const user = userEvent.setup();
    let resolveStaleRefresh;
    let detailCalls = 0;
    getContainerDetailInformation.mockImplementation((id) => {
      detailCalls += 1;
      if (detailCalls === 1) {
        return Promise.resolve({ container_info: detail({ container_name: 'train-a' }) });
      }
      if (detailCalls === 2) {
        return new Promise((resolve) => {
          resolveStaleRefresh = () => resolve({ container_info: detail({ container_name: 'train-a' }) });
        });
      }
      return Promise.resolve({
        container_info: detail({
          container_id: id,
          container_name: 'train-b',
          accounts: [accounts[0]],
        }),
      });
    });

    renderDetailWithNavigation();
    await screen.findByText('train-a');
    await user.click(screen.getByRole('button', { name: /刷\s*新/ }));
    await waitFor(() => expect(detailCalls).toBe(2));
    expect(resolveStaleRefresh).toBeTypeOf('function');

    await user.click(screen.getByRole('button', { name: 'go-container-13' }));
    expect(await screen.findByText('train-b')).toBeInTheDocument();
    await waitFor(() => expect(detailCalls).toBe(3));

    await act(async () => {
      resolveStaleRefresh();
      await Promise.resolve();
    });
    await flush();

    expect(screen.getByRole('heading', { level: 1, name: 'train-b' })).toBeInTheDocument();
    expect(screen.queryByText('train-a')).toBeNull();
  });

  it('test_unmount_during_detail_request_does_not_show_late_error', async () => {
    let rejectInitial;
    getContainerDetailInformation.mockImplementation(() => new Promise((_, reject) => {
      rejectInitial = reject;
    }));

    const { unmount } = renderDetail();
    await waitFor(() => expect(rejectInitial).toBeTypeOf('function'));
    unmount();

    await act(async () => {
      rejectInitial(Object.assign(new Error('late detail failure'), { status: 500 }));
      await Promise.resolve();
    });
    await flush();

    expect(showErrorModal).not.toHaveBeenCalled();
  });

  it('test_background_refresh_failure_keeps_existing_detail_without_error_modal', async () => {
    getContainerDetailInformation.mockResolvedValueOnce({ container_info: detail() });
    renderDetail();
    await screen.findByText('train-a');
    getContainerDetailInformation.mockRejectedValueOnce(new Error('background detail failed'));

    await act(async () => {
      await pollingCallback();
    });
    await waitFor(() => expect(getContainerDetailInformation).toHaveBeenCalledTimes(2));

    expect(showErrorModal).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { level: 1, name: 'train-a' })).toBeInTheDocument();
    expect(screen.getByText('@alice · ID 2')).toBeInTheDocument();
    expect(console.warn).toHaveBeenCalled();
  });

  it('test_background_refresh_is_reentrancy_guarded_before_request_pileup', async () => {
    const gate = deferred();
    getContainerDetailInformation
      .mockResolvedValueOnce({ container_info: detail() })
      .mockImplementationOnce(() => gate.promise);

    renderDetail();
    await screen.findByText('train-a');

    let first;
    let second;
    await act(async () => {
      first = pollingCallback();
      second = pollingCallback();
      await Promise.resolve();
    });

    expect(getContainerDetailInformation).toHaveBeenCalledTimes(2);
    expect(getContainerStatus).not.toHaveBeenCalled();

    await act(async () => {
      gate.resolve({ container_info: detail() });
      await first;
    });
    await act(async () => {
      await pollingCallback();
      await second;
    });
    await waitFor(() => expect(getContainerDetailInformation).toHaveBeenCalledTimes(3));
  });

  it('test_hidden_page_skips_background_refresh_and_visibility_restore_refreshes', async () => {
    const initial = detail();
    const withBob = detail({
      accounts: [...accounts, { user_id: 3, username: 'bob', role: 'COLLABORATOR' }],
    });
    getContainerDetailInformation
      .mockResolvedValueOnce({ container_info: initial })
      .mockResolvedValueOnce({ container_info: withBob });
    getContainerOperationLogs
      .mockResolvedValueOnce({ logs: [operationLog(1, 'stop_container')] })
      .mockResolvedValueOnce({
        logs: [operationLog(1, 'stop_container'), operationLog(2, 'start_container')],
      });

    renderDetail();
    await screen.findByText('train-a');

    visibilityState = 'hidden';
    await act(async () => {
      await pollingCallback();
    });
    expect(getContainerDetailInformation).toHaveBeenCalledTimes(1);
    expect(getContainerOperationLogs).toHaveBeenCalledTimes(1);

    visibilityState = 'visible';
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'));
      await Promise.resolve();
    });
    await waitFor(() => expect(getContainerDetailInformation).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(getContainerOperationLogs).toHaveBeenCalledTimes(2));
    expect(getContainerOperationLogs).toHaveBeenCalledWith(12, POLL_TIMEOUT);
    expect(await screen.findByText('@bob · ID 3')).toBeInTheDocument();
    expect(await screen.findByText('启动容器')).toBeInTheDocument();
  });

  it('test_candidate_users_reload_when_dropdown_opens_without_periodic_platform_user_polling', async () => {
    let userCalls = 0;
    listAllUserBrefInformation.mockImplementation(() => {
      userCalls += 1;
      return Promise.resolve({
        users: userCalls === 1
          ? [{ id: 2, username: 'alice', name: 'Alice' }]
          : [
            { id: 2, username: 'alice', name: 'Alice' },
            { id: 4, username: 'charlie', name: 'Charlie' },
          ],
      });
    });

    renderDetail();
    await screen.findByText('train-a');
    await waitFor(() => expect(userCalls).toBe(1));

    fireEvent.mouseDown(document.querySelector('.container-people-add .ant-select-selector'));
    await waitFor(() => expect(userCalls).toBe(2));
    await waitFor(() => {
      expect([...document.querySelectorAll('.ant-select-item-option')].some(el => el.textContent.includes('charlie'))).toBe(true);
    });

    // 5s 周期只刷新容器详情，不把平台用户全量列表带上。
    await act(async () => {
      await pollingCallback();
    });
    expect(userCalls).toBe(2);
  });

  it('test_foreground_error_modal_pending_does_not_hold_detail_inflight', async () => {
    const user = userEvent.setup();
    const modal = deferred();
    renderDetail();
    await screen.findByText('train-a');

    showErrorModal.mockImplementationOnce(() => modal.promise);
    getContainerDetailInformation.mockRejectedValueOnce(new Error('refresh failed'));
    await user.click(screen.getByRole('button', { name: /刷\s*新/ }));
    await waitFor(() => expect(showErrorModal).toHaveBeenCalled());

    // 网络阶段已失败，错误弹窗仍在等待用户；后台周期不能被这个弹窗占住。
    await act(async () => {
      await pollingCallback();
    });
    await waitFor(() => expect(getContainerDetailInformation).toHaveBeenCalledTimes(3));

    await act(async () => {
      modal.resolve();
      await modal.promise;
    });
  });

  it('test_stale_non_silent_request_releases_loading_owned_by_its_lifecycle', async () => {
    const user = userEvent.setup();
    const manualRefresh = deferred();
    getContainerDetailInformation
      .mockResolvedValueOnce({ container_info: detail() })
      .mockImplementationOnce(() => manualRefresh.promise)
      .mockResolvedValueOnce({});

    renderDetail();
    await screen.findByText('train-a');
    await user.click(screen.getByRole('button', { name: /刷\s*新/ }));
    await waitFor(() => expect(getContainerDetailInformation).toHaveBeenCalledTimes(2));

    // 前台刷新 A 在途时，长期动作触发 silent B；B 先返回空详情并清空 container。
    await user.click(within(operationCard()).getByRole('checkbox'));
    await waitFor(() => expect(setLongTermContainer).toHaveBeenCalledWith({ container_id: 12, is_long_term: true }));
    await waitFor(() => expect(getContainerDetailInformation).toHaveBeenCalledTimes(3));
    await waitFor(() => expect(document.querySelector('.ant-spin')).not.toBeNull());
    expect(screen.queryByText('train-a')).toBeNull();

    // A 晚到且因序号旧被丢弃，但它仍是 loading 的所有者，必须结束 loading。
    await act(async () => {
      manualRefresh.resolve({ container_info: detail() });
      await manualRefresh.promise;
    });
    await waitFor(() => expect(document.querySelector('.ant-spin')).toBeNull());
    expect(screen.getByRole('heading', { level: 1, name: '容器 12' })).toBeInTheDocument();
  });

  it('test_old_route_pending_request_does_not_block_new_route_background_refresh', async () => {
    const user = userEvent.setup();
    let resolveOldRoute;
    let detailCalls = 0;
    const bobAccount = { user_id: 3, username: 'bob', role: 'COLLABORATOR' };
    getContainerDetailInformation.mockImplementation((id) => {
      detailCalls += 1;
      if (detailCalls === 1) {
        return Promise.resolve({ container_info: detail({ container_name: 'train-a', accounts: [accounts[0]] }) });
      }
      if (detailCalls === 2) {
        return new Promise((resolve) => {
          resolveOldRoute = () => resolve({ container_info: detail({ container_name: 'train-a', accounts: [accounts[0]] }) });
        });
      }
      if (detailCalls === 3) {
        return Promise.resolve({
          container_info: detail({ container_id: id, container_name: 'train-b', accounts: [accounts[0]] }),
        });
      }
      return Promise.resolve({
        container_info: detail({ container_id: id, container_name: 'train-b', accounts: [accounts[0], bobAccount] }),
      });
    });

    renderDetailWithNavigation();
    await screen.findByText('train-a');
    await user.click(screen.getByRole('button', { name: /刷\s*新/ }));
    await waitFor(() => expect(detailCalls).toBe(2));

    await user.click(screen.getByRole('button', { name: 'go-container-13' }));
    expect(await screen.findByText('train-b')).toBeInTheDocument();
    await waitFor(() => expect(detailCalls).toBe(3));

    // 旧容器 12 的慢请求仍在途，但新容器 13 的当前请求已结束，后台应可刷新。
    await act(async () => {
      await pollingCallback();
    });
    await waitFor(() => expect(detailCalls).toBe(4));
    expect(getContainerDetailInformation).toHaveBeenCalledWith(13, POLL_TIMEOUT);
    expect(await screen.findByText('@bob · ID 3')).toBeInTheDocument();

    await act(async () => {
      resolveOldRoute();
      await Promise.resolve();
    });
    await flush();
    expect(screen.getByRole('heading', { level: 1, name: 'train-b' })).toBeInTheDocument();
    expect(screen.queryByText('train-a')).toBeNull();
  });

  it('test_async_add_operation_log_appears_after_background_history_refresh', async () => {
    const user = userEvent.setup();
    getContainerOperationLogs
      .mockResolvedValueOnce({ logs: [operationLog(1, 'stop_container')] })
      .mockResolvedValueOnce({ logs: [operationLog(1, 'stop_container')] })
      .mockResolvedValueOnce({
        logs: [operationLog(1, 'stop_container'), operationLog(2, 'add_collaborator')],
      });

    renderDetail();
    await screen.findByText('停止容器');
    fireEvent.mouseDown(document.querySelector('.container-people-add .ant-select-selector'));
    await clickOption('bob');
    await user.click(screen.getByRole('button', { name: /添加/ }));
    await waitFor(() => expect(addCollaborator).toHaveBeenCalled());
    expect(await screen.findByText('重置后bob的密码：')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /关\s*闭/ }));

    // 受理后立即重取的日志仍是旧终态；不能把 accepted 当成 add 已完成。
    await waitFor(() => expect(getContainerOperationLogs).toHaveBeenCalledTimes(2));
    expect(within(historyCard()).queryByText('添加协作者')).toBeNull();

    await act(async () => {
      await pollingCallback();
    });
    await waitFor(() => expect(getContainerOperationLogs).toHaveBeenCalledTimes(3));
    expect(getContainerOperationLogs).toHaveBeenCalledWith(12, POLL_TIMEOUT);
    expect(await within(historyCard()).findByText('添加协作者')).toBeInTheDocument();
    expect(historyCard().textContent).not.toContain('pw-bob');
  });

  it('test_reset_password_terminal_history_uses_chinese_label_without_password', async () => {
    const user = userEvent.setup();
    getContainerOperationLogs
      .mockResolvedValueOnce({ logs: [operationLog(1, 'stop_container')] })
      .mockResolvedValueOnce({
        logs: [operationLog(1, 'stop_container'), operationLog(2, 'reset_container_password')],
      });

    renderDetail();
    await screen.findByText('停止容器');
    await user.click(screen.getAllByRole('button', { name: '重置密码' })[1]);
    await user.click(await screen.findByRole('button', { name: /确认重置/ }));
    await waitFor(() => expect(resetContainerPassword).toHaveBeenCalledWith({ container_id: 12, user_id: 2 }));
    expect(await screen.findByText('重置后alice的密码：')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /关\s*闭/ }));

    await act(async () => {
      await pollingCallback();
    });
    await waitFor(() => expect(getContainerOperationLogs).toHaveBeenCalledTimes(2));
    expect(await within(historyCard()).findByText('重置容器密码')).toBeInTheDocument();
    expect(within(historyCard()).queryByText(/reset_container_password/)).toBeNull();
    expect(historyCard().textContent).not.toContain('pw-reset');
  });

  it('test_operation_history_background_uses_short_timeout_guards_and_keeps_logs_on_failure', async () => {
    const gate = deferred();
    let logCalls = 0;
    getContainerOperationLogs.mockImplementation(() => {
      logCalls += 1;
      if (logCalls === 1) return Promise.resolve({ logs: [operationLog(1, 'stop_container')] });
      if (logCalls === 2) return gate.promise;
      return Promise.reject(new Error('history refresh failed'));
    });

    renderDetail();
    await screen.findByText('停止容器');

    await act(async () => {
      pollingCallback();
      pollingCallback();
      await Promise.resolve();
    });
    expect(getContainerOperationLogs).toHaveBeenCalledTimes(2);
    expect(getContainerOperationLogs).toHaveBeenCalledWith(12, POLL_TIMEOUT);

    await act(async () => {
      gate.resolve({
        logs: [operationLog(1, 'stop_container'), operationLog(2, 'start_container')],
      });
      await gate.promise;
    });
    expect(await screen.findByText('启动容器')).toBeInTheDocument();

    await act(async () => {
      await pollingCallback();
    });
    await waitFor(() => expect(logCalls).toBe(3));
    expect(screen.getByText('启动容器')).toBeInTheDocument();
    expect(showErrorModal).not.toHaveBeenCalled();
    expect(console.warn).toHaveBeenCalledWith('load container operation logs failed', expect.anything());
  });

  it('test_late_old_route_history_refresh_does_not_overwrite_current_route', async () => {
    const user = userEvent.setup();
    let resolveOldHistory;
    let logCalls = 0;
    getContainerOperationLogs.mockImplementation(() => {
      logCalls += 1;
      if (logCalls === 1) return Promise.resolve({ logs: [operationLog(1, 'stop_container')] });
      if (logCalls === 2) {
        return new Promise((resolve) => {
          resolveOldHistory = () => resolve({ logs: [operationLog(9, 'restart_container')] });
        });
      }
      return Promise.resolve({ logs: [operationLog(2, 'start_container')] });
    });

    renderDetailWithNavigation();
    await screen.findByText('停止容器');
    const oldPoll = pollingCallback();
    await waitFor(() => expect(logCalls).toBe(2));
    expect(resolveOldHistory).toBeTypeOf('function');

    await user.click(screen.getByRole('button', { name: 'go-container-13' }));
    expect(await screen.findByText('启动容器')).toBeInTheDocument();
    await waitFor(() => expect(logCalls).toBe(3));

    await act(async () => {
      resolveOldHistory();
      await oldPoll;
    });
    await flush();

    expect(screen.getByText('启动容器')).toBeInTheDocument();
    expect(screen.queryByText('重启容器')).toBeNull();
  });

  it('test_unmounted_history_background_failure_does_not_write_or_warn', async () => {
    let rejectHistory;
    getContainerOperationLogs
      .mockResolvedValueOnce({ logs: [operationLog(1, 'stop_container')] })
      .mockImplementationOnce(() => new Promise((_, reject) => {
        rejectHistory = reject;
      }));

    const { unmount } = renderDetail();
    await screen.findByText('停止容器');
    const pendingPoll = pollingCallback();
    await waitFor(() => expect(rejectHistory).toBeTypeOf('function'));
    unmount();

    await act(async () => {
      rejectHistory(new Error('late history failure'));
      await pendingPoll;
    });
    await flush();

    expect(console.warn).not.toHaveBeenCalledWith('load container operation logs failed', expect.anything());
  });
});
