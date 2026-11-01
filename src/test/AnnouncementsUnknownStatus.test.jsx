import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal();
  return {
    ...antd,
    message: { success: vi.fn(), warning: vi.fn(), error: vi.fn(), loading: vi.fn() },
  };
});

vi.mock('../api/announcement_api', () => ({
  listDrafts: vi.fn(),
  deleteDraft: vi.fn(),
  batchSendDrafts: vi.fn(),
  resolveTargets: vi.fn(),
  getAnnouncementsStatus: vi.fn(),
  listAnnouncements: vi.fn(),
  copyAnnouncementAsDraft: vi.fn(),
  resendAnnouncement: vi.fn(),
  convertToTemplate: vi.fn(),
  deleteAnnouncement: vi.fn(),
  batchDeleteAnnouncements: vi.fn(),
}));

vi.mock('../api/machine_api', () => ({ listAllMachineBrefInformation: vi.fn() }));
vi.mock('../api/container_api', () => ({ listAllContainerBrefInformation: vi.fn() }));
vi.mock('../api/user_api', () => ({ listAllUserBrefInformation: vi.fn() }));
vi.mock('../utils/showErrorModal', () => ({ default: vi.fn() }));

// 轮询检测本身由 announcementSend.test.js 覆盖；这里验证页面消费 unknown 终态时的文案。
vi.mock('../utils/announcementSend', () => ({
  trackAnnouncementSend: vi.fn(({ onUnknown }) => {
    onUnknown({ total: 1, unknownIds: ['11'], knownIds: [], done: 0, success: 0, fail: 0 });
    return vi.fn();
  }),
}));

import { listDrafts, listAnnouncements, batchSendDrafts, resolveTargets } from '../api/announcement_api';
import Announcements from '../pages/Announcements';

const renderPage = () => render(
  <MemoryRouter>
    <Announcements />
  </MemoryRouter>,
);

describe('Announcements 删除发送中公告后的进度展示（Q49）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listDrafts.mockResolvedValue({ drafts: [{ id: 1, title: '草稿甲', content: '正文' }] });
    listAnnouncements.mockResolvedValue({ announcements: [], sent_count: 0, partial_count: 0, failed_count: 0 });
    batchSendDrafts.mockResolvedValue({ announcement_ids: [11], total: 1 });
    resolveTargets.mockResolvedValue({ recipient_count: 5 });
  });

  it('显示状态不可确认，不伪报完成、成功或取消', async () => {
    renderPage();
    fireEvent.click(await screen.findByText('草稿甲'));
    fireEvent.click(screen.getByRole('button', { name: /添加目标/ }));
    fireEvent.click(await screen.findByRole('button', { name: /全员/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: /批量发送/ })).toBeEnabled());

    fireEvent.click(screen.getByRole('button', { name: /批量发送/ }));

    expect(await screen.findByText(/状态不可确认/)).toBeInTheDocument();
    expect(screen.getByText(/1\/1 条公告已删除或无法查询/)).toBeInTheDocument();
    expect(screen.getByText(/后台投递可能仍在继续/)).toBeInTheDocument();
    expect(screen.queryByText(/已完成/)).toBeNull();
    expect(screen.queryByText(/已取消/)).toBeNull();
    expect(screen.queryByText(/成功 \d/)).toBeNull();
  });
});
