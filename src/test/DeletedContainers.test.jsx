import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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
  listDeletedContainers: vi.fn(),
  resurrectDeletedContainer: vi.fn(),
}));

vi.mock('../utils/showErrorModal', () => ({
  default: vi.fn(),
}));

import { listDeletedContainers, resurrectDeletedContainer } from '../api/container_api';
import DeletedContainers from '../pages/DeletedContainers';

describe('DeletedContainers', () => {
  beforeEach(() => {
    listDeletedContainers.mockReset();
    resurrectDeletedContainer.mockReset();
    listDeletedContainers.mockResolvedValue({
      success: 1,
      records: [
        {
          deleted_id: 7,
          original_container_id: 3,
          container_name: 'deleted-train',
          // 后端由容器行推导（归属标识 + 构建版本戳）；不再有快照 JSON 内嵌的副本
          container_image: 'fuxi/image-1:20260825T090016Z',
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
});
