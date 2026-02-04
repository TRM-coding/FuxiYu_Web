// src/pages/User.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Form, Input, DatePicker, Button, Row, Col, Space, message, InputNumber } from 'antd';
import showErrorModal from '../utils/showErrorModal';
import { handleAuthError } from '../utils/authHelpers';
import { getUserDetailInformation } from '../api/user_api';

const User = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [graduation_year, setGraduationYear] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

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
        form.setFieldsValue({
          username: info.username || '',
          email: info.email || '',
          graduation_year: info.graduation_year || null,
        });
      } catch (err) {
        console.error('Failed to load user detail', err);
        await showErrorModal({ message: '加载用户信息失败', status: err?.response?.status || err?.status });
      }
    };
    load();
  }, [currentUserId, form]);
  return (
    <Row 
      justify="center" 
      align="middle"  
      style={{ minHeight: 'calc(100vh - 100px)' }} 
    >
      {/* 增加span数值，让列更宽 */}
      <Col span={14} offset={0}>
        <Card 
          title="用户信息" 
          bordered 
          // 调整卡片宽度为100%，并增加内边距
          style={{ width: '100%', padding: '24px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}
        >
          <Form form={form} layout="vertical" initialValues={{}}>
            {/* 用户名 + 修改按钮 */}
            <Form.Item label="用户名" name="username" style={{ marginBottom: 16 }}>
              <Space>
                {/* 放大输入框宽度 */}
                <Input placeholder="请输入用户名" style={{ width: '300px' }} 
                value={username}/>
                <Button type="text">修改</Button>
              </Space>
            </Form.Item>

            {/* 当前密码（留空） + 新密码 */}
            <Form.Item label="当前密码" name="current_password" style={{ marginBottom: 16 }}>
              <Space>
                <Input.Password placeholder="留空以不修改" style={{ width: '300px' }} />
                <Button type="text">修改</Button>
              </Space>
            </Form.Item>
            <Form.Item label="新密码" name="new_password" style={{ marginBottom: 16 }}>
              <Input.Password placeholder="输入新密码" style={{ width: '300px' }} />
            </Form.Item>

            {/* 邮箱 + 修改按钮 */}
            <Form.Item label="邮箱" name="email" style={{ marginBottom: 16 }}>
              <Space>
                <Input placeholder="请输入邮箱" style={{ width: '300px' }} 
                value={email}/>
                <Button type="text">修改</Button>
              </Space>
            </Form.Item>

            {/* 毕业时间 + 修改按钮 */}
            <Form.Item label="毕业时间" name="graduation_year">
              <Space>
                <InputNumber placeholder="选择毕业年份" style={{ width: '300px' }} 
                value={graduation_year}/>
                <Button type="text">修改</Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </Col>
    </Row>
  );
};

export default User;