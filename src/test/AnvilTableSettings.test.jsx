import React from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { message, unstableSetRender } from 'antd';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

vi.mock('../api/operation_log_api', () => ({
  listOperationLogs: vi.fn(),
  getOperationLogStats: vi.fn(),
}));

vi.mock('../api/user_api', () => ({
  getUserPermissions: vi.fn(),
  listAllUserBrefInformation: vi.fn(),
  getUserDetailInformation: vi.fn(),
}));

vi.mock('../api/machine_api', () => ({
  getDetailInformation: vi.fn(),
}));

vi.mock('../api/container_api', () => ({
  getContainerDetailInformation: vi.fn(),
  listDeletedContainers: vi.fn(),
  getDeletedContainerMountUsage: vi.fn(),
  cleanDeletedContainerMount: vi.fn(),
  resurrectDeletedContainer: vi.fn(),
}));

vi.mock('../api/settings_api', () => ({
  listSystemSettings: vi.fn(),
  updateSystemSettings: vi.fn(),
}));

import { listOperationLogs, getOperationLogStats } from '../api/operation_log_api';
import { getUserPermissions, listAllUserBrefInformation, getUserDetailInformation } from '../api/user_api';
import { getDetailInformation } from '../api/machine_api';
import {
  getContainerDetailInformation,
  listDeletedContainers,
  getDeletedContainerMountUsage,
  cleanDeletedContainerMount,
  resurrectDeletedContainer,
} from '../api/container_api';
import { listSystemSettings, updateSystemSettings } from '../api/settings_api';
import { PermissionProvider } from '../contexts/PermissionProvider';
import TableComponent from '../components/TableComponent';
import AppRoutes from '../routes';
import AdminLogs from '../pages/AdminLogs';
import Settings from '../pages/Settings';
import DeletedContainers from '../pages/DeletedContainers';
import NotFound from '../pages/NotFound';

const LOG = {
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

const STATS = {
  total: 2,
  succeeded: 2,
  failed: 0,
  by_operation: { update_machine: 2 },
  by_target_type: { machine: 2 },
  by_day: {},
};

const LONG_LOG = {
  ...LOG,
  id: 2,
  detail: {
    requested: 'very-long-value-' + 'x'.repeat(260),
    url: 'https://example.test/' + 'very-long-path/'.repeat(12),
  },
};

const SETTINGS = [
  {
    key: 'container.cleanup_after_days',
    label: '自动清理天数',
    group: '容器清理',
    value_type: 'integer',
    value: 7,
    min_value: 1,
    description: '容器长时间未 SSH 登录后的自动清理阈值。',
  },
  {
    key: 'container.cleanup_reminder_hours',
    label: '清理提醒节点',
    group: '容器清理',
    value_type: 'text',
    value: '72,24,12',
    description: '容器清理前邮件提醒节点，单位小时，逗号分隔。',
  },
];

const DELETED_RECORD = {
  deleted_id: 7,
  original_container_id: 3,
  container_name: 'deleted-train',
  image_name: 'fuxi/image-1:20260825T090016Z',
  machine_name: 'gpu-a',
  machine_ip: '10.0.0.8',
  mount_path: '/home/alice/containers/deleted-train',
  mount_cleanup_id: 11,
  removed_at: '2026-09-01T10:00:00',
  removed_trigger: 'api',
  mount_cleaned: false,
  cleaned_at: null,
  data_recoverable: true,
  snapshot: {
    cpu_number: 2,
    memory_gb: 4,
    gpu_number: 1,
    shared_gb: 1,
    port: 1024,
    accounts: [{ user_id: 1, system_username: 'alice', role: 'ROOT' }],
  },
};

const listResponse = (records, overrides = {}) => ({
  success: 1,
  records,
  total_number: records.length,
  total_page: 1,
  ...overrides,
});

const makeLog = (id, displayName) => ({
  ...LOG,
  id,
  target_display_name: displayName,
});

const setPermission = (entities, userId = 1, userName = 'op1') => {
  getUserPermissions.mockResolvedValue({ entities, userId, userName });
};

const originalMatchMedia = window.matchMedia;
const originalInnerWidth = window.innerWidth;
const originalInnerHeight = window.innerHeight;
const originalGetComputedStyle = window.getComputedStyle;

const setViewport = (width) => {
  window.matchMedia = vi.fn().mockImplementation(query => ({
    matches: width <= 768 && String(query).includes('(max-width: 768px)'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  window.innerWidth = width;
  window.innerHeight = width === 320 ? 568 : width === 390 ? 844 : width === 768 ? 1024 : 900;
};

const renderWithProvider = (ui, { path = '/index' } = {}) => render(
  <MemoryRouter initialEntries={[path]}>
    <PermissionProvider>{ui}</PermissionProvider>
  </MemoryRouter>,
);

const LocationProbe = () => {
  const location = useLocation();
  return <span data-testid="path">{location.pathname}</span>;
};

const inputFor = (label) => screen.getByText(label).closest('.settings-item').querySelector('input');

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

const visibleDialogs = () => Array.from(document.querySelectorAll('.ant-modal'))
  .filter(el => el.style.display !== 'none');

const dialogText = () => {
  const dialogs = visibleDialogs();
  if (!dialogs.length) throw new Error('当前没有可见的错误弹窗');
  return dialogs[dialogs.length - 1].textContent || '';
};

const closeAllDialogs = async () => {
  for (let i = 0; i < 5; i += 1) {
    const buttons = Array.from(document.querySelectorAll('.ant-modal button'))
      .filter(btn => (btn.textContent || '').replace(/\s/g, '') === '好的');
    if (!buttons.length) break;
    await act(async () => {
      buttons[buttons.length - 1].click();
    });
  }
  await waitFor(() => expect(visibleDialogs()).toHaveLength(0));
};

const CUSTOM_RECORDS = [{ id: 1, name: 'alpha' }, { id: 2, name: 'beta' }];
const CUSTOM_COLUMNS = [{ title: '名称', dataIndex: 'name', key: 'name' }];

const CustomExpandTable = () => {
  const [keys, setKeys] = React.useState([]);
  const columns = [
    ...CUSTOM_COLUMNS,
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <button
          type="button"
          onClick={() => setKeys(current => (
            current.includes(record.id)
              ? current.filter(key => key !== record.id)
              : [...current, record.id]
          ))}
        >
          自定义展开
        </button>
      ),
    },
  ];
  return (
    <TableComponent
      columns={columns}
      dataSource={CUSTOM_RECORDS}
      rowKey="id"
      pagination={false}
      expandable={{
        expandedRowKeys: keys,
        onExpandedRowsChange: setKeys,
        showExpandColumn: false,
        expandedRowRender: record => <div>详情-{record.name}</div>,
      }}
    />
  );
};

const messageRoots = new WeakMap();
const messageContainers = new Set();
let previousRenderer;

const renderAntdNode = (node, container) => {
  messageContainers.add(container);
  let root = messageRoots.get(container);
  if (!root) {
    root = createRoot(container);
    messageRoots.set(container, root);
  }
  root.render(node);
  return async () => {
    const current = messageRoots.get(container);
    if (!current) return;
    messageRoots.delete(container);
    messageContainers.delete(container);
    await current.unmount();
  };
};

const destroyMessages = async () => {
  message.destroy();
  await waitFor(() => expect(document.querySelectorAll('.ant-message-notice')).toHaveLength(0));
};

const unmountMessageRoots = async () => {
  for (const container of Array.from(messageContainers)) {
    const root = messageRoots.get(container);
    if (root) {
      messageRoots.delete(container);
      await root.unmount();
    }
    messageContainers.delete(container);
  }
};

beforeAll(() => {
  previousRenderer = unstableSetRender();
  expect(unstableSetRender(renderAntdNode)).toBe(renderAntdNode);
  window.getComputedStyle = (el) => originalGetComputedStyle.call(window, el);
});

afterAll(async () => {
  await destroyMessages();
  await unmountMessageRoots();
  unstableSetRender(previousRenderer);
  window.getComputedStyle = originalGetComputedStyle;
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  setViewport(1440);
  setPermission([]);
  listOperationLogs.mockResolvedValue({ logs: [LOG], total_pages: 1 });
  getOperationLogStats.mockResolvedValue(STATS);
  listAllUserBrefInformation.mockResolvedValue({ users: [] });
  getUserDetailInformation.mockResolvedValue({});
  getDetailInformation.mockResolvedValue({});
  getContainerDetailInformation.mockResolvedValue({});
  listDeletedContainers.mockResolvedValue(listResponse([DELETED_RECORD]));
  getDeletedContainerMountUsage.mockResolvedValue({
    success: 1,
    usages: [{
      deleted_id: 7,
      bytes: 1024,
      measured_at: '2026-10-18T03:04:05Z',
      pending: false,
      error: null,
    }],
  });
  cleanDeletedContainerMount.mockResolvedValue({ success: 1 });
  resurrectDeletedContainer.mockResolvedValue({ success: 1, container_id: 19 });
  listSystemSettings.mockResolvedValue({ settings: SETTINGS });
  updateSystemSettings.mockImplementation(async values => ({
    settings: SETTINGS.map(item => ({
      ...item,
      value: Object.prototype.hasOwnProperty.call(values, item.key) ? values[item.key] : item.value,
    })),
  }));
});

afterEach(async () => {
  await destroyMessages();
  cleanup();
  window.matchMedia = originalMatchMedia;
  window.innerWidth = originalInnerWidth;
  window.innerHeight = originalInnerHeight;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('AnvilTableSettings 规划测试', () => {
  describe('AdminLogs', () => {
    it('anvil_ts_admin_logs_route_assembly', async () => {
      setPermission(['operation_log:manage', 'bypass_auth_entity']);
      renderWithProvider(
        <>
          <AppRoutes />
          <LocationProbe />
        </>,
        { path: '/admin/logs' },
      );

      expect(await screen.findByText('更新机器', {}, { timeout: 10000 })).toBeInTheDocument();
      expect(screen.getAllByText('操作日志').length).toBeGreaterThan(0);
      expect(document.querySelector('.admin-shell')).not.toBeNull();
      expect(document.querySelector('.admin-logs')).not.toBeNull();
      expect(screen.getByTestId('path')).toHaveTextContent('/admin/logs');
    }, 30000);

    it('anvil_ts_admin_logs_week_filter_stats', async () => {
      setPermission(['operation_log:manage', 'bypass_auth_entity']);
      renderWithProvider(<AdminLogs />);

      await screen.findByText('更新机器');
      await waitFor(() => expect(getOperationLogStats).toHaveBeenCalledTimes(1));

      fireEvent.click(screen.getByRole('button', { name: /上一周/ }));
      await waitFor(() => expect(listOperationLogs.mock.calls.length).toBeGreaterThanOrEqual(2));
      await waitFor(() => expect(getOperationLogStats.mock.calls.length).toBeGreaterThanOrEqual(2));

      await selectFilterOption('操作类型', '删除容器');
      await waitFor(() => expect(listOperationLogs.mock.calls.length).toBeGreaterThanOrEqual(3));
      await waitFor(() => expect(getOperationLogStats.mock.calls.length).toBeGreaterThanOrEqual(3));

      const stats = document.querySelector('.admin-logs-stats');
      expect(stats).not.toBeNull();
      expect(within(stats).getByText('总操作数')).toBeInTheDocument();
      expect(within(stats).getByText('成功')).toBeInTheDocument();
    }, 30000);

    it('anvil_ts_admin_logs_mobile_expand_no_requests', async () => {
      for (const width of [390, 768]) {
        cleanup();
        setViewport(width);
        setPermission(['operation_log:manage', 'bypass_auth_entity']);
        listOperationLogs.mockClear();
        getOperationLogStats.mockClear();

        renderWithProvider(<AdminLogs />);
        await screen.findByText('更新机器');
        await waitFor(() => expect(getOperationLogStats).toHaveBeenCalledTimes(1));

        const card = document.querySelector('.app-table-mobile-card');
        expect(card).not.toBeNull();
        const listCalls = listOperationLogs.mock.calls.length;
        const statsCalls = getOperationLogStats.mock.calls.length;

        fireEvent.click(within(card).getByRole('button', { name: '展开详情' }));
        expect(within(card).getByRole('button', { name: '收起详情' }))
          .toHaveAttribute('aria-expanded', 'true');
        expect(within(card).getByText('结构化')).toBeInTheDocument();
        expect(listOperationLogs.mock.calls.length).toBe(listCalls);
        expect(getOperationLogStats.mock.calls.length).toBe(statsCalls);

        fireEvent.click(within(card).getByRole('button', { name: '收起详情' }));
        expect(within(card).getByRole('button', { name: '展开详情' }))
          .toHaveAttribute('aria-expanded', 'false');
        expect(within(card).queryByText('结构化')).toBeNull();
        expect(listOperationLogs.mock.calls.length).toBe(listCalls);
        expect(getOperationLogStats.mock.calls.length).toBe(statsCalls);
      }

      cleanup();
      setViewport(1440);
      setPermission(['operation_log:manage', 'bypass_auth_entity']);
      listOperationLogs.mockClear();
      getOperationLogStats.mockClear();
      renderWithProvider(<AdminLogs />);
      await screen.findByText('更新机器');

      expect(document.querySelector('table')).not.toBeNull();
      expect(screen.getAllByRole('button', { name: 'Expand row' }).length).toBeGreaterThan(0);
      expect(document.querySelector('.app-table-mobile-expand-toggle')).toBeNull();
    }, 30000);

    it('anvil_ts_admin_logs_320_layout_dom', async () => {
      setViewport(320);
      setPermission(['operation_log:manage', 'bypass_auth_entity']);
      listOperationLogs.mockResolvedValue({ logs: [LOG], total_pages: 4 });

      renderWithProvider(<AdminLogs />);
      await screen.findByText('更新机器');
      await waitFor(() => expect(document.querySelector('.admin-logs-stats')).not.toBeNull());

      expect(document.querySelector('.admin-logs-filter')).not.toBeNull();
      expect(document.querySelectorAll('.app-table-mobile-card').length).toBeGreaterThan(0);
      expect(document.querySelector('.ant-pagination')).not.toBeNull();
      expect(document.querySelector('.als-side')).not.toBeNull();
      expect(document.querySelector('.als-wall-wrap')).not.toBeNull();
    }, 20000);

    it('anvil_ts_admin_logs_desktop_1440_children_expand_page2', async () => {
      setViewport(1440);
      setPermission(['operation_log:manage', 'bypass_auth_entity']);
      listOperationLogs.mockImplementation(async ({ page }) => (
        page === 2
          ? { logs: [makeLog(2, '第二页日志')], total_pages: 4 }
          : { logs: [LOG], total_pages: 4 }
      ));

      renderWithProvider(<AdminLogs />);
      await screen.findByText('更新机器');
      await waitFor(() => expect(getOperationLogStats).toHaveBeenCalled());

      expect(document.querySelector('table')).not.toBeNull();
      const headers = Array.from(document.querySelectorAll('th'))
        .map(th => th.textContent.trim())
        .filter(Boolean);
      expect(headers).toEqual(['时间', '操作人', '操作', '目标', '结果']);

      const expandButtons = screen.getAllByRole('button', { name: 'Expand row' });
      expect(expandButtons.length).toBeGreaterThan(0);
      fireEvent.click(expandButtons[0]);
      expect(await screen.findByText('机器状态')).toBeInTheDocument();

      const listCallsAfterExpand = listOperationLogs.mock.calls.length;
      const statsCallsAfterExpand = getOperationLogStats.mock.calls.length;
      await act(async () => { await Promise.resolve(); });
      expect(listOperationLogs.mock.calls.length).toBe(listCallsAfterExpand);
      expect(getOperationLogStats.mock.calls.length).toBe(statsCallsAfterExpand);
      expect(document.querySelector('.app-table-mobile-card')).toBeNull();
      expect(document.querySelector('.app-table-mobile-expand-toggle')).toBeNull();

      fireEvent.click(document.querySelector('.ant-pagination-item-2'));
      await waitFor(() => expect(listOperationLogs).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, page_size: 20 }),
      ));
      expect(await screen.findByText(/第二页日志/)).toBeInTheDocument();
      expect(within(document.querySelector('.admin-logs-stats')).getByText('总操作数'))
        .toBeInTheDocument();

      fireEvent.click(screen.getAllByRole('button', { name: 'Expand row' })[0]);
      expect(await screen.findByText('机器状态')).toBeInTheDocument();
    }, 30000);

    it('anvil_ts_admin_logs_320_long_detail_action', async () => {
      setViewport(320);
      setPermission(['operation_log:manage', 'bypass_auth_entity']);
      listOperationLogs.mockResolvedValue({ logs: [LONG_LOG], total_pages: 1 });

      renderWithProvider(<AdminLogs />);
      await screen.findByText('更新机器');

      fireEvent.click(screen.getByRole('button', { name: '展开详情' }));
      expect(document.querySelector('.admin-logs-kv')).not.toBeNull();
      expect(screen.getByText(/very-long-path/)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: '收起详情' }));
      expect(screen.queryByText(/very-long-path/)).toBeNull();
      expect(screen.getByRole('button', { name: '展开详情' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: '展开详情' }));
      expect(await screen.findByText(/very-long-path/)).toBeInTheDocument();
    }, 20000);
  });

  describe('Settings', () => {
    it('anvil_ts_settings_route_assembly', async () => {
      setPermission(['settings:manage']);
      renderWithProvider(
        <>
          <AppRoutes />
          <LocationProbe />
        </>,
        { path: '/admin/settings' },
      );

      expect(await screen.findByText('自动清理天数', {}, { timeout: 10000 })).toBeInTheDocument();
      expect(screen.getAllByText('系统设置').length).toBeGreaterThan(0);
      expect(document.querySelector('.settings-page')).not.toBeNull();
      expect(screen.getByTestId('path')).toHaveTextContent('/admin/settings');
    }, 30000);

    it('anvil_ts_settings_save_refresh_success', async () => {
      setPermission(['settings:manage']);
      updateSystemSettings.mockImplementation(async values => ({
        settings: SETTINGS.map(item => ({
          ...item,
          value: item.key === 'container.cleanup_after_days' && values[item.key] != null
            ? values[item.key]
            : item.value,
        })),
      }));

      renderWithProvider(<Settings />);
      await screen.findByText('自动清理天数');

      fireEvent.change(inputFor('自动清理天数'), { target: { value: '9' } });
      await waitFor(() => expect(screen.getByText(/1 项待保存/)).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: /保存/ }));

      await waitFor(() => expect(updateSystemSettings).toHaveBeenCalledWith(
        expect.objectContaining({ 'container.cleanup_after_days': 9 }),
      ));
      expect(await screen.findByText('设置已保存', {}, { timeout: 3000 })).toBeInTheDocument();
      expect(document.querySelector('.ant-message')).not.toBeNull();
      expect(document.querySelector('.ant-message-notice')).not.toBeNull();
      await waitFor(() => expect(inputFor('自动清理天数').value).toBe('9'));
      expect(screen.getByText('无改动')).toBeInTheDocument();
    }, 20000);

    it('anvil_ts_settings_error_modal_frontend', async () => {
      setPermission(['settings:manage']);
      const invalid = Object.assign(new Error('Update settings failed: 422'), {
        status: 422,
        route: 'https://ctrl/api/settings/update',
        body: { success: 0, message: '设置项不合法', error_reason: 'invalid_setting' },
      });
      listSystemSettings.mockRejectedValueOnce(invalid);

      renderWithProvider(<Settings />);
      await waitFor(() => expect(visibleDialogs().length).toBeGreaterThan(0));
      expect(dialogText()).toContain('设置项不合法');
      expect(dialogText()).not.toContain('未收录的错误原因');
      await closeAllDialogs();
      cleanup();

      listSystemSettings.mockReset();
      listSystemSettings.mockResolvedValue({ settings: SETTINGS });
      const failed = Object.assign(new Error('Update settings failed: 422'), {
        status: 422,
        route: 'https://ctrl/api/settings/update',
        body: { success: 0, message: '写入设置失败', error_reason: 'update_failed' },
      });
      updateSystemSettings.mockRejectedValueOnce(failed);

      renderWithProvider(<Settings />);
      await screen.findByText('自动清理天数');
      fireEvent.change(inputFor('自动清理天数'), { target: { value: '9' } });
      await waitFor(() => expect(screen.getByText(/1 项待保存/)).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: /保存/ }));

      await waitFor(() => expect(visibleDialogs().length).toBeGreaterThan(0));
      expect(dialogText()).toContain('保存设置失败');
      expect(dialogText()).not.toContain('未收录的错误原因');
      await closeAllDialogs();
    }, 30000);
  });

  describe('NotFound', () => {
    it('anvil_ts_notfound_home_navigation', async () => {
      render(
        <MemoryRouter initialEntries={['/definitely-missing']}>
          <Routes>
            <Route path="/index" element={<div data-testid="home">home</div>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText('404')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /回到主页/ }));
      expect(await screen.findByTestId('home')).toBeInTheDocument();
    });
  });

  describe('TableComponent', () => {
    it('anvil_ts_table_deleted_columns_desktop', async () => {
      setViewport(1440);
      setPermission(['container:manage']);
      renderWithProvider(<DeletedContainers />);

      await screen.findByText('deleted-train');
      const headers = Array.from(document.querySelectorAll('th'))
        .map(th => th.textContent.trim())
        .filter(Boolean);
      expect(headers).toEqual(['容器', '机器', 'Mount', '逻辑用量', '删除时间', '状态', '操作']);

      const mountCell = document.querySelector('td.deleted-mount-cell');
      expect(mountCell).not.toBeNull();
      expect(mountCell.className).toContain('ant-table-cell-ellipsis');

      const widths = Array.from(document.querySelectorAll('colgroup col, th'))
        .map(el => el.style.width)
        .filter(Boolean);
      expect(widths).toEqual(expect.arrayContaining(['210px', '230px']));
      expect(document.querySelector('.app-table-mobile-card')).toBeNull();
    }, 20000);

    it('anvil_ts_table_empty_columns_data_both', () => {
      setViewport(1440);
      const first = render(
        <TableComponent
          columns={[]}
          dataSource={[]}
          rowKey="id"
          pagination={{ total: 21, pageSize: 10 }}
        />,
      );

      expect(document.querySelector('table')).not.toBeNull();
      expect(document.querySelector('.ant-empty')).not.toBeNull();
      expect(document.querySelector('.ant-pagination')).not.toBeNull();
      expect(document.querySelector('.app-table-mobile-card')).toBeNull();
      const headerTexts = Array.from(document.querySelectorAll('th'))
        .map(th => th.textContent.trim())
        .filter(Boolean);
      expect(headerTexts).toEqual([]);
      first.unmount();

      setViewport(390);
      const second = render(
        <TableComponent
          columns={[]}
          dataSource={[]}
          rowKey="id"
          pagination={{ total: 21, pageSize: 10 }}
        />,
      );
      expect(document.querySelector('.app-table-mobile-empty')).not.toBeNull();
      expect(document.querySelector('.ant-pagination-item-2')).not.toBeNull();
      expect(document.querySelectorAll('.app-table-mobile-card')).toHaveLength(0);
      second.unmount();

      render(
        <TableComponent
          dataSource={[]}
          pagination={{ total: 21, pageSize: 10 }}
        />,
      );
      expect(document.querySelector('.app-table-mobile-empty')).not.toBeNull();
      expect(document.querySelector('.ant-pagination-item-2')).not.toBeNull();
    });

    it('anvil_ts_table_deleted_mobile_values', async () => {
      setViewport(390);
      setPermission(['container:manage']);
      listDeletedContainers.mockResolvedValue(listResponse([DELETED_RECORD]));
      getDeletedContainerMountUsage.mockResolvedValue({
        success: 1,
        usages: [{
          deleted_id: 7,
          bytes: 1024,
          measured_at: '2026-10-18T03:04:05Z',
          pending: false,
          error: null,
        }],
      });

      renderWithProvider(<DeletedContainers />);
      const name = await screen.findByText('deleted-train');
      const card = name.closest('.app-table-mobile-card');
      expect(card).not.toBeNull();

      for (const label of ['容器', '机器', 'Mount', '逻辑用量', '删除时间', '状态', '操作']) {
        expect(within(card).getByText(label)).toBeInTheDocument();
      }
      expect(within(card).getByText('deleted-train')).toBeInTheDocument();
      expect(within(card).getByText('gpu-a')).toBeInTheDocument();
      expect(within(card).getByText('10.0.0.8')).toBeInTheDocument();
      expect(within(card).getByText('/home/alice/containers/deleted-train')).toBeInTheDocument();
      await waitFor(() => expect(within(card).getByText('1 KiB')).toBeInTheDocument());
      expect(within(card).getByText('mount 保留')).toBeInTheDocument();
      expect(within(card).getByText(/2026/)).toBeInTheDocument();
      expect(within(card).getByRole('button', { name: /恢复/ })).toBeInTheDocument();
      expect(within(card).getByRole('button', { name: /清理 mount/ })).toBeInTheDocument();
    }, 20000);

    it('anvil_ts_table_adminlogs_mobile_fields', async () => {
      setViewport(390);
      setPermission(['operation_log:manage', 'bypass_auth_entity']);
      listOperationLogs.mockResolvedValue({ logs: [LOG], total_pages: 4 });

      renderWithProvider(<AdminLogs />);
      await screen.findByText('更新机器');
      const card = document.querySelector('.app-table-mobile-card');
      expect(card).not.toBeNull();

      for (const label of ['时间', '操作人', '操作', '目标', '结果']) {
        expect(within(card).getByText(label)).toBeInTheDocument();
      }
      expect(within(card).getByText('系统')).toBeInTheDocument();
      expect(within(card).getByText('更新机器')).toBeInTheDocument();
      expect(within(card).getByText('机器 #3')).toBeInTheDocument();
      expect(within(card).getByText('成功')).toBeInTheDocument();
      expect(document.querySelector('.ant-pagination-item-2')).not.toBeNull();
      expect(listOperationLogs).toHaveBeenCalledTimes(1);
      expect(getOperationLogStats).toHaveBeenCalledTimes(1);
    }, 20000);

    it('anvil_ts_table_controlled_callback', () => {
      setViewport(390);
      const records = [{ id: 1, name: 'alpha' }, { id: 2, name: 'beta' }];
      const columns = [{ title: '名称', dataIndex: 'name', key: 'name' }];
      const onExpandedRowsChange = vi.fn();
      const onExpand = vi.fn();
      const expandable = {
        expandedRowKeys: [],
        onExpandedRowsChange,
        onExpand,
        expandedRowRender: record => <div>详情-{record.name}</div>,
      };
      const { rerender } = render(
        <TableComponent
          columns={columns}
          dataSource={records}
          rowKey="id"
          pagination={false}
          expandable={expandable}
        />,
      );

      fireEvent.click(screen.getAllByRole('button', { name: '展开详情' })[0]);
      expect(onExpandedRowsChange).toHaveBeenLastCalledWith([1]);
      expect(onExpand).toHaveBeenLastCalledWith(true, records[0]);
      expect(screen.queryByText('详情-alpha')).toBeNull();
      expect(screen.getAllByRole('button', { name: '展开详情' })[0])
        .toHaveAttribute('aria-expanded', 'false');

      rerender(
        <TableComponent
          columns={columns}
          dataSource={records}
          rowKey="id"
          pagination={false}
          expandable={{ ...expandable, expandedRowKeys: [1] }}
        />,
      );
      expect(screen.getByText('详情-alpha')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '收起详情' }));
      expect(onExpandedRowsChange).toHaveBeenLastCalledWith([]);
      expect(onExpand).toHaveBeenLastCalledWith(false, records[0]);
    });

    it('anvil_ts_table_custom_expand_action', () => {
      setViewport(390);
      render(<CustomExpandTable />);

      expect(screen.queryByRole('button', { name: '展开详情' })).toBeNull();
      const customButtons = screen.getAllByRole('button', { name: '自定义展开' });
      expect(customButtons).toHaveLength(2);

      fireEvent.click(customButtons[0]);
      expect(screen.getByText('详情-alpha')).toBeInTheDocument();
      fireEvent.click(screen.getAllByRole('button', { name: '自定义展开' })[0]);
      expect(screen.queryByText('详情-alpha')).toBeNull();
    });

    it('anvil_ts_table_missing_callback_isolation', () => {
      setViewport(390);
      const keys = [];
      const records = [{ id: 1, name: 'alpha' }, { id: 2, name: 'beta' }];
      render(
        <TableComponent
          columns={[{ title: '名称', dataIndex: 'name', key: 'name' }]}
          dataSource={records}
          rowKey="id"
          pagination={{ total: 21, pageSize: 20 }}
          expandable={{
            expandedRowKeys: keys,
            expandedRowRender: record => <div>详情-{record.name}</div>,
          }}
        />,
      );

      expect(screen.queryByRole('button', { name: '展开详情' })).toBeNull();
      expect(screen.queryByText('详情-alpha')).toBeNull();
      expect(document.querySelector('.ant-pagination-item-2')).not.toBeNull();

      const card = document.querySelector('.app-table-mobile-card');
      fireEvent.click(card);
      expect(keys).toEqual([]);
      expect(screen.queryByText('详情-alpha')).toBeNull();
    });

    it('anvil_ts_table_pagination_320_click', () => {
      setViewport(320);
      const columns = [{ title: '名称', dataIndex: 'name', key: 'name' }];
      const localRecords = Array.from({ length: 25 }, (_, index) => ({
        id: index + 1,
        name: `name-${index + 1}`,
      }));
      const onChangeFirst = vi.fn();
      const first = render(
        <TableComponent
          columns={columns}
          dataSource={localRecords}
          rowKey="id"
          pagination={{
            current: 1,
            pageSize: 10,
            total: 25,
            showTotal: total => `共 ${total} 条`,
            onChange: onChangeFirst,
          }}
        />,
      );

      expect(screen.getByText('共 25 条')).toBeInTheDocument();
      expect(document.querySelector('.ant-pagination-item-3')).not.toBeNull();
      fireEvent.click(document.querySelector('.ant-pagination-item-2'));
      expect(onChangeFirst).toHaveBeenCalledWith(2, 10);
      first.unmount();

      const onChangeSecond = vi.fn();
      render(
        <TableComponent
          columns={columns}
          dataSource={[{ id: 1, name: 'one' }]}
          rowKey="id"
          pagination={{
            current: 1,
            pageSize: 20,
            total: 21,
            onChange: onChangeSecond,
          }}
        />,
      );
      expect(document.querySelector('.ant-pagination-item-2')).not.toBeNull();
      fireEvent.click(document.querySelector('.ant-pagination-item-2'));
      expect(onChangeSecond).toHaveBeenCalledWith(2, 20);
    });

    it('anvil_ts_table_loading_transition', () => {
      setViewport(390);
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);
      const columns = [{ title: '名称', dataIndex: 'name', key: 'name' }];
      const { rerender } = render(
        <TableComponent
          columns={columns}
          dataSource={[]}
          rowKey="id"
          pagination={false}
          loading
        />,
      );

      expect(document.querySelector('.ant-spin-spinning')).not.toBeNull();
      expect(document.querySelectorAll('.app-table-mobile-card')).toHaveLength(0);

      rerender(
        <TableComponent
          columns={columns}
          dataSource={[{ id: 1, name: 'alpha' }]}
          rowKey="id"
          pagination={false}
          loading={false}
        />,
      );
      expect(document.querySelectorAll('.app-table-mobile-card')).toHaveLength(1);
      expect(screen.getByText('alpha')).toBeInTheDocument();

      rerender(
        <TableComponent
          columns={columns}
          dataSource={[]}
          rowKey="id"
          pagination={false}
          loading={false}
        />,
      );
      expect(document.querySelector('.app-table-mobile-empty')).not.toBeNull();
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });
});
