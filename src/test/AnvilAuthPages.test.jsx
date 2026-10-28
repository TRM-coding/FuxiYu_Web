import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

/**
 * Anvil 测试对账（Web auth 批次）：承载 frontend--page-login /
 * frontend--page-register / frontend--page-rbac-matrix 以及
 * frontend--authentication 的 controller 幂等缺口。
 *
 * 真实页面、真实 PermissionProvider、真实路由；只替换 API、antd message、
 * 装饰性 ModelViewer 与非目标落点。详情页组合在独立
 * AnvilAuthContainerDetail.test.jsx，避免与 detail-credential 批次交错。
 */

const viewerState = vi.hoisted(() => ({
  mode: 'ready',
  promise: null,
  resolve: null,
}));

vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal();
  return {
    ...antd,
    message: {
      success: vi.fn(),
      warning: vi.fn(),
      error: vi.fn(),
      loading: vi.fn(),
      destroy: vi.fn(),
    },
  };
});

// 可控的装饰性 3D 模块：挂起模拟 lazily pending，抛错模拟局部 chunk 失败。
vi.mock('../components/ModelViewer', () => ({
  default: () => {
    if (viewerState.mode === 'pending') throw viewerState.promise;
    if (viewerState.mode === 'error') throw new Error('viewer chunk failed');
    return <div data-testid="model-viewer">/glb.opt.glb</div>;
  },
}));

vi.mock('../api/user_api', () => ({
  getUserPermissions: vi.fn(),
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  requestRegisterCode: vi.fn(),
  listAllUserBrefInformation: vi.fn(),
  logoutUser: vi.fn(),
  getUserDetailInformation: vi.fn(),
  updateUser: vi.fn(),
  changePasswordUser: vi.fn(),
}));

vi.mock('../api/rbac_api', () => ({
  createRbacGroup: vi.fn(),
  getRbacMatrix: vi.fn(),
  updateRbacGroupEntities: vi.fn(),
}));

import { message } from 'antd';
import {
  getUserPermissions,
  loginUser,
  registerUser,
} from '../api/user_api';
import {
  createRbacGroup,
  getRbacMatrix,
  updateRbacGroupEntities,
} from '../api/rbac_api';
import { PermissionProvider } from '../contexts/PermissionContext';
import {
  abortAll,
  createController,
  unregisterController,
} from '../utils/requestManager';
import AppRoutes from '../routes';
import Login from '../pages/Login';
import Register from '../pages/Register';
import RbacMatrix from '../pages/RbacMatrix';

const WAIT = { timeout: 10000 };
const TEST_TIMEOUT = 30000;

const LOCATION_PROBE = () => {
  const location = useLocation();
  return <span data-testid="path">{location.pathname}</span>;
};

const NAVIGATION_TYPE_PROBE = () => {
  const navigationType = useNavigationType();
  return <span data-testid="navtype">{navigationType}</span>;
};

const renderAppAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <PermissionProvider>
        <AppRoutes />
        <LOCATION_PROBE />
        <NAVIGATION_TYPE_PROBE />
      </PermissionProvider>
    </MemoryRouter>,
  );

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <PermissionProvider>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/index" element={<div data-testid="index-page">index</div>} />
        </Routes>
        <LOCATION_PROBE />
        <NAVIGATION_TYPE_PROBE />
      </PermissionProvider>
    </MemoryRouter>,
  );

const renderRegister = () =>
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  );

const renderRbac = () =>
  render(
    <MemoryRouter>
      <PermissionProvider>
        <RbacMatrix />
      </PermissionProvider>
    </MemoryRouter>,
  );

const setViewerPending = () => {
  let resolve;
  const promise = new Promise((res) => { resolve = res; });
  viewerState.mode = 'pending';
  viewerState.promise = promise;
  viewerState.resolve = resolve;
};

const visibleDialogs = () =>
  Array.from(document.querySelectorAll('.ant-modal'))
    .filter((element) => element.style.display !== 'none');

const closeVisibleDialogs = async () => {
  for (let i = 0; i < 6; i += 1) {
    const buttons = Array.from(document.querySelectorAll('.ant-modal button'))
      .filter((button) => (button.textContent || '').replace(/\s/g, '') === '好的');
    if (!buttons.length) break;
    await act(async () => { buttons[buttons.length - 1].click(); });
  }
  await waitFor(() => expect(visibleDialogs()).toHaveLength(0)).catch(() => {});
};

const fillLogin = async (user) => {
  await user.type(screen.getByPlaceholderText('用户名或邮箱'), 'alice');
  await user.type(screen.getByPlaceholderText('请输入密码'), 'secret');
  fireEvent.click(document.querySelector('.login-form button[type="submit"]'));
};

const fillRegisterForm = (username = 'alice') => {
  fireEvent.change(screen.getByPlaceholderText('请输入学校邮箱'), {
    target: { value: 'alice@bjtu.edu.cn' },
  });
  fireEvent.change(screen.getByPlaceholderText('请输入用户名（最多75字符）'), {
    target: { value: username },
  });
  fireEvent.change(screen.getByPlaceholderText('输入邮箱验证码'), {
    target: { value: '123456' },
  });
  fireEvent.change(screen.getByPlaceholderText('请输入密码'), {
    target: { value: 'Password123' },
  });
  fireEvent.change(screen.getByPlaceholderText('如：2024'), {
    target: { value: '2024' },
  });
};

const submitRegister = () => {
  fireEvent.click(document.querySelector('.register-form button[type="submit"]'));
};

const stageLiveRegion = () =>
  document.querySelector('.model-stage [role="status"], .model-stage [aria-live]');

const RBAC_ENTITIES = [
  { id: 1, code: 'machine:view', name: '机器查看' },
  { id: 2, code: 'container:create', name: '创建容器' },
  { id: 3, code: 'container:manage', name: '容器管理' },
];

const RBAC_GROUPS = [
  {
    id: 10,
    name: 'user',
    description: '基础用户组',
    entity_codes: ['machine:view'],
    locked_entity_codes: [],
  },
];

beforeAll(async () => {
  await Promise.all([
    import('../pages/Login'),
    import('../pages/Register'),
    import('../pages/RbacMatrix'),
    import('../layouts/LoginLayout'),
    import('../layouts/AdminLayout'),
  ]);
}, 60000);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  viewerState.mode = 'ready';
  viewerState.promise = null;
  viewerState.resolve = null;
  getUserPermissions.mockResolvedValue({ entities: [], userId: null, userName: '' });
  loginUser.mockReset();
  registerUser.mockReset();
  getRbacMatrix.mockReset();
  updateRbacGroupEntities.mockReset();
  createRbacGroup.mockReset();
});

afterEach(async () => {
  await closeVisibleDialogs();
  cleanup();
  abortAll('test');
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

describe('frontend--page-login', () => {
  it('test_anvil_login_authenticated_snapshot_replaces_to_index', async () => {
    getUserPermissions.mockResolvedValue({ entities: [], userId: 7, userName: 'op1' });
    localStorage.setItem('currentUserId', '99');

    renderLogin();

    expect(await screen.findByTestId('index-page', undefined, WAIT)).toBeInTheDocument();
    expect(screen.getByTestId('path')).toHaveTextContent('/index');
    expect(screen.getByTestId('navtype')).toHaveTextContent('REPLACE');
    expect(screen.queryByPlaceholderText('用户名或邮箱')).not.toBeInTheDocument();
    expect(loginUser).not.toHaveBeenCalled();
  }, TEST_TIMEOUT);

  it('test_anvil_login_refresh_failure_still_enters_index', async () => {
    const user = userEvent.setup();
    getUserPermissions
      .mockResolvedValueOnce({ entities: [], userId: null, userName: '' })
      .mockRejectedValueOnce(new Error('refresh failed'));
    loginUser.mockResolvedValue({ success: 1 });

    renderLogin();
    expect(await screen.findByPlaceholderText('用户名或邮箱', undefined, WAIT)).toBeInTheDocument();
    await fillLogin(user);

    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/index'));
    expect(getUserPermissions).toHaveBeenCalledTimes(2);
    expect(message.success).toHaveBeenCalledWith('登录成功');
    expect(visibleDialogs()).toHaveLength(0);
    expect(loginUser).toHaveBeenCalledWith({
      username: 'alice',
      password: 'secret',
      remember: true,
    });
    expect(localStorage.getItem('currentUserId')).toBeNull();
    expect(localStorage.getItem('currentUserName')).toBeNull();
  }, TEST_TIMEOUT);

  it('test_anvil_login_viewer_loading_keeps_form_and_submit_available', async () => {
    setViewerPending();
    renderAppAt('/');

    expect(await screen.findByPlaceholderText('用户名或邮箱', undefined, WAIT)).toBeInTheDocument();
    const loading = screen.getByTestId('model-stage-loading');
    expect(loading).toBeEmptyDOMElement();
    expect(screen.queryByTestId('model-viewer')).not.toBeInTheDocument();
    expect(stageLiveRegion()).toBeNull();
    expect(document.querySelector('.login-form button[type="submit"]')).toBeEnabled();
  }, TEST_TIMEOUT);

  it('test_anvil_login_viewer_ready_keeps_form_and_submit_available', async () => {
    renderAppAt('/');

    const modelViewer = await screen.findByTestId('model-viewer', undefined, WAIT);
    expect(modelViewer).toHaveTextContent('/glb.opt.glb');
    expect(screen.queryByTestId('model-stage-loading')).not.toBeInTheDocument();
    expect(stageLiveRegion()).toBeNull();
    expect(document.querySelector('.login-form button[type="submit"]')).toBeEnabled();
  }, TEST_TIMEOUT);

  it('test_anvil_login_register_viewer_failure_keeps_both_routes', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    viewerState.mode = 'error';
    renderAppAt('/');

    const unavailable = await screen.findByTestId('model-stage-unavailable', undefined, WAIT);
    expect(unavailable).toBeEmptyDOMElement();
    expect(await screen.findByPlaceholderText('用户名或邮箱', undefined, WAIT)).toBeInTheDocument();
    expect(stageLiveRegion()).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /^注\s*册$/ }));
    expect(await screen.findByPlaceholderText('请输入学校邮箱', undefined, WAIT)).toBeInTheDocument();
    expect(screen.getByTestId('path')).toHaveTextContent('/register');
    expect(screen.getByTestId('model-stage-unavailable')).toBeInTheDocument();
    expect(stageLiveRegion()).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /^登\s*录$/ }));
    expect(await screen.findByPlaceholderText('用户名或邮箱', undefined, WAIT)).toBeInTheDocument();
    expect(screen.getByTestId('model-stage-unavailable')).toBeInTheDocument();
    consoleError.mockRestore();
  }, TEST_TIMEOUT);

  it('test_anvil_login_network_failure_hides_english_original', async () => {
    const user = userEvent.setup();
    loginUser.mockRejectedValueOnce(new Error('Failed to fetch'));

    renderLogin();
    expect(await screen.findByPlaceholderText('用户名或邮箱', undefined, WAIT)).toBeInTheDocument();
    await fillLogin(user);

    const dialog = await screen.findByRole('dialog', undefined, WAIT);
    expect(dialog.textContent).toContain('网络异常或请求超时，无法连接到服务器，请检查网络后重试。');
    expect(dialog.textContent).not.toContain('Failed to fetch');
    expect(dialog.textContent).not.toContain('NetworkError');
  }, TEST_TIMEOUT);
});

describe('frontend--page-register', () => {
  it('test_anvil_register_viewer_loading_placeholder_keeps_form', async () => {
    setViewerPending();
    renderAppAt('/register');

    expect(await screen.findByPlaceholderText('请输入学校邮箱', undefined, WAIT)).toBeInTheDocument();
    const loading = screen.getByTestId('model-stage-loading');
    expect(loading).toBeEmptyDOMElement();
    expect(screen.queryByTestId('model-viewer')).not.toBeInTheDocument();
    expect(stageLiveRegion()).toBeNull();
    expect(document.querySelector('.register-form button[type="submit"]')).toBeEnabled();
  }, TEST_TIMEOUT);

  it('test_anvil_register_viewer_ready_replaces_placeholder', async () => {
    renderAppAt('/register');

    const modelViewer = await screen.findByTestId('model-viewer', undefined, WAIT);
    expect(modelViewer).toHaveTextContent('/glb.opt.glb');
    expect(screen.queryByTestId('model-stage-loading')).not.toBeInTheDocument();
    expect(await screen.findByPlaceholderText('请输入学校邮箱', undefined, WAIT)).toBeInTheDocument();
    expect(stageLiveRegion()).toBeNull();
  }, TEST_TIMEOUT);

  it('test_anvil_register_conflict_retains_form_and_allows_corrected_retry', async () => {
    registerUser
      .mockRejectedValueOnce({
        body: { message: 'username exists', error_reason: 'username_exists' },
        status: 409,
        route: 'https://ctrl/register',
      })
      .mockResolvedValueOnce({
        success: 1,
        message: '注册成功',
        username: 'alice2',
        email: 'alice@bjtu.edu.cn',
      });

    renderRegister();
    fillRegisterForm('alice');
    submitRegister();

    const dialog = await screen.findByRole('dialog', undefined, WAIT);
    const close = within(dialog).getByRole('button', { name: /好\s*的/ });
    fireEvent.click(close);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    expect(screen.getByPlaceholderText('请输入用户名（最多75字符）')).toHaveValue('alice');
    expect(screen.getByPlaceholderText('请输入学校邮箱')).toHaveValue('alice@bjtu.edu.cn');
    expect(screen.getByPlaceholderText('输入邮箱验证码')).toHaveValue('123456');

    fireEvent.change(screen.getByPlaceholderText('请输入用户名（最多75字符）'), {
      target: { value: 'alice2' },
    });
    submitRegister();

    await waitFor(() => expect(registerUser).toHaveBeenCalledTimes(2));
    expect(registerUser).toHaveBeenLastCalledWith({
      username: 'alice2',
      email: 'alice@bjtu.edu.cn',
      password: 'Password123',
      graduation_year: 2024,
      registration_code: '123456',
    });
    expect(await screen.findAllByText('注册成功')).not.toHaveLength(0);
  }, TEST_TIMEOUT);

  it('test_anvil_register_rejects_non_empty_invalid_username', async () => {
    renderRegister();
    fillRegisterForm('bad-name');
    submitRegister();

    const dialog = await screen.findByRole('dialog', undefined, WAIT);
    expect(dialog.textContent).toContain('用户名仅允许英文、数字和下划线');
    expect(registerUser).not.toHaveBeenCalled();
  }, TEST_TIMEOUT);
});

describe('frontend--authentication controller release', () => {
  it('test_anvil_permission_controller_unregister_is_idempotent', () => {
    const controller = createController();
    unregisterController(controller);

    expect(() => unregisterController(controller)).not.toThrow();
    abortAll('test');
    expect(controller.signal.aborted).toBe(false);
  });
});

describe('frontend--page-rbac-matrix', () => {
  it('test_anvil_rbac_route_assembles_for_rbac_manage', async () => {
    getUserPermissions.mockResolvedValue({
      entities: ['rbac:manage'],
      userId: 1,
      userName: 'op1',
    });
    getRbacMatrix.mockResolvedValue({
      success: 1,
      entities: RBAC_ENTITIES,
      groups: RBAC_GROUPS,
    });

    renderAppAt('/admin/rbac');

    expect(await screen.findByRole('button', { name: '开启 container:create' }, WAIT)).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector('.rbac-title')).toHaveTextContent('权限管理'));
    expect(screen.getByTestId('path')).toHaveTextContent('/admin/rbac');
    await waitFor(() => expect(getRbacMatrix).toHaveBeenCalledTimes(1));
  }, TEST_TIMEOUT);

  it('test_anvil_rbac_denies_without_rbac_manage', async () => {
    getUserPermissions.mockResolvedValue({
      entities: ['user:manage'],
      userId: 1,
      userName: 'op1',
    });

    renderAppAt('/admin/rbac');

    expect(await screen.findByText('403 - 无权限矩阵管理权限', undefined, WAIT)).toBeInTheDocument();
    expect(getRbacMatrix).not.toHaveBeenCalled();
  }, TEST_TIMEOUT);

  it('test_anvil_rbac_save_refreshes_matrix_from_returned_group', async () => {
    getUserPermissions.mockResolvedValue({
      entities: ['rbac:manage'],
      userId: 1,
      userName: 'op1',
    });
    getRbacMatrix.mockResolvedValue({
      success: 1,
      entities: RBAC_ENTITIES,
      groups: RBAC_GROUPS,
    });
    updateRbacGroupEntities.mockResolvedValue({
      success: 1,
      group: {
        ...RBAC_GROUPS[0],
        entity_codes: ['machine:view', 'container:create'],
      },
    });

    renderRbac();

    const chip = await screen.findByRole('button', { name: '开启 container:create' }, WAIT);
    fireEvent.click(chip);
    fireEvent.click(screen.getByRole('button', { name: /保存/ }));

    await waitFor(() => expect(updateRbacGroupEntities).toHaveBeenCalledWith({
      group_id: 10,
      entity_codes: expect.arrayContaining(['machine:view', 'container:create']),
    }));
    expect(message.success).toHaveBeenCalledWith('权限已保存');
    const updated = await screen.findByRole('button', { name: '关闭 container:create' });
    expect(updated).toHaveTextContent('启用');
  }, TEST_TIMEOUT);
});
