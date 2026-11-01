import React from 'react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// 确定性的"未完成 import"：viewer 模块的 mock 工厂返回一个永不 settle 的 promise，
// 用于观察加载期间舞台是**空占位**（不新增可见文案、无 aria 播报）。
// 本文件第二个用例再放行同一个 deferred，观察正常 viewer 就位。
// 依赖 vitest 按声明顺序执行本文件用例（第一个用例消费"未完成"状态）。
const viewerModule = vi.hoisted(() => {
  const state = { resolve: null };
  const promise = new Promise((resolve) => {
    state.resolve = resolve;
  });
  return { state, promise };
});

vi.mock('../components/ModelViewer', () => viewerModule.promise);

// 请求替身：真实 PermissionProvider 挂载即调用 getUserPermissions，不能打真实后端
vi.mock('../api/user_api', () => ({
  getUserPermissions: vi.fn(),
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  requestRegisterCode: vi.fn(),
}));

import { getUserPermissions } from '../api/user_api';
import { PermissionProvider } from '../contexts/PermissionContext';
import AppRoutes from '../routes';

// 预热页面模块图：await 动态导入，把 antd 首次转换移出断言窗口（不是 sleep）
beforeAll(async () => {
  await import('../pages/Login');
}, 60000);

beforeEach(() => {
  getUserPermissions.mockReset();
  getUserPermissions.mockResolvedValue({ entities: [], userId: null, userName: '' });
});

const renderLoginRoute = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <PermissionProvider>
        <AppRoutes />
      </PermissionProvider>
    </MemoryRouter>,
  );

describe('Three viewer 按需加载：空舞台占位（无新增可见文案）', () => {
  it('viewer 模块未完成时：右侧是空占位，左侧登录表单照常可用', async () => {
    renderLoginRoute();

    const stage = screen.getByTestId('model-stage-loading');
    expect(stage).toBeInTheDocument();
    // 空占位：不新增任何可见文案
    expect(stage).toBeEmptyDOMElement();
    expect(screen.queryByTestId('model-viewer')).not.toBeInTheDocument();
    expect(screen.queryByText(/3D 预览/)).not.toBeInTheDocument();

    // 左侧页面 chunk 与 viewer chunk 相互独立：登录表单照常解析
    expect(await screen.findByPlaceholderText('用户名或邮箱', undefined, { timeout: 10000 })).toBeInTheDocument();
  }, 30000);

  it('viewer 模块完成后：渲染正常 viewer，无额外可见文案，左侧仍可用', async () => {
    renderLoginRoute();

    // 放行 deferred：React 重试后渲染 mock viewer
    viewerModule.state.resolve({
      default: ({ modelPath }) => <div data-testid="model-viewer">{modelPath}</div>,
    });

    expect(await screen.findByTestId('model-viewer', undefined, { timeout: 10000 })).toHaveTextContent('/glb.opt.glb');
    expect(screen.queryByTestId('model-stage-loading')).not.toBeInTheDocument();
    expect(screen.queryByText(/3D 预览/)).not.toBeInTheDocument();
    expect(await screen.findByPlaceholderText('用户名或邮箱', undefined, { timeout: 10000 })).toBeInTheDocument();
  }, 30000);
});