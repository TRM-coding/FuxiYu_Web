import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// antd message 在 jsdom 下的滚动条测量噪音与本用例无关，只保留组件实现
vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal();
  return { ...antd, message: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } };
});

vi.mock('../api/announcement_api', () => ({
  saveDraft: vi.fn(),
  getDraft: vi.fn(),
  listTemplates: vi.fn(),
}));

vi.mock('../api/machine_api', () => ({
  listAllMachineBrefInformation: vi.fn().mockResolvedValue({ machines: [] }),
  getDetailInformation: vi.fn(),
}));

vi.mock('../api/container_api', () => ({
  listAllContainerBrefInformation: vi.fn().mockResolvedValue({ containers_info: [] }),
  getContainerDetailInformation: vi.fn(),
}));

vi.mock('../utils/showErrorModal', () => ({ default: vi.fn() }));

import { getDraft, listTemplates, saveDraft } from '../api/announcement_api';
import AnnouncementEditor from '../pages/AnnouncementEditor';

const TEMPLATE = {
  id: 5,
  name: '维护模板',
  subject_template: '维护主题',
  body_template: '维护正文',
};

const renderEditor = (entry = '/admin/announcements/editor') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <AnnouncementEditor />
    </MemoryRouter>
  );

const templateCard = () => screen.getByText('模板选择').closest('.ant-card');
const contentTextarea = () => screen.getByPlaceholderText(/在此编写公告正文/);

/** 打开「模板选择」下拉并点选某个模板（模板选择只是复制初值） */
const selectTemplate = async (name) => {
  fireEvent.mouseDown(templateCard().querySelector('.ant-select-selector'));
  const option = await screen.findByText(name);
  fireEvent.click(option);
};

beforeEach(() => {
  vi.clearAllMocks();
  listTemplates.mockResolvedValue({ templates: [TEMPLATE] });
  getDraft.mockResolvedValue({
    draft: { id: 9, title: '草稿标题', content: '草稿内容', raw_content: '草稿内容' },
  });
  saveDraft.mockResolvedValue({ success: 1, draft_id: 9 });
});

describe('AnnouncementEditor 模板/草稿契约（Q06/Q07）', () => {
  it('选模板把主题/正文复制进编辑器', async () => {
    renderEditor();
    await waitFor(() => expect(listTemplates).toHaveBeenCalled());

    await selectTemplate('维护模板');

    await waitFor(() => expect(contentTextarea().value).toBe('维护正文'));
    expect(screen.getByPlaceholderText('输入公告标题（邮件主题）').value).toBe('维护主题');
  });

  it('保存草稿不带 template_id，内容是用户编辑后的独立快照', async () => {
    renderEditor();
    await waitFor(() => expect(listTemplates).toHaveBeenCalled());
    await selectTemplate('维护模板');
    await waitFor(() => expect(contentTextarea().value).toBe('维护正文'));

    fireEvent.change(contentTextarea(), { target: { value: '维护正文 + 用户补充' } });
    fireEvent.click(screen.getByRole('button', { name: /保存草稿/ }));

    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(1));
    const payload = saveDraft.mock.calls[0][0];
    expect(payload).not.toHaveProperty('template_id');
    expect(payload.content).toBe('维护正文 + 用户补充');
  });

  it('重开草稿：内容只来自草稿快照，不恢复也不重放模板选择', async () => {
    renderEditor('/admin/announcements/editor?draft_id=9');

    await waitFor(() => expect(getDraft).toHaveBeenCalledWith(9));
    await waitFor(() => expect(contentTextarea().value).toBe('草稿内容'));
    expect(screen.getByPlaceholderText('输入公告标题（邮件主题）').value).toBe('草稿标题');
    // 草稿没有模板关联：下拉不应显示任何已选项，模板正文也不会覆盖草稿内容
    expect(templateCard().querySelector('.ant-select-selection-item')).toBeNull();
  });

  it('清空模板选择不清空已编辑内容', async () => {
    renderEditor();
    await waitFor(() => expect(listTemplates).toHaveBeenCalled());
    await selectTemplate('维护模板');
    await waitFor(() => expect(contentTextarea().value).toBe('维护正文'));

    const clear = templateCard().querySelector('.ant-select-clear');
    expect(clear).toBeTruthy();
    fireEvent.mouseDown(clear);

    expect(contentTextarea().value).toBe('维护正文');
  });
});
