import React from 'react';
import { Modal, Button, Typography, Row, Col, Space, Tag, Avatar } from 'antd';
import { SettingOutlined, GlobalOutlined, ClockCircleOutlined, TeamOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';

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

const ContainerDetailModal = ({ visible, container, onClose, onEdit, onDelete, onLeave, usersList = [], currentUserName = null, forceSystemAdmin = false }) => {
  if (!container) return null;

  const accountsByRole = container.accounts?.reduce((acc, account) => {
    const role = account.role;
    if (!acc[role]) acc[role] = [];
    const ownerName = (usersList.find(u => String(u.id) === String(account.user_id))?.name) || account.username;
    acc[role].push({ ...account, ownerName });
    return acc;
  }, {});

  // 此处判断当前用户是否为ROOT用户
  const currentUserIdFromUsers = usersList?.find(u => u.username === currentUserName)?.id;
  const isRoot = forceSystemAdmin || (container.accounts || []).some(acc => acc.role === ROLE.ROOT && (String(acc.user_id) === String(currentUserIdFromUsers) || acc.username === currentUserName));

  return (
    <Modal title="容器详细信息" open={visible} onCancel={onClose} width={750} footer={[
      <Button key="close" onClick={onClose}>关闭</Button>,
      isRoot ? (
        <Button key="deleteContainer" danger icon={<DeleteOutlined />} onClick={() => onDelete && onDelete(container)}>删除容器</Button>
      ) : (
        <Button key="leave" icon={<DeleteOutlined />} onClick={() => onLeave && onLeave(container)}>解除关联</Button>
      ),
      isRoot ? (
        <Button key="edit" type="primary" icon={<EditOutlined />} onClick={() => { onClose(); onEdit && onEdit(container); }}>编辑用户</Button>
      ) : null
    ]}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #f0f0f0' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>{container.container_name}</Typography.Title>
          <Typography.Text type="secondary">容器ID: {container.key}</Typography.Text>
        </div>

        <div style={{ background: '#fafafa', padding: 20, borderRadius: 8, marginBottom: 24, border: '1px solid #f0f0f0' }}>
          <Row gutter={[24, 16]}>
            <Col span={6}>
              <Space align="start">
                <SettingOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                <div>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>容器状态</Typography.Text>
                  <Tag color={container.container_status === 'online' ? 'green' : 'orange'}>{container.container_status === 'online' ? '运行中' : '维护中'}</Tag>
                </div>
              </Space>
            </Col>

            <Col span={6}>
              <Space align="start">
                <GlobalOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                <div>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>所属机器ID</Typography.Text>
                  <Typography.Text style={{ fontSize: '16px' }}>{container.machine_id || container.machine_ip}</Typography.Text>
                </div>
              </Space>
            </Col>

            <Col span={6}>
              <Space align="start">
                <ClockCircleOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                <div>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>镜像</Typography.Text>
                  <Typography.Text style={{ fontSize: '14px' }} ellipsis={{ tooltip: container.container_image }}>{container.container_image}</Typography.Text>
                </div>
              </Space>
            </Col>

            <Col span={6}>
              <Space align="start">
                <SettingOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                <div>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>端口映射</Typography.Text>
                  <Tag color="purple">{container.port}</Tag>
                </div>
              </Space>
            </Col>
          </Row>
        </div>

        <div style={{ marginBottom: 24 }}>
          <Typography.Title level={5} style={{ marginBottom: 16 }}><TeamOutlined style={{ marginRight: 8 }} /> 用户权限 ({container.accounts?.length || 0}人)</Typography.Title>

          {Object.entries(accountsByRole || {}).map(([role, accounts]) => (
            <div key={role} style={{ marginBottom: 20 }}>
              <div style={{ background: '#f6f8fa', padding: '12px 16px', borderRadius: '6px 6px 0 0', border: '1px solid #e1e4e8' }}>
                <Space>
                  <Typography.Text strong>{formatRole(role)}</Typography.Text>
                  <Tag color={getRoleColor(role)} style={{ marginLeft: 8 }}>{accounts.length}人</Tag>
                </Space>
                <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: '12px' }}>{ROLE_CONFIG[role]?.description}</Typography.Text>
              </div>

              <div style={{ border: '1px solid #e1e4e8', borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '16px' }}>
                <Row gutter={[16, 16]}>
                  {accounts.map((account, index) => (
                    <Col span={12} key={index}>
                      <Space align="center" style={{ width: '100%' }}>
                        <Avatar src={getAvatarUrl(account.username)} size="large" />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography.Text strong>{account.ownerName}</Typography.Text>
                          </div>
                          <Typography.Text type="secondary" style={{ display: 'block' }}>@{account.username}</Typography.Text>
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
