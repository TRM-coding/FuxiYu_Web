import React, { useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Flex, Splitter, Typography, Row, Col, Button, Input, Space, Table, Tag } from 'antd';
import { Radio } from 'antd';
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
    console.log('invite on', record);
  };
  const handleDeleteContainer = record => {
    console.log('delete container', record);
  };
  const handleLeave = record => {
    console.log('leave container', record);
  };
  const handleRemoveUser = (record, username) => {
    console.log('remove user', username, 'from', record);
  };
  const handleChangeRole = (record, username) => {
    console.log('change role for', username, 'in', record);
  };

  const onChange3 = ({ target: { value } }) => {
    console.log('radio3 checked', value);
    setValue3(value);
  };

  return (
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
                          // Temporarily do not remove tag on close — just log and prevent default behavior
                          if (e && typeof e.preventDefault === 'function') {
                            e.preventDefault();
                            e.stopPropagation && e.stopPropagation();
                          }
                          console.log('close clicked (no-op):', username, 'on', record);
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
  );
};

export default Home;