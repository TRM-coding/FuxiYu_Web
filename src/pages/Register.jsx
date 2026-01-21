import React, { useState } from 'react';
import { Button, Form, Input, InputNumber } from 'antd';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../api/user_api_chester';
import ConfirmModal from '../components/ConfirmModal';
const layout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 16 },
};
const validateMessages = {
  required: '${label} is required!',
  types: {
    email: '${label} is not a valid email!',
    number: '${label} is not a valid number!',
  },
  number: {
    range: '${label} must be between ${min} and ${max}',
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
    try {
      const payload = {
        username: values.username,
        email: values.email,
        password: values.password,
        graduation_year: values.graduation_year || null,
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
      // show modal on error
      console.error('Register error', err);
      const errMsg = err && err.message ? err.message : '注册失败';
      setConfirmTitle('注册出错');
      setConfirmMessage(errMsg);
      setConfirmContent(<pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{String(err)}</pre>);
      setConfirmVisible(true);
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
    style={{ maxWidth: 600 }}
    validateMessages={validateMessages}
  >
    <Form.Item name="username" label="Username" rules={[{ required: true, message: 'Please input your username!' }]}>
      <Input />
    </Form.Item>

    <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Please input a valid email!' }]}>
      <Input />
    </Form.Item>

    <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Please input your password!' }]}>
      <Input.Password />
    </Form.Item>

    <Form.Item name="graduation_year" label="Graduation Year" rules={[{ type: 'number', min: 1900, max: 2100 }]}>
      <InputNumber style={{ width: '100%' }} />
    </Form.Item>

    <Form.Item label={null}>
      <Button type="primary" htmlType="submit">
        Submit
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
    cancelText="取消"
  />
  </>
  );
};

export default RegisterBlock;