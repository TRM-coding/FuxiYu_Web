import React, { useState } from 'react';
import { SearchOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { Flex, Splitter, Typography, Row, Col, Button, Input, Space, Table, Form, DatePicker, Card, Tag, message } from 'antd';
import ConfirmModal from '../components/ConfirmModal';
const { Column } = Table;

// 后续需要改动来源
const userData = [
  {
    key: '1', // 代指user_id
    username: 'alice',
    email: 'alice@example.com',
    graduation_year: '2026',
  },
  {
    key: '2',
    username: 'bob',
    email: 'bob@example.com',
    graduation_year: '2027',
  },
  {
    key: '3',
    username: 'carol',
    email: 'carol@example.com',
    graduation_year: '2025',
  },
  {
    key: '4',
    username: 'dave',
    email: 'dave@example.com',
    graduation_year: '2028',
  },
  {
    key: '5',
    username: 'erin',
    email: 'erin@example.com',
    graduation_year: '2026',
  },
  {
    key: '6',
    username: 'frank',
    email: 'frank@example.com',
    graduation_year: '2027',
  },
  {
    key: '7',
    username: 'admin_root',
    email: 'root@example.com',
    graduation_year: '2024',
  },
];

// 容器数据
const containerData = [
  {
    key: '1', // 代指container_id
    container_name: 'web',
    container_image: 'nginx:1.25',
    machine_id: '1',
    container_status: 'online',
    port: '8080',
    accounts: [['alice', 'ADMIN']],
  },
  {
    key: '2',
    container_name: 'db',
    container_image: 'mysql:8.0',
    machine_id: '1',
    container_status: 'maintenance',
    port: '3306',
    accounts: [['test', 'ADMIN'], ['alice', 'COLLABORATOR']],
  },
  {
    key: '3',
    container_name: 'api',
    container_image: 'python:3.11',
    machine_id: '2',
    container_status: 'offline',
    port: '9000',
    accounts: [['bob', 'COLLABORATOR']],
  },
  {
    key: '4',
    container_name: 'web-node-b',
    container_image: 'nginx:1.25',
    machine_id: '2',
    container_status: 'online',
    port: '8081',
    accounts: [['carol', 'COLLABORATOR']],
  },
  {
    key: '5',
    container_name: 'cache',
    container_image: 'redis:7',
    machine_id: '1',
    container_status: 'online',
    port: '6379',
    accounts: [['carol', 'COLLABORATOR']],
  },
  {
    key: '6',
    container_name: 'ml',
    container_image: 'pytorch/pytorch:2.4.0',
    machine_id: '1',
    container_status: 'online',
    port: '7010',
    accounts: [['alice', 'ADMIN']],
  },
  {
    key: '7',
    container_name: 'db-postgres',
    container_image: 'postgres:16',
    machine_id: '2',
    container_status: 'online',
    port: '5432',
    accounts: [['bob', 'COLLABORATOR']],
  },
  {
    key: '8',
    container_name: 'runner',
    container_image: 'ghcr.io/actions/runner:latest',
    machine_id: '2',
    container_status: 'maintenance',
    port: '9123',
    accounts: [['bob', 'COLLABORATOR']],
  },
  {
    key: '9',
    container_name: 'web-node-c',
    container_image: 'nginx:1.27',
    machine_id: '3',
    container_status: 'online',
    port: '8082',
    accounts: [['carol', 'COLLABORATOR'], ['dave', 'COLLABORATOR']],
  },
  {
    key: '10',
    container_name: 'api-v2',
    container_image: 'python:3.12',
    machine_id: '3',
    container_status: 'online',
    port: '9001',
    accounts: [['dave', 'COLLABORATOR']],
  },
  {
    key: '11',
    container_name: 'db-mysql-3307',
    container_image: 'mysql:8.4',
    machine_id: '3',
    container_status: 'maintenance',
    port: '3307',
    accounts: [['frank', 'COLLABORATOR']],
  },
  {
    key: '12',
    container_name: 'monitor',
    container_image: 'prom/prometheus:latest',
    machine_id: '4',
    container_status: 'online',
    port: '9090',
    accounts: [['erin', 'COLLABORATOR']],
  },
  {
    key: '13',
    container_name: 'web-node-d',
    container_image: 'nginx:1.27',
    machine_id: '4',
    container_status: 'offline',
    port: '8083',
    accounts: [['frank', 'COLLABORATOR']],
  },
  {
    key: '14',
    container_name: 'central-db',
    container_image: 'mysql:8.0',
    machine_id: '1',
    container_status: 'online',
    port: '3308',
    accounts: [['admin_root', 'ROOT'], ['alice', 'ADMIN']],
  },
  {
    key: '15',
    container_name: 'core-api',
    container_image: 'python:3.12',
    machine_id: '2',
    container_status: 'online',
    port: '9002',
    accounts: [['admin_root', 'ROOT']],
  },
  {
    key: '16',
    container_name: 'backup-system',
    container_image: 'ubuntu:24.04',
    machine_id: '3',
    container_status: 'online',
    port: '8084',
    accounts: [['admin_root', 'ROOT'], ['bob', 'ADMIN']],
  },
];

const ManageUser = () => {
  // 用户搜索状态
  const [searchUsername, setSearchUsername] = useState('');
  const [searchUserId, setSearchUserId] = useState('');
  const [searchEmail, setSearchEmail] = useState('');

  // 展开的行key
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);

  // 通用弹窗状态
  const [modal, setModal] = useState({
    visible: false,
    type: '', // 'save' | 'delete' | 'resetPassword' | 'removeAssociation'
    loading: false,
    data: null,
  });

  // 过滤用户数据
  const filteredUserData = userData.filter(user => {
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
  const getUserContainers = (username) => {
    return containerData
      .filter(container => {
        const role = getUserRoleInContainer(container.accounts, username);
        return role !== null;
      })
      .map(container => ({
        ...container,
        userRole: getUserRoleInContainer(container.accounts, username)
      }));
  };

  // 切换展开状态
  const toggleExpand = (userId) => {
    setExpandedRowKeys(prev => {
      if (prev.includes(userId)) {
        return prev.filter(key => key !== userId);
      } else {
        return [...prev, userId];
      }
    });
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
            pagination={{ pageSize: 10 }}
            bordered
            scroll={{ x: true }}
            expandable={{
              expandedRowKeys,
              onExpandedRowsChange: (expandedKeys) => {
                setExpandedRowKeys(expandedKeys);
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
                    <Table
                      dataSource={getUserContainers(record.username)}
                      rowKey="key"
                      pagination={getUserContainers(record.username).length > 5 ? { pageSize: 5 } : false}
                      bordered
                      size="middle"
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
                const userContainers = getUserContainers(record.username);
                const totalContainers = userContainers.length;
                const runningContainers = userContainers.filter(c => c.container_status === 'online').length;
                const managedContainers = userContainers.filter(c => {
                  const role = getUserRoleInContainer(c.accounts, record.username);
                  return role === 'ADMIN' || role === 'ROOT';
                }).length;
                
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