import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Modal } from 'antd';

const antdMessage = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
  loading: vi.fn(),
}));

vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal();
  return { ...antd, message: antdMessage };
});

vi.mock('../api/user_api', () => ({
  getUserPermissions: vi.fn(),
  listAllUserBrefInformation: vi.fn(),
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  requestRegisterCode: vi.fn(),
}));

vi.mock('../api/machine_api', () => ({
  listAllMachineBrefInformation: vi.fn(),
  getDetailInformation: vi.fn(),
  listMachinePermissions: vi.fn(),
}));

vi.mock('../api/image_api', () => ({
  listImageBrefInformation: vi.fn(),
  getImageDetailInformation: vi.fn(),
  createImage: vi.fn(),
  updateImage: vi.fn(),
  deleteImage: vi.fn(),
  setImageValidRange: vi.fn(),
  setImageVisibleUsers: vi.fn(),
}));

vi.mock('../api/container_api', () => ({
  createContainer: vi.fn(),
  listDeletedContainers: vi.fn(),
  getDeletedContainerMountUsage: vi.fn(),
  resurrectDeletedContainer: vi.fn(),
  cleanDeletedContainerMount: vi.fn(),
}));

import { getUserPermissions, listAllUserBrefInformation } from '../api/user_api';
import {
  listAllMachineBrefInformation,
  getDetailInformation,
  listMachinePermissions,
} from '../api/machine_api';
import {
  listImageBrefInformation,
  getImageDetailInformation,
  createImage,
  deleteImage,
} from '../api/image_api';
import {
  createContainer,
  listDeletedContainers,
  getDeletedContainerMountUsage,
  resurrectDeletedContainer,
  cleanDeletedContainerMount,
} from '../api/container_api';
import { PermissionProvider } from '../contexts/PermissionContext';
import { parseCredentialResponse } from '../utils/credentialResponse';
import CreateContainer from '../pages/CreateContainer';
import CreateImage from '../pages/CreateImage';
import DeletedContainers from '../pages/DeletedContainers';
import AppRoutes from '../routes';

const READY_IMAGE = {
  image_id: 7,
  name: 'PyTorch 2.x',
  base_image: 'ubuntu:22.04',
  status: 'ready',
  description: 'GPU training image',
};

const GPU_MACHINE = {
  machine_id: 1,
  machine_name: 'gpu-01',
  machine_ip: '10.0.0.1',
  machine_type: 'GPU',
  machine_status: 'online',
};

const GPU_DETAIL = {
  cpu_core_number: 32,
  memory_size_gb: 64,
  gpu_number: 4,
  max_cpu_core_number: 16,
  max_memory_gb: 32,
  max_gpu_number: 4,
  max_shared_gb: 16,
};

const permissions = (overrides = {}) => ({
  entities: ['container:create', 'container:manage', 'container:operation'],
  userId: 1,
  userName: 'operator1',
  imageResourceUnrestricted: false,
  containerResourceUnrestricted: false,
  ...overrides,
});

const setViewport = (width) => {
  window.matchMedia = vi.fn().mockImplementation(query => ({
    matches: width <= 768 && String(query).includes('(max-width: 768px)'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  window.innerWidth = width;
};

const visibleModal = () => {
  const dialogs = Array.from(document.querySelectorAll('.ant-modal'))
    .filter(el => el.style.display !== 'none');
  return dialogs[dialogs.length - 1] || null;
};

const modalText = () => visibleModal()?.textContent || '';

const closeErrorModal = async () => {
  for (let i = 0; i < 4; i += 1) {
    const buttons = Array.from(document.querySelectorAll('.ant-modal button'))
      .filter(btn => (btn.textContent || '').replace(/\s/g, '') === '好的');
    if (!buttons.length) break;
    await act(async () => { buttons[buttons.length - 1].click(); });
  }
  await waitFor(() => {
    const visible = Array.from(document.querySelectorAll('.ant-modal'))
      .filter(el => el.style.display !== 'none');
    expect(visible).toHaveLength(0);
  });
};

const renderCreate = ({ entry = '/index/create', state, perms = permissions() } = {}) => {
  getUserPermissions.mockResolvedValue(perms);
  return render(
    <MemoryRouter initialEntries={[state ? { pathname: entry, state } : entry]}>
      <PermissionProvider>
        <Routes>
          <Route path="/index/create" element={<CreateContainer />} />
          <Route path="/index" element={<div>home page</div>} />
        </Routes>
      </PermissionProvider>
    </MemoryRouter>,
  );
};

const renderImage = (perms = permissions({ entities: ['image:view', 'image:edit', 'image:manage'] })) => {
  getUserPermissions.mockResolvedValue(perms);
  return render(
    <MemoryRouter>
      <PermissionProvider><CreateImage /></PermissionProvider>
    </MemoryRouter>,
  );
};

const selectImage = async (name = /PyTorch/) => {
  await userEvent.click(await screen.findByRole('button', { name }));
};

const selectMachine = async (name = /gpu-01/) => {
  await userEvent.click(await screen.findByRole('button', { name }));
};

const waitCreateReady = async () => {
  await screen.findByText('选择镜像');
  await screen.findByRole('button', { name: /PyTorch/ });
  await screen.findByRole('button', { name: /gpu-01/ });
};

const quotaRow = (key) => {
  const row = document.querySelector(`[data-quota="${key}"]`);
  if (!row) throw new Error(`quota row ${key} not rendered`);
  return row;
};
const rowText = (key) => quotaRow(key).textContent;
const rowInput = (key) => within(quotaRow(key)).getByRole('spinbutton');
const rowSlider = (key) => within(quotaRow(key)).getByRole('slider');

const record = (overrides = {}) => ({
  deleted_id: 7,
  original_container_id: 3,
  container_name: 'deleted-train',
  image_name: 'fuxi/image-1:20260825T090016Z',
  machine_name: 'gpu-a',
  machine_ip: '10.0.0.8',
  mount_path: '/home/alice/containers/deleted-train',
  mount_cleanup_id: 11,
  removed_at: '2026-09-01T10:00:00',
  removed_trigger: 'api',
  mount_cleaned: false,
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
  ...overrides,
});

const listResponse = (records, overrides = {}) => ({
  success: 1,
  records,
  total_number: records.length,
  total_page: 1,
  ...overrides,
});

const usageSuccess = (id, bytes = 1024, measuredAt = '2026-10-18T03:04:05Z') => ({
  deleted_id: id,
  bytes,
  measured_at: measuredAt,
  pending: false,
  error: null,
});

const usagePending = id => ({
  deleted_id: id,
  bytes: null,
  measured_at: null,
  pending: true,
  error: null,
});

const renderDeleted = () => {
  getUserPermissions.mockResolvedValue(permissions({ entities: ['container:manage'] }));
  return render(
    <MemoryRouter>
      <PermissionProvider><DeletedContainers /></PermissionProvider>
    </MemoryRouter>,
  );
};

const cardOf = name => screen.getByText(name).closest('.app-table-mobile-card');
const rowOf = name => screen.getByText(name).closest('tr');
const containerOf = name => screen.getByText(name).closest('tr, .app-table-mobile-card');

const pad2 = value => String(value).padStart(2, '0');
const expectedShortTime = value => {
  const date = new Date(value);
  return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};
const expectedFullTime = value => new Date(value).toLocaleString('zh-CN', { hour12: false });

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

const openRestore = async (name = 'deleted-train') => {
  const row = containerOf(name);
  await userEvent.click(within(row).getByRole('button', { name: /恢复/ }));
  await screen.findByText('恢复会复用保留的 mount 目录，并重新创建容器与用户绑定。');
};

const confirmRestore = async (name = 'deleted-train') => {
  await openRestore(name);
  const buttons = screen.getAllByRole('button', { name: /恢\s*复/ });
  await userEvent.click(buttons[buttons.length - 1]);
};

const openClean = async (name = 'deleted-train') => {
  const row = containerOf(name);
  await userEvent.click(within(row).getByRole('button', { name: /清理 mount/ }));
  await screen.findByText('清理后原目录数据不可再用于恢复。');
};

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

const submitCreate = async (name = 'test_container') => {
  await userEvent.type(screen.getByLabelText(/容器名/), name);
  await userEvent.click(screen.getByRole('button', { name: '创建容器' }));
};

beforeEach(() => {
  vi.resetAllMocks();
  setViewport(1024);
  localStorage.clear();
  sessionStorage.clear();
  antdMessage.success.mockReset();
  antdMessage.warning.mockReset();
  antdMessage.error.mockReset();
  getUserPermissions.mockResolvedValue(permissions());
  listAllMachineBrefInformation.mockResolvedValue({ machines: [GPU_MACHINE] });
  getDetailInformation.mockResolvedValue(GPU_DETAIL);
  listMachinePermissions.mockResolvedValue({ user_ids: [1] });
  listAllUserBrefInformation.mockResolvedValue({
    users: [{ user_id: 1, username: 'operator1', display_name: '运维一号' }],
  });
  listImageBrefInformation.mockResolvedValue({ images: [READY_IMAGE] });
  getImageDetailInformation.mockResolvedValue({
    image: {
      image_id: 9,
      name: 'jenkins',
      status: 'ready',
      base_image: 'jenkins/jenkins:2.516.2',
      dockerfile_body: 'RUN echo hi\n',
      entrypoint: 'tail -f /dev/null',
      valid_range: 'custom',
      created_by_user_id: 3,
    },
  });
  createContainer.mockResolvedValue({ success: 1 });
  createImage.mockResolvedValue({ image_id: 42 });
  deleteImage.mockResolvedValue({ success: 1 });
  listDeletedContainers.mockResolvedValue({
    success: 1, records: [], total_number: 0, total_page: 1,
  });
  getDeletedContainerMountUsage.mockResolvedValue({ success: 1, usages: [] });
  resurrectDeletedContainer.mockResolvedValue({ success: 1, container_id: 19 });
  cleanDeletedContainerMount.mockResolvedValue({ success: 1 });
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

afterEach(async () => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  await act(async () => {});
});

describe('AnvilCreateDeleted mappings', () => {
  it('test_create_entry_route_mounts_page_and_keeps_identity_snapshot', async () => {
    getUserPermissions.mockResolvedValue(permissions({ entities: ['container:create'] }));
    render(
      <MemoryRouter initialEntries={['/index/create']}>
        <PermissionProvider><AppRoutes /></PermissionProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText('选择镜像', {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.queryByText('ROOT 用户')).not.toBeInTheDocument();
    await waitFor(() => expect(getUserPermissions).toHaveBeenCalledTimes(1));
  });

  it('test_create_template_ready_filter_and_stale_selection_cleared', async () => {
    listImageBrefInformation
      .mockResolvedValueOnce({
        images: [
          { ...READY_IMAGE, image_id: 7, name: 'ready-one', status: 'ready' },
          { ...READY_IMAGE, image_id: 8, name: 'draft-one', status: 'draft' },
          { ...READY_IMAGE, image_id: 9, name: 'disabled-one', status: 'disabled' },
        ],
      })
      .mockResolvedValueOnce({ images: [{ ...READY_IMAGE, image_id: 10, name: 'other-ready', status: 'ready' }] });
    renderCreate();
    await screen.findByText('选择镜像');
    await screen.findByRole('button', { name: /ready-one/ });
    expect(screen.queryByText('draft-one')).not.toBeInTheDocument();
    expect(screen.queryByText('disabled-one')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /ready-one/ }));
    expect(document.querySelector('.cc-image-card.is-selected')?.textContent).toContain('ready-one');
    await userEvent.type(screen.getByPlaceholderText('搜索镜像'), 'x');
    await waitFor(() => expect(listImageBrefInformation).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(document.querySelector('.cc-image-card.is-selected')).toBeNull());
  });

  it('test_create_shared_memory_converges_and_payload_never_exceeds_memory', async () => {
    getDetailInformation.mockResolvedValue({ ...GPU_DETAIL, max_memory_gb: 32, max_shared_gb: 16 });
    renderCreate();
    await waitCreateReady();
    await selectImage();
    await selectMachine();
    await commitQuota('memory', 32);
    await commitQuota('shared', 8);
    await commitQuota('memory', 4);
    await waitFor(() => expect(rowInput('shared').value).toBe('4'));
    await submitCreate();
    await waitFor(() => expect(createContainer).toHaveBeenCalled());
    const payload = createContainer.mock.calls[0][0];
    expect(payload.container.MEMORY).toBe(4);
    expect(payload.container.shared_memory).toBeLessThanOrEqual(payload.container.MEMORY);
  });

  it('test_create_shared_memory_clamps_and_never_emits_overlimit_payload', async () => {
    getDetailInformation.mockResolvedValue({ ...GPU_DETAIL, max_memory_gb: 32, max_shared_gb: 16 });
    renderCreate();
    await waitCreateReady();
    await selectImage();
    await selectMachine();
    await commitQuota('memory', 16);
    await commitQuota('shared', 16);
    await commitQuota('memory', 2);
    await waitFor(() => expect(rowInput('shared').value).toBe('2'));
    await submitCreate();
    await waitFor(() => expect(createContainer).toHaveBeenCalled());
    const payload = createContainer.mock.calls[0][0];
    expect(payload.container.shared_memory).toBeLessThanOrEqual(payload.container.MEMORY);
    expect(payload.container.MEMORY).toBe(2);
  });

  it('test_create_payload_uses_gpu_list_and_detail_limits', async () => {
    getDetailInformation.mockResolvedValue({ ...GPU_DETAIL, max_cpu_core_number: 8, max_memory_gb: 16, max_shared_gb: 8 });
    renderCreate();
    await waitCreateReady();
    await selectImage();
    await selectMachine();
    await commitQuota('gpu', 3);
    await commitQuota('cpu', 2);
    await commitQuota('memory', 8);
    await commitQuota('shared', 4);
    await submitCreate();
    await waitFor(() => expect(createContainer).toHaveBeenCalled());
    const payload = createContainer.mock.calls[0][0];
    expect(payload.machine_id).toBe(1);
    expect(payload.image_id).toBe(7);
    expect(payload.container.GPU_LIST).toEqual([0, 1, 2]);
    expect(payload.container.CPU_NUMBER).toBe(2);
    expect(payload.container.MEMORY).toBe(8);
    expect(payload.container.shared_memory).toBe(4);
  });

  it('test_create_all_quota_rows_show_current_limit_and_layer_labels', async () => {
    renderCreate();
    await waitCreateReady();
    await selectMachine();
    for (const key of ['gpu', 'cpu', 'memory', 'shared']) {
      expect(rowText(key)).toContain('当前申请');
      expect(rowText(key)).toContain('本次可申请上限');
      expect(rowText(key)).toContain('硬件容量');
      expect(rowText(key)).toContain('机器配置限额');
    }
    expect(document.querySelector('.cc-quota-card')?.textContent).toContain('非实时空闲量');
  });

  it('test_create_all_quota_inputs_share_slider_range', async () => {
    renderCreate();
    await waitCreateReady();
    await selectMachine();
    for (const key of ['gpu', 'cpu', 'memory', 'shared']) {
      expect(rowSlider(key).getAttribute('aria-valuemax')).toBe(rowInput(key).getAttribute('aria-valuemax'));
      expect(rowSlider(key).getAttribute('aria-valuemin')).toBe(rowInput(key).getAttribute('aria-valuemin'));
    }
  });

  it('test_create_accepted_keeps_existing_success_feedback', async () => {
    createContainer.mockResolvedValue({
      success: 1,
      accepted: true,
      message: 'sent',
      credentials: [{ login_name: 'root', password: 'pw-root' }],
    });
    renderCreate();
    await waitCreateReady();
    await selectImage();
    await selectMachine();
    await submitCreate();
    expect(await screen.findByText('重置后root的密码：')).toBeInTheDocument();
    expect(antdMessage.success).toHaveBeenCalledWith('容器创建请求已发送');
    await userEvent.click(screen.getByRole('button', { name: /关\s*闭/ }));
  });

  it('test_create_accepted_emits_no_extra_write_requests', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    createContainer.mockResolvedValue({
      success: 1,
      accepted: true,
      credentials: [{ login_name: 'root', password: 'pw-root' }],
    });
    renderCreate();
    await waitCreateReady();
    await selectImage();
    await selectMachine();
    await submitCreate();
    expect(await screen.findByText('重置后root的密码：')).toBeInTheDocument();
    expect(createContainer).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(resurrectDeletedContainer).not.toHaveBeenCalled();
    expect(cleanDeletedContainerMount).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /关\s*闭/ }));
  });

  it('test_create_machine_entry_preselects_and_uses_credential_modal', async () => {
    createContainer.mockResolvedValue({
      success: 1,
      accepted: true,
      credentials: [{ login_name: 'root', password: 'pw-root' }],
    });
    renderCreate({ state: { machineId: 1 } });
    await waitCreateReady();
    await waitFor(() => expect(document.querySelector('.cc-machine-card.is-selected')).not.toBeNull());
    await selectImage();
    await submitCreate();
    expect(await screen.findByText('重置后root的密码：')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /关\s*闭/ }));
  });

  it('test_create_password_clears_on_escape_or_route_leave', async () => {
    createContainer.mockResolvedValue({
      success: 1,
      accepted: true,
      credentials: [{ login_name: 'root', password: 'pw-root' }],
    });
    const view = renderCreate();
    await waitCreateReady();
    await selectImage();
    await selectMachine();
    await submitCreate();
    expect(await screen.findByText('重置后root的密码：')).toBeInTheDocument();
    view.unmount();
    renderCreate();
    await waitCreateReady();
    expect(screen.queryByText('重置后root的密码：')).not.toBeInTheDocument();
  });

  it('test_create_legacy_success_keeps_existing_success_message', async () => {
    createContainer.mockResolvedValue({ success: 1, message: 'sent' });
    renderCreate();
    await waitCreateReady();
    await selectImage();
    await selectMachine();
    await submitCreate();
    await waitFor(() => expect(antdMessage.success).toHaveBeenCalledWith('容器创建请求已发送'));
    expect(screen.queryByText(/重置后/)).not.toBeInTheDocument();
    expect(await screen.findByText('home page')).toBeInTheDocument();
  });

  it('test_create_credential_envelope_rejects_missing_or_non_array_credentials', async () => {
    expect(() => parseCredentialResponse({ accepted: true }, { expectedCount: 1 })).toThrow();
    expect(() => parseCredentialResponse({ accepted: true, credentials: {} }, { expectedCount: 1 })).toThrow();
    expect(parseCredentialResponse({
      accepted: true,
      credentials: [{ login_name: 'root', password: 'pw' }],
    }, { expectedCount: 1 }).credentials).toHaveLength(1);
  });

  it('test_create_malformed_accepted_shows_generic_response_error', async () => {
    createContainer.mockRejectedValue(Object.assign(
      new Error('凭据响应异常，请稍后重试'),
      { status: 200 },
    ));
    renderCreate();
    await waitCreateReady();
    await selectImage();
    await selectMachine();
    await submitCreate();
    await waitFor(() => expect(modalText()).toContain('凭据响应异常'));
    expect(modalText()).not.toContain('pw-');
    expect(screen.getByText('选择镜像')).toBeInTheDocument();
    await closeErrorModal();
  });

  it('test_create_error_does_not_log_secret_or_raw_body', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    createContainer.mockRejectedValue(Object.assign(
      new Error('创建失败'),
      {
        status: 500,
        body: { credentials: [{ password: 'secret-pw' }], root_password: 'secret-pw' },
      },
    ));
    renderCreate();
    await waitCreateReady();
    await selectImage();
    await selectMachine();
    await submitCreate();
    await waitFor(() => expect(modalText()).toContain('创建失败'));
    expect(modalText()).not.toContain('secret-pw');
    for (const spy of [errorSpy, warnSpy, logSpy]) {
      for (const call of spy.mock.calls) {
        expect(JSON.stringify(call)).not.toContain('secret-pw');
      }
    }
    await closeErrorModal();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('test_create_403_keeps_identity_and_shows_denial', async () => {
    createContainer.mockRejectedValue(Object.assign(
      new Error('forbidden'),
      { status: 403, error_reason: 'insufficient_permission' },
    ));
    renderCreate();
    await waitCreateReady();
    await selectImage();
    await selectMachine();
    await screen.getByLabelText(/容器名/);
    await userEvent.type(screen.getByLabelText(/容器名/), 'kept_name');
    await userEvent.click(screen.getByRole('button', { name: '创建容器' }));
    await waitFor(() => expect(modalText()).toContain('权限不足'));
    expect(screen.getByText('选择镜像')).toBeInTheDocument();
    expect(screen.getByLabelText(/容器名/)).toHaveValue('kept_name');
    await closeErrorModal();
  });

  it('test_image_entry_route_and_identity_snapshot', async () => {
    getUserPermissions.mockResolvedValue(permissions({ entities: ['image:view', 'image:edit'], userId: 3, userName: 'editor' }));
    render(
      <MemoryRouter initialEntries={['/index/images']}>
        <PermissionProvider><AppRoutes /></PermissionProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Dockerfile 环境定义', {}, { timeout: 20000 })).toBeInTheDocument();
    await waitFor(() => expect(listImageBrefInformation).toHaveBeenCalledWith(
      expect.objectContaining({ mine_only: true }),
    ), { timeout: 10000 });
    expect(getUserPermissions).toHaveBeenCalledTimes(1);
  }, 30000);

  it('test_image_create_payload_includes_actual_create_fields', async () => {
    listImageBrefInformation.mockResolvedValue({ images: [] });
    getImageDetailInformation.mockResolvedValue({
      image: {
        image_id: 42,
        name: 'new-template',
        status: 'draft',
        base_image: 'ubuntu:24.04',
        dockerfile_body: 'RUN echo ok\n',
        entrypoint: '',
        valid_range: 'custom',
        created_by_user_id: 1,
      },
    });
    renderImage();
    await screen.findByText('环境模板');
    await userEvent.click(screen.getByRole('button', { name: /新建/ }));
    const nameInput = screen.getByText('模板名称').closest('label').querySelector('input');
    await userEvent.type(nameInput, 'new-template');
    const desc = screen.getByText('描述').closest('label').querySelector('textarea');
    await userEvent.type(desc, 'desc');
    const base = screen.getByPlaceholderText('ubuntu:22.04');
    await userEvent.clear(base);
    await userEvent.type(base, 'ubuntu:24.04');
    const body = screen.getByPlaceholderText(/WORKDIR \/workspace/);
    await userEvent.type(body, 'RUN echo ok');
    const entry = screen.getByPlaceholderText('留空 = 平台默认（保持容器存活）');
    await userEvent.type(entry, 'bash');
    await userEvent.click(screen.getByRole('button', { name: /保存/ }));
    await waitFor(() => expect(createImage).toHaveBeenCalled());
    expect(createImage).toHaveBeenCalledWith({
      name: 'new-template',
      description: 'desc',
      status: 'draft',
      base_image: 'ubuntu:24.04',
      dockerfile_body: 'RUN echo ok',
      entrypoint: 'bash',
    });
    expect(createImage.mock.calls[0][0]).not.toHaveProperty('visible_user_ids');
    expect(createImage.mock.calls[0][0]).not.toHaveProperty('valid_range');
  });

  it('test_image_delete_calls_delete_and_reloads_list', async () => {
    listImageBrefInformation
      .mockResolvedValueOnce({ images: [{ image_id: 9, name: 'jenkins', status: 'ready' }] })
      .mockResolvedValue({ images: [] });
    renderImage();
    await screen.findByText('环境模板');
    await waitFor(() => expect(screen.getByDisplayValue('jenkins')).toBeInTheDocument());
    const deleteButton = screen.getByRole('button', { name: /删除/ });
    const confirmSpy = vi.spyOn(Modal, 'confirm');
    fireEvent.click(deleteButton);
    await waitFor(() => expect(confirmSpy).toHaveBeenCalled());
    const confirmConfig = confirmSpy.mock.calls[0][0];
    expect(confirmConfig.title).toBe('删除环境模板');
    expect(String(confirmConfig.content)).toContain('确认删除');
    await act(async () => { await confirmConfig.onOk(); });
    await waitFor(() => expect(deleteImage).toHaveBeenCalledWith(9));
    await waitFor(() => expect(listImageBrefInformation.mock.calls.length).toBeGreaterThanOrEqual(2));
  });

  it('test_deleted_entry_route_identity_and_row_key', async () => {
    listDeletedContainers.mockResolvedValue(listResponse([record()]));
    getUserPermissions.mockResolvedValue(permissions({ entities: ['container:manage'] }));
    render(
      <MemoryRouter initialEntries={['/admin/deleted-containers']}>
        <PermissionProvider><AppRoutes /></PermissionProvider>
      </MemoryRouter>,
    );
    expect(await screen.findByText('deleted-train', {}, { timeout: 20000 })).toBeInTheDocument();
    expect(document.querySelector('[data-row-key="7"]')).not.toBeNull();
    expect(screen.getAllByText('已删除容器').length).toBeGreaterThan(0);
  }, 30000);

  it('test_deleted_mount_status_preserved_escalated_and_cleaned', async () => {
    listDeletedContainers.mockResolvedValue(listResponse([
      record({ deleted_id: 1, container_name: 'keep', cleanup_escalation: false }),
      record({ deleted_id: 2, container_name: 'escalated', cleanup_escalation: true }),
      record({ deleted_id: 3, container_name: 'cleaned', mount_cleaned: true }),
      record({ deleted_id: 4, container_name: 'no-mount', mount_path: '' }),
    ]));
    renderDeleted();
    expect(await screen.findByText('keep')).toBeInTheDocument();
    expect(within(rowOf('keep')).getAllByText('mount 保留').length).toBeGreaterThan(0);
    expect(within(rowOf('escalated')).getAllByText('升级清理').length).toBeGreaterThan(0);
    expect(within(rowOf('cleaned')).getAllByText('已清理').length).toBeGreaterThan(0);
    expect(within(rowOf('no-mount')).getAllByText('无挂载').length).toBeGreaterThan(0);
  });

  it('test_deleted_same_page_refresh_keeps_page_and_size', async () => {
    const row1 = record({ deleted_id: 1, container_name: 'page-one' });
    const row2 = record({ deleted_id: 2, container_name: 'page-two' });
    listDeletedContainers.mockImplementation(async ({ page_number }) => (
      page_number === 2
        ? listResponse([row2], { total_number: 21, total_page: 2 })
        : listResponse([row1], { total_number: 21, total_page: 2 })
    ));
    renderDeleted();
    expect(await screen.findByText('page-one')).toBeInTheDocument();
    await userEvent.click(document.querySelector('.ant-pagination-item-2 a'));
    expect(await screen.findByText('page-two')).toBeInTheDocument();
    await confirmRestore('page-two');
    await waitFor(() => {
      const last = listDeletedContainers.mock.calls.at(-1)[0];
      expect(last.page_number).toBe(2);
      expect(last.page_size).toBe(20);
    });
    expect(screen.getByText('page-two')).toBeInTheDocument();
    expect(screen.queryByText('page-one')).toBeNull();
  });

  it('test_deleted_last_page_fallback_is_bounded_and_not_duplicated', async () => {
    let restored = false;
    listDeletedContainers.mockImplementation(async ({ page_number }) => {
      const total_number = restored ? 40 : 41;
      const total_page = restored ? 2 : 3;
      if (page_number === 3) {
        return listResponse(restored ? [] : [record({ deleted_id: 3, container_name: 'page-three' })], { total_number, total_page });
      }
      if (page_number === 2) return listResponse([record({ deleted_id: 2, container_name: 'page-two' })], { total_number, total_page });
      return listResponse([record({ deleted_id: 1, container_name: 'page-one' })], { total_number, total_page });
    });
    resurrectDeletedContainer.mockImplementation(async () => {
      restored = true;
      return { success: 1, container_id: 99 };
    });
    renderDeleted();
    expect(await screen.findByText('page-one')).toBeInTheDocument();
    await userEvent.click(document.querySelector('.ant-pagination-item-3 a'));
    expect(await screen.findByText('page-three')).toBeInTheDocument();
    await confirmRestore('page-three');
    expect(await screen.findByText('page-two')).toBeInTheDocument();
    const pages = listDeletedContainers.mock.calls.map(call => call[0].page_number);
    expect(pages.filter(p => p === 3)).toHaveLength(2);
    expect(pages.filter(p => p === 2)).toHaveLength(1);
    expect(pages.filter(p => p === 1)).toHaveLength(1);
    expect(pages).toHaveLength(4);
  });

  it('test_deleted_requires_choice_template_resubmits_with_template', async () => {
    listDeletedContainers.mockResolvedValue(listResponse([record()]));
    resurrectDeletedContainer
      .mockResolvedValueOnce({
        success: 1,
        requires_choice: true,
        snapshot: { dockerfile: 'FROM ubuntu:22.04\n' },
        template: { dockerfile: 'FROM ubuntu:24.04\n' },
        sections: [{ name: 'base_image', changed: true }],
      })
      .mockResolvedValueOnce({ success: 1, container_id: 19 });
    renderDeleted();
    expect(await screen.findByText('deleted-train')).toBeInTheDocument();
    await confirmRestore();
    expect(await screen.findByText('恢复内容与删除前不同')).toBeInTheDocument();
    await userEvent.click(screen.getByText('按当前模板恢复'));
    await userEvent.click(screen.getByRole('button', { name: '按所选内容恢复' }));
    await waitFor(() => expect(resurrectDeletedContainer).toHaveBeenLastCalledWith(7, 'template'));
  });

  it('test_deleted_mobile_confirm_clean_and_restore', async () => {
    setViewport(390);
    listDeletedContainers.mockResolvedValue(listResponse([record()]));
    renderDeleted();
    expect(await screen.findByText('deleted-train')).toBeInTheDocument();
    await openRestore();
    const cancelButtons = screen.getAllByRole('button', { name: /取\s*消/ });
    await userEvent.click(cancelButtons.at(-1));
    expect(resurrectDeletedContainer).not.toHaveBeenCalled();
    await confirmRestore();
    await waitFor(() => expect(resurrectDeletedContainer).toHaveBeenCalledWith(7, null));
    resurrectDeletedContainer.mockClear();
    await openClean();
    const cleanButtons = screen.getAllByRole('button', { name: /^清\s*理$/ });
    await userEvent.click(cleanButtons.at(-1));
    await waitFor(() => expect(cleanDeletedContainerMount).toHaveBeenCalledWith(11));
    await waitFor(() => expect(listDeletedContainers.mock.calls.length).toBeGreaterThanOrEqual(2));
  }, 15000);

  it('test_deleted_mobile_pending_page_switch_aborts_and_discards', async () => {
    setViewport(390);
    const firstUsage = deferred();
    listDeletedContainers.mockImplementation(async ({ page_number }) => (
      page_number === 2
        ? listResponse([record({ deleted_id: 22, container_name: 'page-two' })], { total_number: 21, total_page: 2 })
        : listResponse([record({ deleted_id: 1, container_name: 'page-one' })], { total_number: 21, total_page: 2 })
    ));
    getDeletedContainerMountUsage.mockImplementation(ids => (
      ids.includes(1)
        ? firstUsage.promise
        : Promise.resolve({ success: 1, usages: [usageSuccess(22, 2048)] })
    ));
    renderDeleted();
    expect(await screen.findByText('page-one')).toBeInTheDocument();
    await waitFor(() => expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(1));
    const signal = getDeletedContainerMountUsage.mock.calls[0][1].signal;
    await userEvent.click(document.querySelector('.ant-pagination-item-2'));
    expect(await screen.findByText('page-two')).toBeInTheDocument();
    await waitFor(() => expect(signal.aborted).toBe(true));
    await act(async () => {
      firstUsage.resolve({ success: 1, usages: [usageSuccess(1, 10 * 1024 * 1024)] });
      await Promise.resolve();
    });
    expect(screen.queryByText('10 MiB')).toBeNull();
    expect(screen.getByText('page-two')).toBeInTheDocument();
    await waitFor(() => expect(getDeletedContainerMountUsage).toHaveBeenLastCalledWith([22], expect.anything()));
  });

  it('test_deleted_mobile_last_page_reduction_falls_back_to_valid_page', async () => {
    setViewport(390);
    let restored = false;
    listDeletedContainers.mockImplementation(async ({ page_number }) => {
      const total_number = restored ? 40 : 41;
      const total_page = restored ? 2 : 3;
      if (page_number === 3) {
        return listResponse(restored ? [] : [record({ deleted_id: 3, container_name: 'page-three' })], { total_number, total_page });
      }
      if (page_number === 2) return listResponse([record({ deleted_id: 2, container_name: 'page-two' })], { total_number, total_page });
      return listResponse([record({ deleted_id: 1, container_name: 'page-one' })], { total_number, total_page });
    });
    resurrectDeletedContainer.mockImplementation(async () => {
      restored = true;
      return { success: 1, container_id: 99 };
    });
    renderDeleted();
    expect(await screen.findByText('page-one')).toBeInTheDocument();
    await userEvent.click(document.querySelector('.ant-pagination-item-3'));
    expect(await screen.findByText('page-three')).toBeInTheDocument();
    await confirmRestore('page-three');
    expect(await screen.findByText('page-two')).toBeInTheDocument();
    await waitFor(() => expect(listDeletedContainers.mock.calls.at(-1)[0].page_number).toBe(2));
  });

  it('test_deleted_long_poll_manual_refresh', async () => {
    vi.useFakeTimers();
    listDeletedContainers.mockResolvedValue(listResponse([record()]));
    getDeletedContainerMountUsage.mockResolvedValue({ success: 1, usages: [usagePending(7)] });
    renderDeleted();
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(1);
    await act(async () => {
      for (let tick = 1; tick <= 120; tick += 1) {
        await vi.advanceTimersByTimeAsync(5000);
      }
    });
    expect(screen.queryByText('测量未完成')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /刷新/ }));
    await act(async () => { await vi.advanceTimersByTimeAsync(0); });
    expect(listDeletedContainers).toHaveBeenCalledTimes(2);
    expect(getDeletedContainerMountUsage.mock.calls.length).toBeGreaterThan(121);
  }, 30000);

  it('test_deleted_mobile_390_card_values', async () => {
    setViewport(390);
    const removedAt = '2026-09-01T10:00:00';
    listDeletedContainers.mockResolvedValue(listResponse([record({ removed_at: removedAt })]));
    getDeletedContainerMountUsage.mockResolvedValue({ success: 1, usages: [usageSuccess(7, 1536)] });
    renderDeleted();
    expect(await screen.findByText('1.5 KiB')).toBeInTheDocument();
    const card = cardOf('deleted-train');
    expect(card.textContent).toContain('ID 3');
    expect(card.textContent).toContain('gpu-a');
    expect(card.textContent).toContain('10.0.0.8');
    expect(card.textContent).toContain('/home/alice/containers/deleted-train');
    expect(card.textContent).toContain(expectedFullTime(`${removedAt}Z`));
    expect(card.textContent).toContain('mount 保留');
    expect(within(card).getByRole('button', { name: /恢复/ })).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: /清理 mount/ })).toBeInTheDocument();
  });

  it('test_deleted_mobile_390_expand_resource_port_and_deletion_source', async () => {
    setViewport(390);
    listDeletedContainers.mockResolvedValue(listResponse([record()]));
    renderDeleted();
    expect(await screen.findByText('deleted-train')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '展开详情' }));
    const card = cardOf('deleted-train');
    expect(card.textContent).toContain('资源');
    expect(card.textContent).toContain('CPU 2 / 内存 4G / GPU 1 / 共享 1G');
    expect(card.textContent).toContain('端口');
    expect(card.textContent).toContain('1024');
    expect(card.textContent).toContain('删除来源');
    expect(card.textContent).toContain('api');
  });

  it('test_deleted_mobile_390_loading_covers_path_records_and_keeps_non_success_unmeasured', async () => {
    setViewport(390);
    const batch = deferred();
    listDeletedContainers.mockResolvedValue(listResponse([
      record({ deleted_id: 1, container_name: 'measurable', mount_path: '/m/1' }),
      record({ deleted_id: 2, container_name: 'cleaned', mount_path: '/m/2', mount_cleaned: true }),
      record({ deleted_id: 3, container_name: 'no-mount', mount_path: '' }),
    ]));
    getDeletedContainerMountUsage.mockReturnValue(batch.promise);
    renderDeleted();
    expect((await screen.findAllByText('读取统计中')).length).toBeGreaterThanOrEqual(2);
    const measurable = cardOf('measurable');
    expect(within(measurable).queryByRole('progressbar')).toBeNull();
    expect(within(measurable).queryByText('0 B')).toBeNull();
    expect(within(measurable).queryByText(/^测量 /)).toBeNull();
    expect(within(cardOf('no-mount')).getAllByText('无挂载').length).toBeGreaterThan(0);
    await act(async () => {
      batch.resolve({ success: 1, usages: [usagePending(1), usageSuccess(2, 0)] });
      await Promise.resolve();
    });
    expect(await screen.findByText('测量中')).toBeInTheDocument();
    expect(within(measurable).queryByText('0 B')).toBeNull();
    expect(within(measurable).queryByText(/^测量 /)).toBeNull();
    expect(within(measurable).queryByText('已清理')).toBeNull();
    expect(within(cardOf('cleaned')).getAllByText('可能存在残留').length).toBeGreaterThan(0);
    expect(within(cardOf('cleaned')).getAllByText('0 B').length).toBeGreaterThan(0);
  });

  it('test_deleted_mobile_390_mount_copy_writes_clipboard', async () => {
    setViewport(390);
    const mountPath = '/home/alice/containers/deleted-train/with space';
    listDeletedContainers.mockResolvedValue(listResponse([record({ mount_path: mountPath })]));
    renderDeleted();
    expect(await screen.findByText('deleted-train')).toBeInTheDocument();
    const chip = within(cardOf('deleted-train')).getByRole('button', { name: mountPath });
    fireEvent.click(chip);
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mountPath));
    expect(antdMessage.success).toHaveBeenCalledWith('已复制');
  });

  it('test_deleted_mobile_copy_failure_keeps_restore_clean_and_usage', async () => {
    setViewport(390);
    navigator.clipboard.writeText.mockRejectedValueOnce(new Error('denied'));
    listDeletedContainers.mockResolvedValue(listResponse([record()]));
    getDeletedContainerMountUsage.mockResolvedValue({ success: 1, usages: [usageSuccess(7, 1024)] });
    renderDeleted();
    expect(await screen.findByText('1 KiB')).toBeInTheDocument();
    const chip = within(cardOf('deleted-train')).getByRole('button', { name: /home\/alice/ });
    fireEvent.click(chip);
    await waitFor(() => expect(antdMessage.error).toHaveBeenCalledWith('复制失败'));
    const card = cardOf('deleted-train');
    expect(within(card).getByRole('button', { name: /恢复/ })).toBeEnabled();
    expect(within(card).getByRole('button', { name: /清理 mount/ })).toBeEnabled();
    expect(within(card).getByText('1 KiB')).toBeInTheDocument();
    await openRestore();
    expect(screen.getByText('恢复会复用保留的 mount 目录，并重新创建容器与用户绑定。')).toBeInTheDocument();
  });

  it('test_deleted_mobile_page_two_removes_page_one', async () => {
    setViewport(390);
    listDeletedContainers.mockImplementation(async ({ page_number }) => (
      page_number === 2
        ? listResponse([record({ deleted_id: 22, container_name: 'page-two' })], { total_number: 21, total_page: 2 })
        : listResponse([record({ deleted_id: 1, container_name: 'page-one' })], { total_number: 21, total_page: 2 })
    ));
    renderDeleted();
    expect(await screen.findByText('page-one')).toBeInTheDocument();
    await userEvent.click(document.querySelector('.ant-pagination-item-2'));
    expect(await screen.findByText('page-two')).toBeInTheDocument();
    expect(screen.queryByText('page-one')).toBeNull();
  });

  it('test_deleted_mobile_stale_expand_key_discards_late_page_response', async () => {
    setViewport(390);
    const stalePageOne = deferred();
    let pageOneCalls = 0;
    listDeletedContainers.mockImplementation(({ page_number }) => {
      if (page_number === 1) {
        pageOneCalls += 1;
        if (pageOneCalls === 1) {
          return Promise.resolve(listResponse([record({ deleted_id: 1, container_name: 'page-one' })], { total_number: 21, total_page: 2 }));
        }
        return stalePageOne.promise;
      }
      return Promise.resolve(listResponse([record({ deleted_id: 2, container_name: 'page-two' })], { total_number: 21, total_page: 2 }));
    });
    renderDeleted();
    expect(await screen.findByText('page-one')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '展开详情' }));
    fireEvent.click(screen.getByRole('button', { name: /刷新/ }));
    fireEvent.click(document.querySelector('.ant-pagination-item-2 a'));
    expect(await screen.findByText('page-two')).toBeInTheDocument();
    await act(async () => {
      stalePageOne.resolve(listResponse([record({ deleted_id: 1, container_name: 'page-one' })], { total_number: 21, total_page: 2 }));
      await Promise.resolve();
    });
    expect(screen.queryByText('page-one')).toBeNull();
    expect(screen.getByText('page-two')).toBeInTheDocument();
    expect(document.querySelector('.app-table-mobile-expanded')).toBeNull();
  });

  it('test_deleted_desktop_expand_toggles_without_duplicate_detail', async () => {
    setViewport(1440);
    listDeletedContainers.mockResolvedValue(listResponse([record()]));
    renderDeleted();
    expect(await screen.findByText('deleted-train')).toBeInTheDocument();
    const user = userEvent.setup();
    const firstIcon = document.querySelector('.ant-table-row-expand-icon');
    await user.click(firstIcon);
    expect(await screen.findByText('fuxi/image-1:20260825T090016Z')).toBeInTheDocument();
    expect(document.querySelectorAll('.deleted-container-detail')).toHaveLength(1);
    const icons = Array.from(document.querySelectorAll('.ant-table-row-expand-icon'));
    await user.click(icons[icons.length - 1]);
    await waitFor(() => expect(document.querySelector('.deleted-container-detail').closest('tr').style.display).toBe('none'));
    expect(document.querySelectorAll('.deleted-container-detail')).toHaveLength(1);
    expect(screen.getAllByText('deleted-train')).toHaveLength(1);
  });

  it('test_deleted_table_and_card_share_fields_at_768_769_1440', async () => {
    listDeletedContainers.mockResolvedValue(listResponse([record()]));
    setViewport(768);
    renderDeleted();
    expect(await screen.findByText('deleted-train')).toBeInTheDocument();
    expect(document.querySelectorAll('.app-table-mobile-card')).toHaveLength(1);
    for (const label of ['容器', '机器', 'Mount', '逻辑用量', '删除时间', '状态', '操作']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    cleanup();
    setViewport(769);
    renderDeleted();
    expect(await screen.findByText('deleted-train')).toBeInTheDocument();
    expect(document.querySelector('table')).not.toBeNull();
    expect(document.querySelector('.app-table-mobile-card')).toBeNull();
    expect(screen.getAllByRole('columnheader').map(th => th.textContent.trim())).toEqual(expect.arrayContaining(['容器', '机器', 'Mount', '逻辑用量', '删除时间', '状态', '操作']));
    expect(within(rowOf('deleted-train')).getByRole('button', { name: /恢复/ })).toBeInTheDocument();
    cleanup();
    setViewport(1440);
    renderDeleted();
    expect(await screen.findByText('deleted-train')).toBeInTheDocument();
    expect(document.querySelector('table')).not.toBeNull();
    expect(screen.getAllByRole('columnheader').map(th => th.textContent.trim())).toEqual(expect.arrayContaining(['容器', '机器', 'Mount', '逻辑用量', '删除时间', '状态', '操作']));
    expect(document.querySelector('.ant-pagination')).not.toBeNull();
  });

  it('test_deleted_mobile_390_usage_success_values_and_non_success_reverse', async () => {
    setViewport(390);
    const measuredAt = '2026-10-18T03:04:05Z';
    listDeletedContainers.mockResolvedValue(listResponse([
      record({ deleted_id: 1, container_name: 'row-limit', mount_path: '/m/1', mount_usage_limit_bytes: 2048 }),
      record({ deleted_id: 2, container_name: 'row-zero', mount_path: '/m/2' }),
      record({ deleted_id: 3, container_name: 'row-pending', mount_path: '/m/3' }),
      record({ deleted_id: 4, container_name: 'row-error', mount_path: '/m/4' }),
      record({ deleted_id: 5, container_name: 'row-missing', mount_path: '/m/5' }),
      record({ deleted_id: 6, container_name: 'row-cleaned', mount_path: '/m/6', mount_cleaned: true }),
      record({ deleted_id: 7, container_name: 'row-no-mount', mount_path: '' }),
    ]));
    getDeletedContainerMountUsage.mockResolvedValue({
      success: 1,
      usages: [
        usageSuccess(1, 1024, measuredAt),
        usageSuccess(2, 0, measuredAt),
        usagePending(3),
        { deleted_id: 4, bytes: null, measured_at: null, pending: false, error: 'node_timeout' },
      ],
    });
    renderDeleted();
    expect(await screen.findByText('1 KiB')).toBeInTheDocument();
    const limitCard = cardOf('row-limit');
    expect(within(limitCard).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    expect(within(limitCard).getByText(`测量 ${expectedShortTime(measuredAt)}`)).toHaveAttribute('title', expectedFullTime(measuredAt));
    const zeroCard = cardOf('row-zero');
    expect(within(zeroCard).getByText('0 B')).toBeInTheDocument();
    const zeroProgress = within(zeroCard).getByRole('progressbar');
    expect(zeroProgress).not.toHaveAttribute('aria-valuenow');
    expect(zeroProgress).toHaveAttribute('aria-valuetext', '已测量，未提供可比上限');
    expect(within(cardOf('row-pending')).getByText('测量中')).toBeInTheDocument();
    expect(within(cardOf('row-error')).getByText('统计超时')).toBeInTheDocument();
    expect(within(cardOf('row-missing')).getByText('统计不可用')).toBeInTheDocument();
    expect(within(cardOf('row-cleaned')).getAllByText('已清理').length).toBeGreaterThan(0);
    expect(within(cardOf('row-no-mount')).getAllByText('无挂载').length).toBeGreaterThan(0);
    for (const name of ['row-pending', 'row-error', 'row-missing', 'row-cleaned', 'row-no-mount']) {
      expect(within(cardOf(name)).queryByRole('progressbar'), name).toBeNull();
      expect(within(cardOf(name)).queryByText('0 B'), name).toBeNull();
    }
  });

  it('test_deleted_usage_limit_success_keeps_size_and_measurement_time', async () => {
    const measuredAt = '2026-10-18T03:04:05Z';
    listDeletedContainers.mockResolvedValue(listResponse([
      record({ mount_usage_limit_bytes: 2048 }),
    ]));
    getDeletedContainerMountUsage.mockResolvedValue({ success: 1, usages: [usageSuccess(7, 1536, measuredAt)] });
    renderDeleted();
    expect(await screen.findByText('1.5 KiB')).toBeInTheDocument();
    expect(within(rowOf('deleted-train')).getByText(`测量 ${expectedShortTime(measuredAt)}`)).toHaveAttribute('title', expectedFullTime(measuredAt));
  });

  it('test_deleted_stale_usage_response_does_not_overwrite_success', async () => {
    const firstUsage = deferred();
    listDeletedContainers.mockResolvedValue(listResponse([record()]));
    getDeletedContainerMountUsage
      .mockReturnValueOnce(firstUsage.promise)
      .mockResolvedValueOnce({ success: 1, usages: [usageSuccess(7, 2048)] });
    renderDeleted();
    expect(await screen.findByText('deleted-train')).toBeInTheDocument();
    await waitFor(() => expect(getDeletedContainerMountUsage).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: /刷新/ }));
    expect(await screen.findByText('2 KiB')).toBeInTheDocument();
    await act(async () => {
      firstUsage.resolve({ success: 1, usages: [usageSuccess(7, 10 * 1024 * 1024)] });
      await Promise.resolve();
    });
    expect(screen.queryByText('10 MiB')).toBeNull();
    expect(screen.getByText('2 KiB')).toBeInTheDocument();
  });

  it('test_deleted_old_flow_late_response_does_not_overwrite_current_page', async () => {
    const page2 = deferred();
    const page3 = deferred();
    listDeletedContainers.mockImplementation(({ page_number }) => {
      if (page_number === 2) return page2.promise;
      if (page_number === 3) return page3.promise;
      return Promise.resolve(listResponse([record({ deleted_id: 1, container_name: 'page-one' })], { total_number: 41, total_page: 3 }));
    });
    renderDeleted();
    expect(await screen.findByText('page-one')).toBeInTheDocument();
    fireEvent.click(document.querySelector('.ant-pagination-item-2 a'));
    fireEvent.click(document.querySelector('.ant-pagination-item-3 a'));
    await act(async () => {
      page3.resolve(listResponse([record({ deleted_id: 3, container_name: 'page-three' })], { total_number: 41, total_page: 3 }));
      await Promise.resolve();
    });
    expect(await screen.findByText('page-three')).toBeInTheDocument();
    await act(async () => {
      page2.resolve(listResponse([record({ deleted_id: 2, container_name: 'page-two' })], { total_number: 41, total_page: 3 }));
      await Promise.resolve();
    });
    expect(screen.queryByText('page-two')).toBeNull();
    expect(screen.getByText('page-three')).toBeInTheDocument();
  });

  it('test_deleted_actions_do_not_wait_for_pending_usage', async () => {
    const batch = deferred();
    listDeletedContainers.mockResolvedValue(listResponse([record()]));
    getDeletedContainerMountUsage.mockReturnValue(batch.promise);
    renderDeleted();
    expect(await screen.findByText('deleted-train')).toBeInTheDocument();
    expect(document.querySelector('.ant-pagination')).not.toBeNull();
    await confirmRestore();
    await waitFor(() => expect(resurrectDeletedContainer).toHaveBeenCalledWith(7, null));
    expect(screen.getByText('deleted-train')).toBeInTheDocument();
    expect(document.querySelector('.ant-pagination')).not.toBeNull();
  });
});
