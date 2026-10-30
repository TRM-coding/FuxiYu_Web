import React from 'react';
import fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../api/user_api', () => ({
  registerUser: vi.fn(),
  requestRegisterCode: vi.fn(),
}));

// 默认导出用替身断言页面调用；真实 routeErrorMap 用于逐行核对规格表。
vi.mock('../utils/showErrorModal', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, default: vi.fn() };
});

import { registerUser, requestRegisterCode } from '../api/user_api';
import showErrorModal, { routeErrorMap } from '../utils/showErrorModal';
import Register from '../pages/Register';

const ALLOWED_EMAIL = 'alice@bjtu.edu.cn';

const REGISTER_ERROR_TABLE = [
  { route: '/register', reason: 'username_exists', text: '用户名已存在' },
  { route: '/register', reason: 'email_exists', text: '邮箱已存在' },
  { route: '/register', reason: 'invalid_username', text: '用户名仅允许英文、数字和下划线' },
  { route: '/register', reason: 'no_none_ascii', text: '禁止非ASCII字符（请勿输入中文）' },
  { route: '/register', reason: 'registration_code_required', text: '请填写注册验证码' },
  { route: '/register', reason: 'registration_code_invalid', text: '注册验证码无效或已过期' },
  { route: '/register', reason: 'mail_send_failed', text: '验证邮件发送失败' },
  { route: '/register', reason: 'email_domain_not_allowed', text: '该邮箱域名不允许注册' },
];

const REQUEST_CODE_ERROR_TABLE = [
  { route: '/request_register_code', reason: 'missing_email', text: '请输入邮箱' },
  { route: '/request_register_code', reason: 'email_domain_not_allowed', text: '该邮箱域名不允许注册' },
  { route: '/request_register_code', reason: 'mail_send_failed', text: '验证邮件发送失败' },
  { route: '/request_register_code', reason: 'code_creation_failed', text: '验证码生成失败，请稍后重试' },
];

const apiError = (route, reason, status = 400) => {
  const body = { success: 0, message: `后端原因 ${reason}`, error_reason: reason };
  return Object.assign(new Error(`${route} failed: ${status}`), {
    status,
    route: `https://ctrl${route}`,
    body,
  });
};

const renderRegister = () =>
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  );

const fillEmail = (value = ALLOWED_EMAIL) => {
  fireEvent.change(screen.getByPlaceholderText('请输入学校邮箱'), { target: { value } });
};

const fillRegisterForm = async () => {
  fillEmail();
  fireEvent.change(screen.getByPlaceholderText('请输入用户名（最多75字符）'), {
    target: { value: 'alice' },
  });
  fireEvent.change(screen.getByPlaceholderText('输入邮箱验证码'), {
    target: { value: '123456' },
  });
  fireEvent.change(screen.getByPlaceholderText('请输入密码'), {
    target: { value: 'Password123' },
  });
  fireEvent.change(screen.getByPlaceholderText('如：2024'), {
    target: { value: '2024' },
  });
};

const submitRegister = () => {
  fireEvent.click(screen.getByRole('button', { name: /^注\s*册$/ }));
};

const sendCode = () => {
  fireEvent.click(screen.getByRole('button', { name: /发送验证码/ }));
};

beforeEach(() => {
  registerUser.mockReset();
  requestRegisterCode.mockReset();
  showErrorModal.mockReset();
});

describe('Register Q36 删除无效 validateMessages 并保留字段消息', () => {
  it('test_q36_register_field_rule_message', async () => {
    renderRegister();
    submitRegister();

    expect(await screen.findByText('请输入用户名')).toBeTruthy();
    expect(await screen.findByText('请输入有效邮箱')).toBeTruthy();
    expect(await screen.findByText('请输入邮箱验证码')).toBeTruthy();
    expect(await screen.findByText('请输入密码')).toBeTruthy();
    expect(await screen.findByText('毕业年份必须在1900到2100之间')).toBeTruthy();
  });

  it('test_q36_register_no_validate_messages', () => {
    const source = fs.readFileSync('src/pages/Register.jsx', 'utf8');
    expect(source).not.toContain('validateMessages');
    expect(source).toContain('请输入用户名');
    expect(source).toContain('请输入有效邮箱');
    expect(source).toContain('请输入邮箱验证码');
    expect(source).toContain('请输入密码');
  });
});

describe('Register Q37 注册与验证码错误映射', () => {
  it.each(REQUEST_CODE_ERROR_TABLE)(
    'test_q37_register_request_code_domain_mapping: $reason',
    async ({ route, reason, text }) => {
      const error = apiError(route, reason);
      requestRegisterCode.mockRejectedValue(error);

      renderRegister();
      fillEmail();
      sendCode();

      await waitFor(() => expect(showErrorModal).toHaveBeenCalledTimes(1));
      const args = showErrorModal.mock.calls[0][0];
      expect(args.message).toBe(error.body);
      expect(args.status).toBe(error.status);
      expect(args.route).toBe(error.route);
      expect(routeErrorMap[route][reason]).toBe(text);
    },
  );

  it.each(REGISTER_ERROR_TABLE)(
    'test_q37_register_code_mapping: $reason',
    async ({ route, reason, text }) => {
      const error = apiError(route, reason);
      registerUser.mockRejectedValue(error);

      renderRegister();
      await fillRegisterForm();
      submitRegister();

      await waitFor(() => expect(registerUser).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(showErrorModal).toHaveBeenCalledTimes(1));
      const args = showErrorModal.mock.calls[0][0];
      expect(args.message).toBe(error.body);
      expect(args.status).toBe(error.status);
      expect(args.route).toBe(error.route);
      expect(routeErrorMap[route][reason]).toBe(text);
    },
  );

  it('test_q37_register_structured_call', async () => {
    const error = apiError('/register', 'registration_code_invalid', 400);
    registerUser.mockRejectedValue(error);

    renderRegister();
    await fillRegisterForm();
    submitRegister();

    await waitFor(() => expect(showErrorModal).toHaveBeenCalledTimes(1));
    const args = showErrorModal.mock.calls[0][0];
    expect(args.message).toBe(error.body);
    expect(typeof args.message).toBe('object');
    expect(args.message.error_reason).toBe('registration_code_invalid');
    expect(args.message).not.toBe(error.message);
    expect(args.status).toBe(400);
    expect(args.route).toBe(error.route);
  });
});



describe('verification cooldown', () => {
  it('uses the requested email and restores its countdown when switching back', async () => {
    requestRegisterCode.mockResolvedValue({ success: 1, retry_after_seconds: 42 });
    renderRegister(); fillEmail(); sendCode();
    const button = await screen.findByRole('button', { name: /\u79d2\u540e\u53ef\u91cd\u53d1/ });
    expect(button).toBeDisabled();
    fillEmail('other@bjtu.edu.cn');
    expect(await screen.findByRole('button', { name: /\u53d1\u9001\u9a8c\u8bc1\u7801/ })).toBeEnabled();
    fillEmail();
    expect(await screen.findByRole('button', { name: /\u79d2\u540e\u53ef\u91cd\u53d1/ })).toBeDisabled();
    expect(requestRegisterCode).toHaveBeenCalledTimes(1);
  });

  it('starts on rate limited but not on ordinary failure', async () => {
    const error = apiError('/request_register_code', 'rate_limited', 429);
    error.body.retry_after_seconds = 20;
    requestRegisterCode.mockRejectedValueOnce(error);
    renderRegister(); fillEmail(); sendCode();
    expect(await screen.findByRole('button', { name: /\u79d2\u540e\u53ef\u91cd\u53d1/ })).toBeDisabled();
    fillEmail('other@bjtu.edu.cn');
    requestRegisterCode.mockRejectedValueOnce(apiError('/request_register_code', 'mail_send_failed', 500));
    sendCode();
    await waitFor(() => expect(requestRegisterCode).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByRole('button', { name: /\u53d1\u9001\u9a8c\u8bc1\u7801/ })).toBeEnabled());
  });
});


it('counts down to zero and re-enables the button', async () => {
  requestRegisterCode.mockResolvedValue({ success: 1, retry_after_seconds: 1 });
  renderRegister(); fillEmail(); sendCode();
  expect(await screen.findByRole('button', { name: /\u79d2\u540e\u53ef\u91cd\u53d1/ })).toBeDisabled();
  expect(await screen.findByRole('button', { name: /\u53d1\u9001\u9a8c\u8bc1\u7801/ }, { timeout: 4000 })).toBeEnabled();
});

it('binds a late response to the email that initiated it', async () => {
  let finish;
  requestRegisterCode.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  renderRegister(); fillEmail(); sendCode();
  await waitFor(() => expect(requestRegisterCode).toHaveBeenCalledTimes(1));
  fillEmail('other@bjtu.edu.cn');
  finish({ success: 1, retry_after_seconds: 30 });
  await waitFor(() => expect(screen.getByRole('button', { name: /\u53d1\u9001\u9a8c\u8bc1\u7801/ })).toBeEnabled());
  fillEmail();
  expect(await screen.findByRole('button', { name: /\u79d2\u540e\u53ef\u91cd\u53d1/ })).toBeDisabled();
});


it('rebuilds cooldown from a rate-limited response after remount', async () => {
  requestRegisterCode.mockResolvedValueOnce({ success: 1, retry_after_seconds: 30 });
  const page = renderRegister(); fillEmail(); sendCode();
  expect(await screen.findByRole('button', { name: /\u79d2\u540e\u53ef\u91cd\u53d1/ })).toBeDisabled();
  page.unmount();
  const error = apiError('/request_register_code', 'rate_limited', 429);
  error.body.retry_after_seconds = 12;
  requestRegisterCode.mockRejectedValueOnce(error);
  renderRegister(); fillEmail(); sendCode();
  const button = await screen.findByRole('button', { name: /\u79d2\u540e\u53ef\u91cd\u53d1/ });
  expect(button.textContent).toMatch(/1[12]/);
  expect(button).toBeDisabled();
});
