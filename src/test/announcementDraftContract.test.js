import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveDraft } from '../api/announcement_api';

// 回归锁（Q06/Q07）：草稿保存调用契约不透传 template_id。
// 模板选择只是编辑器侧复制初值，草稿保存的是独立内容快照；即使调用方仍带着
// template_id，也不能把它送进保存请求。
describe('saveDraft 草稿保存契约', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const okResponse = () => ({
    ok: true,
    status: 200,
    url: 'https://ctrl/api/announcements/drafts/save',
    json: async () => ({ success: 1, draft_id: 9 }),
  });

  it('剥离 template_id，保留 draft_id 与内容字段', async () => {
    fetch.mockResolvedValue(okResponse());

    await saveDraft({
      draft_id: 3,
      title: '草稿标题',
      content: '正文',
      raw_content: '正文',
      template_id: 7,
    });

    expect(fetch).toHaveBeenCalledTimes(1);
    const [, init] = fetch.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body).not.toHaveProperty('template_id');
    expect(body).toMatchObject({ draft_id: 3, title: '草稿标题', content: '正文' });
  });

  it('调用方本来就没带 template_id 时行为不变', async () => {
    fetch.mockResolvedValue(okResponse());

    await saveDraft({ title: '草稿标题', content: '正文' });

    const [, init] = fetch.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({ title: '草稿标题', content: '正文' });
  });
});
