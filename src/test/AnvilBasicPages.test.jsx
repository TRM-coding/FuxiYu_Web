import React from 'react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigationType } from 'react-router-dom';

/**
 * Anvil 测试对账（Web 第 1 批）：本文件承载
 *   frontend--page-admin-profile / frontend--page-user / frontend--page-announcements
 * 三个 capability 的规划映射，并定向复用 frontend--page-apply 的既有 locator。
 *
 * 约束：
 *  - 目标页面（AdminProfile / User / Announcements）与 AppRoutes、PermissionProvider、
 *    AdminLayout 一律真实渲染；只替换 API、错误弹窗与无关装饰组件（ModelViewer），
 *    以及承接 /index 重定向落点的非目标兄弟页 Home（沿用 routeLoading.test.jsx 的桩化惯例）。
 *  - 不改动任何既有测试文件、页面实现或共享 fixture。
 */

// antd message 在 jsdom 下噪音大：只替换 message 为 spy，组件实现保持真实
vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal();
  return {
    ...antd,
    message: { success: vi.fn(), warning: vi.fn(), error: vi.fn(), loading: vi.fn() },
  };
});

vi.mock('../components/ModelViewer', () => ({
  default: ({ modelPath }) => <div data-testid="model-viewer">{modelPath}</div>,
}));

// 非目标兄弟页：只承接 AdminProfile 403 后 replace 到 /index 的落点
vi.mock('../pages/Home', () => ({
  default: () => <div data-testid="home-page">home</div>,
}));

vi.mock('../utils/showErrorModal', () => ({ default: vi.fn() }));

// keep actual：clearAuth 仍执行真实清理（localStorage），只是多记一笔调用顺序
const hoisted = vi.hoisted(() => ({ order: [] }));
vi.mock('../utils/authHelpers', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: actual.handleAuthError,
    clearAuth: vi.fn((...args) => {
      hoisted.order.push('clearAuth');
      return actual.clearAuth(...args);
    }),
  };
});

vi.mock('../api/user_api', () => ({
  getUserPermissions: vi.fn(),
  getUserDetailInformation: vi.fn(),
  logoutUser: vi.fn(async () => {
    hoisted.order.push('logout');
    return { success: 1 };
  }),
  updateUser: vi.fn(),
  changePasswordUser: vi.fn(),
  loginUser: vi.fn(),
  registerUser: vi.fn(),
  requestRegisterCode: vi.fn(),
  listAllUserBrefInformation: vi.fn(async () => ({ users: [] })),
}));

vi.mock('../api/announcement_api', () => ({
  listDrafts: vi.fn(),
  listAnnouncements: vi.fn(),
  batchSendDrafts: vi.fn(),
  resolveTargets: vi.fn(),
  getAnnouncementsStatus: vi.fn(),
  deleteDraft: vi.fn(),
  copyAnnouncementAsDraft: vi.fn(),
  resendAnnouncement: vi.fn(),
  convertToTemplate: vi.fn(),
  deleteAnnouncement: vi.fn(),
  batchDeleteAnnouncements: vi.fn(),
  listTemplates: vi.fn(),
}));

vi.mock('../api/machine_api', () => ({ listAllMachineBrefInformation: vi.fn() }));
vi.mock('../api/container_api', () => ({ listAllContainerBrefInformation: vi.fn() }));

import { message } from 'antd';
import showErrorModal from '../utils/showErrorModal';
import { clearAuth } from '../utils/authHelpers';
import {
  getUserPermissions,
  getUserDetailInformation,
  logoutUser,
} from '../api/user_api';
import {
  listDrafts,
  listAnnouncements,
  batchSendDrafts,
  resolveTargets,
  getAnnouncementsStatus,
} from '../api/announcement_api';
import { PermissionProvider } from '../contexts/PermissionContext';
import { usePermission } from '../contexts/PermissionContext';
import AppRoutes from '../routes';
import AdminProfile from '../pages/AdminProfile';
import User from '../pages/User';
import Announcements from '../pages/Announcements';

beforeAll(async () => {
  // 预热懒加载模块图（AdminLayout/MainLayout/登录页与三个目标页面），
  // 把 Vite 首次转换开销移出断言窗口。
  await Promise.all([
    import('../layouts/AdminLayout'),
    import('../layouts/MainLayout'),
    import('../pages/Login'),
    import('../pages/AdminProfile'),
    import('../pages/User'),
    import('../pages/Announcements'),
  ]);
}, 60000);

const WAIT = { timeout: 10000 };
const TEST_TIMEOUT = 30000;

const LocationProbe = () => {
  const location = useLocation();
  return <span data-testid="path">{`${location.pathname}${location.search}`}</span>;
};

// 真实路由跳转类型：用于区分 replace 与 push，路径相同也能分辨
const NavigationTypeProbe = () => {
  const navigationType = useNavigationType();
  return <span data-testid="navtype">{navigationType}</span>;
};

// 只读权限快照：用于证明 logout 后快照被清空，而不是断言实现细节
const PermissionProbe = () => {
  const { entities, userId } = usePermission();
  return <span data-testid="perm">{`${entities.join(',') || 'none'}|${String(userId)}`}</span>;
};

const renderAppAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <PermissionProvider>
        <AppRoutes />
        <LocationProbe />
        <PermissionProbe />
        <NavigationTypeProbe />
      </PermissionProvider>
    </MemoryRouter>,
  );

const renderWithPermission = (ui) =>
  render(
    <MemoryRouter>
      <PermissionProvider>{ui}</PermissionProvider>
    </MemoryRouter>,
  );

// 权限快照已就绪后再挂载路由：真实使用中 Provider 位于应用根部，
// 进入受守卫页面时 loaded 已为 true；这样 403 分支不会被"加载窗口"先行挂载。
const PermissionReady = ({ children }) => {
  const { loaded } = usePermission();
  return loaded ? children : null;
};

const renderAppAtAfterPermissionLoaded = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <PermissionProvider>
        <PermissionReady>
          <AppRoutes />
          <LocationProbe />
          <PermissionProbe />
        </PermissionReady>
      </PermissionProvider>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.order.length = 0;
  localStorage.clear();
  sessionStorage.clear();
  getUserPermissions.mockResolvedValue({ entities: [], userId: null, userName: '' });
  getUserDetailInformation.mockResolvedValue({ user_info: {} });
  listDrafts.mockResolvedValue({ drafts: [] });
  listAnnouncements.mockResolvedValue({ announcements: [], sent_count: 0, partial_count: 0, failed_count: 0 });
  resolveTargets.mockResolvedValue({ recipient_count: 5 });
  getAnnouncementsStatus.mockResolvedValue({ announcements: [{ id: 11, status: 'sending' }] });
});

describe('AdminProfile 对账（frontend--page-admin-profile）', () => {
  it('test_anvil_adminprofile_route_assembles_from_permission_snapshot', async () => {
    getUserPermissions.mockResolvedValue({
      entities: ['user:manage', 'bypass_auth_entity'],
      userId: 1024,
      userName: 'op1',
    });
    getUserDetailInformation.mockResolvedValue({
      user_info: { username: 'op_alice', email: 'a@b.c', graduation_year: 2023, amount_of_container: 5 },
    });
    // 历史遗留的本地副本：页面身份必须来自权限快照，而不是这个值
    localStorage.setItem('currentUserId', '7');

    renderAppAt('/admin/profile');

    expect(await screen.findByText('管理员信息', undefined, WAIT)).toBeInTheDocument();
    expect(screen.getByTestId('path')).toHaveTextContent('/admin/profile');
    await waitFor(() => expect(getUserDetailInformation).toHaveBeenCalledWith(1024));
    expect(getUserDetailInformation).not.toHaveBeenCalledWith(7);
  }, TEST_TIMEOUT);

  it('test_anvil_adminprofile_denies_without_bypass_and_navigates', async () => {
    // 能过 AdminLayout 的 manage 守卫，但没有 bypass_auth_entity：页面自身拒入
    getUserPermissions.mockResolvedValue({ entities: ['user:manage'], userId: 1024, userName: 'op1' });

    renderAppAt('/admin/profile');

    await waitFor(() =>
      expect(showErrorModal).toHaveBeenCalledWith(
        expect.objectContaining({ status: 403, title: '权限不足' }),
      ),
    );
    expect(await screen.findByTestId('home-page', undefined, WAIT)).toBeInTheDocument();
    expect(screen.getByTestId('path')).toHaveTextContent('/index');
    expect(getUserDetailInformation).not.toHaveBeenCalled();
  }, TEST_TIMEOUT);

  it('test_anvil_adminprofile_maps_user_info_fields_and_placeholders', async () => {
    getUserPermissions.mockResolvedValue({
      entities: ['bypass_auth_entity'],
      userId: 7,
      userName: 'op1',
    });
    getUserDetailInformation.mockResolvedValue({
      user_info: { username: 'op_alice', email: 'a@b.c', graduation_year: 2023, amount_of_container: 5 },
    });

    const first = renderWithPermission(<AdminProfile />);
    expect(await screen.findByText('op_alice', undefined, WAIT)).toBeInTheDocument();
    expect(screen.getByText('a@b.c')).toBeInTheDocument();
    expect(screen.getByText('2023')).toBeInTheDocument();
    const firstContainerLabel = screen.getByText('拥有容器').closest('th');
    expect(firstContainerLabel).not.toBeNull();
    const firstContainerValue = firstContainerLabel.nextElementSibling;
    expect(firstContainerValue).toHaveClass('ant-descriptions-item-content');
    expect(firstContainerValue.textContent).toBe('5');
    expect(screen.getByText('操作员 (operator)')).toBeInTheDocument();
    first.unmount();

    // 空字段沿用当前占位：邮箱/毕业年份「未知」，容器数量为空串占位
    getUserDetailInformation.mockResolvedValue({ user_info: { username: 'op_empty' } });
    const second = renderWithPermission(<AdminProfile />);
    expect(await screen.findByText('op_empty', undefined, WAIT)).toBeInTheDocument();
    expect(screen.getAllByText('未知')).toHaveLength(2);
    expect(screen.queryByText('a@b.c')).not.toBeInTheDocument();
    // 直接定位「拥有容器」Descriptions 值节点：空 amount_of_container 是空串，不是缺失/「未知」
    const emptyContainerLabel = screen.getByText('拥有容器').closest('th');
    expect(emptyContainerLabel).not.toBeNull();
    const emptyContainerValue = emptyContainerLabel.nextElementSibling;
    expect(emptyContainerValue).toHaveClass('ant-descriptions-item-content');
    expect(emptyContainerValue.textContent).toBe('');
    second.unmount();

    // 非 401 的查询失败：不弹框（这一页空着比误报更不打扰）
    getUserDetailInformation.mockRejectedValue({ status: 500 });
    renderWithPermission(<AdminProfile />);
    expect(await screen.findByText('管理员信息', undefined, WAIT)).toBeInTheDocument();
    expect(showErrorModal).not.toHaveBeenCalled();
  }, TEST_TIMEOUT);
});

describe('User 对账（frontend--page-user）', () => {
  it('test_anvil_user_route_assembles_from_permission_snapshot', async () => {
    getUserPermissions.mockResolvedValue({ entities: ['user:manage'], userId: 1024, userName: 'op1' });
    getUserDetailInformation.mockResolvedValue({
      user_info: { username: 'op_alice', email: 'a@b.c', graduation_year: 2023 },
    });
    localStorage.setItem('currentUserId', '7');

    renderAppAt('/index/user');

    expect(await screen.findByText('用户信息管理', undefined, WAIT)).toBeInTheDocument();
    expect(screen.getByTestId('path')).toHaveTextContent('/index/user');
    await waitFor(() => expect(getUserDetailInformation).toHaveBeenCalledWith(1024));
    expect(getUserDetailInformation).not.toHaveBeenCalledWith(7);
  }, TEST_TIMEOUT);

  it('test_anvil_user_logout_calls_backend_then_clears_auth_and_permission_and_replaces_root', async () => {
    getUserPermissions.mockResolvedValue({ entities: ['user:manage'], userId: 1024, userName: 'op1' });
    getUserDetailInformation.mockResolvedValue({
      user_info: { username: 'op_alice', email: 'a@b.c', graduation_year: 2023 },
    });

    // 让后端登出保持 pending：验证 await 未完成前不会先清本地状态
    let resolveLogout;
    logoutUser.mockImplementationOnce(() => {
      hoisted.order.push('logout');
      return new Promise((resolve) => { resolveLogout = resolve; });
    });

    const first = renderAppAt('/index/user');
    await waitFor(() => expect(screen.getByTestId('perm')).toHaveTextContent('user:manage|1024'));

    fireEvent.click(await screen.findByLabelText('登出', undefined, WAIT));
    await waitFor(() => expect(logoutUser).toHaveBeenCalledTimes(1));

    // await 后端未完成：认证缓存/权限快照未清，仍停在当前页
    expect(clearAuth).not.toHaveBeenCalled();
    expect(screen.getByTestId('perm')).toHaveTextContent('user:manage|1024');
    expect(screen.getByTestId('path')).toHaveTextContent('/index/user');
    expect(screen.getByTestId('navtype')).not.toHaveTextContent('REPLACE');

    resolveLogout({ success: 1 });

    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent(/^\/$/));
    expect(screen.getByTestId('navtype')).toHaveTextContent('REPLACE');
    expect(logoutUser).toHaveBeenCalledTimes(1);
    expect(clearAuth).toHaveBeenCalled();
    // 先调后端登出，再清前端认证缓存
    expect(hoisted.order).toEqual(['logout', 'clearAuth']);
    // 权限快照已清空（clearPermission → clear()）
    expect(screen.getByTestId('perm')).toHaveTextContent('none|null');
    first.unmount();

    // 后端登出失败也继续收尾：不误报成功、仍然清快照并回登录页
    vi.clearAllMocks();
    hoisted.order.length = 0;
    getUserPermissions.mockResolvedValue({ entities: ['user:manage'], userId: 2024, userName: 'op2' });
    getUserDetailInformation.mockResolvedValue({ user_info: { username: 'op_bob' } });
    logoutUser.mockRejectedValueOnce(new Error('logout down'));

    renderAppAt('/index/user');
    await waitFor(() => expect(screen.getByTestId('perm')).toHaveTextContent('user:manage|2024'));

    fireEvent.click(await screen.findByLabelText('登出', undefined, WAIT));

    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent(/^\/$/));
    expect(screen.getByTestId('navtype')).toHaveTextContent('REPLACE');
    expect(logoutUser).toHaveBeenCalledTimes(1);
    expect(clearAuth).toHaveBeenCalled();
    expect(screen.getByTestId('perm')).toHaveTextContent('none|null');
    expect(message.success).not.toHaveBeenCalled();
  }, TEST_TIMEOUT);
});

describe('Announcements 对账（frontend--page-announcements）', () => {
  it('test_anvil_announcements_route_assembles_and_queries_lists_separately', async () => {
    getUserPermissions.mockResolvedValue({
      entities: ['announcement:manage'],
      userId: 1024,
      userName: 'op1',
    });
    listDrafts.mockResolvedValue({ drafts: [{ id: 1, title: '草稿甲', content: '正文' }] });
    listAnnouncements.mockResolvedValue({
      announcements: [],
      sent_count: 0,
      partial_count: 0,
      failed_count: 0,
    });

    const first = renderAppAt('/admin/announcements');

    // 侧栏（桌面/移动）也有「公告管理」菜单项，这里只认页面标题
    expect(await screen.findByRole('heading', { name: '公告管理' }, WAIT)).toBeInTheDocument();
    expect(screen.getByTestId('path')).toHaveTextContent('/admin/announcements');
    expect(screen.getAllByText(/待发送区/).length).toBeGreaterThan(0);
    expect(screen.getByText('(1 条草稿)')).toBeInTheDocument();
    // 两路查询各自独立：草稿来自 listDrafts，公告来自 listAnnouncements，互不替代
    expect(await screen.findByText('草稿甲', undefined, WAIT)).toBeInTheDocument();
    await waitFor(() => expect(listDrafts).toHaveBeenCalledTimes(1));
    expect(listAnnouncements).toHaveBeenCalledTimes(1);
    // 公告列表用的是它自己那份响应（空），与草稿响应互不替代
    expect(screen.getByText('暂无发送记录')).toBeInTheDocument();
    first.unmount();

    // 无 manage 权限：被 AdminLayout 守卫拦下，且不发起页面查询
    listDrafts.mockClear();
    listAnnouncements.mockClear();
    getUserPermissions.mockResolvedValue({ entities: [], userId: null });
    renderAppAtAfterPermissionLoaded('/admin/announcements');
    expect(await screen.findByText(/403/, undefined, WAIT)).toBeInTheDocument();
    expect(listDrafts).not.toHaveBeenCalled();
    expect(listAnnouncements).not.toHaveBeenCalled();
  }, TEST_TIMEOUT);

  it('test_anvil_announcements_shows_sending_progress_not_delivered', async () => {
    listDrafts.mockResolvedValue({ drafts: [{ id: 1, title: '草稿甲', content: '正文' }] });
    let resolveSend;
    batchSendDrafts.mockReturnValue(new Promise((r) => { resolveSend = r; }));

    render(
      <MemoryRouter>
        <Announcements />
      </MemoryRouter>,
    );

    await openSendDialog();

    const sendButton = screen.getByRole('button', { name: /批量发送/ });
    fireEvent.click(sendButton);

    // 受理请求在飞行中：发送按钮处于 loading
    await waitFor(() => expect(document.querySelector('.ant-btn-loading')).not.toBeNull());

    resolveSend({ announcement_ids: [11], total: 1 });

    // 只拿到「受理」：文案是后台发送中，不是已投递
    await waitFor(() =>
      expect(message.success).toHaveBeenCalledWith(expect.stringContaining('已受理')),
    );
    // 进度行以 SENDING 与计数呈现
    expect(await screen.findByText(/发送中 0\/1 条/, undefined, WAIT)).toBeInTheDocument();
    // 还没有完成态，也不汇总成功/失败
    expect(screen.queryByText(/已完成/)).toBeNull();
    expect(screen.queryByText(/成功 \d/)).toBeNull();
  }, TEST_TIMEOUT);

  it('test_anvil_announcements_sends_saved_draft_content_without_template', async () => {
    // 草稿是模板填充后独立保存的内容快照：这里刻意不带 template_id
    listDrafts.mockResolvedValue({ drafts: [{ id: 1, title: '草稿甲', content: '正文' }] });
    batchSendDrafts.mockResolvedValue({ announcement_ids: [11], total: 1 });

    render(
      <MemoryRouter>
        <Announcements />
      </MemoryRouter>,
    );

    await openSendDialog();
    fireEvent.click(screen.getByRole('button', { name: /批量发送/ }));

    await waitFor(() => expect(batchSendDrafts).toHaveBeenCalledTimes(1));
    const [payload] = batchSendDrafts.mock.calls[0];
    expect(payload).toEqual({ draft_ids: [1], targets: [{ type: 'all', id: 0 }] });
    expect(payload).not.toHaveProperty('template_id');
    // 发送过程不需要再挑模板：没有弹出任何选择对话框，直接进入状态轮询
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByText(/发送中 0\/1 条/, undefined, WAIT)).toBeInTheDocument();
  }, TEST_TIMEOUT);

  it('test_anvil_announcements_rejected_draft_shows_refusal_without_success_state', async () => {
    listDrafts.mockResolvedValue({ drafts: [{ id: 1, title: '草稿甲', content: '正文' }] });
    batchSendDrafts.mockRejectedValueOnce({ status: 403, body: { message: '草稿不属于当前用户' } });

    const first = render(
      <MemoryRouter>
        <Announcements />
      </MemoryRouter>,
    );

    await openSendDialog();
    fireEvent.click(screen.getByRole('button', { name: /批量发送/ }));

    await waitFor(() =>
      expect(showErrorModal).toHaveBeenCalledWith(
        expect.objectContaining({ status: 403, message: '草稿不属于当前用户' }),
      ),
    );
    // 拒绝即拒绝：不给成功提示，也不进入发送中/已完成
    expect(message.success).not.toHaveBeenCalled();
    expect(screen.queryByText(/发送中/)).toBeNull();
    expect(screen.queryByText(/已完成/)).toBeNull();
    // 勾选与收件人保留，按钮退出 loading
    await waitFor(() => expect(document.querySelector('.ant-btn-loading')).toBeNull());
    expect(screen.getByRole('button', { name: /批量发送 \(1\)/ })).toBeEnabled();
    expect(screen.getAllByText('全员').length).toBeGreaterThan(0);
    first.unmount();

    // 没有后端 message 时用缺省拒绝文案
    vi.clearAllMocks();
    listDrafts.mockResolvedValue({ drafts: [{ id: 2, title: '草稿乙', content: '正文' }] });
    batchSendDrafts.mockRejectedValueOnce({ status: 404 });

    render(
      <MemoryRouter>
        <Announcements />
      </MemoryRouter>,
    );

    await openSendDialog('草稿乙');
    fireEvent.click(screen.getByRole('button', { name: /批量发送/ }));

    await waitFor(() =>
      expect(showErrorModal).toHaveBeenCalledWith(
        expect.objectContaining({ status: 404, message: '批量发送失败' }),
      ),
    );
    expect(message.success).not.toHaveBeenCalled();
    expect(screen.queryByText(/发送中/)).toBeNull();
    expect(screen.queryByText(/已完成/)).toBeNull();
    // 勾选与收件人保留，按钮退出 loading
    await waitFor(() => expect(document.querySelector('.ant-btn-loading')).toBeNull());
    expect(screen.getByRole('button', { name: /批量发送 \(1\)/ })).toBeEnabled();
    expect(screen.getAllByText('全员').length).toBeGreaterThan(0);
  }, TEST_TIMEOUT);
});

// 勾选一条草稿 + 添加「全员」目标，使批量发送按钮可用
async function openSendDialog(draftTitleText = '草稿甲') {
  fireEvent.click(await screen.findByText(draftTitleText, undefined, WAIT));
  fireEvent.click(screen.getByRole('button', { name: /添加目标/ }));
  // 按钮内含 TeamOutlined（aria-label=team），可访问名不是精确的「全员」
  fireEvent.click(await screen.findByRole('button', { name: /全员/ }, WAIT));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /批量发送/ })).toBeEnabled(),
  );
}
