import React from 'react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';

/**
 * Q03 回归锁：旧 Apply 入口（/index/apply）已清退，只保留 URL 兼容重定向。
 *
 *  - 不再渲染旧创建表单（旧表单只传 container.image，缺 image_id，提交必被 Ctrl 400 拒绝）；
 *  - 统一落到 /index/create（CreateContainer）；
 *  - 旧页面从不把筛选/分页写进 URL，能带走的有效上下文只有机器标识，
 *    因此 machine_id / machineId 查询参数要转成 CreateContainer 认识的 state.machineId。
 */

// CreateContainer 的内部实现不在本文件范围内：桩化后只验证「旧 URL 落到新入口 + 上下文保留」
vi.mock('../pages/CreateContainer', async () => {
  const { useLocation } = await import('react-router-dom');
  function CreateContainerStub() {
    const location = useLocation();
    const machineId = location.state?.machineId;
    return (
      <div data-testid="create-container">
        create:{machineId === undefined || machineId === null ? 'no-machine' : String(machineId)}
      </div>
    );
  }
  return { default: CreateContainerStub };
});

vi.mock('../api/user_api', () => ({
  getUserPermissions: vi.fn(),
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  requestRegisterCode: vi.fn(),
}));

import { getUserPermissions } from '../api/user_api';
import { PermissionProvider } from '../contexts/PermissionContext';
import AppRoutes from '../routes';

beforeAll(async () => {
  // 预热懒加载：重布局（MainLayout）与 404 各自成 chunk
  await Promise.all([import('../layouts/MainLayout'), import('../pages/NotFound')]);
}, 60000);

beforeEach(() => {
  getUserPermissions.mockReset();
  getUserPermissions.mockResolvedValue({ entities: [], userId: 7, userName: 'op1' });
});

const LocationProbe = () => {
  const location = useLocation();
  return <span data-testid="path">{`${location.pathname}${location.search}`}</span>;
};

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <PermissionProvider>
        <AppRoutes />
        <LocationProbe />
      </PermissionProvider>
    </MemoryRouter>,
  );

const WAIT = { timeout: 10000 };
const TEST_TIMEOUT = 30000;

describe('旧 Apply 入口清退后的 URL 兼容', () => {
  it('"/index/apply" 重定向到 "/index/create"，不再渲染旧表单', async () => {
    renderAt('/index/apply');

    expect(await screen.findByTestId('create-container', undefined, WAIT)).toHaveTextContent('create:no-machine');
    expect(screen.getByTestId('path')).toHaveTextContent('/index/create');
    expect(screen.getByTestId('path')).not.toHaveTextContent('/index/apply');
    // 旧表单的确认弹窗标题不得出现
    expect(screen.queryByText('添加容器')).not.toBeInTheDocument();
  }, TEST_TIMEOUT);

  it('"/index/apply?machine_id=42" 把机器上下文带到新入口', async () => {
    renderAt('/index/apply?machine_id=42');

    expect(await screen.findByTestId('create-container', undefined, WAIT)).toHaveTextContent('create:42');
    expect(screen.getByTestId('path')).toHaveTextContent('/index/create');
  }, TEST_TIMEOUT);

  it('兼容 camelCase 的 machineId 查询参数', async () => {
    renderAt('/index/apply?machineId=9');

    expect(await screen.findByTestId('create-container', undefined, WAIT)).toHaveTextContent('create:9');
  }, TEST_TIMEOUT);

  it('无机器上下文的旧链接仍回到新入口，不退化成 404', async () => {
    renderAt('/index/apply?page=3');

    expect(await screen.findByTestId('create-container', undefined, WAIT)).toHaveTextContent('create:no-machine');
    expect(screen.queryByText('页面走丢了')).not.toBeInTheDocument();
  }, TEST_TIMEOUT);
});
