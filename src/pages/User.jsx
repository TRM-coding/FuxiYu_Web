// src/pages/User.jsx
import React from 'react';
import { Card, Form, Input, DatePicker, Button, Row, Col, Space } from 'antd';

const User = () => {
  return (
    <Row 
      justify="center" 
      align="middle"  
      style={{ minHeight: 'calc(100vh - 100px)' }} 
    >
      {/* 增加span数值，让列更宽 */}
      <Col span={14} offset={0}>
        <Card 
          title="用户信息" 
          bordered 
          // 调整卡片宽度为100%，并增加内边距
          style={{ width: '100%', padding: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}
        >
          <Form layout="vertical" initialValues={{}}>
            {/* 用户名 + 修改按钮 */}
            <Form.Item label="用户名" name="username" style={{ marginBottom: 16 }}>
              <Space>
                {/* 放大输入框宽度 */}
                <Input placeholder="请输入用户名" style={{ width: '300px' }} />
                <Button type="text">修改</Button>
              </Space>
            </Form.Item>

            {/* 密码 + 修改按钮 */}
            <Form.Item label="密码" name="password" style={{ marginBottom: 16 }}>
              <Space>
                <Input.Password placeholder="请输入密码" style={{ width: '300px' }} />
                <Button type="text">修改</Button>
              </Space>
            </Form.Item>

            {/* 邮箱 + 修改按钮 */}
            <Form.Item label="邮箱" name="email" style={{ marginBottom: 16 }}>
              <Space>
                <Input placeholder="请输入邮箱" style={{ width: '300px' }} />
                <Button type="text">修改</Button>
              </Space>
            </Form.Item>

            {/* 毕业时间 + 修改按钮 */}
            <Form.Item label="毕业时间" name="graduationDate">
              <Space>
                <DatePicker placeholder="选择毕业日期" style={{ width: '300px' }} />
                <Button type="text">修改</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </Col>
    </Row>
  );
};

export default User;