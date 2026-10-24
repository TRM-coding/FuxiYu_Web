import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const permissionState = vi.hoisted(() => ({ loaded: true, canManage: true }));

vi.mock('../contexts/PermissionContext', () => ({
  usePermission: () => ({
    loaded: permissionState.loaded,
    hasPermission: code => code === 'container:manage' && permissionState.canManage,
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
import showErrorModal from '../utils/showErrorModal';
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

const withoutField = (source, field) => {
  const copy = { ...source };
  delete copy[field];
  return copy;
};

const renderPage = () => render(
  <MemoryRouter>
    <DeletedContainers />
  </MemoryRouter>,
);

const rowOf = name => screen.getByText(name).closest('tr');

beforeEach(() => {
  permissionState.loaded = true;
  permissionState.canManage = true;
  listDeletedContainers.mockReset();
  getDeletedContainerMountUsage.mockReset();
  cleanDeletedContainerMount.mockReset();
  resurrectDeletedContainer.mockReset();
  showErrorModal.mockReset();
  listDeletedContainers.mockResolvedValue(listResponse([record()]));
  getDeletedContainerMountUsage.mockResolvedValue({ success: 1, usages: [] });
  cleanDeletedContainerMount.mockResolvedValue({ success: 1 });
  resurrectDeletedContainer.mockResolvedValue({ success: 1, container_id: 19 });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('DeletedContainers 首批统计与展示状态', () => {
  it('列表与分页先出现，异步只请求当前页可测 ID；mount_cleaned=true 即使 cleaned_at 空也不请求', async () => {
    const firstBatch = deferred();
    getDeletedContainerMountUsage.mockReturnValue(firstBatch.promise);
    listDeletedContainers.mockResolvedValue(listResponse([
      record({ deleted_id: 7, container_name: 'row-7', mount_path: '/m/7' }),
      record({ deleted_id: 8, container_name: 'row-8', mount_path: '/m/8', mount_cleaned: true, cleaned_at: null }),
      record({ deleted_id: 9, container_name: 'row-9', mount_path: '/m/9', cleaned_at: '2026-10-18T00:00:00' }),
      record({ deleted_id: 10, container_name: 'row-10', mount_path: '' }),
      record({ deleted_id: 11, container_name: 'row-11', mount_path: '/m/11' }),
    ]));

    renderPage();

    expect(await screen.findByText('row-7')).toBeInTheDocument();
    expect(document.querySelector('.ant-pagination')).not.toBeNull();
    expect(screen.getAllByText('读取统计中').length).toBeGreaterThan(0);

    await waitFor(() => expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(1));
    expect(getDeletedContainerMountUsage.mock.calls[0][0]).toEqual([7, 11]);
    expect(getDeletedContainerMountUsage.mock.calls[0][1]).toEqual(expect.objectContaining({
      signal: expect.any(AbortSignal),
    }));

    expect(within(rowOf('row-8')).getAllByText('已清理').length).toBeGreaterThan(0);
    expect(within(rowOf('row-9')).getAllByText('已清理').length).toBeGreaterThan(0);
    expect(within(rowOf('row-10')).getAllByText('无挂载').length).toBeGreaterThan(0);
    expect(within(rowOf('row-7')).getAllByText('读取统计中').length).toBeGreaterThan(0);

    await act(async () => {
      firstBatch.resolve({
        success: 1,
        usages: [usageSuccess(7, 1536), usageSuccess(11, 0)],
      });
      await Promise.resolve();
    });
    expect(await screen.findByText('1.5 KiB')).toBeInTheDocument();
    expect(within(rowOf('row-11')).getByText('0 B')).toBeInTheDocument();
  });

  it('成功非零/成功 0/旧测量时间/pending/错误/缺项/畸形项按行呈现且绝不把 null 当 0', async () => {
    listDeletedContainers.mockResolvedValue(listResponse([
      record({ deleted_id: 1, container_name: 'row-1', mount_path: '/m/1' }),
      record({ deleted_id: 2, container_name: 'row-2', mount_path: '/m/2' }),
      record({ deleted_id: 3, container_name: 'row-3', mount_path: '/m/3' }),
      record({ deleted_id: 4, container_name: 'row-4', mount_path: '/m/4' }),
      record({ deleted_id: 5, container_name: 'row-5', mount_path: '/m/5' }),
      record({ deleted_id: 6, container_name: 'row-6', mount_path: '/m/6' }),
    ]));
    getDeletedContainerMountUsage.mockResolvedValue({
      success: 1,
      usages: [
        usageSuccess(1, 1536, '2026-09-01T10:00:00Z'),
        usageSuccess(2, 0, '2026-09-02T10:00:00Z'),
        usagePending(3),
        { deleted_id: 4, bytes: null, measured_at: null, pending: false, error: 'node_timeout' },
        // 5 缺项；6 畸形（成功却 bytes=null）——都必须不可用，不能回落到 0。
        { deleted_id: 6, bytes: null, measured_at: null, pending: false, error: null },
      ],
    });

    renderPage();
    expect(await screen.findByText('row-1')).toBeInTheDocument();

    expect(await screen.findByText('1.5 KiB')).toBeInTheDocument();
    expect(screen.getByText('0 B')).toBeInTheDocument();
    expect(screen.getByText('测量中')).toBeInTheDocument();
    expect(screen.getByText('统计超时')).toBeInTheDocument();

    const row5 = rowOf('row-5');
    const row6 = rowOf('row-6');
    expect(within(row5).getByText('统计不可用')).toBeInTheDocument();
    expect(within(row6).getByText('统计不可用')).toBeInTheDocument();
    expect(within(rowOf('row-3')).queryByText('0 B')).toBeNull();
    expect(within(row5).queryByText('0 B')).toBeNull();

    const measuredDate = new Date('2026-09-01T10:00:00Z');
    const pad2 = value => String(value).padStart(2, '0');
    const expectedShortTime = `${pad2(measuredDate.getMonth() + 1)}-${pad2(measuredDate.getDate())} ${pad2(measuredDate.getHours())}:${pad2(measuredDate.getMinutes())}`;
    const expectedFullTime = measuredDate.toLocaleString('zh-CN', { hour12: false });
    const measurementLabel = within(rowOf('row-1')).getByText(`测量 ${expectedShortTime}`);
    expect(measurementLabel).toHaveAttribute('title', expectedFullTime);
    expect(within(rowOf('row-1')).getByRole('progressbar')).toBeInTheDocument();
  });

  it('缺字段、非 UTC 时间、HTML/未知 error 只降级对应行，合法行照常显示，不回显原文', async () => {
    listDeletedContainers.mockResolvedValue(listResponse([
      record({ deleted_id: 1, container_name: 'row-valid', mount_path: '/m/1' }),
      record({ deleted_id: 2, container_name: 'row-missing-error', mount_path: '/m/2' }),
      record({ deleted_id: 3, container_name: 'row-missing-time', mount_path: '/m/3' }),
      record({ deleted_id: 4, container_name: 'row-html-error', mount_path: '/m/4' }),
      record({ deleted_id: 5, container_name: 'row-unknown-code', mount_path: '/m/5' }),
      record({ deleted_id: 6, container_name: 'row-no-zone', mount_path: '/m/6' }),
      record({ deleted_id: 7, container_name: 'row-duplicate', mount_path: '/m/7' }),
    ]));
    getDeletedContainerMountUsage.mockResolvedValue({
      success: 1,
      usages: [
        usageSuccess(1, 2048),
        withoutField(usageSuccess(2, 1024), 'error'),
        withoutField(usageSuccess(3, 1024), 'measured_at'),
        { deleted_id: 4, bytes: null, measured_at: null, pending: false, error: '<script>alert(1)</script>' },
        { deleted_id: 5, bytes: null, measured_at: null, pending: false, error: 'unknown_code' },
        usageSuccess(6, 1024, '2026-10-18T03:04:05'),
        usageSuccess(7, 1024),
        usageSuccess(7, 2048),
      ],
    });

    renderPage();
    expect(await screen.findByText('2 KiB')).toBeInTheDocument();

    for (const name of [
      'row-missing-error',
      'row-missing-time',
      'row-html-error',
      'row-unknown-code',
      'row-no-zone',
      'row-duplicate',
    ]) {
      expect(within(rowOf(name)).getByText('统计不可用'), name).toBeInTheDocument();
    }
    expect(screen.queryByText(/<script>/)).toBeNull();
    expect(screen.queryByText(/unknown_code/)).toBeNull();
    expect(screen.queryByText('0 B')).toBeNull();
  });

  it('旧 Ctrl 统计 404/405、success=0 或非法响应只降级为不可用，不填 0、不阻断恢复/清理', async () => {
    for (const failure of [
      { status: 404, body: { success: 0, message: 'not found' } },
      { status: 405, body: { success: 0, message: 'method not allowed' } },
      { status: 200, body: { success: 0, message: 'business failure' } },
      { status: 200, body: { success: 1, usages: null }, code: 'bad_response' },
    ]) {
      vi.clearAllMocks();
      listDeletedContainers.mockResolvedValue(listResponse([record()]));
      getDeletedContainerMountUsage.mockRejectedValue(failure);
      cleanDeletedContainerMount.mockResolvedValue({ success: 1 });
      resurrectDeletedContainer.mockResolvedValue({ success: 1, container_id: 19 });

      const { unmount } = renderPage();
      expect(await screen.findByText('deleted-train')).toBeInTheDocument();
      expect(await screen.findByText('统计不可用')).toBeInTheDocument();
      expect(screen.queryByText('0 B')).toBeNull();

      const row = rowOf('deleted-train');
      expect(within(row).getByRole('button', { name: /恢复/ })).toBeEnabled();
      expect(within(row).getByRole('button', { name: /清理 mount/ })).toBeEnabled();

      const user = userEvent.setup();
      await user.click(within(row).getByRole('button', { name: /恢复/ }));
      const confirmButtons = screen.getAllByRole('button', { name: /恢\s*复/ });
      await user.click(confirmButtons[confirmButtons.length - 1]);
      await waitFor(() => expect(resurrectDeletedContainer).toHaveBeenCalledWith(7, null));
      unmount();
    }
  });

  it('逐项 Node 失败只影响对应行，部分成功仍展示真实大小', async () => {
    listDeletedContainers.mockResolvedValue(listResponse([
      record({ deleted_id: 1, container_name: 'row-1', mount_path: '/m/1' }),
      record({ deleted_id: 2, container_name: 'row-2', mount_path: '/m/2' }),
      record({ deleted_id: 3, container_name: 'row-3', mount_path: '/m/3' }),
      record({ deleted_id: 4, container_name: 'row-4', mount_path: '/m/4' }),
      record({ deleted_id: 5, container_name: 'row-5', mount_path: '/m/5' }),
      record({ deleted_id: 6, container_name: 'row-6', mount_path: '/m/6' }),
    ]));
    getDeletedContainerMountUsage.mockResolvedValue({
      success: 1,
      usages: [
        usageSuccess(1, 2048),
        { deleted_id: 2, bytes: null, measured_at: null, pending: false, error: 'node_unavailable' },
        { deleted_id: 3, bytes: null, measured_at: null, pending: false, error: 'node_timeout' },
        { deleted_id: 4, bytes: null, measured_at: null, pending: false, error: 'node_bad_response' },
        { deleted_id: 5, bytes: null, measured_at: null, pending: false, error: 'node_unsupported' },
        { deleted_id: 6, bytes: null, measured_at: null, pending: false, error: 'du_failed' },
      ],
    });

    renderPage();
    expect(await screen.findByText('2 KiB')).toBeInTheDocument();
    expect(screen.getByText('机器离线/不可用')).toBeInTheDocument();
    expect(screen.getByText('统计超时')).toBeInTheDocument();
    expect(screen.getByText('统计响应异常')).toBeInTheDocument();
    expect(screen.getByText('统计不可用（旧 Node）')).toBeInTheDocument();
    expect(screen.getByText('统计不可用（du 执行失败）')).toBeInTheDocument();
    expect(within(rowOf('row-6')).queryByText('统计不可用')).toBeNull();
    expect(screen.queryByText('0 B')).toBeNull();
    expect(within(rowOf('row-2')).getByRole('button', { name: /清理 mount/ })).toBeEnabled();
    expect(within(rowOf('row-5')).getByRole('button', { name: /恢复/ })).toBeEnabled();
  });
});

describe('DeletedContainers 有界轮询与取消', () => {
  it('pending 单计时器精确轮询 120 次后停止，提示测量未完成且不再请求', async () => {
    vi.useFakeTimers();
    listDeletedContainers.mockResolvedValue(listResponse([record()]));
    getDeletedContainerMountUsage.mockResolvedValue({ success: 1, usages: [usagePending(7)] });

    renderPage();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getByText('deleted-train')).toBeInTheDocument();
    expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(1);

    for (let tick = 1; tick <= 120; tick += 1) {
      await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
      expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(1 + tick);
    }

    expect(screen.getByText('测量未完成')).toBeInTheDocument();
    expect(screen.getByText(/多轮查询仍未完成，已停止自动刷新/)).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(121);
  });

  it('上一批未返回不叠请求；返回后只轮询仍 pending 的行，收敛即停止', async () => {
    vi.useFakeTimers();
    const firstBatch = deferred();
    listDeletedContainers.mockResolvedValue(listResponse([
      record({ deleted_id: 1, container_name: 'row-1', mount_path: '/m/1' }),
      record({ deleted_id: 2, container_name: 'row-2', mount_path: '/m/2' }),
    ]));
    getDeletedContainerMountUsage.mockImplementation((ids) => {
      if (getDeletedContainerMountUsage.mock.calls.length === 1) return firstBatch.promise;
      if (ids.includes(1) && ids.includes(2)) {
        return Promise.resolve({ success: 1, usages: [usageSuccess(1, 1024), usagePending(2)] });
      }
      return Promise.resolve({ success: 1, usages: [usageSuccess(2, 2048)] });
    });

    renderPage();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(1);

    // 首批未返回：20 秒内不得再发一轮。
    await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
    expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(1);

    await act(async () => {
      firstBatch.resolve({ success: 1, usages: [usagePending(1), usagePending(2)] });
      await Promise.resolve();
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(2);
    expect(getDeletedContainerMountUsage.mock.calls[1][0]).toEqual([1, 2]);

    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(3);
    // 1 已 success，后续只查仍 pending 的 2。
    expect(getDeletedContainerMountUsage.mock.calls[2][0]).toEqual([2]);

    await act(async () => { await vi.advanceTimersByTimeAsync(20000); });
    expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(3);
    expect(screen.getByText('1 KiB')).toBeInTheDocument();
    expect(screen.getByText('2 KiB')).toBeInTheDocument();
  });

  it('翻页 abort 旧请求并丢弃迟到响应，不覆盖新页', async () => {
    const user = userEvent.setup();
    const page1Usage = deferred();
    listDeletedContainers.mockImplementation(async ({ page_number }) => (
      page_number === 1
        ? listResponse([record({ deleted_id: 1, container_name: 'page-one', mount_path: '/m/1' })], { total_number: 21, total_page: 2 })
        : listResponse([record({ deleted_id: 2, container_name: 'page-two', mount_path: '/m/2' })], { total_number: 21, total_page: 2 })
    ));
    getDeletedContainerMountUsage.mockImplementation(ids => (
      ids.includes(1)
        ? page1Usage.promise
        : Promise.resolve({ success: 1, usages: [usageSuccess(2, 2048)] })
    ));

    renderPage();
    expect(await screen.findByText('page-one')).toBeInTheDocument();
    await waitFor(() => expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(1));
    const firstSignal = getDeletedContainerMountUsage.mock.calls[0][1].signal;

    await user.click(document.querySelector('.ant-pagination-item-2 a'));
    expect(await screen.findByText('page-two')).toBeInTheDocument();
    expect(await screen.findByText('2 KiB')).toBeInTheDocument();
    await waitFor(() => expect(firstSignal.aborted).toBe(true));

    await act(async () => {
      page1Usage.resolve({ success: 1, usages: [usageSuccess(1, 10 * 1024 * 1024)] });
      await Promise.resolve();
    });
    expect(screen.queryByText('10 MiB')).toBeNull();
    expect(screen.queryByText('page-one')).toBeNull();
    expect(screen.getByText('2 KiB')).toBeInTheDocument();
    expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(2);
  });

  it('手动刷新 abort 旧请求，迟到响应不覆盖新一轮结果', async () => {
    const user = userEvent.setup();
    const firstUsage = deferred();
    getDeletedContainerMountUsage
      .mockReturnValueOnce(firstUsage.promise)
      .mockResolvedValueOnce({ success: 1, usages: [usageSuccess(7, 2048)] });
    listDeletedContainers.mockResolvedValue(listResponse([record()]));

    renderPage();
    expect(await screen.findByText('deleted-train')).toBeInTheDocument();
    await waitFor(() => expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(1));
    const firstSignal = getDeletedContainerMountUsage.mock.calls[0][1].signal;

    await user.click(screen.getByRole('button', { name: /刷新/ }));
    await waitFor(() => expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('2 KiB')).toBeInTheDocument();
    await waitFor(() => expect(firstSignal.aborted).toBe(true));

    await act(async () => {
      firstUsage.resolve({ success: 1, usages: [usageSuccess(7, 10 * 1024 * 1024)] });
      await Promise.resolve();
    });
    expect(screen.queryByText('10 MiB')).toBeNull();
    expect(screen.getByText('2 KiB')).toBeInTheDocument();
  });

  it('卸载时 abort 在途统计，迟到响应不产生后续请求', async () => {
    const usage = deferred();
    getDeletedContainerMountUsage.mockReturnValue(usage.promise);
    const { unmount } = renderPage();

    expect(await screen.findByText('deleted-train')).toBeInTheDocument();
    await waitFor(() => expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(1));
    const signal = getDeletedContainerMountUsage.mock.calls[0][1].signal;

    unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => {
      usage.resolve({ success: 1, usages: [usageSuccess(7)] });
      await Promise.resolve();
    });
    expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(1);
  });

  it('清理开始时旧统计失效；成功后重载只显示已清理，迟到响应不贴回旧值且不再扫描', async () => {
    const user = userEvent.setup();
    const usage = deferred();
    let cleaned = false;
    getDeletedContainerMountUsage.mockReturnValue(usage.promise);
    listDeletedContainers.mockImplementation(async () => listResponse([
      cleaned
        ? record({ mount_cleaned: true, cleaned_at: null })
        : record(),
    ]));
    cleanDeletedContainerMount.mockImplementation(async () => {
      cleaned = true;
      return { success: 1 };
    });

    renderPage();
    expect(await screen.findByText('deleted-train')).toBeInTheDocument();
    await waitFor(() => expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(1));
    const signal = getDeletedContainerMountUsage.mock.calls[0][1].signal;

    const row = rowOf('deleted-train');
    await user.click(within(row).getByRole('button', { name: /清理 mount/ }));
    const confirmButtons = screen.getAllByRole('button', { name: /^清\s*理$/ });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(cleanDeletedContainerMount).toHaveBeenCalledWith(11));
    await waitFor(() => expect(listDeletedContainers).toHaveBeenCalledTimes(2));
    expect(signal.aborted).toBe(true);
    expect((await screen.findAllByText('已清理')).length).toBeGreaterThan(0);

    await act(async () => {
      usage.resolve({ success: 1, usages: [usageSuccess(7, 10 * 1024 * 1024)] });
      await Promise.resolve();
    });
    expect(screen.queryByText('10 MiB')).toBeNull();
    expect(screen.queryByText('测量中')).toBeNull();
    expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(1);
  });

  it('恢复开始时旧统计失效；成功后迟到响应不贴回旧值且不再扫描', async () => {
    const user = userEvent.setup();
    const usage = deferred();
    let restored = false;
    getDeletedContainerMountUsage.mockReturnValue(usage.promise);
    listDeletedContainers.mockImplementation(async () => listResponse([
      restored
        ? record({ mount_cleaned: true, cleaned_at: null })
        : record(),
    ]));
    resurrectDeletedContainer.mockImplementation(async () => {
      restored = true;
      return { success: 1, container_id: 19 };
    });

    renderPage();
    expect(await screen.findByText('deleted-train')).toBeInTheDocument();
    await waitFor(() => expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(1));
    const signal = getDeletedContainerMountUsage.mock.calls[0][1].signal;

    const row = rowOf('deleted-train');
    await user.click(within(row).getByRole('button', { name: /恢复/ }));
    const confirmButtons = screen.getAllByRole('button', { name: /恢\s*复/ });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(resurrectDeletedContainer).toHaveBeenCalledWith(7, null));
    await waitFor(() => expect(listDeletedContainers).toHaveBeenCalledTimes(2));
    expect(signal.aborted).toBe(true);
    expect((await screen.findAllByText('已清理')).length).toBeGreaterThan(0);

    await act(async () => {
      usage.resolve({ success: 1, usages: [usageSuccess(7, 10 * 1024 * 1024)] });
      await Promise.resolve();
    });
    expect(screen.queryByText('10 MiB')).toBeNull();
    expect(screen.queryByText('测量中')).toBeNull();
    expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(1);
  });

  it('清理失败不把旧 bytes 贴回；该行保持统计不可用且无后续请求', async () => {
    const user = userEvent.setup();
    getDeletedContainerMountUsage.mockResolvedValue({
      success: 1,
      usages: [usageSuccess(7, 1024)],
    });
    cleanDeletedContainerMount.mockRejectedValue({
      status: 500,
      body: { message: 'clean failed' },
    });

    renderPage();
    expect(await screen.findByText('1 KiB')).toBeInTheDocument();
    const row = rowOf('deleted-train');
    await user.click(within(row).getByRole('button', { name: /清理 mount/ }));
    const confirmButtons = screen.getAllByRole('button', { name: /^清\s*理$/ });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(showErrorModal).toHaveBeenCalled());
    expect(screen.queryByText('1 KiB')).toBeNull();
    expect(within(rowOf('deleted-train')).getByText('统计不可用')).toBeInTheDocument();
    expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(1);
  });

  it('权限被收回时停止 pending 计时器，不再发起轮询', async () => {
    vi.useFakeTimers();
    listDeletedContainers.mockResolvedValue(listResponse([record()]));
    getDeletedContainerMountUsage.mockResolvedValue({ success: 1, usages: [usagePending(7)] });

    const { rerender } = renderPage();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(2);

    permissionState.canManage = false;
    rerender(
      <MemoryRouter>
        <DeletedContainers />
      </MemoryRouter>,
    );
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText('403 - 无容器管理权限')).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['权限被收回', () => { permissionState.canManage = false; }],
    ['loaded 回退', () => { permissionState.loaded = false; }],
  ])('%s时 abort 在途统计并丢弃迟到响应', async (_label, revoke) => {
    const usage = deferred();
    getDeletedContainerMountUsage.mockReturnValue(usage.promise);
    const { rerender } = renderPage();
    await waitFor(() => expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(1));
    const signal = getDeletedContainerMountUsage.mock.calls[0][1].signal;

    revoke();
    rerender(
      <MemoryRouter>
        <DeletedContainers />
      </MemoryRouter>,
    );
    await act(async () => { await Promise.resolve(); });
    expect(signal.aborted).toBe(true);

    await act(async () => {
      usage.resolve({ success: 1, usages: [usageSuccess(7, 1024)] });
      await Promise.resolve();
    });
    expect(screen.queryByText('1 KiB')).toBeNull();
    expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['权限被收回', () => { permissionState.canManage = false; }],
    ['loaded 回退', () => { permissionState.loaded = false; }],
  ])('%s后迟到的列表响应不能重新开启统计', async (_label, revoke) => {
    const list = deferred();
    listDeletedContainers.mockReturnValue(list.promise);
    const { rerender } = renderPage();
    await waitFor(() => expect(listDeletedContainers).toHaveBeenCalledTimes(1));

    revoke();
    rerender(
      <MemoryRouter>
        <DeletedContainers />
      </MemoryRouter>,
    );
    await act(async () => { await Promise.resolve(); });

    await act(async () => {
      list.resolve(listResponse([record()]));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(getDeletedContainerMountUsage).not.toHaveBeenCalled();
    expect(screen.queryByText('deleted-train')).toBeNull();
  });
});
