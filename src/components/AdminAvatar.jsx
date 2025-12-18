import React from 'react';
import { Space, Typography, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';

export default function AdminAvatar({ onNavigate }) {
  return (
    <Space 
      align="center" 
      style={{ marginLeft: '20px', cursor: 'pointer', zIndex: 1001 }}
      onClick={() => onNavigate('/admin/profile')}
    >
      <Avatar icon={<UserOutlined />} />
      <Typography.Text strong>管理员</Typography.Text>
    </Space>
  );
}
