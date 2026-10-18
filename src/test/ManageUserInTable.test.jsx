import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import ManageUserInTable from '../pages/ManageUserInTable';

const EditUserRow = () => <div>editor</div>;

const USER = {
  key: '7',
  username: 'alice',
  email: 'alice@example.com',
  graduation_year: 2024,
  amount_of_container: 1,
};

const CONTAINER = {
  key: '12',
  container_name: 'train-a',
  image_name: 'fuxi/image:1',
  port: '1024',
  effective_status: 'online',
  userRole: 'COLLABORATOR',
};

const longTerm = (overrides = {}) => ({
  stateKnown: true,
  direction: 'disable',
  actionKey: 'long_term_disable',
  checked: true,
  visible: true,
  enabled: true,
  disabled: false,
  reason: null,
  loading: false,
  pending: false,
  ...overrides,
});

const renderTable = (containerRecord = { ...CONTAINER, longTerm: longTerm() }, overrides = {}) => render(
  <ManageUserInTable
    dataSource={[USER]}
    usersLoading={false}
    expandedRowKeys={['7']}
    setExpandedRowKeys={() => {}}
    selectedRowKey="7"
    setSelectedRowKey={() => {}}
    fetchContainersForUser={() => {}}
    getUserContainers={() => [containerRecord]}
    containerMap={{ 7: { data: [containerRecord], loading: false } }}
    handleLongTermChange={() => {}}
    handleRemoveUserFromContainer={() => {}}
    handleDeleteUser={() => {}}
    handleResetPassword={() => {}}
    showUserGroupsAction={false}
    handleOpenUserGroups={() => {}}
    toggleExpand={() => {}}
    renderContainerStatus={status => <span>{status}</span>}
    renderContainerRoleTag={role => <span>{role}</span>}
    EditUserRow={EditUserRow}
    {...overrides}
  />,
);

describe('ManageUserInTable 长期列', () => {
  it('只消费父级 longTerm：方向 true/false 与原因/loading 均来自父级', () => {
    const { unmount } = renderTable({ ...CONTAINER, longTerm: longTerm() });
    let checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
    expect(checkbox).not.toBeDisabled();
    unmount();

    renderTable({
      ...CONTAINER,
      longTerm: longTerm({
        direction: 'enable',
        actionKey: 'long_term_enable',
        checked: false,
        enabled: false,
        disabled: true,
        reason: 'long_term_limit_reached',
      }),
    });
    checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toBeDisabled();
    expect(checkbox.closest('label')?.querySelector('[title]'))
      .toHaveAttribute('title', '绑定用户已达到长期容器上限');
  });

  it('父级未知/非法方向时禁用并显示父级原因，不退回旧字段自算', () => {
    renderTable({
      ...CONTAINER,
      is_long_term: true,
      long_term_container_can_enable: true,
      long_term_container_remaining: 9,
      longTerm: longTerm({
        stateKnown: false,
        direction: null,
        actionKey: null,
        checked: null,
        enabled: false,
        disabled: true,
        reason: 'long_term_state_unknown',
      }),
    });
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toBeDisabled();
    expect(checkbox.closest('label')?.querySelector('[title]'))
      .toHaveAttribute('title', '长期标记未知，无法切换长期状态');
  });

  it('父级未提供 longTerm 时不渲染长期控件，也不回退旧字段', () => {
    renderTable({ ...CONTAINER, is_long_term: true, long_term_container_can_enable: true });
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('保存中显示 loading 并禁用；父级回滚 checked 后不保留未确认目标', () => {
    const { rerender } = renderTable({
      ...CONTAINER,
      longTerm: longTerm({ enabled: false, disabled: true, loading: true }),
    });
    expect(screen.getByRole('checkbox')).toBeDisabled();
    expect(screen.getByText('保存中')).toBeInTheDocument();

    rerender(
      <ManageUserInTable
        dataSource={[USER]}
        usersLoading={false}
        expandedRowKeys={['7']}
        setExpandedRowKeys={() => {}}
        selectedRowKey="7"
        setSelectedRowKey={() => {}}
        fetchContainersForUser={() => {}}
        getUserContainers={() => [{
          ...CONTAINER,
          longTerm: longTerm({
            checked: false,
            direction: 'enable',
            actionKey: 'long_term_enable',
            loading: false,
            reason: 'disk_usage_over_limit',
            enabled: false,
            disabled: true,
          }),
        }]}
        containerMap={{ 7: { data: [CONTAINER], loading: false } }}
        handleLongTermChange={() => {}}
        handleRemoveUserFromContainer={() => {}}
        handleDeleteUser={() => {}}
        handleResetPassword={() => {}}
        showUserGroupsAction={false}
        handleOpenUserGroups={() => {}}
        toggleExpand={() => {}}
        renderContainerStatus={status => <span>{status}</span>}
        renderContainerRoleTag={role => <span>{role}</span>}
        EditUserRow={EditUserRow}
      />,
    );

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toBeDisabled();
    expect(checkbox.closest('label')?.querySelector('[title]'))
      .toHaveAttribute('title', '磁盘用量已达上限，无法设为长期容器');
  });

  it('没有容器删除/启停/解冻入口，用户删除回调仍独立', () => {
    renderTable();
    const expanded = document.querySelector('.manage-user-expanded');
    expect(expanded).not.toBeNull();
    expect(within(expanded).queryByText(/删\s*除容器/)).toBeNull();
    expect(within(expanded).queryByRole('button', { name: /^启\s*动$/ })).toBeNull();
    expect(within(expanded).queryByRole('button', { name: /^停\s*止$/ })).toBeNull();
    expect(within(expanded).queryByRole('button', { name: /解冻/ })).toBeNull();
    expect(screen.getByRole('button', { name: /删\s*除/ })).toBeInTheDocument();
  });
});
