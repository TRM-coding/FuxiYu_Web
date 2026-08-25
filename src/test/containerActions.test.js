import { describe, it, expect } from 'vitest';
import {
  createContainerStatusTransition,
  deriveContainerDisplayStatus,
  getContainerActionState,
  getRoleActionSet,
} from '../utils/containerActions';

describe('getContainerActionState', () => {
  it('online 容器可停止/重启，不可启动', () => {
    const s = getContainerActionState('online');
    expect(s.canStart).toBe(false);
    expect(s.canStop).toBe(true);
    expect(s.canRestart).toBe(true);
    expect(s.hostOffline).toBe(false);
  });

  it('offline 容器可启动，不可停止/重启', () => {
    const s = getContainerActionState('offline');
    expect(s.canStart).toBe(true);
    expect(s.canStop).toBe(false);
    expect(s.canRestart).toBe(false);
  });

  it('过渡态（creating/starting/stopping）全部不可操作', () => {
    for (const st of ['creating', 'starting', 'stopping', 'failed', 'paused']) {
      const s = getContainerActionState(st);
      expect(s.canStart).toBe(false);
      expect(s.canStop).toBe(false);
      expect(s.canRestart).toBe(false);
    }
  });

  it('宿主机离线时即使 online 也全部禁用', () => {
    const s = getContainerActionState('online', 'host_offline');
    expect(s.hostOffline).toBe(true);
    expect(s.canStart).toBe(false);
    expect(s.canStop).toBe(false);
    expect(s.canRestart).toBe(false);
  });

  it('大小写与空值鲁棒', () => {
    expect(getContainerActionState('ONLINE').canStop).toBe(true);
    expect(getContainerActionState(undefined).canStart).toBe(false);
    expect(getContainerActionState(null, 'host_offline').hostOffline).toBe(true);
  });
});

describe('getRoleActionSet', () => {
  it('ADMIN：邀请与删除容器', () => {
    const a = getRoleActionSet('ADMIN');
    expect(a).toMatchObject({ showInvite: true, showDeleteContainer: true, showLeave: false, showLongTerm: false });
  });

  it('COLLABORATOR：退出', () => {
    const a = getRoleActionSet('COLLABORATOR');
    expect(a.showLeave).toBe(true);
    expect(a.showInvite).toBe(false);
    expect(a.showLongTerm).toBe(false);
  });

  it('ROOT：长期容器', () => {
    const a = getRoleActionSet('ROOT');
    expect(a.showLongTerm).toBe(true);
    expect(a.showInvite).toBe(false);
    expect(a.showLeave).toBe(false);
  });

  it('未知角色：无特权按钮', () => {
    const a = getRoleActionSet('guest');
    expect(a).toMatchObject({ showInvite: false, showDeleteContainer: false, showLeave: false, showLongTerm: false });
  });
});

describe('deriveContainerDisplayStatus', () => {
  it('keeps restarting when a stale online snapshot arrives before restart progress', () => {
    const pending = createContainerStatusTransition('online', 'restarting', {
      targetStatus: 'online',
      startedAt: 1000,
      timeoutMs: 60000,
    });

    const result = deriveContainerDisplayStatus('online', pending, 2000);

    expect(result.status).toBe('restarting');
    expect(result.pendingTransition).toEqual(pending);
    expect(result.cleared).toBe(false);
  });

  it('accepts online after restarting has actually been observed', () => {
    const pending = createContainerStatusTransition('online', 'restarting', {
      targetStatus: 'online',
      startedAt: 1000,
      timeoutMs: 60000,
    });

    const progress = deriveContainerDisplayStatus('restarting', pending, 2000);
    const terminal = deriveContainerDisplayStatus('online', progress.pendingTransition, 3000);

    expect(progress.status).toBe('restarting');
    expect(progress.pendingTransition.reachedTransition).toBe(true);
    expect(terminal.status).toBe('online');
    expect(terminal.pendingTransition).toBe(null);
    expect(terminal.cleared).toBe(true);
  });

  it('keeps starting when a stale offline snapshot arrives', () => {
    const pending = createContainerStatusTransition('offline', 'starting', {
      targetStatus: 'online',
      startedAt: 1000,
      timeoutMs: 60000,
    });

    const result = deriveContainerDisplayStatus('offline', pending, 2000);

    expect(result.status).toBe('starting');
    expect(result.pendingTransition).toEqual(pending);
  });

  it('clears sticky state on failure or timeout', () => {
    const pending = createContainerStatusTransition('online', 'restarting', {
      targetStatus: 'online',
      startedAt: 1000,
      timeoutMs: 1000,
    });

    expect(deriveContainerDisplayStatus('failed', pending, 1500)).toMatchObject({
      status: 'failed',
      pendingTransition: null,
      cleared: true,
    });
    expect(deriveContainerDisplayStatus('online', pending, 2501)).toMatchObject({
      status: 'online',
      pendingTransition: null,
      cleared: true,
    });
  });
});
