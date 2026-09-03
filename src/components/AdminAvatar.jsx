import React from 'react';
import { Space, Typography, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import './Navbar.css';

export default function AdminAvatar({ onNavigate }) {
  // 右上角显示当前登录用户名（登录时写入 localStorage），未登录时回落占位
  const userName = localStorage.getItem('currentUserName');
  return (
    <Space
      align="center"
      className="navbar-avatar"
      onClick={() => onNavigate('/admin/profile')}
    >
      <Avatar icon={<UserOutlined />} />
      <Typography.Text strong>{userName || '管理员'}</Typography.Text>
    </Space>
  );
}
