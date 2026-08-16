import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// 组件直调这两个 api 模块
vi.mock('../api/operation_log_api', () => ({
  listOperationLogs: vi.fn().mockResolvedValue({
    logs: [{
      id: 1,
      operator_user_id: null,
      operation: 'update_machine',
      target_type: 'machine',
      target_id: 3,
      detail: { before: { machine_status: 'online' }, after: { machine_status: 'maintenance' } },
      success: true,
      error_reason: null,
      created_at: '2026-08-16T08:00:00',
    }],
    total_pages: 1,
  }),
  getOperationLogStats: vi.fn().mockResolvedValue({
    total: 1, succeeded: 1, failed: 0,
    by_operation: { update_machine: 1 },
    by_target_type: { machine: 1 },
  }),
}));

vi.mock('../api/user_api', () => ({
  getUserDetailInformation: vi.fn().mockResolvedValue({
    user_info: { id: 1, username: 'operator1', permission: 'operator' },
  }),
  listAllUserBrefInformation: vi.fn().mockResolvedValue({
    users: [{ user_id: 1, username: 'operator1' }],
  }),
}));

import { listOperationLogs } from '../api/operation_log_api';
import AdminLogs from '../pages/AdminLogs';

// 注意：'更新机器' 会同时出现在操作列 Tag 与统计图条形标签里，
// 多元素匹配时 findByText 会抛错，因此用 findAllByText。
const waitPageLoaded = async () => {
  const els = await screen.findAllByText('更新机器');
  expect(els.length).toBeGreaterThan(0);
};

describe('AdminLogs 日志页', () => {
  beforeEach(() => {
    localStorage.setItem('currentUserName', 'operator1');
    localStorage.setItem('currentUserId', '1');
    listOperationLogs.mockClear();
  });

  it('渲染日志行：操作名走中文映射，操作人为系统', async () => {
    render(<MemoryRouter><AdminLogs /></MemoryRouter>);

    await waitPageLoaded();
    expect(screen.getByText('系统')).toBeInTheDocument();
    expect(screen.getByText('总操作数')).toBeInTheDocument();
  });

  it('展开行显示前→后对比（状态值翻译）', async () => {
    render(<MemoryRouter><AdminLogs /></MemoryRouter>);

    await waitPageLoaded();
    const expandBtn = screen.getByRole('button', { name: 'Expand row' });
    await userEvent.click(expandBtn);

    // before/after 视图：旧状态与新状态的中文翻译都在
    expect(await screen.findByText('运行中')).toBeInTheDocument();
    expect(screen.getByText('维护中')).toBeInTheDocument();
    expect(screen.getByText('机器状态')).toBeInTheDocument();
  });

  it('点击「上一周」以新的时间范围重新查询', async () => {
    render(<MemoryRouter><AdminLogs /></MemoryRouter>);

    await waitPageLoaded();
    await userEvent.click(screen.getByRole('button', { name: /上一周/ }));

    await waitFor(() => {
      expect(listOperationLogs.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
    // 第二次查询必须带 start/end（周范围）
    const lastCall = listOperationLogs.mock.calls[listOperationLogs.mock.calls.length - 1][0];
    expect(lastCall.start).toBeTruthy();
    expect(lastCall.end).toBeTruthy();
  });
});
