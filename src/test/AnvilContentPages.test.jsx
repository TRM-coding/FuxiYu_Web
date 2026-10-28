import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach, afterAll, beforeAll } from 'vitest';
import {
  act,
  cleanup,
  createEvent,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { forceParsing } from '@codemirror/language';

vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal();
  return {
    ...antd,
    message: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  };
});

vi.mock('../api/announcement_api', () => ({
  listTemplates: vi.fn(),
  saveDraft: vi.fn(),
  getDraft: vi.fn(),
  createTemplate: vi.fn(),
  updateTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
  getTemplate: vi.fn(),
}));

vi.mock('../api/machine_api', () => ({
  listAllMachineBrefInformation: vi.fn(),
  getDetailInformation: vi.fn(),
}));

vi.mock('../api/container_api', () => ({
  listAllContainerBrefInformation: vi.fn(),
  getContainerDetailInformation: vi.fn(),
}));

vi.mock('../api/user_api', () => ({
  getUserPermissions: vi.fn(),
}));

import {
  deleteTemplate,
  getDraft,
  listTemplates,
  saveDraft,
} from '../api/announcement_api';
import {
  getDetailInformation,
  listAllMachineBrefInformation,
} from '../api/machine_api';
import {
  getContainerDetailInformation,
  listAllContainerBrefInformation,
} from '../api/container_api';
import { getUserPermissions } from '../api/user_api';
import { PermissionProvider } from '../contexts/PermissionContext';
import AppRoutes from '../routes';
import AnnouncementEditor from '../pages/AnnouncementEditor';
import TemplateManager from '../pages/TemplateManager';
import MarkdownGuide from '../components/docs/MarkdownGuide';
import MarkdownSourceEditor from '../components/MarkdownSourceEditor';
import { findEditorView, replaceEditorText } from './editorTestUtils';

const TEMPLATE = {
  id: 5,
  name: '维护模板',
  subject_template: '维护主题',
  body_template: '**维护正文**',
};

const CUSTOM_TEMPLATE = {
  id: 5,
  name: '维护模板',
  category: 'custom',
  description: '自定义模板',
  subject_template: '维护主题',
  body_template: '维护正文',
};

const MACHINE_A = { machine_id: 1, machine_name: '机器A', machine_ip: '10.0.0.1' };
const MACHINE_B = { machine_id: 2, machine_name: '机器B', machine_ip: '10.0.0.2' };
const CONTAINER_A = { container_id: 11, container_name: '容器A', port: 2201 };
const CONTAINER_B = { container_id: 12, container_name: '容器B', port: 2202 };

const DELETE_ROUTE = 'https://ctrl/api/announcements/templates/5';

const machineDetail = (machine) => ({
  ...machine,
  machine_type: 'gpu',
  cpu_core_number: 8,
  memory_size_gb: 32,
  gpu_number: 1,
  gpu_type: 'A100',
  disk_size_gb: 500,
  machine_description: `${machine.machine_name} 描述`,
});

const containerDetail = (container) => ({
  container_info: {
    ...container,
    image_name: `${container.container_name}镜像`,
    cpu_number: 4,
    memory_gb: 8,
    gpu_number: 0,
  },
});

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const originalRaf = window.requestAnimationFrame;
const originalExecCommand = document.execCommand;
const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
const originalGetComputedStyle = window.getComputedStyle;

const LocationProbe = () => {
  const location = useLocation();
  return <span data-testid="path">{`${location.pathname}${location.search}`}</span>;
};

const visibleDialogs = () => Array.from(document.querySelectorAll('.ant-modal'))
  .filter((element) => element.style.display !== 'none');

const dialogText = () => {
  const dialogs = visibleDialogs();
  if (!dialogs.length) return '';
  return dialogs[dialogs.length - 1].textContent || '';
};

const closeVisibleDialogs = async () => {
  for (let i = 0; i < 5; i += 1) {
    const buttons = Array.from(document.querySelectorAll('.ant-modal button'))
      .filter((button) => (button.textContent || '').replace(/\s/g, '') === '好的');
    if (!buttons.length) break;
    await act(async () => {
      buttons[buttons.length - 1].click();
    });
  }
};

const renderAppAt = (path) => render(
  <MemoryRouter initialEntries={[path]}>
    <PermissionProvider>
      <AppRoutes />
      <LocationProbe />
    </PermissionProvider>
  </MemoryRouter>,
);

const renderEditor = (entry = '/admin/announcements/editor') => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route path="/admin/announcements/editor" element={<AnnouncementEditor />} />
      <Route path="/admin/announcements" element={<div data-testid="announcement-portal">portal</div>} />
    </Routes>
    <LocationProbe />
  </MemoryRouter>,
);

const renderTemplatePage = (entry = '/admin/announcements/templates') => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route path="/admin/announcements/templates" element={<TemplateManager />} />
    </Routes>
  </MemoryRouter>,
);

const templateCard = () => screen.getByText('模板选择').closest('.ant-card');
const machineCard = () => screen.getByText('机器属性').closest('.ant-card');
const containerCard = () => screen.getByText('容器属性').closest('.ant-card');
const contentEditor = () => screen.getByRole('textbox', { name: '公告正文' });
const contentEditorView = () => findEditorView(contentEditor());
const editorContent = () => contentEditorView().state.doc.toString();

const openSelect = (card) => {
  fireEvent.mouseDown(card.querySelector('.ant-select-selector'));
};

const clickSelectOption = async (text) => {
  const option = await waitFor(() => {
    const candidates = Array.from(document.querySelectorAll('.ant-select-item-option'))
      .filter((element) => (element.textContent || '').includes(text));
    if (!candidates.length) throw new Error(`未找到下拉选项：${text}`);
    return candidates[candidates.length - 1];
  });
  fireEvent.click(option);
};

const selectTemplate = async (name) => {
  openSelect(templateCard());
  await clickSelectOption(name);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const selectMachine = async (name) => {
  openSelect(machineCard());
  await clickSelectOption(name);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

const selectContainer = async (name) => {
  openSelect(containerCard());
  await clickSelectOption(name);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

beforeAll(async () => {
  window.getComputedStyle = (element) => originalGetComputedStyle.call(window, element);
  await Promise.all([
    import('../layouts/AdminLayout'),
    import('../layouts/MainLayout'),
  ]);
}, 60000);

afterAll(() => {
  window.getComputedStyle = originalGetComputedStyle;
});

beforeEach(() => {
  vi.clearAllMocks();
  [
    listTemplates,
    saveDraft,
    getDraft,
    deleteTemplate,
    listAllMachineBrefInformation,
    getDetailInformation,
    listAllContainerBrefInformation,
    getContainerDetailInformation,
    getUserPermissions,
  ].forEach((mock) => mock.mockReset());

  listTemplates.mockResolvedValue({ templates: [TEMPLATE], total: 1 });
  getDraft.mockResolvedValue({
    draft: {
      id: 9,
      title: '草稿标题',
      content: '**草稿内容**',
      raw_content: '**草稿内容**',
    },
  });
  saveDraft.mockResolvedValue({ success: 1, draft_id: 9 });
  deleteTemplate.mockResolvedValue({ success: 1 });
  listAllMachineBrefInformation.mockResolvedValue({ machines: [] });
  listAllContainerBrefInformation.mockResolvedValue({ containers_info: [] });
  getDetailInformation.mockResolvedValue(null);
  getContainerDetailInformation.mockResolvedValue(null);
  getUserPermissions.mockResolvedValue({ entities: [], userId: 1, userName: 'audit' });
  localStorage.clear();
});

afterEach(async () => {
  await closeVisibleDialogs();
  cleanup();
  window.requestAnimationFrame = originalRaf;
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, 'clipboard', originalClipboardDescriptor);
  } else {
    delete navigator.clipboard;
  }
  if (originalExecCommand === undefined) {
    delete document.execCommand;
  } else {
    document.execCommand = originalExecCommand;
  }
});

describe('Anvil content pages: 路由装配', () => {
  it('test_anvil_announcement_editor_route_assembles_under_admin_layout', async () => {
    getUserPermissions.mockResolvedValue({
      entities: ['announcement:manage'],
      userId: 1,
      userName: 'audit',
    });

    renderAppAt('/admin/announcements/editor');

    expect(await screen.findByText('新建公告', undefined, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /保存草稿/ })).toBeInTheDocument();
    expect(screen.getByTestId('path')).toHaveTextContent('/admin/announcements/editor');
    expect(screen.queryByText(/403/)).not.toBeInTheDocument();
    expect(document.querySelector('.admin-shell')).not.toBeNull();
  }, 30000);

  it('test_anvil_template_manager_route_assembles_under_admin_layout', async () => {
    getUserPermissions.mockResolvedValue({
      entities: ['announcement:manage'],
      userId: 1,
      userName: 'audit',
    });
    listTemplates.mockResolvedValue({ templates: [CUSTOM_TEMPLATE], total: 1 });

    renderAppAt('/admin/announcements/templates');

    expect(await screen.findByText('模板管理', undefined, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /新建模板/ })).toBeInTheDocument();
    expect(screen.getByTestId('path')).toHaveTextContent('/admin/announcements/templates');
    expect(screen.queryByText(/403/)).not.toBeInTheDocument();
    expect(document.querySelector('.admin-shell')).not.toBeNull();
  }, 30000);

  it('test_anvil_docs_route_assembles_in_main_layout', async () => {
    getUserPermissions.mockResolvedValue({ entities: [], userId: 1, userName: 'audit' });

    renderAppAt('/index/docs');

    expect(await screen.findByRole('heading', {
      level: 1,
      name: '快速开始',
    }, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByTestId('path')).toHaveTextContent('/index/docs');
    expect(document.querySelector('.main-shell')).not.toBeNull();
    expect(screen.queryByText('页面走丢了')).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '页内目录' })).toBeInTheDocument();
  }, 30000);
});

describe('AnnouncementEditor: 草稿与模板', () => {
  it('test_anvil_announcement_editor_save_new_draft_keeps_id_and_content', async () => {
    getDraft.mockResolvedValue({
      draft: {
        id: 9,
        title: '新草稿',
        content: '正文',
        raw_content: '正文',
      },
    });

    renderEditor();
    await waitFor(() => expect(listTemplates).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText('输入公告标题（邮件主题）'), {
      target: { value: '新草稿' },
    });
    replaceEditorText(contentEditorView(), '正文');
    fireEvent.click(screen.getByRole('button', { name: /保存草稿/ }));

    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(1));
    expect(saveDraft.mock.calls[0][0]).toEqual({
      title: '新草稿',
      content: '正文',
      raw_content: '正文',
    });

    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('?draft_id=9'));
    await waitFor(() => expect(editorContent()).toBe('正文'));

    replaceEditorText(contentEditorView(), '继续编辑');
    fireEvent.click(screen.getByRole('button', { name: /保存草稿/ }));
    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(2));
    expect(saveDraft.mock.calls[1][0]).toMatchObject({
      draft_id: 9,
      title: '新草稿',
      content: '继续编辑',
      raw_content: '继续编辑',
    });

    fireEvent.click(screen.getByRole('button', { name: /返回门户/ }));
    expect(await screen.findByTestId('announcement-portal')).toBeInTheDocument();
  }, 30000);

  it('test_anvil_announcement_editor_clear_template_then_save_keeps_content', async () => {
    saveDraft.mockResolvedValue({ success: 1 });

    renderEditor();
    await waitFor(() => expect(listTemplates).toHaveBeenCalled());
    await selectTemplate('维护模板');
    await waitFor(() => expect(editorContent()).toBe('**维护正文**'));

    const clear = templateCard().querySelector('.ant-select-clear');
    expect(clear).toBeTruthy();
    fireEvent.mouseDown(clear);

    expect(editorContent()).toBe('**维护正文**');
    await waitFor(() => expect(templateCard().querySelector('.ant-select-selection-item')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: /保存草稿/ }));
    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(1));
    const payload = saveDraft.mock.calls[0][0];
    expect(payload).not.toHaveProperty('template_id');
    expect(payload.title).toBe('维护主题');
    expect(payload.content).toBe('**维护正文**');
    expect(payload.raw_content).toBe('**维护正文**');
  }, 30000);

  it('test_anvil_announcement_editor_draft_ignores_stale_template_reference', async () => {
    getDraft.mockResolvedValue({
      draft: {
        id: 9,
        title: '草稿标题',
        content: '草稿 {{name}}',
        raw_content: '草稿 {{name}}',
        template_id: 5,
      },
    });
    listTemplates.mockResolvedValue({
      templates: [{
        id: 5,
        name: '修改后的模板',
        subject_template: '模板主题',
        body_template: '模板正文 {{name}}',
      }],
      total: 1,
    });

    renderEditor('/admin/announcements/editor?draft_id=9');

    await waitFor(() => expect(getDraft).toHaveBeenCalledWith(9));
    await waitFor(() => expect(editorContent()).toBe('草稿 {{name}}'));
    expect(screen.getByPlaceholderText('输入公告标题（邮件主题）').value).toBe('草稿标题');
    await waitFor(() => expect(listTemplates).toHaveBeenCalledTimes(1));
    expect(listTemplates).toHaveBeenCalledWith({ limit: 200, offset: 0 });
    expect(templateCard().querySelector('.ant-select-selection-item')).toBeNull();
    expect(editorContent()).toBe('草稿 {{name}}');
  }, 30000);

  it('test_anvil_announcement_editor_template_and_draft_preserve_placeholders', async () => {
    saveDraft.mockResolvedValue({ success: 1 });
    const placeholderTemplate = {
      id: 7,
      name: '占位模板',
      subject_template: '致 {{name}}',
      body_template: '您好 {{name}}，日期 {{date}}',
    };
    listTemplates.mockResolvedValue({ templates: [placeholderTemplate], total: 1 });

    const first = renderEditor();
    await waitFor(() => expect(listTemplates).toHaveBeenCalled());
    await selectTemplate('占位模板');
    await waitFor(() => expect(editorContent()).toBe(placeholderTemplate.body_template));
    expect(screen.getByPlaceholderText('输入公告标题（邮件主题）').value).toBe('致 {{name}}');

    fireEvent.click(screen.getByRole('button', { name: /保存草稿/ }));
    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(1));
    expect(saveDraft.mock.calls[0][0]).toMatchObject({
      title: '致 {{name}}',
      content: '您好 {{name}}，日期 {{date}}',
      raw_content: '您好 {{name}}，日期 {{date}}',
    });
    first.unmount();

    getDraft.mockResolvedValue({
      draft: {
        id: 9,
        title: '草稿 {{name}}',
        content: '草稿 {{name}}',
        raw_content: '草稿 {{name}}',
      },
    });
    renderEditor('/admin/announcements/editor?draft_id=9');
    await waitFor(() => expect(editorContent()).toBe('草稿 {{name}}'));
    expect(screen.getByPlaceholderText('输入公告标题（邮件主题）').value).toBe('草稿 {{name}}');

    fireEvent.click(screen.getByRole('button', { name: /保存草稿/ }));
    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(2));
    expect(saveDraft.mock.calls[1][0]).toMatchObject({
      draft_id: 9,
      content: '草稿 {{name}}',
      raw_content: '草稿 {{name}}',
    });
  }, 30000);
});

describe('AnnouncementEditor: 选择器与高亮', () => {
  it('test_anvil_announcement_editor_stale_list_keeps_latest_loading', async () => {
    const first = deferred();
    const second = deferred();
    listAllMachineBrefInformation
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    renderEditor();
    await waitFor(() => expect(listTemplates).toHaveBeenCalled());

    openSelect(machineCard());
    await waitFor(() => expect(listAllMachineBrefInformation).toHaveBeenCalledTimes(1));
    fireEvent.mouseDown(document.body);
    openSelect(machineCard());
    await waitFor(() => expect(listAllMachineBrefInformation).toHaveBeenCalledTimes(2));

    await act(async () => {
      first.resolve({ machines: [MACHINE_A] });
    });
    await waitFor(() => expect(screen.queryByText('机器A (10.0.0.1)')).not.toBeInTheDocument());
    expect(
      machineCard().querySelector('.anticon-loading') || screen.queryByText('加载中...'),
    ).toBeTruthy();

    await act(async () => {
      second.resolve({ machines: [MACHINE_B] });
    });
    expect(await screen.findByText('机器B (10.0.0.2)')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('加载中...')).not.toBeInTheDocument());
    expect(machineCard().querySelector('.anticon-loading')).toBeNull();
  }, 30000);

  it('test_anvil_announcement_editor_stale_detail_keeps_other_selector', async () => {
    listAllMachineBrefInformation.mockResolvedValue({ machines: [MACHINE_A, MACHINE_B] });
    listAllContainerBrefInformation.mockResolvedValue({ containers_info: [CONTAINER_A, CONTAINER_B] });

    const machineA = deferred();
    const machineB = deferred();
    const containerA = deferred();
    const containerB = deferred();
    getDetailInformation
      .mockImplementationOnce(() => machineA.promise)
      .mockImplementationOnce(() => machineB.promise);
    getContainerDetailInformation
      .mockImplementationOnce(() => containerA.promise)
      .mockImplementationOnce(() => containerB.promise);

    renderEditor();
    await waitFor(() => expect(listTemplates).toHaveBeenCalled());

    await selectMachine('机器A (10.0.0.1)');
    await waitFor(() => expect(getDetailInformation).toHaveBeenCalledTimes(1));
    await selectMachine('机器B (10.0.0.2)');
    await waitFor(() => expect(getDetailInformation).toHaveBeenCalledTimes(2));

    openSelect(containerCard());
    await waitFor(() => expect(listAllContainerBrefInformation).toHaveBeenCalledTimes(1));
    await selectContainer('容器A (port:2201)');
    await waitFor(() => expect(getContainerDetailInformation).toHaveBeenCalledTimes(1));
    await selectContainer('容器B (port:2202)');
    await waitFor(() => expect(getContainerDetailInformation).toHaveBeenCalledTimes(2));

    await act(async () => {
      machineB.resolve(machineDetail(MACHINE_B));
    });
    expect(await screen.findByRole('button', { name: /机器名: 机器B/ })).toBeInTheDocument();

    await act(async () => {
      machineA.resolve(machineDetail(MACHINE_A));
    });
    expect(screen.queryByRole('button', { name: /机器名: 机器A/ })).toBeNull();
    expect(screen.getByRole('button', { name: /机器名: 机器B/ })).toBeInTheDocument();
    expect(containerCard().querySelector('.ant-select-selection-item')?.textContent).toContain('容器B');

    await act(async () => {
      containerB.resolve(containerDetail(CONTAINER_B));
    });
    expect(within(containerCard()).getByRole('button', { name: /容器名\(端口\): 容器B/ })).toBeInTheDocument();

    await act(async () => {
      containerA.resolve(containerDetail(CONTAINER_A));
    });
    expect(within(containerCard()).queryByRole('button', { name: /容器名\(端口\): 容器A/ })).toBeNull();
    expect(within(containerCard()).getByRole('button', { name: /容器名\(端口\): 容器B/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /机器名: 机器B/ })).toBeInTheDocument();
  }, 30000);

  it('test_anvil_announcement_editor_container_selection_after_machine_switch', async () => {
    listAllMachineBrefInformation.mockResolvedValue({ machines: [MACHINE_A, MACHINE_B] });
    listAllContainerBrefInformation.mockResolvedValue({ containers_info: [CONTAINER_A, CONTAINER_B] });
    const machineB = deferred();
    const containerB = deferred();
    getDetailInformation.mockImplementation(() => machineB.promise);
    getContainerDetailInformation.mockImplementation(() => containerB.promise);

    renderEditor();
    await waitFor(() => expect(listTemplates).toHaveBeenCalled());

    await selectMachine('机器B (10.0.0.2)');
    await waitFor(() => expect(getDetailInformation).toHaveBeenCalledTimes(1));
    await act(async () => {
      machineB.resolve(machineDetail(MACHINE_B));
    });
    expect(await screen.findByRole('button', { name: /机器名: 机器B/ })).toBeInTheDocument();

    openSelect(containerCard());
    await waitFor(() => expect(listAllContainerBrefInformation).toHaveBeenCalledTimes(1));
    await selectContainer('容器B (port:2202)');
    await waitFor(() => expect(getContainerDetailInformation).toHaveBeenCalledTimes(1));
    await act(async () => {
      containerB.resolve(containerDetail(CONTAINER_B));
    });

    expect(await within(containerCard()).findByRole('button', { name: /容器名\(端口\): 容器B/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /机器名: 机器B/ })).toBeInTheDocument();
  }, 30000);

  it('test_anvil_markdown_source_highlight_covers_emphasis_and_ordered_list', async () => {
    const markdown = '*斜体*\n\n1. 第一项\n2. 第二项';
    render(<MarkdownSourceEditor value={markdown} onChange={() => {}} />);
    const content = screen.getByRole('textbox', { name: '公告正文' });
    const view = findEditorView(content);
    forceParsing(view, view.state.doc.length, 1000);

    expect(view.state.doc.toString()).toBe(markdown);
    await waitFor(() => expect(content.querySelector('.cm-md-emphasis')).not.toBeNull());
    expect(content.querySelector('.cm-md-mark')).not.toBeNull();
    expect(content.textContent).toContain('*斜体*');
    expect(content.textContent).toContain('1. 第一项');
  });
});

describe('TemplateManager: 错误弹窗', () => {
  it('test_anvil_template_manager_system_delete_and_unknown_error_popups', async () => {
    listTemplates.mockResolvedValue({ templates: [CUSTOM_TEMPLATE], total: 1 });
    deleteTemplate
      .mockRejectedValueOnce({
        status: 400,
        route: DELETE_ROUTE,
        body: { success: 0, error_reason: 'cannot_delete_system_template' },
      })
      .mockRejectedValueOnce({
        status: 409,
        route: DELETE_ROUTE,
        body: { success: 0, error_reason: 'template_locked' },
      });

    renderTemplatePage();
    await waitFor(() => expect(screen.getByText('维护模板')).toBeInTheDocument());

    fireEvent.click(document.querySelector('.anticon-delete'));
    fireEvent.click(await screen.findByRole('button', { name: /删\s*除/ }));
    await waitFor(() => expect(dialogText()).toContain('系统模板不可删除'));
    await closeVisibleDialogs();

    fireEvent.click(document.querySelector('.anticon-delete'));
    fireEvent.click(await screen.findByRole('button', { name: /删\s*除/ }));
    await waitFor(() => expect(dialogText()).toContain('未收录的错误原因：template_locked'));
    expect(dialogText()).not.toContain('模板名称已存在');
  }, 30000);
});

describe('Docs: Markdown 交互', () => {
  it('test_anvil_docs_gfm_renders_pre_code_structure', () => {
    const markdown = [
      '| 名称 | 示例 |',
      '| --- | --- |',
      '| SSH | `ssh root@host -p 24` |',
      '',
      '```js',
      'console.log(1)',
      '```',
    ].join('\n');

    render(<MarkdownGuide markdown={markdown} />);

    expect(screen.getByRole('table').closest('.docs-table-scroll')).not.toBeNull();
    const code = document.querySelector('.docs-code-pre code');
    expect(code).not.toBeNull();
    expect(code.textContent).toContain('console.log(1)');
    expect(code.className).toContain('language-js');
  });

  it('test_anvil_docs_copy_fallback_uses_full_code_without_clipboard', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    const code = 'ssh root@192.0.2.0 -p 24';
    let captured = null;
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn(() => {
        const textarea = document.querySelector('textarea[data-docs-copy-fallback]');
        captured = textarea ? {
          value: textarea.value,
          start: textarea.selectionStart,
          end: textarea.selectionEnd,
        } : null;
        return true;
      }),
    });

    render(<MarkdownGuide markdown={`\`\`\`bash\n${code}\n\`\`\``} />);
    fireEvent.click(screen.getByRole('button', { name: '复制代码' }));

    expect(await screen.findByRole('button', { name: '已复制' })).toBeInTheDocument();
    expect(captured).toEqual({ value: code, start: 0, end: code.length });
    expect(document.querySelector('textarea[data-docs-copy-fallback]')).toBeNull();
  });

  it('test_anvil_docs_mobile_toc_closes_before_next_frame_scroll', () => {
    const markdown = ['# 快速开始', '', '## 重复', '', '正文段落。'].join('\n');
    const rafCallbacks = [];
    window.requestAnimationFrame = vi.fn((callback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    });

    render(<MarkdownGuide markdown={markdown} />);

    const details = document.querySelector('details.docs-toc-mobile');
    details.open = true;
    const mobileNav = within(details).getByRole('navigation', { name: '目录' });
    const button = within(mobileNav).getByRole('button', { name: '重复' });
    const target = document.getElementById(button.getAttribute('aria-controls'));
    const scrollIntoView = vi.fn();
    target.scrollIntoView = scrollIntoView;

    fireEvent.click(button);

    expect(details.open).toBe(false);
    expect(target).not.toHaveFocus();
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(rafCallbacks.length).toBeGreaterThan(0);
    expect(target.id.startsWith('docs-')).toBe(true);

    act(() => {
      rafCallbacks.forEach((callback) => callback(0));
    });

    expect(target).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
  });

  it('test_anvil_docs_touch_isolation_does_not_prevent_default', () => {
    const markdown = [
      '# 快速开始',
      '',
      '正文段落。',
      '',
      '```bash',
      'echo hi',
      '```',
      '',
      '| 名称 | 值 |',
      '| --- | --- |',
      '| A | B |',
    ].join('\n');
    const onTouchStart = vi.fn();
    const onTouchEnd = vi.fn();

    render(
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <MarkdownGuide markdown={markdown} />
      </div>,
    );

    const dispatchTouch = (element, type) => {
      const event = type === 'start'
        ? createEvent.touchStart(element, { touches: [{ clientX: 100, clientY: 100 }] })
        : createEvent.touchEnd(element, { changedTouches: [{ clientX: 10, clientY: 100 }] });
      fireEvent(element, event);
      return event;
    };

    for (const selector of [
      '.docs-toc-desktop',
      '.docs-toc-mobile',
      '.docs-code-block',
      '.docs-table-scroll',
    ]) {
      const element = document.querySelector(selector);
      expect(dispatchTouch(element, 'start').defaultPrevented).toBe(false);
      expect(dispatchTouch(element, 'end').defaultPrevented).toBe(false);
    }

    expect(onTouchStart).not.toHaveBeenCalled();
    expect(onTouchEnd).not.toHaveBeenCalled();

    const paragraph = document.querySelector('.docs-markdown p');
    expect(dispatchTouch(paragraph, 'start').defaultPrevented).toBe(false);
    expect(onTouchStart).toHaveBeenCalledTimes(1);
    expect(dispatchTouch(paragraph, 'end').defaultPrevented).toBe(false);
    expect(onTouchEnd).toHaveBeenCalledTimes(1);
  });
});
