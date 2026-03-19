import React, { useState } from 'react';
import { Button, Form, Input, InputNumber, Space } from 'antd';
import { isValidName } from '../utils/validateCmdArg';
import { useNavigate } from 'react-router-dom';
import { registerUser, requestRegisterCode } from '../api/user_api';
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

const ALLOWED_EMAIL_HINT = '仅支持 bjtu.edu.cn / tsinghua.edu.cn / bupt.edu.cn';

const RegisterBlock = () => {
  const [form] = Form.useForm();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmContent, setConfirmContent] = useState(null);
  const [requestingCode, setRequestingCode] = useState(false);
  const [registering, setRegistering] = useState(false);
  const navigate = useNavigate();

  const getEmailDomain = (email = '') => {
    if (!String(email).includes('@')) return '';
    return String(email).split('@').pop().toLowerCase().trim();
  };

  const isAllowedEmail = (email = '') => {
    const domain = getEmailDomain(email);
    return ['bjtu.edu.cn', 'tsinghua.edu.cn', 'bupt.edu.cn'].includes(domain);
  };

  const handleSendCode = async () => {
    try {
      const { email } = await form.validateFields(['email']);
      if (!isAllowedEmail(email)) {
        await showErrorModal({ title: '邮箱不符合要求', message: ALLOWED_EMAIL_HINT });
        return;
      }
      setRequestingCode(true);
      const res = await requestRegisterCode({ email });
      setConfirmTitle('验证码已发送');
      setConfirmMessage(res?.message || '验证码已发送，请查看邮箱。');
      setConfirmContent(<div>邮箱：{email}</div>);
      setConfirmVisible(true);
    } catch (err) {
      if (err?.errorFields) return;
      await showErrorModal({ title: '发送验证码失败', message: err?.message || '发送失败' });
    } finally {
      setRequestingCode(false);
    }
  };

  const onFinish = async values => {
    const username = values.username || '';
    const email = values.email || '';
    const password = values.password || '';
    const registration_code = values.registration_code || '';
    const isAscii = s => /^[\x00-\x7F]*$/.test(String(s || ''));

    if (!isValidName(username)) {
      await showErrorModal({ title: '注册出错', message: '用户名仅允许英文、数字和下划线' });
      return;
    }
    if (!isAscii(email) || !isAscii(password) || !isAscii(registration_code)) {
      await showErrorModal({ title: '注册出错', message: '请输入有效的 ASCII 内容' });
      return;
    }
    if (!isAllowedEmail(email)) {
      await showErrorModal({ title: '注册出错', message: ALLOWED_EMAIL_HINT });
      return;
    }

    try {
      setRegistering(true);
      const payload = {
        username,
        email,
        password,
        graduation_year: values.graduation_year ? Number(values.graduation_year) : null,
        registration_code,
      };
      const res = await registerUser(payload);
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
      await showErrorModal({ title: '注册出错', message: err?.message || '注册失败', status: err?.status });
    } finally {
      setRegistering(false);
    }
  };

  const handleConfirm = () => {
    setConfirmVisible(false);
    if (confirmTitle === '注册成功') navigate('/');
  };

  return (
    <>
      <Form
        {...layout}
        form={form}
        name="register"
        onFinish={onFinish}
        className="register-form"
        validateMessages={validateMessages}
      >
        <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
          <Input placeholder="请输入用户名（最多75字符）" maxLength={75} />
        </Form.Item>

        <Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}>
          <Input placeholder="请输入学校邮箱" maxLength={115} />
        </Form.Item>

        <Form.Item label="验证码">
          <Space.Compact style={{ width: '100%' }}>
            <Form.Item
              name="registration_code"
              noStyle
              rules={[{ required: true, message: '请输入邮箱验证码' }]}
            >
              <Input placeholder="输入邮箱验证码" maxLength={6} />
            </Form.Item>
            <Button onClick={handleSendCode} loading={requestingCode}>
              发送验证码
            </Button>
          </Space.Compact>
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
          <Button type="primary" htmlType="submit" loading={registering}>
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
