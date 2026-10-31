import React from 'react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── 替身：只替换与"路由含义 / 加载组织"无关的实现细节 ─────────────────────
// Three viewer：jsdom 无 WebGL，本文件不验证 3D
vi.mock('../components/ModelViewer', () => ({
  default: ({ modelPath }) => <div data-testid="model-viewer">{modelPath}</div>,
}));

// 具体业务页面的内部实现不在本文件范围内：桩化后只验证「路径 → 页面/守卫」
vi.mock('../pages/ManageUser', () => ({
  default: () => <div data-testid="manage-user-page">manage-user</div>,
}));
vi.mock('../pages/ContainerDetailPage', async () => {
  const { useParams } = await import('react-router-dom');
  // 具名组件：hooks 规则要求 useParams 出现在组件函数里
  function ContainerDetailPageStub() {
    const { containerId } = useParams();
    return <div data-testid="container-detail-page">container:{containerId}</div>;
  }
  return { default: ContainerDetailPageStub };
});
vi.mock('../pages/MachineDetailPage', async () => {
  const { useParams } = await import('react-router-dom');
  function MachineDetailPageStub() {
    const { machineId } = useParams();
    return <div data-testid="machine-detail-page">machine:{machineId}</div>;
  }
  return { default: MachineDetailPageStub };
});

// 请求替身：真实 PermissionProvider 挂载时会调 getUserPermissions；
// 登录 / 匿名注册页也只用到这三个导出。绝不发真实请求。
vi.mock('../api/user_api', () => ({
  getUserPermissions: vi.fn(),
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  requestRegisterCode: vi.fn(),
}));

import { getUserPermissions } from '../api/user_api';
import { PermissionProvider } from '../contexts/PermissionContext';
import AppRoutes from '../routes';

// 预热懒加载模块图：await 动态导入本身，把 Vite 首次转换 antd 等大依赖的开销
// 移出断言窗口（不是 sleep，是等模块真正就绪），避免与 waitFor 的默认超时赛跑。
beforeAll(async () => {
  await Promise.all([
    import('../pages/Login'),
    import('../pages/Register'),
    import('../pages/NotFound'),
    import('../layouts/AdminLayout'),
  ]);
}, 60000);

beforeEach(() => {
  getUserPermissions.mockReset();
});

// 懒加载断言窗口：显式给出条件等待上限（配合每个用例自己的 30s 超时）
const WAIT = { timeout: 10000 };
const TEST_TIMEOUT = 30000;

const renderApp = (path, { entities = [], userId = null, userName = '' } = {}) => {
  getUserPermissions.mockResolvedValue({ entities, userId, userName });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PermissionProvider>
        <AppRoutes />
      </PermissionProvider>
    </MemoryRouter>,
  );
};

describe('路由按需加载后仍保留原路由含义', () => {
  it('"/" 匿名进入登录页：布局骨架先就位，登录表单懒加载后出现且不被 401 推走', async () => {
    renderApp('/');
    // 布局骨架（登录/注册切换）不依赖页面 chunk，应立即可用
    expect(screen.getAllByRole('button', { name: /^登\s*录$/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /^注\s*册$/ }).length).toBeGreaterThan(0);
    expect(await screen.findByPlaceholderText('用户名或邮箱', undefined, WAIT)).toBeInTheDocument();
  }, TEST_TIMEOUT);

  it('"/register" 匿名注册可达，并与登录页共用同一个 LoginLayout', async () => {
    renderApp('/register');
    expect(await screen.findByPlaceholderText('请输入学校邮箱', undefined, WAIT)).toBeInTheDocument();
    // 布局切换按钮 + 注册页提交按钮：注册页仍在登录布局内，没有被拆到独立布局
    expect(screen.getAllByRole('button', { name: /^注\s*册$/ }).length).toBeGreaterThan(1);
  }, TEST_TIMEOUT);

  it('"/admin/users" 无 manage 权限 → AdminLayout 守卫仍渲染 403，不进入管理页', async () => {
    renderApp('/admin/users', { entities: [] });
    expect(await screen.findByText(/403/, undefined, WAIT)).toBeInTheDocument();
    expect(screen.queryByTestId('manage-user-page')).not.toBeInTheDocument();
  }, TEST_TIMEOUT);

  it('"/admin/users" 有 user:manage → 管理布局与管理页正常就位', async () => {
    renderApp('/admin/users', { entities: ['user:manage'], userId: 7, userName: 'op1' });
    expect(await screen.findByTestId('manage-user-page', undefined, WAIT)).toBeInTheDocument();
    expect(screen.queryByText(/403/)).not.toBeInTheDocument();
    expect(screen.getAllByText('用户管理').length).toBeGreaterThan(0);
  }, TEST_TIMEOUT);

  it('容器详情路径仍匹配并解析 :containerId', async () => {
    renderApp('/index/containers/12');
    expect(await screen.findByTestId('container-detail-page', undefined, WAIT)).toHaveTextContent('container:12');
  }, TEST_TIMEOUT);

  it('机器详情路径仍匹配并解析 :machineId', async () => {
    renderApp('/index/machines/7');
    expect(await screen.findByTestId('machine-detail-page', undefined, WAIT)).toHaveTextContent('machine:7');
  }, TEST_TIMEOUT);

  it('未匹配路径仍落到 404 路由', async () => {
    renderApp('/definitely-missing');
    expect(await screen.findByText('页面走丢了', undefined, WAIT)).toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
  }, TEST_TIMEOUT);
});