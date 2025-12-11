import React from 'react';
import { Button, Checkbox, Form, Input } from 'antd';
import { loginUser } from '../api/user_api';

const onFinish = async values => {
  try {
    await loginUser(values);
    // handle success (e.g., navigate or show message)
  } catch (err) {
    console.log('Login error:', err);
  }
};

const onFinishFailed = errorInfo => {
  console.log('Failed:', errorInfo);
};

const LoginBlock = () => (
  <Form
    name="basic"
    labelCol={{ span: 8 }}
    wrapperCol={{ span: 16 }}
    style={{ maxWidth: 600 }}
    initialValues={{ remember: true }}
    onFinish={onFinish}
    onFinishFailed={onFinishFailed}
    autoComplete="off"
  >
    <Form.Item
      label="Username"
      name="username"
      rules={[{ required: true, message: 'Please input your username!' }]}
    >
      <Input />
    </Form.Item>

    <Form.Item
      label="Password"
      name="password"
      rules={[{ required: true, message: 'Please input your password!' }]}
    >
      <Input.Password />
    </Form.Item>

    <Form.Item name="remember" valuePropName="checked" label={null}>
      <Checkbox>Remember me</Checkbox>
    </Form.Item>

    <Form.Item label={null}>
      <Button type="primary" htmlType="submit">
        Submit
      </Button>
    </Form.Item>
  </Form>
);

export default LoginBlock;