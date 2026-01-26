import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Space, Typography, Row, Col, Select, Tag, Avatar, List, message } from 'antd';
import { EditOutlined, PlusOutlined, TeamOutlined, DeleteOutlined } from '@ant-design/icons';
import { addCollaborator, removeCollaborator, updateRole } from '../api/container_api';

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

const EditUserModal = ({ visible, container, onClose, onSave, usersList = [], usersLoading = false, forceSystemAdmin = false }) => {
  const [form] = Form.useForm();
  const [editing, setEditing] = useState(false);
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

  const handleAddUser = () => {
    if (!selectedUser) {
      message.warning('请选择要添加的用户');
      return;
    }
    const userExists = accounts.some(account => String(account.user_id) === String(selectedUser.id) || account.username === selectedUser.username);
    if (userExists) {
      message.warning('该用户已存在');
      return;
    }
    const cid = container?.key || container?.container_id;
    if (!cid) {
      message.error('未能识别容器ID，无法添加用户');
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
    }).catch(err => {
      console.error('addCollaborator failed', err);
      message.error('添加用户失败');
    }).finally(() => setAdding(false));
  };

  const handleDeleteUser = async (username) => {
    const userToDelete = accounts.find(acc => acc.username === username || String(acc.user_id) === String(username));
    if (!userToDelete) return;
    if (userToDelete.role === ROLE.ROOT) {
      message.error('不能删除超级管理员');
      return;
    }
    const userId = userToDelete.user_id ?? (usersList.find(u => u.username === userToDelete.username)?.id);
    const cid = container?.key || container?.container_id;
    if (!userId || !cid) {
      setAccounts(prev => prev.filter(acc => acc.username !== username));
      message.warning('本地已移除，后端ID信息缺失');
      return;
    }
    try {
      await removeCollaborator({ user_id: userId, container_id: cid });
      setAccounts(prev => prev.filter(acc => String(acc.user_id) !== String(userId)));
      message.success('用户已移除');
    } catch (err) {
      console.error('removeCollaborator failed', err);
      message.error('移除用户失败');
    }
  };

  const handleRoleChange = async (username, newRole) => {
    const userToUpdate = accounts.find(acc => acc.username === username || String(acc.user_id) === String(username));
    if (!userToUpdate) return;
    if (userToUpdate.role === ROLE.ROOT) {
      message.error('超级管理员身份不可被修改');
      return;
    }
    const userId = userToUpdate.user_id ?? (usersList.find(u => u.username === userToUpdate.username)?.id);
    const cid = container?.key || container?.container_id;
    if (!userId || !cid) {
      setAccounts(prev => prev.map(acc => (acc.username === username ? { ...acc, role: newRole } : acc)));
      return;
    }
    try {
      if (newRole === ROLE.ROOT) {
        const roots = accounts.filter(acc => acc.role === ROLE.ROOT && String(acc.user_id) !== String(userId));
        for (const r of roots) {
          const rid = r.user_id ?? (usersList.find(u => u.username === r.username)?.id);
          if (rid) {
            await updateRole({ container_id: cid, user_id: rid, updated_role: ROLE.ADMIN });
          }
        }
        await updateRole({ container_id: cid, user_id: userId, updated_role: ROLE.ROOT });
        setAccounts(prev => prev.map(acc => {
          if (String(acc.user_id) === String(userId)) return { ...acc, role: ROLE.ROOT };
          if (acc.role === ROLE.ROOT) return { ...acc, role: ROLE.ADMIN };
          return acc;
        }));
          message.success('角色已更新');
          // 转让后关闭编辑窗口
          try {
            const currentUid = localStorage.getItem('currentUserId');
            if (String(userId) !== String(currentUid) && !forceSystemAdmin) {
              onClose && onClose();
            }
          } catch (e) {
            // ignore
          }
          return;
      }
      await updateRole({ container_id: cid, user_id: userId, updated_role: newRole });
      setAccounts(prev => prev.map(acc => (String(acc.user_id) === String(userId) ? { ...acc, role: newRole } : acc)));
      message.success('角色已更新');
    } catch (err) {
      console.error('updateRole failed', err);
      message.error('更新角色失败');
    }
  };

  const handleSave = () => {
    setEditing(true);
    const updatedAccounts = accounts.map(acc => ({ username: acc.username, role: acc.role, user_id: acc.user_id }));
    const updatedOwners = accounts.map(acc => acc.ownerName);
    onSave({ ...container, accounts: updatedAccounts, owners: updatedOwners });
    message.success('用户权限已更新');
    setEditing(false);
    onClose();
  };

  const availableUsers = (usersList || []).filter(user => !accounts.some(acc => acc.username === user.username));

  return (
    <Modal
      title={(
        <Space>
          <EditOutlined />
          <span>编辑容器用户权限 - {container?.container_name}</span>
        </Space>
      )}
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={onClose}>取消</Button>,
        <Button key="save" type="primary" loading={editing} onClick={handleSave}>保存修改</Button>
      ]}
    >
      <Form form={form} layout="vertical">
        <div style={{ marginBottom: 24 }}>
          <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            当前容器: {container?.container_name} | 所属机器ID: {container?.machine_id || container?.machine_ip}
          </Typography.Text>

          <div style={{ background: '#fafafa', padding: 16, borderRadius: 8, marginBottom: 24, border: '1px dashed #d9d9d9' }}>
            <Typography.Title level={5} style={{ marginBottom: 16 }}>
              <PlusOutlined /> 添加新用户
            </Typography.Title>
            <Row gutter={[16, 16]} align="middle">
              <Col span={10}>
                <Select placeholder="选择用户" style={{ width: '100%' }} value={selectedUser?.username} disabled={usersLoading} onChange={(value) => { const user = usersList.find(u => u.username === value); setSelectedUser(user || null); }} showSearch optionFilterProp="children" filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}>
                  {availableUsers.map(user => (
                    <Option key={user.id} value={user.username}>
                      <Space>
                        <Avatar size="small" src={getAvatarUrl(user.username)} />
                        <span>{user.name} (@{user.username})</span>
                      </Space>
                    </Option>
                  ))}
                </Select>
              </Col>
              <Col span={8}>
                <Select style={{ width: '100%' }} value={selectedRole} onChange={setSelectedRole}>
                  <Option value={ROLE.COLLABORATOR}><Tag color="green">协作者</Tag></Option>
                  <Option value={ROLE.ADMIN}><Tag color="blue">管理员</Tag></Option>
                  <Option value={ROLE.ROOT}><Tag color="red">超级管理员</Tag></Option>
                </Select>
              </Col>
              <Col span={6}>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddUser} disabled={!selectedUser || adding} loading={adding}>添加用户</Button>
              </Col>
            </Row>
          </div>

          <div>
            <Typography.Title level={5} style={{ marginBottom: 16 }}>
              <TeamOutlined /> 当前用户列表 ({accounts.length}人)
            </Typography.Title>
            <List dataSource={accounts} renderItem={(account) => (
              <List.Item actions={[
                <Select key="role" value={account.role} onChange={(value) => handleRoleChange(account.username, value)} style={{ width: 120 }} disabled={account.role === ROLE.ROOT}>
                  <Option value={ROLE.COLLABORATOR}><Tag color="green">协作者</Tag></Option>
                  <Option value={ROLE.ADMIN}><Tag color="blue">管理员</Tag></Option>
                  <Option value={ROLE.ROOT}><Tag color="red">超级管理员</Tag></Option>
                </Select>,
                <Button key="delete" type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteUser(account.username)} disabled={account.role === ROLE.ROOT} />
              ]} style={{ borderBottom: '1px solid #f0f0f0', padding: '12px 0' }}>
                <List.Item.Meta avatar={<Avatar src={getAvatarUrl(account.username)} size="large" />} title={<Space><Typography.Text strong>{account.ownerName}</Typography.Text></Space>} description={<Typography.Text type="secondary">@{account.username}</Typography.Text>} />
              </List.Item>
            )} />
          </div>

          <div style={{ marginTop: 24, padding: 16, background: '#fff7e6', borderRadius: 6, border: '1px solid #ffd591' }}>
            <Typography.Text strong style={{ display: 'block', marginBottom: 8, color: '#fa8c16' }}>权限说明：</Typography.Text>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
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
