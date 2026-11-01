import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Q04 收尾回归（Settings）：业务请求失败的 catch 必须让 403 走普通错误反馈。
 *
 *  - 403 = 后端业务拒绝：留在本页、身份不动、把后端原因显示出来；
 *  - 401 = 认证失效：仍走全局处理（handleAuthError → 回登录页 + 清历史本地身份），
 *    且不弹业务错误弹窗。
 *
 * 页面入口守卫（`loaded && !canManageSettings` 的整页 403）不在本文件范围：
 * 本文件刻意授予 settings:manage，走的是请求失败路径。
 */

vi.mock('../contexts/PermissionContext', () => ({
  usePermission: () => ({
    loaded: true,
    hasPermission: code => code === 'settings:manage',
  }),
}));

vi.mock('../api/settings_api', () => ({
  listSystemSettings: vi.fn(),
  updateSystemSettings: vi.fn(),
}));

vi.mock('../utils/showErrorModal', () => ({
  default: vi.fn(),
}));

import { listSystemSettings } from '../api/settings_api';
import showErrorModal from '../utils/showErrorModal';
import Settings from '../pages/Settings';

const LocationProbe = () => {
  const location = useLocation();
  return <span data-testid="path">{location.pathname}</span>;
};

const renderSettings = () =>
  render(
    <MemoryRouter initialEntries={['/admin/settings']}>
      <Settings />
      <LocationProbe />
    </MemoryRouter>,
  );

describe('Settings 业务失败的状态码分流', () => {
  beforeEach(() => {
    listSystemSettings.mockReset();
    showErrorModal.mockReset();
    localStorage.clear();
  });

  it('读取设置 403：显示后端拒绝原因，留在本页且身份保留', async () => {
    localStorage.setItem('currentUserName', 'op1');
    listSystemSettings.mockRejectedValue(Object.assign(new Error('forbidden'), {
      status: 403,
      route: 'https://ctrl/api/settings',
      body: { success: 0, message: '没有读取系统设置的权限', error_reason: 'insufficient_permission' },
    }));

    renderSettings();

    await waitFor(() => expect(showErrorModal).toHaveBeenCalledTimes(1));
    expect(showErrorModal.mock.calls[0][0]).toMatchObject({
      title: '读取设置失败',
      // 结构化错误必须保留 body 对象，路由映射才能命中 insufficient_permission。
      message: {
        success: 0,
        message: '没有读取系统设置的权限',
        error_reason: 'insufficient_permission',
      },
      status: 403,
      route: 'https://ctrl/api/settings',
    });
    expect(screen.getByTestId('path')).toHaveTextContent('/admin/settings');
    expect(localStorage.getItem('currentUserName')).toBe('op1');
  });

  it('读取设置 401：不弹业务错误、交回登录页并清历史本地身份', async () => {
    localStorage.setItem('currentUserId', '7');
    listSystemSettings.mockRejectedValue(Object.assign(new Error('expired'), { status: 401 }));

    renderSettings();

    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/'));
    expect(showErrorModal).not.toHaveBeenCalled();
    expect(localStorage.getItem('currentUserId')).toBeNull();
  });
});
