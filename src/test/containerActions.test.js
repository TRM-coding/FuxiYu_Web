import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  CONTAINER_ACTION_KEYS,
  createContainerStatusTransition,
  deriveContainerEffectiveStatus,
  getContainerActionReasonText,
  getContainerRoleFromAccounts,
  normalizeContainerActionContext,
  normalizeContainerStatus,
  resolveContainerActions,
} from '../utils/containerActions';

const ROOT = { user_id: 1, username: 'root_user', role: 'ROOT' };

const context = (overrides = {}) => ({
  permissions: ['container:operation', 'container:manage'],
  containerRole: 'ROOT',
  readOnly: false,
  ...overrides,
});

const container = (overrides = {}) => ({
  key: '1',
  effective_status: 'online',
  is_long_term: false,
  long_term_container_can_enable: true,
  disk_usage_percent: 20,
  ...overrides,
});

const resolve = (overrides = {}, ctx = context(), extra = {}) => resolveContainerActions({
  container: container(overrides),
  context: ctx,
  ...extra,
});

describe('CONTAINER_ACTION_KEYS / 输出契约', () => {
  it('覆盖七个动作且每项 visible/enabled/disabled/reason/loading/pending 齐备', () => {
    const result = resolve({}, context({ permissions: [] }));
    expect(CONTAINER_ACTION_KEYS).toEqual([
      'start', 'stop', 'restart', 'unpause',
      'delete', 'long_term_enable', 'long_term_disable',
    ]);
    expect(Object.keys(result.actions)).toEqual(CONTAINER_ACTION_KEYS);
    for (const key of CONTAINER_ACTION_KEYS) {
      expect(result.actions[key]).toEqual(expect.objectContaining({
        visible: expect.any(Boolean),
        enabled: expect.any(Boolean),
        disabled: expect.any(Boolean),
        loading: expect.any(Boolean),
        pending: expect.any(Boolean),
      }));
      expect(result.actions[key].disabled).toBe(!result.actions[key].enabled);
    }
    expect(result.longTerm.disabled).toBe(!result.longTerm.enabled);
    expect(result.actions).not.toHaveProperty('leave');
  });

  it('未知 loading key 被忽略，不生成动作', () => {
    const result = resolve({}, context(), { loading: { leave: true, bogus: true } });
    expect(result.actions).not.toHaveProperty('leave');
    expect(result.actions).not.toHaveProperty('bogus');
    expect(result.actions.delete.loading).toBe(false);
  });

  it('模块无 IO / 无存储 / 无隐式时钟', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'src/utils/containerActions.js'), 'utf8');
    expect(source).not.toMatch(/Date\.now\(/);
    expect(source).not.toMatch(/\bdocument\./);
    expect(source).not.toMatch(/\blocalStorage\b/);
    expect(source).not.toMatch(/\bsessionStorage\b/);
    expect(source).not.toMatch(/\bfetch\(/);
  });
});

describe('normalizeContainerActionContext / 权限矩阵', () => {
  it('ROOT/ADMIN/COLLABORATOR 的容器角色只认已知值', () => {
    expect(normalizeContainerActionContext(context({ containerRole: 'ROOT' }))).toMatchObject({
      roleKnown: true, roleRank: 3,
    });
    expect(normalizeContainerActionContext(context({ containerRole: 'ADMIN' }))).toMatchObject({
      roleKnown: true, roleRank: 2,
    });
    expect(normalizeContainerActionContext(context({ containerRole: 'COLLABORATOR' }))).toMatchObject({
      roleKnown: true, roleRank: 1,
    });
    expect(normalizeContainerActionContext(context({ containerRole: 'root' }))).toMatchObject({
      roleKnown: false, roleRank: 0,
    });
    expect(normalizeContainerActionContext(context({ containerRole: '' }))).toMatchObject({
      roleKnown: false, roleRank: 0,
    });
  });

  it('container:manage 同时提供操作/管理/资源通配；bypass_auth_entity 不是资源通配', () => {
    const manage = normalizeContainerActionContext(context({
      permissions: ['container:manage'],
      containerRole: null,
    }));
    expect(manage).toMatchObject({
      hasOperation: true, hasManage: true, resourceWildcard: true, containerRole: null,
    });
    const bypassAuth = normalizeContainerActionContext(context({
      permissions: ['bypass_auth_entity'],
      containerRole: null,
    }));
    expect(bypassAuth).toMatchObject({
      hasOperation: true, hasManage: true, resourceWildcard: false,
    });
    const bypassResource = normalizeContainerActionContext(context({
      permissions: ['container:operation', 'bypass_resource'],
      containerRole: null,
    }));
    expect(bypassResource).toMatchObject({
      hasOperation: true, hasManage: false, resourceWildcard: true,
    });
  });

  it('缺失/undefined/空数组/非数组权限失败关闭', () => {
    for (const permissions of [undefined, null, [], 'container:operation', {}]) {
      const result = resolve({}, context({ permissions, containerRole: null }));
      expect(result.actions.start.visible).toBe(false);
      expect(result.actions.delete.visible).toBe(false);
      expect(result.actions.delete.reason).toBe('container_permission_denied');
    }
  });

  it('readOnly 必须是原生 boolean：true 或缺失/非法时禁用全部七个写动作', () => {
    for (const readOnly of [true, undefined, 'false', 0, null, 1]) {
      const result = resolve({}, context({ readOnly }));
      for (const key of CONTAINER_ACTION_KEYS) {
        expect(result.actions[key].enabled).toBe(false);
        expect(result.actions[key].reason).toBe(readOnly === true ? 'read_only' : 'read_only_unknown');
      }
      expect(result.longTerm.visible).toBe(false);
    }
    const writable = resolve({}, context({ readOnly: false }));
    expect(writable.actions.delete.enabled).toBe(true);
    expect(writable.longTerm.visible).toBe(true);
  });
});

describe('删除 / 启停 / 解冻状态矩阵', () => {
  it.each(['online', 'offline', 'paused', 'failed'])('delete 允许 %s', (status) => {
    const result = resolve({ effective_status: status });
    expect(result.actions.delete).toMatchObject({
      visible: true, enabled: true, disabled: false, reason: null,
    });
  });

  it.each([
    ['building', 'container_busy'],
    ['creating', 'container_busy'],
    ['starting', 'container_busy'],
    ['stopping', 'container_busy'],
    ['restarting', 'container_busy'],
    ['host_offline', 'container_host_offline'],
    ['host_maintenance', 'container_host_maintenance'],
    ['status_unknown', 'container_status_unknown'],
    ['unknown', 'container_status_unknown'],
    ['', 'container_status_unknown'],
  ])('delete 拒绝 %s 并给出 %s', (status, reason) => {
    const result = resolve({ effective_status: status });
    expect(result.actions.delete).toMatchObject({
      visible: true, enabled: false, disabled: true, reason,
    });
  });

  it('pausing/unpausing 作为未确认 pending，不当作可删除终态', () => {
    for (const status of ['pausing', 'unpausing']) {
      const result = resolve({ effective_status: status });
      expect(result.pending).toBe(true);
      expect(result.actions.delete).toMatchObject({
        enabled: false, pending: true, reason: 'container_transition_unconfirmed',
      });
    }
  });

  it('start 仅 offline；stop/restart 仅 online；failed restart 保持保守禁用', () => {
    expect(resolve({ effective_status: 'offline' }).actions.start.enabled).toBe(true);
    expect(resolve({ effective_status: 'online' }).actions.start).toMatchObject({
      enabled: false, reason: 'container_not_offline',
    });
    expect(resolve({ effective_status: 'online' }).actions.stop.enabled).toBe(true);
    expect(resolve({ effective_status: 'online' }).actions.restart.enabled).toBe(true);
    expect(resolve({ effective_status: 'failed' }).actions.start).toMatchObject({
      enabled: false, reason: 'container_failed',
    });
    expect(resolve({ effective_status: 'failed' }).actions.stop).toMatchObject({
      enabled: false, reason: 'container_failed',
    });
    expect(resolve({ effective_status: 'failed' }).actions.restart).toMatchObject({
      enabled: false, reason: 'container_failed',
    });
    expect(resolve({ effective_status: 'paused' }).actions.start).toMatchObject({
      enabled: false, reason: 'container_paused',
    });
  });

  it('unpause 只要求 container:manage，且仅在 paused 启用', () => {
    const manager = context({ permissions: ['container:manage'], containerRole: null });
    expect(resolve({ effective_status: 'paused' }, manager).actions.unpause).toMatchObject({
      visible: true, enabled: true,
    });
    expect(resolve({ effective_status: 'online' }, manager).actions.unpause).toMatchObject({
      visible: true, enabled: false, reason: 'container_not_paused',
    });
    const adminNoManage = context({ permissions: ['container:operation'], containerRole: 'ADMIN' });
    expect(resolve({ effective_status: 'paused' }, adminNoManage).actions.unpause).toMatchObject({
      visible: false, enabled: false, reason: 'container_permission_denied',
    });
  });

  it('COLLABORATOR 只能解冻，不能启停/删除；ADMIN 可启停删', () => {
    const collab = context({ permissions: ['container:operation'], containerRole: 'COLLABORATOR' });
    const collabResult = resolve({ effective_status: 'online' }, collab);
    expect(collabResult.actions.start.visible).toBe(false);
    expect(collabResult.actions.delete.visible).toBe(false);
    expect(collabResult.actions.delete.reason).toBe('container_permission_denied');
    const admin = context({ permissions: ['container:operation'], containerRole: 'ADMIN' });
    expect(resolve({ effective_status: 'online' }, admin).actions.delete.enabled).toBe(true);
  });

  it('资源通配可覆盖容器角色；bypass_auth_entity 单独不能启停/删除', () => {
    const wildcard = context({ permissions: ['container:operation', 'bypass_resource'], containerRole: null });
    expect(resolve({ effective_status: 'online' }, wildcard).actions.delete.enabled).toBe(true);
    const bypassAuth = context({ permissions: ['bypass_auth_entity'], containerRole: null });
    const result = resolve({ effective_status: 'online' }, bypassAuth);
    expect(result.actions.delete.visible).toBe(false);
    expect(result.actions.delete.reason).toBe('container_permission_denied');
  });
});

describe('长期动作：既有字段与严格方向', () => {
  it('严格 is_long_term 选向：true 取消、false 启用、其它值未知', () => {
    expect(resolve({ is_long_term: true }).longTerm).toMatchObject({
      stateKnown: true, direction: 'disable', actionKey: 'long_term_disable', checked: true,
    });
    expect(resolve({ is_long_term: false }).longTerm).toMatchObject({
      stateKnown: true, direction: 'enable', actionKey: 'long_term_enable', checked: false,
    });
    for (const value of [undefined, null, 'false', 0, 1]) {
      const result = resolve({ is_long_term: value });
      expect(result.longTerm).toMatchObject({
        stateKnown: false, direction: null, actionKey: null, checked: null,
        visible: true, enabled: false, disabled: true, reason: 'long_term_state_unknown',
      });
      expect(result.actions.long_term_enable.enabled).toBe(false);
      expect(result.actions.long_term_disable.enabled).toBe(false);
      expect(result.actions.delete.enabled).toBe(true);
      expect(result.actions.stop.enabled).toBe(true);
    }
  });

  it('启用方向：配额 false / 磁盘 100% 禁用，缺字段或未达阈值不额外禁用', () => {
    expect(resolve({ is_long_term: false, long_term_container_can_enable: false }).longTerm).toMatchObject({
      enabled: false, reason: 'long_term_limit_reached',
    });
    expect(resolve({ is_long_term: false, disk_usage_percent: 100 }).longTerm).toMatchObject({
      enabled: false, reason: 'disk_usage_over_limit',
    });
    expect(resolve({ is_long_term: false, disk_usage_percent: null, disk_usage: { usage_percent: 100 } }).longTerm).toMatchObject({
      enabled: false, reason: 'disk_usage_over_limit',
    });
    expect(resolve({ is_long_term: false, disk_usage_percent: 99.9 }).longTerm.enabled).toBe(true);
    expect(resolve({
      is_long_term: false,
      long_term_container_can_enable: undefined,
      disk_usage_percent: undefined,
      disk_usage: undefined,
    }).longTerm.enabled).toBe(true);
  });

  it('启用方向允许 paused，但拒绝 failed/busy/host/unknown', () => {
    expect(resolve({ is_long_term: false, effective_status: 'paused' }).longTerm.enabled).toBe(true);
    for (const [status, reason] of [
      ['failed', 'container_failed'],
      ['building', 'container_busy'],
      ['host_offline', 'container_host_offline'],
      ['host_maintenance', 'container_host_maintenance'],
      ['status_unknown', 'container_status_unknown'],
    ]) {
      expect(resolve({ is_long_term: false, effective_status: status }).longTerm).toMatchObject({
        enabled: false, reason,
      });
    }
  });

  it('取消方向：paused 禁用；online/offline 即使 freeze_state 行残留也允许；不检查配额/磁盘', () => {
    expect(resolve({ is_long_term: true, effective_status: 'paused' }).longTerm).toMatchObject({
      enabled: false, reason: 'container_paused',
    });
    for (const status of ['online', 'offline']) {
      const result = resolve({
        is_long_term: true,
        effective_status: status,
        freeze_state: { is_frozen: true, days_frozen: 2, grace_until: '2026-10-18T00:00:00Z' },
        long_term_container_can_enable: false,
        disk_usage_percent: 100,
      });
      expect(result.longTerm.enabled).toBe(true);
      expect(result.longTerm.checked).toBe(true);
    }
  });

  it('长期权限需要 ROOT 或资源通配；非法方向只禁用长期', () => {
    const admin = context({ permissions: ['container:operation'], containerRole: 'ADMIN' });
    const adminResult = resolve({ is_long_term: false }, admin);
    expect(adminResult.longTerm).toMatchObject({
      visible: true, enabled: false, reason: 'container_permission_denied',
    });
    expect(adminResult.actions.long_term_enable).toMatchObject({
      visible: true, enabled: false, reason: 'container_permission_denied',
    });
    expect(adminResult.actions.delete.enabled).toBe(true);
    const wildcard = context({ permissions: ['container:operation', 'bypass_resource'], containerRole: null });
    expect(resolve({ is_long_term: false }, wildcard).longTerm.enabled).toBe(true);
    const invalid = resolve({
      is_long_term: 'false',
      effective_status: 'failed',
    }, context({ permissions: ['bypass_auth_entity'], containerRole: 'ADMIN' }));
    expect(invalid.longTerm.reason).toBe('container_permission_denied');
    expect(invalid.actions.delete.enabled).toBe(true);
  });
});

describe('reason / loading / pending 优先级', () => {
  it('readOnly 优先于权限与 loading', () => {
    const result = resolve({}, context({ readOnly: true, permissions: [] }), {
      loading: { delete: true },
    });
    expect(result.actions.delete).toMatchObject({
      enabled: false, loading: true, reason: 'read_only',
    });
    expect(result.longTerm.reason).toBe('read_only');
  });

  it('权限失效优先于 loading，且按钮隐藏', () => {
    const result = resolve({}, context({ permissions: [], containerRole: null }), {
      loading: { delete: true },
    });
    expect(result.actions.delete).toMatchObject({
      visible: false, enabled: false, loading: true, reason: 'container_permission_denied',
    });
  });

  it('已授权 loading 时禁用且 reason 为 null', () => {
    const result = resolve({}, context(), { loading: { start: true, delete: true } });
    expect(result.actions.start).toMatchObject({
      enabled: false, loading: true, reason: null, pending: false,
    });
    expect(result.actions.delete).toMatchObject({
      enabled: false, loading: true, reason: null, pending: false,
    });
  });

  it('pendingTransition 优先于状态门，且 pending=true、不当作终态', () => {
    const result = resolve({ effective_status: 'online' }, context(), {
      pendingTransition: { transition: 'restarting', from: 'online', target: 'online' },
    });
    expect(result.pending).toBe(true);
    expect(result.actions.stop).toMatchObject({
      enabled: false, pending: true, reason: 'container_transition_unconfirmed',
    });
    expect(result.longTerm.pending).toBe(true);
    expect(result.actions.delete.pending).toBe(true);
  });

  it('状态门优先于长期配额/磁盘；长期字段只影响长期', () => {
    const result = resolve({
      effective_status: 'failed',
      is_long_term: false,
      long_term_container_can_enable: false,
      disk_usage_percent: 100,
    });
    expect(result.actions.long_term_enable.reason).toBe('container_failed');
    expect(result.actions.delete.enabled).toBe(true);
  });

  it('原因文案 helper 保留稳定中文并透传未知原因', () => {
    expect(getContainerActionReasonText('container_busy')).toBe('容器正在处理中，暂不可操作');
    expect(getContainerActionReasonText('disk_usage_over_limit')).toBe('磁盘用量已达上限，无法设为长期容器');
    expect(getContainerActionReasonText('server_custom_reason')).toBe('server_custom_reason');
    expect(getContainerActionReasonText(null)).toBe('');
    expect(getContainerActionReasonText(undefined)).toBe('');
  });
});

describe('getContainerRoleFromAccounts', () => {
  it('按 user_id 或 username 精确匹配，只接受三个已知角色', () => {
    expect(getContainerRoleFromAccounts([ROOT], 1, 'tester')).toBe('ROOT');
    expect(getContainerRoleFromAccounts([{ user_id: 2, username: 'u2', role: 'ADMIN' }], null, 'u2')).toBe('ADMIN');
    expect(getContainerRoleFromAccounts([{ user_id: 3, username: 'u3', role: 'COLLABORATOR' }], 3, '')).toBe('COLLABORATOR');
    expect(getContainerRoleFromAccounts([{ user_id: 4, username: 'u4', role: 'OWNER' }], 4, '')).toBe(null);
    expect(getContainerRoleFromAccounts([{ user_id: 5, username: 'u5', role: 'root' }], 5, '')).toBe(null);
    expect(getContainerRoleFromAccounts([], 1, 'root_user')).toBe(null);
    expect(getContainerRoleFromAccounts(null, 1, 'root_user')).toBe(null);
  });

  it('兼容 [username, role] 形状和缺失账号', () => {
    expect(getContainerRoleFromAccounts([['root_user', 'ROOT']], null, 'root_user')).toBe('ROOT');
    expect(getContainerRoleFromAccounts({ user_id: 9, username: 'nine', role: 'ADMIN' }, 9, '')).toBe('ADMIN');
    expect(getContainerRoleFromAccounts(undefined)).toBe(null);
  });
});

describe('container status 派生（显式时钟）', () => {
  it('normalizeContainerStatus 统一小写与空值', () => {
    expect(normalizeContainerStatus(' ONLINE ')).toBe('online');
    expect(normalizeContainerStatus(undefined)).toBe('');
  });

  it('createContainerStatusTransition 不隐式取时钟', () => {
    const pending = createContainerStatusTransition('online', 'restarting', { targetStatus: 'online' });
    expect(pending.startedAt).toBe(null);
    expect(pending.transition).toBe('restarting');
    expect(pending.timeoutMs).toBe(60000);
  });

  it('keeps restarting when a stale online snapshot arrives before restart progress', () => {
    const pending = createContainerStatusTransition('online', 'restarting', {
      targetStatus: 'online',
      startedAt: 1000,
      timeoutMs: 60000,
    });
    const result = deriveContainerEffectiveStatus('online', pending, 2000);
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
    const progress = deriveContainerEffectiveStatus('restarting', pending, 2000);
    const terminal = deriveContainerEffectiveStatus('online', progress.pendingTransition, 3000);
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
    const result = deriveContainerEffectiveStatus('offline', pending, 2000);
    expect(result.status).toBe('starting');
    expect(result.pendingTransition).toEqual(pending);
  });

  it('continues building into creating before accepting online', () => {
    const pending = createContainerStatusTransition('', 'building', {
      targetStatus: 'creating',
      startedAt: 1000,
      timeoutMs: 60000,
    });
    const stale = deriveContainerEffectiveStatus('', pending, 2000);
    const creating = deriveContainerEffectiveStatus('creating', stale.pendingTransition, 3000);
    const online = deriveContainerEffectiveStatus('online', creating.pendingTransition, 4000);
    expect(stale.status).toBe('building');
    expect(stale.pendingTransition).toEqual(pending);
    expect(creating.status).toBe('creating');
    expect(creating.pendingTransition).toMatchObject({
      from: 'creating',
      transition: 'creating',
      target: 'online',
      startedAt: 3000,
      timeoutMs: 60000,
    });
    expect(online.status).toBe('online');
    expect(online.pendingTransition).toBe(null);
    expect(online.cleared).toBe(true);
  });

  it('does not force building over an already online container', () => {
    const pending = createContainerStatusTransition('online', 'building', {
      targetStatus: 'creating',
      startedAt: 1000,
      timeoutMs: 60000,
    });
    const result = deriveContainerEffectiveStatus('online', pending, 2000);
    expect(result.status).toBe('online');
    expect(result.pendingTransition).toBe(null);
    expect(result.cleared).toBe(true);
  });

  it('clears sticky state on failure or timeout', () => {
    const pending = createContainerStatusTransition('online', 'restarting', {
      targetStatus: 'online',
      startedAt: 1000,
      timeoutMs: 1000,
    });
    expect(deriveContainerEffectiveStatus('failed', pending, 1500)).toMatchObject({
      status: 'failed',
      pendingTransition: null,
      cleared: true,
    });
    expect(deriveContainerEffectiveStatus('online', pending, 2501)).toMatchObject({
      status: 'online',
      pendingTransition: null,
      cleared: true,
    });
  });
});
