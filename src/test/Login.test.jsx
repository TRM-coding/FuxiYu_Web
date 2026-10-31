import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

vi.mock('../contexts/PermissionContext', () => ({
  usePermission: () => ({
    loaded: false,
    userId: null,
    refresh: vi.fn(),
    hasPermission: () => false,
  }),
}));

vi.mock('../api/user_api', () => ({
  loginUser: vi.fn(),
}));

import { loginUser } from '../api/user_api';
import Login from '../pages/Login';

const renderLogin = () => render(
  <MemoryRouter initialEntries={['/']}>
    <Login />
  </MemoryRouter>,
);

const fillAndSubmit = async (user) => {
  await user.type(screen.getByPlaceholderText('用户名或邮箱'), 'alice');
  await user.type(screen.getByPlaceholderText('请输入密码'), 'secret');
  await user.click(screen.getByRole('button', { name: /登\s*录/ }));
};

const closeErrorModal = () => {
  const button = screen.queryByRole('button', { name: /好\s*的/ });
  if (button) fireEvent.click(button);
};

beforeEach(() => {
  vi.clearAllMocks();
  loginUser.mockReset();
});

afterEach(() => {
  closeErrorModal();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('Login 结构化错误与死分支清理', () => {
  it('test_q36_login_structured_error', async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    loginUser.mockRejectedValueOnce({
      body: { message: 'error', error_reason: 'password_incorrect' },
      status: 401,
      route: '/login',
    });

    renderLogin();
    await fillAndSubmit(user);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getAllByText('密码错误').length).toBeGreaterThan(0);
    expect(within(dialog).getAllByText('未授权，请登录后重试。').length).toBeGreaterThan(0);
    expect(consoleError.mock.calls.some(([first]) => /Login error|Failed:/.test(String(first)))).toBe(false);
  });

  it('test_q36_login_network_fallback', async () => {
    const user = userEvent.setup();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    loginUser.mockRejectedValueOnce(new Error('Failed to fetch'));

    renderLogin();
    await fillAndSubmit(user);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getAllByText('网络异常或请求超时，无法连接到服务器，请检查网络后重试。').length)
      .toBeGreaterThan(0);
  });

  it('test_q36_login_no_dead_branch_or_debug_console', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'src/pages/Login.jsx'), 'utf8');
    expect(source).not.toContain('userMsg');
    expect(source).not.toMatch(/console\.(?:error|log|warn)\(/);
    expect(source).toContain('showErrorModal');
    expect(source).toMatch(/err\?\.body\s*\|\|\s*err/);
  });
});
