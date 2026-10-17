import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

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

import { deleteTemplate, listTemplates } from '../api/announcement_api';
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

const renderPage = () =>
  render(
    <MemoryRouter>
      <TemplateManager />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  listTemplates.mockResolvedValue({ templates: [CUSTOM, SYSTEM] });
  deleteTemplate.mockResolvedValue({ success: 1 });
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
