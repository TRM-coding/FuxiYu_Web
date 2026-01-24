import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { Flex, Splitter, Typography, Row, Col, Button, Input, Space, Table, Form, DatePicker, Card, Tag, message } from 'antd';
import ConfirmModal from '../components/ConfirmModal';
import { listAllUserBrefInformation } from '../api/user_api';
import { listAllContainerBrefInformation, getContainerDetailInformation } from '../api/container_api';
const { Column } = Table;

// users and containers will be fetched from backend
const initialUsers = [];

const ManageUser = () => {
  // 用户搜索状态
  const [searchUsername, setSearchUsername] = useState('');
  const [searchUserId, setSearchUserId] = useState('');
  const [searchEmail, setSearchEmail] = useState('');

  // 展开的行key
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);

  // fetched users
  const [users, setUsers] = useState(initialUsers);
  const [usersLoading, setUsersLoading] = useState(false);

  // container cache per user id: { [userId]: { loading, data } }
  const [containerMap, setContainerMap] = useState({});

  const navigate = useNavigate();

  // load users on mount
  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      setUsersLoading(true);
      try {
        const res = await listAllUserBrefInformation({ page_number: 1, page_size: 200 });
        const items = (res && (res.users || res.items || res.data)) || [];
        const mapped = items.map(u => ({
          key: String(u.user_id || u.id || u.uid || u.userId || u.key || ''),
          username: u.username || u.name || u.display_name || String(u.user_id || u.id || u.userId || ''),
          email: u.email || '',
          graduation_year: u.graduation_year || u.year || '',
          // preserve backend-provided container counts for statistics when row is not expanded
          amount_of_container: u.amount_of_container ?? u.amount_of_containers ?? 0,
          amount_of_functional_container: u.amount_of_functional_container ?? 0,
          amount_of_managed_container: u.amount_of_managed_container ?? 0,
        }));
        if (mounted) setUsers(mapped);
      } catch (err) {
        console.error('load users failed', err);
        // if authentication error, clear auth and redirect to login
        const msg = err && err.message ? String(err.message) : '';
        if (msg.toLowerCase().includes('invalid or missing token') || msg.includes('401')) {
          try {
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUserId');
            localStorage.removeItem('currentUserName');
            document.cookie = 'auth_token=; Max-Age=0; path=/';
          } catch (e) {}
          navigate('/');
          return;
        }
        message.error('加载用户列表失败: ' + (msg || '未知错误'));
      } finally {
        if (mounted) setUsersLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // 通用弹窗状态
  const [modal, setModal] = useState({
    visible: false,
    type: '', // 'save' | 'delete' | 'resetPassword' | 'removeAssociation'
    loading: false,
    data: null,
  });

  // 过滤用户数据
  const filteredUserData = users.filter(user => {
    const matchUsername = user.username.toLowerCase().includes(searchUsername.toLowerCase());
    const matchUserId = user.key.includes(searchUserId);
    const matchEmail = user.email.toLowerCase().includes(searchEmail.toLowerCase());
    return matchUsername && matchUserId && matchEmail;
  });

  // 打开弹窗
  const openModal = (type, data) => {
    setModal({ visible: true, type, loading: false, data });
  };

  // 关闭弹窗
  const closeModal = () => {
    setModal({ visible: false, type: '', loading: false, data: null });
  };

  // 处理弹窗确认
  const handleModalConfirm = () => {
    setModal(prev => ({ ...prev, loading: true }));
    
    setTimeout(() => {
      const { type, data } = modal;
      
      switch (type) {
        case 'save':
          console.log('保存用户信息:', data);
          message.success('用户信息已保存');
          break;
        case 'delete':
          console.log('删除用户:', data);
          message.success('用户已删除');
          break;
        case 'resetPassword':
          console.log('重置密码:', data);
          message.success('密码已重置');
          break;
        case 'removeAssociation':
          console.log('移除关联:', data);
          message.success('关联已移除');
          break;
        default:
          break;
      }
      
      setModal({ visible: false, type: '', loading: false, data: null });
    }, 500);   // Future TODO 这里的延时模拟API调用，后续替换为真实API请求
  };

  // 处理保存用户信息
  const handleSaveUser = (user) => {
    openModal('save', user);
  };

  // 处理删除用户
  const handleDeleteUser = (user) => {
    openModal('delete', user);
  };

  // 处理重置密码
  const handleResetPassword = (user) => {
    openModal('resetPassword', user);
  };

  // 处理移除用户与容器的关联
  const handleRemoveUserFromContainer = (username, container) => {
    openModal('removeAssociation', { username, container });
  };

  // 容器状态标签
  const renderContainerStatus = (status) => {
    const color = status === 'online' ? 'green' : status === 'maintenance' ? 'orange' : 'red';
    const statusText = status === 'online' ? 'ONLINE' : status === 'maintenance' ? 'MAINTAINANCE' : 'OFFLINE';
    return <Tag color={color}>{statusText}</Tag>;
  };

  // 容器中用户角色标签
  const renderContainerRoleTag = (role) => {
    let color = '';
    let roleText = '';
    switch (role) {
      case 'ADMIN':
        color = 'volcano';
        roleText = '管理员';
        break;
      case 'COLLABORATOR':
        color = 'green';
        roleText = '协作者';
        break;
      case 'ROOT':
        color = 'purple';
        roleText = '超级管理员';
        break;
      default:
        color = 'default';
        roleText = '未知';
    }
    return <Tag color={color}>{roleText}</Tag>;
  };

  // 获取用户在某个容器中的角色
  const getUserRoleInContainer = (accounts, username) => {
    if (!accounts || !Array.isArray(accounts)) return null;
    for (const account of accounts) {
      if (Array.isArray(account) && account[0] === username) {
        return account[1];
      }
    }
    return null;
  };

  // 获取用户的所有容器（带角色信息）
  const fetchContainersForUser = async (userId) => {
    if (!userId) return;
    const id = String(userId);
    // avoid duplicate fetch
    if (containerMap[id]?.loading || containerMap[id]?.data) return;
    setContainerMap(prev => ({ ...prev, [id]: { ...(prev[id] || {}), loading: true, data: [] } }));
    try {
      const res = await listAllContainerBrefInformation({ machine_id: null, user_id: Number(userId), page_number: 0, page_size: 200 });
      const items = (res && (res.containers_info || res.containers)) || [];
      const mapped = items.map((c, idx) => ({
        key: c.container_id ? String(c.container_id) : `c-${idx}`,
        container_name: c.container_name || c.name || `container-${idx}`,
        container_image: c.container_image || '',
        port: c.port ? String(c.port) : (c.port_str || ''),
        container_status: (c.container_status || '').toLowerCase(),
        machine_id: c.machine_id ? String(c.machine_id) : null,
        accounts: c.accounts || [],
      }));
      // fetch detail per container to enrich with image and account role info for this user
      const userObj = users.find(u => String(u.key) === String(userId));
      const username = userObj?.username;
      const detailed = await Promise.all(mapped.map(async (c) => {
        try {
          const detRes = await getContainerDetailInformation(Number(c.key));
          const det = (detRes && (detRes.container_info || detRes.container || detRes.data || detRes.container_detail)) || detRes || null;
          const image = (det && (det.container_image || det.image)) || c.container_image;
          const accounts = det?.accounts || c.accounts || [];
          // accounts expected to be objects with `user_id`/`username`/`role`; map user's role by matching username or user_id
          let userRole = null;
          if (username && accounts && Array.isArray(accounts)) {
            const found = accounts.find(a => {
              if (!a) return false;
              if (typeof a === 'object') {
                return a.username === username || String(a.user_id) === String(userId) || String(a.user_id) === String(userObj?.key);
              }
              return false;
            });
            if (found) userRole = found.role ?? null;
          }
          return { ...c, container_image: image, accounts, userRole, machine_id: det?.machine_id ? String(det.machine_id) : c.machine_id };
        } catch (e) {
          // if detail fetch fails, do not attempt old fallback — keep bref info but no userRole
          return { ...c, accounts: c.accounts || [], userRole: null };
        }
      }));
      setContainerMap(prev => ({ ...prev, [id]: { loading: false, data: detailed } }));
    } catch (err) {
      console.error('fetchContainersForUser failed', userId, err);
      setContainerMap(prev => ({ ...prev, [id]: { loading: false, data: [] } }));
    }
  };

  const getUserContainers = (username) => {
    const user = users.find(u => u.username === username);
    if (!user) return [];
    const id = String(user.key);
    // do not trigger fetch during render — return empty until data present
    if (!containerMap[id]) {
      return [];
    }
    const data = containerMap[id].data || [];
    return data; // `userRole` is provided by detail fetch and stored in cache
  };

  // 切换展开状态
  const toggleExpand = (userId) => {
    const willExpand = !expandedRowKeys.includes(userId);
    setExpandedRowKeys(prev => {
      if (prev.includes(userId)) {
        return prev.filter(key => key !== userId);
      } else {
        return [...prev, userId];
      }
    });
    // trigger fetch when user explicitly expands a row (avoids setState during render)
    if (willExpand) fetchContainersForUser(userId);
  };

  // 生成弹窗内容
  const getModalContent = () => {
    const { type, data } = modal;
    
    switch (type) {
      case 'save': {
        const user = data;
        return (
          <div style={{ 
            background: '#fafafa', 
            padding: 16, 
            borderRadius: 4,
            border: '1px solid #f0f0f0'
          }}>
            <Row gutter={[0, 12]}>
              <Col span={24}>
                <Typography.Text type="secondary">用户名：</Typography.Text>
                <Typography.Text style={{ marginLeft: 8 }}>{user?.username}</Typography.Text>
              </Col>
              <Col span={24}>
                <Typography.Text type="secondary">邮箱：</Typography.Text>
                <Typography.Text style={{ marginLeft: 8 }}>{user?.email}</Typography.Text>
              </Col>
              <Col span={24}>
                <Typography.Text type="secondary">毕业年份：</Typography.Text>
                <Typography.Text style={{ marginLeft: 8 }}>{user?.graduation_year}</Typography.Text>
              </Col>
            </Row>
          </div>
        );
      }
      case 'delete': {
        const user = data;
        return (
          <div style={{ 
            background: '#fff2f0', 
            padding: 16, 
            borderRadius: 4,
            border: '1px solid #ffccc7'
          }}>
            <Row gutter={[0, 12]}>
              <Col span={24}>
                <Typography.Text type="secondary">用户ID：</Typography.Text>
                <Typography.Text style={{ marginLeft: 8 }}>{user?.key}</Typography.Text>
              </Col>
              <Col span={24}>
                <Typography.Text type="secondary">用户名：</Typography.Text>
                <Typography.Text style={{ marginLeft: 8 }}>{user?.username}</Typography.Text>
              </Col>
              <Col span={24}>
                <Typography.Text type="secondary">邮箱：</Typography.Text>
                <Typography.Text style={{ marginLeft: 8 }}>{user?.email}</Typography.Text>
              </Col>
            </Row>
            <Typography.Text type="danger" style={{ display: 'block', marginTop: 16 }}>
              此操作不可恢复！
            </Typography.Text>
          </div>
        );
      }
      case 'resetPassword': {
        return (
          <div style={{ 
            background: '#fffbe6', 
            padding: 16, 
            borderRadius: 4,
            border: '1px solid #ffe58f'
          }}>
            <Typography.Text type="secondary">
              系统将重置为默认密码，请提醒用户尽快修改密码。
            </Typography.Text>
          </div>
        );
      }
      case 'removeAssociation': {
        const { username, container } = data || {};
        return (
          <div style={{ 
            background: '#fff2f0', 
            padding: 16, 
            borderRadius: 4,
            border: '1px solid #ffccc7'
          }}>
            <Row gutter={[0, 12]}>
              <Col span={24}>
                <Typography.Text type="secondary">容器ID：</Typography.Text>
                <Typography.Text style={{ marginLeft: 8 }}>{container?.key}</Typography.Text>
              </Col>
              <Col span={24}>
                <Typography.Text type="secondary">容器名称：</Typography.Text>
                <Typography.Text style={{ marginLeft: 8 }}>{container?.container_name}</Typography.Text>
              </Col>
              <Col span={24}>
                <Typography.Text type="secondary">容器镜像：</Typography.Text>
                <Typography.Text style={{ marginLeft: 8 }}>{container?.container_image}</Typography.Text>
              </Col>
              <Col span={24}>
                <Typography.Text type="secondary">当前角色：</Typography.Text>
                <Tag color={
                  container?.userRole === 'ADMIN' ? 'volcano' : 
                  container?.userRole === 'COLLABORATOR' ? 'green' : 
                  'purple'
                } style={{ marginLeft: 8 }}>
                  {container?.userRole === 'ADMIN' ? '管理员' : 
                   container?.userRole === 'COLLABORATOR' ? '协作者' : 
                   '超级管理员'}
                </Tag>
              </Col>
            </Row>
          </div>
        );
      }
      default:
        return null;
    }
  };

  // 生成弹窗标题
  const getModalTitle = () => {
    const { type, data } = modal;
    
    switch (type) {
      case 'save':
        return `确定要保存用户 ${data?.username} 的信息吗？`;
      case 'delete':
        return `确定要删除用户 ${data?.username} 吗？`;
      case 'resetPassword':
        return `确定要重置用户 ${data?.username} 的密码吗？`;
      case 'removeAssociation':
        return `确定要将用户 ${data?.username} 从容器 ${data?.container?.container_name} 中移除吗？`;
      default:
        return '';
    }
  };

  // 获取弹窗配置
  const getModalConfig = () => {
    const { type } = modal;
    
    const config = {
      save: {
        title: '确认保存用户信息',
        danger: false,
        iconColor: '#faad14',
        confirmText: '确认保存'
      },
      delete: {
        title: '确认删除用户',
        danger: true,
        iconColor: '#ff4d4f',
        confirmText: '确认删除'
      },
      resetPassword: {
        title: '确认重置密码',
        danger: false,
        iconColor: '#faad14',
        confirmText: '确认重置'
      },
      removeAssociation: {
        title: '确认移除关联',
        danger: true,
        iconColor: '#ff4d4f',
        confirmText: '确认移除'
      }
    };
    
    return config[type] || {};
  };

  return (
    <>
      {/* 通用确认弹窗 */}
      <ConfirmModal
        visible={modal.visible}
        title={getModalConfig().title}
        message={getModalTitle()}
        content={getModalContent()}
        danger={getModalConfig().danger}
        iconColor={getModalConfig().iconColor}
        confirmText={getModalConfig().confirmText}
        onConfirm={handleModalConfirm}
        onCancel={closeModal}
        loading={modal.loading}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 1. 搜索区域（固定顶部） */}
        <div style={{ 
          padding: '16px', 
          background: '#fff', 
          borderBottom: '1px solid #f0f0f0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          position: 'sticky',
          top: 64,
          zIndex: 10
        }}>
          <Flex justify="center" align="center">
            <Space direction="horizontal" size="middle">
              <Row gutter={[16, 0]} align="middle">
                <Col>
                  <Typography.Text type="secondary">用户名：</Typography.Text>
                  <Input 
                  placeholder="输入用户名" 
                  value={searchUsername} 
                  onChange={e => setSearchUsername(e.target.value)} 
                  allowClear 
                  style={{ width: 120 }} 
                />
              </Col>
              <Col>
                <Typography.Text type="secondary">用户ID：</Typography.Text>
                <Input 
                  placeholder="输入用户ID" 
                  value={searchUserId} 
                  onChange={e => setSearchUserId(e.target.value)} 
                  allowClear 
                  style={{ width: 120 }} 
                />
              </Col>
              <Col>
                <Typography.Text type="secondary">邮箱：</Typography.Text>
                <Input 
                  placeholder="输入邮箱" 
                  value={searchEmail} 
                  onChange={e => setSearchEmail(e.target.value)} 
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
        </div>

      {/* 2. 下方区域：用户表格 */}
        <div style={{ padding: '16px' }}>
          <Table 
            dataSource={filteredUserData} 
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
                    // record.key is the user id string
                    fetchContainersForUser(record.key);
                  }
                },
              showExpandColumn: false,
              expandedRowRender: (record) => (
                <div style={{ margin: '16px 0', padding: '16px', background: '#fafafa', borderRadius: '4px' }}>
                  {/* 编辑功能标题 */}
                  <div style={{ 
                    marginBottom: '12px',
                    paddingBottom: '8px',
                    borderBottom: '1px solid #f0f0f0'
                  }}>
                    <Typography.Text strong style={{ fontSize: '14px' }}>
                      编辑用户信息 - {record.username}
                    </Typography.Text>
                  </div>

                  {/* 用户信息编辑卡片 - 紧凑设计 */}
                  <div style={{ 
                    background: '#fff', 
                    padding: '12px 16px', 
                    borderRadius: '4px',
                    border: '1px solid #f0f0f0',
                    marginBottom: '16px'
                  }}>
                    <Form layout="inline" initialValues={{
                      username: record.username,
                      email: record.email,
                      graduation_year: record.graduation_year,
                    }}>
                      <Row gutter={[16, 0]} align="middle" style={{ width: '100%' }}>
                        <Col flex="auto">
                          <Form.Item label="用户名" name="username" style={{ marginBottom: 0 }}>
                            <Input placeholder="请输入用户名" style={{ width: 150 }} />
                          </Form.Item>
                        </Col>
                        <Col flex="auto">
                          <Form.Item label="邮箱" name="email" style={{ marginBottom: 0 }}>
                            <Input placeholder="请输入邮箱" style={{ width: 200 }} />
                          </Form.Item>
                        </Col>
                        <Col flex="auto">
                          <Form.Item label="毕业年份" name="graduation_year" style={{ marginBottom: 0 }}>
                            <Input placeholder="请输入毕业年份" style={{ width: 120 }} />
                          </Form.Item>
                        </Col>
                        <Col>
                          <Space size="small">
                            <Button type="primary" size="small" onClick={() => handleSaveUser(record)}>保存</Button>
                            <Button size="small" onClick={() => toggleExpand(record.key)}>取消</Button>
                          </Space>
                        </Col>
                      </Row>
                    </Form>
                  </div>

                  {/* 用户容器子表格 */}
                  <Card 
                    title={`${record.username} 的容器`}
                    bordered={true}
                  >
                    {
                      (() => {
                        const id = String(record.key);
                        const childData = getUserContainers(record.username);
                        const loading = !!(containerMap[id] && containerMap[id].loading);
                        return (
                          <Table
                            dataSource={childData}
                            rowKey="key"
                            pagination={childData.length > 5 ? { pageSize: 5 } : false}
                            bordered
                            size="middle"
                            loading={loading}
                          >
                            <Column title="容器ID" dataIndex="key" key="key" />
                            <Column title="容器名称" dataIndex="container_name" key="container_name" />
                            <Column title="容器镜像" dataIndex="container_image" key="container_image" />
                            <Column title="端口" dataIndex="port" key="port" />
                            <Column 
                              title="容器状态" 
                              dataIndex="container_status" 
                              key="container_status" 
                              render={renderContainerStatus}
                            />
                            <Column 
                              title="用户角色" 
                              dataIndex="userRole" 
                              key="userRole" 
                              render={renderContainerRoleTag}
                            />
                            <Column
                              title="操作"
                              key="action"
                              render={(_, containerRecord) => (
                                <Button 
                                  danger 
                                  size="small"
                                  onClick={() => handleRemoveUserFromContainer(record.username, containerRecord)}
                                >
                                  移除关联
                                </Button>
                              )}
                            />
                          </Table>
                        );
                      })()
                    }
                  </Card>
                </div>
              )
            }}
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
                      style={{ color: '#1890ff' }}
                    >
                      {isExpanded ? '收起编辑' : '编辑用户'}
                    </Button>
                    <Button onClick={() => handleDeleteUser(record)}>
                      <a style={{ color: '#ff4d4f' }}>删除</a>
                    </Button>
                    <Button onClick={() => handleResetPassword(record)}>
                      <a style={{ color: '#faad14' }}>重置密码</a>
                    </Button>
                  </Space>
                );
              }}
            />
            <Column
              title="统计信息"
              key="stats"
              render={(_, record) => {
                // Always use bref counts returned by listAllUserBrefInformation
                const totalContainers = record.amount_of_container ?? record.amountOfContainer ?? (record.containers ? record.containers.length : 0) ?? 0;
                const runningContainers = record.amount_of_functional_container ?? record.amountOfFunctionalContainer ?? 0;
                const managedContainers = record.amount_of_managed_container ?? record.amountOfManagedContainer ?? 0;

                return (
                  <span style={{ fontSize: '13px' }}>
                    <span style={{ color: '#8c8c8c' }}>容器: </span>
                    <span style={{ color: '#1890ff', fontWeight: '500' }}>{totalContainers}</span>
                    <span style={{ color: '#8c8c8c', margin: '0 8px' }}>·</span>
                    <span style={{ color: '#8c8c8c' }}>正常: </span>
                    <span style={{ color: '#52c41a', fontWeight: '500' }}>{runningContainers}</span>
                    <span style={{ color: '#8c8c8c', margin: '0 8px' }}>·</span>
                    <span style={{ color: '#8c8c8c' }}>由你管理: </span>
                    <span style={{ color: '#faad14', fontWeight: '500' }}>{managedContainers}</span>
                  </span>
                );
              }}
            />
          </Table>
        </div>
      </div>
    </>
  );
};

export default ManageUser;