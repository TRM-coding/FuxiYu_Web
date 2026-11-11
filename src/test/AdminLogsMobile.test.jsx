import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../contexts/PermissionContext', () => ({
  usePermission: () => ({
    loaded: true,
    hasPermission: () => true,
    entities: ['operation_log:manage', 'bypass_auth_entity'],
    userId: 1,
    userName: 'operator1',
  }),
}));

vi.mock('../api/operation_log_api', () => ({
  listOperationLogs: vi.fn(),
  getOperationLogStats: vi.fn(),
}));

vi.mock('../api/user_api', () => ({
  listAllUserBrefInformation: vi.fn().mockResolvedValue({ users: [] }),
  getUserDetailInformation: vi.fn(),
}));

vi.mock('../api/machine_api', () => ({
  getDetailInformation: vi.fn(),
}));

vi.mock('../api/container_api', () => ({
  getContainerDetailInformation: vi.fn(),
}));

vi.mock('../utils/showErrorModal', () => ({ default: vi.fn() }));

import { listOperationLogs, getOperationLogStats } from '../api/operation_log_api';
import AdminLogs from '../pages/AdminLogs';

const MOBILE_QUERY = '(max-width: 768px)';
const adminCss = readFileSync(path.resolve(process.cwd(), 'src/pages/AdminLogs.css'), 'utf8');

const LOG = {
  id: 1,
  operator_user_id: null,
  operation: 'update_machine',
  target_type: 'machine',
  target_id: 3,
  detail: {
    before: { machine_status: 'online' },
    after: { machine_status: 'maintenance' },
  },
  success: true,
  error_reason: null,
  created_at: '2026-08-16T08:00:00',
};

const LONG_LOG = {
  ...LOG,
  id: 2,
  detail: {
    requested: 'very-long-value-' + 'x'.repeat(260),
    url: 'https://example.test/' + 'very-long-path/'.repeat(12),
  },
};

let originalMatchMedia;
let originalInnerWidth;

const setViewport = (width) => {
  window.matchMedia = vi.fn().mockImplementation(query => ({
    matches: width <= 768 && String(query).includes(MOBILE_QUERY),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  window.innerWidth = width;
};

const renderPage = () => render(
  <MemoryRouter>
    <AdminLogs />
  </MemoryRouter>,
);

describe('AdminLogs 移动端日志详情与 320px 收缩', () => {
  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    originalInnerWidth = window.innerWidth;
    listOperationLogs.mockReset();
    getOperationLogStats.mockReset();
    listOperationLogs.mockResolvedValue({ logs: [LOG], total_pages: 1 });
    getOperationLogStats.mockResolvedValue({
      total: 1, succeeded: 1, failed: 0, by_operation: { update_machine: 1 },
    });
    localStorage.setItem('currentUserName', 'operator1');
    localStorage.setItem('currentUserId', '1');
  });

  afterEach(() => {
    cleanup();
    window.matchMedia = originalMatchMedia;
    window.innerWidth = originalInnerWidth;
    vi.restoreAllMocks();
  });

  it('tc_logs_01_mobile_390_768_expand_collapse', async () => {
    for (const width of [390, 768]) {
      cleanup();
      setViewport(width);
      renderPage();
      await screen.findAllByText('更新机器');
      fireEvent.click(screen.getByRole('button', { name: '展开详情' }));
      expect(screen.getByRole('button', { name: '收起详情' })).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('结构化')).toBeInTheDocument();
      expect(screen.getByText('复制详情')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '收起详情' }));
      expect(screen.queryByText('结构化')).toBeNull();
    }
  });

  it('tc_logs_02_320_side_contract', async () => {
    const sideBlock = adminCss.match(/\.als-side\s*\{([\s\S]*?)\}/)?.[1] || '';
    expect(sideBlock).toMatch(/min-width:\s*min\(300px,\s*100%\)/);
    setViewport(320);
    renderPage();
    await screen.findAllByText('更新机器');
    expect(document.querySelector('.app-table-mobile-card')).not.toBeNull();
    expect(document.querySelector('.als-side')).not.toBeNull();
    expect(document.querySelector('.als-wall-wrap')).not.toBeNull();
  });

  it('tc_logs_03_long_detail_320', async () => {
    listOperationLogs.mockResolvedValue({ logs: [LONG_LOG], total_pages: 1 });
    setViewport(320);
    renderPage();
    await screen.findAllByText('更新机器');
    fireEvent.click(screen.getByRole('button', { name: '展开详情' }));

    expect(document.querySelector('.admin-logs-kv')).not.toBeNull();
    expect(screen.getByText(/very-long-path/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '收起详情' })).toBeInTheDocument();
  });

  it('tc_logs_04_week_and_toolbar_wrap_contract', () => {
    expect(adminCss).toMatch(/@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.admin-logs-week\s+\.ant-space[\s\S]*?flex-wrap:\s*wrap/s);
    expect(adminCss).toMatch(/\.admin-logs-week\s+\.ant-space-item\s*\{[^}]*flex-shrink:\s*0/s);
    expect(adminCss).toMatch(/\.admin-logs-week\s+\.ant-space-item\s*>\s*\.ant-typography\s*\{[^}]*white-space:\s*nowrap/s);
    expect(adminCss).toMatch(/\.admin-logs-detail-toolbar[\s\S]*?flex-wrap:\s*wrap/);
  });
});
