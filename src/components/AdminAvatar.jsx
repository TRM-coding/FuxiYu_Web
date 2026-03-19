import React from 'react';
import { Space, Typography, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import './Navbar.css';

export default function AdminAvatar({ onNavigate }) {
  return (
    <Space 
      align="center" 
      className="navbar-avatar"
      onClick={() => onNavigate('/admin/profile')}
    >
      <Avatar icon={<UserOutlined />} />
      <Typography.Text strong>管理员</Typography.Text>
    </Space>
  );
}
