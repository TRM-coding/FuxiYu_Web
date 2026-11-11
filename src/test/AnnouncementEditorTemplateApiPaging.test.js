import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listTemplates } from '../api/announcement_api';

const okResponse = (payload) => ({
  ok: true,
  status: 200,
  json: async () => payload,
});

describe('announcement_api 模板分页参数（Q52）', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('test_q52_announcement_api_paging_passthrough 首批 offset=0、加载更多 offset=200 且 limit 不超过 200', async () => {
    fetch.mockResolvedValue(okResponse({ templates: [], total: 205 }));

    await listTemplates({ limit: 200, offset: 0 });
    await listTemplates({ limit: 200, offset: 200 });

    const firstUrl = new URL(fetch.mock.calls[0][0]);
    expect(firstUrl.searchParams.get('limit')).toBe('200');
    expect(firstUrl.searchParams.get('offset')).toBe('0');

    const secondUrl = new URL(fetch.mock.calls[1][0]);
    expect(secondUrl.searchParams.get('limit')).toBe('200');
    expect(secondUrl.searchParams.get('offset')).toBe('200');
  });
});
