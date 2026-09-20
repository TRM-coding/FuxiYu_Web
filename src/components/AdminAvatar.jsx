import React from 'react';
import { Space, Typography, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { usePermission } from '../contexts/PermissionContext';
import './Navbar.css';

export default function AdminAvatar({ onNavigate }) {
  // 用户名来自服务端（见 PermissionContext），不再读 localStorage 副本
  const { userName } = usePermission();
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
