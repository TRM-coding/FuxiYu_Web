import React from 'react';
import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { message } from 'antd';

vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal();
  return { ...antd, message: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } };
});

import TemplateManager from '../pages/TemplateManager';

const SYSTEM = {
  id: 6,
  name: '系统模板',
  category: 'system',
  description: '内置',
  subject_template: '系统主题',
  body_template: '系统正文',
};

const PUT_ROUTE = 'https://ctrl/api/announcements/templates/6';

const originalGetComputedStyle = window.getComputedStyle;

const visibleDialogs = () => Array.from(document.querySelectorAll('.ant-modal'))
  .filter((element) => element.style.display !== 'none');

const dialogText = () => {
  const dialogs = visibleDialogs();
  if (!dialogs.length) throw new Error('当前没有可见弹窗');
  return dialogs[dialogs.length - 1].textContent || '';
};

const editDialog = () => Array.from(document.querySelectorAll('.ant-modal'))
  .find((element) => (element.textContent || '').includes('编辑模板 — 系统模板'));

const closeErrorDialog = async () => {
  const buttons = Array.from(document.querySelectorAll('.ant-modal button'))
    .filter((button) => (button.textContent || '').replace(/\s/g, '') === '好的');
  expect(buttons.length).toBeGreaterThan(0);
  await act(async () => {
    buttons[buttons.length - 1].click();
  });
};

describe('TemplateManager 系统模板类别 400 真实消费（Q51）', () => {
  let fetchMock;
  let putBody;

  beforeAll(() => {
    window.getComputedStyle = (element) => originalGetComputedStyle.call(window, element);
  });

  afterAll(() => {
    window.getComputedStyle = originalGetComputedStyle;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    putBody = null;
    fetchMock = vi.fn(async (url, options = {}) => {
      if (options.method === 'PUT') {
        putBody = JSON.parse(options.body);
        return {
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          url: PUT_ROUTE,
          json: async () => ({
            success: 0,
            message: 'cannot change system template category',
            error_reason: 'cannot_change_system_template_category',
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        url: String(url),
        json: async () => ({ templates: [SYSTEM], total: 1 }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(async () => {
    const buttons = Array.from(document.querySelectorAll('.ant-modal button'))
      .filter((button) => (button.textContent || '').replace(/\s/g, '') === '好的');
    for (const button of buttons) {
      await act(async () => {
        button.click();
      });
    }
    cleanup();
    vi.unstubAllGlobals();
  });

  it('test_q51_real_400_keeps_edit_and_shows_chinese', async () => {
    render(
      <MemoryRouter>
        <TemplateManager />
      </MemoryRouter>,
    );

    expect(await screen.findByText('系统模板')).toBeInTheDocument();
    fireEvent.click(screen.getByText('系统模板').closest('.ant-card').querySelector('.anticon-edit'));
    expect(await screen.findByText('编辑模板 — 系统模板')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('模板名称'), { target: { value: '新系统名' } });
    fireEvent.change(screen.getByPlaceholderText('模板描述（可选）'), { target: { value: '新系统描述' } });
    fireEvent.change(screen.getByPlaceholderText('邮件主题（纯文字）'), { target: { value: '新系统主题' } });
    fireEvent.change(screen.getByPlaceholderText('邮件正文（纯文字）'), { target: { value: '新系统正文' } });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(fetchMock.mock.calls.some(([, options]) => options?.method === 'PUT')).toBe(true));
    expect(putBody).toEqual({
      name: '新系统名',
      description: '新系统描述',
      subject_template: '新系统主题',
      body_template: '新系统正文',
      category: 'system',
    });

    await waitFor(() => expect(dialogText()).toContain('系统模板类别不可修改'));
    expect(dialogText()).not.toContain('未收录的错误原因');
    expect(message.success).not.toHaveBeenCalled();

    const listRequests = () => fetchMock.mock.calls.filter(([, options]) => !options?.method || options.method === 'GET');
    expect(listRequests()).toHaveLength(1);

    await closeErrorDialog();

    await waitFor(() => {
      const dialog = editDialog();
      expect(dialog).toBeTruthy();
      expect(dialog.style.display).not.toBe('none');
    });
    expect(screen.getByDisplayValue('新系统名')).toBeInTheDocument();
    expect(screen.getByDisplayValue('新系统描述')).toBeInTheDocument();
    expect(screen.getByDisplayValue('新系统主题')).toBeInTheDocument();
    expect(screen.getByDisplayValue('新系统正文')).toBeInTheDocument();

    const dialog = editDialog();
    expect(dialog.querySelector('.ant-select-selection-item')?.textContent).toContain('系统');
    expect(listRequests()).toHaveLength(1);
  });
});
