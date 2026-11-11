import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { trackAnnouncementSend } from '../utils/announcementSend';

/** 让所有 pending 的 promise + 定时器落地 */
const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('trackAnnouncementSend（异步批量发送的进度轮询）', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('全部离开 sending 才收尾，并汇总成功/失败数', async () => {
    const rounds = [
      { announcements: [{ id: 11, status: 'sending' }, { id: 12, status: 'sending' }] },
      { announcements: [{ id: 11, status: 'sent', success_count: 3, fail_count: 0 },
                        { id: 12, status: 'sending' }] },
      { announcements: [{ id: 11, status: 'sent', success_count: 3, fail_count: 0 },
                        { id: 12, status: 'partial', success_count: 1, fail_count: 2 }] },
    ];
    let i = 0;
    const progress = [];
    const done = vi.fn();

    trackAnnouncementSend({
      announcementIds: [11, 12],
      fetchList: async () => rounds[Math.min(i++, rounds.length - 1)],
      onProgress: p => progress.push(p),
      onDone: done,
      intervalMs: 10,
    });

    await flush();
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60);
    await flush();

    expect(progress[0]).toMatchObject({ total: 2, done: 0 });
    expect(done).toHaveBeenCalledTimes(1);
    expect(done.mock.calls[0][0].map(a => a.id)).toEqual([11, 12]);
    // 最后一拍汇总：成功 4、失败 2
    expect(progress[progress.length - 1]).toMatchObject({ total: 2, done: 2, success: 4, fail: 2 });
  });

  it('列表里暂时看不到这批公告时，不当成"已完成"', async () => {
    const done = vi.fn();
    const stop = trackAnnouncementSend({
      announcementIds: [11],
      fetchList: async () => ({ announcements: [] }), // 分页没覆盖到 / 刚发起
      onDone: done,
      intervalMs: 10,
    });

    await vi.advanceTimersByTimeAsync(50);
    await flush();
    expect(done).not.toHaveBeenCalled();
    stop();
  });

  it('单次轮询失败不中断，下一拍继续', async () => {
    let i = 0;
    const done = vi.fn();
    const onError = vi.fn();
    trackAnnouncementSend({
      announcementIds: [11],
      fetchList: async () => {
        i += 1;
        if (i === 1) throw new Error('network blip');
        return { announcements: [{ id: 11, status: 'sent', success_count: 1, fail_count: 0 }] };
      },
      onDone: done,
      onError,
      intervalMs: 10,
    });

    await flush();
    expect(onError).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(30);
    await flush();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('stop() 之后不再轮询', async () => {
    const fetchList = vi.fn(async () => ({ announcements: [{ id: 11, status: 'sending' }] }));
    const stop = trackAnnouncementSend({
      announcementIds: [11],
      fetchList,
      intervalMs: 10,
    });

    await flush();
    const seen = fetchList.mock.calls.length;
    stop();
    await vi.advanceTimersByTimeAsync(100);
    expect(fetchList.mock.calls.length).toBe(seen);
  });

  it('公告持续缺失超过宽限期后停止轮询并标记 unknown', async () => {
    const fetchList = vi.fn(async () => ({ announcements: [] }));
    const onDone = vi.fn();
    const onUnknown = vi.fn();
    const progress = [];

    trackAnnouncementSend({
      announcementIds: [11],
      fetchList,
      onProgress: p => progress.push(p),
      onDone,
      onUnknown,
      intervalMs: 10,
      missingGraceMs: 0,
    });

    await flush();
    expect(onUnknown).toHaveBeenCalledTimes(1);
    expect(onUnknown.mock.calls[0][0]).toMatchObject({
      total: 1,
      unknownIds: ['11'],
      done: 0,
    });
    expect(onDone).not.toHaveBeenCalled();
    expect(progress[0]).toMatchObject({ total: 1, done: 0, unknown: 1 });

    await vi.advanceTimersByTimeAsync(100);
    expect(fetchList).toHaveBeenCalledTimes(1);
  });

  it('短暂缺失后恢复时继续轮询，不提前判未知', async () => {
    const rounds = [
      { announcements: [] },
      { announcements: [{ id: 11, status: 'sending' }] },
      { announcements: [{ id: 11, status: 'sent', success_count: 1, fail_count: 0 }] },
    ];
    let i = 0;
    const onUnknown = vi.fn();
    const onDone = vi.fn();

    trackAnnouncementSend({
      announcementIds: [11],
      fetchList: async () => rounds[Math.min(i++, rounds.length - 1)],
      onDone,
      onUnknown,
      intervalMs: 10,
      missingGraceMs: 50,
    });

    await flush();
    await vi.advanceTimersByTimeAsync(30);
    await flush();

    expect(onUnknown).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('部分公告缺失时不把已返回项凑成完成，unknown 保留未知 id', async () => {
    const onDone = vi.fn();
    const onUnknown = vi.fn();

    trackAnnouncementSend({
      announcementIds: [11, 12],
      fetchList: async () => ({
        announcements: [{ id: 11, status: 'sent', success_count: 3, fail_count: 0 }],
      }),
      onDone,
      onUnknown,
      intervalMs: 10,
      missingGraceMs: 0,
    });

    await flush();
    expect(onDone).not.toHaveBeenCalled();
    expect(onUnknown).toHaveBeenCalledTimes(1);
    expect(onUnknown.mock.calls[0][0]).toMatchObject({
      total: 2,
      unknownIds: ['12'],
      knownIds: ['11'],
      done: 1,
      success: 3,
      fail: 0,
    });
  });
});
