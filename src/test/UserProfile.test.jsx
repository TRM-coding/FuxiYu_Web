import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../api/user_api', () => ({
  getUserPermissions: vi.fn(),
  getUserDetailInformation: vi.fn(),
  updateUser: vi.fn(),
  changePasswordUser: vi.fn(),
  logoutUser: vi.fn(),
}));

vi.mock('../utils/showErrorModal', () => ({ default: vi.fn() }));

import { getUserPermissions, getUserDetailInformation, updateUser } from '../api/user_api';
import { PermissionProvider } from '../contexts/PermissionContext';
import User from '../pages/User';

const renderPage = () => render(
  <MemoryRouter>
    <PermissionProvider>
      <User />
    </PermissionProvider>
  </MemoryRouter>,
);

const yearInput = () => screen.getByRole('spinbutton');
const yearFormItem = () => screen.getByText('毕业时间').closest('.ant-form-item');
const clickYearModify = async () => {
  fireEvent.click(await within(yearFormItem()).findByRole('button', { name: '修改' }));
};

describe('User 个人资料毕业年份（Q54）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserPermissions.mockResolvedValue({ entities: ['user:manage'], userId: 7, userName: 'alice' });
    getUserDetailInformation.mockResolvedValue({
      user_info: { username: 'alice', email: 'alice@example.com', graduation_year: 2024 },
    });
    updateUser.mockResolvedValue({ success: 1 });
  });

  it('清空已有年份时显示明确反馈且不提交空值', async () => {
    renderPage();
    await waitFor(() => expect(yearInput()).toHaveValue('2024'));

    fireEvent.change(yearInput(), { target: { value: '' } });
    await clickYearModify();

    expect(await screen.findByText('毕业年份不能为空')).toBeInTheDocument();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it('有效年份正常提交数值', async () => {
    renderPage();
    await waitFor(() => expect(yearInput()).toHaveValue('2024'));

    fireEvent.change(yearInput(), { target: { value: '2025' } });
    await clickYearModify();

    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({
      user_id: 7,
      fields: { graduation_year: 2025 },
    }));
    expect(await screen.findByText('修改成功')).toBeInTheDocument();
  });
});
