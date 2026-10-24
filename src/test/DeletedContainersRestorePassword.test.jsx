import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../contexts/PermissionContext', () => ({
  usePermission: () => ({ loaded: true, hasPermission: code => code === 'container:manage' }),
}));
vi.mock('../api/container_api', () => ({
  cleanDeletedContainerMount: vi.fn(),
  getDeletedContainerMountUsage: vi.fn().mockResolvedValue({ success: 1, usages: [] }),
  listDeletedContainers: vi.fn(),
  resurrectDeletedContainer: vi.fn(),
}));
vi.mock('../utils/showErrorModal', () => ({ default: vi.fn() }));

import { listDeletedContainers, resurrectDeletedContainer } from '../api/container_api';
import showErrorModal from '../utils/showErrorModal';
import DeletedContainers from '../pages/DeletedContainers';

const record = {
  deleted_id: 7,
  original_container_id: 3,
  container_name: 'deleted-train',
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
  snapshot: { port: 1024, cpu_number: 2, memory_gb: 4, gpu_number: 1, shared_gb: 1 },
};

const renderPage = () => render(<MemoryRouter><DeletedContainers /></MemoryRouter>);

const confirmRestore = async () => {
  expect(await screen.findByText('deleted-train')).toBeInTheDocument();
  const row = screen.getByText('deleted-train').closest('tr');
  await userEvent.click(within(row).getByRole('button', { name: /恢复/ }));
  await screen.findByText('恢复会复用保留的 mount 目录，并重新创建容器与用户绑定。');
  const buttons = screen.getAllByRole('button', { name: /恢\s*复/ });
  await userEvent.click(buttons[buttons.length - 1]);
};

beforeEach(() => {
  vi.clearAllMocks();
  listDeletedContainers.mockResolvedValue({ success: 1, records: [record], total_number: 1, total_page: 1 });
  resurrectDeletedContainer.mockResolvedValue({
    success: 1,
    accepted: true,
    credentials: [{ login_name: 'root', password: 'pw-restore' }],
  });
});

describe('DeletedContainers restore credential', () => {
  it('test_deleted_restore_root_credential shows root password, bypasses requires_choice, and keeps errors sanitized', async () => {
    renderPage();
    await confirmRestore();
    await waitFor(() => expect(resurrectDeletedContainer).toHaveBeenCalledWith(7, null));
    expect(await screen.findByText('重置后root的密码：')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /关\s*闭/ }));

    resurrectDeletedContainer.mockResolvedValueOnce({
      success: 1,
      requires_choice: true,
      snapshot: { dockerfile: 'FROM ubuntu:22.04\n' },
      template: { dockerfile: 'FROM ubuntu:24.04\n' },
      sections: [],
    });
    const row = screen.getByText('deleted-train').closest('tr');
    await userEvent.click(within(row).getByRole('button', { name: /恢复/ }));
    await screen.findByText('恢复会复用保留的 mount 目录，并重新创建容器与用户绑定。');
    const buttons = screen.getAllByRole('button', { name: /恢\s*复/ });
    await userEvent.click(buttons[buttons.length - 1]);
    await waitFor(() => expect(screen.queryByText('重置后root的密码：')).not.toBeInTheDocument());

    resurrectDeletedContainer.mockRejectedValueOnce(Object.assign(new Error('恢复失败'), {
      status: 500,
      body: { message: 'Internal error', credentials: [{ login_name: 'root', password: 'secret-pw' }] },
    }));
    const row2 = screen.getByText('deleted-train').closest('tr');
    await userEvent.click(within(row2).getByRole('button', { name: /恢复/ }));
    await screen.findByText('恢复会复用保留的 mount 目录，并重新创建容器与用户绑定。');
    const buttons2 = screen.getAllByRole('button', { name: /恢\s*复/ });
    await userEvent.click(buttons2[buttons2.length - 1]);
    await waitFor(() => expect(showErrorModal).toHaveBeenCalled());
    const args = showErrorModal.mock.calls.at(-1)[0];
    expect(args.message).not.toContain('secret-pw');
    expect(args.body).toBeUndefined();
  });
});
