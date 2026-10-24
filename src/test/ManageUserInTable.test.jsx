import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
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

const pageContainers = (names) => names.map((name, index) => ({
  ...CONTAINER,
  key: String(100 + index),
  container_id: String(100 + index),
  container_name: name,
}));

const tableProps = (overrides = {}) => ({
  dataSource: [USER],
  usersLoading: false,
  expandedRowKeys: ['7'],
  setExpandedRowKeys: () => {},
  selectedRowKey: '7',
  setSelectedRowKey: () => {},
  fetchContainersForUser: () => {},
  getUserContainers: () => [],
  containerMap: {},
  handleLongTermChange: () => {},
  handleRemoveUserFromContainer: () => {},
  handleDeleteUser: () => {},
  handleResetPassword: () => {},
  showUserGroupsAction: false,
  handleOpenUserGroups: () => {},
  toggleExpand: () => {},
  renderContainerStatus: status => <span>{status}</span>,
  renderContainerRoleTag: role => <span>{role}</span>,
  EditUserRow,
  ...overrides,
});

const firstPageEntry = (data) => ({
  7: {
    data,
    total_number: 6,
    total_page: 2,
    page: 0,
    page_size: 4,
    loading: false,
  },
});

describe('ManageUserInTable 行操作与子容器分页', () => {
  it('test_q60_edit_action_does_not_select_row', () => {
    const setSelectedRowKey = vi.fn();
    const toggleExpand = vi.fn();
    render(<ManageUserInTable {...tableProps({ expandedRowKeys: [], setSelectedRowKey, toggleExpand })} />);

    fireEvent.click(screen.getByRole('button', { name: /编辑用户/ }));

    expect(toggleExpand).toHaveBeenCalledWith('7');
    expect(setSelectedRowKey).not.toHaveBeenCalled();
  });

  it('test_q60_other_actions_do_not_bubble', () => {
    const setSelectedRowKey = vi.fn();
    const toggleExpand = vi.fn();
    const handleDeleteUser = vi.fn();
    const handleResetPassword = vi.fn();
    const handleOpenUserGroups = vi.fn();

    render(<ManageUserInTable {...tableProps({
      expandedRowKeys: [],
      setSelectedRowKey,
      toggleExpand,
      handleDeleteUser,
      handleResetPassword,
      handleOpenUserGroups,
      showUserGroupsAction: true,
    })} />);

    fireEvent.click(screen.getByRole('button', { name: /删\s*除/ }));
    fireEvent.click(screen.getByRole('button', { name: /重置密码/ }));
    fireEvent.click(screen.getByRole('button', { name: /权限组/ }));

    expect(handleDeleteUser).toHaveBeenCalledTimes(1);
    expect(handleResetPassword).toHaveBeenCalledTimes(1);
    expect(handleOpenUserGroups).toHaveBeenCalledTimes(1);
    expect(setSelectedRowKey).not.toHaveBeenCalled();
    expect(toggleExpand).not.toHaveBeenCalled();
  });

  it('test_q59_six_containers_second_page_reachable', () => {
    const firstPage = pageContainers(['train-a', 'train-b', 'train-c', 'train-d']);
    const secondPage = pageContainers(['train-e', 'train-f']);
    const fetchContainersForUser = vi.fn();
    const before = tableProps({
      fetchContainersForUser,
      getUserContainers: () => firstPage,
      containerMap: firstPageEntry(firstPage),
    });

    const { rerender } = render(<ManageUserInTable {...before} />);

    const expanded = document.querySelector('.manage-user-expanded');
    expect(expanded).not.toBeNull();
    expect(within(expanded).getByText('train-d')).toBeInTheDocument();
    const pagination = expanded.querySelector('.ant-pagination');
    expect(pagination).not.toBeNull();
    expect(within(pagination).getByTitle('2')).toBeInTheDocument();

    fireEvent.click(within(pagination).getByTitle('2'));
    expect(fetchContainersForUser).toHaveBeenCalledWith('7', 1);

    rerender(<ManageUserInTable {...{
      ...before,
      fetchContainersForUser,
      getUserContainers: () => secondPage,
      containerMap: {
        7: {
          data: secondPage,
          total_number: 6,
          total_page: 2,
          page: 1,
          page_size: 4,
          loading: false,
        },
      },
    }} />);

    const secondExpanded = document.querySelector('.manage-user-expanded');
    expect(within(secondExpanded).getByText('train-e')).toBeInTheDocument();
    expect(within(secondExpanded).getByText('train-f')).toBeInTheDocument();
    expect(fetchContainersForUser).toHaveBeenCalledTimes(1);
  });

  it('test_q59_total_at_most_four_no_pagination', () => {
    const four = pageContainers(['train-a', 'train-b', 'train-c', 'train-d']);
    const fetchContainersForUser = vi.fn();
    render(<ManageUserInTable {...tableProps({
      fetchContainersForUser,
      getUserContainers: () => four,
      containerMap: {
        7: {
          data: four,
          total_number: 4,
          total_page: 1,
          page: 0,
          page_size: 4,
          loading: false,
        },
      },
    })} />);

    const expanded = document.querySelector('.manage-user-expanded');
    expect(expanded).not.toBeNull();
    expect(expanded.querySelector('.ant-pagination')).toBeNull();
    expect(fetchContainersForUser).not.toHaveBeenCalled();
  });
});
