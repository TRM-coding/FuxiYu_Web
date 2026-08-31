import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../api/container_api', () => ({
  addCollaborator: vi.fn(),
  getContainerDetailInformation: vi.fn(),
  getContainerStatus: vi.fn(),
  listAllContainerBrefInformation: vi.fn(),
  removeCollaborator: vi.fn(),
  updateRole: vi.fn(),
}));

vi.mock('../api/machine_api', () => ({
  getDetailInformation: vi.fn(),
  getMachineStatus: vi.fn(),
}));

vi.mock('../api/user_api', () => ({
  listAllUserBrefInformation: vi.fn(),
}));

import {
  getContainerDetailInformation,
  getContainerStatus,
  listAllContainerBrefInformation,
} from '../api/container_api';
import { getDetailInformation, getMachineStatus } from '../api/machine_api';
import { listAllUserBrefInformation } from '../api/user_api';
import ContainerDetailPage from '../pages/ContainerDetailPage';
import MachineDetailPage from '../pages/MachineDetailPage';

describe('DetailPages snapshot polling', () => {
  let pollingCallback;

  beforeEach(() => {
    pollingCallback = null;
    getContainerDetailInformation.mockReset();
    getContainerStatus.mockReset();
    listAllContainerBrefInformation.mockReset();
    getDetailInformation.mockReset();
    getMachineStatus.mockReset();
    listAllUserBrefInformation.mockReset();
    listAllUserBrefInformation.mockResolvedValue({ users: [] });
    window.localStorage.setItem('currentUserId', '1');
    vi.spyOn(globalThis, 'setInterval').mockImplementation((cb, delay) => {
      if (delay === 5000) pollingCallback = cb;
      return 1;
    });
    vi.spyOn(globalThis, 'clearInterval').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('container detail initializes with detail API and polls container_status cache only', async () => {
    getContainerDetailInformation.mockResolvedValue({
      success: 1,
      container_info: {
        container_id: 12,
        container_name: 'train-a',
        container_status: 'creating',
        machine_ip: '10.0.0.8',
        port: 1024,
        cpu_number: 2,
        memory_gb: 4,
          port_mappings: [
            { container_port: 22, host_port: 1024, protocol: 'tcp' },
            { container_port: 8080, host_port: 31080, protocol: 'tcp' },
          ],
          shared_gb: 1,
          accounts: [
            { user_id: 1, username: 'root_user', role: 'ROOT' },
            { user_id: 2, username: 'collab_user', role: 'COLLABORATOR' },
          ],
          runtime_metrics: {
            collected_at: '2026-08-29T12:00:00',
            cpu_usage_percent: 10,
            memory_usage_percent: 20,
          },
        },
      });
    listAllUserBrefInformation.mockResolvedValue({
      users: [
        { id: 1, username: 'root_user', name: 'root_user' },
        { id: 2, username: 'collab_user', name: 'collab_user' },
        { id: 3, username: 'new_user', name: 'new_user' },
      ],
    });
    getContainerStatus.mockResolvedValue({
      container_status: 'online',
      failed_reason: null,
      failed_detail: null,
      runtime_metrics: {
        collected_at: '2026-08-29T12:00:05',
        cpu_usage_percent: 30,
        memory_usage_percent: 40,
      },
    });

    render(
      <MemoryRouter initialEntries={['/index/containers/12']}>
        <Routes>
          <Route path="/index/containers/:containerId" element={<ContainerDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('train-a')).toBeInTheDocument();
    expect(getContainerDetailInformation).toHaveBeenCalledTimes(1);
    expect(listAllUserBrefInformation).toHaveBeenCalledWith({ page_number: 1, page_size: 100 });
    expect(getContainerStatus).not.toHaveBeenCalled();

    expect(pollingCallback).toBeTypeOf('function');
    await act(async () => {
      await pollingCallback();
    });

    await waitFor(() => expect(getContainerStatus).toHaveBeenCalledWith(12));
    expect(getContainerDetailInformation).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getAllByText('运行中').length).toBeGreaterThan(0));
    expect(screen.getAllByText(/2026\/8\/29/).length).toBeGreaterThan(0);
    expect(screen.getByText('端口管理')).toBeInTheDocument();
    expect(screen.getByText(':8080')).toBeInTheDocument();
    expect(screen.getByText(':31080')).toBeInTheDocument();
    // 22 端口条目全量展示（不再被 SSH 入口过滤），带「平台保留」标记
    expect(screen.getAllByText('平台保留').length).toBeGreaterThan(0);
    expect(screen.getByText('用户管理')).toBeInTheDocument();
    expect(screen.getByText('@root_user · ID 1')).toBeInTheDocument();
    expect(screen.getAllByText('协作者').length).toBeGreaterThan(0);
    expect(screen.queryByText('基础信息')).not.toBeInTheDocument();
  });

  it('machine detail initializes with detail API and polls machine_status cache only', async () => {
    getDetailInformation.mockResolvedValue({
      machine_name: 'gpu-node-01',
      machine_ip: '10.0.0.9',
      machine_type: 'GPU',
      machine_status: 'online',
      display_status: 'online',
      cpu_core_number: 16,
      memory_size_gb: 128,
      gpu_number: 2,
      disk_size_gb: 1024,
      max_cpu_core_number: 12,
      max_memory_gb: 96,
      max_gpu_number: 1,
      runtime_snapshot: {
        collected_at: '2026-08-29T12:00:00',
        hostname: 'node-01',
        platform: 'Linux',
        cpu: { usage_percent: 11 },
        memory: { usage_percent: 22, used_gb: 28, total_gb: 128 },
        disk: { percent: 33, used_gb: 330, total_gb: 1024 },
        gpu: [{ index: 0, vendor: 'nvidia', name: 'RTX 4060', utilization_gpu_percent: 44, memory_used_gb: 2, memory_gb: 8 }],
      },
    });
    getMachineStatus.mockResolvedValue({
      machine_status: 'offline',
      display_status: 'offline',
      is_maintenance: false,
      runtime_snapshot: {
        collected_at: '2026-08-29T12:00:05',
        hostname: 'node-01',
        platform: 'Linux',
        cpu: { usage_percent: 15 },
        memory: { usage_percent: 25, used_gb: 32, total_gb: 128 },
        disk: { percent: 35, used_gb: 350, total_gb: 1024 },
        gpu: [{ index: 0, vendor: 'nvidia', name: 'RTX 4060', utilization_gpu_percent: 55, memory_used_gb: 3, memory_gb: 8 }],
      },
    });
    render(
      <MemoryRouter initialEntries={['/index/machines/7']}>
        <Routes>
          <Route path="/index/machines/:machineId" element={<MachineDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('gpu-node-01')).toBeInTheDocument();
    expect(getDetailInformation).toHaveBeenCalledTimes(1);
    expect(listAllContainerBrefInformation).not.toHaveBeenCalled();
    expect(getMachineStatus).not.toHaveBeenCalled();

    expect(pollingCallback).toBeTypeOf('function');
    await act(async () => {
      await pollingCallback();
    });

    await waitFor(() => expect(getMachineStatus).toHaveBeenCalledWith(7));
    expect(getDetailInformation).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('已停止')).toBeInTheDocument();
    expect(screen.getAllByText(/2026\/8\/29/).length).toBeGreaterThan(0);
    expect(screen.queryByText('机器信息')).not.toBeInTheDocument();
  });
});
