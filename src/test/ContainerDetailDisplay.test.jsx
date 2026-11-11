import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const antdMessage = vi.hoisted(() => ({
  success: vi.fn(), warning: vi.fn(), error: vi.fn(), loading: vi.fn(),
}));

const realSetInterval = globalThis.setInterval;
const realClearInterval = globalThis.clearInterval;

vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal();
  return {
    ...antd,
    message: antdMessage,
  };
});

vi.mock('../contexts/PermissionContext', () => ({
  usePermission: () => ({
    entities: ['container:operation', 'container:manage', 'bypass_resource'],
    userId: 1,
    userName: 'root_user',
    loaded: true,
    hasPermission: () => true,
  }),
}));

vi.mock('../api/container_api', () => ({
  addCollaborator: vi.fn(),
  deleteContainer: vi.fn(),
  getContainerDetailInformation: vi.fn(),
  getContainerOperationLogs: vi.fn(),
  getContainerStatus: vi.fn(),
  removeCollaborator: vi.fn(),
  restartContainer: vi.fn(),
  setLongTermContainer: vi.fn(),
  startContainer: vi.fn(),
  stopContainer: vi.fn(),
  unpauseContainer: vi.fn(),
  updateRole: vi.fn(),
}));

vi.mock('../api/user_api', () => ({
  listAllUserBrefInformation: vi.fn(),
}));

vi.mock('../utils/showErrorModal', () => ({ default: vi.fn() }));

import { getContainerDetailInformation, getContainerOperationLogs } from '../api/container_api';
import { listAllUserBrefInformation } from '../api/user_api';
import ContainerDetailPage from '../pages/ContainerDetailPage';

const detail = (overrides = {}) => ({
  container_id: 12,
  container_name: 'train-a',
  effective_status: 'online',
  machine_id: 3,
  machine_ip: '10.0.0.8',
  port: 1024,
  is_long_term: false,
  long_term_container_can_enable: true,
  disk_usage_percent: 20,
  accounts: [{ user_id: 1, username: 'root_user', role: 'ROOT' }],
  ...overrides,
});

const renderDetail = () => render(
  <MemoryRouter initialEntries={['/index/containers/12']}>
    <Routes>
      <Route path="/index/containers/:containerId" element={<ContainerDetailPage />} />
    </Routes>
  </MemoryRouter>,
);

const runtimeCard = () => screen.getByRole('heading', { name: '运行指标' }).closest('.detail-card');

const imageCard = () => screen.getByRole('heading', { name: '镜像信息' }).closest('.detail-card');

const metric = (label) => within(runtimeCard())
  .getByText(label, { selector: '.detail-metric-label' })
  .closest('.detail-metric');

const bindPathField = () => within(runtimeCard()).getByText('宿主 bind 路径').closest('.detail-field');

let clipboardWrite;

beforeEach(() => {
  vi.clearAllMocks();
  clipboardWrite = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: clipboardWrite },
  });
  vi.stubGlobal('fetch', vi.fn());
  // 只截住页面 5s 状态轮询；waitFor 自己的定时器必须继续工作。
  vi.spyOn(globalThis, 'setInterval').mockImplementation((callback, delay, ...args) => (
    delay === 5000 ? 1 : realSetInterval(callback, delay, ...args)
  ));
  vi.spyOn(globalThis, 'clearInterval').mockImplementation((timer) => {
    if (timer !== 1) realClearInterval(timer);
  });
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  getContainerDetailInformation.mockResolvedValue({ container_info: detail() });
  getContainerOperationLogs.mockResolvedValue({ logs: [] });
  listAllUserBrefInformation.mockResolvedValue({ users: [] });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ContainerDetailPage 运行指标展示', () => {
  it('test_bind_path_and_resources_render_in_runtime_metrics', async () => {
    const bindPath = '/home/alice/containers/train-a/with space/片段';
    getContainerDetailInformation.mockResolvedValue({
      container_info: detail({
        bind_mount_path: bindPath,
        image_name: 'fuxi/image:tag',
        image_dockerfile: 'FROM ubuntu:22.04',
        shared_gb: 1,
        runtime_metrics: { gpu: { device_ids: [4, 0], devices: [] } },
      }),
    });

    renderDetail();
    expect(await screen.findByText('train-a')).toBeInTheDocument();

    const runtime = runtimeCard();
    expect(within(runtime).getByText('宿主 bind 路径')).toBeInTheDocument();
    expect(within(runtime).getByText(bindPath)).toBeInTheDocument();
    expect(within(runtime).getByText('最近记录，非实时核对')).toBeInTheDocument();
    expect(within(metric('GPU 分配')).getByText('4, 0')).toBeInTheDocument();
    expect(within(metric('共享内存')).getByText('1 GB')).toBeInTheDocument();

    fireEvent.click(within(runtime).getByRole('button', { name: bindPath }));
    expect(clipboardWrite).toHaveBeenCalledWith(bindPath);

    const image = imageCard();
    expect(within(image).getByText('fuxi/image:tag')).toBeInTheDocument();
    expect(within(image).getByText('FROM ubuntu:22.04')).toBeInTheDocument();
    expect(within(image).queryByText('GPU 分配')).toBeNull();
    expect(within(image).queryByText('共享内存')).toBeNull();
    expect(within(image).queryByText('宿主 bind 路径')).toBeNull();
    expect(within(image).queryByText(bindPath)).toBeNull();

    expect(getContainerDetailInformation).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('test_missing_bind_path_uses_unrecorded_placeholder_without_request', async () => {
    for (const value of [null, '', undefined]) {
      getContainerDetailInformation.mockResolvedValue({
        container_info: detail({ bind_mount_path: value, shared_gb: 1 }),
      });

      const view = renderDetail();
      expect(await screen.findByText('train-a')).toBeInTheDocument();

      const field = bindPathField();
      expect(within(field).getByText('未记录')).toBeInTheDocument();
      expect(within(field).getByText('最近记录，非实时核对')).toBeInTheDocument();
      expect(within(field).queryAllByRole('button')).toHaveLength(0);
      expect(screen.getByText('运行中')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: '镜像信息' })).toBeInTheDocument();
      expect(within(runtimeCard()).getByText('宿主 bind 路径')).toBeInTheDocument();
      expect(fetch).not.toHaveBeenCalled();

      view.unmount();
    }
  });

  it('test_bind_path_is_labeled_as_recent_record', async () => {
    const bindPath = '/home/alice/containers/train-a';
    getContainerDetailInformation.mockResolvedValue({
      container_info: detail({ bind_mount_path: bindPath }),
    });

    renderDetail();
    expect(await screen.findByText('train-a')).toBeInTheDocument();

    const field = bindPathField();
    expect(within(field).getByText('最近记录，非实时核对')).toBeInTheDocument();
    expect(within(field).queryByText('实时核对')).toBeNull();
    expect(within(field).queryByText(/刚刚|已核实|实时检查/)).toBeNull();

    fireEvent.click(within(field).getByRole('button', { name: bindPath }));
    expect(clipboardWrite).toHaveBeenCalledWith(bindPath);
    expect(getContainerDetailInformation).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('test_bind_path_copy_failure_preserves_value', async () => {
    const bindPath = '/home/alice/containers/train-a';
    clipboardWrite.mockRejectedValue(new Error('denied'));
    getContainerDetailInformation.mockResolvedValue({
      container_info: detail({ bind_mount_path: bindPath }),
    });

    renderDetail();
    expect(await screen.findByText('train-a')).toBeInTheDocument();

    const field = bindPathField();
    const chip = within(field).getByRole('button', { name: bindPath });
    fireEvent.click(chip);

    await waitFor(() => expect(antdMessage.error).toHaveBeenCalledWith('复制失败'));
    expect(chip).toHaveAttribute('title', bindPath);
    expect(chip).toHaveTextContent(bindPath);
    expect(within(field).getByText(bindPath)).toBeInTheDocument();
    expect(within(field).queryByText('未记录')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    expect(getContainerDetailInformation).toHaveBeenCalledTimes(1);
  });

  it('test_gpu_and_shared_memory_are_not_rendered_in_image_card', async () => {
    getContainerDetailInformation.mockResolvedValue({
      container_info: detail({
        shared_gb: 1,
        image_name: 'fuxi/image:tag',
        runtime_metrics: { gpu: { device_ids: [4, 0], devices: [] } },
      }),
    });

    renderDetail();
    expect(await screen.findByText('train-a')).toBeInTheDocument();

    expect(within(metric('GPU 分配')).getByText('4, 0')).toBeInTheDocument();
    expect(within(metric('共享内存')).getByText('1 GB')).toBeInTheDocument();

    const image = imageCard();
    expect(within(image).getByText('fuxi/image:tag')).toBeInTheDocument();
    expect(within(image).queryByText('GPU 分配')).toBeNull();
    expect(within(image).queryByText('共享内存')).toBeNull();
    expect(within(image).queryByText('4, 0')).toBeNull();
    expect(within(image).queryByText('1 GB')).toBeNull();
  });

  it('test_zero_resource_is_distinct_from_missing_resource', async () => {
    getContainerDetailInformation.mockResolvedValue({
      container_info: detail({
        alloc_gpu_number: 0,
        shared_gb: 0,
        runtime_metrics: {},
      }),
    });

    const zeroView = renderDetail();
    expect(await screen.findByText('train-a')).toBeInTheDocument();
    expect(within(metric('GPU 分配')).getByText('0 张')).toBeInTheDocument();
    expect(within(metric('共享内存')).getByText('0 GB')).toBeInTheDocument();
    zeroView.unmount();

    getContainerDetailInformation.mockResolvedValue({
      container_info: detail({
        alloc_gpu_number: undefined,
        gpu_number: undefined,
        shared_gb: undefined,
        runtime_metrics: {},
      }),
    });

    renderDetail();
    expect(await screen.findByText('train-a')).toBeInTheDocument();
    expect(within(metric('GPU 分配')).getByText('-')).toBeInTheDocument();
    expect(within(metric('共享内存')).getByText('-')).toBeInTheDocument();
    expect(within(runtimeCard()).getByText('CPU')).toBeInTheDocument();
    expect(within(runtimeCard()).getByText('网络')).toBeInTheDocument();
    expect(within(runtimeCard()).getByText('磁盘')).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('test_missing_image_and_dockerfile_use_explicit_placeholders', async () => {
    for (const dockerfile of [null, '', undefined]) {
      getContainerDetailInformation.mockResolvedValue({
        container_info: detail({
          image_name: '',
          image_dockerfile: dockerfile,
          shared_gb: 1,
          runtime_metrics: { gpu: { device_ids: [4, 0], devices: [] } },
        }),
      });

      const view = renderDetail();
      expect(await screen.findByText('train-a')).toBeInTheDocument();

      const image = imageCard();
      expect(within(image).getByText('未知')).toBeInTheDocument();
      expect(image.querySelector('pre.container-dockerfile')).toBeNull();
      expect(within(runtimeCard()).getByText('GPU 分配')).toBeInTheDocument();
      expect(within(runtimeCard()).getByText('共享内存')).toBeInTheDocument();

      view.unmount();
    }
  });
});
