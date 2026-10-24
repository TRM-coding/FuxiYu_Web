import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { PermissionProvider, usePermission } from '../contexts/PermissionContext';
import * as userApi from '../api/user_api';

// mock 数据链的源头:getUserPermissions
vi.spyOn(userApi, 'getUserPermissions');

const Consumer = () => {
  const { entities, loaded, hasPermission, userId, userName, imageResourceUnrestricted, refresh } = usePermission();
  return (
    <div>
      <span data-testid="loaded">{String(loaded)}</span>
      <span data-testid="machine-manage">{String(hasPermission('machine:manage'))}</span>
      <span data-testid="container-view">{String(hasPermission('container:view'))}</span>
      <span data-testid="entities">{entities.join(',')}</span>
      <span data-testid="identity">{`${userId ?? ''}/${userName}`}</span>
      <span data-testid="image-resource">{String(imageResourceUnrestricted)}</span>
      <button type="button" onClick={() => { refresh(); }}>refresh</button>
    </div>
  );
};

const LocationProbe = () => {
  const location = useLocation();
  return <span data-testid="path">{location.pathname}</span>;
};

const renderWithProvider = () =>
  render(
    <MemoryRouter initialEntries={['/index']}>
      <PermissionProvider>
        <Consumer />
        <LocationProbe />
      </PermissionProvider>
    </MemoryRouter>
  );

describe('PermissionContext 数据链(API → Provider → hasPermission)', () => {
  beforeEach(() => {
    userApi.getUserPermissions.mockReset();
  });

  it('加载完成前 loaded=false(不误判无权限)', () => {
    userApi.getUserPermissions.mockImplementation(() => new Promise(() => {})); // 永不返回
    renderWithProvider();
    expect(screen.getByTestId('loaded').textContent).toBe('false');
    expect(screen.getByTestId('machine-manage').textContent).toBe('false');
  });

  it('API 返回权限集后 hasPermission 正确且 loaded=true', async () => {
    userApi.getUserPermissions.mockResolvedValue({
      entities: ['machine:view', 'container:operation', 'machine:manage'],
      userId: 7,
      userName: 'op1',
    });
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('loaded').textContent).toBe('true'));
    expect(screen.getByTestId('machine-manage').textContent).toBe('true');
    expect(screen.getByTestId('container-view').textContent).toBe('false');
    expect(screen.getByTestId('entities').textContent).toBe('machine:view,container:operation,machine:manage');
  });

  it('身份与权限同源：都来自那一次请求（cookie 读不到，身份只能由响应体给）', async () => {
    userApi.getUserPermissions.mockResolvedValue({
      entities: ['machine:view'],
      userId: 7,
      userName: 'op1',
    });
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('loaded').textContent).toBe('true'));
    expect(screen.getByTestId('identity').textContent).toBe('7/op1');
  });

  it('匿名访问不跳转：探针 401 ≠ 认证失效（/register 这类公开页必须进得去）', async () => {
    // 回归锁（P0）：App 级 Provider 挂载时会问一次"我是谁"，没登录时它必然 401。
    // 旧代码把这个 401 当成"认证失效"→ navigate('/')，于是**唯一的公开页 /register
    // 对匿名访客彻底进不去**（登录页 '/' 只是因为"跳到自己"才无感）。2026-09 修。
    userApi.getUserPermissions.mockRejectedValue(
      Object.assign(new Error('failed to load permissions'), { status: 401 }),
    );

    render(
      <MemoryRouter initialEntries={['/register']}>
        <PermissionProvider>
          <LocationProbe />
        </PermissionProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/register'));
    await new Promise(resolve => setTimeout(resolve, 50)); // 给 401 的 catch 落地的时间
    expect(screen.getByTestId('path').textContent).toBe('/register');
  });

  it('auth:expired：清空快照（含资源位）+ 回登录页（客户端跳，不做整页重载）', async () => {
    userApi.getUserPermissions.mockResolvedValue({
      entities: ['machine:manage'],
      imageResourceUnrestricted: true,
      userId: 7,
      userName: 'op1',
    });
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('loaded').textContent).toBe('true'));
    expect(screen.getByTestId('path').textContent).toBe('/index');
    expect(screen.getByTestId('image-resource').textContent).toBe('true');

    act(() => {
      window.dispatchEvent(new CustomEvent('auth:expired', { detail: { reason: 'auth' } }));
    });

    // 换账号/失效后不能留着上一个人的权限（资源位一并清空）
    expect(screen.getByTestId('entities').textContent).toBe('');
    expect(screen.getByTestId('image-resource').textContent).toBe('false');
    expect(screen.getByTestId('identity').textContent).toBe('/');
    expect(screen.getByTestId('path').textContent).toBe('/');
  });

  it('资源级通配来自服务端字段：true 存入，缺字段保守 false（不从 entities 反推）', async () => {
    userApi.getUserPermissions.mockResolvedValue({
      entities: ['image:view', 'image:edit', 'image:manage'],
      imageResourceUnrestricted: true,
      userId: 3,
      userName: 'editor',
    });
    const first = renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('image-resource').textContent).toBe('true'));
    first.unmount();

    // 旧响应没有该字段：即便 entities 里有 image:manage，也必须是 false
    userApi.getUserPermissions.mockResolvedValue({
      entities: ['image:view', 'image:edit', 'image:manage'],
      userId: 3,
      userName: 'editor',
    });
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('loaded').textContent).toBe('true'));
    expect(screen.getByTestId('image-resource').textContent).toBe('false');
  });

  it('换账号 refresh：资源位被新响应替换', async () => {
    userApi.getUserPermissions.mockResolvedValue({
      entities: ['image:manage'],
      imageResourceUnrestricted: true,
      userId: 3,
      userName: 'editor',
    });
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('image-resource').textContent).toBe('true'));

    // 换成另一个账号：新响应说没有资源通配
    userApi.getUserPermissions.mockResolvedValue({
      entities: ['image:view'],
      imageResourceUnrestricted: false,
      userId: 8,
      userName: 'viewer',
    });
    fireEvent.click(screen.getByRole('button', { name: 'refresh' }));

    await waitFor(() => expect(screen.getByTestId('identity').textContent).toBe('8/viewer'));
    expect(screen.getByTestId('image-resource').textContent).toBe('false');
  });
});
