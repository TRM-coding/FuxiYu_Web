import React, { useState } from 'react';
import { Button, Form, Input, InputNumber } from 'antd';
import { isValidName } from '../utils/validateCmdArg';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../api/user_api';
import ConfirmModal from '../components/ConfirmModal';
import showErrorModal from '../utils/showErrorModal';
import './Register.css';
const layout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 16 },
};

const validateMessages = {
  required: '${label}是必填项!',
  types: {
    email: '${label}不是有效的邮箱地址!',
    number: '${label}不是有效的数字!',
  },
  number: {
    range: '${label}必须在${min}和${max}之间',
  },
};
/* onFinish is defined inside the component so it can access state setters */
const RegisterBlock = () => {
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmContent, setConfirmContent] = useState(null);
  const navigate = useNavigate();

  const onFinish = async values => {
    // client-side validation: username must match container-name rules; email/password ASCII-only
    const username = values.username || '';
    const email = values.email || '';
    const password = values.password || '';
    const isAscii = s => /^[\x00-\x7F]*$/.test(String(s || ''));
    if (!isValidName(username)) {
      await showErrorModal({ title: '注册出错', message: '用户名仅允许英文、数字和下划线' });
      return;
    }
    if (!isAscii(email) || !isAscii(password)) {
      await showErrorModal({ title: '注册出错', message: '禁止非ASCII字符（请勿输入中文）' });
      return;
    }
    try {
      const payload = {
        username: values.username,
        email: values.email,
        password: values.password,
        graduation_year: values.graduation_year ? Number(values.graduation_year) : null,
      };
      const res = await registerUser(payload);
      console.log('register result', res);
      // show modal and redirect to login on confirm
      setConfirmTitle('注册成功');
      setConfirmMessage(res && res.message ? String(res.message) : '注册成功，请登录。');
      setConfirmContent(
        <div>
          <div>用户名: {res && res.username}</div>
          <div>邮箱: {res && res.email}</div>
        </div>
      );
      setConfirmVisible(true);
    } catch (err) {
      // show error modal on exception
      console.error('Register error', err);
      const errMsg = err && err.message ? String(err.message) : '注册失败';
      await showErrorModal({ title: '注册出错', message: errMsg, status: err?.status });
    }
  };

  const handleConfirm = () => {
    setConfirmVisible(false);
    // 注册成功后跳转到登录页
    if (confirmTitle === '注册成功') navigate('/');
  };

  return (
  <>
  <Form
    {...layout}
    name="register"
    onFinish={onFinish}
    className="register-form"
    validateMessages={validateMessages}
  >
    <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
      <Input placeholder="请输入用户名（最多75字符）" maxLength={75} />
    </Form.Item>

    <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
      <Input placeholder="请输入邮箱" maxLength={115} />
    </Form.Item>

    <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
      <Input.Password placeholder="请输入密码" />
    </Form.Item>

    <Form.Item
      name="graduation_year"
      label="毕业年份"
      rules={[
        { type: 'number', min: 1900, max: 2100, required: true, message: '毕业年份必须在1900到2100之间' },
        {
          validator: (_, value) => {
            if (value === undefined || value === null || value === '') return Promise.resolve();
            return Number.isInteger(Number(value)) ? Promise.resolve() : Promise.reject(new Error('毕业年份只能为数字'));
          }
        }
      ]}
    >
      <InputNumber
        className="register-input-full"
        placeholder="如：2024"
        precision={0}
        step={1}
        min={1900}
        max={2100}
        parser={(val) => String(val || '').replace(/[^\d]/g, '')}
      />
    </Form.Item>

    <Form.Item label={null}>
      <Button type="primary" htmlType="submit">
        注册
      </Button>
    </Form.Item>
  </Form>
  <ConfirmModal
    visible={confirmVisible}
    title={confirmTitle}
    message={confirmMessage}
    content={confirmContent}
    onConfirm={handleConfirm}
    onCancel={() => setConfirmVisible(false)}
    confirmText="知道了"
    showCancel={false}
  />
  </>
  );
};

export default RegisterBlock;