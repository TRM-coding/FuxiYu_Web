import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

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

import {
  listAllContainerBrefInformation,
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

const pageContainers = (pageNumber) => {
  if (pageNumber === 1) {
    return [
      container({ container_id: 21, container_name: 'paused-e', effective_status: 'paused' }),
      container({ container_id: 22, container_name: 'paused-f', effective_status: 'paused' }),
    ];
  }
  return [
    container({ container_id: 11, container_name: 'online-a' }),
    container({ container_id: 12, container_name: 'online-b' }),
    container({ container_id: 13, container_name: 'online-c' }),
    container({ container_id: 14, container_name: 'online-d' }),
  ];
};

const renderPage = () => render(
  <MemoryRouter initialEntries={['/admin/machines']}>
    <Routes>
      <Route path="/admin/machines" element={<ManageMachine />} />
      <Route path="/index/containers/:containerId" element={<div data-testid="container-detail-route">detail</div>} />
    </Routes>
  </MemoryRouter>,
);

const waitForCard = async (name) => {
  expect(await screen.findByText(name)).toBeInTheDocument();
  return screen.getByText(name).closest('.mm-container-card');
};

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
  listAllContainerBrefInformation.mockImplementation(async ({ page_number = 0 }) => ({
    containers_info: pageContainers(page_number),
    total_number: 6,
    total_page: 3,
  }));
  unpauseContainer.mockResolvedValue({ success: 1 });
});

describe('ManageMachine 详情入口与解冻保页', () => {
  it('test_q35_manage_machine_card_navigates_detail', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForCard('online-a');
    expect(screen.queryByText('容器详细信息')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'online-a' }));
    expect(await screen.findByTestId('container-detail-route')).toBeInTheDocument();
    expect(screen.queryByText('容器详细信息')).toBeNull();
  });

  it('test_q35_manage_machine_cancel_delete_no_modal', async () => {
    renderPage();
    const card = await waitForCard('online-a');
    expect(within(card).queryByRole('button', { name: /删\s*除/ })).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();

    const source = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/ManageMachine.jsx'), 'utf8');
    expect(source).not.toMatch(/ContainerDetailModal|openContainerDetail|returnToDetail|detailModalVisible/);
    expect(source).not.toMatch(/openDeleteContainerConfirm|handleDeleteContainerConfirm|containerDeleteConfirmVisible/);
  });

  it('test_q35_manage_machine_no_legacy_modal', async () => {
    renderPage();
    const card = await waitForCard('online-a');
    expect(within(card).getByRole('button', { name: 'online-a' })).toBeInTheDocument();
    expect(screen.queryByText('容器详细信息')).toBeNull();

    const source = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/ManageMachine.jsx'), 'utf8');
    expect(source).not.toMatch(/ContainerDetailModal/);
    expect(source).not.toMatch(/openContainerDetail/);
    expect(source).not.toMatch(/returnToDetail/);
    expect(source).not.toMatch(/detailModalVisible/);
  });

  it('test_q69_manage_machine_unpause_keeps_second_page', async () => {
    const user = userEvent.setup();
    const pageOneCalls = [];
    listAllContainerBrefInformation.mockImplementation(async ({ page_number = 0 }) => {
      if (page_number === 1) pageOneCalls.push(page_number);
      return {
        containers_info: pageContainers(page_number),
        total_number: 6,
        total_page: 3,
      };
    });

    renderPage();
    await waitForCard('online-a');
    await user.click(screen.getByRole('button', { name: '下一页' }));
    const pausedCard = await waitForCard('paused-e');
    expect(screen.getByText('2 / 3')).toBeInTheDocument();

    await user.click(within(pausedCard).getByRole('button', { name: /解冻/ }));
    await user.click(await screen.findByRole('button', { name: /确认解冻/ }));

    await waitFor(() => expect(unpauseContainer).toHaveBeenCalledWith(21));
    await waitFor(() => expect(pageOneCalls.length).toBeGreaterThanOrEqual(2));
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    expect(screen.getByText('paused-e')).toBeInTheDocument();
  });

  it('test_q69_manage_machine_unpause_switch_page_race', async () => {
    const user = userEvent.setup();
    let pageOneCalls = 0;
    let resolveStaleRefresh;
    listAllContainerBrefInformation.mockImplementation(({ page_number = 0 }) => {
      if (page_number === 1) {
        pageOneCalls += 1;
        if (pageOneCalls === 1) {
          return Promise.resolve({
            containers_info: pageContainers(1),
            total_number: 6,
            total_page: 3,
          });
        }
        return new Promise((resolve) => {
          resolveStaleRefresh = () => resolve({
            containers_info: pageContainers(1),
            total_number: 6,
            total_page: 3,
          });
        });
      }
      return Promise.resolve({
        containers_info: pageContainers(0),
        total_number: 6,
        total_page: 3,
      });
    });

    renderPage();
    await waitForCard('online-a');
    await user.click(screen.getByRole('button', { name: '下一页' }));
    const pausedCard = await waitForCard('paused-e');
    expect(screen.getByText('2 / 3')).toBeInTheDocument();

    await user.click(within(pausedCard).getByRole('button', { name: /解冻/ }));
    await user.click(await screen.findByRole('button', { name: /确认解冻/ }));
    await waitFor(() => expect(pageOneCalls).toBe(2));
    expect(resolveStaleRefresh).toBeTypeOf('function');

    await user.click(screen.getByRole('button', { name: '上一页' }));
    await waitForCard('online-a');
    expect(screen.getByText('1 / 3')).toBeInTheDocument();

    await act(async () => {
      resolveStaleRefresh();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText('online-a')).toBeInTheDocument();
    expect(screen.queryByText('paused-e')).toBeNull();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('test_q69_manage_machine_unpause_failure_keeps_page', async () => {
    const user = userEvent.setup();
    const pageOneCalls = [];
    listAllContainerBrefInformation.mockImplementation(async ({ page_number = 0 }) => {
      if (page_number === 1) pageOneCalls.push(page_number);
      return {
        containers_info: pageContainers(page_number),
        total_number: 6,
        total_page: 3,
      };
    });
    unpauseContainer.mockRejectedValueOnce({
      status: 409,
      body: { message: 'unpause failed', error_reason: 'unpause_failed' },
      route: '/api/containers/unpause_container',
    });

    renderPage();
    await waitForCard('online-a');
    await user.click(screen.getByRole('button', { name: '下一页' }));
    const pausedCard = await waitForCard('paused-e');
    expect(screen.getByText('2 / 3')).toBeInTheDocument();

    await user.click(within(pausedCard).getByRole('button', { name: /解冻/ }));
    await user.click(await screen.findByRole('button', { name: /确认解冻/ }));

    await waitFor(() => expect(showErrorModal).toHaveBeenCalled());
    await waitFor(() => expect(pageOneCalls.length).toBeGreaterThanOrEqual(2));
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    const kept = screen.getByText('paused-e').closest('.mm-container-card');
    expect(within(kept).getByText('磁盘已冻结')).toBeInTheDocument();
    expect(within(kept).queryByText('解冻中')).toBeNull();
  });
});
