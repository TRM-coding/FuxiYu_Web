import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Space, Typography, Row, Col, Select, Tag, Avatar, List, message } from 'antd';
import showErrorModal from '../utils/showErrorModal';
import { EditOutlined, PlusOutlined, TeamOutlined, DeleteOutlined } from '@ant-design/icons';
import { addCollaborator, removeCollaborator, updateRole } from '../api/container_api';
import './EditUserModal.css';

const { Option } = Select;

const ROLE = {
  ADMIN: 'ADMIN',
  COLLABORATOR: 'COLLABORATOR',
  ROOT: 'ROOT'
};

const ROLE_CONFIG = {
  [ROLE.ROOT]: { label: '超级管理员', color: 'red' },
  [ROLE.ADMIN]: { label: '管理员', color: 'blue' },
  [ROLE.COLLABORATOR]: { label: '协作者', color: 'green' }
};

const getAvatarUrl = (username) => `https://api.dicebear.com/7.x/miniavs/svg?seed=${username}`;

const EditUserModal = ({ visible, container, onClose, onBack, usersList = [], usersLoading = false, forceSystemAdmin = false }) => {
  const [form] = Form.useForm();
  // editing state removed (no local save flow)
  const [accounts, setAccounts] = useState([]);
  const [adding, setAdding] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(ROLE.COLLABORATOR);

  useEffect(() => {
    if (container) {
      const initialAccounts = container.accounts?.map((account) => ({
        ...account,
        user_id: account.user_id ?? account.id ?? null,
        ownerName: (usersList.find(u => String(u.id) === String(account.user_id))?.name) || account.username,
        key: String(account.user_id ?? account.username)
      })) || [];
      setAccounts(initialAccounts);
      form.setFieldsValue({ accounts: initialAccounts });
    }
  }, [container, form, usersList]);

  const handleAddUser = async () => {
    if (!selectedUser) {
      message.warning('请选择要添加的用户');
      return;
    }
    const userExists = accounts.some(account => String(account.user_id) === String(selectedUser.id));
    if (userExists) {
      message.warning('该用户已存在');
      return;
    }
    const cid = container?.key || container?.container_id;
    if (!cid) {
      await showErrorModal({ message: '未能识别容器ID，无法添加用户' });
      return;
    }
    setAdding(true);
    addCollaborator({ user_id: selectedUser.id, container_id: cid, role: selectedRole }).then(() => {
      const newAccount = {
        username: selectedUser.username,
        role: selectedRole,
        ownerName: selectedUser.name,
        user_id: selectedUser.id,
        key: String(selectedUser.id)
      };
      if (selectedRole === ROLE.ROOT) {
        const demoted = accounts.map(acc => acc.role === ROLE.ROOT ? { ...acc, role: ROLE.ADMIN } : acc);
        setAccounts([...demoted, newAccount]);
      } else {
        setAccounts(prev => [...prev, newAccount]);
      }
      setSelectedUser(null);
      setSelectedRole(ROLE.COLLABORATOR);
      message.success('用户已添加');
    }).catch(async err => {
    console.error('addCollaborator failed', err);
    const bodyMsg = err?.body?.message || err?.body || null;
    const messageText = bodyMsg ? `添加用户失败: ${bodyMsg}` : '添加用户失败';
    await showErrorModal({ message: err?.body || err || messageText, status: err?.status || err?.response?.status || err?.status, route: err?.route || err?.response?.url });
    }).finally(() => setAdding(false));
  };

  const handleDeleteUser = async (userId) => {
    const userToDelete = accounts.find(acc => String(acc.user_id) === String(userId));
    if (!userToDelete) return;
    if (userToDelete.role === ROLE.ROOT) {
      await showErrorModal({ message: '不能删除超级管理员' });
      return;
    }
    const cid = container?.key || container?.container_id;
    if (!userId || !cid) {
      await showErrorModal({ message: '缺少后端ID信息，无法删除用户' });
      return;
    }
    try {
      await removeCollaborator({ user_id: userId, container_id: cid });
      setAccounts(prev => prev.filter(acc => String(acc.user_id) !== String(userId)));
      message.success('用户已移除');
    } catch (err) {
      console.error('removeCollaborator failed', err);
      const bodyMsg = err?.body?.message || err?.body || null;
      const messageText = bodyMsg ? `移除用户失败: ${bodyMsg}` : '移除用户失败';
      await showErrorModal({ message: err?.body || err || messageText, status: err?.status || err?.response?.status || err?.status, route: err?.route || err?.response?.url });
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    const userToUpdate = accounts.find(acc => String(acc.user_id) === String(userId));
    if (!userToUpdate) return;
    if (userToUpdate.role === ROLE.ROOT) {
      await showErrorModal({ message: '超级管理员身份不可被修改' });
      return;
    }
    const resolvedUserId = userToUpdate.user_id;
    const cid = container?.key || container?.container_id;
    if (!resolvedUserId || !cid) {
      await showErrorModal({ message: '缺少后端ID信息，无法更新角色' });
      return;
    }
    try {
      if (newRole === ROLE.ROOT) {
        const roots = accounts.filter(acc => acc.role === ROLE.ROOT && String(acc.user_id) !== String(resolvedUserId));
        for (const r of roots) {
          const rid = r.user_id;
          if (rid) {
            await updateRole({ container_id: cid, user_id: rid, updated_role: ROLE.ADMIN });
          }
        }
        await updateRole({ container_id: cid, user_id: resolvedUserId, updated_role: ROLE.ROOT });
        setAccounts(prev => prev.map(acc => {
          if (String(acc.user_id) === String(resolvedUserId)) return { ...acc, role: ROLE.ROOT, username: 'root' };
          if (acc.role === ROLE.ROOT) {
            // demoted root -> restore username from usersList when possible
            const restored = usersList.find(u => String(u.id) === String(acc.user_id));
            return { ...acc, role: ROLE.ADMIN, username: restored ? restored.username : acc.username };
          }
          return acc;
        }));
          message.success('角色已更新');
          // 转让后关闭编辑窗口
          try {
            const currentUid = localStorage.getItem('currentUserId');
            if (String(resolvedUserId) !== String(currentUid) && !forceSystemAdmin) {
              onClose();
            }
          } catch (e) {
            // ignore
          }
          return;
      }
      await updateRole({ container_id: cid, user_id: resolvedUserId, updated_role: newRole });
      setAccounts(prev => prev.map(acc => {
        if (String(acc.user_id) !== String(resolvedUserId)) return acc;
        // If demoting from ROOT, restore username from usersList if possible
        if (newRole !== ROLE.ROOT && acc.role === ROLE.ROOT) {
          const restored = usersList.find(u => String(u.id) === String(acc.user_id));
          return { ...acc, role: newRole, username: restored ? restored.username : acc.username };
        }
        // If promoting to ROOT, set username to 'root'
        if (newRole === ROLE.ROOT) {
          return { ...acc, role: newRole, username: 'root' };
        }
        return { ...acc, role: newRole };
      }));
      message.success('角色已更新');
    } catch (err) {
      console.error('updateRole failed', err);
      const bodyMsg = err?.body?.message || err?.body || null;
      const messageText = bodyMsg ? `更新角色失败: ${bodyMsg}` : '更新角色失败';
      await showErrorModal({ message: err?.body || err || messageText, status: err?.status || err?.response?.status || err?.status, route: err?.route || err?.response?.url });
    }
  };


  const availableUsers = (usersList || []).filter(user => !accounts.some(acc => String(acc.user_id) === String(user.id)));

  return (
    <Modal
      title={(
        <Space>
          <EditOutlined />
          <span>编辑容器用户权限 - {container?.container_name}</span>
        </Space>
      )}
      open={visible}
      onCancel={() => { onBack();  }}
      width="min(800px, calc(100vw - 24px))"
      className="eum-modal"
      footer={[
        <Button key="back" onClick={() => { onBack(); }}>返回详情页</Button>,
        <Button key="done" type="primary" onClick={async () => { onClose(); }}>完成</Button>
      ]}
    >
      <Form form={form} layout="vertical">
        <div className="eum-body">
          <Typography.Text type="secondary" className="eum-subtitle">
            当前容器: {container?.container_name} | 所属机器ID: {container?.machine_id || container?.machine_ip}
          </Typography.Text>

          <div className="eum-add-card">
            <Typography.Title level={5} className="eum-section-title">
              <PlusOutlined /> 添加新用户
            </Typography.Title>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={24} md={10}>
                <Select
                  placeholder="点击选择"
                  className="eum-full-width"
                  value={selectedUser?.id ?? undefined}
                  disabled={usersLoading}
                  onChange={(value) => { const user = usersList.find(u => String(u.id) === String(value)); setSelectedUser(user || null); }}
                  showSearch={false}
                >
                  {availableUsers.map(user => (
                    <Option key={user.id} value={user.id}>
                      <Space>
                        <Avatar size="small" src={getAvatarUrl(user.username)} />
                        <span>{user.name} (@{user.username})</span>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Select className="eum-full-width" value={selectedRole} onChange={setSelectedRole}>
                  <Option value={ROLE.COLLABORATOR}><Tag color="green">协作者</Tag></Option>
                  <Option value={ROLE.ADMIN}><Tag color="blue">管理员</Tag></Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddUser} disabled={!selectedUser || adding} loading={adding}>添加用户</Button>
              </Col>
            </Row>
          </div>

          <div className="eum-list-wrap">
            <Typography.Title level={5} className="eum-section-title">
              <TeamOutlined /> 当前用户列表 ({accounts.length}人)
            </Typography.Title>
            <List dataSource={accounts} renderItem={(account) => (
              <List.Item actions={[
                <Select key="role" value={account.role} onChange={(value) => handleRoleChange(account.user_id, value)} className="eum-role-select" disabled={account.role === ROLE.ROOT}>
                  <Option value={ROLE.COLLABORATOR}><Tag color="green">协作者</Tag></Option>
                  <Option value={ROLE.ADMIN}><Tag color="blue">管理员</Tag></Option>
                  <Option value={ROLE.ROOT}><Tag color="red">超级管理员</Tag></Option>
                </Select>,
                <Button key="delete" type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteUser(account.user_id)} disabled={account.role === ROLE.ROOT} />
              ]} className="eum-list-item">
                <List.Item.Meta avatar={<Avatar src={getAvatarUrl(account.username)} size="large" />} title={<Space><Typography.Text strong>{account.ownerName}</Typography.Text></Space>} description={<Typography.Text type="secondary">@{account.username}</Typography.Text>} />
              </List.Item>
            )} />
          </div>

          <div className="eum-tip-box">
            <Typography.Text strong className="eum-tip-title">权限说明：</Typography.Text>
            <ul className="eum-tip-list">
              <li><Typography.Text type="secondary"><Tag color="red" size="small">超级管理员</Tag> 拥有最高权限，每个容器必须至少有一个ROOT用户</Typography.Text></li>
              <li><Typography.Text type="secondary"><Tag color="blue" size="small">管理员</Tag> 可以管理容器，但不能修改用户权限</Typography.Text></li>
              <li><Typography.Text type="secondary"><Tag color="green" size="small">协作者</Tag> 只能使用容器，操作权限有限</Typography.Text></li>
            </ul>
          </div>
        </div>
      </Form>
    </Modal>
  );
};

export default EditUserModal;
