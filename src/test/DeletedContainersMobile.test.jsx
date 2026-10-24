import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const antdMessage = vi.hoisted(() => ({
  success: vi.fn(), warning: vi.fn(), error: vi.fn(), loading: vi.fn(),
}));

vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal();
  return { ...antd, message: antdMessage };
});

vi.mock('../contexts/PermissionContext', () => ({
  usePermission: () => ({
    loaded: true,
    hasPermission: code => code === 'container:manage',
  }),
}));

vi.mock('../api/container_api', () => ({
  cleanDeletedContainerMount: vi.fn(),
  getDeletedContainerMountUsage: vi.fn(),
  listDeletedContainers: vi.fn(),
  resurrectDeletedContainer: vi.fn(),
}));

vi.mock('../utils/showErrorModal', () => ({ default: vi.fn() }));

import {
  cleanDeletedContainerMount,
  getDeletedContainerMountUsage,
  listDeletedContainers,
  resurrectDeletedContainer,
} from '../api/container_api';
import DeletedContainers from '../pages/DeletedContainers';

const MOBILE_QUERY = '(max-width: 768px)';

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

const record = (overrides = {}) => ({
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
    cpu_number: 2, memory_gb: 4, gpu_number: 1, shared_gb: 1, port: 1024,
    accounts: [{ user_id: 1, system_username: 'alice', role: 'ROOT' }],
  },
  ...overrides,
});

const listResponse = (records, overrides = {}) => ({
  success: 1,
  records,
  total_number: records.length,
  total_page: 1,
  ...overrides,
});

const usageSuccess = (id, bytes = 1024, measuredAt = '2026-10-18T03:04:05Z') => ({
  deleted_id: id, bytes, measured_at: measuredAt, pending: false, error: null,
});
const usagePending = id => ({
  deleted_id: id, bytes: null, measured_at: null, pending: true, error: null,
});

let originalMatchMedia;
let originalInnerWidth;
let clipboardWrite;

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
    <DeletedContainers />
  </MemoryRouter>,
);

const cardOf = name => screen.getByText(name).closest('.app-table-mobile-card');
const mountChipOf = card => card.querySelector('.deleted-mount-chip');

beforeEach(() => {
  originalMatchMedia = window.matchMedia;
  originalInnerWidth = window.innerWidth;
  clipboardWrite = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: clipboardWrite },
  });
  vi.stubGlobal('fetch', vi.fn());
  listDeletedContainers.mockReset();
  getDeletedContainerMountUsage.mockReset();
  cleanDeletedContainerMount.mockReset();
  resurrectDeletedContainer.mockReset();
  listDeletedContainers.mockResolvedValue(listResponse([record()]));
  getDeletedContainerMountUsage.mockResolvedValue({ success: 1, usages: [] });
  cleanDeletedContainerMount.mockResolvedValue({ success: 1 });
  resurrectDeletedContainer.mockResolvedValue({ success: 1, container_id: 19 });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  window.matchMedia = originalMatchMedia;
  window.innerWidth = originalInnerWidth;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('DeletedContainers 移动端共享卡片布局', () => {
  it('tc_dc_01_mobile_390_seven_columns', async () => {
    setViewport(390);
    renderPage();
    await screen.findByText('deleted-train');

    expect(document.querySelectorAll('.app-table-mobile-card')).toHaveLength(1);
    expect(document.querySelector('table')).toBeNull();
    for (const label of ['容器', '机器', 'Mount', '逻辑用量', '删除时间', '状态', '操作']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('tc_dc_02_mobile_768_desktop_769', async () => {
    setViewport(768);
    renderPage();
    await screen.findByText('deleted-train');
    expect(document.querySelectorAll('.app-table-mobile-card')).toHaveLength(1);

    cleanup();
    setViewport(769);
    renderPage();
    await screen.findByText('deleted-train');
    expect(document.querySelector('table')).not.toBeNull();
    expect(document.querySelector('.app-table-mobile-card')).toBeNull();
  });

  it('tc_dc_03_mobile_320_long_actions', async () => {
    const longName = 'name-' + 'x'.repeat(160);
    const longPath = '/home/' + 'long-directory/'.repeat(20) + 'end';
    listDeletedContainers.mockResolvedValue(listResponse([record({ container_name: longName, mount_path: longPath })]));
    setViewport(320);
    renderPage();
    await screen.findByText(longName);

    const card = cardOf(longName);
    expect(card).not.toBeNull();
    expect(within(card).getByRole('button', { name: longPath })).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: /恢复/ })).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: /清理 mount/ })).toBeInTheDocument();
  });

  it('tc_dc_04_mobile_empty_page_pagination', async () => {
    listDeletedContainers.mockResolvedValue(listResponse([], { total_number: 21, total_page: 2 }));
    setViewport(390);
    renderPage();
    await screen.findByText('暂无已删除容器');

    expect(document.querySelector('.app-table-mobile-empty')).not.toBeNull();
    expect(document.querySelector('.ant-pagination-item-2')).not.toBeNull();
    expect(document.querySelectorAll('.app-table-mobile-card')).toHaveLength(0);
  });
});

describe('DeletedContainers 移动端详情展开', () => {
  it('tc_dc_05_mobile_390_expand_collapse', async () => {
    setViewport(390);
    renderPage();
    await screen.findByText('deleted-train');
    const usageCalls = getDeletedContainerMountUsage.mock.calls.length;
    const card = cardOf('deleted-train');

    fireEvent.click(within(card).getByRole('button', { name: '展开详情' }));
    expect(within(card).getByRole('button', { name: '收起详情' })).toHaveAttribute('aria-expanded', 'true');
    expect(within(card).getByText('镜像')).toBeInTheDocument();
    expect(within(card).getByText('fuxi/image-1:20260825T090016Z')).toBeInTheDocument();
    expect(within(card).getByText('alice:ROOT')).toBeInTheDocument();
    expect(getDeletedContainerMountUsage.mock.calls.length).toBe(usageCalls);

    fireEvent.click(within(card).getByRole('button', { name: '收起详情' }));
    expect(within(card).queryByText('镜像')).toBeNull();
  });

  it('tc_dc_06_desktop_expand_shared_state', async () => {
    setViewport(1440);
    renderPage();
    await screen.findByText('deleted-train');

    const toggle = document.querySelector('.ant-table-row-expand-icon');
    expect(toggle).not.toBeNull();
    fireEvent.click(toggle);
    expect(await screen.findByText('fuxi/image-1:20260825T090016Z')).toBeInTheDocument();
    expect(document.querySelector('.app-table-mobile-card')).toBeNull();
  });

  it('tc_dc_07_mobile_320_long_detail', async () => {
    const longAccount = 'user-' + 'y'.repeat(180);
    listDeletedContainers.mockResolvedValue(listResponse([record({
      snapshot: { accounts: [{ user_id: 1, system_username: longAccount, role: 'ROOT' }] },
    })]));
    setViewport(320);
    renderPage();
    await screen.findByText('deleted-train');

    fireEvent.click(screen.getByRole('button', { name: '展开详情' }));
    expect(document.querySelector('.deleted-container-detail')).not.toBeNull();
    expect(screen.getByText(`${longAccount}:ROOT`)).toBeInTheDocument();
  });

  it('tc_dc_08_mobile_stale_key_page_change', async () => {
    const pageOne = record({ deleted_id: 1, container_name: 'page-one' });
    const pageTwo = record({ deleted_id: 2, container_name: 'page-two' });
    listDeletedContainers.mockImplementation(async ({ page_number }) => (
      page_number === 2
        ? listResponse([pageTwo], { total_number: 21, total_page: 2 })
        : listResponse([pageOne], { total_number: 21, total_page: 2 })
    ));
    setViewport(390);
    renderPage();
    await screen.findByText('page-one');
    fireEvent.click(screen.getByRole('button', { name: '展开详情' }));
    expect(document.querySelector('.app-table-mobile-expanded')).not.toBeNull();

    fireEvent.click(document.querySelector('.ant-pagination-item-2'));
    expect(await screen.findByText('page-two')).toBeInTheDocument();
    expect(document.querySelector('.app-table-mobile-expanded')).toBeNull();
    expect(screen.queryByText('page-one')).toBeNull();
  });
});

describe('DeletedContainers 移动端 Mount 复制与用量', () => {
  it('tc_dc_09_mobile_320_mount_copy', async () => {
    const mountPath = '/home/alice/containers/deleted-train/with space/' + 'long/'.repeat(20) + 'end';
    listDeletedContainers.mockResolvedValue(listResponse([record({ mount_path: mountPath })]));
    setViewport(320);
    renderPage();
    await screen.findByText('deleted-train');

    const chip = mountChipOf(cardOf('deleted-train'));
    expect(chip).toHaveAttribute('title', mountPath);
    fireEvent.click(chip);
    await waitFor(() => expect(antdMessage.success).toHaveBeenCalledWith('已复制'));
    expect(clipboardWrite).toHaveBeenCalledWith(mountPath);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('tc_dc_10_mobile_copy_failure', async () => {
    const mountPath = '/home/alice/containers/deleted-train';
    clipboardWrite.mockRejectedValue(new Error('denied'));
    setViewport(390);
    renderPage();
    await screen.findByText('deleted-train');

    const chip = mountChipOf(cardOf('deleted-train'));
    fireEvent.click(chip);
    await waitFor(() => expect(antdMessage.error).toHaveBeenCalledWith('复制失败'));
    expect(chip).toHaveAttribute('title', mountPath);
    expect(chip).toHaveTextContent(mountPath);
  });

  it('tc_dc_11_mobile_390_usage_states', async () => {
    const rows = [
      record({ deleted_id: 1, container_name: 'row-limit', mount_path: '/m/1', mount_usage_limit_bytes: 2048 }),
      record({ deleted_id: 2, container_name: 'row-zero', mount_path: '/m/2' }),
      record({ deleted_id: 3, container_name: 'row-pending', mount_path: '/m/3' }),
      record({ deleted_id: 4, container_name: 'row-error', mount_path: '/m/4' }),
      record({ deleted_id: 5, container_name: 'row-missing', mount_path: '/m/5' }),
      record({ deleted_id: 6, container_name: 'row-cleaned', mount_path: '/m/6', mount_cleaned: true }),
      record({ deleted_id: 7, container_name: 'row-no-mount', mount_path: '' }),
    ];
    listDeletedContainers.mockResolvedValue(listResponse(rows));
    getDeletedContainerMountUsage.mockResolvedValue({
      success: 1,
      usages: [
        usageSuccess(1, 1024),
        usageSuccess(2, 0),
        usagePending(3),
        { deleted_id: 4, bytes: null, measured_at: null, pending: false, error: 'node_timeout' },
      ],
    });
    setViewport(390);
    renderPage();
    await screen.findByText('row-limit');

    expect(within(cardOf('row-limit')).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    expect(within(cardOf('row-zero')).getByText('0 B')).toBeInTheDocument();
    expect(within(cardOf('row-pending')).getByText('测量中')).toBeInTheDocument();
    expect(within(cardOf('row-error')).getByText('统计超时')).toBeInTheDocument();
    expect(within(cardOf('row-missing')).getByText('统计不可用')).toBeInTheDocument();
    expect(within(cardOf('row-cleaned')).getAllByText('已清理').length).toBeGreaterThan(0);
    expect(within(cardOf('row-no-mount')).getAllByText('无挂载').length).toBeGreaterThan(0);
  });

  it('tc_dc_12_mobile_usage_loading', async () => {
    const batch = deferred();
    getDeletedContainerMountUsage.mockReturnValue(batch.promise);
    setViewport(390);
    renderPage();
    await screen.findByText('deleted-train');

    expect(within(cardOf('deleted-train')).getByText('读取统计中')).toBeInTheDocument();
    expect(within(cardOf('deleted-train')).queryByRole('progressbar')).toBeNull();

    await act(async () => {
      batch.resolve({ success: 1, usages: [usagePending(7)] });
      await Promise.resolve();
    });
    expect(within(cardOf('deleted-train')).getByText('测量中')).toBeInTheDocument();
  });

  it('tc_dc_13_mobile_cleaned_no_mount_no_sample', async () => {
    listDeletedContainers.mockResolvedValue(listResponse([
      record({ deleted_id: 6, container_name: 'row-cleaned', mount_cleaned: true }),
      record({ deleted_id: 7, container_name: 'row-no-mount', mount_path: '' }),
    ]));
    setViewport(390);
    renderPage();
    await screen.findByText('row-cleaned');

    expect(getDeletedContainerMountUsage).not.toHaveBeenCalled();
    expect(within(cardOf('row-cleaned')).getAllByText('已清理').length).toBeGreaterThan(0);
    expect(within(cardOf('row-no-mount')).getAllByText('无挂载').length).toBeGreaterThan(0);
  });
});

describe('DeletedContainers 移动端分页与统计上下文', () => {
  it('tc_dc_14_mobile_page_two_usage', async () => {
    const pageOne = record({ deleted_id: 1, container_name: 'page-one' });
    const pageTwo = record({ deleted_id: 22, container_name: 'page-two' });
    listDeletedContainers.mockImplementation(async ({ page_number }) => (
      page_number === 2
        ? listResponse([pageTwo], { total_number: 21, total_page: 2 })
        : listResponse([pageOne], { total_number: 21, total_page: 2 })
    ));
    setViewport(390);
    renderPage();
    await screen.findByText('page-one');

    fireEvent.click(document.querySelector('.ant-pagination-item-2'));
    expect(await screen.findByText('page-two')).toBeInTheDocument();
    await waitFor(() => expect(getDeletedContainerMountUsage).toHaveBeenLastCalledWith(
      [22],
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    ));
  });
});

describe('DeletedContainers 仅按当前页请求异步用量（移动端）', () => {
  it('tc_dc_19_usage_list_first_stats_later', async () => {
    const batch = deferred();
    getDeletedContainerMountUsage.mockReturnValue(batch.promise);
    setViewport(390);
    renderPage();
    await screen.findByText('deleted-train');

    expect(cardOf('deleted-train')).toBeInTheDocument();
    expect(within(cardOf('deleted-train')).getByText('读取统计中')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).toBeNull();

    await act(async () => {
      batch.resolve({ success: 1, usages: [usageSuccess(7, 0)] });
      await Promise.resolve();
    });
    expect(within(cardOf('deleted-train')).getByText('0 B')).toBeInTheDocument();
  });

  it('tc_dc_20_usage_only_current_page_ids', async () => {
    listDeletedContainers.mockResolvedValue(listResponse([
      record({ deleted_id: 1, container_name: 'id-one', mount_path: '/m/1' }),
      record({ deleted_id: 2, container_name: 'id-two', mount_path: '/m/2' }),
    ]));
    setViewport(390);
    renderPage();
    await screen.findByText('id-one');

    await waitFor(() => expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(1));
    expect(getDeletedContainerMountUsage.mock.calls[0][0]).toEqual([1, 2]);
    expect(JSON.stringify(getDeletedContainerMountUsage.mock.calls[0][0])).not.toContain('/m/');
  });

  it('tc_dc_21_usage_cleaned_no_mount_no_request', async () => {
    listDeletedContainers.mockResolvedValue(listResponse([
      record({ deleted_id: 6, container_name: 'cleaned', mount_cleaned: true }),
      record({ deleted_id: 7, container_name: 'no-mount', mount_path: '' }),
    ]));
    setViewport(390);
    renderPage();
    await screen.findByText('cleaned');

    expect(getDeletedContainerMountUsage).not.toHaveBeenCalled();
    expect(screen.queryByText('0 B')).toBeNull();
  });
});
