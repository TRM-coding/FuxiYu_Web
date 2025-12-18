// pages/Register.jsx
import React, { useState } from 'react';
import { Button, Form, Input, InputNumber, message, Alert } from 'antd';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser } from '../api/user_api';

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

const RegisterBlock = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    setLoading(true);
    setError(null);

    try {
      console.log('提交注册信息:', values);
      
      // 从表单值中提取数据
      const { username, email, password, graduation_year } = values.user;
      
      // 调用注册API
      const result = await registerUser({
        username,
        email,
        password,
        graduation_year
      }, 15000); // 15秒超时

      if (result.success) {
        message.success('注册成功！');
        console.log('注册成功:', result.data);
        
        // 显示成功信息
        message.success(`欢迎 ${result.data.username}，注册成功！`);
        
        // 清空表单
        form.resetFields();
        
        // 延迟跳转到登录页面
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    } catch (err) {
      console.error('注册失败:', err);
      setError(err.message || '注册失败，请重试');
      message.error(err.message || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const onFinishFailed = (errorInfo) => {
    console.log('表单验证失败:', errorInfo);
    message.error('请检查表单输入是否正确');
  };

  return (
    <div style={{ 
      maxWidth: 600, 
      margin: '40px auto', 
      padding: '40px',
      background: '#fff',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ 
        textAlign: 'center', 
        marginBottom: '30px',
        color: '#1890ff'
      }}>
        用户注册
      </h2>
      
      {error && (
        <Alert
          message="注册失败"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: '20px' }}
          closable
          onClose={() => setError(null)}
        />
      )}
      
      <Form
        form={form}
        {...layout}
        name="register-form"
        onFinish={onFinish}
        onFinishFailed={onFinishFailed}
        style={{ maxWidth: 600 }}
        validateMessages={validateMessages}
        disabled={loading}
      >
        <Form.Item
          name={['user', 'username']}
          label="用户名"
          rules={[
            { required: true, message: '请输入用户名!' },
            { min: 3, message: '用户名至少3个字符!' },
            { max: 20, message: '用户名最多20个字符!' }
          ]}
        >
          <Input placeholder="请输入用户名（3-20个字符）" />
        </Form.Item>
        
        <Form.Item
          name={['user', 'email']}
          label="邮箱"
          rules={[
            { required: true, message: '请输入邮箱!' },
            { type: 'email', message: '请输入有效的邮箱地址!' }
          ]}
        >
          <Input placeholder="请输入邮箱地址" />
        </Form.Item>
        
        <Form.Item
          name={['user', 'password']}
          label="密码"
          rules={[
            { required: true, message: '请输入密码!' },
            { min: 6, message: '密码长度不能少于6个字符!' },
            { max: 20, message: '密码长度不能超过20个字符!' }
          ]}
        >
          <Input.Password placeholder="请输入密码（6-20个字符）" />
        </Form.Item>
        
        <Form.Item
          name={['user', 'confirmPassword']}
          label="确认密码"
          dependencies={['user', 'password']}
          rules={[
            { required: true, message: '请确认密码!' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue(['user', 'password']) === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('两次输入的密码不一致!'));
              },
            }),
          ]}
        >
          <Input.Password placeholder="请再次输入密码" />
        </Form.Item>
        
        <Form.Item
          name={['user', 'graduation_year']}
          label="毕业年份"
          rules={[
            { required: true, message: '请输入毕业年份!' },
            { pattern: /^\d{4}$/, message: '请输入4位数的年份（如：2024）!' },
            { validator: (_, value) => {
                const year = parseInt(value);
                if (year < 2000 || year > 2100) {
                  return Promise.reject(new Error('年份必须在2000-2100之间!'));
                }
                return Promise.resolve();
              }
            }
          ]}
        >
          <InputNumber 
            placeholder="请输入毕业年份（如：2024）" 
            style={{ width: '100%' }}
            min={2000}
            max={2100}
          />
        </Form.Item>

        <Form.Item wrapperCol={{ ...layout.wrapperCol, offset: 8 }}>
          <Button 
            type="primary" 
            htmlType="submit" 
            loading={loading}
            style={{ 
              marginRight: '10px',
              width: '120px'
            }}
          >
            {loading ? '注册中...' : '立即注册'}
          </Button>
          <Button 
            type="default" 
            onClick={() => navigate('/')}
            style={{ width: '120px' }}
          >
            返回登录
          </Button>
        </Form.Item>

        <Form.Item wrapperCol={{ ...layout.wrapperCol, offset: 8 }}>
          <div style={{ 
            marginTop: '20px', 
            textAlign: 'center',
            color: '#666'
          }}>
            <span>已有账号？</span>
            <Link 
              to="/" 
              style={{ 
                marginLeft: '8px',
                color: '#1890ff',
                fontWeight: '500'
              }}
            >
              立即登录
            </Link>
          </div>
        </Form.Item>
      </Form>
    </div>
  );
};

export default RegisterBlock;