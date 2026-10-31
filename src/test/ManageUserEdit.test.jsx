import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal();
  return {
    ...antd,
    message: { success: vi.fn(), warning: vi.fn(), error: vi.fn(), loading: vi.fn() },
  };
});

vi.mock('../api/user_api', () => ({
  getUserPermissions: vi.fn(),
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
  removeCollaborator: vi.fn(),
  setLongTermContainer: vi.fn(),
  startContainer: vi.fn(),
  stopContainer: vi.fn(),
  restartContainer: vi.fn(),
  unpauseContainer: vi.fn(),
}));

vi.mock('../utils/showErrorModal', () => ({ default: vi.fn() }));

import { message } from 'antd';
import { getUserPermissions, listAllUserBrefInformation, updateUser } from '../api/user_api';
import { PermissionProvider } from '../contexts/PermissionContext';
import ManageUser from '../pages/ManageUser';

const renderPage = () => render(
  <MemoryRouter>
    <PermissionProvider>
      <ManageUser />
    </PermissionProvider>
  </MemoryRouter>,
);

const yearInput = () => screen.getByDisplayValue('2024');

describe('ManageUser 毕业年份编辑（Q54）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserPermissions.mockResolvedValue({
      entities: ['bypass_auth_entity', 'user:manage', 'container:manage'],
      userId: 1,
      userName: 'root',
    });
    listAllUserBrefInformation.mockResolvedValue({
      users: [{
        user_id: 7,
        username: 'alice',
        email: 'alice@example.com',
        graduation_year: 2024,
        amount_of_container: 0,
      }],
    });
    updateUser.mockResolvedValue({ success: 1 });
  });

  it('卡片编辑中清空已有年份会阻止整个保存且不提交空值', async () => {
    renderPage();
    await waitFor(() => expect(yearInput()).toBeInTheDocument());

    fireEvent.change(yearInput(), { target: { value: '' } });
    // 同时修改用户名，验证不会只提交用户名而静默丢掉年份
    const usernameInput = screen.getByDisplayValue('alice');
    fireEvent.change(usernameInput, { target: { value: 'alice2' } });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(message.error).toHaveBeenCalledWith('毕业年份不能为空'));
    expect(updateUser).not.toHaveBeenCalled();
    expect(screen.queryByText('确认保存用户信息')).not.toBeInTheDocument();
  });

  it('有效年份会携带数值进入确认并提交', async () => {
    renderPage();
    await waitFor(() => expect(yearInput()).toBeInTheDocument());

    fireEvent.change(yearInput(), { target: { value: '2025' } });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    fireEvent.click(await screen.findByRole('button', { name: /确认保存/ }));
    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({
      user_id: 7,
      fields: { graduation_year: 2025 },
    }));
  });
});
