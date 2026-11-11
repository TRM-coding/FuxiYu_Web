import { describe, it, expect, vi, afterEach } from 'vitest';
import { API_ROUTES, CREDENTIALS } from '../configs/backend_config';
import { getDeletedContainerMountUsage } from '../api/container_api';

const jsonResponse = (body, status = 200, url = 'https://ctrl/api/containers/get_deleted_container_mount_usage') => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status === 200 ? 'OK' : 'Not Found',
  url,
  json: async () => body,
});

const abortableFetch = () => vi.fn((url, options) => new Promise((resolve, reject) => {
  options.signal.addEventListener('abort', () => {
    const err = new Error('aborted');
    err.name = 'AbortError';
    reject(err);
  }, { once: true });
}));

describe('getDeletedContainerMountUsage 请求边界', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('POST 固定路由，只发送去重正整数 deleted_ids，带 credentials', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      success: 1,
      usages: [{ deleted_id: 12, bytes: 1, measured_at: '2026-10-18T03:04:05Z', pending: false, error: null }],
    }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getDeletedContainerMountUsage([13, 12, 13]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url).endsWith(API_ROUTES.CONTAINERS_GET_DELETED_MOUNT_USAGE)).toBe(true);
    expect(API_ROUTES.CONTAINERS_GET_DELETED_MOUNT_USAGE).toBe('/api/containers/get_deleted_container_mount_usage');
    expect(options.method).toBe('POST');
    expect(options.credentials).toBe(CREDENTIALS);
    expect(options.credentials).toBe('include');
    expect(options.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(options.body);
    expect(body).toEqual({ deleted_ids: [13, 12] });
    expect(Object.keys(body)).toEqual(['deleted_ids']);
    expect(body).not.toHaveProperty('path');
    expect(body).not.toHaveProperty('mount_path');
    expect(body).not.toHaveProperty('machine_id');
    expect(result.usages).toHaveLength(1);
  });

  it('非法/超限入参不发请求', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    for (const bad of [null, '1', {}, [0], [-1], [1.5], ['2'], [NaN]]) {
      await expect(getDeletedContainerMountUsage(bad)).rejects.toBeInstanceOf(Error);
    }
    const tooMany = Array.from({ length: 101 }, (_, i) => i + 1);
    await expect(getDeletedContainerMountUsage(tooMany)).rejects.toBeInstanceOf(RangeError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('去重后恰好 100 个允许发送；空数组不发请求', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: 1, usages: [] }));
    vi.stubGlobal('fetch', fetchMock);

    const ids = Array.from({ length: 100 }, (_, i) => i + 1);
    await getDeletedContainerMountUsage([...ids, 1]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).deleted_ids).toHaveLength(100);

    fetchMock.mockClear();
    await expect(getDeletedContainerMountUsage([])).resolves.toEqual({ success: 1, usages: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('只接受 success===1 且 usages 为数组，原样保留逐项字段给页面', async () => {
    const raw = [{ deleted_id: 12, bytes: 123, measured_at: 't', pending: false, error: null, extra: 'raw' }];
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: 1, usages: raw }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getDeletedContainerMountUsage([12]);
    expect(result.usages).toEqual(raw);
    expect(result.usages[0].extra).toBe('raw');
  });

  it('success=0、缺 success、success 非数字 1、usages 非数组都拒绝且不伪造空成功', async () => {
    const bodies = [
      { success: 0, usages: [] },
      { usages: [] },
      { success: '1', usages: [] },
      { success: 1 },
      { success: 1, usages: {} },
      { success: 1, usages: null },
    ];

    for (const body of bodies) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(body)));
      const err = await getDeletedContainerMountUsage([12]).then(
        () => { throw new Error('非法响应不得解析为空成功'); },
        e => e,
      );
      expect(err).toBeInstanceOf(Error);
      expect(err.body).toEqual(body);
    }
  });

  it('HTTP 404/405 原样抛出状态交给页面降级', async () => {
    for (const status of [404, 405]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ success: 0, message: 'no route' }, status)));
      const err = await getDeletedContainerMountUsage([12]).then(
        () => { throw new Error('404/405 必须失败'); },
        e => e,
      );
      expect(err.status).toBe(status);
      expect(err.route).toContain('/get_deleted_container_mount_usage');
    }
  });

  it('外部 signal 可取消；已取消的 signal 不发请求', async () => {
    const fetchMock = abortableFetch();
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();
    const request = getDeletedContainerMountUsage([12], { signal: controller.signal });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    controller.abort();
    await expect(request).rejects.toMatchObject({ name: 'AbortError' });

    fetchMock.mockClear();
    const aborted = new AbortController();
    aborted.abort();
    await expect(getDeletedContainerMountUsage([12], { signal: aborted.signal }))
      .rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('短超时从 10s 常量来，超时 abort 并抛 TimeoutError', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', abortableFetch());
    const request = getDeletedContainerMountUsage([12], { timeout: 100 });
    const assertion = expect(request).rejects.toMatchObject({
      name: 'TimeoutError',
      code: 'request_timeout',
    });
    await vi.advanceTimersByTimeAsync(101);
    await assertion;
  });
});
