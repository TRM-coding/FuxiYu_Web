import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
import showErrorModal from '../utils/showErrorModal';
import MachineDetailPage from '../pages/MachineDetailPage';

// 硬件内存 64 GB；机器配置限额 内存 32 GB、共享内存 8 GB（旧实现把共享滑条钉死在 8）
const MACHINE = {
  machine_name: 'gpu-node-01',
  machine_ip: '10.0.0.9',
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

const limitBlock = (key) => {
  const el = document.querySelector(`[data-limit="${key}"]`);
  if (!el) throw new Error(`limit block ${key} not rendered`);
  return el;
};
const limitInput = (key) => within(limitBlock(key)).getByRole('spinbutton');
const limitSlider = (key) => within(limitBlock(key)).getByRole('slider');
const limitText = (key) => limitBlock(key).textContent;

/**
 * 数字输入分两步提交：先单独一个 act 输入文本，等受控值/内部输入态落定，
 * 再发可冒泡的 focusOut 触发真实 onBlur（rc-input-number 在这里提交并收敛到上限）。
 * 两步放在同一个 act 里时，onBlur 会读到还没刷新的旧输入态，等于没提交（16 仍显示 8）。
 */
const commitLimit = async (key, raw) => {
  const input = limitInput(key);
  await act(async () => {
    fireEvent.change(input, { target: { value: String(raw) } });
  });
  await waitFor(() => expect(limitInput(key).value).toBe(String(raw)));
  await act(async () => {
    fireEvent.focusOut(input);
  });
};

const renderPage = async () => {
  render(
    <MemoryRouter initialEntries={['/index/machines/7']}>
      <Routes>
        <Route path="/index/machines/:machineId" element={<MachineDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(await screen.findByText('gpu-node-01')).toBeInTheDocument();
};

describe.sequential('MachineDetailPage 共享内存限额编辑', () => {
  beforeEach(() => {
    getDetailInformation.mockReset();
    getDetailInformation.mockResolvedValue(MACHINE);
    getMachineStatus.mockReset();
    getMachineStatus.mockResolvedValue({ machine_status: 'online', is_maintenance: false });
    updateMachine.mockReset();
    updateMachine.mockResolvedValue({ success: 1 });
    showErrorModal.mockClear();
    vi.spyOn(globalThis, 'setInterval').mockImplementation((cb, delay) => {
      if (delay === 5000 && typeof cb === 'function') { /* 不真的轮询 */ }
      return 1;
    });
    vi.spyOn(globalThis, 'clearInterval').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('共享内存滑条上限取本次编辑的 max_memory_gb（32 GB），不再固定 8 GB', async () => {
    const user = userEvent.setup();
    await renderPage();

    // 硬件内存是 64 GB：共享上限必须来自本次编辑的 max_memory_gb=32，而不是硬件容量或固定 8
    await waitFor(() => expect(limitSlider('shared').getAttribute('aria-valuemax')).toBe('32'));
    expect(limitInput('shared').getAttribute('aria-valuemax')).toBe('32');
    expect(limitSlider('shared').getAttribute('aria-valuemax')).toBe(limitInput('shared').getAttribute('aria-valuemax'));
    expect(limitText('shared')).toContain('不得高于本次内存上限 32 GB');
    // 没有真的下调过时不应出现自动收敛提示
    expect(limitText('shared')).not.toContain('已将共享内存上限下调');

    // 16 GB 曾经被固定 max=8 挡住：现在可选、可提交
    await commitLimit('shared', 16);
    // 输入框显示值由 rc-input-number 的被动 effect 同步，等它落定
    await waitFor(() => expect(limitInput('shared').value).toBe('16'));
    // 标签是组件状态直出，用它确认值真的提交了
    expect(limitText('shared')).toContain('16 GB');

    await user.click(screen.getByRole('button', { name: /保\s*存/ }));
    await waitFor(() => expect(updateMachine).toHaveBeenCalled());
    const [machineId, fields] = updateMachine.mock.calls[0];
    expect(machineId).toBe(7);
    expect(fields.max_shared_gb).toBe(16);
    expect(fields.max_memory_gb).toBe(32);
  });

  it('降低内存上限时同步收敛已有共享值（32→4 时 shared 16→4），保存 payload 不超限', async () => {
    const user = userEvent.setup();
    await renderPage();
    await commitLimit('shared', 16);

    await commitLimit('memory', 4);

    await waitFor(() => expect(limitInput('memory').value).toBe('4'));
    await waitFor(() => expect(limitInput('shared').value).toBe('4'));
    expect(limitSlider('shared').getAttribute('aria-valuemax')).toBe('4');
    // 收敛对用户可见，不是悄悄改写值
    expect(limitText('shared')).toContain('已将共享内存上限下调到 4 GB');

    await user.click(screen.getByRole('button', { name: /保\s*存/ }));
    await waitFor(() => expect(updateMachine).toHaveBeenCalled());
    const fields = updateMachine.mock.calls[0][1];
    expect(fields.max_memory_gb).toBe(4);
    expect(fields.max_shared_gb).toBe(4);
    expect(fields.max_shared_gb).toBeLessThanOrEqual(fields.max_memory_gb);
  });

  it('四项限额都有与滑条同口径的数字输入，超上限输入收敛到同一上限', async () => {
    await renderPage();

    await waitFor(() => expect(limitSlider('memory').getAttribute('aria-valuemax')).toBe('64'));
    for (const key of ['cpu', 'memory', 'shared', 'disk']) {
      expect(limitSlider(key).getAttribute('aria-valuemax')).toBe(limitInput(key).getAttribute('aria-valuemax'));
    }
    expect(limitSlider('memory').getAttribute('aria-valuemax')).toBe('64');
    expect(limitSlider('cpu').getAttribute('aria-valuemax')).toBe('16');
    expect(limitSlider('shared').getAttribute('aria-valuemax')).toBe('32');

    await commitLimit('shared', 99);
    // 超上限输入先原样显示，blur 后收敛到上限 32
    await waitFor(() => expect(limitInput('shared').value).toBe('32'));
    expect(limitText('shared')).toContain('不得高于本次内存上限 32 GB');
    expect(limitText('shared')).toContain('硬件内存 64 GB');
  });

  it('保存被后端拒绝时把具体 message、状态与路由交给 showErrorModal', async () => {
    const user = userEvent.setup();
    // Ctrl 侧服务层组合校验失败走 update_failed + 422（见 Ctrl 变更 remove-shared-memory-hard-cap）
    const err = new Error('Update machine failed: 422');
    err.status = 422;
    err.route = 'https://host/api/machines/update_machine';
    err.body = {
      success: 0,
      message: 'max_shared_gb 16GB cannot exceed max_memory_gb 8GB',
      error_reason: 'update_failed',
    };
    updateMachine.mockRejectedValueOnce(err);
    await renderPage();
    await commitLimit('shared', 16);

    await user.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(showErrorModal).toHaveBeenCalled());
    expect(showErrorModal).toHaveBeenCalledWith(expect.objectContaining({
      message: err.body,
      status: 422,
      route: err.route,
    }));
  });
});