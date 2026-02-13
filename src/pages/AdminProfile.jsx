// pages/AdminProfile.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Avatar, Typography, Descriptions, Button } from 'antd';
import { UserOutlined } from '@ant-design/icons'; // 管理员默认图标
import showErrorModal from '../utils/showErrorModal';
import { getUserDetailInformation } from '../api/user_api';
import { handleAuthError } from '../utils/authHelpers';
import './AdminProfile.css';

const AdminProfile = () => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const checkAuthAndLoad = async () => {
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
          handleAuthError(403, navigate);
          return;
        }
        setUserInfo(info);
      } catch (e) {
        if (!sessionStorage.getItem('auth_modal_shown')) {
          try {
            sessionStorage.setItem('auth_modal_shown', '1');
            await showErrorModal({ title: '未登录', message: '登录已失效，请重新登录', status: 401 });
          } finally {
            sessionStorage.removeItem('auth_modal_shown');
          }
        }
        handleAuthError(401, navigate);
      }
    };
    checkAuthAndLoad();
  }, [navigate]);

  return (
    <div className="ap-wrap">
      <Card
        title="管理员信息"
        bordered={false}
        extra={<Button onClick={() => navigate('/index')}>返回首页</Button>}
      >
        <div className="ap-header">
          <Avatar size={80} icon={<UserOutlined />} className="ap-avatar" />
          <div className="ap-info">
            <Typography.Title level={3}>{userInfo?.username || userInfo?.display_name || userInfo?.name || '管理员'}</Typography.Title>
            <Typography.Text type="secondary">用户编码：{userInfo?.user_id || userInfo?.id || ''}</Typography.Text>
          </div>
        </div>
        <Descriptions column={2} bordered>
          <Descriptions.Item label="邮箱">{userInfo?.email || '未知'}</Descriptions.Item>
          <Descriptions.Item label="毕业年份">{userInfo?.graduation_year || '未知'}</Descriptions.Item>
          <Descriptions.Item label="拥有容器">{userInfo?.amount_of_container || ''}</Descriptions.Item>
          <Descriptions.Item label="操作权限">{userInfo ? '操作员 (operator)' : ''}</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default AdminProfile;