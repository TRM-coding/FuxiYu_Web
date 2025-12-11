import React, { useState } from 'react';
import { Button, Checkbox, Form, Input, message, Modal } from 'antd';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../api/user_api';

const LoginBlock = () => {
	const [errorData, setErrorData] = useState({ open: false, content: '' });
	const navigate = useNavigate();

	const onFinish = async values => {
		try {
			const data = await loginUser(values);
			// 假设后端返回 { token: '...', success: true } 或类似结构
			if (data && (data.token || data.success !== false)) {
				if (data.token) localStorage.setItem('authToken', data.token);
				message.success('登录成功');
				navigate('/dashboard'); // 根据实际前端路由调整目标路径
			} else {
				throw new Error('Login failed');
			}
		} catch (err) {
			console.error('Login error:', err);
			const errMsg = err.message;
			let userMsg = errMsg;
			if (errMsg.includes('Failed to fetch') || errMsg.toLowerCase().includes('refused') || errMsg.toLowerCase().includes('network')) {
				userMsg = '无法连接到后端服务（连接被拒绝），请确认后端已启动并且 BACKEND_BASE_URL 配置正确。';
			} else if (errMsg.toLowerCase().includes('timed out')) {
				userMsg = '请求超时，请稍后重试。';
			}
			message.error(userMsg);
			setErrorData({
				open: true,
				content: userMsg
			});
		}
	};

	const onFinishFailed = errorInfo => {
		console.log('Failed:', errorInfo);
		Modal.error({
			title: '表单校验失败',
			content: '请检查表单字段是否填写正确。'
		});
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
			<Modal
				title="登录出错"
				open={errorData.open}
				onOk={() => setErrorData({ open: false, content: '' })}
				onCancel={() => setErrorData({ open: false, content: '' })}
				okText="知道了"
				cancelText="取消"
			>
				<p>{errorData.content}</p>
			</Modal>
		</>
	);
};

export default LoginBlock;