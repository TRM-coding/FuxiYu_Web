import React from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../contexts/PermissionContext', () => ({
  usePermission: () => ({
    loaded: true,
    hasPermission: code => code === 'settings:manage',
  }),
}));

vi.mock('../api/settings_api', () => ({
  listSystemSettings: vi.fn(),
  updateSystemSettings: vi.fn(),
}));

// 默认导出用替身断言调用口径；保留真实 routeErrorMap 验证规格表。
vi.mock('../utils/showErrorModal', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, default: vi.fn() };
});

import { listSystemSettings, updateSystemSettings } from '../api/settings_api';
import showErrorModal, { routeErrorMap } from '../utils/showErrorModal';
import Settings from '../pages/Settings';

const SETTINGS = [
  {
    key: 'container.cleanup_after_days',
    label: '自动清理天数',
    group: '容器清理',
    value_type: 'integer',
    value: 7,
    min_value: 1,
    description: '容器长时间未 SSH 登录后的自动清理阈值。',
  },
  {
    key: 'container.cleanup_reminder_hours',
    label: '清理提醒节点',
    group: '容器清理',
    value_type: 'text',
    value: '72,24,12',
    description: '容器清理前邮件提醒节点，单位小时，逗号分隔。',
  },
];

const groupItem = (group, index) => ({
  key: `test.group_${index}`,
  label: `设置项 ${index}`,
  group,
  value_type: 'text',
  value: '原始值',
  description: '用于分组顺序断言。',
});

const renderSettings = () =>
  render(
    <MemoryRouter initialEntries={['/admin/settings']}>
      <Settings />
    </MemoryRouter>,
  );

const fieldFor = label => screen.getByText(label).closest('.settings-item');
const inputFor = label => fieldFor(label).querySelector('input');
const saveButton = () => screen.getByRole('button', { name: /保存/ });

const waitForDirty = async () => {
  await waitFor(() => expect(screen.getByText(/1 项待保存/)).toBeTruthy());
};

beforeEach(() => {
  listSystemSettings.mockReset();
  updateSystemSettings.mockReset();
  showErrorModal.mockReset();
  listSystemSettings.mockResolvedValue({ settings: SETTINGS });
  updateSystemSettings.mockImplementation(async (values) => ({
    settings: SETTINGS.map(item => ({
      ...item,
      value: Object.prototype.hasOwnProperty.call(values, item.key) ? values[item.key] : item.value,
    })),
  }));
});

describe('Settings Q23 整数与提醒节点校验', () => {
  it('test_q23_settings_integer_valid', async () => {
    renderSettings();
    await screen.findByText('自动清理天数');

    fireEvent.change(inputFor('自动清理天数'), { target: { value: '9' } });
    await waitForDirty();
    fireEvent.click(saveButton());

    await waitFor(() => {
      expect(updateSystemSettings).toHaveBeenCalledWith(
        expect.objectContaining({ 'container.cleanup_after_days': 9 }),
      );
    });
  });

  it('test_q23_settings_integer_decimal_rejected', async () => {
    renderSettings();
    await screen.findByText('自动清理天数');

    fireEvent.change(inputFor('自动清理天数'), { target: { value: '1.5' } });
    await waitForDirty();
    fireEvent.click(saveButton());

    await waitFor(() => {
      expect(fieldFor('自动清理天数').textContent).toContain('必须为整数');
    });
    expect(updateSystemSettings).not.toHaveBeenCalled();
  });

  it('test_q23_settings_reminder_valid', async () => {
    renderSettings();
    await screen.findByText('清理提醒节点');

    fireEvent.change(inputFor('清理提醒节点'), { target: { value: '48,24,12' } });
    await waitForDirty();
    fireEvent.click(saveButton());

    await waitFor(() => {
      expect(updateSystemSettings).toHaveBeenCalledWith(
        expect.objectContaining({ 'container.cleanup_reminder_hours': '48,24,12' }),
      );
    });
  });

  it.each([
    ['abc', 'abc'],
    ['72,,12', '空项'],
    ['0', '0'],
    ['-1', '-1'],
  ])('test_q23_settings_reminder_invalid_field（%s）', async (value, expectedFragment) => {
    renderSettings();
    await screen.findByText('清理提醒节点');

    fireEvent.change(inputFor('清理提醒节点'), { target: { value } });
    await waitForDirty();
    fireEvent.click(saveButton());

    await waitFor(() => {
      const text = fieldFor('清理提醒节点').textContent;
      expect(text).toContain('清理提醒节点');
      expect(text).toContain(expectedFragment);
    });
    expect(updateSystemSettings).not.toHaveBeenCalled();
  });
});

describe('Settings Q23 分组顺序', () => {
  it('test_q23_settings_group_order', async () => {
    const groups = ['镜像', '已删除容器', '容器清理', '公告', '磁盘策略'];
    listSystemSettings.mockResolvedValue({ settings: groups.map(groupItem) });
    renderSettings();

    await screen.findByText('设置项 0');
    await waitFor(() => {
      const headings = Array.from(document.querySelectorAll('.settings-section-head h4'))
        .map(node => node.textContent);
      expect(headings).toEqual(['容器清理', '磁盘策略', '已删除容器', '公告', '镜像']);
    });
  });

  it('test_q23_settings_unknown_group_last', async () => {
    const groups = ['未知分组', '镜像', '已删除容器', '容器清理', '公告', '磁盘策略'];
    listSystemSettings.mockResolvedValue({ settings: groups.map(groupItem) });
    renderSettings();

    await screen.findByText('设置项 0');
    await waitFor(() => {
      const headings = Array.from(document.querySelectorAll('.settings-section-head h4'))
        .map(node => node.textContent);
      expect(headings).toEqual(['容器清理', '磁盘策略', '已删除容器', '公告', '镜像', '未知分组']);
    });
  });
});

describe('Settings Q37 结构化错误与字符串兼容', () => {
  it('test_q37_settings_invalid_setting_mapping', async () => {
    const error = Object.assign(new Error('Update settings failed: 422'), {
      status: 422,
      route: 'https://ctrl/api/settings/update',
      body: { success: 0, message: '设置项不合法', error_reason: 'invalid_setting' },
    });
    listSystemSettings.mockRejectedValue(error);

    renderSettings();

    await waitFor(() => expect(showErrorModal).toHaveBeenCalledTimes(1));
    const args = showErrorModal.mock.calls[0][0];
    expect(args.message).toBe(error.body);
    expect(args.status).toBe(422);
    expect(args.route).toBe(error.route);
    expect(routeErrorMap['/settings'].invalid_setting).toBe('设置项不合法');
  });

  it('test_q37_settings_update_failed_mapping', async () => {
    const error = Object.assign(new Error('Update settings failed: 422'), {
      status: 422,
      route: 'https://ctrl/api/settings/update',
      body: { success: 0, message: '写入设置失败', error_reason: 'update_failed' },
    });
    updateSystemSettings.mockRejectedValue(error);

    renderSettings();
    await screen.findByText('自动清理天数');
    fireEvent.change(inputFor('自动清理天数'), { target: { value: '9' } });
    await waitForDirty();
    fireEvent.click(saveButton());

    await waitFor(() => expect(showErrorModal).toHaveBeenCalledTimes(1));
    const args = showErrorModal.mock.calls[0][0];
    expect(args.message).toBe(error.body);
    expect(args.status).toBe(422);
    expect(args.route).toBe(error.route);
    expect(routeErrorMap['/settings'].update_failed).toBe('保存设置失败');
  });

  describe('字符串输入仍可读', () => {
    const originalGetComputedStyle = window.getComputedStyle;
    const visibleDialogs = () => Array.from(document.querySelectorAll('.ant-modal'))
      .filter(el => el.style.display !== 'none');
    const dialogText = () => {
      const dialogs = visibleDialogs();
      if (!dialogs.length) throw new Error('当前没有可见的错误弹窗');
      return dialogs[dialogs.length - 1].textContent || '';
    };
    const closeDialogs = async () => {
      for (let i = 0; i < 5; i += 1) {
        const buttons = Array.from(document.querySelectorAll('.ant-modal button'))
          .filter(btn => (btn.textContent || '').replace(/\s/g, '') === '好的');
        if (!buttons.length) break;
        await act(async () => {
          buttons[buttons.length - 1].click();
        });
      }
      await waitFor(() => expect(visibleDialogs()).toHaveLength(0));
    };

    beforeAll(() => {
      window.getComputedStyle = (el) => originalGetComputedStyle.call(window, el);
    });

    afterAll(() => {
      window.getComputedStyle = originalGetComputedStyle;
    });

    afterEach(closeDialogs);

    it('test_q37_settings_string_compatibility', async () => {
      const actual = await vi.importActual('../utils/showErrorModal');

      const beforeObject = visibleDialogs().length;
      await act(async () => {
        actual.default({ message: '历史字符串消息', status: 500 });
      });
      await waitFor(() => expect(visibleDialogs().length).toBeGreaterThan(beforeObject));
      expect(dialogText()).toContain('历史字符串消息');
      await closeDialogs();

      const beforeString = visibleDialogs().length;
      await act(async () => {
        actual.default('直接传入的字符串消息');
      });
      await waitFor(() => expect(visibleDialogs().length).toBeGreaterThan(beforeString));
      expect(dialogText()).toContain('直接传入的字符串消息');
      expect(dialogText()).not.toContain('发生错误');
      await closeDialogs();

      // 字符串里的 JSON 仍要被解析成对象（历史能力），并继续命中路由原因映射；
      // 把 message 声明成 const 会在该分支运行时抛错，退化成一整段 JSON 原文。
      const beforeJson = visibleDialogs().length;
      await act(async () => {
        actual.default({
          message: '请求失败 {"success":0,"message":"后端具体细节","error_reason":"invalid_setting"}',
          route: 'https://ctrl/api/settings',
        });
      });
      await waitFor(() => expect(visibleDialogs().length).toBeGreaterThan(beforeJson));
      expect(dialogText()).toContain('后端具体细节');
      expect(dialogText()).toContain('原因：设置项不合法');
    });
  });
});
