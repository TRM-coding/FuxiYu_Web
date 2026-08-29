import { describe, it, expect, vi, afterEach } from 'vitest';
import { startContainerStatusHeartbeat, watchIngContainerUntilTerminal } from '../utils/heartbeat';

describe('startContainerStatusHeartbeat', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reports restarting as progress before terminal online', async () => {
    vi.useFakeTimers();
    const progress = [];
    const terminal = [];

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ container_status: 'restarting' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ container_status: 'online' }),
      });

    startContainerStatusHeartbeat({
      machine_id: 1,
      container_name: 'c1',
      terminalState: 'online',
      interval: 100,
      onProgress: data => progress.push(data.container_status),
      onTerminal: data => terminal.push(data.container_status),
    });

    await vi.runOnlyPendingTimersAsync();
    await vi.runOnlyPendingTimersAsync();

    expect(progress).toEqual(['restarting', 'online']);
    expect(terminal).toEqual(['online']);
  });

  it('waits for required progress state before accepting terminal state', async () => {
    vi.useFakeTimers();
    const progress = [];
    const terminal = [];

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ container_status: 'online' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ container_status: 'restarting' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ container_status: 'online' }),
      });

    startContainerStatusHeartbeat({
      machine_id: 1,
      container_name: 'c1',
      terminalState: 'online',
      requiredProgressState: 'restarting',
      interval: 100,
      onProgress: data => progress.push(data.container_status),
      onTerminal: data => terminal.push(data.container_status),
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(terminal).toEqual([]);

    await vi.advanceTimersByTimeAsync(100);
    expect(terminal).toEqual([]);

    await vi.advanceTimersByTimeAsync(100);
    expect(progress).toEqual(['online', 'restarting', 'online']);
    expect(terminal).toEqual(['online']);
  });
});

describe('watchIngContainerUntilTerminal', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reports each ing progress state and only fires onTerminal at terminal', async () => {
    vi.useFakeTimers();
    const progress = [];
    const terminal = [];

    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ container_status: 'building' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ container_status: 'creating' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ container_status: 'online' }) });

    watchIngContainerUntilTerminal({
      machine_id: 1,
      container_id: 2,
      container_name: 'c1',
      interval: 100,
      onProgress: data => progress.push(data.container_status),
      onTerminal: data => terminal.push(data.container_status),
    });

    // 首次 doCheck 立即执行：building（ing，仅 onProgress）
    await vi.runOnlyPendingTimersAsync();
    await vi.runOnlyPendingTimersAsync();

    expect(progress).toEqual(['building', 'creating', 'online']);
    expect(terminal).toEqual(['online']);
  });

  it('terminates immediately when first poll is already terminal', async () => {
    vi.useFakeTimers();
    const progress = [];
    const terminal = [];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ container_status: 'online' }),
    });

    watchIngContainerUntilTerminal({
      machine_id: 1,
      container_id: 2,
      container_name: 'c1',
      interval: 100,
      onProgress: data => progress.push(data.container_status),
      onTerminal: data => terminal.push(data.container_status),
    });

    await vi.runOnlyPendingTimersAsync();
    await vi.runOnlyPendingTimersAsync();

    expect(progress).toEqual(['online']);
    expect(terminal).toEqual(['online']);
    // 终态后停止轮询：不再有新 fetch
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
