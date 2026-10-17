import { describe, it, expect, vi, afterEach } from 'vitest';
import { listAllContainerBrefInformation, startContainer } from '../api/container_api';

const jsonResponse = (body, url = 'https://ctrl/api/containers/test') => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  url,
  json: async () => body,
});

describe('container_api 成功映射（Q18：HTTP 2xx 但 success=0 不算成功）', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('HTTP 200 + success=0：拒绝并保留后端 body，供错误展示映射', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(
      { success: 0, message: 'node refused', error_reason: 'start_failed' },
      'https://ctrl/api/containers/start_container',
    )));

    const err = await startContainer(1).then(
      () => { throw new Error('success=0 必须被拒绝'); },
      (e) => e,
    );

    expect(err.status).toBe(200);
    expect(err.body).toMatchObject({ success: 0, error_reason: 'start_failed' });
    expect(err.route).toContain('/containers/start_container');
  });

  it('HTTP 200 + success=false：同样拒绝', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ success: false, message: 'nope' })));

    await expect(startContainer(1)).rejects.toMatchObject({
      body: expect.objectContaining({ success: false }),
    });
  });

  it('HTTP 200 + success=1：正常返回业务体', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ success: 1, message: 'Container start request sent' })));

    await expect(startContainer(1)).resolves.toMatchObject({ success: 1 });
  });

  it('无 success 字段的 200 响应仍按成功解析（沿用既有列表契约）', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ containers: [], total: 0 })));

    await expect(listAllContainerBrefInformation({ page_number: 0, page_size: 10 }))
      .resolves.toEqual({ containers: [], total: 0 });
  });
});
