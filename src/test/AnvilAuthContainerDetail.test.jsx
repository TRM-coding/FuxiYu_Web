import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

/**
 * frontend--authentication / 容器资源能力独立于方法权限展开 /
 * 方法通配不得单独放行：真实 ContainerDetailPage + 真实 PermissionProvider。
 *
 * 独立文件，不改 detail-credential 批次的测试与组件。
 */

vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal();
  return {
    ...antd,
    message: {
      success: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
      loading: vi.fn(),
      destroy: vi.fn(),
    },
  };
});

vi.mock('../utils/showErrorModal', () => ({ default: vi.fn() }));

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
  getUserPermissions: vi.fn(),
  listAllUserBrefInformation: vi.fn(),
}));

import {
  getContainerDetailInformation,
  getContainerOperationLogs,
  resetContainerPassword,
} from '../api/container_api';
import {
  getUserPermissions,
  listAllUserBrefInformation,
} from '../api/user_api';
import { PermissionProvider } from '../contexts/PermissionContext';
import ContainerDetailPage from '../pages/ContainerDetailPage';

const accounts = [
  { user_id: 1, username: 'root_user', role: 'ROOT' },
  { user_id: 2, username: 'alice', role: 'COLLABORATOR' },
];

const detail = {
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
};

const renderDetail = () =>
  render(
    <MemoryRouter initialEntries={['/index/containers/12']}>
      <PermissionProvider>
        <Routes>
          <Route path="/index/containers/:containerId" element={<ContainerDetailPage />} />
        </Routes>
      </PermissionProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  getUserPermissions.mockResolvedValue({
    entities: ['container:operation', 'container:manage', 'bypass_auth_entity'],
    containerResourceUnrestricted: false,
    userId: 2,
    userName: 'alice',
  });
  getContainerDetailInformation.mockResolvedValue({ container_info: detail });
  getContainerOperationLogs.mockResolvedValue({ logs: [] });
  listAllUserBrefInformation.mockResolvedValue({ users: [] });
  vi.spyOn(globalThis, 'setInterval').mockImplementation(() => 1);
  vi.spyOn(globalThis, 'clearInterval').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('frontend--authentication container detail reset entry', () => {
  it('test_anvil_container_detail_hides_reset_for_method_wildcard_without_resource_flag', async () => {
    renderDetail();

    expect(await screen.findByText('train-a')).toBeInTheDocument();
    await waitFor(() => expect(getUserPermissions).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: '重置密码' })).not.toBeInTheDocument();
    expect(resetContainerPassword).not.toHaveBeenCalled();
  }, 30000);
});
