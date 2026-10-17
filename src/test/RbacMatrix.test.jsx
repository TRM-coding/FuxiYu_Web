import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal();
  return { ...antd, message: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } };
});

vi.mock('../contexts/PermissionContext', () => ({
  usePermission: () => ({
    loaded: true,
    hasPermission: code => code === 'rbac:manage',
  }),
}));

vi.mock('../api/rbac_api', () => ({
  createRbacGroup: vi.fn(),
  getRbacMatrix: vi.fn(),
  updateRbacGroupEntities: vi.fn(),
}));

vi.mock('../utils/showErrorModal', () => ({
  default: vi.fn(),
}));

import { message } from 'antd';
import { createRbacGroup, getRbacMatrix, updateRbacGroupEntities } from '../api/rbac_api';
import showErrorModal from '../utils/showErrorModal';
import RbacMatrix from '../pages/RbacMatrix';

/** 覆盖方法实体通配（含 manage）、同域 manage 派生、资源通配与无权限四类场景。 */
const ENTITIES = [
  { id: 1, code: 'machine:view', name: '机器查看' },
  { id: 2, code: 'machine:register', name: '机器接入' },
  { id: 3, code: 'machine:manage', name: '机器管理' },
  { id: 4, code: 'container:create', name: '创建容器' },
  { id: 5, code: 'container:operation', name: '容器操作' },
  { id: 6, code: 'container:manage', name: '容器管理' },
  { id: 7, code: 'image:manage', name: '镜像管理' },
  { id: 8, code: 'settings:manage', name: '系统设置管理' },
  { id: 9, code: 'bypass_auth_entity', name: '权限通配' },
  { id: 10, code: 'bypass_resource', name: '资源通配' },
];

const GROUPS = [
  { id: 10, name: 'user', description: '基础用户组', entity_codes: ['machine:view'], locked_entity_codes: [] },
  {
    id: 11,
    name: 'operator',
    description: '运维组',
    entity_codes: ['bypass_auth_entity'],
    locked_entity_codes: ['bypass_auth_entity'],
  },
  {
    id: 12,
    name: 'container_manager',
    description: '容器管理员',
    entity_codes: ['container:manage'],
    locked_entity_codes: [],
  },
  {
    id: 13,
    name: 'entity_only',
    description: '仅方法通配',
    entity_codes: ['bypass_auth_entity'],
    locked_entity_codes: [],
  },
  {
    id: 14,
    name: 'locked_manager',
    description: '锁定管理',
    entity_codes: ['container:manage'],
    locked_entity_codes: ['container:manage'],
  },
];

const LocationProbe = () => {
  const location = useLocation();
  return <span data-testid="path">{location.pathname}</span>;
};

/** 业务 403 回归需要观察「有没有被导航走」，所以带一个路径探针。 */
const renderPage = (path = '/admin/rbac') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <RbacMatrix />
      <LocationProbe />
    </MemoryRouter>,
  );

/**
 * 等到矩阵真正可交互。
 *
 * 整个矩阵包在 `<Spin spinning={loading}>` 里，而 antd 在转动期间给容器加
 * `.ant-spin-blur { pointer-events: none }` —— 此时 user-event 会以
 * 「元素不可交互」拒绝点击。
 *
 * 要点：**内容在 loading 期间就已渲染**，所以「找得到文本」不等于「可以交互」。
 * 只等 findAllByText 会在 loading 尚未结束时就去点，是否踩中取决于调度快慢——
 * 本地快就过、CI 慢就挂。以「刷新按钮解禁」为完成信号，把这段竞态从结构上消掉。
 */
const waitForMatrixReady = async () => {
  await screen.findAllByText('user');
  await waitFor(() => expect(screen.getByRole('button', { name: /刷新/ })).toBeEnabled());
};

describe('RbacMatrix', () => {
  beforeEach(() => {
    getRbacMatrix.mockReset();
    updateRbacGroupEntities.mockReset();
    createRbacGroup.mockReset();
    showErrorModal.mockReset();
    message.success.mockReset();
    message.warning.mockReset();
    message.error.mockReset();
    localStorage.clear();
    getRbacMatrix.mockResolvedValue({ success: 1, entities: ENTITIES, groups: GROUPS });
    // 回显提交内容，便于断言「保存的 entity_codes 是否明确含/不含直接 manage」。
    updateRbacGroupEntities.mockImplementation(({ group_id, entity_codes }) => Promise.resolve({
      success: 1,
      group: {
        id: group_id,
        name: GROUPS.find(group => group.id === group_id)?.name || 'group',
        description: '',
        entity_codes,
        locked_entity_codes: GROUPS.find(group => group.id === group_id)?.locked_entity_codes || [],
      },
    }));
    createRbacGroup.mockResolvedValue({
      success: 1,
      group: { id: 99, name: 'teacher2', description: '', entity_codes: ['machine:view'], locked_entity_codes: [] },
    });
  });

  it('renders permission chips by entity group and saves selected cells', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RbacMatrix />
      </MemoryRouter>,
    );

    await waitForMatrixReady();
    expect(screen.getAllByText('user').length).toBeGreaterThan(0);
    expect(screen.getByText('机器')).toBeInTheDocument();
    expect(screen.getByText('容器')).toBeInTheDocument();

    // 未赋予：container:manage 显示未启用且可点
    const manageChip = screen.getByRole('button', { name: '开启 container:manage' });
    expect(manageChip).toHaveClass('rbac-permission-chip-off');
    expect(manageChip).toHaveTextContent('未启用');
    expect(manageChip).not.toBeDisabled();

    await user.click(screen.getByRole('button', { name: '开启 container:create' }));
    await user.click(screen.getByRole('button', { name: /保存/ }));

    await waitFor(() => expect(updateRbacGroupEntities).toHaveBeenCalledWith({
      group_id: 10,
      entity_codes: expect.arrayContaining(['machine:view', 'container:create']),
    }));
  });

  it('同域 manage 派生域内普通权限点，manage 自身与跨域不受影响', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RbacMatrix />
      </MemoryRouter>,
    );

    await waitForMatrixReady();
    await user.click(screen.getByRole('button', { name: /container_manager/ }));

    const manageChip = await screen.findByRole('button', { name: '关闭 container:manage' });
    expect(manageChip).toHaveClass('rbac-permission-chip-on');
    expect(manageChip).not.toHaveClass('rbac-permission-chip-covered');
    expect(manageChip).toHaveTextContent('启用');

    const createChip = screen.getByRole('button', { name: '开启 container:create' });
    expect(createChip).toHaveClass('rbac-permission-chip-covered');
    expect(createChip).toHaveClass('rbac-permission-chip-covered-manage');
    expect(createChip).toBeDisabled();
    expect(createChip).toHaveTextContent('管理覆盖');

    expect(screen.getByRole('button', { name: '开启 container:operation' }))
      .toHaveClass('rbac-permission-chip-covered-manage');

    // 跨域：machine:view 不因 container:manage 被覆盖
    const crossDomain = screen.getByRole('button', { name: '开启 machine:view' });
    expect(crossDomain).not.toHaveClass('rbac-permission-chip-covered');
    expect(crossDomain).not.toBeDisabled();
  });

  it('bypass_auth_entity 覆盖 manage 与跨域 manage，但不派生 bypass_resource', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RbacMatrix />
      </MemoryRouter>,
    );

    await waitForMatrixReady();
    await user.click(screen.getByRole('button', { name: '开启 bypass_auth_entity' }));

    expect(screen.getByRole('button', { name: '关闭 bypass_auth_entity' }))
      .toHaveClass('rbac-permission-chip-on');

    // 方法通配覆盖的 manage 仍可直接勾选（直持 manage 才扩资源范围），故不 disabled
    for (const code of ['machine:manage', 'container:manage', 'image:manage', 'settings:manage']) {
      const chip = screen.getByRole('button', { name: `开启 ${code}` });
      expect(chip).toHaveClass('rbac-permission-chip-covered');
      expect(chip).toHaveClass('rbac-permission-chip-covered-auth');
      expect(chip).not.toHaveClass('rbac-permission-chip-covered-manage');
      expect(chip).toHaveClass('rbac-permission-chip-grantable');
      expect(chip).not.toBeDisabled();
      expect(chip).toHaveTextContent('实体通配');
    }

    // 纯方法派生点（非 manage）仍只读
    const derivedOnlyChip = screen.getByRole('button', { name: '开启 container:create' });
    expect(derivedOnlyChip).toHaveClass('rbac-permission-chip-covered-auth');
    expect(derivedOnlyChip).not.toHaveClass('rbac-permission-chip-grantable');
    expect(derivedOnlyChip).toBeDisabled();

    // 直接赋予优先：machine:view 仍显示「启用」，不被通配改写成派生覆盖
    const directChip = screen.getByRole('button', { name: '关闭 machine:view' });
    expect(directChip).toHaveClass('rbac-permission-chip-on');
    expect(directChip).not.toHaveClass('rbac-permission-chip-covered');
    expect(directChip).toHaveTextContent('启用');

    // bypass_resource 不被方法实体通配派生
    const resourceChip = screen.getByRole('button', { name: '开启 bypass_resource' });
    expect(resourceChip).not.toHaveClass('rbac-permission-chip-covered');
    expect(resourceChip).not.toBeDisabled();
  });

  it('仅方法通配的组可直接授予/撤销 manage 以扩大资源范围', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RbacMatrix />
      </MemoryRouter>,
    );

    await waitForMatrixReady();
    await user.click(screen.getByRole('button', { name: /entity_only/ }));

    const manageChip = await screen.findByRole('button', { name: '开启 container:manage' });
    expect(manageChip).toHaveClass('rbac-permission-chip-covered-auth');
    expect(manageChip).toHaveClass('rbac-permission-chip-grantable');
    expect(manageChip).not.toBeDisabled();
    expect(manageChip).toHaveAttribute('title', expect.stringContaining('直接勾选'));

    // 直接授予：chip 转为直接「启用」，不再是派生覆盖
    await user.click(manageChip);
    const grantedChip = screen.getByRole('button', { name: '关闭 container:manage' });
    expect(grantedChip).toHaveClass('rbac-permission-chip-on');
    expect(grantedChip).not.toHaveClass('rbac-permission-chip-covered');
    expect(grantedChip).toHaveTextContent('启用');

    await user.click(screen.getByRole('button', { name: /保存/ }));
    await waitFor(() => expect(updateRbacGroupEntities).toHaveBeenCalledWith({
      group_id: 13,
      entity_codes: expect.arrayContaining(['bypass_auth_entity', 'container:manage']),
    }));

    // 撤销直接 manage：回到方法覆盖，仍可再次授予
    await user.click(screen.getByRole('button', { name: '关闭 container:manage' }));
    const revokedChip = screen.getByRole('button', { name: '开启 container:manage' });
    expect(revokedChip).toHaveClass('rbac-permission-chip-covered-auth');
    expect(revokedChip).toHaveClass('rbac-permission-chip-grantable');
    expect(revokedChip).not.toBeDisabled();
    expect(revokedChip).toHaveTextContent('实体通配');

    // 再直接授予 image:manage 并保存：只含新直持项，不含已撤销的 container:manage
    await user.click(screen.getByRole('button', { name: '开启 image:manage' }));
    await user.click(screen.getByRole('button', { name: /保存/ }));
    await waitFor(() => expect(updateRbacGroupEntities).toHaveBeenLastCalledWith({
      group_id: 13,
      entity_codes: expect.arrayContaining(['bypass_auth_entity', 'image:manage']),
    }));
    expect(updateRbacGroupEntities.mock.calls.at(-1)[0].entity_codes).not.toContain('container:manage');
  });

  it('locked 与 bypass_resource 的不可派生语义不受可授予 manage 影响', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RbacMatrix />
      </MemoryRouter>,
    );

    await waitForMatrixReady();

    // operator：locked bypass 仍锁定不可动
    await user.click(screen.getByRole('button', { name: /operator/ }));
    const lockedBypass = await screen.findByRole('button', { name: '关闭 bypass_auth_entity' });
    expect(lockedBypass).toHaveClass('rbac-permission-chip-locked');
    expect(lockedBypass).toBeDisabled();
    expect(lockedBypass).toHaveTextContent('锁定');

    // 仅方法通配组：bypass_resource 仍不被派生
    await user.click(screen.getByRole('button', { name: /entity_only/ }));
    const resourceChip = screen.getByRole('button', { name: '开启 bypass_resource' });
    expect(resourceChip).not.toHaveClass('rbac-permission-chip-covered');
    expect(resourceChip).not.toHaveClass('rbac-permission-chip-grantable');
    expect(resourceChip).not.toBeDisabled();

    // locked manage 不可直接撤销
    await user.click(screen.getByRole('button', { name: /locked_manager/ }));
    const lockedManage = screen.getByRole('button', { name: '关闭 container:manage' });
    expect(lockedManage).toHaveClass('rbac-permission-chip-locked');
    expect(lockedManage).toBeDisabled();
    expect(lockedManage).toHaveTextContent('锁定');
  });

  it('bypass_resource 仅资源通配语义，不覆盖任何方法权限点', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RbacMatrix />
      </MemoryRouter>,
    );

    await waitForMatrixReady();
    await user.click(screen.getByRole('button', { name: '开启 bypass_resource' }));

    const resourceChip = screen.getByRole('button', { name: '关闭 bypass_resource' });
    expect(resourceChip).toHaveClass('rbac-permission-chip-on');
    expect(resourceChip).toHaveAttribute('title', expect.stringContaining('资源通配'));

    for (const code of ['machine:manage', 'container:create', 'container:manage', 'image:manage', 'settings:manage']) {
      const chip = screen.getByRole('button', { name: `开启 ${code}` });
      expect(chip).not.toHaveClass('rbac-permission-chip-covered');
      expect(chip).not.toBeDisabled();
      expect(chip).toHaveTextContent('未启用');
    }

    expect(screen.getByRole('button', { name: '开启 bypass_auth_entity' }))
      .not.toHaveClass('rbac-permission-chip-covered');
  });

  it('创建角色前按 Ctrl 组名规则校验并给出反馈', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RbacMatrix />
      </MemoryRouter>,
    );

    await waitForMatrixReady();
    await user.click(screen.getByRole('button', { name: /创建新角色/ }));

    const nameInput = screen.getByPlaceholderText('角色名称');
    await user.type(nameInput, '1bad');
    expect(await screen.findByRole('alert')).toHaveTextContent('角色名称必须以英文字母开头');

    await user.click(screen.getByRole('button', { name: /保存/ }));
    expect(createRbacGroup).not.toHaveBeenCalled();
    expect(message.warning).toHaveBeenCalledWith('角色名称必须以英文字母开头');

    await user.clear(nameInput);
    await user.type(nameInput, 'a');
    expect(await screen.findByRole('alert')).toHaveTextContent('角色名称至少 2 个字符');

    await user.clear(nameInput);
    await user.type(nameInput, 'teacher2');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /保存/ }));
    await waitFor(() => expect(createRbacGroup).toHaveBeenCalledWith({
      name: 'teacher2',
      description: '',
      entity_codes: expect.arrayContaining(['machine:view']),
    }));
    expect(message.success).toHaveBeenCalledWith('角色已创建');
  });

  // ── 业务 403：留在本页 + 显示后端原因；401 仍交给全局 ──────────────────────
  // 这是 Q04 收尾的核心回归：一般业务 403 不是认证问题，不能把人踢出当前页。

  it('读取矩阵 403：显示后端拒绝原因，不导航、不清身份', async () => {
    localStorage.setItem('currentUserName', 'op1');
    getRbacMatrix.mockRejectedValue(Object.assign(new Error('failed'), {
      status: 403,
      body: { success: 0, message: '无权限矩阵管理权限', error_reason: 'insufficient_permission' },
    }));

    renderPage();

    await waitFor(() => expect(showErrorModal).toHaveBeenCalledTimes(1));
    expect(showErrorModal.mock.calls[0][0]).toMatchObject({
      title: '读取权限矩阵失败',
      message: '无权限矩阵管理权限',
      status: 403,
    });
    // 留在本页、身份保留
    expect(screen.getByTestId('path')).toHaveTextContent('/admin/rbac');
    expect(localStorage.getItem('currentUserName')).toBe('op1');
  });

  it('保存权限 403：显示后端拒绝原因，不导航、不清身份', async () => {
    const user = userEvent.setup();
    localStorage.setItem('currentUserName', 'op1');
    updateRbacGroupEntities.mockRejectedValue(Object.assign(new Error('failed'), {
      status: 403,
      body: { success: 0, message: '资源权限不足，禁止修改该组', error_reason: 'insufficient_permission' },
    }));

    renderPage();
    await waitForMatrixReady();

    await user.click(screen.getByRole('button', { name: '开启 container:create' }));
    await user.click(screen.getByRole('button', { name: /保存/ }));

    await waitFor(() => expect(showErrorModal).toHaveBeenCalledTimes(1));
    expect(showErrorModal.mock.calls[0][0]).toMatchObject({
      title: '保存权限失败',
      message: '资源权限不足，禁止修改该组',
      status: 403,
    });
    expect(screen.getByTestId('path')).toHaveTextContent('/admin/rbac');
    expect(localStorage.getItem('currentUserName')).toBe('op1');
    // 没有「权限已保存」的成功提示
    expect(message.success).not.toHaveBeenCalledWith('权限已保存');
  });

  it('读取矩阵 401：仍走全局认证处理（回登录页 + 清历史本地身份）', async () => {
    localStorage.setItem('currentUserName', 'op1');
    getRbacMatrix.mockRejectedValue(Object.assign(new Error('expired'), { status: 401 }));

    renderPage();

    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/'));
    // 401 是认证失效：历史本地副本必须清掉（cookie 由服务端持有，前端不碰）
    expect(localStorage.getItem('currentUserName')).toBeNull();
    // 401 不弹业务错误弹窗
    expect(showErrorModal).not.toHaveBeenCalled();
  });
});
