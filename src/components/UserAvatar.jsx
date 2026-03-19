import React from 'react';
import { Space, Typography, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import './Navbar.css';

export default function UserAvatar({ onNavigate }) {
  return (
    <Space 
      align="center" 
      className="navbar-avatar"
      onClick={() => onNavigate('/index/user')}
    >
      <Avatar icon={<UserOutlined />} />
      <Typography.Text strong>用户</Typography.Text>
    </Space>
  );
}
