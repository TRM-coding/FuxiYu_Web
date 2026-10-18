import { describe, it, expect } from 'vitest';
import { CONTAINER_ACTION_KEYS, resolveContainerActions } from '../utils/containerActions';

const c = (overrides = {}) => ({
  effective_status: 'online',
  is_long_term: false,
  long_term_container_can_enable: true,
  disk_usage_percent: 10,
  ...overrides,
});

const ctx = (overrides = {}) => ({
  permissions: ['container:operation'],
  containerRole: 'ROOT',
  readOnly: false,
  ...overrides,
});

const resolve = (container = c(), context = ctx()) => resolveContainerActions({ container, context });

describe('跨上下文动作矩阵（五个页面共用同一 resolver）', () => {
  it('同一 online 容器在 ROOT 下：启停/删除/长期启用口径明确', () => {
    const result = resolve();
    expect(result.actions.start).toMatchObject({ visible: true, enabled: false });
    expect(result.actions.stop).toMatchObject({ visible: true, enabled: true });
    expect(result.actions.restart).toMatchObject({ visible: true, enabled: true });
    expect(result.actions.delete).toMatchObject({ visible: true, enabled: true });
    expect(result.longTerm).toMatchObject({
      direction: 'enable', actionKey: 'long_term_enable', enabled: true, checked: false,
    });
  });

  it.each([
    ['ROOT', ctx(), true, true],
    ['ADMIN', ctx({ containerRole: 'ADMIN' }), true, false],
    ['COLLABORATOR', ctx({ containerRole: 'COLLABORATOR' }), false, false],
    ['manage operator', ctx({ permissions: ['container:manage'], containerRole: null }), true, true],
    ['undefined permissions', ctx({ permissions: undefined, containerRole: null }), false, false],
  ])('%s 的 command 权限与 longTerm 权限差异明确', (_label, context, commandVisible, longTermEnabled) => {
    const result = resolve(c({ effective_status: 'online' }), context);
    expect(result.actions.delete.visible).toBe(commandVisible);
    expect(result.actions.delete.enabled).toBe(commandVisible);
    expect(result.longTerm.enabled).toBe(longTermEnabled);
    expect(result.longTerm.visible).toBe(true);
  });

  it('readOnly true/缺失/非法统一覆盖全部七个写动作（含 longTerm/unpause）', () => {
    for (const readOnly of [true, undefined, 'false', 0]) {
      const result = resolve(c({ effective_status: 'paused' }), ctx({ readOnly, permissions: ['container:manage'] }));
      for (const key of CONTAINER_ACTION_KEYS) {
        expect(result.actions[key].enabled).toBe(false);
      }
      expect(result.actions.unpause.visible).toBe(false);
      expect(result.longTerm.visible).toBe(false);
      expect(result.longTerm.enabled).toBe(false);
    }
  });

  it('同一容器同上下文在 status 矩阵下删除/启停/解冻一致', () => {
    const allowedDelete = ['online', 'offline', 'paused', 'failed'];
    for (const status of allowedDelete) {
      const result = resolve(c({ effective_status: status }), ctx({ permissions: ['container:manage'], containerRole: null }));
      expect(result.actions.delete.enabled, status).toBe(true);
      expect(result.actions.unpause.enabled).toBe(status === 'paused');
    }
    for (const status of ['building', 'creating', 'starting', 'stopping', 'restarting', 'host_offline', 'host_maintenance', 'status_unknown']) {
      const result = resolve(c({ effective_status: status }), ctx({ permissions: ['container:manage'], containerRole: null }));
      expect(result.actions.delete.enabled, status).toBe(false);
      expect(result.actions.unpause.enabled, status).toBe(false);
    }
  });

  it('长期资格只影响长期，不影响删除/启停/解冻', () => {
    for (const is_long_term of [true, false, 'false', undefined, null]) {
      const result = resolve(c({ effective_status: 'failed', is_long_term }), ctx({ permissions: ['container:manage'], containerRole: null }));
      expect(result.actions.delete.enabled).toBe(true);
      expect(result.actions.start.enabled).toBe(false);
      expect(result.longTerm.enabled).toBe(false);
    }
  });

  it('冻结行残留不参与资格：online/offline 仍可取消长期', () => {
    for (const status of ['online', 'offline']) {
      const result = resolve(c({
        effective_status: status,
        is_long_term: true,
        freeze_state: { is_frozen: true, days_frozen: 9, grace_until: '2026-10-20T00:00:00Z' },
        long_term_container_can_enable: false,
        disk_usage_percent: 100,
      }));
      expect(result.longTerm.enabled).toBe(true);
      expect(result.longTerm.checked).toBe(true);
    }
  });

  it('ready_identity / Node 动作字段不改变任何 Web 结论', () => {
    const base = resolve(c({ effective_status: 'failed' }));
    const withNodeFields = resolve(c({
      effective_status: 'failed',
      ready_identity: { ready: true, token: 'x' },
      node_action: { success: 1 },
      action_result: 'ok',
    }));
    expect(withNodeFields).toEqual(base);
  });
});
