import React from 'react';
import { Space, Typography, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { usePermission } from '../contexts/PermissionContext';
import './Navbar.css';

export default function UserAvatar({ onNavigate }) {
  // 用户名来自服务端（见 PermissionContext），不再读 localStorage 副本；
  // 未登录/未加载完时回落占位，不阻塞渲染
  const { userName } = usePermission();
  return (
    <Space
      align="center"
      className="navbar-avatar"
      onClick={() => onNavigate('/index/user')}
    >
      <Avatar icon={<UserOutlined />} />
      <Typography.Text strong>{userName || '用户'}</Typography.Text>
    </Space>
  );
}
