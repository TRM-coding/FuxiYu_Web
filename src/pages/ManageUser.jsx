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

const options = [
  { label: '无参与', value: 'Not-Involved', className: 'label-1' },
  { label: '合作者', value: 'Collaborator', title: '合作者', className: 'label-2' },
  { label: '管理者', value: 'Admin', title: '管理者', className: 'label-3' },
];

// 后续需要改动来源
const userData = [
  {
    key: '2410000',
    username: 'alice',
    email: 'alice@example.com',
    graduation_year: '2026',
  },
  {
    key: '2410001',
    username: 'bob',
    email: 'bob@example.com',
    graduation_year: '2026',
  },
{
    key: '2430000',
    username: 'test',
    email: 'test@example.com',
    graduation_year: '2028',
  },
];

const containerData = [
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

const ManageUser = () => {
  // 当前选中的用户key
  const [selectedUserKey, setSelectedUserKey] = useState(null);
  const [position, setPosition] = useState('end');

  // 容器radio的选中状态：{ [containerKey]: role }
  const [containerRadio, setContainerRadio] = useState({});

  // 选中用户后，自动根据accounts设置containerRadio
  React.useEffect(() => {
    if (!selectedUserKey) {
      setContainerRadio({});
      return;
    }
    // 遍历所有容器，查找该用户在accounts中的角色
    const newRadio = {};
    containerData.forEach(container => {
      const found = (container.accounts || []).find(([username, role]) => username === getUsernameByKey(selectedUserKey));
      if (found) newRadio[container.key] = found[1];
    });
    setContainerRadio(newRadio);
  }, [selectedUserKey]);

  // 辅助函数：根据user key查username
  function getUsernameByKey(key) {
    const user = userData.find(u => u.key === key);
    return user ? user.username : '';
  }

  // 用户radio change
  const onUserRadioChange = e => {
    setSelectedUserKey(e.target.value);
  };

  // 容器radio change
  const onContainerRadioChange = (containerKey, e) => {
    setContainerRadio(r => ({ ...r, [containerKey]: e.target.value }));
  };

  return (
    <Splitter layout="vertical" style={{ height: '100vh', boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)' }}>
      <Splitter.Panel  min="300px" max="30%">
          <div style={{ height: '90%', padding: '15px', overflowY: 'auto', minWidth: 300 }}>
            <Flex vertical justify="center" align="center" style={{ height: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Row gutter={[16, 16]} justify="center" align="middle">
                <Col xs={24} sm={12} md={6} style={{ minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography.Text type="secondary" style={{ display: 'block', marginBottom: '8px', textAlign: 'center' }}>用户名</Typography.Text>
                  <Input placeholder="Username" defaultValue="" allowClear style={{ width: '80%', minWidth: 160 }} />
                </Col>

                <Col xs={24} sm={12} md={6} style={{ minWidth: 200, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography.Text type="secondary" style={{ display: 'block', marginBottom: '8px', textAlign: 'center' }}>用户ID</Typography.Text>
                  <Input placeholder="User ID" defaultValue="" allowClear style={{ width: '80%', minWidth: 160 }} />
                </Col>

                <Col xs={24} sm={12} md={6} style={{ minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography.Text type="secondary" style={{ display: 'block', marginBottom: '8px', textAlign: 'center' }}>电子邮箱</Typography.Text>
                  <Input placeholder="Email" defaultValue="" style={{ width: '80%', minWidth: 80 }} />
                </Col>
                <Col xs={24} sm={12} md={6} style={{ minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Button type="primary" icon={<SearchOutlined />} iconPosition={position}>
                  Search
                </Button>
                </Col>

              </Row>
            </Space>
          </Flex>
        </div>
      </Splitter.Panel>
      <Splitter.Panel  min="50%" max="60%">
            <Splitter layout="horizontal" style={{ height: '100vh', boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)' }}>
                <Splitter.Panel min="50%" max="60%">
                <Table dataSource={userData} rowKey="key" style={{ padding: '16px' }} pagination={false}>
                  <Column
                    title="选择"
                    key="select"
                    render={(_, record) => (
                      <input
                        type="radio"
                        name="userRadio"
                        value={record.key}
                        checked={selectedUserKey === record.key}
                        onChange={onUserRadioChange}
                      />
                    )}
                  />
                  <Column title="用户名" dataIndex="username" key="username" render={text => <a>{text}</a>} />
                  <Column title="用户ID" dataIndex="key" key="key" />
                  <Column title="电子邮箱" dataIndex="email" key="email" />
                  <Column title="毕业年份" dataIndex="graduation_year" key="graduation_year" />
                  <Column
                    title="操作"
                    key="action"
                    render={(_, record) => (
                      <Space size="middle">
                        <a>删除用户 </a>
                        <a>重置密码 </a>
                      </Space>
                    )}
                  />
                </Table>
                </Splitter.Panel>
                <Splitter.Panel min="20%" max="40%">
                <Table dataSource={containerData} rowKey="key" style={{ padding: '16px' }} pagination={false}>
                  <Column title="容器名称" dataIndex="container_name" key="container_name" render={text => <a>{text}</a>} />
                  <Column title="容器ID" dataIndex="key" key="key" />
                  <Column title="端口" dataIndex="port" key="port" />
                  <Column
                    title="操作"
                    key="action"
                    render={(_, record) => {
                      // 当前选中用户
                      const username = getUsernameByKey(selectedUserKey);
                      // 该容器下所有用户的角色
                      const userRoles = (record.accounts || []);
                      // 当前用户在该容器的角色
                      let currentRole = undefined;
                      if (selectedUserKey && username) {
                        const found = userRoles.find(([u]) => u === username);
                        if (found) {
                          // accounts 里的角色是大写，映射到options的value
                          if (found[1] === 'ADMIN') currentRole = 'Admin';
                          else if (found[1] === 'COLLABORATOR') currentRole = 'Collaborator';
                          else currentRole = found[1];
                        } else {
                          currentRole = 'Not-Involved';
                        }
                      }
                      return (
                        <Radio.Group
                          options={options}
                          value={selectedUserKey ? currentRole : undefined}
                          onChange={e => {/* 可扩展：setContainerRadio等 */}}
                          optionType="button"
                          disabled={!selectedUserKey}
                        />
                      );
                    }}
                  />
                </Table>
                </Splitter.Panel>
            </Splitter>
      </Splitter.Panel>
    </Splitter>
  );
};

export default ManageUser;