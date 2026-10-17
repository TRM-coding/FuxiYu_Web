// pages/AdminProfile.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Avatar, Typography, Descriptions, Button } from 'antd';
import { UserOutlined } from '@ant-design/icons'; // 管理员默认图标
import showErrorModal from '../utils/showErrorModal';
import { getUserDetailInformation } from '../api/user_api';
import { handleAuthError } from '../utils/authHelpers';
import { usePermission } from '../contexts/PermissionContext';
import './AdminProfile.css';

const AdminProfile = () => {
  const navigate = useNavigate();
  const { hasPermission, loaded: permLoaded, userId: currentUserId } = usePermission();
  const [userInfo, setUserInfo] = useState(null);

  // 门禁只剩"授权"这一层（operator 通配判定）：**认证不在这里判**——
  // 未登录由全局 401 处理统一回登录页，页面不再读 localStorage 副本（2026-09 决策）。
  useEffect(() => {
    if (!permLoaded) return;
    if (!hasPermission('bypass_auth_entity')) {
      if (!sessionStorage.getItem('auth_modal_shown')) {
        try {
          sessionStorage.setItem('auth_modal_shown', '1');
          showErrorModal({ title: '权限不足', message: '需要操作员权限', status: 403 });
        } finally {
          sessionStorage.removeItem('auth_modal_shown');
        }
      }
      handleAuthError(403, navigate);
      return;
    }
    const loadDetail = async () => {
      try {
        const res = await getUserDetailInformation(Number(currentUserId));
        const info = (res && (res.user_info || res.data)) || res || {};
        setUserInfo(info);
      } catch (e) {
        // 401 不在这里处理：api 层统一发信号、App 级监听器清快照并回登录页。
        // 其它失败保持原行为——不弹框（这一页空着比误报更不打扰）。
      }
    };
    loadDetail();
  }, [permLoaded, hasPermission]);

  return (
    <div className="ap-wrap">
      <Card
        title="管理员信息"
        bordered={false}
        className="ap-card"
        extra={<Button onClick={() => navigate('/index')}>退出管理员页面</Button>}
      >
        <div className="ap-header">
          <Avatar size={80} icon={<UserOutlined />} className="ap-avatar" />
          <div className="ap-info">
            <Typography.Title level={3}>{userInfo?.username || userInfo?.display_name || userInfo?.name || '管理员'}</Typography.Title>
            <Typography.Text type="secondary">用户编码：{userInfo?.user_id || userInfo?.id || ''}</Typography.Text>
          </div>
        </div>
        <Descriptions column={{ xs: 1, sm: 1, md: 2 }} bordered>
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