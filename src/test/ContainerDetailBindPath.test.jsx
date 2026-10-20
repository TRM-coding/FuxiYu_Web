import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

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
  listAllContainerBrefInformation: vi.fn(),
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

const bindPathField = () => screen.getByText('宿主 bind 路径').closest('.detail-field');

let clipboardWrite;

beforeEach(() => {
  vi.clearAllMocks();
  clipboardWrite = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: clipboardWrite },
  });
  vi.stubGlobal('fetch', vi.fn());
  vi.spyOn(globalThis, 'setInterval').mockImplementation(() => 1);
  vi.spyOn(globalThis, 'clearInterval').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  getContainerDetailInformation.mockResolvedValue({ container_info: detail() });
  getContainerOperationLogs.mockResolvedValue({ logs: [] });
  listAllUserBrefInformation.mockResolvedValue({ users: [] });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ContainerDetailPage 宿主 bind 路径', () => {
  it('非空路径原样展示并复制完整值，不请求 Node/统计接口', async () => {
    const bindPath = '/home/alice/containers/train-a/with space/片段';
    getContainerDetailInformation.mockResolvedValue({
      container_info: detail({ bind_mount_path: bindPath }),
    });

    renderDetail();
    expect(await screen.findByText('train-a')).toBeInTheDocument();

    const field = bindPathField();
    expect(within(field).getByText(bindPath)).toBeInTheDocument();
    expect(within(field).getByText('最近记录，非实时核对')).toBeInTheDocument();

    fireEvent.click(within(field).getByRole('button', { name: bindPath }));
    expect(clipboardWrite).toHaveBeenCalledWith(bindPath);
    expect(clipboardWrite.mock.calls[0][0]).toBe(bindPath);

    // 详情只走既有详情接口；没有 Node 直连，也没有新增统计请求。
    expect(getContainerDetailInformation).toHaveBeenCalledTimes(1);
    expect(getContainerDetailInformation).toHaveBeenCalledWith(12);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ['null', null],
    ['空串', ''],
    ['旧 Ctrl 缺字段', undefined],
  ])('%s 显示未记录且没有复制候选', async (_label, value) => {
    const payload = detail();
    if (value !== undefined) payload.bind_mount_path = value;
    getContainerDetailInformation.mockResolvedValue({ container_info: payload });

    renderDetail();
    expect(await screen.findByText('train-a')).toBeInTheDocument();

    const field = bindPathField();
    expect(within(field).getByText('未记录')).toBeInTheDocument();
    expect(within(field).getByText('最近记录，非实时核对')).toBeInTheDocument();
    expect(field.querySelectorAll('button')).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('长路径完整展示、使用可换行复制块且不截断值', async () => {
    const bindPath = `/home/alice/containers/${'very-long-segment-'.repeat(20)}train-a`;
    getContainerDetailInformation.mockResolvedValue({
      container_info: detail({ bind_mount_path: bindPath }),
    });

    renderDetail();
    expect(await screen.findByText('train-a')).toBeInTheDocument();

    const field = bindPathField();
    const chip = within(field).getByRole('button', { name: bindPath });
    expect(chip).toHaveTextContent(bindPath);
    expect(chip).toHaveClass('bind-mount-path-chip');
    expect(field).toHaveClass('detail-field-bind-mount-path');
    expect(field.querySelector('.bind-mount-path-value')).not.toBeNull();
  });
});

describe('宿主 bind 路径样式审查', () => {
  it('长路径允许任意断行、不隐藏溢出，卡片占满整行', () => {
    const css = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/DetailPages.css'), 'utf8');
    expect(css).toMatch(/\.detail-field-bind-mount-path\s*\{[^}]*grid-column:\s*1 \/ -1/);
    expect(css).toMatch(/\.bind-mount-path-value \.bind-mount-path-chip\.fuxi-copy-chip\s*\{[^}]*white-space:\s*normal/);
    expect(css).toMatch(/\.bind-mount-path-value \.bind-mount-path-chip\.fuxi-copy-chip\s*\{[^}]*overflow-wrap:\s*anywhere/);
    expect(css).toMatch(/\.bind-mount-path-value \.bind-mount-path-chip\.fuxi-copy-chip\s*\{[^}]*overflow:\s*visible/);
    expect(css).toMatch(/\.bind-mount-path-value \.bind-mount-path-chip\.fuxi-copy-chip\s*\{[^}]*text-overflow:\s*clip/);
  });
});
