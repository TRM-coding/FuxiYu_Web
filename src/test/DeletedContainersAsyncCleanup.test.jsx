import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const antdMessage = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
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
  container_name: 'row-a',
  image_name: 'fuxi/image-1:20260825T090016Z',
  machine_name: 'gpu-a',
  machine_ip: '10.0.0.8',
  mount_path: '/home/alice/containers/row-a',
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
  original_container_is_valid: false,
  mount_cleanup_state: null,
  mount_cleanup_error_reason: null,
  ...overrides,
});

const listResponse = (records, overrides = {}) => ({
  success: 1,
  records,
  total_number: records.length,
  total_page: 1,
  ...overrides,
});

const usageSuccess = (id, bytes = 1024) => ({
  deleted_id: id,
  bytes,
  measured_at: '2026-10-18T03:04:05Z',
  pending: false,
  error: null,
});

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
};

const renderPage = () => render(
  <MemoryRouter>
    <DeletedContainers />
  </MemoryRouter>,
);

const rowOf = name => screen.getByText(name).closest('tr');
const cardOf = name => screen.getByText(name).closest('.app-table-mobile-card');

const confirmClean = async (user, row) => {
  await user.click(within(row).getByRole('button', { name: /清理 mount/ }));
  const buttons = await screen.findAllByRole('button', { name: /^清\s*理$/ });
  await user.click(buttons[buttons.length - 1]);
};

const confirmRestore = async (user, row) => {
  await user.click(within(row).getByRole('button', { name: /恢复/ }));
  const buttons = await screen.findAllByRole('button', { name: /^恢\s*复$/ });
  await user.click(buttons[buttons.length - 1]);
};

const flushAsync = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

beforeEach(() => {
  setViewport(1440);
  listDeletedContainers.mockReset();
  getDeletedContainerMountUsage.mockReset();
  cleanDeletedContainerMount.mockReset();
  resurrectDeletedContainer.mockReset();
  showErrorModal.mockReset();
  antdMessage.success.mockReset();
  antdMessage.warning.mockReset();
  antdMessage.error.mockReset();
  listDeletedContainers.mockResolvedValue(listResponse([record()]));
  getDeletedContainerMountUsage.mockResolvedValue({ success: 1, usages: [] });
  cleanDeletedContainerMount.mockResolvedValue({ success: 1 });
  resurrectDeletedContainer.mockResolvedValue({ success: 1 });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('DeletedContainers async mount cleanup', () => {
  it('test_restore_and_cleanup_request_bodies_stay_unchanged', async () => {
    const user = userEvent.setup();
    listDeletedContainers.mockResolvedValue(listResponse([
      record({ deleted_id: 7, container_name: 'row-clean', mount_cleanup_id: 11 }),
      record({ deleted_id: 8, container_name: 'row-restore', mount_cleanup_id: 12 }),
    ]));
    renderPage();
    await screen.findByText('row-clean');
    await confirmClean(user, rowOf('row-clean'));
    await waitFor(() => expect(cleanDeletedContainerMount).toHaveBeenCalledWith(11));
    await confirmRestore(user, rowOf('row-restore'));
    await waitFor(() => expect(resurrectDeletedContainer).toHaveBeenCalledWith(8, null));

    expect(cleanDeletedContainerMount).toHaveBeenCalledTimes(1);
    expect(resurrectDeletedContainer).toHaveBeenCalledTimes(1);
    expect(listDeletedContainers.mock.calls[0][0]).toEqual({ page_number: 1, page_size: 20 });
    expect(JSON.stringify([
      ...cleanDeletedContainerMount.mock.calls,
      ...resurrectDeletedContainer.mock.calls,
    ])).not.toContain('mount_path');
  });

  it('test_restored_gate_blocks_confirm_without_write', async () => {
    listDeletedContainers.mockResolvedValue(listResponse([
      record({ original_container_is_valid: true }),
    ]));
    renderPage();
    await screen.findByText('row-a');
    const row = rowOf('row-a');
    const restore = within(row).getByRole('button', { name: /恢复/ });
    const clean = within(row).getByRole('button', { name: /清理 mount/ });
    expect(restore).toBeDisabled();
    expect(clean).toBeDisabled();
    expect(restore).toHaveAttribute('title', '已恢复');
    expect(clean).toHaveAttribute('title', '已恢复，无法清理');

    fireEvent.click(restore);
    fireEvent.click(clean);
    expect(screen.queryByText('确认恢复该容器？')).toBeNull();
    expect(screen.queryByText('确认清理该 mount？')).toBeNull();
    expect(resurrectDeletedContainer).not.toHaveBeenCalled();
    expect(cleanDeletedContainerMount).not.toHaveBeenCalled();
  });

  it('test_original_validity_change_recomputes_gate', async () => {
    const user = userEvent.setup();
    let valid = true;
    listDeletedContainers.mockImplementation(async () => listResponse([
      record({ original_container_is_valid: valid }),
    ]));
    renderPage();
    await screen.findByText('row-a');
    expect(within(rowOf('row-a')).getByRole('button', { name: /恢复/ })).toBeDisabled();

    valid = false;
    await user.click(screen.getByRole('button', { name: /刷新/ }));
    await waitFor(() => {
      expect(within(rowOf('row-a')).getByRole('button', { name: /恢复/ })).toBeEnabled();
      expect(within(rowOf('row-a')).getByRole('button', { name: /清理 mount/ })).toBeEnabled();
    });
  });

  it('test_cleaning_blocks_both_actions_and_confirm', async () => {
    listDeletedContainers.mockResolvedValue(listResponse([
      record({ mount_cleanup_state: 'cleaning' }),
    ]));
    renderPage();
    await screen.findByText('清理中');
    const row = rowOf('row-a');
    const restore = within(row).getByRole('button', { name: /恢复/ });
    const clean = within(row).getByRole('button', { name: /清理 mount/ });
    expect(restore).toBeDisabled();
    expect(clean).toBeDisabled();
    expect(restore).toHaveAttribute('title', '清理进行中，无法恢复');
    expect(clean).toHaveAttribute('title', '清理进行中');

    fireEvent.click(restore);
    fireEvent.click(clean);
    expect(screen.queryByText('确认恢复该容器？')).toBeNull();
    expect(screen.queryByText('确认清理该 mount？')).toBeNull();
    expect(resurrectDeletedContainer).not.toHaveBeenCalled();
    expect(cleanDeletedContainerMount).not.toHaveBeenCalled();
  });

  it('test_failed_or_unknown_recomputes_existing_action_gates', async () => {
    listDeletedContainers.mockResolvedValue(listResponse([
      record({ deleted_id: 1, container_name: 'row-failed', mount_cleanup_state: 'failed' }),
      record({ deleted_id: 2, container_name: 'row-unknown', mount_cleanup_state: 'unknown' }),
    ]));
    renderPage();
    await screen.findByText('row-failed');
    for (const name of ['row-failed', 'row-unknown']) {
      const row = rowOf(name);
      expect(within(row).getByRole('button', { name: /恢复/ })).toBeEnabled();
      expect(within(row).getByRole('button', { name: /清理 mount/ })).toBeEnabled();
    }
    expect(screen.getByText('清理失败')).toBeInTheDocument();
    expect(screen.getByText('清理状态未知')).toBeInTheDocument();
  });

  it('test_clean_acceptance_starts_list_refresh_without_success', async () => {
    const user = userEvent.setup();
    let accepted = false;
    listDeletedContainers.mockImplementation(async () => listResponse([
      record({ mount_cleanup_state: accepted ? 'cleaning' : null }),
    ]));
    cleanDeletedContainerMount.mockImplementation(async () => {
      accepted = true;
      return { success: 1, accepted: true };
    });
    renderPage();
    await screen.findByText('row-a');
    await confirmClean(user, rowOf('row-a'));

    await waitFor(() => expect(cleanDeletedContainerMount).toHaveBeenCalledWith(11));
    expect(await screen.findByText('清理中')).toBeInTheDocument();
    expect(listDeletedContainers.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(antdMessage.success).not.toHaveBeenCalled();
    expect(screen.queryByText('已清理')).toBeNull();
  });

  it('test_list_refresh_hydrates_cleaning_state', async () => {
    listDeletedContainers.mockResolvedValue(listResponse([
      record({ deleted_id: 1, container_name: 'row-cleaning', mount_cleanup_state: 'cleaning' }),
      record({
        deleted_id: 2,
        container_name: 'row-cleaned',
        mount_cleanup_state: null,
        cleaned_at: '2026-10-18T00:00:00',
      }),
    ]));
    renderPage();
    await screen.findByText('row-cleaning');
    expect(screen.getByText('清理中')).toBeInTheDocument();
    expect(screen.getByText('已清理')).toBeInTheDocument();
    expect(within(rowOf('row-cleaning')).getByRole('button', { name: /恢复/ })).toBeDisabled();
    expect(within(rowOf('row-cleaning')).getByRole('button', { name: /清理 mount/ })).toBeDisabled();
    expect(antdMessage.success).not.toHaveBeenCalled();
    expect(listDeletedContainers).toHaveBeenCalledTimes(1);
  });

  it('test_cleanup_list_refresh_is_single_flight_and_cancelled', async () => {
    vi.useFakeTimers();
    const poll = deferred();
    listDeletedContainers.mockReset();
    listDeletedContainers
      .mockResolvedValueOnce(listResponse([record({ mount_cleanup_state: 'cleaning' })]))
      .mockReturnValueOnce(poll.promise);
    const view = renderPage();
    await flushAsync();
    expect(screen.getByText('row-a')).toBeInTheDocument();
    expect(listDeletedContainers).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(listDeletedContainers).toHaveBeenCalledTimes(2);
    const signal = listDeletedContainers.mock.calls[1][1].signal;
    expect(signal).toBeInstanceOf(AbortSignal);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000);
    });
    expect(listDeletedContainers).toHaveBeenCalledTimes(2);

    view.unmount();
    expect(signal.aborted).toBe(true);
    poll.resolve(listResponse([record({ mount_cleanup_state: 'cleaning' })]));
    await flushAsync();
  });

  it('test_cleanup_refresh_merges_current_page_only', async () => {
    vi.useFakeTimers();
    listDeletedContainers.mockReset();
    listDeletedContainers
      .mockResolvedValueOnce(listResponse([record({ mount_cleanup_state: 'cleaning' })]))
      .mockResolvedValueOnce(listResponse([record({ mount_cleanup_state: 'cleaning' })]));
    const view = renderPage();
    await flushAsync();
    expect(screen.getByText('row-a')).toBeInTheDocument();
    expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(1);

    const toggle = rowOf('row-a').querySelector('.ant-table-row-expand-icon');
    fireEvent.click(toggle);
    expect(screen.getByText('镜像')).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(listDeletedContainers.mock.calls[1][0]).toEqual({ page_number: 1, page_size: 20 });
    expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(1);
    expect(screen.getByText('镜像')).toBeInTheDocument();
    view.unmount();
  });

  it('test_cleaned_fields_win_over_new_states', async () => {
    listDeletedContainers.mockResolvedValue(listResponse([
      record({ deleted_id: 1, container_name: 'row-cleaned-at', cleaned_at: '2026-10-18T00:00:00', mount_cleanup_state: 'cleaning', data_recoverable: false }),
      record({ deleted_id: 2, container_name: 'row-mount-cleaned', mount_cleaned: true, mount_cleanup_state: 'failed', data_recoverable: false }),
      record({ deleted_id: 3, container_name: 'row-unknown', cleaned_at: '2026-10-18T00:00:00', mount_cleanup_state: 'unknown', data_recoverable: false }),
    ]));
    renderPage();
    await screen.findByText('row-cleaned-at');
    expect(screen.getAllByText('已清理')).toHaveLength(3);
    expect(screen.queryByText('清理中')).toBeNull();
    expect(screen.queryByText('清理失败')).toBeNull();
    expect(screen.queryByText('清理状态未知')).toBeNull();
    for (const name of ['row-cleaned-at', 'row-mount-cleaned', 'row-unknown']) {
      expect(within(rowOf(name)).getByRole('button', { name: /恢复/ })).toBeDisabled();
      expect(within(rowOf(name)).getByRole('button', { name: /清理 mount/ })).toBeDisabled();
    }
    expect(antdMessage.success).not.toHaveBeenCalled();
  });

  it('test_failed_or_unknown_never_claims_success', async () => {
    listDeletedContainers.mockResolvedValue(listResponse([
      record({
        deleted_id: 1,
        container_name: 'row-failed',
        mount_cleanup_state: 'failed',
        mount_cleanup_error_reason: 'rm -rf failed (rc=1): /secret/path',
      }),
      record({ deleted_id: 2, container_name: 'row-unknown', mount_cleanup_state: 'unknown' }),
    ]));
    renderPage();
    await screen.findByText('row-failed');
    expect(screen.getByText('清理失败')).toBeInTheDocument();
    expect(screen.getByText('清理状态未知')).toBeInTheDocument();
    expect(screen.queryByText('已清理')).toBeNull();
    expect(screen.queryByText(/rm -rf failed/)).toBeNull();
    expect(antdMessage.success).not.toHaveBeenCalled();
    for (const name of ['row-failed', 'row-unknown']) {
      expect(within(rowOf(name)).getByRole('button', { name: /恢复/ })).toBeEnabled();
      expect(within(rowOf(name)).getByRole('button', { name: /清理 mount/ })).toBeEnabled();
    }
  });

  it('test_partial_delete_failed_unknown_reopens_restore_and_clean', async () => {
    const user = userEvent.setup();
    listDeletedContainers.mockResolvedValue(listResponse([
      record({ mount_cleanup_state: 'failed' }),
    ]));
    getDeletedContainerMountUsage.mockResolvedValue({
      success: 1,
      usages: [usageSuccess(7)],
    });
    renderPage();
    await screen.findByText('row-a');
    const row = rowOf('row-a');
    expect(within(row).getByRole('button', { name: /恢复/ })).toBeEnabled();
    expect(within(row).getByRole('button', { name: /清理 mount/ })).toBeEnabled();

    await confirmRestore(user, row);
    await waitFor(() => expect(resurrectDeletedContainer).toHaveBeenCalledWith(7, null));
    expect(antdMessage.success).not.toHaveBeenCalledWith('mount 已清理');
    expect(antdMessage.success).toHaveBeenCalledWith('容器恢复请求已发送');
    expect(cleanDeletedContainerMount).not.toHaveBeenCalled();
  });

  it('test_cleaning_overrides_live_not_found_until_task_ends', async () => {
    const user = userEvent.setup();
    let state = 'cleaning';
    listDeletedContainers.mockImplementation(async () => listResponse([
      record({ mount_cleanup_state: state }),
    ]));
    getDeletedContainerMountUsage.mockResolvedValue({
      success: 1,
      usages: [{
        deleted_id: 7,
        bytes: null,
        measured_at: null,
        pending: false,
        error: 'not_found',
      }],
    });
    renderPage();
    await screen.findByText('清理中');
    expect(await screen.findByText('统计不可用（目录不存在）')).toBeInTheDocument();
    expect(screen.queryByText('目录不存在')).toBeNull();
    const cleaningRow = rowOf('row-a');
    expect(within(cleaningRow).getByRole('button', { name: /恢复/ })).toBeDisabled();
    expect(within(cleaningRow).getByRole('button', { name: /清理 mount/ })).toBeDisabled();

    state = null;
    await user.click(screen.getByRole('button', { name: /刷新/ }));
    expect(await screen.findByText('目录不存在')).toBeInTheDocument();
    expect(screen.queryByText('清理中')).toBeNull();
    expect(antdMessage.success).not.toHaveBeenCalled();
    const endedRow = rowOf('row-a');
    expect(within(endedRow).getByRole('button', { name: /恢复/ })).toBeDisabled();
    expect(within(endedRow).getByRole('button', { name: /清理 mount/ })).toBeDisabled();
    expect(within(endedRow).getByRole('button', { name: /恢复/ })).toHaveAttribute(
      'title',
      '挂载目录不存在，无法恢复',
    );
  });

  it('test_invalid_state_maps_to_unknown', async () => {
    listDeletedContainers.mockResolvedValue(listResponse([
      record({ mount_cleanup_state: 'done', mount_cleanup_error_reason: 'bad-state' }),
    ]));
    renderPage();
    await screen.findByText('清理状态未知');
    expect(screen.queryByText('done')).toBeNull();
    expect(screen.queryByText('bad-state')).toBeNull();
    expect(within(rowOf('row-a')).getByRole('button', { name: /恢复/ })).toBeEnabled();
    expect(within(rowOf('row-a')).getByRole('button', { name: /清理 mount/ })).toBeEnabled();
    expect(antdMessage.success).not.toHaveBeenCalled();
  });

  it('test_ctrl_restart_missing_state_falls_back_without_stuck_cleaning', async () => {
    const user = userEvent.setup();
    listDeletedContainers.mockResolvedValue(listResponse([record({ mount_cleanup_state: null })]));
    cleanDeletedContainerMount.mockResolvedValue({ success: 1, accepted: true });
    renderPage();
    await screen.findByText('row-a');
    await confirmClean(user, rowOf('row-a'));
    await waitFor(() => expect(cleanDeletedContainerMount).toHaveBeenCalledWith(11));
    await waitFor(() => expect(listDeletedContainers.mock.calls.length).toBeGreaterThanOrEqual(2));

    expect(screen.queryByText('清理中')).toBeNull();
    expect(screen.queryByText('已清理')).toBeNull();
    expect(within(rowOf('row-a')).getByRole('button', { name: /恢复/ })).toBeEnabled();
    expect(within(rowOf('row-a')).getByRole('button', { name: /清理 mount/ })).toBeEnabled();
    expect(antdMessage.success).not.toHaveBeenCalled();
  });

  it('test_cleanup_request_rejection_keeps_error_and_starts_no_poll', async () => {
    const user = userEvent.setup();
    cleanDeletedContainerMount.mockRejectedValue(Object.assign(new Error('clean failed'), {
      status: 500,
      body: { message: '清理失败' },
    }));
    renderPage();
    await screen.findByText('row-a');
    await confirmClean(user, rowOf('row-a'));
    await waitFor(() => expect(showErrorModal).toHaveBeenCalled());
    expect(screen.queryByText('清理中')).toBeNull();
    expect(antdMessage.success).not.toHaveBeenCalled();
    expect(listDeletedContainers).toHaveBeenCalledTimes(1);
  });

  it('test_cleaning_row_does_not_block_other_rows_or_pagination', async () => {
    const user = userEvent.setup();
    listDeletedContainers.mockImplementation(async ({ page_number }) => {
      if (page_number === 2) {
        return listResponse([
          record({ deleted_id: 21, container_name: 'row-page-2', mount_cleanup_state: null }),
        ], { total_number: 21, total_page: 2 });
      }
      return listResponse([
        record({ deleted_id: 1, container_name: 'row-cleaning', mount_cleanup_state: 'cleaning' }),
        record({ deleted_id: 2, container_name: 'row-other', mount_cleanup_state: null }),
      ], { total_number: 21, total_page: 2 });
    });
    renderPage();
    await screen.findByText('row-cleaning');
    expect(screen.getByRole('button', { name: /刷新/ })).toBeEnabled();
    expect(within(rowOf('row-other')).getByRole('button', { name: /恢复/ })).toBeEnabled();

    await confirmRestore(user, rowOf('row-other'));
    await waitFor(() => expect(resurrectDeletedContainer).toHaveBeenCalledWith(2, null));

    await user.click(document.querySelector('.ant-pagination-item-2 a'));
    await screen.findByText('row-page-2');
    expect(listDeletedContainers.mock.calls.at(-1)[0].page_number).toBe(2);
    expect(screen.queryByText('清理中')).toBeNull();
  });

  it('test_manual_refresh_and_mobile_cleaning_status', async () => {
    const user = userEvent.setup();
    setViewport(390);
    listDeletedContainers.mockResolvedValue(listResponse([
      record({ deleted_id: 1, container_name: 'row-cleaning', mount_cleanup_state: 'cleaning' }),
      record({ deleted_id: 2, container_name: 'row-other', mount_cleanup_state: null }),
    ]));
    renderPage();
    await screen.findByText('row-cleaning');
    expect(document.querySelector('.app-table-mobile-card')).not.toBeNull();
    const card = cardOf('row-cleaning');
    for (const label of ['容器', '机器', 'Mount', '逻辑用量', '删除时间', '状态', '操作']) {
      expect(within(card).getByText(label)).toBeInTheDocument();
    }
    expect(within(card).getByText('清理中')).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: /恢复/ })).toBeDisabled();
    expect(within(card).getByRole('button', { name: /清理 mount/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /刷新/ })).toBeEnabled();
    const callsBefore = listDeletedContainers.mock.calls.length;
    await user.click(screen.getByRole('button', { name: /刷新/ }));
    await waitFor(() => expect(listDeletedContainers.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it('test_legacy_success_without_new_fields_never_claims_success', async () => {
    const user = userEvent.setup();
    listDeletedContainers.mockResolvedValue(listResponse([record({ mount_cleanup_state: null })]));
    cleanDeletedContainerMount.mockResolvedValue({ success: 1 });
    renderPage();
    await screen.findByText('row-a');
    await confirmClean(user, rowOf('row-a'));
    await waitFor(() => expect(cleanDeletedContainerMount).toHaveBeenCalledWith(11));
    await waitFor(() => expect(listDeletedContainers.mock.calls.length).toBeGreaterThanOrEqual(2));

    expect(screen.queryByText('清理中')).toBeNull();
    expect(screen.queryByText('已清理')).toBeNull();
    expect(within(rowOf('row-a')).getByRole('button', { name: /恢复/ })).toBeEnabled();
    expect(within(rowOf('row-a')).getByRole('button', { name: /清理 mount/ })).toBeEnabled();
    expect(antdMessage.success).not.toHaveBeenCalled();
  });
});
