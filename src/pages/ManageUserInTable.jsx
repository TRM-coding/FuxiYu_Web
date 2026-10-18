import React from 'react';
import { DownOutlined, ReloadOutlined, UpOutlined } from '@ant-design/icons';
import { Button, Card, Checkbox, Space, Table, Typography } from 'antd';
import TableComponent from '../components/TableComponent';
import { getContainerActionReasonText } from '../utils/containerActions';

const { Column } = Table;

const ManageUserInTable = ({
  dataSource,
  usersLoading,
  expandedRowKeys,
  setExpandedRowKeys,
  selectedRowKey,
  setSelectedRowKey,
  fetchContainersForUser,
  getUserContainers,
  containerMap,
  handleLongTermChange,
  handleRemoveUserFromContainer,
  handleDeleteUser,
  handleResetPassword,
  showUserGroupsAction,
  handleOpenUserGroups,
  toggleExpand,
  renderContainerStatus,
  renderContainerRoleTag,
  EditUserRow,
}) => (
  <div className="manage-user-table-wrap">
    <div className="manage-user-section-heading manage-user-section-heading-compact">
      <div>
        <Typography.Title level={4}>用户列表</Typography.Title>
      </div>
    </div>
    <TableComponent
      dataSource={dataSource}
      rowKey="key"
      loading={usersLoading}
      pagination={{ pageSize: 10 }}
      bordered
      scroll={{ x: true }}
      expandable={{
        expandedRowKeys,
        onExpandedRowsChange: (expandedKeys) => {
          setExpandedRowKeys(expandedKeys);
        },
        onExpand: (expanded, record) => {
          if (expanded) {
            fetchContainersForUser(record.key);
          }
        },
        showExpandColumn: false,
        expandedRowRender: (record) => (
          <div className={"manage-user-expanded" + (String(record.key) === String(selectedRowKey) ? ' manage-user-expanded-selected' : '')}>
            <div className="manage-user-section-title">
              <Typography.Text strong className="manage-user-section-title-text">
                编辑用户信息 - {record.username}
              </Typography.Text>
            </div>

            <div className="manage-user-edit-card">
              <EditUserRow record={record} />
            </div>

            <Card
              title={(
                <div className="manage-user-card-title">
                  <span>{record.username} 的容器</span>
                  <Button size="small" onClick={() => fetchContainersForUser(record.key)} icon={<ReloadOutlined />} />
                </div>
              )}
              bordered
            >
              {(() => {
                const id = String(record.key);
                const childData = getUserContainers(record.username);
                const loading = !!(containerMap[id] && containerMap[id].loading);
                return (
                  <TableComponent
                    dataSource={childData}
                    rowKey="key"
                    pagination={childData.length > 5 ? { pageSize: 5 } : false}
                    bordered
                    size="middle"
                    loading={loading}
                  >
                    <Column title="容器ID" dataIndex="key" key="key" />
                    <Column title="容器名称" dataIndex="container_name" key="container_name" />
                    <Column title="容器镜像" dataIndex="image_name" key="image_name" />
                    <Column title="端口" dataIndex="port" key="port" />
                    <Column title="容器状态" dataIndex="effective_status" key="effective_status" render={renderContainerStatus} />
                    <Column title="用户角色" dataIndex="userRole" key="userRole" render={renderContainerRoleTag} />
                    <Column
                      title="长期容器"
                      dataIndex="longTerm"
                      key="longTerm"
                      render={(_, containerRecord) => {
                        // 只消费父组件传入的共享 longTerm 结果，不在表格内重算旧资格字段。
                        const longTerm = containerRecord?.longTerm;
                        if (!longTerm || !longTerm.visible) return null;
                        return (
                          <Space size={4}>
                            <Checkbox
                              checked={longTerm.checked === true}
                              disabled={longTerm.disabled}
                              title={getContainerActionReasonText(longTerm.reason) || undefined}
                              onChange={e => handleLongTermChange(record, containerRecord, e.target.checked)}
                            />
                            {longTerm.loading && (
                              <Typography.Text type="secondary" className="manage-user-long-term-saving">保存中</Typography.Text>
                            )}
                          </Space>
                        );
                      }}
                    />
                    <Column
                      title="操作"
                      key="action"
                      render={(_, containerRecord) => {
                        const role = containerRecord.userRole || containerRecord.role || '';
                        if (String(role).toUpperCase() === 'ROOT') {
                          return <Button size="small" disabled>不可移除所有者</Button>;
                        }
                        return (
                          <Button danger size="small" onClick={() => handleRemoveUserFromContainer(record.username, containerRecord)}>
                            移除关联
                          </Button>
                        );
                      }}
                    />
                  </TableComponent>
                );
              })()}
            </Card>
          </div>
        ),
      }}
      rowClassName={(record) => (String(record.key) === String(selectedRowKey) ? 'manage-user-selected-row' : '')}
      onRow={(record) => ({
        onClick: () => {
          setSelectedRowKey(String(record.key));
        },
      })}
    >
      <Column title="用户ID" dataIndex="key" key="key" />
      <Column title="用户名" dataIndex="username" key="username" />
      <Column title="邮箱" dataIndex="email" key="email" />
      <Column title="毕业年份" dataIndex="graduation_year" key="graduation_year" />
      <Column
        title="操作"
        key="action"
        render={(_, record) => {
          const isExpanded = expandedRowKeys.includes(record.key);
          return (
            <Space size="small">
              <Button
                type="text"
                icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
                onClick={() => toggleExpand(record.key)}
                className="manage-user-action-edit"
              >
                {isExpanded ? '收起编辑' : '编辑用户'}
              </Button>
              <Button onClick={() => handleDeleteUser(record)}>
                <a className="manage-user-action-delete">删除</a>
              </Button>
              <Button onClick={() => handleResetPassword(record)}>
                <a className="manage-user-action-reset">重置密码</a>
              </Button>
              {showUserGroupsAction && (
                <Button onClick={() => handleOpenUserGroups(record)}>
                  <a className="manage-user-action-groups">权限组</a>
                </Button>
              )}
            </Space>
          );
        }}
      />
      <Column
        title="统计信息"
        key="stats"
        render={(_, record) => {
          const totalContainers = record.amount_of_container ?? record.amountOfContainer ?? (record.containers ? record.containers.length : 0) ?? 0;
          const runningContainers = record.amount_of_functional_container ?? record.amountOfFunctionalContainer ?? 0;
          const managedContainers = record.amount_of_managed_container ?? record.amountOfManagedContainer ?? 0;
          const longTermContainers = record.amount_of_long_term_container ?? record.amountOfLongTermContainer ?? 0;

          return (
            <span className="manage-user-stats">
              <span className="manage-user-stats-key">容器: </span>
              <span className="manage-user-stats-value-blue">{totalContainers}</span>
              <span className="manage-user-stats-sep">·</span>
              <span className="manage-user-stats-key">正常: </span>
              <span className="manage-user-stats-value-green">{runningContainers}</span>
              <span className="manage-user-stats-sep">·</span>
              <span className="manage-user-stats-key">由ta管理: </span>
              <span className="manage-user-stats-value-yellow">{managedContainers}</span>
              <span className="manage-user-stats-sep">·</span>
              <span className="manage-user-stats-key">长期: </span>
              <span className="manage-user-stats-value-purple">{longTermContainers}</span>
            </span>
          );
        }}
      />
    </TableComponent>
  </div>
);

export default ManageUserInTable;
