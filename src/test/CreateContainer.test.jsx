import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// antd message 在 jsdom 下会产生滚动条测量噪音，只保留组件实现、替换 message
vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal();
  return { ...antd, message: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } };
});

vi.mock('../api/machine_api', () => ({
  listAllMachineBrefInformation: vi.fn().mockResolvedValue({
    machines: [{
      machine_id: 1,
      machine_name: 'gpu-01',
      machine_ip: '10.0.0.1',
      machine_type: 'GPU',
      machine_status: 'online',
    }],
  }),
  getDetailInformation: vi.fn().mockResolvedValue({
    cpu_core_number: 32,
    memory_size_gb: 128,
    gpu_number: 0,
    max_cpu_core_number: 32,
    max_memory_gb: 128,
    max_gpu_number: 8,
    max_shared_gb: 16,
  }),
  listMachinePermissions: vi.fn().mockResolvedValue({ user_ids: [1, 2] }),
}));

vi.mock('../api/user_api', () => ({
  getUserPermissions: vi.fn(),
  listAllUserBrefInformation: vi.fn().mockResolvedValue({
    users: [
      { user_id: 1, username: 'operator1', display_name: '运维一号' },
      { user_id: 2, username: 'student9', display_name: '学生九' },
    ],
  }),
}));

vi.mock('../api/container_api', () => ({
  createContainer: vi.fn().mockResolvedValue({ success: 1 }),
}));

vi.mock('../api/image_api', () => ({
  listImageBrefInformation: vi.fn().mockResolvedValue({
    images: [
      {
        image_id: 7,
        name: 'PyTorch 2.x + CUDA 12.1',
        description: 'GPU 训练环境',
        base_image: 'ubuntu:22.04',
        status: 'ready',
      },
    ],
  }),
  getImageDetailInformation: vi.fn().mockResolvedValue({
    image: {
      image_id: 7,
      name: 'PyTorch 2.x + CUDA 12.1',
      description: 'GPU 训练环境',
      base_image: 'ubuntu:22.04',
      status: 'ready',
      dockerfile_body: 'RUN echo torch',
    },
  }),
}));

import { getUserPermissions } from '../api/user_api';
import { createContainer } from '../api/container_api';
import { listMachinePermissions } from '../api/machine_api';
import { listImageBrefInformation, getImageDetailInformation } from '../api/image_api';
import CreateContainer from '../pages/CreateContainer';

const selectImage = async () => {
  await userEvent.click(await screen.findByRole('button', { name: /PyTorch/ }));
};

const selectMachine = async () => {
  await userEvent.click(await screen.findByRole('button', { name: /gpu-01/ }));
};

describe('CreateContainer 代建门禁（container:manage 分类显示）', () => {
  beforeEach(() => {
    localStorage.setItem('currentUserName', 'operator1');
    localStorage.setItem('currentUserId', '1');
    getUserPermissions.mockReset();
    createContainer.mockClear();
    listMachinePermissions.mockClear();
    listImageBrefInformation.mockClear();
    getImageDetailInformation.mockClear();
  });

  it('普通用户（无 container:manage）不显示 ROOT 用户选择器', async () => {
    getUserPermissions.mockResolvedValue(['container:create', 'container:view']);
    render(<MemoryRouter><CreateContainer /></MemoryRouter>);

    await screen.findByText('选择镜像');
    await waitFor(() => expect(getUserPermissions).toHaveBeenCalled());
    expect(screen.queryByText('ROOT 用户')).not.toBeInTheDocument();
  });

  it('普通用户提交 payload 不带 owner_user_id（后端归一为自己）', async () => {
    getUserPermissions.mockResolvedValue(['container:create']);
    render(<MemoryRouter><CreateContainer /></MemoryRouter>);

    await screen.findByText('选择镜像');
    await waitFor(() => expect(getUserPermissions).toHaveBeenCalled());
    await selectImage();
    await selectMachine();
    await userEvent.click(screen.getByRole('button', { name: '创建容器' }));

    await waitFor(() => expect(createContainer).toHaveBeenCalled());
    expect(getImageDetailInformation).toHaveBeenCalledWith(7);
    const payload = createContainer.mock.calls[0][0];
    expect(payload.owner_user_id).toBeUndefined();
    expect(payload.image_id).toBe(7);
  });

  it('代建者显示 ROOT 用户选择器；未选机器时禁用，选机器后默认当前用户', async () => {
    getUserPermissions.mockResolvedValue(['container:create', 'container:manage']);
    render(<MemoryRouter><CreateContainer /></MemoryRouter>);

    await screen.findByText('选择镜像');
    expect(screen.getByText('ROOT 用户')).toBeInTheDocument();
    // 未选机器：选择器禁用
    expect(document.querySelector('#cc-owner')).toBeDisabled();

    await selectMachine();
    await waitFor(() => expect(listMachinePermissions).toHaveBeenCalledWith(1));
    // 选项来自机器已授权用户，默认当前用户
    expect(await screen.findByText('运维一号')).toBeInTheDocument();
  });

  it('代建者提交 payload 携带所选 owner_user_id', async () => {
    getUserPermissions.mockResolvedValue(['container:manage']);
    render(<MemoryRouter><CreateContainer /></MemoryRouter>);

    await screen.findByText('选择镜像');
    await selectImage();
    await selectMachine();
    await screen.findByText('运维一号');
    await userEvent.click(screen.getByRole('button', { name: '创建容器' }));

    await waitFor(() => expect(createContainer).toHaveBeenCalled());
    const payload = createContainer.mock.calls[0][0];
    expect(payload.owner_user_id).toBe(1);
  });
});
