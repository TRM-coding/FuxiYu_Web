import React, { useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Flex, Splitter, Typography, Row, Col, Button, Input, Space, Table, Tag, message } from 'antd';
import { Radio } from 'antd';
import ConfirmModal from '../components/ConfirmModal';
const { Column, ColumnGroup } = Table;

const Desc = props => (
  <Flex justify="center" align="center" style={{ height: '100%' }}>
    <Typography.Title type="secondary" level={5} style={{ whiteSpace: 'nowrap' }}>
      {props.text}
    </Typography.Title>
  </Flex>
);


const data = [
  {
    key: '1',
    container_name: 'web',
    container_image: 'nginx:1.25',
    machine_id: '1',
    container_status: 'online',
    port: '5017',
    // accounts as list of [username, role]
    accounts: [['alice', 'ADMIN']],
  },
  {
    key: '2',
    container_name: 'db',
    container_image: 'mysql:8.0',
    machine_id: '2',
    container_status: 'maintenance',
    port: '5011',
    accounts: [['test', 'ADMIN'], ['alice', 'COLLABORATOR']],
  },
  {
    key: '3',
    container_name: 'api',
    container_image: 'python:3.11',
    machine_id: '4',
    container_status: 'online',
    port: '5012',
    accounts: [['alice', 'ADMIN'], ['bob', 'COLLABORATOR']],
  },
];

const Home = () => {
  const [value3, setValue3] = useState('Any');
  const [position, setPosition] = useState('end');
  // temporary current user for UI behavior
  const currentUser = 'alice';

  // Modal state
  const [modal, setModal] = useState({
    visible: false,
    type: '', // 'delete' | 'leave' | 'removeUser' | 'changeRole' | 'invite'
    loading: false,
    data: null,
  });

  // helpers
  const getRoleForUser = (accounts, username) => {
    if (!accounts) return null;
    if (Array.isArray(accounts)) {
      for (const item of accounts) {
        if (Array.isArray(item)) {
          if (item[0] === username) return item[1];
        } else if (item && typeof item === 'object') {
          if ((item.name ?? item.username) === username) return item.type ?? item.role ?? null;
        }
      }
    } else if (accounts && typeof accounts === 'object') {
      if ((accounts.name ?? accounts.username) === username) return accounts.type ?? accounts.role ?? null;
    }
    return null;
  };

  const handleInvite = record => {
    setModal({ visible: true, type: 'invite', loading: false, data: { record } });
  };
  const handleDeleteContainer = record => {
    setModal({ visible: true, type: 'delete', loading: false, data: { record } });
  };
  const handleLeave = record => {
    setModal({ visible: true, type: 'leave', loading: false, data: { record } });
  };
  const handleRemoveUser = (record, username) => {
    setModal({ visible: true, type: 'removeUser', loading: false, data: { record, username } });
  };
  const handleChangeRole = (record, username) => {
    setModal({ visible: true, type: 'changeRole', loading: false, data: { record, username } });
  };

  const closeModal = () => {
    setModal({ visible: false, type: '', loading: false, data: null });
  };

  const handleModalConfirm = () => {
    setModal(prev => ({ ...prev, loading: true }));
    
    setTimeout(() => {
      const { type, data } = modal;
      
      switch (type) {
        case 'delete':
          console.log('删除容器:', data.record);
          message.success(`容器 ${data.record.container_name} 已删除`);
          break;
        case 'leave':
          console.log('退出容器:', data.record);
          message.success(`已退出容器 ${data.record.container_name}`);
          break;
        case 'removeUser':
          console.log('移除用户:', data.username, 'from', data.record);
          message.success(`已将 ${data.username} 移出容器`);
          break;
        case 'changeRole':
          console.log('变更角色:', data.username, 'in', data.record);
          message.success(`已变更 ${data.username} 的角色`);
          break;
        case 'invite':
          console.log('邀请用户到:', data.record);
          message.success(`已发送邀请`);
          break;
        default:
          break;
      }
      
      setModal({ visible: false, type: '', loading: false, data: null });
    }, 500);
  };

  const onChange3 = ({ target: { value } }) => {
    console.log('radio3 checked', value);
    setValue3(value);
  };

  const getModalConfig = () => {
    const { type, data } = modal;
    
    const configs = {
      delete: {
        title: '确认删除容器',
        message: `确定要删除容器 ${data?.record?.container_name} 吗？`,
        content: (
          <div style={{ background: '#fff2f0', padding: 16, borderRadius: 4, border: '1px solid #ffccc7' }}>
            <Typography.Text type="danger">此操作不可恢复！容器内所有数据将被永久删除。</Typography.Text>
          </div>
        ),
        danger: true,
        iconColor: '#ff4d4f',
        confirmText: '确认删除'
      },
      leave: {
        title: '确认退出容器',
        message: `确定要退出容器 ${data?.record?.container_name} 吗？`,
        content: (
          <div style={{ background: '#fffbe6', padding: 16, borderRadius: 4, border: '1px solid #ffe58f' }}>
            <Typography.Text>退出后需要管理员重新邀请才能加入。</Typography.Text>
          </div>
        ),
        danger: false,
        iconColor: '#faad14',
        confirmText: '确认退出'
      },
      removeUser: {
        title: '确认移除用户',
        message: `确定要将 ${data?.username} 从容器中移除吗？`,
        content: (
          <div style={{ background: '#fff2f0', padding: 16, borderRadius: 4, border: '1px solid #ffccc7' }}>
            <Typography.Text>该用户将无法访问此容器。</Typography.Text>
          </div>
        ),
        danger: true,
        iconColor: '#ff4d4f',
        confirmText: '确认移除'
      },
      changeRole: {
        title: '确认变更角色',
        message: `确定要变更 ${data?.username} 的角色吗？`,
        content: (
          <div style={{ background: '#e6f7ff', padding: 16, borderRadius: 4, border: '1px solid #91d5ff' }}>
            <Typography.Text>角色变更将影响该用户的权限。</Typography.Text>
          </div>
        ),
        danger: false,
        iconColor: '#1890ff',
        confirmText: '确认变更'
      },
      invite: {
        title: '确认邀请用户',
        message: `确定要邀请用户加入容器 ${data?.record?.container_name} 吗？`,
        content: null,
        danger: false,
        iconColor: '#52c41a',
        confirmText: '确认邀请'
      }
    };
    
    return configs[type] || {};
  };

  return (
    <>
      <ConfirmModal
        visible={modal.visible}
        title={getModalConfig().title}
        message={getModalConfig().message}
        content={getModalConfig().content}
        danger={getModalConfig().danger}
        iconColor={getModalConfig().iconColor}
        confirmText={getModalConfig().confirmText}
        onConfirm={handleModalConfirm}
        onCancel={closeModal}
        loading={modal.loading}
      />
      
    <Splitter layout="vertical" style={{ height: '100vh', boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)' }}>
      <Splitter.Panel>
        <Table dataSource={data} style={{ padding: '16px' }}>
          <Column title="容器名称" dataIndex="container_name" key="container_name" render={text => <a>{text}</a>} />
          <Column title="容器ID" dataIndex="key" key="key" />
          <Column title="容器蓝图" dataIndex="container_image" key="container_image" />
          <Column title="机器ID" dataIndex="machine_id" key="machine_id" />
          <Column
            title="容器状态"
            dataIndex="container_status"
            key="container_status"
            render={status => {
              let color = status === 'online' ? 'green' : status === 'offline' ? 'volcano' : 'orange';
              return <Tag color={color}>{String(status).toUpperCase()}</Tag>;
            }}
          />
          <Column title="端口" dataIndex="port" key="port" />
          <Column
            title="人员组"
            dataIndex="accounts"
            key="accounts"
            render={(accounts, record) => {
              // normalize accounts into [{username, role}]
              let list = [];
              if (Array.isArray(accounts)) {
                // items may be [username, role] or username strings
                list = accounts.map(item => {
                  if (Array.isArray(item)) {
                    return { username: item[0], role: item[1] };
                  }
                  if (item && typeof item === 'object') {
                    return { username: item.name ?? item.username ?? String(item), role: item.type ?? item.role ?? null };
                  }
                  return { username: String(item), role: null };
                });
              } else if (accounts && typeof accounts === 'object') {
                // single object shape
                list = [{ username: accounts.name ?? accounts.username ?? String(accounts), role: accounts.type ?? accounts.role ?? null }];
              }

              // sort ADMIN first
              list.sort((a, b) => (a.role === 'ADMIN' && b.role !== 'ADMIN' ? -1 : b.role === 'ADMIN' && a.role !== 'ADMIN' ? 1 : 0));

              return (
                <>
                  {list.map(({ username, role }, idx) => {
                    const isAdmin = getRoleForUser(record.accounts, currentUser) === 'ADMIN';
                    return (
                      <Tag
                        color={role === 'ADMIN' ? 'volcano' : 'green'}
                        key={`${username}-${idx}`}
                        closable={isAdmin}
                        onClose={e => {
                          if (e && typeof e.preventDefault === 'function') {
                            e.preventDefault();
                            e.stopPropagation && e.stopPropagation();
                          }
                          handleRemoveUser(record, username);
                        }}
                      >
                        {String(username)}
                        {isAdmin && role !== 'ADMIN' && (
                          <a
                            onClick={e => {
                              e && typeof e.preventDefault === 'function' && e.preventDefault();
                              e && e.stopPropagation && e.stopPropagation();
                              handleChangeRole(record, username);
                            }}
                            style={{ marginLeft: 8, color: 'rgba(255,255,255,0.9)', textDecoration: 'underline' }}
                          >
                            ⚙
                          </a>
                        )}
                      </Tag>
                    );
                  })}
                </>
              );
            }}
          />
          <Column
            title="操作"
            key="action"
            render={(_, record) => {
              const myRole = getRoleForUser(record.accounts, currentUser);
              if (myRole === 'ADMIN') {
                return (
                  <Space size="middle">
                    <a onClick={() => handleInvite(record)}>邀请</a>
                    <a onClick={() => handleDeleteContainer(record)}>删除容器</a>
                  </Space>
                );
              }
              if (myRole === 'COLLABORATOR') {
                return (
                  <Space size="middle">
                    <a onClick={() => handleLeave(record)}>退出</a>
                  </Space>
                );
              }
              // default actions for others
              return (
                <Space size="middle">
                  <a onClick={() => console.log('request access', record)}>申请访问</a>
                </Space>
              );
            }}
          />
        </Table>
      </Splitter.Panel>
    </Splitter>
    </>
  );
};

export default Home;