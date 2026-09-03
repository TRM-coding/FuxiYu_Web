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
          image: 'fuxi/image-1:20260825T090016Z',
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

    await waitFor(() => expect(resurrectDeletedContainer).toHaveBeenCalledWith(7));
    expect(listDeletedContainers).toHaveBeenCalledTimes(2);
  });
});
