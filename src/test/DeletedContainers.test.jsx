import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

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

vi.mock('../utils/showErrorModal', () => ({
  default: vi.fn(),
}));

import { getDeletedContainerMountUsage, listDeletedContainers, resurrectDeletedContainer } from '../api/container_api';
import showErrorModal from '../utils/showErrorModal';
import DeletedContainers from '../pages/DeletedContainers';

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

describe('DeletedContainers', () => {
  beforeEach(() => {
    listDeletedContainers.mockReset();
    resurrectDeletedContainer.mockReset();
    getDeletedContainerMountUsage.mockReset();
    getDeletedContainerMountUsage.mockResolvedValue({ success: 1, usages: [] });
    showErrorModal.mockReset();
    listDeletedContainers.mockResolvedValue({
      success: 1,
      records: [
        {
          deleted_id: 7,
          original_container_id: 3,
          container_name: 'deleted-train',
          // 后端由容器行推导（归属标识 + 构建版本戳）；不再有快照 JSON 内嵌的副本
          image_name: 'fuxi/image-1:20260825T090016Z',
          image_id: 1,
          machine_name: 'gpu-a',
          machine_ip: '10.0.0.8',
          mount_path: '/home/alice/containers/deleted-train',
          mount_cleanup_id: 11,
          removed_at: '2026-09-01T10:00:00',
          removed_trigger: 'api',
          cleaned_at: null,
          data_recoverable: true,
          snapshot: {
            port: 1024,
            cpu_number: 2,
            memory_gb: 4,
            gpu_number: 1,
            shared_gb: 1,
            accounts: [{ user_id: 1, system_username: 'alice', role: 'ROOT' }],
          },
        },
      ],
      total_number: 1,
      total_page: 1,
    });
    resurrectDeletedContainer.mockResolvedValue({ success: 1, container_id: 19 });
    // 默认：后端直接恢复，响应里没有 requires_choice → 界面不弹窗
  });

  it('calls resurrect API for recoverable deleted container after confirmation', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <DeletedContainers />
      </MemoryRouter>,
    );

    expect(await screen.findByText('deleted-train')).toBeInTheDocument();
    const row = screen.getByText('deleted-train').closest('tr');
    await user.click(within(row).getByRole('button', { name: /恢复/ }));
    await screen.findByText('恢复会复用保留的 mount 目录，并重新创建容器与用户绑定。');
    const confirmButtons = screen.getAllByRole('button', { name: /恢\s*复/ });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(resurrectDeletedContainer).toHaveBeenCalledWith(7, null));
    expect(listDeletedContainers).toHaveBeenCalledTimes(2);
  });

  it('asks which content to use when the restore response says a choice is needed', async () => {
    const user = userEvent.setup();
    // 第一次（不带 contentSource）：后端**没有恢复**，把两份内容交回来
    resurrectDeletedContainer.mockResolvedValueOnce({
      success: 1,
      requires_choice: true,
      snapshot: { dockerfile: 'FROM ubuntu:22.04\n' },
      template: { dockerfile: 'FROM ubuntu:24.04\n' },
      sections: [
        { name: 'base_image', changed: true },
        { name: 'dockerfile_body', changed: false },
        { name: 'entrypoint', changed: false },
      ],
    });
    // 第二次（带 contentSource）：这次真的恢复
    resurrectDeletedContainer.mockResolvedValueOnce({ success: 1, container_id: 19 });

    render(
      <MemoryRouter>
        <DeletedContainers />
      </MemoryRouter>,
    );

    expect(await screen.findByText('deleted-train')).toBeInTheDocument();
    const row = screen.getByText('deleted-train').closest('tr');
    await user.click(within(row).getByRole('button', { name: /恢复/ }));
    const confirmButtons = screen.getAllByRole('button', { name: /恢\s*复/ });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    // 第一次调用不带参数；响应要求二选一 → 呈现差异而不是当作恢复成功
    await waitFor(() => expect(resurrectDeletedContainer).toHaveBeenCalledWith(7, null));
    expect(await screen.findByText('恢复内容与删除前不同')).toBeInTheDocument();
    expect(screen.getByText(/基础镜像：有变化/)).toBeInTheDocument();
    expect(screen.getByText(/业务片段：无变化/)).toBeInTheDocument();
    expect(screen.getByText(/启动命令：无变化/)).toBeInTheDocument();
    expect(resurrectDeletedContainer).toHaveBeenCalledTimes(1);

    // 逐行差异窗格：两份文本后端都给了，前端直接比，不再多要一个接口
    const diffRow = (text) => screen.getByText(text).closest('.dc-diff-row');
    expect(diffRow('FROM ubuntu:22.04')).toHaveClass('dc-diff-del');
    expect(diffRow('FROM ubuntu:24.04')).toHaveClass('dc-diff-add');
    expect(screen.getByText(/− 原快照独有（1 行）/)).toBeInTheDocument();
    expect(screen.queryByText(/行未变/)).toBeNull();

    // 默认预选快照——"替用户拿主意"发生在用户看得见的地方
    await user.click(screen.getByRole('button', { name: '按所选内容恢复' }));
    await waitFor(() => expect(resurrectDeletedContainer).toHaveBeenLastCalledWith(7, 'snapshot'));
    expect(resurrectDeletedContainer).toHaveBeenCalledTimes(2);
  });

  it('keeps the safe restore message without passing the raw error body', async () => {
    const user = userEvent.setup();
    const body = {
      success: 0,
      message: 'User 1 has reached long-term container limit (1/1)',
      error_reason: 'long_term_limit_reached',
    };
    resurrectDeletedContainer.mockRejectedValueOnce(Object.assign(
      new Error('User 1 has reached long-term container limit (1/1)'),
      {
        status: 409,
        route: 'https://api.test/api/containers/resurrect_container',
        body,
      },
    ));

    render(
      <MemoryRouter>
        <DeletedContainers />
      </MemoryRouter>,
    );

    expect(await screen.findByText('deleted-train')).toBeInTheDocument();
    const row = screen.getByText('deleted-train').closest('tr');
    await user.click(within(row).getByRole('button', { name: /恢复/ }));
    const confirmButtons = screen.getAllByRole('button', { name: /恢\s*复/ });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    await waitFor(() => expect(showErrorModal).toHaveBeenCalledWith(expect.objectContaining({
      title: '恢复容器失败',
      message: 'User 1 has reached long-term container limit (1/1)',
      status: 409,
    })));
    expect(showErrorModal.mock.calls.at(-1)[0].body).toBeUndefined();
    expect(showErrorModal.mock.calls.at(-1)[0].route).toContain('/containers/resurrect_container');

    // 超限是"未恢复"：不得出现成功提示，也不刷新列表（记录仍留在已删除列表里）
    expect(screen.queryByText('容器恢复请求已发送')).toBeNull();
    expect(listDeletedContainers).toHaveBeenCalledTimes(1);
    expect(screen.getByText('deleted-train')).toBeInTheDocument();
  });

  it('当前页为空但 total>0 时仍保留分页入口', async () => {
    const response = deferred();
    listDeletedContainers.mockReset();
    listDeletedContainers.mockReturnValue(response.promise);

    render(
      <MemoryRouter>
        <DeletedContainers />
      </MemoryRouter>,
    );

    expect(await screen.findByText('暂无已删除容器')).toBeInTheDocument();
    // 初始空文案早于列表响应，不能把它当作 total 已经写入的信号。
    expect(document.querySelector('.ant-pagination')).toBeNull();
    await act(async () => {
      response.resolve({ success: 1, records: [], total_number: 5, total_page: 1 });
    });
    // Table 仍在（空文案走 locale.emptyText），分页入口没有被 Empty 顶掉
    expect(document.querySelector('.ant-table')).not.toBeNull();
    await waitFor(() => expect(document.querySelector('.ant-pagination')).not.toBeNull());
  });

  it('清空当前页最后一条后按新 total 回到有效页，而不是一律回第一页', async () => {
    const user = userEvent.setup();
    const row1 = {
      deleted_id: 1,
      container_name: 'keep-1',
      mount_path: '/m/1',
      mount_cleanup_id: 11,
      removed_at: '2026-09-01T10:00:00',
      cleaned_at: null,
      data_recoverable: true,
      snapshot: { accounts: [] },
    };
    const row2 = {
      deleted_id: 2,
      container_name: 'last-2',
      mount_path: '/m/2',
      mount_cleanup_id: 12,
      removed_at: '2026-09-02T10:00:00',
      cleaned_at: null,
      data_recoverable: true,
      snapshot: { accounts: [] },
    };
    let restored = false;
    listDeletedContainers.mockReset();
    listDeletedContainers.mockImplementation(async ({ page_number }) => {
      if (page_number === 2) {
        return restored
          ? { success: 1, records: [], total_number: 20, total_page: 1 }
          : { success: 1, records: [row2], total_number: 21, total_page: 2 };
      }
      return { success: 1, records: [row1], total_number: restored ? 20 : 21, total_page: restored ? 1 : 2 };
    });
    resurrectDeletedContainer.mockReset();
    resurrectDeletedContainer.mockImplementation(async () => {
      restored = true;
      return { success: 1, container_id: 99 };
    });

    render(
      <MemoryRouter>
        <DeletedContainers />
      </MemoryRouter>,
    );

    expect(await screen.findByText('keep-1')).toBeInTheDocument();
    await user.click(document.querySelector('.ant-pagination-item-2 a'));
    expect(await screen.findByText('last-2')).toBeInTheDocument();

    const row = screen.getByText('last-2').closest('tr');
    await user.click(within(row).getByRole('button', { name: /恢复/ }));
    const confirmButtons = screen.getAllByRole('button', { name: /恢\s*复/ });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    // 第 2 页已空且 total_page=1 → 只回退一次到第 1 页
    await waitFor(() => {
      const pages = listDeletedContainers.mock.calls.map(call => call[0].page_number);
      expect(pages[pages.length - 1]).toBe(1);
    });
    expect(await screen.findByText('keep-1')).toBeInTheDocument();
  });

  it('动作在途时切换页码：动作完成后跟随当前页刷新', async () => {
    const user = userEvent.setup();
    const gate = deferred();
    const row1 = { deleted_id: 1, container_name: 'row-1', mount_cleanup_id: 11, mount_path: '/m/1', removed_at: '2026-09-01T10:00:00', data_recoverable: true, snapshot: { accounts: [] } };
    const row2 = { deleted_id: 2, container_name: 'row-2', mount_cleanup_id: 12, mount_path: '/m/2', removed_at: '2026-09-02T10:00:00', data_recoverable: true, snapshot: { accounts: [] } };

    listDeletedContainers.mockReset();
    listDeletedContainers.mockImplementation(async ({ page_number }) => (
      page_number === 1
        ? { success: 1, records: [row1], total_number: 21, total_page: 2 }
        : { success: 1, records: [row2], total_number: 21, total_page: 2 }
    ));
    resurrectDeletedContainer.mockReset();
    resurrectDeletedContainer.mockReturnValue(gate.promise);

    render(
      <MemoryRouter>
        <DeletedContainers />
      </MemoryRouter>,
    );

    expect(await screen.findByText('row-1')).toBeInTheDocument();
    const row = screen.getByText('row-1').closest('tr');
    await user.click(within(row).getByRole('button', { name: /恢复/ }));
    const confirmButtons = screen.getAllByRole('button', { name: /恢\s*复/ });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    // 动作未完成时切到第 2 页
    await user.click(document.querySelector('.ant-pagination-item-2 a'));
    expect(await screen.findByText('row-2')).toBeInTheDocument();

    gate.resolve({ success: 1, container_id: 42 });

    await waitFor(() => {
      const pages = listDeletedContainers.mock.calls.map(call => call[0].page_number);
      // 动作完成后的刷新落在当前页 2，而不是发起动作时的第 1 页
      expect(pages[pages.length - 1]).toBe(2);
      expect(pages.filter(p => p === 1)).toHaveLength(1);
    });
  });

  it('迟到响应不覆盖新页', async () => {
    const p2 = deferred();
    const p3 = deferred();
    const row1 = { deleted_id: 1, container_name: 'row-1', mount_cleanup_id: 11, mount_path: '/m/1', removed_at: '2026-09-01T10:00:00', data_recoverable: true, snapshot: { accounts: [] } };
    const row2 = { deleted_id: 2, container_name: 'row-2', mount_cleanup_id: 12, mount_path: '/m/2', removed_at: '2026-09-02T10:00:00', data_recoverable: true, snapshot: { accounts: [] } };
    const row3 = { deleted_id: 3, container_name: 'row-3', mount_cleanup_id: 13, mount_path: '/m/3', removed_at: '2026-09-03T10:00:00', data_recoverable: true, snapshot: { accounts: [] } };

    listDeletedContainers.mockReset();
    listDeletedContainers.mockImplementation(({ page_number }) => {
      if (page_number === 2) return p2.promise;
      if (page_number === 3) return p3.promise;
      // 41/20 → 3 页，元数据自洽
      return Promise.resolve({ success: 1, records: [row1], total_number: 41, total_page: 3 });
    });

    render(
      <MemoryRouter>
        <DeletedContainers />
      </MemoryRouter>,
    );

    expect(await screen.findByText('row-1')).toBeInTheDocument();
    // 第 2 页请求处于 pending（loading 会临时禁用指针），用 fireEvent 触发分页点击
    fireEvent.click(document.querySelector('.ant-pagination-item-2 a'));
    fireEvent.click(document.querySelector('.ant-pagination-item-3 a'));

    p3.resolve({ success: 1, records: [row3], total_number: 41, total_page: 3 });
    expect(await screen.findByText('row-3')).toBeInTheDocument();

    // 页面 2 的迟到响应必须被丢弃
    p2.resolve({ success: 1, records: [row2], total_number: 41, total_page: 3 });
    await waitFor(() => expect(screen.queryByText('row-2')).toBeNull());
    expect(screen.getByText('row-3')).toBeInTheDocument();
  });

  it('第二页为空但仍在有效页范围内时保留分页入口，可回翻', async () => {
    const user = userEvent.setup();
    const row1 = { deleted_id: 1, container_name: 'row-1', mount_cleanup_id: 11, mount_path: '/m/1', removed_at: '2026-09-01T10:00:00', data_recoverable: true, snapshot: { accounts: [] } };

    listDeletedContainers.mockReset();
    listDeletedContainers.mockImplementation(async ({ page_number }) => (
      page_number === 2
        ? { success: 1, records: [], total_number: 21, total_page: 2 }
        : { success: 1, records: [row1], total_number: 21, total_page: 2 }
    ));

    render(
      <MemoryRouter>
        <DeletedContainers />
      </MemoryRouter>,
    );

    expect(await screen.findByText('row-1')).toBeInTheDocument();
    await user.click(document.querySelector('.ant-pagination-item-2 a'));

    // 第 2 页确属有效页（total_page=2），空页也保留 Table 与分页
    expect(await screen.findByText('暂无已删除容器')).toBeInTheDocument();
    expect(document.querySelector('.ant-pagination-item-1')).not.toBeNull();

    await user.click(document.querySelector('.ant-pagination-item-1 a'));
    expect(await screen.findByText('row-1')).toBeInTheDocument();
  });

  it('第 3 页缩到第 2 页时回到第 2 页，而不是一律回第一页', async () => {
    const user = userEvent.setup();
    const row1 = { deleted_id: 1, container_name: 'row-1', mount_cleanup_id: 11, mount_path: '/m/1', removed_at: '2026-09-01T10:00:00', data_recoverable: true, snapshot: { accounts: [] } };
    const row2 = { deleted_id: 2, container_name: 'row-2', mount_cleanup_id: 12, mount_path: '/m/2', removed_at: '2026-09-02T10:00:00', data_recoverable: true, snapshot: { accounts: [] } };
    const row3 = { deleted_id: 3, container_name: 'row-3', mount_cleanup_id: 13, mount_path: '/m/3', removed_at: '2026-09-03T10:00:00', data_recoverable: true, snapshot: { accounts: [] } };
    let restored = false;

    listDeletedContainers.mockReset();
    listDeletedContainers.mockImplementation(async ({ page_number }) => {
      const total_number = restored ? 40 : 41;
      const total_page = restored ? 2 : 3;
      if (page_number === 3) {
        return restored
          ? { success: 1, records: [], total_number, total_page }
          : { success: 1, records: [row3], total_number, total_page };
      }
      return { success: 1, records: page_number === 2 ? [row2] : [row1], total_number, total_page };
    });
    resurrectDeletedContainer.mockReset();
    resurrectDeletedContainer.mockImplementation(async () => {
      restored = true;
      return { success: 1, container_id: 99 };
    });

    render(
      <MemoryRouter>
        <DeletedContainers />
      </MemoryRouter>,
    );

    expect(await screen.findByText('row-1')).toBeInTheDocument();
    await user.click(document.querySelector('.ant-pagination-item-3 a'));
    expect(await screen.findByText('row-3')).toBeInTheDocument();

    const row = screen.getByText('row-3').closest('tr');
    await user.click(within(row).getByRole('button', { name: /恢复/ }));
    const confirmButtons = screen.getAllByRole('button', { name: /恢\s*复/ });
    await user.click(confirmButtons[confirmButtons.length - 1]);

    // 41/20 → 3 页；恢复最后一条后 40/20 → 2 页：回退到第 2 页而非第 1 页
    await waitFor(() => {
      const pages = listDeletedContainers.mock.calls.map(call => call[0].page_number);
      expect(pages[pages.length - 1]).toBe(2);
    });
    expect(await screen.findByText('row-2')).toBeInTheDocument();
  });

  it('total_page 缺失/0 但 total_number 仍支持当前页时保留当前页', async () => {
    const user = userEvent.setup();
    const row1 = { deleted_id: 1, container_name: 'row-1', mount_cleanup_id: 11, mount_path: '/m/1', removed_at: '2026-09-01T10:00:00', data_recoverable: true, snapshot: { accounts: [] } };

    listDeletedContainers.mockReset();
    listDeletedContainers.mockImplementation(async ({ page_number }) => (
      page_number === 2
        // total_page 缺失（0）；40/20 仍支持第 2 页，不得武断回第 1 页
        ? { success: 1, records: [], total_number: 40, total_page: 0 }
        : { success: 1, records: [row1], total_number: 40, total_page: 2 }
    ));

    render(
      <MemoryRouter>
        <DeletedContainers />
      </MemoryRouter>,
    );

    expect(await screen.findByText('row-1')).toBeInTheDocument();
    await user.click(document.querySelector('.ant-pagination-item-2 a'));

    expect(await screen.findByText('暂无已删除容器')).toBeInTheDocument();
    await waitFor(() => {
      const pages = listDeletedContainers.mock.calls.map(call => call[0].page_number);
      expect(pages[pages.length - 1]).toBe(2);
    });
    expect(document.querySelector('.ant-pagination-item-1')).not.toBeNull();
  });
});
