import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// antd message 在 jsdom 下会产生滚动条测量噪音，只保留组件实现、替换 message
vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal();
  return { ...antd, message: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } };
});

vi.mock('../utils/showErrorModal', () => ({ default: vi.fn().mockResolvedValue({ confirmed: true }) }));

vi.mock('../api/machine_api', () => ({
  getDetailInformation: vi.fn(),
  getMachineStatus: vi.fn(),
  removeMachine: vi.fn(),
  renewMachineTrust: vi.fn(),
  setMachineMaintenance: vi.fn(),
  updateMachine: vi.fn(),
}));

vi.mock('../api/container_api', () => ({
  getContainerDetailInformation: vi.fn(),
  listAllContainerBrefInformation: vi.fn(),
}));

vi.mock('../api/user_api', () => ({
  listAllUserBrefInformation: vi.fn().mockResolvedValue({ users: [] }),
}));

import { getDetailInformation, getMachineStatus, updateMachine } from '../api/machine_api';
import MachineDetailPage from '../pages/MachineDetailPage';

const MACHINE = {
  machine_name: 'gpu-node-01',
  machine_ip: '10.0.0.9',
  port: 6789,
  machine_type: 'GPU',
  machine_status: 'online',
  cpu_core_number: 16,
  memory_size_gb: 64,
  gpu_number: 2,
  disk_size_gb: 1024,
  max_cpu_core_number: 12,
  max_memory_gb: 32,
  max_shared_gb: 8,
  max_gpu_number: 2,
  max_disk_size_gb: 512,
  gpu_allow_list: [0, 1],
  runtime_snapshot: { gpu: [{ index: 0 }, { index: 1 }] },
};

const renderPage = () => render(
  <MemoryRouter initialEntries={['/index/machines/7']}>
    <Routes>
      <Route path="/index/machines/:machineId" element={<MachineDetailPage />} />
    </Routes>
  </MemoryRouter>,
);

describe('MachineDetailPage 端口契约（Q15）', () => {
  beforeEach(() => {
    getDetailInformation.mockReset();
    getDetailInformation.mockResolvedValue(MACHINE);
    getMachineStatus.mockReset();
    getMachineStatus.mockResolvedValue({ machine_status: 'online', is_maintenance: false });
    updateMachine.mockReset();
    updateMachine.mockResolvedValue({ success: 1 });
  });

  it('标题区显示记录里的实际端口，编辑草稿预填该端口', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText('端口 6789')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /编\s*辑/ }));
    expect(await screen.findByText('编辑机器基本信息')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('留空用平台默认').value).toBe('6789');
  });

  it('未改动端口时保存回传真实端口，而不是 null', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('端口 6789');

    await user.click(screen.getByRole('button', { name: /编\s*辑/ }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(updateMachine).toHaveBeenCalledTimes(1));
    expect(updateMachine.mock.calls[0][0]).toBe(7);
    expect(updateMachine.mock.calls[0][1]).toMatchObject({ port: 6789 });
  });

  it('端口未配置时给出明确缺省语义，不显示默认端口号', async () => {
    getDetailInformation.mockResolvedValue({ ...MACHINE, port: null });
    renderPage();

    expect(await screen.findByText('端口 未配置（平台默认）')).toBeInTheDocument();
    expect(screen.queryByText('端口 5789')).not.toBeInTheDocument();
  });
});
