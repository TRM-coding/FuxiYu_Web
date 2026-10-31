import { describe, it, expect } from 'vitest';
import {
  MOUNT_USAGE_ERROR_CODES,
  deriveDeletedMountState,
  deriveMeasurableDeletedIds,
  describeMountUsageError,
  formatLogicalBytes,
  isDeletedMountCleaned,
  isMeasurableDeletedRecord,
  isStableMountUsageError,
  isValidUtcTimestamp,
  normalizeMountUsageItem,
  resolveMountUsageBatch,
} from '../utils/mountUsage';

const record = (overrides = {}) => ({
  deleted_id: 12,
  mount_path: '/home/alice/containers/train-a',
  mount_cleaned: false,
  cleaned_at: null,
  ...overrides,
});

const success = (overrides = {}) => ({
  deleted_id: 12,
  bytes: 123456,
  measured_at: '2026-10-18T03:04:05Z',
  pending: false,
  error: null,
  ...overrides,
});

const pending = (overrides = {}) => ({
  deleted_id: 12,
  bytes: null,
  measured_at: null,
  pending: true,
  error: null,
  ...overrides,
});

const failed = (overrides = {}) => ({
  deleted_id: 12,
  bytes: null,
  measured_at: null,
  pending: false,
  error: 'node_unavailable',
  ...overrides,
});

const without = (source, field) => {
  const copy = { ...source };
  delete copy[field];
  return copy;
};

describe('已删除容器可测记录派生', () => {
  it('mount_cleaned=true 即使 cleaned_at 为空仍算已清理，但保留路径时仍可采样', () => {
    expect(isDeletedMountCleaned(record({ mount_cleaned: true, cleaned_at: null }))).toBe(true);
    expect(isMeasurableDeletedRecord(record({ mount_cleaned: true, cleaned_at: null }))).toBe(true);
    expect(isMeasurableDeletedRecord(record({ cleaned_at: '2026-10-18T00:00:00' }))).toBe(true);
  });

  it('无 mount、非法 ID 不请求', () => {
    expect(isMeasurableDeletedRecord(record({ mount_path: '' }))).toBe(false);
    expect(isMeasurableDeletedRecord(record({ mount_path: null }))).toBe(false);
    expect(isMeasurableDeletedRecord(record({ deleted_id: 0 }))).toBe(false);
    expect(isMeasurableDeletedRecord(record({ deleted_id: '12' }))).toBe(false);
    expect(isMeasurableDeletedRecord(record({ deleted_id: 1.5 }))).toBe(false);
  });

  it('只派生当前页可测 ID，去重且不携带路径；已清理但有路径也包含', () => {
    const ids = deriveMeasurableDeletedIds([
      record({ deleted_id: 7 }),
      record({ deleted_id: 7 }),
      record({ deleted_id: 8, mount_cleaned: true }),
      record({ deleted_id: 9, cleaned_at: '2026-10-18T00:00:00' }),
      record({ deleted_id: 10, mount_path: '' }),
      record({ deleted_id: 11 }),
    ]);
    expect(ids).toEqual([7, 8, 9, 11]);
  });
});

describe('挂载实际状态派生', () => {
  it('已清理且路径成功采集到用量时显示可能存在残留', () => {
    expect(deriveDeletedMountState(
      record({ mount_cleaned: true }),
      { status: 'success', bytes: 1024, measuredAt: '2026-10-18T03:04:05Z' },
    )).toEqual({ key: 'residual', label: '可能存在残留' });
    expect(deriveDeletedMountState(
      record({ cleaned_at: '2026-10-18T00:00:00' }),
      { status: 'success', bytes: 0, measuredAt: '2026-10-18T03:04:05Z' },
    )).toEqual({ key: 'residual', label: '可能存在残留' });
  });

  it('not_found 与 permission_denied 使用明确文案', () => {
    expect(deriveDeletedMountState(
      record({ mount_cleaned: true }),
      { status: 'error', reason: 'not_found', message: '目录不存在' },
    )).toEqual({ key: 'not_found', label: '目录不存在' });
    expect(deriveDeletedMountState(
      record(),
      { status: 'error', reason: 'permission_denied', message: '无权限' },
    )).toEqual({ key: 'permission_denied', label: '无权限' });
  });

  it('pending、其他失败、Node 不可用与缺项回退列表事实，不误称', () => {
    expect(deriveDeletedMountState(record({ mount_cleaned: true }), { status: 'pending' }))
      .toEqual({ key: 'cleaned', label: '已清理' });
    expect(deriveDeletedMountState(record(), { status: 'pending' }))
      .toEqual({ key: 'retained', label: 'mount 保留' });
    expect(deriveDeletedMountState(
      record({ mount_cleaned: true }),
      { status: 'error', reason: 'node_unavailable', message: '机器离线/不可用' },
    )).toEqual({ key: 'cleaned', label: '已清理' });
    expect(deriveDeletedMountState(
      record(),
      { status: 'error', reason: 'node_timeout', message: '统计超时' },
    )).toEqual({ key: 'retained', label: 'mount 保留' });
    expect(deriveDeletedMountState(record({ mount_cleaned: true }), undefined))
      .toEqual({ key: 'cleaned', label: '已清理' });
  });

  it('无路径始终无挂载，即使有成功/错误用量', () => {
    expect(deriveDeletedMountState(
      record({ mount_path: '' }),
      { status: 'success', bytes: 1024, measuredAt: '2026-10-18T03:04:05Z' },
    )).toEqual({ key: 'no_mount', label: '无挂载' });
    expect(deriveDeletedMountState(
      record({ mount_path: null }),
      { status: 'error', reason: 'not_found', message: '目录不存在' },
    )).toEqual({ key: 'no_mount', label: '无挂载' });
  });
});

describe('逻辑大小格式化', () => {
  it('0 字节与真实小值显示为 B，不是未知', () => {
    expect(formatLogicalBytes(0)).toBe('0 B');
    expect(formatLogicalBytes(1)).toBe('1 B');
    expect(formatLogicalBytes(1023)).toBe('1023 B');
  });

  it('按 1024 进制显示 KiB/MiB/GiB', () => {
    expect(formatLogicalBytes(1024)).toBe('1 KiB');
    expect(formatLogicalBytes(1536)).toBe('1.5 KiB');
    expect(formatLogicalBytes(1024 * 1024)).toBe('1 MiB');
    expect(formatLogicalBytes(1024 ** 3 * 2)).toBe('2 GiB');
  });

  it('null/负数/非整数返回 null，调用方不能回落成 0', () => {
    expect(formatLogicalBytes(null)).toBeNull();
    expect(formatLogicalBytes(undefined)).toBeNull();
    expect(formatLogicalBytes(-1)).toBeNull();
    expect(formatLogicalBytes(1.5)).toBeNull();
    expect(formatLogicalBytes('0')).toBeNull();
  });
});

describe('成功样本 measured_at 严格 UTC 校验', () => {
  it('接受 Z、+00:00、小数秒与合法闰日', () => {
    for (const value of [
      '2026-10-18T03:04:05Z',
      '2026-10-18T03:04:05.123Z',
      '2026-10-18T03:04:05.123456Z',
      '2026-10-18T03:04:05+00:00',
      '2026-10-18T03:04:05.5+00:00',
      '2024-02-29T23:59:59Z',
    ]) {
      expect(isValidUtcTimestamp(value), value).toBe(true);
      expect(normalizeMountUsageItem(success({ measured_at: value }))).toMatchObject({
        status: 'success',
        measuredAt: value,
      });
    }
  });

  it('拒绝无时区、非零 offset、空串、非法日历日期与非法时分秒', () => {
    for (const value of [
      '2026-10-18T03:04:05',
      '2026-10-18 03:04:05Z',
      '2026-10-18T03:04:05+08:00',
      '2026-10-18T03:04:05-05:00',
      '2026-10-18T03:04:05z',
      '2026-10-18T03:04:05.123+00:00 ',
      '',
      'not-a-time',
      '2026-02-30T00:00:00Z',
      '2026-02-29T00:00:00Z',
      '2026-13-01T00:00:00Z',
      '2026-00-01T00:00:00Z',
      '2026-01-01T24:00:00Z',
      '2026-01-01T00:60:00Z',
      '2026-01-01T00:00:60Z',
    ]) {
      expect(isValidUtcTimestamp(value), value).toBe(false);
      expect(normalizeMountUsageItem(success({ measured_at: value })), value).toBeNull();
    }
    expect(isValidUtcTimestamp(null)).toBe(false);
    expect(isValidUtcTimestamp(undefined)).toBe(false);
  });
});

describe('用量三态校验', () => {
  it('成功项接受非负整数和真实 UTC 时间（含 TTL 内的旧样本）', () => {
    expect(normalizeMountUsageItem(success({ bytes: 0 }))).toEqual({
      status: 'success',
      bytes: 0,
      measuredAt: '2026-10-18T03:04:05Z',
    });
    expect(normalizeMountUsageItem(success({ measured_at: '2026-10-01T03:04:05Z' }))).toMatchObject({
      status: 'success',
      measuredAt: '2026-10-01T03:04:05Z',
    });
  });

  it('五个字段必须实际存在，缺任一字段即畸形', () => {
    for (const field of ['deleted_id', 'bytes', 'measured_at', 'pending', 'error']) {
      expect(normalizeMountUsageItem(without(success(), field)), `success.${field}`).toBeNull();
      expect(normalizeMountUsageItem(without(pending(), field)), `pending.${field}`).toBeNull();
      expect(normalizeMountUsageItem(without(failed(), field)), `error.${field}`).toBeNull();
    }
  });

  it('五个字段存在但值不是契约要求时同样畸形', () => {
    expect(normalizeMountUsageItem({ ...success(), error: undefined })).toBeNull();
    expect(normalizeMountUsageItem({ ...success(), measured_at: undefined })).toBeNull();
    expect(normalizeMountUsageItem({ ...pending(), error: undefined })).toBeNull();
    expect(normalizeMountUsageItem({ ...pending(), measured_at: undefined })).toBeNull();
    expect(normalizeMountUsageItem({ ...failed(), error: undefined })).toBeNull();
    expect(normalizeMountUsageItem({ ...failed(), measured_at: undefined })).toBeNull();
  });

  it('pending 必须是 bytes=null、measured_at=null、error=null', () => {
    expect(normalizeMountUsageItem(pending())).toEqual({ status: 'pending' });
    expect(normalizeMountUsageItem(pending({ bytes: 0 }))).toBeNull();
    expect(normalizeMountUsageItem(pending({ measured_at: '' }))).toBeNull();
    expect(normalizeMountUsageItem(pending({ measured_at: '2026-10-18T03:04:05Z' }))).toBeNull();
    expect(normalizeMountUsageItem(pending({ error: 'node_timeout' }))).toBeNull();
  });

  it('错误项只接受契约稳定 code，且不携带 bytes/时间', () => {
    for (const code of MOUNT_USAGE_ERROR_CODES) {
      expect(isStableMountUsageError(code), code).toBe(true);
      expect(normalizeMountUsageItem(failed({ error: code }))).toEqual({
        status: 'error',
        reason: code,
      });
    }
    expect(normalizeMountUsageItem(failed({ bytes: 0 }))).toBeNull();
    expect(normalizeMountUsageItem(failed({ measured_at: '' }))).toBeNull();
    expect(normalizeMountUsageItem(failed({ measured_at: '2026-10-18T03:04:05Z' }))).toBeNull();
    expect(normalizeMountUsageItem(failed({ error: '' }))).toBeNull();
  });

  it.each([
    ['permission_denied', '统计不可用（无权限读取目录）'],
    ['timeout', '统计超时'],
    ['non_zero_exit', '统计不可用（du 退出码非零）'],
    ['empty_output', '统计不可用（du 无输出）'],
    ['parse_error', '统计不可用（du 输出无法解析）'],
    ['du_unavailable', '统计不可用（du 不可用）'],
    ['du_failed', '统计不可用（du 执行失败）'],
  ])('%s 是合法稳定错误并映射为中文不可用原因', (code, label) => {
    expect(isStableMountUsageError(code)).toBe(true);
    expect(normalizeMountUsageItem(failed({ error: code }))).toEqual({
      status: 'error',
      reason: code,
    });
    expect(describeMountUsageError(code)).toBe(label);
  });

  it('HTML、stderr 长文、未知 code 不回显且判畸形', () => {
    for (const error of [
      '<script>alert(1)</script>',
      '<div>node failed</div>',
      `du: cannot access /m/1: ${'stderr '.repeat(80)}`,
      'unknown_code',
      'node_timeout ',
    ]) {
      expect(isStableMountUsageError(error), error).toBe(false);
      expect(normalizeMountUsageItem(failed({ error })), error).toBeNull();
      expect(describeMountUsageError(error)).toBe('统计不可用');
    }
    expect(describeMountUsageError(null)).toBe('统计不可用');
  });

  it('success 缺字节/time、pending 非布尔、bytes 非整数都判畸形', () => {
    expect(normalizeMountUsageItem(success({ bytes: null }))).toBeNull();
    expect(normalizeMountUsageItem(success({ measured_at: null }))).toBeNull();
    expect(normalizeMountUsageItem(success({ pending: 'false' }))).toBeNull();
    expect(normalizeMountUsageItem(success({ bytes: '0' }))).toBeNull();
    expect(normalizeMountUsageItem(success({ bytes: -1 }))).toBeNull();
    expect(normalizeMountUsageItem(null)).toBeNull();
  });
});

describe('按 deleted_id 合并一批结果', () => {
  it('区分成功 0、pending、错误、缺项；未知 ID 被忽略', () => {
    const resolved = resolveMountUsageBatch([
      success({ deleted_id: 1, bytes: 0 }),
      pending({ deleted_id: 2 }),
      failed({ deleted_id: 3, error: 'node_unavailable' }),
      success({ deleted_id: 99 }),
    ], [1, 2, 3, 4]);

    expect(resolved[1]).toEqual({ status: 'success', bytes: 0, measuredAt: '2026-10-18T03:04:05Z' });
    expect(resolved[2]).toEqual({ status: 'pending' });
    expect(resolved[3]).toMatchObject({ status: 'error', reason: 'node_unavailable', message: '机器离线/不可用' });
    expect(resolved[4]).toEqual({ status: 'unavailable', message: '统计不可用' });
    expect(resolved[99]).toBeUndefined();
  });

  it('重复 ID 与畸形项只让对应行不可用，合法其他行不受影响', () => {
    const resolved = resolveMountUsageBatch([
      success({ deleted_id: 1, bytes: 7 }),
      success({ deleted_id: 1, bytes: 8 }),
      success({ deleted_id: 2, bytes: null }),
      pending({ deleted_id: 3 }),
      success({ deleted_id: 4, bytes: 0 }),
    ], [1, 2, 3, 4]);

    expect(resolved[1]).toEqual({ status: 'unavailable', message: '统计不可用' });
    expect(resolved[2]).toEqual({ status: 'unavailable', message: '统计不可用' });
    expect(resolved[3]).toEqual({ status: 'pending' });
    expect(resolved[4]).toEqual({ status: 'success', bytes: 0, measuredAt: '2026-10-18T03:04:05Z' });
  });

  it('缺字段/非法时间/HTML error 只降级对应行，合法 success 与 pending 不受影响', () => {
    const resolved = resolveMountUsageBatch([
      success({ deleted_id: 1, bytes: 1024 }),
      without(success({ deleted_id: 2 }), 'error'),
      without(success({ deleted_id: 3 }), 'measured_at'),
      failed({ deleted_id: 4, error: '<script>alert(1)</script>' }),
      success({ deleted_id: 5, measured_at: '2026-10-18T03:04:05' }),
      pending({ deleted_id: 6 }),
    ], [1, 2, 3, 4, 5, 6]);

    expect(resolved[1]).toEqual({ status: 'success', bytes: 1024, measuredAt: '2026-10-18T03:04:05Z' });
    for (const id of [2, 3, 4, 5]) {
      expect(resolved[id], `id ${id}`).toEqual({ status: 'unavailable', message: '统计不可用' });
    }
    expect(resolved[6]).toEqual({ status: 'pending' });
  });

  it('契约稳定错误码映射为可理解原因，未知 code 不回显', () => {
    expect(describeMountUsageError('node_unsupported')).toBe('统计不可用（旧 Node）');
    expect(describeMountUsageError('node_timeout')).toBe('统计超时');
    expect(describeMountUsageError('node_unavailable')).toBe('机器离线/不可用');
    expect(describeMountUsageError('node_bad_response')).toBe('统计响应异常');
    expect(describeMountUsageError('not_found')).toBe('统计不可用（目录不存在）');
    expect(describeMountUsageError('invalid_path')).toBe('统计不可用（路径无效）');
    expect(describeMountUsageError('unknown_code')).toBe('统计不可用');
    expect(describeMountUsageError(null)).toBe('统计不可用');
  });
});
