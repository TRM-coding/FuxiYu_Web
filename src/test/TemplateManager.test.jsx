import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { message } from 'antd';

vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal();
  return { ...antd, message: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } };
});

vi.mock('../api/announcement_api', () => ({
  listTemplates: vi.fn(),
  createTemplate: vi.fn().mockResolvedValue({ success: 1 }),
  updateTemplate: vi.fn().mockResolvedValue({ success: 1 }),
  deleteTemplate: vi.fn().mockResolvedValue({ success: 1 }),
  getTemplate: vi.fn(),
}));

vi.mock('../utils/showErrorModal', () => ({ default: vi.fn() }));

import {
  createTemplate,
  deleteTemplate,
  getTemplate,
  listTemplates,
  updateTemplate,
} from '../api/announcement_api';
import showErrorModal from '../utils/showErrorModal';
import TemplateManager from '../pages/TemplateManager';

const CUSTOM = {
  id: 5,
  name: '维护模板',
  category: 'custom',
  description: '自定义',
  subject_template: '维护主题',
  body_template: '维护正文',
};
const SYSTEM = {
  id: 6,
  name: '系统模板',
  category: 'system',
  description: '内置',
  subject_template: '系统主题',
  body_template: '系统正文',
};

const CREATE_ROUTE = 'https://ctrl/api/announcements/templates';
const UPDATE_ROUTE = 'https://ctrl/api/announcements/templates/5';
const DELETE_ROUTE = 'https://ctrl/api/announcements/templates/5';

const makeTemplate = (id) => ({
  id,
  name: `模板${id}`,
  category: 'custom',
  description: `描述${id}`,
  subject_template: `主题${id}`,
  body_template: `正文${id}`,
});

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="location-search">{location.search}</div>;
};

const renderPage = (entry = '/admin/announcements/templates') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route
          path="/admin/announcements/templates"
          element={(
            <>
              <TemplateManager />
              <LocationProbe />
            </>
          )}
        />
      </Routes>
    </MemoryRouter>
  );

const cardFor = (name) => screen.getByText(name).closest('.ant-card');

const categorySelectIn = (dialog) => dialog.querySelector('.ant-select');

const openCategorySelect = (dialog) => {
  fireEvent.mouseDown(categorySelectIn(dialog).querySelector('.ant-select-selector'));
};

const chooseCategory = async (text) => {
  const option = await waitFor(() => {
    const candidates = Array.from(document.querySelectorAll('.ant-select-item-option'))
      .filter((element) => (element.textContent || '').includes(text));
    if (!candidates.length) throw new Error(`未找到类别选项：${text}`);
    return candidates[candidates.length - 1];
  });
  fireEvent.click(option);
};

beforeEach(() => {
  vi.clearAllMocks();
  listTemplates.mockResolvedValue({ templates: [CUSTOM, SYSTEM], total: 2 });
  createTemplate.mockResolvedValue({ success: 1 });
  updateTemplate.mockResolvedValue({ success: 1 });
  deleteTemplate.mockResolvedValue({ success: 1 });
  getTemplate.mockReset();
});

describe('TemplateManager 模板管理（Q06）', () => {
  it('自定义模板可删除：确认后调用删除并回列表', async () => {
    renderPage();
    await waitFor(() => expect(listTemplates).toHaveBeenCalledTimes(1));
    expect(screen.getByText('维护模板')).toBeTruthy();

    // SYSTEM 模板不提供删除入口，因此页面上唯一的删除图标属于自定义模板
    const deleteIcons = document.querySelectorAll('.anticon-delete');
    expect(deleteIcons).toHaveLength(1);
    fireEvent.click(deleteIcons[0]);

    const confirm = await screen.findByRole('button', { name: /删\s*除/ });
    fireEvent.click(confirm);

    await waitFor(() => expect(deleteTemplate).toHaveBeenCalledWith(CUSTOM.id));
    // 删除后重新拉列表
    await waitFor(() => expect(listTemplates).toHaveBeenCalledTimes(2));
  });

  it('系统模板不暴露删除入口', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('系统模板')).toBeTruthy());

    const systemCard = screen.getByText('系统模板').closest('.ant-card');
    expect(systemCard.querySelector('.anticon-delete')).toBeNull();
  });
});

describe('TemplateManager 分页与深链（Q52）', () => {
  it('test_q52_template_manager_205_pages 205 个模板按 200/页分两页且第 205 个可打开', async () => {
    const firstPage = Array.from({ length: 200 }, (_, index) => makeTemplate(index + 1));
    const secondPage = Array.from({ length: 5 }, (_, index) => makeTemplate(201 + index));
    listTemplates.mockImplementation(({ offset }) => Promise.resolve(
      offset === 200
        ? { templates: secondPage, total: 205 }
        : { templates: firstPage, total: 205 },
    ));

    renderPage();

    expect(await screen.findByText('模板200')).toBeInTheDocument();
    expect(listTemplates).toHaveBeenNthCalledWith(1, { limit: 200, offset: 0 });

    const pageTwo = document.querySelector('.ant-pagination-item-2');
    expect(pageTwo).toBeTruthy();
    fireEvent.click(pageTwo);

    await waitFor(() => expect(listTemplates).toHaveBeenCalledTimes(2));
    expect(listTemplates).toHaveBeenNthCalledWith(2, { limit: 200, offset: 200 });
    expect(await screen.findByText('模板205')).toBeInTheDocument();

    fireEvent.click(cardFor('模板205').querySelector('.anticon-edit'));
    expect(await screen.findByText('编辑模板 — 模板205')).toBeInTheDocument();
    expect(screen.getByDisplayValue('正文205')).toBeInTheDocument();
  }, 20000);

  it('test_q52_template_manager_deep_link_205 深链目标不在当前页时用 getTemplate 定位并保留 template_id', async () => {
    const firstPage = Array.from({ length: 200 }, (_, index) => makeTemplate(index + 1));
    listTemplates.mockResolvedValue({ templates: firstPage, total: 205 });
    getTemplate.mockResolvedValue({ template: makeTemplate(205) });

    renderPage('/admin/announcements/templates?template_id=205');

    await waitFor(() => expect(getTemplate).toHaveBeenCalledWith(205));
    expect(await screen.findByText('编辑模板 — 模板205')).toBeInTheDocument();
    expect(screen.getByDisplayValue('正文205')).toBeInTheDocument();
    expect(screen.getByTestId('location-search').textContent).toContain('template_id=205');
  }, 20000);

  it('test_q52_template_manager_invalid_id 无效模板 ID 显示模板不存在且列表仍可用', async () => {
    listTemplates.mockResolvedValue({ templates: [makeTemplate(1)], total: 1 });
    getTemplate.mockRejectedValue({
      status: 404,
      route: 'https://ctrl/api/announcements/templates/999',
      body: { success: 0, message: 'template not found', error_reason: 'not_found' },
    });

    renderPage('/admin/announcements/templates?template_id=999');

    expect(await screen.findByText('模板不存在')).toBeInTheDocument();
    expect(screen.getByText('模板1')).toBeInTheDocument();
    expect(listTemplates).toHaveBeenCalledWith({ limit: 200, offset: 0 });
  });
});

describe('TemplateManager 模板错误调用口径（Q37）', () => {
  const duplicateBody = {
    success: 0,
    message: 'template name may already exist',
    error_reason: 'duplicate_entry',
  };
  const missingFieldBody = {
    success: 0,
    message: 'subject_template and body_template are required',
    error_reason: 'missing_field',
  };
  const notFoundBody = {
    success: 0,
    message: 'template not found',
    error_reason: 'not_found',
  };

  const fillCreateForm = () => {
    fireEvent.change(screen.getByPlaceholderText('模板名称'), { target: { value: '重名模板' } });
    fireEvent.change(screen.getByPlaceholderText('邮件主题（纯文字）'), { target: { value: '主题' } });
    fireEvent.change(screen.getByPlaceholderText('邮件正文（纯文字）'), { target: { value: '正文' } });
  };

  it('test_q37_template_known_reasons 重名、缺字段、目标不存在均以对象+状态+路由调用错误弹窗', async () => {
    createTemplate.mockRejectedValueOnce({ status: 409, route: CREATE_ROUTE, body: duplicateBody });
    updateTemplate
      .mockRejectedValueOnce({ status: 400, route: UPDATE_ROUTE, body: missingFieldBody })
      .mockRejectedValueOnce({ status: 404, route: UPDATE_ROUTE, body: notFoundBody });

    const firstRender = renderPage();
    await waitFor(() => expect(screen.getByText('维护模板')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /新建模板/ }));
    await screen.findByText('新建模板', { selector: '.ant-modal-title' });
    fillCreateForm();
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(showErrorModal).toHaveBeenCalledTimes(1));
    expect(showErrorModal).toHaveBeenNthCalledWith(1, {
      message: duplicateBody,
      status: 409,
      route: CREATE_ROUTE,
    });

    // 新开一个干净页面验证编辑失败，避免 antd 关闭动画残留的弹窗节点干扰定位。
    firstRender.unmount();

    renderPage();
    await waitFor(() => expect(screen.getByText('维护模板')).toBeInTheDocument());

    fireEvent.click(cardFor('维护模板').querySelector('.anticon-edit'));
    await screen.findByText('编辑模板 — 维护模板');
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));
    await waitFor(() => expect(showErrorModal).toHaveBeenCalledTimes(2));
    expect(showErrorModal).toHaveBeenNthCalledWith(2, {
      message: missingFieldBody,
      status: 400,
      route: UPDATE_ROUTE,
    });

    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));
    await waitFor(() => expect(showErrorModal).toHaveBeenCalledTimes(3));
    expect(showErrorModal).toHaveBeenNthCalledWith(3, {
      message: notFoundBody,
      status: 404,
      route: UPDATE_ROUTE,
    });
  });

  it('test_q37_template_system_delete_mapping 删除返回系统模板原因时传对象且列表保持原状', async () => {
    const body = {
      success: 0,
      message: 'system template cannot be deleted',
      error_reason: 'cannot_delete_system_template',
    };
    deleteTemplate.mockRejectedValueOnce({ status: 400, route: DELETE_ROUTE, body });

    renderPage();
    await waitFor(() => expect(screen.getByText('维护模板')).toBeInTheDocument());

    fireEvent.click(cardFor('维护模板').querySelector('.anticon-delete'));
    fireEvent.click(await screen.findByRole('button', { name: /删\s*除/ }));

    await waitFor(() => expect(showErrorModal).toHaveBeenCalledTimes(1));
    expect(showErrorModal).toHaveBeenCalledWith({
      message: body,
      status: 400,
      route: DELETE_ROUTE,
    });
    expect(screen.getByText('维护模板')).toBeInTheDocument();
  });

  it('test_q37_template_unknown_reason 未登记原因保留 body 原样交给公共弹窗兜底', async () => {
    const body = {
      success: 0,
      message: 'template is locked',
      error_reason: 'template_locked',
    };
    deleteTemplate.mockRejectedValueOnce({ status: 409, route: DELETE_ROUTE, body });

    renderPage();
    await waitFor(() => expect(screen.getByText('维护模板')).toBeInTheDocument());

    fireEvent.click(cardFor('维护模板').querySelector('.anticon-delete'));
    fireEvent.click(await screen.findByRole('button', { name: /删\s*除/ }));

    await waitFor(() => expect(showErrorModal).toHaveBeenCalledTimes(1));
    const call = showErrorModal.mock.calls[0][0];
    expect(call.message).toBe(body);
    expect(call.message.error_reason).toBe('template_locked');
    expect(call.status).toBe(409);
    expect(call.route).toBe(DELETE_ROUTE);
  });
});

describe('TemplateManager 系统模板类别保护（Q51）', () => {
  it('test_q51_system_edit_disables_category_but_allows_content_edits', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('系统模板')).toBeInTheDocument());

    fireEvent.click(cardFor('系统模板').querySelector('.anticon-edit'));
    const title = await screen.findByText('编辑模板 — 系统模板');
    const dialog = title.closest('.ant-modal');
    const categorySelect = categorySelectIn(dialog);

    expect(categorySelect).toHaveClass('ant-select-disabled');
    expect(categorySelect.querySelector('.ant-select-selection-item')?.textContent).toContain('系统');

    const nameInput = screen.getByPlaceholderText('模板名称');
    const descriptionInput = screen.getByPlaceholderText('模板描述（可选）');
    const subjectInput = screen.getByPlaceholderText('邮件主题（纯文字）');
    const bodyInput = screen.getByPlaceholderText('邮件正文（纯文字）');
    expect(nameInput).not.toBeDisabled();
    expect(descriptionInput).not.toBeDisabled();
    expect(subjectInput).not.toBeDisabled();
    expect(bodyInput).not.toBeDisabled();

    fireEvent.change(nameInput, { target: { value: '新系统名' } });
    fireEvent.change(descriptionInput, { target: { value: '新系统描述' } });
    fireEvent.change(subjectInput, { target: { value: '新系统主题' } });
    fireEvent.change(bodyInput, { target: { value: '新系统正文' } });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(updateTemplate).toHaveBeenCalledWith(SYSTEM.id, {
      name: '新系统名',
      description: '新系统描述',
      subject_template: '新系统主题',
      body_template: '新系统正文',
      category: 'system',
    }));
    expect(message.success).toHaveBeenCalledWith('模板已更新');
    await waitFor(() => expect(listTemplates).toHaveBeenCalledTimes(2));
  });

  it('test_q51_create_template_keeps_category_selectable', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('维护模板')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /新建模板/ }));
    const title = await screen.findByText('新建模板', { selector: '.ant-modal-title' });
    const dialog = title.closest('.ant-modal');
    const categorySelect = categorySelectIn(dialog);

    expect(categorySelect).not.toHaveClass('ant-select-disabled');
    expect(categorySelect.querySelector('.ant-select-selection-item')?.textContent).toContain('自定义');

    openCategorySelect(dialog);
    await chooseCategory('系统');
    await waitFor(() => {
      expect(categorySelect.querySelector('.ant-select-selection-item')?.textContent).toContain('系统');
    });

    fireEvent.change(screen.getByPlaceholderText('模板名称'), { target: { value: '新系统模板' } });
    fireEvent.change(screen.getByPlaceholderText('模板描述（可选）'), { target: { value: '新建描述' } });
    fireEvent.change(screen.getByPlaceholderText('邮件主题（纯文字）'), { target: { value: '新建主题' } });
    fireEvent.change(screen.getByPlaceholderText('邮件正文（纯文字）'), { target: { value: '新建正文' } });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(createTemplate).toHaveBeenCalledWith({
      name: '新系统模板',
      description: '新建描述',
      subject_template: '新建主题',
      body_template: '新建正文',
      category: 'system',
    }));
    expect(message.success).toHaveBeenCalledWith('模板已创建');
    await waitFor(() => expect(listTemplates).toHaveBeenCalledTimes(2));
  });

  it('test_q51_custom_template_can_become_system', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('维护模板')).toBeInTheDocument());

    fireEvent.click(cardFor('维护模板').querySelector('.anticon-edit'));
    const title = await screen.findByText('编辑模板 — 维护模板');
    const dialog = title.closest('.ant-modal');
    const categorySelect = categorySelectIn(dialog);

    expect(categorySelect).not.toHaveClass('ant-select-disabled');
    expect(categorySelect.querySelector('.ant-select-selection-item')?.textContent).toContain('自定义');

    openCategorySelect(dialog);
    await chooseCategory('系统');
    await waitFor(() => {
      expect(categorySelect.querySelector('.ant-select-selection-item')?.textContent).toContain('系统');
    });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => expect(updateTemplate).toHaveBeenCalledWith(CUSTOM.id, {
      name: CUSTOM.name,
      description: CUSTOM.description,
      subject_template: CUSTOM.subject_template,
      body_template: CUSTOM.body_template,
      category: 'system',
    }));
    expect(message.success).toHaveBeenCalledWith('模板已更新');
    await waitFor(() => expect(listTemplates).toHaveBeenCalledTimes(2));
  });
});
