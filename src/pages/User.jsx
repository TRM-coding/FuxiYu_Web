// src/pages/User.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, DatePicker, Button, Row, Col, Space, message, InputNumber, Typography } from 'antd';
import showErrorModal from '../utils/showErrorModal';
import { handleAuthError } from '../utils/authHelpers';
import { getUserDetailInformation, updateUser, changePasswordUser } from '../api/user_api';
import './User.css';

const User = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [graduation_year, setGraduationYear] = useState(null);
  const [originalInfo, setOriginalInfo] = useState({ username: '', email: '', graduation_year: null });
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isOperator, setIsOperator] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState(null);
  const [emailMsg, setEmailMsg] = useState(null);
  const [yearMsg, setYearMsg] = useState(null);
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [passwordMsgType, setPasswordMsgType] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // 读取当前用户信息，如果缺失则清除 auth 并重定向到登录
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const name = localStorage.getItem('currentUserName');
        const id = localStorage.getItem('currentUserId');
        // 需要同时拥有 name 和 id；如果缺失，先展示401提示，然后清除 auth 并强制登录
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
        setCurrentUserId(id);
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
    checkAuth();
  }, [navigate]);

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
        const isOp = info.is_operator === true || info.role === 'operator' || info.permission === 'operator' || (Array.isArray(info.permissions) && info.permissions.includes('operator')) || (typeof info.permissions === 'string' && info.permissions.includes('operator'));
        setIsOperator(Boolean(isOp));
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
      } catch (err) {
        console.error('Failed to load user detail', err);
        await showErrorModal({ message: err?.body?.message || '加载用户信息失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
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
    }
  };
  return (
    <Row 
      justify="center" 
      align="middle"  
      className="user-root-row"
    >
      {/* 增加span数值，让列更宽 */}
      <Col xs={24} sm={22} md={18} lg={14} offset={0}>
        <Card
          title="用户信息"
          bordered
          extra={isOperator ? <Button type="primary" onClick={() => navigate('/admin')}>管理后台</Button> : null}
          className="user-card"
        >
          <Form form={form} layout="vertical" initialValues={{}}>
            {/* 用户名 + 修改按钮 */}
            <Form.Item label="用户名" name="username" className="user-form-item">
              <Space>
                {/* 放大输入框宽度 - controlled to preserve auto-fill */}
                <Input placeholder="请输入用户名" className="user-input-300" maxLength={75} value={username} onChange={e => setUsername(e.target.value)} />
                {String(username) === String(originalInfo.username) ? (
                  <Button type="text" disabled>无变化</Button>
                ) : (
                  <Button type="text" onClick={async () => {
                    try {
                      const userId = Number(currentUserId);
                      await updateUser({ user_id: userId, fields: { username } });
                      setOriginalInfo(prev => ({ ...prev, username }));
                      setUsernameMsg('修改成功');
                      setTimeout(() => setUsernameMsg(null), 3000);
                    } catch (err) {
                      console.error('update username failed', err);
                      await showErrorModal({ message: err?.body?.message || '更新用户名失败', status: err?.status });
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
                <Input.Password placeholder="留空以不修改" className="user-input-300" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                <Button type="text" onClick={handleChangePassword}>修改密码</Button>
              </Space>
              {passwordMsg ? (
                <div className="user-msg-wrapper">
                  <Typography.Text className={passwordMsgType === 'error' ? 'user-msg-error' : 'user-msg-success'}>{passwordMsg}</Typography.Text>
                </div>
              ) : null}
            </Form.Item>
            <Form.Item label="新密码" name="new_password" className="user-form-item">
                <Input.Password placeholder="输入新密码" className="user-input-300" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </Form.Item>

            {/* 邮箱 + 修改按钮 */}
            <Form.Item label="邮箱" name="email" className="user-form-item">
              <Space>
                <Input placeholder="请输入邮箱" className="user-input-300" maxLength={115} value={email} onChange={e => setEmail(e.target.value)} />
                {String(email) === String(originalInfo.email) ? (
                  <Button type="text" disabled>无变化</Button>
                ) : (
                  <Button type="text" onClick={async () => {
                    try {
                      const userId = Number(currentUserId);
                      await updateUser({ user_id: userId, fields: { email } });
                      setOriginalInfo(prev => ({ ...prev, email }));
                      setEmailMsg('修改成功');
                      setTimeout(() => setEmailMsg(null), 3000);
                    } catch (err) {
                      console.error('update email failed', err);
                      await showErrorModal({ message: err?.body?.message || '更新邮箱失败', status: err?.status });
                    }
                  }}>修改</Button>
                )}
              </Space>
              {emailMsg ? (
                <div className="user-msg-wrapper">
                  <Typography.Text className="user-msg-success">{emailMsg}</Typography.Text>
                </div>
              ) : null}
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
                      await showErrorModal({ message: err?.body?.message || '更新毕业年份失败', status: err?.status });
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