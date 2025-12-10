import React, { useState } from 'react';
import { SearchOutlined, DownOutlined, UpOutlined, UserOutlined, TeamOutlined, ClockCircleOutlined, SettingOutlined, GlobalOutlined, CrownOutlined, UserAddOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Flex, Splitter, Typography, Row, Col, Button, Input, Space, Table, Tag, Modal, Descriptions, Avatar, List, Form, Select, message, Popconfirm } from 'antd';
const { Column } = Table;
const { Option } = Select;

// 模拟机器数据
const machineData = [
  {
    key: '1',
    machine_name: '服务器A',
    machine_ip: '192.168.1.101',
    machine_type: 'CPU服务器',
    machine_status: 'online',
    cpu_core_number: 16,
    memory_size_gb: 64,
    gpu_number: 0,
    gpu_type: '无',
    disk_size_gb: 2048,
    machine_description: '前端服务部署机器'
  },
  {
    key: '2',
    machine_name: 'GPU工作站B',
    machine_ip: '192.168.1.102',
    machine_type: 'GPU工作站',
    machine_status: 'maintenance',
    cpu_core_number: 32,
    memory_size_gb: 128,
    gpu_number: 2,
    gpu_type: 'NVIDIA RTX 4090',
    disk_size_gb: 4096,
    machine_description: 'AI模型训练机器'
  },
  {
    key: '3',
    machine_name: '存储服务器C',
    machine_ip: '192.168.1.103',
    machine_type: '存储服务器',
    machine_status: 'online',
    cpu_core_number: 8,
    memory_size_gb: 32,
    gpu_number: 0,
    gpu_type: '无',
    disk_size_gb: 16384,
    machine_description: '数据存储节点'
  }
];

// 模拟所有用户数据（用于添加用户时的选择）
const allUsers = [
  { id: 1, username: 'zhangsan', name: '张三', status: '在线' },
  { id: 2, username: 'lisi', name: '李四', status: '在线' },
  { id: 3, username: 'wangwu', name: '王五', status: '在线' },
  { id: 4, username: 'zhaoliu', name: '赵六', status: '在线' },
  { id: 5, username: 'qianqi', name: '钱七', status: '离线' },
  { id: 6, username: 'sunba', name: '孙八', status: '在线' },
  { id: 7, username: 'zhoujiu', name: '周九', status: '在线' },
  { id: 8, username: 'wushi', name: '吴十', status: '在线' },
  { id: 9, username: 'zhengshi', name: '郑石', status: '离线' }
];

// ROLE枚举定义
const ROLE = {
  ADMIN: 'ADMIN',
  COLLABORATOR: 'COLLABORATOR',
  ROOT: 'ROOT'
};

// 模拟容器数据 - 初始数据
let containerData = [
  { 
    key: 'c1-1', 
    machine_id: '1', 
    container_name: 'nginx容器', 
    container_image: 'nginx:1.24', 
    port: '80:80', 
    container_status: 'online',
    machine_ip: '192.168.1.101',
    owners: ['张三', '李四', '王五'],
    accounts: [
      { username: 'zhangsan', role: ROLE.ROOT, status: '在线' },
      { username: 'lisi', role: ROLE.COLLABORATOR, status: '在线' },
      { username: 'wangwu', role: ROLE.COLLABORATOR, status: '在线' }
    ]
  },
  { 
    key: 'c1-2', 
    machine_id: '1', 
    container_name: 'react前端容器', 
    container_image: 'react:18', 
    port: '8080:80', 
    container_status: 'online',
    machine_ip: '192.168.1.101',
    owners: ['赵六', '张三'],
    accounts: [
      { username: 'zhaoliu', role: ROLE.ADMIN, status: '在线' },
      { username: 'zhangsan', role: ROLE.ROOT, status: '在线' }
    ]
  },
  { 
    key: 'c2-1', 
    machine_id: '2', 
    container_name: 'tensorflow训练容器', 
    container_image: 'tensorflow:2.15', 
    port: '8888:8888', 
    container_status: 'maintenance',
    machine_ip: '192.168.1.102',
    owners: ['钱七', '张三', '孙八'],
    accounts: [
      { username: 'qianqi', role: ROLE.ADMIN, status: '离线' },
      { username: 'zhangsan', role: ROLE.ROOT, status: '在线' },
      { username: 'sunba', role: ROLE.COLLABORATOR, status: '在线' }
    ]
  },
  { 
    key: 'c3-1', 
    machine_id: '3', 
    container_name: '存储容器', 
    container_image: 'centos:7', 
    port: '9000:9000', 
    container_status: 'online',
    machine_ip: '192.168.1.103',
    owners: ['周九'],
    accounts: [
      { username: 'zhoujiu', role: ROLE.ADMIN, status: '在线' }
    ]
  }
];

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
const EditUserModal = ({ visible, container, onClose, onSave }) => {
  const [form] = Form.useForm();
  const [editing, setEditing] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(ROLE.COLLABORATOR);

  // 初始化数据
  React.useEffect(() => {
    if (container) {
      const initialAccounts = container.accounts?.map((account, index) => ({
        ...account,
        ownerName: container.owners[index] || account.username,
        key: account.username
      })) || [];
      setAccounts(initialAccounts);
      
      // 设置表单初始值
      form.setFieldsValue({
        accounts: initialAccounts
      });
    }
  }, [container, form]);

  // 添加用户
  const handleAddUser = () => {
    if (!selectedUser) {
      message.warning('请选择要添加的用户');
      return;
    }

    const userExists = accounts.some(account => account.username === selectedUser.username);
    if (userExists) {
      message.warning('该用户已存在');
      return;
    }

    const newAccount = {
      username: selectedUser.username,
      role: selectedRole,
      status: selectedUser.status,
      ownerName: selectedUser.name,
      key: selectedUser.username
    };

    setAccounts([...accounts, newAccount]);
    setSelectedUser(null);
    setSelectedRole(ROLE.COLLABORATOR);
    message.success('用户已添加到列表');
  };

  // 删除用户
  const handleDeleteUser = (username) => {
    // 不能删除最后一个ROOT用户
    const rootUsers = accounts.filter(acc => acc.role === ROLE.ROOT);
    const userToDelete = accounts.find(acc => acc.username === username);
    
    if (userToDelete?.role === ROLE.ROOT && rootUsers.length <= 1) {
      message.error('必须至少保留一个ROOT用户');
      return;
    }

    setAccounts(accounts.filter(acc => acc.username !== username));
    message.success('用户已移除');
  };

  // 更新用户角色
  const handleRoleChange = (username, newRole) => {
    // 不能修改最后一个ROOT用户的角色
    const rootUsers = accounts.filter(acc => acc.role === ROLE.ROOT);
    const userToUpdate = accounts.find(acc => acc.username === username);
    
    if (userToUpdate?.role === ROLE.ROOT && rootUsers.length <= 1 && newRole !== ROLE.ROOT) {
      message.error('必须至少保留一个ROOT用户');
      return;
    }

    setAccounts(accounts.map(acc => 
      acc.username === username ? { ...acc, role: newRole } : acc
    ));
  };

  // 保存修改
  const handleSave = () => {
    setEditing(true);
    
    // 模拟API调用
    setTimeout(() => {
      const updatedAccounts = accounts.map(acc => ({
        username: acc.username,
        role: acc.role,
        status: acc.status
      }));
      
      const updatedOwners = accounts.map(acc => acc.ownerName);
      
      // 调用父组件的保存函数
      onSave({
        ...container,
        accounts: updatedAccounts,
        owners: updatedOwners
      });
      
      message.success('用户权限已更新');
      setEditing(false);
      onClose();
    }, 500);
  };

  // 获取可选用户列表（排除已添加的用户）
  const availableUsers = allUsers.filter(
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
          当前容器: {container?.container_name} | 所在机器: {container?.machine_ip}
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
                onChange={(value) => {
                  const user = allUsers.find(u => u.username === value);
                  setSelectedUser(user);
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
                      <Tag color={user.status === '在线' ? 'green' : 'gray'} size="small">
                        {user.status}
                      </Tag>
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
                disabled={!selectedUser}
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
                    disabled={account.role === ROLE.ROOT && 
                             accounts.filter(acc => acc.role === ROLE.ROOT).length <= 1}
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
                    disabled={account.role === ROLE.ROOT && 
                             accounts.filter(acc => acc.role === ROLE.ROOT).length <= 1}
                  >
                    <Button 
                      type="text" 
                      danger 
                      icon={<DeleteOutlined />}
                      disabled={account.role === ROLE.ROOT && 
                               accounts.filter(acc => acc.role === ROLE.ROOT).length <= 1}
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
                      <Tag color={account.status === '在线' ? 'green' : 'gray'}>
                        {account.status}
                      </Tag>
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
const ContainerDetailModal = ({ visible, container, onClose, onEdit }) => {
  if (!container) return null;

  // 按角色分组账户
  const accountsByRole = container.accounts?.reduce((acc, account, index) => {
    const role = account.role;
    if (!acc[role]) {
      acc[role] = [];
    }
    acc[role].push({
      ...account,
      ownerName: container.owners[index] || account.username
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
            <Col span={8}>
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
            
            {/* 所属机器IP */}
            <Col span={8}>
              <Space align="start">
                <GlobalOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                <div>
                  <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                    所在机器
                  </Typography.Text>
                  <Typography.Text style={{ fontSize: '16px' }}>
                    {container.machine_ip}
                  </Typography.Text>
                </div>
              </Space>
            </Col>
            
            {/* 端口信息 */}
            <Col span={8}>
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
                              <Tag color={account.status === '在线' ? 'green' : 'gray'} size="small">
                                {account.status}
                              </Tag>
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
  
  // 容器搜索状态
  const [containerSearch, setContainerSearch] = useState({});

  // 弹窗状态
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);

  // 过滤机器数据
  const filteredMachineData = machineData.filter(machine => {
    const matchName = machine.machine_name.toLowerCase().includes(searchName.toLowerCase());
    const matchIP = machine.machine_ip.includes(searchIP);
    const matchType = machine.machine_type.toLowerCase().includes(searchType.toLowerCase());
    return matchName && matchIP && matchType;
  });

  // 获取某个机器的容器数据
  const getContainersForMachine = (machineId) => {
    let containers = containerData.filter(container => container.machine_id === machineId);
    
    // 应用搜索过滤
    const searchText = containerSearch[machineId];
    if (searchText) {
      containers = containers.filter(container => 
        container.container_name.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    
    return containers;
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

  // 处理容器搜索输入
  const handleContainerSearch = (machineId, value) => {
    setContainerSearch(prev => ({
      ...prev,
      [machineId]: value
    }));
  };

  // 打开容器详情弹窗
  const openContainerDetail = (container) => {
    setSelectedContainer(container);
    setDetailModalVisible(true);
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
    // 在实际应用中，这里应该调用API更新数据
    const index = containerData.findIndex(c => c.key === updatedContainer.key);
    if (index !== -1) {
      containerData[index] = updatedContainer;
    }
    
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
      const containers = getContainersForMachine(record.key);
      
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
            容器列表 - {record.machine_name}  <Button>添加</Button>
          </Typography.Title>
          <Table
            dataSource={containers}
            rowKey="key"
            pagination={containers.length > 5 ? { pageSize: 5 } : false}
            bordered
            size="middle"
          >
            <Column title="容器ID" dataIndex="key" key="key" />
            <Column title="容器名" dataIndex="container_name" key="container_name" />
            <Column title="镜像" dataIndex="container_image" key="container_image" />
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
                      <Button><a style={{ color: '#ff4d4f' }}>删除</a></Button>
                      <Button><a style={{ color: '#faad14' }}>重启</a></Button>
                    </Space>
                  );
                }}
              />
            </Table>
          </div>
        </Splitter.Panel>
      </Splitter>

      {/* 容器详情弹窗 */}
      <ContainerDetailModal
        visible={detailModalVisible}
        container={selectedContainer}
        onClose={closeAllModals}
        onEdit={openEditModal}
      />

      {/* 编辑用户弹窗 */}
      <EditUserModal
        visible={editModalVisible}
        container={selectedContainer}
        onClose={closeAllModals}
        onSave={handleSaveUserPermissions}
      />
    </>
  );
};

export default ManageMachine;