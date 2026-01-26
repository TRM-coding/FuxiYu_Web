import React, { useState, useEffect } from 'react';
import { listAllMachineBrefInformation, getDetailInformation, addMachine, removeMachine, updateMachine } from '../api/machine_api';
import { listAllContainerBrefInformation, getContainerDetailInformation, addCollaborator, removeCollaborator, updateRole, createContainer, deleteContainer } from '../api/container_api';
import { SearchOutlined, DownOutlined, UpOutlined, UserOutlined, TeamOutlined, ClockCircleOutlined, SettingOutlined, GlobalOutlined, CrownOutlined, UserAddOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Flex, Splitter, Typography, Row, Col, Button, Input, Space, Table, Tag, Modal, Descriptions, Avatar, List, Form, Select, message, Popconfirm, InputNumber, Radio, Pagination } from 'antd';
import ConfirmModal from '../components/ConfirmModal';
const { Column } = Table;
const { Option } = Select;

import { listAllUserBrefInformation } from '../api/user_api';

// machines loaded from backend
const defaultPageSize = 100;


// ROLE枚举定义
const ROLE = {
  ADMIN: 'ADMIN',
  COLLABORATOR: 'COLLABORATOR',
  ROOT: 'ROOT'
};

// 远端获取的数据会被存在 `containerMap`

// 角色配置
const ROLE_CONFIG = {
  [ROLE.ROOT]: {
    label: '超级管理员',
    color: 'red',
    icon: <CrownOutlined />,
    description: '拥有最高权限，可管理所有容器和用户'
  },
  [ROLE.ADMIN]: {
    label: '管理员',
    color: 'blue',
    icon: <UserOutlined />,
    description: '可管理指定容器的所有操作'
  },
  [ROLE.COLLABORATOR]: {
    label: '协作者',
    color: 'green',
    icon: <UserAddOutlined />,
    description: '可使用容器，但操作权限有限'
  }
};

// 获取头像URL
const getAvatarUrl = (username) => {
  return `https://api.dicebear.com/7.x/miniavs/svg?seed=${username}`;
};

// 格式化角色显示
const formatRole = (role) => {
  const config = ROLE_CONFIG[role];
  return config ? config.label : role;
};

// 获取角色颜色
const getRoleColor = (role) => {
  const config = ROLE_CONFIG[role];
  return config ? config.color : 'default';
};

// 获取角色图标
const getRoleIcon = (role) => {
  const config = ROLE_CONFIG[role];
  return config ? config.icon : <UserOutlined />;
};

// 编辑用户弹窗组件
const EditUserModal = ({ visible, container, onClose, onSave, usersList = [], usersLoading = false }) => {
  const [form] = Form.useForm();
  const [editing, setEditing] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [adding, setAdding] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(ROLE.COLLABORATOR);

  // 初始化数据
  React.useEffect(() => {
    if (container) {
      const initialAccounts = container.accounts?.map((account, index) => ({
        ...account,
        user_id: account.user_id ?? account.id ?? null,
        ownerName: (usersList.find(u => String(u.id) === String(account.user_id))?.name) || account.username,
        key: String(account.user_id ?? account.username)
      })) || [];
      setAccounts(initialAccounts);
      
      // 设置表单初始值
      form.setFieldsValue({
        accounts: initialAccounts
      });
    }
  }, [container, form, usersList]);

  // 添加用户
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

      // 如果添加的用户以ROOT添加，自动将其他ROOT降级为ADMIN（本地反映）
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

  // 删除用户
  const handleDeleteUser = async (username) => {
    const userToDelete = accounts.find(acc => acc.username === username || String(acc.user_id) === String(username));
    if (!userToDelete) return;
    // 不允许删除超级管理员条目
    if (userToDelete.role === ROLE.ROOT) {
      message.error('不能删除超级管理员');
      return;
    }

    const userId = userToDelete.user_id ?? (usersList.find(u => u.username === userToDelete.username)?.id);
    const cid = container?.key || container?.container_id;
    if (!userId || !cid) {
      // fallback to local remove
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

  // 更新用户角色
  const handleRoleChange = async (username, newRole) => {
    const userToUpdate = accounts.find(acc => acc.username === username || String(acc.user_id) === String(username));
    if (!userToUpdate) return;

    // 已经是超级管理员的条目不可被手动修改
    if (userToUpdate.role === ROLE.ROOT) {
      message.error('超级管理员身份不可被修改');
      return;
    }

    const userId = userToUpdate.user_id ?? (usersList.find(u => u.username === userToUpdate.username)?.id);
    const cid = container?.key || container?.container_id;
    if (!userId || !cid) {
      // fallback local update
      setAccounts(prev => prev.map(acc => (acc.username === username ? { ...acc, role: newRole } : acc)));
      return;
    }

    // 如果将某个非ROOT用户提升为ROOT，自动将其他ROOT降级为ADMIN（需要通知后端）
    try {
      if (newRole === ROLE.ROOT) {
        // demote existing roots first
        const roots = accounts.filter(acc => acc.role === ROLE.ROOT && String(acc.user_id) !== String(userId));
        for (const r of roots) {
          const rid = r.user_id ?? (usersList.find(u => u.username === r.username)?.id);
          if (rid) await updateRole({ container_id: cid, user_id: rid, updated_role: ROLE.ADMIN });
        }
        // promote target
        await updateRole({ container_id: cid, user_id: userId, updated_role: ROLE.ROOT });
        // update local copy
        setAccounts(prev => prev.map(acc => {
          if (String(acc.user_id) === String(userId)) return { ...acc, role: ROLE.ROOT };
          if (acc.role === ROLE.ROOT) return { ...acc, role: ROLE.ADMIN };
          return acc;
        }));
        message.success('角色已更新');
        return;
      }

      // 普通角色变更
      await updateRole({ container_id: cid, user_id: userId, updated_role: newRole });
      setAccounts(prev => prev.map(acc => (String(acc.user_id) === String(userId) ? { ...acc, role: newRole } : acc)));
      message.success('角色已更新');
    } catch (err) {
      console.error('updateRole failed', err);
      message.error('更新角色失败');
    }
  };

  // 保存修改
  const handleSave = () => {
    setEditing(true);
    // All operations (add/remove/update) are performed immediately via API calls above.
    const updatedAccounts = accounts.map(acc => ({ username: acc.username, role: acc.role, user_id: acc.user_id }));
    const updatedOwners = accounts.map(acc => acc.ownerName);
    onSave({ ...container, accounts: updatedAccounts, owners: updatedOwners });
    message.success('用户权限已更新');
    setEditing(false);
    onClose();
  };

  // 获取可选用户列表（排除已添加的用户），数据来自传入的 `usersList`
  const availableUsers = (usersList || []).filter(
    user => !accounts.some(acc => acc.username === user.username)
  );

  return (
    <Modal
      title={
        <Space>
          <EditOutlined />
          <span>编辑容器用户权限 - {container?.container_name}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button 
          key="save" 
          type="primary" 
          loading={editing}
          onClick={handleSave}
        >
          保存修改
        </Button>
      ]}
    >
      <div style={{ marginBottom: 24 }}>
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          当前容器: {container?.container_name} | 所属机器ID: {container?.machine_id || container?.machine_ip}
        </Typography.Text>

        {/* 添加用户区域 */}
        <div style={{ 
          background: '#fafafa', 
          padding: 16, 
          borderRadius: 8,
          marginBottom: 24,
          border: '1px dashed #d9d9d9'
        }}>
          <Typography.Title level={5} style={{ marginBottom: 16 }}>
            <PlusOutlined /> 添加新用户
          </Typography.Title>
          
          <Row gutter={[16, 16]} align="middle">
            <Col span={10}>
              <Select
                placeholder="选择用户"
                style={{ width: '100%' }}
                value={selectedUser?.username}
                disabled={usersLoading}
                onChange={(value) => {
                  const user = usersList.find(u => u.username === value);
                  setSelectedUser(user || null);
                }}
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                }
              >
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
              <Select
                style={{ width: '100%' }}
                value={selectedRole}
                onChange={setSelectedRole}
              >
                <Option value={ROLE.COLLABORATOR}>
                  <Tag color="green">协作者</Tag>
                </Option>
                <Option value={ROLE.ADMIN}>
                  <Tag color="blue">管理员</Tag>
                </Option>
                <Option value={ROLE.ROOT}>
                  <Tag color="red">超级管理员</Tag>
                </Option>
              </Select>
            </Col>
            
            <Col span={6}>
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={handleAddUser}
                disabled={!selectedUser || adding}
                loading={adding}
              >
                添加用户
              </Button>
            </Col>
          </Row>
        </div>

        {/* 当前用户列表 */}
        <div>
          <Typography.Title level={5} style={{ marginBottom: 16 }}>
            <TeamOutlined /> 当前用户列表 ({accounts.length}人)
          </Typography.Title>
          
          <List
            dataSource={accounts}
            renderItem={(account) => (
              <List.Item
                actions={[
                  <Select
                    key="role"
                    value={account.role}
                    onChange={(value) => handleRoleChange(account.username, value)}
                    style={{ width: 120 }}
                    disabled={account.role === ROLE.ROOT}
                  >
                    <Option value={ROLE.COLLABORATOR}>
                      <Tag color="green">协作者</Tag>
                    </Option>
                    <Option value={ROLE.ADMIN}>
                      <Tag color="blue">管理员</Tag>
                    </Option>
                    <Option value={ROLE.ROOT}>
                      <Tag color="red">超级管理员</Tag>
                    </Option>
                  </Select>,
                  <Popconfirm
                    key="delete"
                    title="确定要移除此用户吗？"
                    onConfirm={() => handleDeleteUser(account.username)}
                    disabled={account.role === ROLE.ROOT}
                  >
                    <Button 
                      type="text" 
                      danger 
                      icon={<DeleteOutlined />}
                      disabled={account.role === ROLE.ROOT}
                    />
                  </Popconfirm>
                ]}
                style={{ 
                  borderBottom: '1px solid #f0f0f0',
                  padding: '12px 0'
                }}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar src={getAvatarUrl(account.username)} size="large" />
                  }
                  title={
                    <Space>
                      <Typography.Text strong>{account.ownerName}</Typography.Text>
                    </Space>
                  }
                  description={
                    <Typography.Text type="secondary">
                      @{account.username}
                    </Typography.Text>
                  }
                />
              </List.Item>
            )}
          />
        </div>

        {/* 权限说明 */}
        <div style={{ 
          marginTop: 24,
          padding: 16,
          background: '#fff7e6',
          borderRadius: 6,
          border: '1px solid #ffd591'
        }}>
          <Typography.Text strong style={{ display: 'block', marginBottom: 8, color: '#fa8c16' }}>
            权限说明：
          </Typography.Text>
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li>
              <Typography.Text type="secondary">
                <Tag color="red" size="small">超级管理员</Tag> 
                拥有最高权限，每个容器必须至少有一个ROOT用户
              </Typography.Text>
            </li>
            <li>
              <Typography.Text type="secondary">
                <Tag color="blue" size="small">管理员</Tag> 
                可以管理容器，但不能修改用户权限
              </Typography.Text>
            </li>
            <li>
              <Typography.Text type="secondary">
                <Tag color="green" size="small">协作者</Tag> 
                只能使用容器，操作权限有限
              </Typography.Text>
            </li>
          </ul>
        </div>
      </div>
    </Modal>
  );
};

// 容器详情弹窗组件
const ContainerDetailModal = ({ visible, container, onClose, onEdit, onDelete, usersList = [] }) => {
  if (!container) return null;

  // 按角色分组账户
  const accountsByRole = container.accounts?.reduce((acc, account, index) => {
    const role = account.role;
    if (!acc[role]) {
      acc[role] = [];
    } // 备忘：正常运行时， ownerName 应该从 user_id 映射而来；但保险起见，这里也fallback到 username（但可能导致删除用户后显示异常）
    const ownerName = (usersList.find(u => String(u.id) === String(account.user_id))?.name) || account.username;
    acc[role].push({
      ...account,
      ownerName
    });
    return acc;
  }, {});

  return (
    <Modal
      title="容器详细信息"
      open={visible}
      onCancel={onClose}
      width={750}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
        <Button key="deleteContainer" danger icon={<DeleteOutlined />} onClick={() => onDelete && onDelete(container)}>
          删除容器
        </Button>,
        <Button 
          key="edit" 
          type="primary" 
          icon={<EditOutlined />}
          onClick={() => {
            onClose();
            onEdit(container);
          }}
        >
          编辑用户
        </Button>
      ]}
    >
      <div style={{ marginBottom: 24 }}>
        {/* 容器标题 */}
        <div style={{ marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #f0f0f0' }}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {container.container_name}
          </Typography.Title>
          <Typography.Text type="secondary">
            容器ID: {container.key}
          </Typography.Text>
        </div>

        {/* 基本信息卡片 */}
        <div style={{ 
          background: '#fafafa', 
          padding: 20, 
          borderRadius: 8,
          marginBottom: 24,
          border: '1px solid #f0f0f0'
        }}>
          <Row gutter={[24, 16]}>
            {/* 容器状态 */}
            <Col span={6}>
              <Space align="start">
                <SettingOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                <div>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                    容器状态
                  </Typography.Text>
                  <Tag color={container.container_status === 'online' ? 'green' : 'orange'}>
                    {container.container_status === 'online' ? '运行中' : '维护中'}
                  </Tag>
                </div>
              </Space>
            </Col>

            {/* 所属机器ID */}
            <Col span={6}>
              <Space align="start">
                <GlobalOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                <div>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                    所属机器ID
                  </Typography.Text>
                  <Typography.Text style={{ fontSize: '16px' }}>
                    {container.machine_id || container.machine_ip}
                  </Typography.Text>
                </div>
              </Space>
            </Col>

            {/* 镜像 */}
            <Col span={6}>
              <Space align="start">
                <ClockCircleOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                <div>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                    镜像
                  </Typography.Text>
                  <Typography.Text style={{ fontSize: '14px' }} ellipsis={{ tooltip: container.container_image }}>
                    {container.container_image}
                  </Typography.Text>
                </div>
              </Space>
            </Col>

            {/* 端口信息 */}
            <Col span={6}>
              <Space align="start">
                <SettingOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                <div>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                    端口映射
                  </Typography.Text>
                  <Tag color="purple">{container.port}</Tag>
                </div>
              </Space>
            </Col>
          </Row>
        </div>

        {/* 用户权限部分 */}
        <div style={{ marginBottom: 24 }}>
          <Typography.Title level={5} style={{ marginBottom: 16 }}>
            <TeamOutlined style={{ marginRight: 8 }} />
            用户权限 ({container.accounts?.length || 0}人)
          </Typography.Title>
          
          {/* 按角色分组显示 */}
          {Object.entries(accountsByRole || {}).map(([role, accounts]) => {
            const roleConfig = ROLE_CONFIG[role];
            return (
              <div key={role} style={{ marginBottom: 20 }}>
                <div style={{ 
                  background: '#f6f8fa', 
                  padding: '12px 16px', 
                  borderRadius: '6px 6px 0 0',
                  border: '1px solid #e1e4e8'
                }}>
                  <Space>
                    {roleConfig?.icon}
                    <Typography.Text strong>
                      {formatRole(role)}
                    </Typography.Text>
                    <Tag color={getRoleColor(role)} style={{ marginLeft: 8 }}>
                      {accounts.length}人
                    </Tag>
                  </Space>
                  <Typography.Text type="secondary" style={{ marginLeft: 8, fontSize: '12px' }}>
                    {roleConfig?.description}
                  </Typography.Text>
                </div>
                
                <div style={{ 
                  border: '1px solid #e1e4e8',
                  borderTop: 'none',
                  borderRadius: '0 0 6px 6px',
                  padding: '16px'
                }}>
                  <Row gutter={[16, 16]}>
                    {accounts.map((account, index) => (
                      <Col span={12} key={index}>
                        <Space align="center" style={{ width: '100%' }}>
                          <Avatar 
                            src={getAvatarUrl(account.username)} 
                            size="large"
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography.Text strong>
                                {account.ownerName}
                              </Typography.Text>
                              {/* 用户在线状态这个其实根本没实现 故暂弃用*/}
                            </div>
                            <Typography.Text type="secondary" style={{ display: 'block' }}>
                              @{account.username}
                            </Typography.Text>
                          </div>
                        </Space>
                      </Col>
                    ))}
                  </Row>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};

const ManageMachine = () => {
  // 机器搜索状态
  const [searchName, setSearchName] = useState('');
  const [searchIP, setSearchIP] = useState('');
  const [searchType, setSearchType] = useState('');

  // 展开的行key
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  // machines from backend
  const [machines, setMachines] = useState([]);
  const [machinesLoading, setMachinesLoading] = useState(false);
  
  // 容器搜索状态
  const [containerSearch, setContainerSearch] = useState({});
  // containers per machine cache: { [machineId]: { loading: bool, data: [] } }
  const [containerMap, setContainerMap] = useState({});
  // users fetched from backend (used for selecting when adding users to a container)
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  // 弹窗状态
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);
  // 添加宿主机弹窗
  const [addHostVisible, setAddHostVisible] = useState(false);
  const [addHostLoading, setAddHostLoading] = useState(false);
  const [addHostForm] = Form.useForm();
  // 添加容器弹窗
  const [addContainerVisible, setAddContainerVisible] = useState(false);
  const [addContainerLoading, setAddContainerLoading] = useState(false);
  const [addContainerForm] = Form.useForm();
  const [addContainerMachineId, setAddContainerMachineId] = useState(null);
  // 编辑模式
  const [isEditMode, setIsEditMode] = useState(false);
  const [editTargetMachine, setEditTargetMachine] = useState(null);
  // 删除机器的确认弹窗
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteTargetMachine, setDeleteTargetMachine] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  // 删除容器的二次确认状态
  const [containerDeleteConfirmVisible, setContainerDeleteConfirmVisible] = useState(false);
  const [deleteTargetContainer, setDeleteTargetContainer] = useState(null);
  const [containerDeleteLoading, setContainerDeleteLoading] = useState(false);

  // load machines from backend on mount
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setMachinesLoading(true);
      try {
        const res = await listAllMachineBrefInformation({ page_number: 0, page_size: defaultPageSize });
        const items = (res && res.machines) || [];
        // map to existing shape with minimal defaults and keep machine_id
        const mapped = items.map((m, idx) => ({
          key: String(m.machine_id || idx + 1),
          machine_id: m.machine_id,
          machine_name: m.machine_name || '',
          machine_ip: m.machine_ip || '',
          machine_type: (m.machine_type || '').toUpperCase(),
          machine_status: (m.machine_status || '').toLowerCase(),
          cpu_core_number: null,
          memory_size_gb: null,
          gpu_number: null,
          gpu_type: null,
          disk_size_gb: null,
          machine_description: ''
        }));
        // fetch details for each machine (merge fields); tolerate individual failures
        try {
          const detailPromises = mapped.map(it =>
            getDetailInformation(it.machine_id).catch(err => {
              console.warn('detail fetch failed for', it.machine_id, err && err.message);
              return null;
            })
          );
          const details = await Promise.all(detailPromises);
          const merged = mapped.map((it, i) => {
            const d = details[i];
            if (!d) return it;
            return {
              ...it,
              cpu_core_number: d.cpu_core_number ?? it.cpu_core_number,
              memory_size_gb: d.memory_size_gb ?? it.memory_size_gb,
              gpu_number: d.gpu_number ?? it.gpu_number,
              gpu_type: d.gpu_type ?? it.gpu_type,
              disk_size_gb: d.disk_size_gb ?? it.disk_size_gb,
              machine_description: d.machine_description ?? it.machine_description,
              machine_type: (d.machine_type ?? it.machine_type).toUpperCase(),
              machine_status: (d.machine_status ?? it.machine_status).toLowerCase()
            };
          });
          if (mounted) setMachines(merged);
        } catch (e) {
          // fallback to mapped if something unexpected fails
          if (mounted) setMachines(mapped);
        }
      } catch (err) {
        console.error('Failed to load machines', err);
      } finally {
        if (mounted) setMachinesLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // 选择要加入的用户
  useEffect(() => {
    let mounted = true;
    const loadUsers = async () => {
      setUsersLoading(true);
      try {
        const res = await listAllUserBrefInformation({ page_number: 0, page_size: 500 });
        const items = (res && (res.users || res.users_info || res.data || res.users_list)) || [];
        const mapped = items.map(u => ({ id: u.user_id || u.id || u.uid || u.userId, username: u.username || u.name || String(u.id), name: u.display_name || u.name || u.username }));
        if (mounted) setUsersList(mapped);
      } catch (err) {
        console.error('Failed to load users', err);
        if (mounted) setUsersList([]);
      } finally {
        if (mounted) setUsersLoading(false);
      }
    };
    loadUsers();
    return () => { mounted = false; };
  }, []);

  // 过滤机器数据
  const filteredMachineData = machines.filter(machine => {
    const matchName = (machine.machine_name || '').toLowerCase().includes(searchName.toLowerCase());
    const matchIP = (machine.machine_ip || '').includes(searchIP);
    const matchType = (machine.machine_type || '').toLowerCase().includes(searchType.toLowerCase());
    return matchName && matchIP && matchType;
  });

  // 获取某个机器的容器数据
  const getContainersForMachine = (machineId) => {
    const mid = String(machineId); // 这里统一使用字符串key
    const cached = containerMap[mid]; // 这里可能是undefined
    let containers = (cached && cached.data) || [];
    
    // 应用搜索过滤 ( string/number 都支持 )
    const searchText = containerSearch[mid] || containerSearch[machineId];
    if (searchText) {
      containers = containers.filter(container => 
        container.container_name.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    return containers;
  };

  const fetchContainersForMachine = async (machineId, pageNumber = 0) => {
    // avoid duplicate fetch
    if (!machineId) return;
    const mid = String(machineId);
    // if same page already loaded, skip
    if (containerMap[mid]?.loading || (containerMap[mid]?.data && containerMap[mid]?.page === pageNumber)) return;
    // mark loading
    setContainerMap(prev => ({ ...prev, [mid]: { ...(prev[mid] || {}), loading: true, data: [], page: pageNumber, total_page: prev[mid]?.total_page || 1 } }));
    try {
      const pageSize = 5;
      const res = await listAllContainerBrefInformation({ machine_id: mid, page_number: pageNumber, page_size: pageSize });
      const items = (res && (res.containers_info || res.containers)) || [];
      const total_page = (res && (res.total_page || res.totalPages || res.total_pages)) || 1;
      const mapped = items.map((c, idx) => ({
        key: c.container_id ? String(c.container_id) : `${mid}-${pageNumber}-${idx}`,
        container_name: c.container_name || c.name || `container-${idx}`,
        container_image: c.container_image || '',
        port: c.port ? String(c.port) : (c.port_str || ''),
        container_status: (c.container_status || '').toLowerCase(),
        machine_id: mid,
        machine_ip: c.machine_ip || '',
        owners: c.owners || [],
        accounts: c.accounts || []
      }));
      setContainerMap(prev => ({ ...prev, [mid]: { loading: false, data: mapped, page: pageNumber, total_page: total_page, page_size: pageSize } }));
    } catch (err) {
      console.error('fetchContainersForMachine failed', machineId, err);
      // fallback: keep loading false but no data so UI will use local mock
      setContainerMap(prev => ({ ...prev, [mid]: { loading: false, data: [], page: pageNumber, total_page: 1 } }));
    }
  };

  // 机器状态标签
  const renderStatusTag = (status) => {
    const color = status === 'online' ? 'green' : 'orange';
    return <Tag color={color}>{status === 'online' ? '运行中' : '维护中'}</Tag>;
  };

  // 容器状态标签
  const renderContainerStatus = (status) => {
    const color = status === 'online' ? 'green' : 'red';
    return <Tag color={color}>{status === 'online' ? '运行中' : '维护中'}</Tag>;
  };

  // 切换展开状态
  const toggleExpand = (machineId) => {
    setExpandedRowKeys(prev => {
      if (prev.includes(machineId)) {
        return prev.filter(key => key !== machineId);
      } else {
        return [...prev, machineId];
      }
    });
  };

  // When rows expand, fetch containers for those machines.
  useEffect(() => {
    if (!expandedRowKeys || expandedRowKeys.length === 0) return;
    expandedRowKeys.forEach(mid => {
      if (mid) fetchContainersForMachine(String(mid), 0);
    });
  }, [expandedRowKeys]);

  // 处理容器搜索输入
  const handleContainerSearch = (machineId, value) => {
    setContainerSearch(prev => ({
      ...prev,
      [machineId]: value
    }));
  };

  // 打开容器详情弹窗: 先从后端获取详情数据再展示
  const openContainerDetail = async (container) => {
    if (!container) return;
    const cid = container.key || container.container_id || container.container_id === 0 ? container.key || container.container_id : null;
    try {
      // show small loading state by clearing selection
      setSelectedContainer(null);
      // fetch detail from server
      const res = await getContainerDetailInformation(cid);
      // support multiple possible response shapes
      const detail = (res && (res.container_info || res.container || res.data || res.container_detail)) || res || null;
      if (!detail) {
        message.error('未能获取容器详情');
        return;
      }
      const mapped = {
        key: detail.container_id ? String(detail.container_id) : (container.key || String(Date.now())),
        container_name: detail.container_name || detail.name || container.container_name || '',
        container_image: detail.container_image || detail.image || container.container_image || '',
        port: detail.port ? String(detail.port) : (detail.port_str || container.port || ''),
        container_status: (detail.container_status || detail.status || '').toLowerCase(),
        machine_ip: detail.machine_ip || container.machine_ip || '',
        machine_id: detail.machine_id ? String(detail.machine_id) : (container.machine_id ? String(container.machine_id) : ''),
        owners: detail.owners || detail.owner_list || container.owners || [],
        accounts: detail.accounts || detail.account_list || container.accounts || []
      };
      setSelectedContainer(mapped);
      setDetailModalVisible(true);
    } catch (err) {
      console.error('getContainerDetailInformation failed', err);
      message.error('获取容器详情失败');
      // fallback: show passed container if available
      setSelectedContainer(container);
      setDetailModalVisible(true);
    }
  };

  // 打开添加宿主机弹窗
  const openAddHostModal = () => {
    addHostForm.resetFields();
    // set defaults for add mode: default status = maintenance
    addHostForm.setFieldsValue({ machine_status: 'maintenance', machine_type: 'CPU', gpu_number: 0 });
    setIsEditMode(false);
    setEditTargetMachine(null);
    setAddHostVisible(true);
  };

  // 打开添加容器弹窗（基于宿主机）
  const openAddContainerModal = (machine) => {
    // machine may be a record from table
    const mid = machine?.machine_id ?? machine?.key ?? null;
    setAddContainerMachineId(mid);
    addContainerForm.resetFields();
    // prefill machine id and defaults
    const defaultUser = localStorage.getItem('currentUserName') || localStorage.getItem('currentUser') || '';
    addContainerForm.setFieldsValue({ machine_id: mid, NAME: '', image: '', CPU_NUMBER: 1, MEMORY: 512, GPU_LIST: [], root_user: defaultUser });
    setAddContainerVisible(true);
  };

  // 添加容器确认
  const handleAddContainerConfirm = async () => {
    try {
      const values = await addContainerForm.validateFields();
      setAddContainerLoading(true);
      const machineId = values.machine_id || addContainerMachineId;
      const currentUserName = values.root_user || localStorage.getItem('currentUserName') || localStorage.getItem('currentUser') || '';
      const payload = {
        user_name: currentUserName,
        machine_id: machineId,
        container: {
          GPU_LIST: values.GPU_LIST || [],
          CPU_NUMBER: values.CPU_NUMBER || 1,
          MEMORY: values.MEMORY || 512,
          NAME: values.NAME || `container-${Date.now()}`,
          image: values.image || ''
        },
        public_key: values.public_key || ''
      };

      try {
        const res = await createContainer(payload);
        // refresh container list for the machine and ensure row expanded
        if (machineId) {
          const mid = String(machineId);
          setExpandedRowKeys(prev => (prev.includes(mid) ? prev : [...prev, mid]));
          fetchContainersForMachine(mid, 0);
        }
        message.success('容器添加成功');
      } catch (err) {
        console.error('createContainer failed', err);
        message.error('添加容器失败，已尝试本地添加');
        // fallback: add local mock entry
        const mid = String(machineId || addContainerMachineId || Date.now());
        const newId = String(Date.now());
        const newContainer = {
          key: newId,
          container_name: values.NAME || `container-${newId}`,
          container_image: values.image || '',
          port: '',
          container_status: 'maintenance',
          machine_id: mid,
          machine_ip: ''
        };
        setContainerMap(prev => {
          const entry = prev[mid] || { data: [], loading: false, page: 0 };
          return { ...prev, [mid]: { ...entry, data: [newContainer, ...(entry.data || [])] } };
        });
        // ensure expanded and refresh view
        setExpandedRowKeys(prev => (prev.includes(mid) ? prev : [...prev, mid]));
      } finally {
        setAddContainerLoading(false);
        setAddContainerVisible(false);
        setAddContainerMachineId(null);
      }
    } catch (err) {
      // validation failed
    }
  };

  // 打开编辑宿主机弹窗（与添加使用同一表单，但为编辑模式）
  const openEditMachine = (machine) => {
    setIsEditMode(true);
    setEditTargetMachine(machine);
    // 预填表单
    addHostForm.setFieldsValue({
      machine_name: machine.machine_name || '',
      machine_ip: machine.machine_ip || '',
      machine_type: (machine.machine_type || 'CPU').toUpperCase() === 'GPU' ? 'GPU' : 'CPU',
      machine_status: (machine.machine_status || 'online').toLowerCase(),
      cpu_core_number: machine.cpu_core_number || null,
      gpu_number: machine.gpu_number ?? 0,
      gpu_type: machine.gpu_type || '',
      memory_size: machine.memory_size_gb || null,
      disk_size: machine.disk_size_gb || null,
      machine_description: machine.machine_description || ''
    });
    setAddHostVisible(true);
  };

  // 添加宿主机确认
  const handleAddHostConfirm = async () => {
    try {
      const values = await addHostForm.validateFields();
      setAddHostLoading(true);
      const payload = {
        machine_name: values.machine_name,
        machine_ip: values.machine_ip,
        // send machine_type as uppercase (per request)
        machine_type: (values.machine_type || 'CPU').toUpperCase(),
        // send status as lowercase
        machine_status: (values.machine_status || 'online').toLowerCase(),
        machine_description: values.machine_description || '',
        cpu_core_number: values.cpu_core_number || null,
        gpu_number: values.gpu_number || 0,
        gpu_type: values.gpu_type || null,
        memory_size: values.memory_size || null,
        disk_size: values.disk_size || null,
      };

      if (isEditMode && editTargetMachine) {
        // 编辑模式 -> 调用更新接口
        try {
          const mid = editTargetMachine.machine_id || editTargetMachine.key;
          await updateMachine(mid, payload);
          const updatedMachine = {
            ...editTargetMachine,
            machine_name: payload.machine_name,
            machine_ip: payload.machine_ip,
            machine_type: (payload.machine_type || '').toUpperCase(),
            machine_status: (values.machine_status || editTargetMachine.machine_status || 'online').toLowerCase(),
            cpu_core_number: payload.cpu_core_number,
            memory_size_gb: payload.memory_size,
            gpu_number: payload.gpu_number,
            gpu_type: payload.gpu_type,
            disk_size_gb: payload.disk_size,
            machine_description: payload.machine_description || ''
          };
          setMachines(prev => prev.map(m => (m.key === editTargetMachine.key ? updatedMachine : m)));
          message.success('宿主机已更新');
        } catch (err) {
          console.error('updateMachine failed', err);
          message.error('更新宿主机失败：' + (err?.message || '未知错误'));
        } finally {
          setAddHostLoading(false);
          setAddHostVisible(false);
          setIsEditMode(false);
          setEditTargetMachine(null);
        }
      } else {
        // 添加模式
        try {
          const res = await addMachine(payload).catch(err => { throw err; });
          const newId = (res && (res.machine_id || res.id)) ? String(res.machine_id || res.id) : String(Date.now());
          const newMachine = {
            key: newId,
            machine_id: newId,
            machine_name: payload.machine_name,
            machine_ip: payload.machine_ip,
            machine_type: (payload.machine_type || '').toUpperCase(),
            machine_status: (values.machine_status || 'online').toLowerCase(),
            cpu_core_number: payload.cpu_core_number,
            memory_size_gb: payload.memory_size,
            gpu_number: payload.gpu_number,
            gpu_type: payload.gpu_type,
            disk_size_gb: payload.disk_size,
            machine_description: payload.machine_description || ''
          };
          setMachines(prev => [newMachine, ...prev]);
          message.success('宿主机已添加');
        } catch (err) {
          console.error('addMachine failed', err);
          message.error('添加宿主机失败，已本地保存');
          const newId = String(Date.now());
          const newMachine = {
            key: newId,
            machine_id: newId,
            machine_name: payload.machine_name,
            machine_ip: payload.machine_ip,
            // display as uppercase in UI
            machine_type: (payload.machine_type || '').toUpperCase(),
            // ensure status is lowercase for UI/internal consistency
            machine_status: (values.machine_status || 'online').toLowerCase(),
            cpu_core_number: payload.cpu_core_number,
            memory_size_gb: payload.memory_size,
            gpu_number: payload.gpu_number,
            gpu_type: payload.gpu_type,
            disk_size_gb: payload.disk_size,
            machine_description: payload.machine_description || ''
          };
          setMachines(prev => [newMachine, ...prev]);
        } finally {
          setAddHostLoading(false);
          setAddHostVisible(false);
        }
      }
    } catch (err) {
      // validation failed
    }
  };

  // 打开删除确认弹窗
  const openDeleteConfirm = (machine) => {
    setDeleteTargetMachine(machine);
    setDeleteConfirmVisible(true);
  };

  // 确认删除机器
  const handleDeleteConfirm = () => {
    if (!deleteTargetMachine) return;
    setDeleteLoading(true);
    // 调用后端删除接口
    const ids = [];
    if (deleteTargetMachine.machine_id) ids.push(deleteTargetMachine.machine_id);
    else ids.push(deleteTargetMachine.key);
    removeMachine(ids).then(() => {
      setMachines(prev => prev.filter(m => m.key !== deleteTargetMachine.key && m.machine_id !== deleteTargetMachine.machine_id));
      setContainerMap(prev => { // 主要是即时相应删除数据 原文这里也是如此
        const copy = { ...prev };
        delete copy[deleteTargetMachine.key];
        if (deleteTargetMachine.machine_id) delete copy[String(deleteTargetMachine.machine_id)];
        return copy;
      });
      message.success('宿主机已删除');
    }).catch(err => {
      console.error('removeMachine failed', err);
      // fallback to local remove
      setMachines(prev => prev.filter(m => m.key !== deleteTargetMachine.key));
      setContainerMap(prev => { // 同上
        const copy = { ...prev };
        delete copy[deleteTargetMachine.key];
        if (deleteTargetMachine.machine_id) delete copy[String(deleteTargetMachine.machine_id)];
        return copy;
      });
      message.warning('删除请求失败，本地已移除');
    }).finally(() => {
      setDeleteLoading(false);
      setDeleteConfirmVisible(false);
      setDeleteTargetMachine(null);
    });
  };

  // 打开删除容器的确认弹窗
  const openDeleteContainerConfirm = (container) => {
    setDeleteTargetContainer(container);
    // 隐藏详情弹窗以展示二次确认
    setDetailModalVisible(false);
    setContainerDeleteConfirmVisible(true);
  };

  // 确认删除容器
  const handleDeleteContainerConfirm = async () => {
    if (!deleteTargetContainer) return;
    setContainerDeleteLoading(true);
    const cid = deleteTargetContainer.key || deleteTargetContainer.container_id;
    try {
      await deleteContainer(cid);
      // 从 containerMap 中移除
      const mid = String(deleteTargetContainer.machine_id || deleteTargetContainer.machine_ip || deleteTargetContainer.machine_id || '');
      setContainerMap(prev => {
        const copy = { ...prev };
        if (copy[mid] && Array.isArray(copy[mid].data)) {
          copy[mid] = { ...copy[mid], data: copy[mid].data.filter(c => c.key !== deleteTargetContainer.key && String(c.container_id) !== String(cid)) };
        }
        return copy;
      });
      // 关闭相关弹窗
      if (selectedContainer && (selectedContainer.key === deleteTargetContainer.key || selectedContainer.container_id === deleteTargetContainer.container_id)) {
        closeAllModals();
      }
      message.success('容器已删除');
    } catch (err) {
      console.error('deleteContainer failed', err);
      // fallback: local remove
      const mid = String(deleteTargetContainer.machine_id || deleteTargetContainer.machine_ip || deleteTargetContainer.machine_id || '');
      setContainerMap(prev => {
        const copy = { ...prev };
        if (copy[mid] && Array.isArray(copy[mid].data)) {
          copy[mid] = { ...copy[mid], data: copy[mid].data.filter(c => c.key !== deleteTargetContainer.key) };
        }
        return copy;
      });
      message.warning('删除请求失败，本地已移除');
    } finally {
      setContainerDeleteLoading(false);
      setContainerDeleteConfirmVisible(false);
      setDeleteTargetContainer(null);
      // Ensure detail modal is closed after deletion attempt and clear selection
      setDetailModalVisible(false);
      setSelectedContainer(null);
    }
  };

  // 打开编辑弹窗
  const openEditModal = (container) => {
    setSelectedContainer(container);
    setEditModalVisible(true);
  };

  // 关闭所有弹窗
  const closeAllModals = () => {
    setDetailModalVisible(false);
    setEditModalVisible(false);
    setSelectedContainer(null);
  };

  // 保存用户权限修改
  const handleSaveUserPermissions = (updatedContainer) => {
    // 这里更新 containerMap 中对应的容器数据
    const mid = String(updatedContainer.machine_id || updatedContainer.machine_id);
    setContainerMap(prev => {
      const entry = prev[mid];
      if (!entry || !entry.data) return prev;
      const newData = entry.data.map(c => c.key === updatedContainer.key ? updatedContainer : c);
      return { ...prev, [mid]: { ...entry, data: newData } };
    });
    
    // 这里可以触发重新渲染
    message.success('用户权限已更新');
  };

  // 展开行的配置
  const expandable = {
    expandedRowKeys,
    onExpandedRowsChange: (expandedKeys) => {
      setExpandedRowKeys(expandedKeys);
    },
    expandedRowRender: (record) => {
      const mid = String(record.key);
      const entry = containerMap[mid] || {};
      const containers = entry.data || [];

      return (
        <div style={{ margin: '16px 0', padding: '16px', background: '#fafafa', borderRadius: '4px' }}>
          <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
            <Col flex="auto">
              <Input
                placeholder={`在 ${record.machine_name} 中搜索容器`}
                value={containerSearch[record.key] || ''}
                onChange={(e) => handleContainerSearch(record.key, e.target.value)}
                allowClear
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col>
              <Button type="primary" icon={<SearchOutlined />}>搜索</Button>
            </Col>
          </Row>
          <Typography.Title level={5} style={{ margin: '0 0 16px 0' }}>
            容器列表 - {record.machine_name}  <Button onClick={() => openAddContainerModal(record)}>添加</Button>
          </Typography.Title>
          <Table
            dataSource={containers}
            rowKey="key" // 选择性展示翻页按钮 节省空间
            pagination={containers.length > 5 ? { pageSize: entry.page_size || 5 } : false}
            bordered
            size="middle"
            loading={entry.loading || false}
          >
            <Column title="容器ID" dataIndex="key" key="key" />
            <Column title="容器名" dataIndex="container_name" key="container_name" />
            <Column title="端口" dataIndex="port" key="port" />
            <Column 
              title="状态" 
              dataIndex="container_status" 
              key="container_status" 
              render={renderContainerStatus} 
            />
            <Column
              title="操作"
              key="action"
              render={(_, containerRecord) => (
                <Space size="middle">
                  <Button type="primary" size="small">启动</Button>
                  <Button danger size="small">停止</Button>
                  <Button size="small">重启</Button>
                  <Button 
                    size="small" 
                    type="primary"
                    ghost
                    onClick={() => openContainerDetail(containerRecord)}
                  >
                    详情
                  </Button>
                </Space>
              )}
            />
          </Table>
          {/* 内侧列表的分页 */}
          {(() => {
            const mid = String(record.key);
            const entry = containerMap[mid];
            const pages = entry?.total_page || 0;
            if (pages > 1) {
              return (
                <div style={{ marginTop: 12, textAlign: 'right' }}>
                  <Pagination
                    current={(entry?.page || 0) + 1}
                    total={pages * (entry?.page_size || 5)}
                    pageSize={entry?.page_size || 5}
                    onChange={(p) => fetchContainersForMachine(record.key, p - 1)}
                    size="small"
                  />
                </div>
              );
            }
            return null;
          })()}
        </div>
      );
    },
    expandIcon: () => null // 隐藏默认的展开图标，使用自定义按钮
  };

  return (
    <>
      <Splitter layout="vertical" style={{ height: '100vh', boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)' }}>
        {/* 1. 搜索区域 */}
        <Splitter.Panel min="10%" max="10%" style={{ padding: '10px' }}>
          <Flex justify="center" align="center" style={{ height: '100%' }}>
            <Space direction="horizontal" size="middle">
              <Row gutter={[16, 0]} align="middle">
                <Col>
                  <Typography.Text type="secondary">机器名：</Typography.Text>
                  <Input 
                    placeholder="输入机器名" 
                    value={searchName} 
                    onChange={e => setSearchName(e.target.value)} 
                    allowClear 
                    style={{ width: 120 }} 
                  />
                </Col>
                <Col>
                  <Typography.Text type="secondary">IP：</Typography.Text>
                  <Input 
                    placeholder="输入IP" 
                    value={searchIP} 
                    onChange={e => setSearchIP(e.target.value)} 
                    allowClear 
                    style={{ width: 120 }} 
                  />
                </Col>
                <Col>
                  <Typography.Text type="secondary">类型：</Typography.Text>
                  <Input 
                    placeholder="输入类型" 
                    value={searchType} 
                    onChange={e => setSearchType(e.target.value)} 
                    allowClear 
                    style={{ width: 120 }} 
                  />
                </Col>
                <Col>
                  <Button type="primary" icon={<SearchOutlined />}>
                    搜索
                  </Button>
                </Col>
                <Col>
                  <Button type="default" icon={<PlusOutlined />} onClick={openAddHostModal}>
                    添加宿主机
                  </Button>
                </Col>
              </Row>
            </Space>
          </Flex>
        </Splitter.Panel>

        {/* 2. 下方区域：机器表格 */}
        <Splitter.Panel>
          <div style={{ padding: '16px' }}>
            <Table 
              dataSource={filteredMachineData} 
              rowKey="key" 
              pagination={{ pageSize: 5 }}
              loading={machinesLoading}
              bordered
              scroll={{ x: true }}
              expandable={expandable}
            >
              <Column title="机器ID" dataIndex="key" key="key" />
              <Column title="机器名" dataIndex="machine_name" key="machine_name" />
              <Column title="机器IP" dataIndex="machine_ip" key="machine_ip" />
              <Column title="机器类型" dataIndex="machine_type" key="machine_type" />
              <Column 
                title="机器状态" 
                dataIndex="machine_status" 
                key="machine_status" 
                render={renderStatusTag} 
              />
              <Column title="CPU核心数" dataIndex="cpu_core_number" key="cpu_core_number" />
              <Column title="内存(GB)" dataIndex="memory_size_gb" key="memory_size_gb" />
              <Column title="GPU数量" dataIndex="gpu_number" key="gpu_number" />
              <Column title="GPU型号" dataIndex="gpu_type" key="gpu_type" />
              <Column title="磁盘(GB)" dataIndex="disk_size_gb" key="disk_size_gb" />
              <Column 
                title="机器描述" 
                dataIndex="machine_description" 
                key="machine_description" 
                ellipsis
              />
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
                        style={{ color: '#1890ff' }}
                      >
                        {isExpanded ? '收起容器' : '查看容器'}
                      </Button>
                              <Button onClick={() => openEditMachine(record)}><a>编辑</a></Button>
                              <Button onClick={() => openDeleteConfirm(record)}><a style={{ color: '#ff4d4f' }}>删除</a></Button>
                      <Button><a style={{ color: '#faad14' }}>重启</a></Button>
                    </Space>
                  );
                }}
              />
            </Table>
          </div>
        </Splitter.Panel>
      </Splitter>

      {/* 添加宿主机 确认弹窗（包含表单） */}
      <ConfirmModal
        visible={addHostVisible}
        title={isEditMode ? "编辑宿主机" : "添加宿主机"}
        message={isEditMode ? "请修改宿主机信息并确认更新" : "请填写宿主机信息并确认"}
        onConfirm={handleAddHostConfirm}
        onCancel={() => { setAddHostVisible(false); setIsEditMode(false); setEditTargetMachine(null); }}
        loading={addHostLoading}
        confirmText={isEditMode ? '更新' : '添加'}
        content={
          <Form
            form={addHostForm}
            layout="vertical"
            initialValues={{ machine_type: 'CPU', gpu_number: 0, machine_status: 'maintenance' }}
              onValuesChange={(changedValues) => {
                if (changedValues.machine_type) {
                  if (changedValues.machine_type !== 'GPU') {
                    // when switching away from GPU, reset gpu-related fields
                    addHostForm.setFieldsValue({ gpu_number: 0, gpu_type: '' });
                  }
                }
              }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="machine_name" label="机器名" rules={[{ required: true, message: '请输入机器名' }]}> 
                  <Input placeholder="机器名" />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item name="machine_ip" label="IP 地址" rules={[{ required: true, message: '请输入IP地址' }]}> 
                  <Input placeholder="192.168.x.x" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="machine_type" label="机器类型" initialValue="CPU">
                  <Radio.Group
                    options={[
                      { label: 'CPU', value: 'CPU' },
                      { label: 'GPU', value: 'GPU' }
                    ]}
                    optionType="button"
                  />
                </Form.Item>
              </Col>

                <Col span={12}>
                  <Form.Item name="machine_status" label="状态">
                    <Select disabled={!isEditMode}>
                      <Option value="online">运行中</Option>
                      <Option value="maintenance">维护中</Option>
                    </Select>
                  </Form.Item>
                </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="cpu_core_number" label="CPU 核心数">
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item shouldUpdate noStyle>
                  {() => {
                    const mt = addHostForm.getFieldValue('machine_type');
                    return (
                      <Form.Item name="gpu_number" label="GPU 数量">
                        <InputNumber min={0} style={{ width: '100%' }} disabled={mt !== 'GPU'} />
                      </Form.Item>
                    );
                  }}
                </Form.Item>
              </Col>
            </Row>

            <Form.Item shouldUpdate noStyle>
              {({ getFieldValue }) => {
                const mt = getFieldValue('machine_type');
                const gnum = getFieldValue('gpu_number');
                if (mt === 'GPU' || (typeof gnum === 'number' && gnum > 0)) {
                  return (
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="gpu_type" label="GPU 型号">
                          <Input placeholder="例如：NVIDIA Tesla V100" />
                        </Form.Item>
                      </Col>
                      <Col span={12} />
                    </Row>
                  );
                }
                return null;
              }}
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="memory_size" label="内存 (GB)">
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="disk_size" label="磁盘 (GB)">
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Row>
              <Col span={24}>
                <Form.Item name="machine_description" label="描述">
                  <Input.TextArea rows={3} placeholder="可选，机器描述" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        }
      />

      {/* 删除宿主机 - 二次确认（敏感行为） */}
      <ConfirmModal
        visible={deleteConfirmVisible}
        title="确认删除宿主机"
        message={deleteTargetMachine ? `请确认以下信息并删除宿主机 ${deleteTargetMachine.machine_name || deleteTargetMachine.key}` : '确认删除该宿主机？'}
        content={
          deleteTargetMachine ? (
            <div style={{ 
              background: '#fff2f0', 
              padding: 16, 
              borderRadius: 4,
              border: '1px solid #ffccc7'
            }}>
              <Row gutter={[0, 8]}>
                <Col span={24}>
                  <Typography.Text type="secondary">机器ID：</Typography.Text>
                  <Typography.Text style={{ marginLeft: 8 }}>{deleteTargetMachine.machine_id || deleteTargetMachine.key}</Typography.Text>
                </Col>
                <Col span={24}>
                  <Typography.Text type="secondary">机器名：</Typography.Text>
                  <Typography.Text style={{ marginLeft: 8 }}>{deleteTargetMachine.machine_name}</Typography.Text>
                </Col>
                <Col span={24}>
                  <Typography.Text type="secondary">IP：</Typography.Text>
                  <Typography.Text style={{ marginLeft: 8 }}>{deleteTargetMachine.machine_ip}</Typography.Text>
                </Col>
                <Col span={24}>
                  <Typography.Text type="secondary">类型：</Typography.Text>
                  <Tag style={{ marginLeft: 8 }}>{(deleteTargetMachine.machine_type || '').toUpperCase()}</Tag>
                </Col>
                <Col span={24}>
                  <Typography.Text type="secondary">状态：</Typography.Text>
                  <Typography.Text style={{ marginLeft: 8 }}>{(deleteTargetMachine.machine_status || '').toLowerCase()}</Typography.Text>
                </Col>
              </Row>
              <Typography.Text type="danger" style={{ display: 'block', marginTop: 12 }}>
                此操作不可恢复！此操作将移除该机器及其所有容器。
              </Typography.Text>
            </div>
          ) : null
        }
        danger
        iconColor="#ff4d4f"
        onConfirm={handleDeleteConfirm}
        onCancel={() => { setDeleteConfirmVisible(false); setDeleteTargetMachine(null); }}
        loading={deleteLoading}
        confirmText="删除"
      />

      {/* 删除容器 - 二次确认 */}
      <ConfirmModal
        visible={containerDeleteConfirmVisible}
        title="确认删除容器"
        message={deleteTargetContainer ? `请确认以下信息并删除容器 ${deleteTargetContainer.container_name || deleteTargetContainer.key}` : '确认删除该容器？'}
        content={
          deleteTargetContainer ? (
            <div style={{ background: '#fff2f0', padding: 16, borderRadius: 4, border: '1px solid #ffccc7' }}>
              <Row gutter={[0, 8]}>
                <Col span={24}>
                  <Typography.Text type="secondary">容器ID：</Typography.Text>
                  <Typography.Text style={{ marginLeft: 8 }}>{deleteTargetContainer.key || deleteTargetContainer.container_id}</Typography.Text>
                </Col>
                <Col span={24}>
                  <Typography.Text type="secondary">容器名：</Typography.Text>
                  <Typography.Text style={{ marginLeft: 8 }}>{deleteTargetContainer.container_name}</Typography.Text>
                </Col>
                <Col span={24}>
                  <Typography.Text type="secondary">所属机器：</Typography.Text>
                  <Typography.Text style={{ marginLeft: 8 }}>{deleteTargetContainer.machine_id || deleteTargetContainer.machine_ip}</Typography.Text>
                </Col>
              </Row>
              <Typography.Text type="danger" style={{ display: 'block', marginTop: 12 }}>
                此操作不可恢复！此操作将永久删除该容器。
              </Typography.Text>
            </div>
          ) : null
        }
        danger
        iconColor="#ff4d4f"
        onConfirm={handleDeleteContainerConfirm}
        onCancel={() => { setContainerDeleteConfirmVisible(false); setDeleteTargetContainer(null); setDetailModalVisible(true); }}
        loading={containerDeleteLoading}
        confirmText="删除"
      />

      {/* 容器详情弹窗 */}
      <ContainerDetailModal
        visible={detailModalVisible}
        container={selectedContainer}
        onClose={closeAllModals}
        onEdit={openEditModal}
        onDelete={openDeleteContainerConfirm}
        usersList={usersList}
      />

      {/* 添加容器 确认弹窗（包含表单） */}
      <ConfirmModal
        visible={addContainerVisible}
        title="添加容器"
        message="请填写容器信息并确认添加"
        onConfirm={handleAddContainerConfirm}
        onCancel={() => { setAddContainerVisible(false); setAddContainerMachineId(null); }}
        loading={addContainerLoading}
        confirmText="添加"
        content={
          <Form
            form={addContainerForm}
            layout="vertical"
            initialValues={{ CPU_NUMBER: 1, MEMORY: 512, GPU_LIST: [] }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="NAME" label="容器名" rules={[{ required: true, message: '请输入容器名' }]}>
                  <Input placeholder="容器名" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="image" label="镜像地址" rules={[{ required: true, message: '请输入镜像地址' }]}>
                  <Input placeholder="例如：nginx:latest" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="CPU_NUMBER" label="CPU 数量">
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="MEMORY" label="内存 (MB)">
                  <InputNumber min={128} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="root_user" label="Root 用户" rules={[{ required: true, message: '请选择Root用户' }]}>
                  <Select
                    placeholder="选择Root用户"
                    loading={usersLoading}
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}
                  >
                    {(usersList || []).map(u => (
                      <Option key={u.id} value={u.username}>
                        <span>{u.name} (@{u.username})</span>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="machine_id" label="宿主机ID">
                  <Input disabled value={addContainerMachineId || ''} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="public_key" label="公钥 (可选)">
                  <Input.TextArea rows={2} placeholder="可选，用于容器访问的公钥" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        }
      />

      {/* 编辑用户弹窗 */}
      <EditUserModal
        visible={editModalVisible}
        container={selectedContainer}
        onClose={closeAllModals}
        onSave={handleSaveUserPermissions}
        usersList={usersList}
        usersLoading={usersLoading}
      />
    </>
  );
};

export default ManageMachine;