import React, { useState } from 'react';
import { Button, Checkbox, Form, Input, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../api/user_api';
import ConfirmModal from '../components/ConfirmModal';

const LoginBlock = () => {
	const [confirmVisible, setConfirmVisible] = useState(false);
	const [confirmTitle, setConfirmTitle] = useState('');
	const [confirmMessage, setConfirmMessage] = useState('');
	const [confirmContent, setConfirmContent] = useState(null);
	const navigate = useNavigate();

	const onFinish = async values => {
		try {
			const data = await loginUser(values);
			// 假设后端返回 { token: '...', success: true } 或类似结构
			if (data && (data.token || data.success !== false)) {
				if (data.token) localStorage.setItem('authToken', data.token);

      // if (data && Number(data.success) === 1) {
			// 	// Cookie 为 HttpOnly
        
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
			// 使用 ConfirmModal 显示错误，并保留后端返回详情位置
			setConfirmTitle('登录出错');
			setConfirmMessage(userMsg);
			setConfirmContent(<pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{errMsg}</pre>);
			setConfirmVisible(true);
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