import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
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
  getContainerDetailInformation,
  getContainerOperationLogs,
  getContainerStatus,
  startContainer,
} from '../api/container_api';
import { listAllUserBrefInformation } from '../api/user_api';
import showErrorModal from '../utils/showErrorModal';
import ContainerDetailPage from '../pages/ContainerDetailPage';

const detail = (overrides = {}) => ({
  container_id: 12,
  container_name: 'train-a',
  effective_status: 'offline',
  machine_id: 3,
  machine_ip: '10.0.0.8',
  port: 1024,
  is_long_term: false,
  long_term_container_can_enable: true,
  disk_usage_percent: 20,
  accounts: [{ user_id: 1, username: 'root_user', role: 'ROOT' }],
  ...overrides,
});

const log = (id, operation) => ({
  id,
  operation,
  operator_username: 'root_user',
  success: true,
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

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(globalThis, 'setInterval').mockImplementation((callback, delay, ...args) => (
    delay === 5000 ? 1 : realSetInterval(callback, delay, ...args)
  ));
  vi.spyOn(globalThis, 'clearInterval').mockImplementation((timer) => {
    if (timer !== 1) realClearInterval(timer);
  });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  getContainerDetailInformation.mockResolvedValue({ container_info: detail() });
  getContainerStatus.mockResolvedValue({});
  getContainerOperationLogs.mockResolvedValue({ logs: [log(1, 'stop_container')] });
  listAllUserBrefInformation.mockResolvedValue({ users: [] });
  startContainer.mockResolvedValue({ success: 1 });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ContainerDetailPage 操作历史随事实刷新', () => {
  it('test_q61_refresh_button_refetches_history', async () => {
    const user = userEvent.setup();
    getContainerOperationLogs
      .mockResolvedValueOnce({ logs: [log(1, 'stop_container')] })
      .mockResolvedValueOnce({ logs: [log(1, 'stop_container'), log(2, 'start_container')] });

    renderDetail();
    expect(await screen.findByText('停止容器')).toBeInTheDocument();
    expect(getContainerOperationLogs).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /刷\s*新/ }));

    await waitFor(() => expect(getContainerOperationLogs).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('启动容器')).toBeInTheDocument();
    expect(getContainerDetailInformation.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('test_q61_action_success_refetches_history', async () => {
    const user = userEvent.setup();
    getContainerOperationLogs
      .mockResolvedValueOnce({ logs: [log(1, 'stop_container')] })
      .mockResolvedValueOnce({ logs: [log(1, 'stop_container'), log(2, 'start_container')] });

    renderDetail();
    expect(await screen.findByText('停止容器')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^启\s*动$/ }));
    await user.click(await screen.findByRole('button', { name: /确认\s*启\s*动/ }));

    await waitFor(() => expect(startContainer).toHaveBeenCalledWith(12));
    await waitFor(() => expect(getContainerOperationLogs).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('启动容器')).toBeInTheDocument();
    expect(antdMessage.success).toHaveBeenCalledWith('启动成功');
  });

  it('test_q61_action_failure_no_success_history', async () => {
    const user = userEvent.setup();
    startContainer.mockRejectedValueOnce({
      status: 409,
      body: { message: 'start failed', error_reason: 'start_failed' },
      route: '/api/containers/start_container',
    });

    renderDetail();
    expect(await screen.findByText('停止容器')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^启\s*动$/ }));
    await user.click(await screen.findByRole('button', { name: /确认\s*启\s*动/ }));

    await waitFor(() => expect(showErrorModal).toHaveBeenCalled());
    expect(screen.getByText('停止容器')).toBeInTheDocument();
    expect(screen.queryByText('启动容器')).toBeNull();
    expect(getContainerOperationLogs).toHaveBeenCalledTimes(1);
    expect(antdMessage.success).not.toHaveBeenCalledWith('启动成功');
  });

  it('test_q61_stale_history_after_route_switch_ignored', async () => {
    const user = userEvent.setup();
    let resolveStaleRefresh;
    let logCalls = 0;
    getContainerDetailInformation.mockImplementation(async (id) => ({
      container_info: detail({
        container_id: id,
        container_name: id === 13 ? 'train-b' : 'train-a',
      }),
    }));
    getContainerOperationLogs.mockImplementation(() => {
      logCalls += 1;
      if (logCalls === 1) {
        return Promise.resolve({ logs: [log(1, 'stop_container')] });
      }
      if (logCalls === 2) {
        return new Promise((resolve) => {
          resolveStaleRefresh = () => resolve({
            logs: [log(1, 'stop_container'), log(9, 'restart_container')],
          });
        });
      }
      return Promise.resolve({ logs: [log(2, 'start_container')] });
    });

    renderDetailWithNavigation();
    expect(await screen.findByText('停止容器')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /刷\s*新/ }));
    await waitFor(() => expect(logCalls).toBe(2));
    expect(resolveStaleRefresh).toBeTypeOf('function');

    await user.click(screen.getByRole('button', { name: 'go-container-13' }));
    await waitFor(() => expect(logCalls).toBe(3));
    expect(await screen.findByText('启动容器')).toBeInTheDocument();

    await act(async () => {
      resolveStaleRefresh();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText('启动容器')).toBeInTheDocument();
    expect(screen.queryByText('重启容器')).toBeNull();
    expect(logCalls).toBe(3);
  });

  it('test_q61_initial_and_refresh_history_race_keeps_latest', async () => {
    const user = userEvent.setup();
    let resolveInitial;
    let logCalls = 0;
    getContainerOperationLogs.mockImplementation(() => {
      logCalls += 1;
      if (logCalls === 1) {
        return new Promise((resolve) => {
          resolveInitial = () => resolve({ logs: [log(1, 'stop_container')] });
        });
      }
      return Promise.resolve({ logs: [log(2, 'start_container')] });
    });

    renderDetail();
    await waitFor(() => expect(resolveInitial).toBeTypeOf('function'));

    await user.click(screen.getByRole('button', { name: /刷\s*新/ }));
    await waitFor(() => expect(logCalls).toBe(2));
    expect(await screen.findByText('启动容器')).toBeInTheDocument();

    await act(async () => {
      resolveInitial();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText('启动容器')).toBeInTheDocument();
    expect(screen.queryByText('停止容器')).toBeNull();
  });
});
