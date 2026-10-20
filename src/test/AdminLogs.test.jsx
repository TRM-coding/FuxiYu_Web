import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  getUserPermissions: vi.fn(),
  listAllUserBrefInformation: vi.fn().mockResolvedValue({
    users: [{ user_id: 1, username: 'operator1' }],
  }),
}));

import { listOperationLogs } from '../api/operation_log_api';
import { getUserPermissions } from '../api/user_api';
import { PermissionProvider } from '../contexts/PermissionContext';
import AdminLogs from '../pages/AdminLogs';

const DEFAULT_LOG = {
  id: 1,
  operator_user_id: null,
  operation: 'update_machine',
  target_type: 'machine',
  target_id: 3,
  detail: { before: { machine_status: 'online' }, after: { machine_status: 'maintenance' } },
  success: true,
  error_reason: null,
  created_at: '2026-08-16T08:00:00',
};

const defaultListResponse = () => ({ logs: [DEFAULT_LOG], total_pages: 1 });

const makeLog = (id, displayName) => ({
  ...DEFAULT_LOG,
  id,
  operation: 'update_setting',
  target_type: 'system_setting',
  target_id: id,
  target_display_name: displayName,
  detail: {},
});

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

/** 在筛选栏里点选 antd Select 的某个选项（取最新打开的那份下拉）。 */
const selectFilterOption = async (label, optionText) => {
  const trigger = screen.getByText(label).closest('.ant-col').querySelector('.ant-select-selector');
  fireEvent.mouseDown(trigger);
  const option = await waitFor(() => {
    const options = Array.from(document.querySelectorAll('.ant-select-item-option'))
      .filter(el => (el.textContent || '').includes(optionText));
    if (!options.length) throw new Error(`未找到选项：${optionText}`);
    return options[options.length - 1];
  });
  fireEvent.click(option);
};

const paginationItem = (pageNumber) => document.querySelector(`.ant-pagination-item-${pageNumber}`);

const renderPage = () => render(
  <MemoryRouter>
    <PermissionProvider>
      <AdminLogs />
    </PermissionProvider>
  </MemoryRouter>,
);

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
    listOperationLogs.mockReset();
    listOperationLogs.mockResolvedValue(defaultListResponse());
    getUserPermissions.mockReset();
  });

  it('test_q22_admin_logs_current_response 当前上下文响应应用日志、总数与分页状态', async () => {
    getUserPermissions.mockResolvedValue({ entities: ['bypass_auth_entity', 'operation_log:manage'], userId: 1, userName: 'operator1' });
    listOperationLogs.mockResolvedValue({
      logs: [makeLog(21, '当前周日志')],
      total_pages: 4,
    });

    renderPage();

    expect(await screen.findByText(/当前周日志/)).toBeInTheDocument();
    expect(listOperationLogs).toHaveBeenCalledTimes(1);
    // total_pages=4、page_size=20 → 分页入口显示 4 页
    expect(paginationItem(4)).toBeTruthy();
    expect(paginationItem(1)).toHaveClass('ant-pagination-item-active');
  });

  it('test_q22_admin_logs_stale_week 旧周次响应晚到时不得覆盖上一周结果', async () => {
    getUserPermissions.mockResolvedValue({ entities: ['bypass_auth_entity', 'operation_log:manage'], userId: 1, userName: 'operator1' });
    const currentWeek = deferred();
    const previousWeek = deferred();
    listOperationLogs
      .mockImplementationOnce(() => currentWeek.promise)
      .mockImplementationOnce(() => previousWeek.promise);

    renderPage();
    await waitFor(() => expect(listOperationLogs).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole('button', { name: /上一周/ }));
    await waitFor(() => expect(listOperationLogs).toHaveBeenCalledTimes(2));

    await act(async () => {
      previousWeek.resolve({ logs: [makeLog(31, '上一周日志')], total_pages: 3 });
    });
    expect(await screen.findByText(/上一周日志/)).toBeInTheDocument();

    await act(async () => {
      currentWeek.resolve({ logs: [makeLog(32, '本周迟到日志')], total_pages: 1 });
    });

    expect(screen.queryByText(/本周迟到日志/)).not.toBeInTheDocument();
    expect(screen.getByText(/上一周日志/)).toBeInTheDocument();
    expect(paginationItem(3)).toBeTruthy();
  });

  it('test_q22_admin_logs_stale_filter_page 旧筛选响应晚到时不得覆盖当前筛选结果', async () => {
    getUserPermissions.mockResolvedValue({ entities: ['bypass_auth_entity', 'operation_log:manage'], userId: 1, userName: 'operator1' });
    const oldFilter = deferred();
    const newFilter = deferred();
    listOperationLogs
      .mockResolvedValueOnce({ logs: [makeLog(41, '初始筛选结果')], total_pages: 1 })
      .mockImplementationOnce(() => oldFilter.promise)
      .mockImplementationOnce(() => newFilter.promise);

    renderPage();
    expect(await screen.findByText(/初始筛选结果/)).toBeInTheDocument();

    await selectFilterOption('操作类型', '删除容器');
    await waitFor(() => expect(listOperationLogs).toHaveBeenCalledTimes(2));
    await selectFilterOption('操作类型', '更新机器');
    await waitFor(() => expect(listOperationLogs).toHaveBeenCalledTimes(3));

    await act(async () => {
      newFilter.resolve({ logs: [makeLog(42, '新筛选结果')], total_pages: 1 });
    });
    expect(await screen.findByText(/新筛选结果/)).toBeInTheDocument();

    await act(async () => {
      oldFilter.resolve({ logs: [makeLog(43, '旧筛选迟到结果')], total_pages: 5 });
    });

    expect(screen.queryByText(/旧筛选迟到结果/)).not.toBeInTheDocument();
    expect(screen.getByText(/新筛选结果/)).toBeInTheDocument();
    // 旧响应的 total_pages 也不得改写当前分页入口
    expect(paginationItem(5)).toBeNull();
  });

  it('test_q22_admin_logs_stale_page 旧页响应晚到时不得把列表和当前页拉回旧页', async () => {
    getUserPermissions.mockResolvedValue({ entities: ['bypass_auth_entity', 'operation_log:manage'], userId: 1, userName: 'operator1' });
    const oldPageTwo = deferred();
    const newPageOne = deferred();
    listOperationLogs
      .mockResolvedValueOnce({ logs: [makeLog(51, '第一页初始结果')], total_pages: 3 })
      .mockImplementationOnce(() => oldPageTwo.promise)
      .mockImplementationOnce(() => newPageOne.promise);

    renderPage();
    expect(await screen.findByText(/第一页初始结果/)).toBeInTheDocument();

    fireEvent.click(paginationItem(2));
    await waitFor(() => expect(listOperationLogs).toHaveBeenCalledTimes(2));

    fireEvent.click(paginationItem(1));
    await waitFor(() => expect(listOperationLogs).toHaveBeenCalledTimes(3));

    await act(async () => {
      newPageOne.resolve({ logs: [makeLog(52, '第一页新结果')], total_pages: 3 });
    });
    expect(await screen.findByText(/第一页新结果/)).toBeInTheDocument();

    await act(async () => {
      oldPageTwo.resolve({ logs: [makeLog(53, '第二页迟到结果')], total_pages: 3 });
    });

    expect(screen.queryByText(/第二页迟到结果/)).not.toBeInTheDocument();
    expect(screen.getByText(/第一页新结果/)).toBeInTheDocument();
    expect(paginationItem(1)).toHaveClass('ant-pagination-item-active');
  });

  it('渲染日志行：操作名走中文映射，操作人为系统', async () => {
    getUserPermissions.mockResolvedValue({ entities: ['bypass_auth_entity', 'operation_log:manage'], userId: 1, userName: 'operator1' });
    renderPage();

    await waitPageLoaded();
    expect(screen.getByText('系统')).toBeInTheDocument();
    expect(screen.getByText('总操作数')).toBeInTheDocument();
  });

  it('renders setting labels and deleted container display names without navigation', async () => {
    getUserPermissions.mockResolvedValue({ entities: ['bypass_auth_entity', 'operation_log:manage'], userId: 1, userName: 'operator1' });
    listOperationLogs.mockResolvedValueOnce({
      total_pages: 1,
      logs: [
        { id: 10, operation: 'update_setting', target_type: 'system_setting', target_id: 0,
          target_display_name: 'container.cleanup_after_days', success: true,
          created_at: '2026-08-16T08:00:00', detail: {} },
        { id: 11, operation: 'delete_container', target_type: 'container', target_id: 9,
          target_name: null, target_display_name: 'retained', root_owner: 'alice', success: true,
          created_at: '2026-08-16T08:00:00', detail: {} },
      ],
    });
    renderPage();
    expect(await screen.findByText('更新系统设置')).toBeInTheDocument();
    expect(screen.getByText('系统设置 container.cleanup_after_days')).toBeInTheDocument();
    const target = screen.getByText('容器 retained · 超管 alice');
    expect(target.closest('a')).toBeNull();
  });

  it('renders mail audit labels and announcement names without navigation', async () => {
    getUserPermissions.mockResolvedValue({ entities: ['bypass_auth_entity', 'operation_log:manage'], userId: 1, userName: 'operator1' });
    listOperationLogs.mockResolvedValueOnce({
      total_pages: 1,
      logs: [{ id: 12, operation: 'send_mail', target_type: 'announcement', target_id: 8,
        target_display_name: 'Maintenance', success: false, error_reason: 'smtp refused',
        created_at: '2026-08-16T08:00:00',
        detail: { mail_type: 'announcement', recipient: 'owner@example.test', subject: 'Maintenance' } }],
    });
    renderPage();
    expect(await screen.findByText('发送邮件')).toBeInTheDocument();
    expect(screen.getByText('公告 Maintenance').closest('a')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Expand row' }));
    expect(screen.getByText('邮件用途')).toBeInTheDocument();
    expect(screen.getByText('owner@example.test')).toBeInTheDocument();
    expect(screen.getByText(/error_reason: smtp refused/)).toBeInTheDocument();
  });

  it('展开行显示前→后对比（状态值翻译）', async () => {
    getUserPermissions.mockResolvedValue({ entities: ['bypass_auth_entity', 'operation_log:manage'], userId: 1, userName: 'operator1' });
    renderPage();

    await waitPageLoaded();
    const expandBtn = screen.getByRole('button', { name: 'Expand row' });
    await userEvent.click(expandBtn);

    // before/after 视图：旧状态与新状态的中文翻译都在
    expect(await screen.findByText('运行中')).toBeInTheDocument();
    expect(screen.getByText('维护中')).toBeInTheDocument();
    expect(screen.getByText('机器状态')).toBeInTheDocument();
  });

  it('点击「上一周」以新的时间范围重新查询', async () => {
    getUserPermissions.mockResolvedValue({ entities: ['bypass_auth_entity', 'operation_log:manage'], userId: 1, userName: 'operator1' });
    renderPage();

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

  it('普通用户（无 bypass_auth_entity）被拒入，不渲染日志内容', async () => {
    getUserPermissions.mockResolvedValue({ entities: ['container:view'], userId: 1, userName: 'operator1' });
    renderPage();

    // 403 弹窗出现，operator 专属内容（统计/日志表）不渲染
    expect(await screen.findByText('权限不足')).toBeInTheDocument();
    expect(screen.queryByText('总操作数')).not.toBeInTheDocument();
  });

  it('「本周」初始禁用；翻到上周后可用且点击跳回本周', async () => {
    getUserPermissions.mockResolvedValue({ entities: ['bypass_auth_entity', 'operation_log:manage'], userId: 1, userName: 'operator1' });
    renderPage();

    await waitPageLoaded();
    // antd 会给两字按钮自动插空格（渲染为「本 周」），用正则匹配
    const weekBtn = screen.getByRole('button', { name: /本\s*周/ });
    expect(weekBtn).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: /上一周/ }));
    await waitFor(() => {
      expect(listOperationLogs.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
    // 状态更新与重渲染提交是异步的，DOM 断言也要等
    await waitFor(() => expect(weekBtn).toBeEnabled());

    const callsBefore = listOperationLogs.mock.calls.length;
    await userEvent.click(weekBtn);
    await waitFor(() => {
      expect(listOperationLogs.mock.calls.length).toBe(callsBefore + 1);
    });
    await waitFor(() => expect(weekBtn).toBeDisabled()); // 已回到本周
  });
});
