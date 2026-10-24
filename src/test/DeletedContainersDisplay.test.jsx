import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const antdMessage = vi.hoisted(() => ({
  success: vi.fn(), warning: vi.fn(), error: vi.fn(), loading: vi.fn(),
}));

vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal();
  return {
    ...antd,
    message: antdMessage,
  };
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
  snapshot: { accounts: [] },
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
  deleted_id: id,
  bytes,
  measured_at: measuredAt,
  pending: false,
  error: null,
});

const usagePending = id => ({
  deleted_id: id,
  bytes: null,
  measured_at: null,
  pending: true,
  error: null,
});

const renderPage = () => render(
  <MemoryRouter>
    <DeletedContainers />
  </MemoryRouter>,
);

const rowOf = name => screen.getByText(name).closest('tr');
const mountCellOf = row => row.querySelector('.deleted-mount-cell');

const pad2 = value => String(value).padStart(2, '0');
const shortMeasureTime = value => {
  const date = new Date(value);
  return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};
const fullMeasureTime = value => new Date(value).toLocaleString('zh-CN', { hour12: false });

const expandRow = async (row) => {
  const toggle = row.querySelector('.ant-table-row-expand-icon');
  expect(toggle).not.toBeNull();
  fireEvent.click(toggle);
  const detail = await waitFor(() => {
    const element = document.querySelector('.deleted-container-detail');
    expect(element).not.toBeNull();
    return element;
  });
  return detail;
};

let clipboardWrite;

beforeEach(() => {
  vi.clearAllMocks();
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
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('DeletedContainers 逻辑用量展示', () => {
  it('test_success_usage_renders_progress_and_short_measurement_label', async () => {
    const measuredAt = '2026-09-01T10:00:00Z';
    getDeletedContainerMountUsage.mockResolvedValue({
      success: 1,
      usages: [usageSuccess(7, 1536, measuredAt)],
    });

    renderPage();
    expect(await screen.findByText('1.5 KiB')).toBeInTheDocument();

    const row = rowOf('deleted-train');
    const progress = within(row).getByRole('progressbar');
    expect(progress).toHaveClass('fuxi-nested-child-disk-track');
    expect(progress).not.toHaveAttribute('aria-valuenow');
    expect(progress).toHaveAttribute('aria-valuetext', '已测量，未提供可比上限');

    const label = within(row).getByText(`测量 ${shortMeasureTime(measuredAt)}`);
    expect(label).toHaveAttribute('title', fullMeasureTime(measuredAt));
    expect(within(row).getByTitle('du -sb 逻辑大小，非物理磁盘块占用')).toHaveTextContent('1.5 KiB');
    expect(within(row).queryByText(/测量于/)).toBeNull();
  });

  it('test_zero_byte_success_renders_success_progress_not_unknown', async () => {
    const measuredAt = '2026-09-02T10:00:00Z';
    getDeletedContainerMountUsage.mockResolvedValue({
      success: 1,
      usages: [usageSuccess(7, 0, measuredAt)],
    });

    renderPage();
    expect(await screen.findByText('0 B')).toBeInTheDocument();

    const row = rowOf('deleted-train');
    const progress = within(row).getByRole('progressbar');
    expect(progress).toHaveClass('fuxi-nested-child-disk-track');
    expect(progress).not.toHaveAttribute('aria-valuenow');
    expect(progress).toHaveAttribute('aria-valuetext', '已测量，未提供可比上限');
    expect(within(row).queryByText('统计不可用')).toBeNull();
    expect(within(row).getByText(`测量 ${shortMeasureTime(measuredAt)}`)).toBeInTheDocument();
  });

  it('test_positive_limit_is_determinate_and_missing_limit_is_indeterminate', async () => {
    listDeletedContainers.mockResolvedValue(listResponse([
      record({ deleted_id: 1, container_name: 'row-1', mount_path: '/m/1', mount_usage_limit_bytes: 2048 }),
      record({ deleted_id: 2, container_name: 'row-2', mount_path: '/m/2', mount_usage_limit_bytes: 2048 }),
      record({ deleted_id: 3, container_name: 'row-3', mount_path: '/m/3' }),
      record({ deleted_id: 4, container_name: 'row-4', mount_path: '/m/4', mount_usage_limit_bytes: 0 }),
    ]));
    getDeletedContainerMountUsage.mockResolvedValue({
      success: 1,
      usages: [
        usageSuccess(1, 1024, '2026-10-18T03:04:05Z'),
        usageSuccess(2, 4096, '2026-10-18T03:04:05Z'),
        usageSuccess(3, 1024, '2026-10-18T03:04:05Z'),
        usageSuccess(4, 1024, '2026-10-18T03:04:05Z'),
      ],
    });

    renderPage();
    expect(await screen.findByText('row-1')).toBeInTheDocument();

    const determinate = within(rowOf('row-1')).getByRole('progressbar');
    expect(determinate).toHaveAttribute('aria-valuenow', '50');
    expect(determinate).toHaveAttribute('aria-valuemin', '0');
    expect(determinate).toHaveAttribute('aria-valuemax', '100');
    expect(determinate.querySelector('.fuxi-nested-child-disk-fill')).toHaveStyle({ width: '50%' });

    const capped = within(rowOf('row-2')).getByRole('progressbar');
    expect(capped).toHaveAttribute('aria-valuenow', '100');
    expect(capped.querySelector('.fuxi-nested-child-disk-fill')).toHaveStyle({ width: '100%' });
    expect(within(rowOf('row-2')).getByText('4 KiB')).toBeInTheDocument();

    const noLimit = within(rowOf('row-3')).getByRole('progressbar');
    expect(noLimit).not.toHaveAttribute('aria-valuenow');
    expect(noLimit).toHaveAttribute('aria-valuetext', '已测量，未提供可比上限');

    const nonPositiveLimit = within(rowOf('row-4')).getByRole('progressbar');
    expect(nonPositiveLimit).not.toHaveAttribute('aria-valuenow');
    expect(nonPositiveLimit).toHaveAttribute('aria-valuetext', '已测量，未提供可比上限');
  });

  it('test_loading_and_pending_keep_existing_text_without_progress', async () => {
    const list = deferred();
    const batch = deferred();
    listDeletedContainers.mockReturnValue(list.promise);
    getDeletedContainerMountUsage.mockReturnValue(batch.promise);

    renderPage();
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByText('0 B')).toBeNull();

    await act(async () => {
      list.resolve(listResponse([record()]));
      await Promise.resolve();
    });
    expect(await screen.findByText('读取统计中')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).toBeNull();

    await act(async () => {
      batch.resolve({ success: 1, usages: [usagePending(7)] });
      await Promise.resolve();
    });
    expect(await screen.findByText('测量中')).toBeInTheDocument();

    const row = rowOf('deleted-train');
    expect(within(row).queryByRole('progressbar')).toBeNull();
    expect(within(row).queryByText('0 B')).toBeNull();
    expect(within(row).queryByText(/^测量 /)).toBeNull();
  });

  it('test_error_missing_and_cleaned_rows_keep_existing_states', async () => {
    listDeletedContainers.mockResolvedValue(listResponse([
      record({ deleted_id: 1, container_name: 'row-error', mount_path: '/m/1' }),
      record({ deleted_id: 2, container_name: 'row-missing', mount_path: '/m/2' }),
      record({ deleted_id: 3, container_name: 'row-cleaned', mount_path: '/m/3', mount_cleaned: true, cleaned_at: null }),
      record({ deleted_id: 4, container_name: 'row-no-mount', mount_path: '' }),
      record({ deleted_id: 5, container_name: 'row-malformed', mount_path: '/m/5' }),
    ]));
    getDeletedContainerMountUsage.mockResolvedValue({
      success: 1,
      usages: [
        { deleted_id: 1, bytes: null, measured_at: null, pending: false, error: 'node_timeout' },
        { deleted_id: 5, bytes: null, measured_at: null, pending: false, error: null },
      ],
    });

    renderPage();
    expect(await screen.findByText('row-error')).toBeInTheDocument();

    expect(within(rowOf('row-error')).getByText('统计超时')).toBeInTheDocument();
    expect(within(rowOf('row-missing')).getByText('统计不可用')).toBeInTheDocument();
    expect(within(rowOf('row-cleaned')).getAllByText('已清理').length).toBeGreaterThan(0);
    expect(within(rowOf('row-no-mount')).getAllByText('无挂载').length).toBeGreaterThan(0);
    expect(within(rowOf('row-malformed')).getByText('统计不可用')).toBeInTheDocument();

    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByText('0 B')).toBeNull();
    expect(screen.queryByText(/^测量 /)).toBeNull();
  });
});

describe('DeletedContainers 表格层级与 Mount 复制', () => {
  it('test_image_moves_to_expanded_detail_and_mount_uses_compact_copy_chip', async () => {
    const mountPath = '/home/alice/containers/deleted-train/with space';
    const imageName = 'fuxi/image-1:20260825T090016Z';
    listDeletedContainers.mockResolvedValue(listResponse([
      record({ mount_path: mountPath, image_name: imageName }),
    ]));

    renderPage();
    expect(await screen.findByText('deleted-train')).toBeInTheDocument();

    const row = rowOf('deleted-train');
    const headers = screen.getAllByRole('columnheader').map(th => th.textContent.trim());
    expect(headers).not.toContain('镜像');
    expect(headers).toEqual(expect.arrayContaining([
      '容器', '机器', 'Mount', '逻辑用量', '删除时间', '状态', '操作',
    ]));
    expect(within(row).queryByText(imageName)).toBeNull();

    const mountCell = mountCellOf(row);
    expect(mountCell).not.toBeNull();
    const chip = within(mountCell).getByRole('button', { name: mountPath });
    expect(chip).toHaveClass('fuxi-copy-chip-meta');
    expect(chip).toHaveClass('fuxi-copy-chip-soft');
    expect(chip).toHaveAttribute('title', mountPath);
    expect(chip).toHaveTextContent(mountPath);

    fireEvent.click(chip);
    await waitFor(() => expect(antdMessage.success).toHaveBeenCalledWith('已复制'));
    expect(clipboardWrite).toHaveBeenCalledWith(mountPath);

    expect(within(row).getByRole('button', { name: /恢复/ })).toBeInTheDocument();
    expect(within(row).getByRole('button', { name: /清理 mount/ })).toBeInTheDocument();

    const detail = await expandRow(row);
    expect(within(detail).getByText('镜像')).toBeInTheDocument();
    expect(within(detail).getByText(imageName)).toBeInTheDocument();
  });

  it('test_empty_mount_has_no_copy_control_and_empty_image_is_unknown', async () => {
    listDeletedContainers.mockResolvedValue(listResponse([
      record({ mount_path: '', image_name: '' }),
    ]));

    renderPage();
    expect(await screen.findByText('deleted-train')).toBeInTheDocument();

    const row = rowOf('deleted-train');
    const mountCell = mountCellOf(row);
    expect(mountCell).not.toBeNull();
    expect(within(mountCell).getByText('无挂载')).toBeInTheDocument();
    expect(within(mountCell).queryByRole('button')).toBeNull();
    expect(getDeletedContainerMountUsage).not.toHaveBeenCalled();
    expect(antdMessage.error).not.toHaveBeenCalled();

    const detail = await expandRow(row);
    expect(within(detail).getByText('未知')).toBeInTheDocument();
    expect(within(detail).queryByRole('button')).toBeNull();
  });

  it('test_mount_copy_failure_preserves_path', async () => {
    const mountPath = '/home/alice/containers/deleted-train';
    clipboardWrite.mockRejectedValue(new Error('denied'));

    renderPage();
    expect(await screen.findByText('deleted-train')).toBeInTheDocument();

    const row = rowOf('deleted-train');
    const chip = within(mountCellOf(row)).getByRole('button', { name: mountPath });
    fireEvent.click(chip);

    await waitFor(() => expect(antdMessage.error).toHaveBeenCalledWith('复制失败'));
    expect(chip).toHaveAttribute('title', mountPath);
    expect(chip).toHaveTextContent(mountPath);
    expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('test_pagination_usage_polling_cleanup_and_restore_are_unchanged', async () => {
    const user = userEvent.setup();
    let cleaned = false;
    const pageOneBeforeClean = [
      record({
        deleted_id: 1,
        container_name: 'row-clean',
        mount_path: '/m/1',
        mount_cleanup_id: 11,
      }),
      record({
        deleted_id: 2,
        container_name: 'row-restore',
        mount_path: '/m/2',
        mount_cleanup_id: 12,
      }),
    ];
    const pageTwo = [
      record({
        deleted_id: 3,
        container_name: 'row-page-2',
        mount_path: '/m/3',
        mount_cleanup_id: 13,
      }),
    ];

    listDeletedContainers.mockImplementation(async ({ page_number }) => {
      if (page_number === 2) {
        return listResponse(pageTwo, { total_number: 21, total_page: 2 });
      }
      return listResponse([
        cleaned
          ? record({
            deleted_id: 1,
            container_name: 'row-clean',
            mount_path: '/m/1',
            mount_cleanup_id: 11,
            mount_cleaned: true,
            cleaned_at: null,
          })
          : pageOneBeforeClean[0],
        pageOneBeforeClean[1],
      ], { total_number: 21, total_page: 2 });
    });
    getDeletedContainerMountUsage.mockImplementation(async ids => ({
      success: 1,
      usages: ids.map(id => usageSuccess(id, 1024)),
    }));
    cleanDeletedContainerMount.mockImplementation(async () => {
      cleaned = true;
      return { success: 1 };
    });

    renderPage();
    expect(await screen.findByText('row-clean')).toBeInTheDocument();
    await waitFor(() => expect(getDeletedContainerMountUsage).toHaveBeenLastCalledWith(
      [1, 2],
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    ));

    await user.click(document.querySelector('.ant-pagination-item-2 a'));
    expect(await screen.findByText('row-page-2')).toBeInTheDocument();
    await waitFor(() => expect(getDeletedContainerMountUsage).toHaveBeenLastCalledWith(
      [3],
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    ));

    const listCallsBeforeRefresh = listDeletedContainers.mock.calls.length;
    await user.click(screen.getByRole('button', { name: /刷新/ }));
    await waitFor(() => expect(listDeletedContainers.mock.calls.length).toBeGreaterThan(listCallsBeforeRefresh));
    expect(await screen.findByText('row-page-2')).toBeInTheDocument();
    await waitFor(() => expect(getDeletedContainerMountUsage).toHaveBeenLastCalledWith(
      [3],
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    ));

    await user.click(document.querySelector('.ant-pagination-item-1 a'));
    expect(await screen.findByText('row-clean')).toBeInTheDocument();

    const cleanRow = rowOf('row-clean');
    await user.click(within(cleanRow).getByRole('button', { name: /清理 mount/ }));
    const cleanConfirmButtons = screen.getAllByRole('button', { name: /^清\s*理$/ });
    await user.click(cleanConfirmButtons[cleanConfirmButtons.length - 1]);
    await waitFor(() => expect(cleanDeletedContainerMount).toHaveBeenCalledWith(11));
    await waitFor(() => expect(screen.getAllByText('已清理').length).toBeGreaterThan(0));
    await waitFor(() => expect(getDeletedContainerMountUsage).toHaveBeenLastCalledWith(
      [2],
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    ));
    expect(screen.getByText('row-restore')).toBeInTheDocument();

    const restoreRow = rowOf('row-restore');
    await user.click(within(restoreRow).getByRole('button', { name: /恢复/ }));
    const restoreConfirmButtons = screen.getAllByRole('button', { name: /恢\s*复/ });
    await user.click(restoreConfirmButtons[restoreConfirmButtons.length - 1]);
    await waitFor(() => expect(resurrectDeletedContainer).toHaveBeenCalledWith(2, null));
    expect(screen.getByText('row-restore')).toBeInTheDocument();
  });
});
