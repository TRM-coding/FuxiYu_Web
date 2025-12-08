// pages/AdminProfile.jsx
import React from 'react';
import { Card, Avatar, Typography, Descriptions } from 'antd';
import { UserOutlined } from '@ant-design/icons'; // 管理员默认图标

// 临时模拟管理员数据（移除网络头像地址，只用默认图标）
const adminData = {
  name: '系统管理员',
  code: 'ADMIN001',
  // 删掉网络头像地址，改用内置图标
  role: '超级管理员',
  createTime: '2025-01-01',
  status: '在线'
};

const AdminProfile = () => {
  return (
    <div style={{ padding: '20px' }}>
      <Card title="管理员信息" bordered={false}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          {/* 核心修改：只用 icon 属性，去掉 src（避免加载网络图片） */}
          <Avatar size={80} icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
          <div style={{ marginLeft: '20px' }}>
            <Typography.Title level={3}>{adminData.name}</Typography.Title>
            <Typography.Text type="secondary">管理员编码：{adminData.code}</Typography.Text>
          </div>
        </div>
        {/* 管理员详细信息 */}
        <Descriptions column={2} bordered>
          <Descriptions.Item label="角色">{adminData.role}</Descriptions.Item>
          <Descriptions.Item label="状态">{adminData.status}</Descriptions.Item>
          <Descriptions.Item label="创建时间">{adminData.createTime}</Descriptions.Item>
          <Descriptions.Item label="操作权限">全部权限</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default AdminProfile;