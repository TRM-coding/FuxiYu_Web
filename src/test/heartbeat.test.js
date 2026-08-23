import { describe, it, expect, vi, afterEach } from 'vitest';
import { startContainerStatusHeartbeat } from '../utils/heartbeat';

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
