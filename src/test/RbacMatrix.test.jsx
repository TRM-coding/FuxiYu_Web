import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { getRbacMatrix, updateRbacGroupEntities } from '../api/rbac_api';
import RbacMatrix from '../pages/RbacMatrix';

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
    getRbacMatrix.mockResolvedValue({
      success: 1,
      entities: [
        { id: 1, code: 'machine:view', name: '机器查看' },
        { id: 2, code: 'machine:manage', name: '机器管理' },
        { id: 3, code: 'container:create', name: '创建容器' },
        { id: 4, code: 'container:operation', name: '容器操作' },
        { id: 5, code: 'container:manage', name: '容器管理' },
        { id: 6, code: 'bypass_auth_entity', name: '权限通配' },
        { id: 7, code: 'bypass_resource', name: '资源通配' },
      ],
      groups: [
        { id: 10, name: 'user', description: '基础用户组', entity_codes: ['machine:view'], locked_entity_codes: [] },
        { id: 11, name: 'operator', description: '运维组', entity_codes: ['bypass_auth_entity'], locked_entity_codes: ['bypass_auth_entity'] },
      ],
    });
    updateRbacGroupEntities.mockResolvedValue({
      success: 1,
      group: { id: 10, name: 'user', description: '基础用户组', entity_codes: ['machine:view', 'container:create'], locked_entity_codes: [] },
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
    expect(screen.getByRole('button', { name: '开启 container:create' })).toHaveClass('rbac-permission-chip-off');

    await user.click(screen.getByRole('button', { name: '开启 container:create' }));
    await user.click(screen.getByRole('button', { name: /保存/ }));

    await waitFor(() => expect(updateRbacGroupEntities).toHaveBeenCalledWith({
      group_id: 10,
      entity_codes: expect.arrayContaining(['machine:view', 'container:create']),
    }));
  });

  it('shows manage as covering lower permissions in the same entity group', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RbacMatrix />
      </MemoryRouter>,
    );

    await waitForMatrixReady();

    await user.click(screen.getByRole('button', { name: '开启 container:create' }));
    await user.click(screen.getByRole('button', { name: '开启 container:manage' }));

    const createButton = screen.getByRole('button', { name: '关闭 container:create' });
    expect(createButton).toHaveClass('rbac-permission-chip-covered');
    expect(createButton).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /保存/ }));

    await waitFor(() => expect(updateRbacGroupEntities).toHaveBeenCalledWith({
      group_id: 10,
      entity_codes: expect.arrayContaining(['machine:view', 'container:create', 'container:manage']),
    }));
  });

  it('shows bypass hierarchy without expanding into a sparse table', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <RbacMatrix />
      </MemoryRouter>,
    );

    await waitForMatrixReady();

    await user.click(screen.getByRole('button', { name: '开启 bypass_auth_entity' }));

    const createButton = screen.getByRole('button', { name: '开启 container:create' });
    const manageButton = screen.getByRole('button', { name: '开启 container:manage' });
    expect(createButton).toHaveClass('rbac-permission-chip-covered');
    expect(createButton).toBeDisabled();
    expect(manageButton).not.toHaveClass('rbac-permission-chip-covered');
    expect(manageButton).not.toBeDisabled();

    await user.click(screen.getByRole('button', { name: '开启 bypass_resource' }));

    expect(screen.getByRole('button', { name: '开启 container:manage' })).toHaveClass('rbac-permission-chip-covered');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
