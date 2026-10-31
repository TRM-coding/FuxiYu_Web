import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PermissionProvider } from '../contexts/PermissionContext';

// antd message 在 jsdom 下会产生滚动条测量噪音，只保留组件实现、替换 message
vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal();
  return { ...antd, message: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } };
});

// 四台候选机器：正常 GPU 机 / 正常 CPU 机 / 已知 0 内存上限 / 共享上限未知
const MACHINE_BRIEFS = [
  { machine_id: 1, machine_name: 'gpu-01', machine_ip: '10.0.0.1', machine_type: 'GPU', machine_status: 'online' },
  { machine_id: 2, machine_name: 'cpu-01', machine_ip: '10.0.0.2', machine_type: 'CPU', machine_status: 'online' },
  { machine_id: 3, machine_name: 'zero-mem', machine_ip: '10.0.0.3', machine_type: 'GPU', machine_status: 'online' },
  { machine_id: 4, machine_name: 'unknown-shared', machine_ip: '10.0.0.4', machine_type: 'GPU', machine_status: 'online' },
];

const MACHINE_DETAILS = {
  1: {
    cpu_core_number: 32, memory_size_gb: 64, gpu_number: 4,
    max_cpu_core_number: 16, max_memory_gb: 32, max_gpu_number: 2, max_shared_gb: 16,
  },
  2: {
    cpu_core_number: 16, memory_size_gb: 8, gpu_number: 0,
    max_cpu_core_number: 8, max_memory_gb: 4, max_gpu_number: 0, max_shared_gb: 0,
  },
  3: {
    cpu_core_number: 8, memory_size_gb: 8, gpu_number: 0,
    max_cpu_core_number: 4, max_memory_gb: 0, max_gpu_number: 0, max_shared_gb: 0,
  },
  4: {
    cpu_core_number: 8, memory_size_gb: 32, gpu_number: 2,
    max_cpu_core_number: 4, max_memory_gb: 16, max_gpu_number: 1, max_shared_gb: null,
  },
};

vi.mock('../api/machine_api', () => ({
  listAllMachineBrefInformation: vi.fn(),
  getDetailInformation: vi.fn(),
  listMachinePermissions: vi.fn().mockResolvedValue({ user_ids: [1] }),
}));

vi.mock('../api/user_api', () => ({
  getUserPermissions: vi.fn(),
  listAllUserBrefInformation: vi.fn().mockResolvedValue({ users: [{ user_id: 1, username: 'operator1' }] }),
}));

vi.mock('../api/container_api', () => ({
  createContainer: vi.fn().mockResolvedValue({ success: 1 }),
}));

vi.mock('../api/image_api', () => ({
  listImageBrefInformation: vi.fn().mockResolvedValue({
    images: [{ image_id: 7, name: 'PyTorch 2.x + CUDA 12.1', base_image: 'ubuntu:22.04', status: 'ready' }],
  }),
}));

import { getUserPermissions } from '../api/user_api';
import { createContainer } from '../api/container_api';
import { getDetailInformation, listAllMachineBrefInformation } from '../api/machine_api';
import CreateContainer from '../pages/CreateContainer';

const quotaRow = (key) => {
  const row = document.querySelector(`[data-quota="${key}"]`);
  if (!row) throw new Error(`quota row ${key} not rendered`);
  return row;
};
const rowText = (key) => quotaRow(key).textContent;
const rowInput = (key) => within(quotaRow(key)).getByRole('spinbutton');
const rowSlider = (key) => within(quotaRow(key)).getByRole('slider');

/** 数字输入与滑条同口径：两者的 aria-valuemax 必须一致 */
const expectSameRange = (key) => {
  expect(rowSlider(key).getAttribute('aria-valuemax')).toBe(rowInput(key).getAttribute('aria-valuemax'));
};

/**
 * 数字输入分两步提交：先单独一个 act 输入文本，等受控值/内部输入态落定，
 * 再发可冒泡的 focusOut 触发真实 onBlur（rc-input-number 在这里提交并收敛到上限）。
 * 两步放在同一个 act 里时，onBlur 会读到还没刷新的旧输入态，等于没提交。
 */
const commitQuota = async (key, raw) => {
  const input = rowInput(key);
  await act(async () => {
    fireEvent.change(input, { target: { value: String(raw) } });
  });
  await waitFor(() => expect(rowInput(key).value).toBe(String(raw)));
  await act(async () => {
    fireEvent.focusOut(input);
  });
};

const selectMachine = async (name) => {
  await userEvent.click(await screen.findByRole('button', { name: new RegExp(name) }));
};

const selectImage = async () => {
  await userEvent.click(await screen.findByRole('button', { name: /PyTorch/ }));
};

const renderPage = async () => {
  render(<MemoryRouter><PermissionProvider><CreateContainer /></PermissionProvider></MemoryRouter>);
  await screen.findByText('选择镜像');
  await waitFor(() => expect(getUserPermissions).toHaveBeenCalled());
};

describe.sequential('CreateContainer 资源限额分层与共享内存联动', () => {
  beforeEach(() => {
    localStorage.setItem('currentUserName', 'operator1');
    localStorage.setItem('currentUserId', '1');
    getUserPermissions.mockReset();
    getUserPermissions.mockResolvedValue({ entities: ['container:create'], userId: 1, userName: 'operator1' });
    createContainer.mockClear();
    listAllMachineBrefInformation.mockReset();
    listAllMachineBrefInformation.mockResolvedValue({ machines: MACHINE_BRIEFS });
    getDetailInformation.mockReset();
    getDetailInformation.mockImplementation(async (id) => MACHINE_DETAILS[id]);
  });

  it('配额区同时写当前申请值、本次可申请上限、硬件容量与机器配置限额，并声明非实时空闲量', async () => {
    await renderPage();
    await selectMachine('gpu-01');

    expect(rowText('memory')).toContain('当前申请');
    expect(rowText('memory')).toMatch(/本次可申请上限\s*32 GB/);
    expect(rowText('memory')).toMatch(/硬件容量\s*64 GB/);
    expect(rowText('memory')).toMatch(/机器配置限额\s*32 GB/);
    expect(document.querySelector('.cc-quota-card').textContent).toContain('非实时空闲量');
  });

  it('共享内存本次可申请上限 = min(max_shared_gb, 本次申请内存)：mem 32 时为 16 GB，不再被 8 GB 限', async () => {
    await renderPage();
    await selectMachine('gpu-01');

    // 默认内存 1 GB → 共享上限压到 1 GB
    expect(rowText('shared')).toMatch(/本次可申请上限\s*1 GB/);

    await commitQuota('memory', 32);
    expect(rowText('memory')).toMatch(/当前申请\s*32 GB/);
    expect(rowText('shared')).toMatch(/本次可申请上限\s*16 GB/);
    expect(rowText('shared')).not.toContain('上限 8 GB');
    expectSameRange('shared');
    expect(rowSlider('shared').getAttribute('aria-valuemax')).toBe('16');
  });

  it('降低内存后重算并收敛已有共享值（32→4 时 shared 16→4）', async () => {
    await renderPage();
    await selectMachine('gpu-01');
    await commitQuota('memory', 32);
    await commitQuota('shared', 16);
    // 输入框显示值由 rc-input-number 的被动 effect 同步，等它落定
    await waitFor(() => expect(rowInput('shared').value).toBe('16'));
    // 配额区的「当前申请」是组件状态直出，用它确认值真的提交了
    expect(rowText('shared')).toMatch(/当前申请\s*16 GB/);

    await commitQuota('memory', 4);

    await waitFor(() => expect(rowInput('shared').value).toBe('4'));
    expect(rowText('shared')).toMatch(/本次可申请上限\s*4 GB/);
    expectSameRange('shared');
  });

  it('切换机器后四项配额按新机器重算（mem 4 / shared 0）', async () => {
    await renderPage();
    await selectMachine('gpu-01');
    await commitQuota('memory', 32);
    await commitQuota('shared', 16);

    await selectMachine('cpu-01');

    await waitFor(() => expect(rowInput('memory').value).toBe('4'));
    expect(rowInput('shared').value).toBe('0');
    expect(rowText('shared')).toMatch(/本次可申请上限\s*0 GB/);
    expect(rowInput('shared').getAttribute('aria-valuemax')).toBe('0');
  });

  it('共享内存上限为 0 时显示为已知的 0（不可分配），不显示为未知', async () => {
    await renderPage();
    await selectMachine('cpu-01');

    expect(rowText('shared')).toMatch(/本次可申请上限\s*0 GB/);
    expect(rowText('shared')).not.toMatch(/本次可申请上限\s*未知/);
    expect(rowText('shared')).toContain('本机该项不可分配');
  });

  it('共享内存上限未知（null）时显示未知并禁用控件，不伪装成无限', async () => {
    await renderPage();
    await selectMachine('unknown-shared');

    expect(rowText('shared')).toMatch(/本次可申请上限\s*未知/);
    expect(rowInput('shared')).toBeDisabled();
    expect(quotaRow('shared').querySelector('.ant-slider-disabled')).not.toBeNull();
  });

  it('内存上限为 0 而申请值为 1 GB 时阻止超限 payload 并给出数值说明', async () => {
    await renderPage();
    await selectImage();
    await selectMachine('zero-mem');
    await userEvent.type(screen.getByLabelText(/容器名/), 'blocked_container');

    await userEvent.click(screen.getByRole('button', { name: '创建容器' }));

    expect(createContainer).not.toHaveBeenCalled();
    const banner = document.querySelector('.cc-quota-error');
    expect(banner).not.toBeNull();
    expect(banner.textContent).toContain('内存 当前申请 1 GB，本次可申请上限 0 GB');
    // 该用例要走完整的镜像/机器选择与提交链路，28 worker 并发时单例耗时可能超过默认 5s；只放宽这一例
  }, 15000);

  it('在限额内的组合按同口径取小后提交（mem 32 / shared 16）', async () => {
    await renderPage();
    await selectImage();
    await selectMachine('gpu-01');
    await commitQuota('memory', 32);
    await commitQuota('shared', 16);
    await userEvent.type(screen.getByLabelText(/容器名/), 'ok_container');

    await userEvent.click(screen.getByRole('button', { name: '创建容器' }));

    await waitFor(() => expect(createContainer).toHaveBeenCalled());
    const payload = createContainer.mock.calls[0][0];
    expect(payload.machine_id).toBe(1);
    expect(payload.container.MEMORY).toBe(32);
    expect(payload.container.shared_memory).toBe(16);
    expect(payload.container.CPU_NUMBER).toBe(1);
    expect(document.querySelector('.cc-quota-error')).toBeNull();
  });
});