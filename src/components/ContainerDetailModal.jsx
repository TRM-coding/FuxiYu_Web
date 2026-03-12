import React from 'react';
import { Modal, Button, Typography, Row, Col, Space, Tag, Avatar } from 'antd';
import { SettingOutlined, GlobalOutlined, ClockCircleOutlined, TeamOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import './ContainerDetailModal.css';

const ROLE = {
  ADMIN: 'ADMIN',
  COLLABORATOR: 'COLLABORATOR',
  ROOT: 'ROOT'
};

const ROLE_CONFIG = {
  [ROLE.ROOT]: { label: '超级管理员', color: 'red', icon: null, description: '拥有最高权限，可管理所有容器和用户' },
  [ROLE.ADMIN]: { label: '管理员', color: 'blue', icon: null, description: '可管理指定容器的所有操作' },
  [ROLE.COLLABORATOR]: { label: '协作者', color: 'green', icon: null, description: '可使用容器，但操作权限有限' }
};

const getAvatarUrl = (username) => `https://api.dicebear.com/7.x/miniavs/svg?seed=${username}`;
const formatRole = (role) => (ROLE_CONFIG[role] ? ROLE_CONFIG[role].label : role);
const getRoleColor = (role) => (ROLE_CONFIG[role] ? ROLE_CONFIG[role].color : 'default');

const ContainerDetailModal = ({ visible, container, onClose, onEdit, onDelete, onLeave, usersList = [], currentUserName = null, currentUserId = null, forceSystemAdmin = false }) => {
  if (!container) return null;

  const accountsByRole = container.accounts?.reduce((acc, account) => {
    const role = account.role;
    if (!acc[role]) acc[role] = [];
    const ownerName = (usersList.find(u => String(u.id) === String(account.user_id))?.name) || account.username;
    acc[role].push({ ...account, ownerName });
    return acc;
  }, {});

  // 使用 user_id 精确判断当前用户是否为 ROOT（避免 username 修改导致匹配失败）
  const isRoot = forceSystemAdmin || (container.accounts || []).some(acc => acc.role === ROLE.ROOT && String(acc.user_id) === String(currentUserId));

  const statusColor = container.container_status === 'online'
    ? 'green'
    : container.container_status === 'offline'
      ? 'volcano'
      : container.container_status === 'creating'
        ? 'blue'
        : container.container_status === 'starting'
          ? 'cyan'
          : container.container_status === 'stopping'
            ? 'orange'
            : container.container_status === 'failed'
              ? 'red'
              : 'default';
   const statusText = container.container_status === 'online'
    ? '运行中'
    : container.container_status === 'offline'
      ? '已停止'
      : container.container_status === 'creating'
        ? '创建中'
        : container.container_status === 'starting'
          ? '启动中'
          : container.container_status === 'stopping'
            ? '停止中'
            : container.container_status === 'failed'
              ? '异常'
              : container.container_status;

  return (
    <Modal title="容器详细信息" open={visible} onCancel={onClose} width="min(750px, calc(100vw - 24px))" className="cdm-modal" footer={[
      <Button key="close" onClick={onClose}>关闭</Button>,
      isRoot ? (
        <Button key="deleteContainer" danger icon={<DeleteOutlined />} onClick={() => onDelete && onDelete(container)}>删除容器</Button>
      ) : (
        <Button key="leave" icon={<DeleteOutlined />} disabled={container.container_status !== 'online'} onClick={() => onLeave && onLeave(container)}>解除关联</Button>
      ),
      isRoot ? (
        <Button key="edit" type="primary" icon={<EditOutlined />} disabled={container.container_status !== 'online'} onClick={() => { onEdit && onEdit(container); }}>编辑用户</Button>
      ) : null
    ]}>
      <div className="cdm-body">
        <div className="cdm-header">
          <Typography.Title level={4} className="cdm-title">{container.container_name}</Typography.Title>
          <Typography.Text type="secondary">容器ID: {container.key}</Typography.Text>
        </div>

        <div className="cdm-summary-card">
          <Row gutter={[24, 16]}>
            <Col xs={12} sm={12} md={6}>
              <Space align="start">
                <SettingOutlined className="cdm-icon" />
                <div>
                  <Typography.Text strong className="cdm-item-label">容器状态</Typography.Text>
                  <Tag color={statusColor}>
                    {statusText}
                  </Tag>
                </div>
              </Space>
            </Col>

            <Col xs={12} sm={12} md={6}>
              <Space align="start">
                <GlobalOutlined className="cdm-icon" />
                <div>
                  <Typography.Text strong className="cdm-item-label">所属机器 IP</Typography.Text>
                  <Typography.Text className="cdm-machine-text">{container.machine_ip || container.machine_id}</Typography.Text>
                </div>
              </Space>
            </Col>

            <Col xs={12} sm={12} md={6}>
              <Space align="start">
                <ClockCircleOutlined className="cdm-icon" />
                <div>
                  <Typography.Text strong className="cdm-item-label">镜像</Typography.Text>
                  <Typography.Text className="cdm-image-text" ellipsis={{ tooltip: container.container_image }}>{container.container_image}</Typography.Text>
                </div>
              </Space>
            </Col>

            <Col xs={12} sm={12} md={6}>
              <Space align="start">
                <SettingOutlined className="cdm-icon" />
                <div>
                  <Typography.Text strong className="cdm-item-label">端口映射</Typography.Text>
                  <Tag color="purple">{container.port}</Tag>
                </div>
              </Space>
            </Col>
          </Row>
        </div>

        <div className="cdm-resources-card">
          <Row gutter={[24, 16]}>
            <Col xs={12} sm={12} md={6}>
              <Space align="start">
                <SettingOutlined className="cdm-icon" />
                <div>
                  <Typography.Text strong className="cdm-item-label">CPU 核数</Typography.Text>
                  <Typography.Text className="cdm-machine-text">{container.cpu_number ?? container.cpu_number === 0 ? String(container.cpu_number) : '-'}</Typography.Text>
                </div>
              </Space>
            </Col>

            <Col xs={12} sm={12} md={6}>
              <Space align="start">
                <SettingOutlined className="cdm-icon" />
                <div>
                  <Typography.Text strong className="cdm-item-label">GPU 数量</Typography.Text>
                  <Typography.Text className="cdm-machine-text">{container.gpu_number ?? container.gpu_number === 0 ? String(container.gpu_number) : '-'}</Typography.Text>
                </div>
              </Space>
            </Col>

            <Col xs={12} sm={12} md={6}>
              <Space align="start">
                <ClockCircleOutlined className="cdm-icon" />
                <div>
                  <Typography.Text strong className="cdm-item-label">内存 (GB)</Typography.Text>
                  <Typography.Text className="cdm-machine-text">{container.memory_gb ?? container.memory_gb === 0 ? String(container.memory_gb) : '-'}</Typography.Text>
                </div>
              </Space>
            </Col>

            <Col xs={12} sm={12} md={6}>
              <Space align="start">
                <GlobalOutlined className="cdm-icon" />
                <div>
                  <Typography.Text strong className="cdm-item-label">Swap (GB)</Typography.Text>
                  <Typography.Text className="cdm-machine-text">{container.swap_gb ?? container.swap_gb === 0 ? String(container.swap_gb) : '-'}</Typography.Text>
                </div>
              </Space>
            </Col>
          </Row>
        </div>

        <div className="cdm-roles-wrap">
          <Typography.Title level={5} className="cdm-roles-title"><TeamOutlined className="cdm-roles-icon" /> 用户权限 ({container.accounts?.length || 0}人)</Typography.Title>

          {Object.entries(accountsByRole || {}).map(([role, accounts]) => (
            <div key={role} className="cdm-role-group">
              <div className="cdm-role-header">
                <Space>
                  <Typography.Text strong>{formatRole(role)}</Typography.Text>
                  <Tag color={getRoleColor(role)} className="cdm-role-count">{accounts.length}人</Tag>
                </Space>
                <Typography.Text type="secondary" className="cdm-role-desc">{ROLE_CONFIG[role]?.description}</Typography.Text>
              </div>

              <div className="cdm-role-body">
                <Row gutter={[16, 16]}>
                  {accounts.map((account, index) => (
                    <Col xs={24} sm={24} md={12} key={index}>
                      <Space align="center" className="cdm-account-item">
                        <Avatar src={getAvatarUrl(account.username)} size="large" />
                        <div className="cdm-account-meta">
                          <div className="cdm-account-row">
                            <Typography.Text strong>{account.ownerName}</Typography.Text>
                          </div>
                          <Typography.Text type="secondary" className="cdm-account-username">@{account.username}</Typography.Text>
                        </div>
                      </Space>
                    </Col>
                  ))}
                </Row>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default ContainerDetailModal;
