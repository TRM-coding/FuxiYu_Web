import React from 'react';
import { Space, Typography, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';

export default function UserAvatar({ onNavigate }) {
  return (
    <Space 
      align="center" 
      style={{ marginRight: '20px', cursor: 'pointer', zIndex: 1001 }}
      onClick={() => onNavigate('/index/user')}
    >
      <Avatar icon={<UserOutlined />} />
      <Typography.Text strong>用户</Typography.Text>
    </Space>
  );
}
