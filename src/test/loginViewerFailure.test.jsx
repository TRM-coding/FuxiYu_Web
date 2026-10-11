import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// 模拟装饰性 3D chunk 加载失败：mock 工厂抛错 → 懒加载的动态 import 被拒绝。
// 断言点：失败被局部 ErrorBoundary 兜住，只留下**空舞台占位**（无新增可见文案），
// 登录布局与表单槽位仍然可用，路由不被牵连。
vi.mock('../components/ModelViewer', () => {
  throw new Error('viewer chunk load failed');
});

import LoginLayout from '../layouts/LoginLayout';

describe('Three viewer 加载失败时的局部降级（无新增可见文案）', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('viewer 动态导入被拒绝：右栏为空占位，登录布局与表单槽位仍渲染', async () => {
    // 兜底组件会记录错误，测试里静音以免污染输出（断言只看 DOM 行为）
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<LoginLayout />}>
            {/* 表单槽位：本用例只验证布局与降级，不引入页面模块（保持确定性、快） */}
            <Route index element={<input placeholder="用户名或邮箱" />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    const stage = await screen.findByTestId('model-stage-unavailable', undefined, { timeout: 10000 });
    // 降级态是空占位：保持原布局尺寸，不新增文案、不播报
    expect(stage).toBeEmptyDOMElement();
    expect(screen.queryByTestId('model-stage-loading')).not.toBeInTheDocument();
    expect(screen.queryByTestId('model-viewer')).not.toBeInTheDocument();
    expect(screen.queryByText(/3D 预览/)).not.toBeInTheDocument();

    // 左侧表单区与登录 / 匿名注册切换完全不受影响
    expect(screen.getByPlaceholderText('用户名或邮箱')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '注册' })).toBeInTheDocument();
  }, 30000);
});