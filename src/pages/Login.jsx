import React, { useEffect, useState } from 'react';
import { Button, Checkbox, Form, Input, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../api/user_api';
import ConfirmModal from '../components/ConfirmModal';
import showErrorModal from '../utils/showErrorModal';
import { usePermission } from '../contexts/PermissionContext';
import './Login.css';

const LoginBlock = () => {
	const [confirmVisible, setConfirmVisible] = useState(false);
	const [confirmTitle, setConfirmTitle] = useState('');
	const [confirmMessage, setConfirmMessage] = useState('');
	const [confirmContent, setConfirmContent] = useState(null);
	const navigate = useNavigate();
	const { loaded, userId, refresh } = usePermission();

	// 已经是登录态就别停在登录页。判据来自服务端（cookie 换来的那次权限请求），
	// 不再是 localStorage 里的副本——那份副本会和 cookie 各说各话，互相把人推来推去。
	useEffect(() => {
		if (loaded && userId) {
			navigate('/index', { replace: true });
		}
	}, [loaded, userId, navigate]);

	const onFinish = async values => {
		try {
			const data = await loginUser(values);
			if (data && (data.success !== false)) {
				// 登录成功后必须重建快照：首屏那次请求是匿名发的（401），
				// 身份与权限都还没拿到；换账号时同样靠它覆盖上一个人的权限。
				try {
					await refresh();
				} catch (e) {
					// 快照没拿到不该挡住"登录成功"这件事本身；进站后任何请求都会再给出答案
				}
				message.success('登录成功');
				navigate('/index');
			} else {
				throw new Error('Login failed');
			}
		} catch (err) {
			console.error('Login error:', err);
			const errMsg = err.message || '请求发生错误';
			let userMsg = errMsg;
			if (errMsg.includes('Failed to fetch') || errMsg.toLowerCase().includes('refused') || errMsg.toLowerCase().includes('network')) {
				userMsg = '无法连接到后端服务（连接被拒绝），请确认后端已启动并且 BACKEND_BASE_URL 配置正确。';
			} else if (errMsg.toLowerCase().includes('timed out')) {
				userMsg = '请求超时，请稍后重试。';
			}
			// use showErrorModal to display exceptions
			await showErrorModal({ title: '登录出错', message: err?.body || err || userMsg, status: err?.status || undefined, route: err?.route || err?.response?.url });
		}
	};

	const onFinishFailed = errorInfo => {
		console.log('Failed:', errorInfo);
		setConfirmTitle('表单校验失败');
		setConfirmMessage('请检查表单字段是否填写正确。');
		setConfirmContent(null);
		setConfirmVisible(true);
	};

	return (
		<>
			<Form
				name="basic"
				labelCol={{ span: 8 }}
				wrapperCol={{ span: 16 }}
				className="login-form"
				initialValues={{ remember: true }}
				onFinish={onFinish}
				onFinishFailed={onFinishFailed}
			>
				<Form.Item
					label="用户名 / 邮箱"
					name="username"
					rules={[{ required: true, message: '请输入用户名或邮箱' }]}
				>
					<Input placeholder="用户名或邮箱" autoComplete="username" />
				</Form.Item>

				<Form.Item
					label="密码"
					name="password"
					rules={[{ required: true, message: 'Please input your password!' }]}
				>
					<Input.Password placeholder="请输入密码" autoComplete="current-password" />
				</Form.Item>

				<Form.Item name="remember" valuePropName="checked" label={null}>
					<Checkbox>记住我</Checkbox>
				</Form.Item>

				<Form.Item label={null}>
					<Button type="primary" htmlType="submit">
						登录
					</Button>
				</Form.Item>
			</Form>
			<ConfirmModal
				visible={confirmVisible}
				title={confirmTitle}
				message={confirmMessage}
				content={confirmContent}
				onConfirm={() => setConfirmVisible(false)}
				onCancel={() => setConfirmVisible(false)}
				confirmText="知道了"
				showCancel={false}
			/>
		</>
	);
};

export default LoginBlock;
