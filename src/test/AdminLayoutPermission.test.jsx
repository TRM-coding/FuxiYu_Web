import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import * as PermissionContext from '../contexts/PermissionContext';

// mock 权限上下文:可控 hasPermission / hasAnyManage / loaded
const mockPermission = vi.fn();
const mockHasAnyManage = vi.fn();
vi.spyOn(PermissionContext, 'usePermission').mockImplementation(() => ({
  entities: [],
  loaded: true,
  hasPermission: mockPermission,
  hasAnyManage: mockHasAnyManage,
}));

const renderLayout = () =>
  render(
    <MemoryRouter initialEntries={['/admin/users']}>
      <AdminLayout />
    </MemoryRouter>
  );

describe('AdminLayout 权限过滤与守卫', () => {
  beforeEach(() => {
    mockPermission.mockReset();
    mockPermission.mockReturnValue(true); // 默认全有
  });

  it('operator(全权限)显示全部管理菜单', () => {
    renderLayout();
    // 桌面 + 移动端两个 Menu 都渲染,用 queryAllByText 断言存在
    expect(screen.queryAllByText('用户管理').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('机器管理').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('公告管理').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('操作日志').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('系统设置').length).toBeGreaterThan(0);
  });

  it('只有 machine:manage 时只显示机器管理', () => {
    mockPermission.mockImplementation(code => code === 'machine:manage');
    renderLayout();
    expect(screen.queryAllByText('机器管理').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('用户管理')).toHaveLength(0);
    expect(screen.queryAllByText('公告管理')).toHaveLength(0);
    expect(screen.queryAllByText('操作日志')).toHaveLength(0);
    expect(screen.queryAllByText('系统设置')).toHaveLength(0);
  });

  it('无任何 manage 权限时渲染 403', () => {
    mockPermission.mockReturnValue(false);
    renderLayout();
    expect(screen.getByText(/403/)).toBeTruthy();
  });
});
