import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { listOperationLogs, getOperationLogStats } from '../api/operation_log_api';

const okResponse = (body = { logs: [], total_pages: 0 }) => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  url: 'http://localhost/api/admin/operation_logs',
  json: async () => body,
});

describe('操作日志 GET 参数序列化', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => okResponse()));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('多选目标类别使用重复 target_type 参数', async () => {
    await listOperationLogs({ page: 1, page_size: 20, target_type: ['machine', 'container', 'user'] });
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.searchParams.getAll('target_type')).toEqual(['machine', 'container', 'user']);
    expect(url.searchParams.get('page')).toBe('1');
  });

  it('单个目标类别保持单值调用兼容', async () => {
    await listOperationLogs({ page: 2, target_type: 'image' });
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.searchParams.getAll('target_type')).toEqual(['image']);
  });

  it('空数组、空串与 null 不写查询参数', async () => {
    await listOperationLogs({
      page: 1,
      target_type: [],
      operation: '',
      operator_user_id: null,
    });
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.searchParams.has('target_type')).toBe(false);
    expect(url.searchParams.has('operation')).toBe(false);
    expect(url.searchParams.has('operator_user_id')).toBe(false);
  });

  it('统计请求保持既有标量参数', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(okResponse({ total: 0 }));
    await getOperationLogStats({ start: '2026-01-01T00:00:00', end: '2026-01-02T00:00:00', tz_offset_minutes: 480 });
    const url = new URL(fetch.mock.calls[0][0]);
    expect(url.searchParams.get('start')).toBe('2026-01-01T00:00:00');
    expect(url.searchParams.get('end')).toBe('2026-01-02T00:00:00');
    expect(url.searchParams.get('tz_offset_minutes')).toBe('480');
  });
});
