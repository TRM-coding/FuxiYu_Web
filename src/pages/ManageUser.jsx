import React, { useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Flex, Splitter, Typography, Row, Col, Button, Input, Space, Table } from 'antd';
const { Column } = Table;

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

const ManageUser = () => {
  const [position, setPosition] = useState('end');

  // 用户搜索条件
  const [userSearchUsername, setUserSearchUsername] = useState('');
  const [userSearchUserId, setUserSearchUserId] = useState('');
  const [userSearchEmail, setUserSearchEmail] = useState('');

  // 过滤用户数据
  const filteredUserData = userData.filter(user => {
    const matchUsername = user.username.toLowerCase().includes(userSearchUsername.toLowerCase());
    const matchUserId = user.key.includes(userSearchUserId);
    const matchEmail = user.email.toLowerCase().includes(userSearchEmail.toLowerCase());
    return matchUsername && matchUserId && matchEmail;
  });

  return (
    <Splitter layout="vertical" style={{ height: '100vh' }}>
      <Splitter.Panel min="300px" max="30%">
        <div style={{ height: '90%', padding: '15px', overflowY: 'auto', minWidth: 300 }}>
          <Flex vertical justify="center" align="center" style={{ height: '100%' }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Row gutter={[16, 16]} justify="center" align="middle">
          <Col xs={24} sm={12} md={6} style={{ minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: '8px', textAlign: 'center' }}>用户名</Typography.Text>
            <Input placeholder="Username" value={userSearchUsername} onChange={e => setUserSearchUsername(e.target.value)} allowClear style={{ width: '80%', minWidth: 160 }} />
          </Col>
          <Col xs={24} sm={12} md={6} style={{ minWidth: 200, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: '8px', textAlign: 'center' }}>用户ID</Typography.Text>
            <Input placeholder="User ID" value={userSearchUserId} onChange={e => setUserSearchUserId(e.target.value)} allowClear style={{ width: '80%', minWidth: 160 }} />
          </Col>
          <Col xs={24} sm={12} md={6} style={{ minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: '8px', textAlign: 'center' }}>电子邮箱</Typography.Text>
            <Input placeholder="Email" value={userSearchEmail} onChange={e => setUserSearchEmail(e.target.value)} allowClear style={{ width: '80%', minWidth: 80 }} />
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
      {/* 用户表格 */}
      <Splitter.Panel>
        <Table dataSource={filteredUserData} rowKey="key" style={{ padding: '16px' }} pagination={false}>
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
    </Splitter>
  );
};

export default ManageUser;