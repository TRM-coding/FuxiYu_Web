import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../api/container_api', () => ({
  addCollaborator: vi.fn(),
  deleteContainer: vi.fn(),
  getContainerDetailInformation: vi.fn(),
  getContainerStatus: vi.fn(),
  listAllContainerBrefInformation: vi.fn(),
  removeCollaborator: vi.fn(),
  restartContainer: vi.fn(),
  setLongTermContainer: vi.fn(),
  startContainer: vi.fn(),
  stopContainer: vi.fn(),
  unpauseContainer: vi.fn(),
  updateRole: vi.fn(),
}));

vi.mock('../api/machine_api', () => ({
  getDetailInformation: vi.fn(),
  getMachineStatus: vi.fn(),
  removeMachine: vi.fn(),
  setMachineMaintenance: vi.fn(),
  updateMachine: vi.fn(),
}));

vi.mock('../api/user_api', () => ({
  listAllUserBrefInformation: vi.fn(),
}));

import {
  deleteContainer,
  getContainerDetailInformation,
  getContainerStatus,
  listAllContainerBrefInformation,
  restartContainer,
  startContainer,
  stopContainer,
} from '../api/container_api';
import { getDetailInformation, getMachineStatus, removeMachine, setMachineMaintenance, updateMachine } from '../api/machine_api';
import { listAllUserBrefInformation } from '../api/user_api';
import ContainerDetailPage from '../pages/ContainerDetailPage';
import MachineDetailPage from '../pages/MachineDetailPage';

describe('DetailPages snapshot polling', () => {
  let pollingCallback;

  beforeEach(() => {
    pollingCallback = null;
    getContainerDetailInformation.mockReset();
    deleteContainer.mockReset();
    restartContainer.mockReset();
    startContainer.mockReset();
    stopContainer.mockReset();
    getContainerStatus.mockReset();
    listAllContainerBrefInformation.mockReset();
    getDetailInformation.mockReset();
    getMachineStatus.mockReset();
    removeMachine.mockReset();
    setMachineMaintenance.mockReset();
    updateMachine.mockReset();
    listAllUserBrefInformation.mockReset();
    listAllUserBrefInformation.mockResolvedValue({ users: [] });
    deleteContainer.mockResolvedValue({ success: 1 });
    restartContainer.mockResolvedValue({ success: 1 });
    startContainer.mockResolvedValue({ success: 1 });
    stopContainer.mockResolvedValue({ success: 1 });
    removeMachine.mockResolvedValue({ success: 1 });
    setMachineMaintenance.mockResolvedValue({ success: 1 });
    updateMachine.mockResolvedValue({ success: 1 });
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

  it('container detail initializes with detail API and polls effective_status cache only', async () => {
    getContainerDetailInformation.mockResolvedValue({
      success: 1,
      container_info: {
        container_id: 12,
        container_name: 'train-a',
        effective_status: 'creating',
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
      effective_status: 'online',
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

  it('container detail delete button opens confirm and calls delete API after confirmation', async () => {
    const user = userEvent.setup();
    getContainerDetailInformation.mockResolvedValue({
      success: 1,
      container_info: {
        container_id: 12,
        container_name: 'train-a',
        effective_status: 'online',
        machine_ip: '10.0.0.8',
        port: 1024,
        cpu_number: 2,
        memory_gb: 4,
        shared_gb: 1,
        accounts: [],
      },
    });

    render(
      <MemoryRouter initialEntries={['/index/containers/12']}>
        <Routes>
          <Route path="/index/containers/:containerId" element={<ContainerDetailPage />} />
          <Route path="/index" element={<div>home page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('train-a')).toBeInTheDocument();

    const operationCard = screen.getByText('容器操作').closest('.container-operations-card');
    expect(operationCard).not.toBeNull();
    await user.click(within(operationCard).getByRole('button', { name: /删除/ }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('确认删除容器')).toBeInTheDocument();
    expect(within(dialog).getByText('删除')).toHaveClass('mm-action-verb');
    expect(within(dialog).getByText('容器')).toBeInTheDocument();
    expect(within(dialog).getByText('名称：train-a')).toBeInTheDocument();
    expect(within(dialog).getByText('此操作不可恢复！此操作将永久删除该容器。')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /删\s*除/ }));

    await waitFor(() => expect(deleteContainer).toHaveBeenCalledWith(12));
    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument());
  });

  it.each([
    ['online', /停\s*止/, '停止', '确认停止容器', '停止容器是高风险操作，可能导致服务中断或数据不可用。', /确认\s*停止/, stopContainer],
    ['online', /重\s*启/, '重启', '确认重启容器', '重启容器是高风险操作，可能会中断正在运行的任务。', /确认\s*重启/, restartContainer],
  ])('container detail %s danger action uses full confirmation before API call', async (status, buttonName, verb, title, detailText, confirmName, apiFn) => {
    const user = userEvent.setup();
    getContainerDetailInformation.mockResolvedValue({
      success: 1,
      container_info: {
        container_id: 12,
        container_name: 'train-a',
        effective_status: status,
        machine_ip: '10.0.0.8',
        port: 1024,
        cpu_number: 2,
        memory_gb: 4,
        shared_gb: 1,
        accounts: [],
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

    const operationCard = screen.getByText('容器操作').closest('.container-operations-card');
    expect(operationCard).not.toBeNull();
    await user.click(within(operationCard).getByRole('button', { name: buttonName }));

    expect(apiFn).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(title)).toBeInTheDocument();
    expect(within(dialog).getByText(verb)).toHaveClass('mm-action-verb');
    expect(within(dialog).getByText('容器')).toBeInTheDocument();
    expect(within(dialog).getByText('名称：train-a')).toBeInTheDocument();
    expect(within(dialog).getByText('容器ID：')).toBeInTheDocument();
    expect(within(dialog).getByText('12')).toBeInTheDocument();
    expect(within(dialog).getByText('容器名：')).toBeInTheDocument();
    expect(within(dialog).getByText('所属机器：')).toBeInTheDocument();
    expect(within(dialog).getByText('10.0.0.8')).toBeInTheDocument();
    expect(within(dialog).getByText(detailText)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: confirmName }));

    await waitFor(() => expect(apiFn).toHaveBeenCalledWith(12));
  });

  it('container detail start action keeps informational confirmation before API call', async () => {
    const user = userEvent.setup();
    getContainerDetailInformation.mockResolvedValue({
      success: 1,
      container_info: {
        container_id: 12,
        container_name: 'train-a',
        effective_status: 'offline',
        machine_ip: '10.0.0.8',
        port: 1024,
        cpu_number: 2,
        memory_gb: 4,
        shared_gb: 1,
        accounts: [],
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

    const operationCard = screen.getByText('容器操作').closest('.container-operations-card');
    expect(operationCard).not.toBeNull();
    await user.click(within(operationCard).getByRole('button', { name: /启\s*动/ }));

    expect(startContainer).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('确认启动容器')).toBeInTheDocument();
    expect(within(dialog).getByText('确定要启动容器 train-a 吗？')).toBeInTheDocument();
    expect(within(dialog).getByText('启动容器后，平台将等待状态采集确认其进入运行中。')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /确认\s*启动/ }));

    await waitFor(() => expect(startContainer).toHaveBeenCalledWith(12));
  });

  it('machine detail initializes with detail API and polls machine_status cache only', async () => {
    getDetailInformation.mockResolvedValue({
      machine_name: 'gpu-node-01',
      machine_ip: '10.0.0.9',
      machine_type: 'GPU',
      machine_status: 'online',
      effective_status: 'online',
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
      effective_status: 'offline',
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

  it('machine detail delete button opens confirmation before remove API call', async () => {
    const user = userEvent.setup();
    getDetailInformation.mockResolvedValue({
      machine_name: 'gpu-node-01',
      machine_ip: '10.0.0.9',
      machine_type: 'GPU',
      machine_status: 'online',
      effective_status: 'online',
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

    render(
      <MemoryRouter initialEntries={['/index/machines/7']}>
        <Routes>
          <Route path="/index/machines/:machineId" element={<MachineDetailPage />} />
          <Route path="/admin/machines" element={<div>machine list</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('gpu-node-01')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /删除/ }));

    expect(removeMachine).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('确认删除宿主机')).toBeInTheDocument();
    expect(within(dialog).getByText('删除')).toHaveClass('mm-action-verb');
    expect(within(dialog).getByText('机器')).toBeInTheDocument();
    expect(within(dialog).getByText('名称：gpu-node-01')).toBeInTheDocument();
    expect(within(dialog).getByText('机器ID：')).toBeInTheDocument();
    expect(within(dialog).getByText('7')).toBeInTheDocument();
    expect(within(dialog).getByText('机器名：')).toBeInTheDocument();
    expect(within(dialog).getByText('IP：')).toBeInTheDocument();
    expect(within(dialog).getByText('10.0.0.9')).toBeInTheDocument();
    expect(within(dialog).getByText('此操作不可恢复！删除前务必先手动清理该机器上的容器。')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /删\s*除/ }));

    await waitFor(() => expect(removeMachine).toHaveBeenCalledWith([7]));
    await waitFor(() => expect(screen.getByText('machine list')).toBeInTheDocument());
  });

});
