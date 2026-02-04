// pages/AdminProfile.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Avatar, Typography, Descriptions } from 'antd';
import { UserOutlined } from '@ant-design/icons'; // 管理员默认图标
import showErrorModal from '../utils/showErrorModal';
import { getUserDetailInformation } from '../api/user_api';
import { handleAuthError } from '../utils/authHelpers';

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
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthAndPerm = async () => {
      try {
        const name = localStorage.getItem('currentUserName');
        const id = localStorage.getItem('currentUserId');
        if (!name || !id) {
          if (!sessionStorage.getItem('auth_modal_shown')) {
            try {
              sessionStorage.setItem('auth_modal_shown', '1');
              await showErrorModal({ title: '未登录', message: '登录已失效，请重新登录', status: 401 });
            } finally {
              sessionStorage.removeItem('auth_modal_shown');
            }
          }
          // 401: clear auth and navigate to login
          handleAuthError(401, navigate);
          return;
        }

        const res = await getUserDetailInformation(Number(id));
        const info = (res && (res.user_info || res.data)) || res || {};
        const isOperator = info.is_operator === true || info.role === 'operator' || info.permission === 'operator' || (Array.isArray(info.permissions) && info.permissions.includes('operator')) || (typeof info.permissions === 'string' && info.permissions.includes('operator'));
        if (!isOperator) {
          if (!sessionStorage.getItem('auth_modal_shown')) {
            try {
              sessionStorage.setItem('auth_modal_shown', '1');
              await showErrorModal({ title: '权限不足', message: '需要操作员权限', status: 403 });
            } finally {
              sessionStorage.removeItem('auth_modal_shown');
            }
          }
          // 403: do NOT clear auth; only navigate to /index
          handleAuthError(403, navigate);
          return;
        }
      } catch (e) {
        if (!sessionStorage.getItem('auth_modal_shown')) {
          try {
            sessionStorage.setItem('auth_modal_shown', '1');
            await showErrorModal({ title: '未登录', message: '登录已失效，请重新登录', status: 401 });
          } finally {
            sessionStorage.removeItem('auth_modal_shown');
          }
        }
        // 401: clear auth and navigate to login
        handleAuthError(401, navigate);
      }
    };
    checkAuthAndPerm();
  }, [navigate]);
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