import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

const permissionState = vi.hoisted(() => ({
  entities: ['container:create', 'container:operation'],
  userId: 1,
  userName: 'operator1',
  containerResourceUnrestricted: false,
  loaded: true,
}));

vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal();
  return { ...antd, message: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } };
});
vi.mock('../contexts/PermissionContext', () => ({
  usePermission: () => ({
    ...permissionState,
    hasPermission: code => permissionState.entities.includes(code),
  }),
}));
vi.mock('../utils/showErrorModal', () => ({ default: vi.fn() }));
vi.mock('../api/machine_api', () => ({
  listAllMachineBrefInformation: vi.fn().mockResolvedValue({
    machines: [{ machine_id: 1, machine_name: 'gpu-01', machine_ip: '10.0.0.1', machine_type: 'GPU', machine_status: 'online' }],
  }),
  getDetailInformation: vi.fn().mockResolvedValue({
    cpu_core_number: 32, memory_size_gb: 128, gpu_number: 8,
    max_cpu_core_number: 32, max_memory_gb: 128, max_gpu_number: 8, max_shared_gb: 16,
  }),
  listMachinePermissions: vi.fn().mockResolvedValue({ user_ids: [1] }),
}));
vi.mock('../api/user_api', () => ({
  listAllUserBrefInformation: vi.fn().mockResolvedValue({ users: [{ user_id: 1, username: 'operator1', display_name: '运维一号' }] }),
}));
vi.mock('../api/image_api', () => ({
  listImageBrefInformation: vi.fn().mockResolvedValue({
    images: [{ image_id: 7, name: 'PyTorch 2.x', base_image: 'ubuntu', status: 'ready' }],
  }),
}));
vi.mock('../api/container_api', () => ({
  createContainer: vi.fn(),
}));

import { createContainer } from '../api/container_api';
import { message } from 'antd';
import showErrorModal from '../utils/showErrorModal';
import CreateContainer from '../pages/CreateContainer';

const LocationProbe = () => {
  const location = useLocation();
  return <span data-testid="location">{location.pathname}|{JSON.stringify(location.state || {})}</span>;
};

const renderPage = (entry = '/index/create') => render(
  <MemoryRouter initialEntries={[entry]}>
    <LocationProbe />
    <Routes>
      <Route path="/index/create" element={<CreateContainer />} />
      <Route path="/index" element={<div>home page</div>} />
    </Routes>
  </MemoryRouter>,
);

const submit = async () => {
  await screen.findByText('选择镜像');
  await userEvent.click(await screen.findByRole('button', { name: /PyTorch/ }));
  await userEvent.click(await screen.findByRole('button', { name: /gpu-01/ }));
  await userEvent.type(screen.getByLabelText(/容器名/), 'test_container');
  await userEvent.click(screen.getByRole('button', { name: '创建容器' }));
};

beforeEach(() => {
  vi.clearAllMocks();
  permissionState.entities = ['container:create', 'container:operation'];
});

describe('CreateContainer credential flow', () => {
  it('test_create_accepts_credentials_and_navigation shows modal before navigating and reuses one create path', async () => {
    createContainer.mockResolvedValue({
      success: 1,
      message: 'sent',
      accepted: true,
      credentials: [{ login_name: 'root', password: 'pw-root' }],
    });
    renderPage();
    await submit();
    await waitFor(() => expect(createContainer).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('重置后root的密码：')).toBeInTheDocument();
    expect(screen.getByTestId('location').textContent).toContain('/index/create');
    await userEvent.click(screen.getByRole('button', { name: /关\s*闭/ }));
    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument());
    expect(screen.getByTestId('location').textContent).toContain('startHeartbeat');
  });

  it('test_create_accepts_credentials_and_navigation keeps legacy success without a fake modal', async () => {
    createContainer.mockResolvedValue({ success: 1, message: 'sent' });
    renderPage();
    await submit();
    await waitFor(() => expect(screen.getByText('home page')).toBeInTheDocument());
    expect(screen.queryByText(/重置后/)).not.toBeInTheDocument();
  });

  it('test_create_accepts_credentials_and_navigation does not navigate or fake a password on malformed accepted response', async () => {
    createContainer.mockRejectedValue(Object.assign(new Error('凭据响应异常'), { status: 200 }));
    renderPage();
    await submit();
    await waitFor(() => expect(showErrorModal).toHaveBeenCalled());
    expect(screen.getByTestId('location').textContent).toContain('/index/create');
    expect(screen.queryByText(/重置后/)).not.toBeInTheDocument();
  });

  it('test_create_error_safe_message preserves safe quota message and never shows a password', async () => {
    createContainer.mockRejectedValue(Object.assign(
      new Error('Requested shared_memory 8GB cannot exceed memory 4GB'),
      { status: 400, route: '/api/containers/create_container', error_reason: 'invalid_config' },
    ));
    renderPage();
    await submit();
    await waitFor(() => expect(showErrorModal).toHaveBeenCalled());
    const args = showErrorModal.mock.calls.at(-1)[0];
    expect(args.message).toContain('8GB');
    expect(args.message).toContain('4GB');
    expect(JSON.stringify(args)).not.toContain('pw-');
    expect(message.success).not.toHaveBeenCalledWith(expect.stringContaining('pw-'));
  });
});
