// src/pages/User.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, DatePicker, Button, Row, Col, Space, message, InputNumber, Typography, Statistic, Tooltip } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import showErrorModal from '../utils/showErrorModal';
import { clearAuth } from '../utils/authHelpers';
import { getUserDetailInformation, updateUser, changePasswordUser, logoutUser } from '../api/user_api';
import { usePermission } from '../contexts/PermissionContext';
import './User.css';

const User = () => {
  const navigate = useNavigate();
  // 身份来自服务端（见 PermissionContext）：页面不再读 localStorage 副本，也不自己做
  // "未登录"门禁——未登录由全局 401 处理统一回登录页（2026-09 决策）。
  const { hasAnyManage, userId: currentUserId, clear: clearPermission } = usePermission();
  const [form] = Form.useForm();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [graduation_year, setGraduationYear] = useState(null);
  const [originalInfo, setOriginalInfo] = useState({ username: '', email: '', graduation_year: null });
  const [usernameMsg, setUsernameMsg] = useState(null);
  const [emailMsg, setEmailMsg] = useState(null);
  const [yearMsg, setYearMsg] = useState(null);
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [passwordMsgType, setPasswordMsgType] = useState(null);
  const [usernameInvalid, setUsernameInvalid] = useState(false);
  const [emailInvalid, setEmailInvalid] = useState(false);
  const [currentPasswordInvalid, setCurrentPasswordInvalid] = useState(false);
  const [newPasswordInvalid, setNewPasswordInvalid] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [containerStats, setContainerStats] = useState({
    total: 0,
    functional: 0,
    managed: 0,
  });

  // 加载用户详情
  useEffect(() => {
    if (!currentUserId) return; // 等待 currentUserId 加载完成
    const load = async () => {
      try {
        const res = await getUserDetailInformation(Number(currentUserId));
        // API 返回 { success: 1, user_info: { user_id, username, email, graduation_year, ... } }
        const info = res && res.user_info || {};
        // 将获取到的用户信息设置到状态和表单中
        setUsername(info.username || '');
        setEmail(info.email || '');
        setGraduationYear(info.graduation_year || null);
        setOriginalInfo({ username: info.username || '', email: info.email || '', graduation_year: info.graduation_year || null });
        setContainerStats({
          total: Number(info.amount_of_container || 0),
          functional: Number(info.amount_of_functional_container || 0),
          managed: Number(info.amount_of_managed_container || 0),
        });
        // clear inline messages when data loads
        setUsernameMsg(null);
        setEmailMsg(null);
        setYearMsg(null);
        setPasswordMsg(null);
        setPasswordMsgType(null);
        form.setFieldsValue({
              username: info.username || '',
              email: info.email || '',
              graduation_year: info.graduation_year || null,
            });
        setCurrentPassword('');
        setNewPassword('');
        setUsernameInvalid(false);
        setEmailInvalid(false);
        setCurrentPasswordInvalid(false);
        setNewPasswordInvalid(false);
      } catch (err) {
        console.error('Failed to load user detail', err);
        await showErrorModal({ message: err?.body || err || '加载用户信息失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
      }
    };
    load();
  }, [currentUserId, form]);
  
  

  const handleChangePassword = async () => {
    try {
      const old_password = currentPassword;
      const new_password = newPassword;
      if (!old_password || !new_password) {
        setPasswordMsg('请输入当前密码和新密码');
        setPasswordMsgType('error');
        setCurrentPasswordInvalid(!isAllAscii(old_password));
        setNewPasswordInvalid(!isAllAscii(new_password));
        return;
      }
      if (currentPasswordInvalid || newPasswordInvalid) {
        setPasswordMsg('密码包含非法字符（仅允许ASCII）');
        setPasswordMsgType('error');
        return;
      }
      const userId = Number(currentUserId);
      await changePasswordUser({ user_id: userId, old_password, new_password });
      setPasswordMsg('修改成功');
      setPasswordMsgType('success');
      setCurrentPassword('');
      setNewPassword('');
      try { form.setFieldsValue({ current_password: '', new_password: '' }); } catch (e) {}
      setTimeout(() => { setPasswordMsg(null); setPasswordMsgType(null); }, 3000);
    } catch (err) {
      console.error('change password failed', err);
      // show inline error instead of modal
      const msg = (err && err.body && err.body.message) ? String(err.body.message) : (err && err.message) ? String(err.message) : '修改密码失败';
      setPasswordMsg(msg);
      setPasswordMsgType('error');
      if (err && err.body && err.body.error_reason === 'no_none_ascii') {
        setCurrentPasswordInvalid(true);
        setNewPasswordInvalid(true);
      }
    }
  };

  const isAllAscii = (s) => {
    if (s === null || s === undefined) return true;
    try {
      return /^[\x00-\x7F]*$/.test(String(s));
    } catch (e) { return false; }
  };

  const isValidUsername = (s) => {
    if (s === null || s === undefined) return false;
    try { return /^[A-Za-z0-9_]+$/.test(String(s)); } catch (e) { return false; }
  };

  const handleLogout = async () => {
    try {
      await logoutUser(5000);
    } catch (err) {
      console.warn('Logout request failed:', err);
    } finally {
      // 登出只有服务端能完成（auth_token 是 HttpOnly，/logout 里 delete_cookie）。
      // 本地只需做一件事：清掉权限快照，否则换账号会看到上一个人的菜单。
      // 不再整页重载——那本来是"重载顺带把内存里的快照洗掉"的权宜之计。
      clearAuth();
      clearPermission();
      navigate('/', { replace: true });
    }
  };

  const cardExtra = (
    <Space size={8}>
      {hasAnyManage() ? <Button type="primary" onClick={() => navigate('/admin/users')}>管理后台</Button> : null}
      <Tooltip title="登出">
        <Button
          className="user-logout-button"
          icon={<LogoutOutlined />}
          onClick={handleLogout}
          aria-label="登出"
        />
      </Tooltip>
    </Space>
  );

  return (
    <Row 
      justify="center" 
      align="middle"  
      className="user-root-row"
    >
      {/* 增加span数值，让列更宽 */}
      <Col xs={24} sm={22} md={18} lg={14} offset={0}>
        <Card
          title="用户信息管理"
          bordered
          extra={cardExtra}
          className="user-card"
        >
          <Row gutter={[16, 12]} className="user-stats-row">
            <Col xs={12} md={8}>
              <Statistic title="容器" value={containerStats.total} />
            </Col>
            <Col xs={12} md={8}>
              <Statistic title="正常运行" value={containerStats.functional} />
            </Col>
            <Col xs={12} md={8}>
              <Statistic title="管理容器" value={containerStats.managed} />
            </Col>
          </Row>
          <Form form={form} layout="vertical" initialValues={{}}>
            {/* 用户名 + 修改按钮 */}
            <Form.Item label="用户名" name="username" className="user-form-item">
              <Space>
                {/* 放大输入框宽度 - controlled to preserve auto-fill */}
                <Input
                  placeholder="请输入用户名"
                  className="user-input-300"
                  maxLength={75}
                  value={username}
                  onChange={e => {
                    const v = e.target.value || '';
                    setUsername(v);
                    // username must match container-name rules
                    setUsernameInvalid(!isValidUsername(v));
                  }}
                  status={usernameInvalid ? 'error' : undefined}
                />
                {String(username) === String(originalInfo.username) ? (
                  <Button type="text" disabled>无变化</Button>
                ) : (
                  <Button type="text" onClick={async () => {
                    try {
                      if (usernameInvalid) {
                        setUsernameMsg('用户名仅允许英文、数字和下划线');
                        setTimeout(() => setUsernameMsg(null), 3000);
                        return;
                      }
                      const userId = Number(currentUserId);
                      await updateUser({ user_id: userId, fields: { username } });
                      setOriginalInfo(prev => ({ ...prev, username }));
                      setUsernameMsg('修改成功');
                      setTimeout(() => setUsernameMsg(null), 3000);
                    } catch (err) {
                      console.error('update username failed', err);
                      await showErrorModal({ message: err?.body || err || '更新用户名失败', status: err?.status });
                    }
                  }}>修改</Button>
                )}
              </Space>
              {usernameMsg ? (
                <div className="user-msg-wrapper">
                  <Typography.Text className="user-msg-success">{usernameMsg}</Typography.Text>
                </div>
              ) : null}
            </Form.Item>

            {/* 当前密码（留空） + 新密码 */}
            <Form.Item label="当前密码" name="current_password" className="user-form-item">
              <Space>
                <Input.Password
                  placeholder="此处修改的是伏羲平台网页登录密码哦~"
                  className="user-input-300"
                  value={currentPassword}
                  onChange={e => {
                    const v = e.target.value || '';
                    setCurrentPassword(v);
                    setCurrentPasswordInvalid(!isAllAscii(v));
                  }}
                  status={currentPasswordInvalid ? 'error' : undefined}
                />
                <Button type="text" onClick={handleChangePassword}>修改</Button>
              </Space>
              {passwordMsg ? (
                <div className="user-msg-wrapper">
                  <Typography.Text className={passwordMsgType === 'error' ? 'user-msg-error' : 'user-msg-success'}>{passwordMsg}</Typography.Text>
                </div>
              ) : null}
            </Form.Item>
            <Form.Item label="新的密码" name="new_password" className="user-form-item">
                <Input.Password
                  placeholder="输入新密码"
                  className="user-input-300"
                  value={newPassword}
                  onChange={e => {
                    const v = e.target.value || '';
                    setNewPassword(v);
                    setNewPasswordInvalid(!isAllAscii(v));
                  }}
                  status={newPasswordInvalid ? 'error' : undefined}
                />
            </Form.Item>

            {/* 邮箱 */}
            <Form.Item label="邮箱" name="email" className="user-form-item">
              <Space>
                <Input
                  placeholder="请输入邮箱"
                  className="user-input-300"
                  maxLength={115}
                  value={email}
                  disabled
                />
                <Button type="text" disabled>不允许修改</Button>
              </Space>
            </Form.Item>

            {/* 毕业时间 + 修改按钮 */}
            <Form.Item label="毕业时间" name="graduation_year">
              <Space>
                <InputNumber placeholder="选择毕业年份" className="user-input-300" value={graduation_year} onChange={v => setGraduationYear(v)} />
                {String(graduation_year) === String(originalInfo.graduation_year) ? (
                  <Button type="text" disabled>无变化</Button>
                ) : (
                  <Button type="text" onClick={async () => {
                    try {
                      const userId = Number(currentUserId);
                      await updateUser({ user_id: userId, fields: { graduation_year } });
                      setOriginalInfo(prev => ({ ...prev, graduation_year }));
                      setYearMsg('修改成功');
                      setTimeout(() => setYearMsg(null), 3000);
                    } catch (err) {
                      console.error('update graduation_year failed', err);
                      await showErrorModal({ message: err?.body || err || '更新毕业年份失败', status: err?.status });
                    }
                  }}>修改</Button>
                )}
              </Space>
              {yearMsg ? (
                <div className="user-msg-wrapper">
                  <Typography.Text className="user-msg-success">{yearMsg}</Typography.Text>
                </div>
              ) : null}
            </Form.Item>
          </Form>
        </Card>
      </Col>
    </Row>
  );
};

export default User;
