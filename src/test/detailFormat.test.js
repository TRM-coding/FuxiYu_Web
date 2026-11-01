import { describe, expect, it } from 'vitest';

import { formatSnapshotTime, parseServerTime } from '../utils/detailFormat';

/**
 * 后端时间戳一律是**不带时区后缀的 UTC**（Node 侧 `datetime.now(timezone.utc)` 直接
 * strftime，库里也是 naive UTC）。
 *
 * `new Date("2026-09-19T06:41:21")` 在 JS 里按**本地时间**解析——于是 UTC 的数值被原样
 * 显示出来，整体差 8 小时。这正是运行指标曲线曾经的问题（2026-09 实测）。
 *
 * 断言刻意**不依赖跑测试的机器时区**：一律比 UTC 字段与绝对时刻，不比格式化后的字面量——
 * 否则在 UTC 机器上会假通过、在东八区机器上才真通过。
 */
describe('parseServerTime', () => {
  it('不带时区后缀的串按 UTC 解析（不是本地时间）', () => {
    const at = parseServerTime('2026-09-19T06:41:21');
    expect([
      at.getUTCFullYear(), at.getUTCMonth() + 1, at.getUTCDate(),
      at.getUTCHours(), at.getUTCMinutes(), at.getUTCSeconds(),
    ]).toEqual([2026, 9, 19, 6, 41, 21]);
    expect(at.getTime()).toBe(Date.UTC(2026, 8, 19, 6, 41, 21));
  });

  it('与"裸用 new Date"的差恰好是本机时区偏移（这就是那 8 小时）', () => {
    const correct = parseServerTime('2026-09-19T06:41:21');
    const naive = new Date('2026-09-19T06:41:21');   // 被当成本地时间的那一刻
    const offsetMs = new Date(correct.getTime()).getTimezoneOffset() * 60 * 1000;
    expect(naive.getTime() - correct.getTime()).toBe(offsetMs);
  });

  it('已经带时区标记的串原样尊重（不再补 Z）', () => {
    expect(parseServerTime('2026-09-19T06:41:21Z').getTime())
      .toBe(Date.UTC(2026, 8, 19, 6, 41, 21));
    expect(parseServerTime('2026-09-19T14:41:21+08:00').getTime())
      .toBe(Date.UTC(2026, 8, 19, 6, 41, 21));
  });

  it('空值与不可解析的串返回 null，由调用方决定怎么显示', () => {
    expect(parseServerTime(null)).toBeNull();
    expect(parseServerTime('')).toBeNull();
    expect(parseServerTime('not-a-time')).toBeNull();
  });
});

describe('formatSnapshotTime', () => {
  it('换算的是"按 UTC 解析后"的那一刻（与 parseServerTime 同一时刻）', () => {
    const at = parseServerTime('2026-09-19T06:41:21');
    expect(formatSnapshotTime('2026-09-19T06:41:21'))
      .toBe(at.toLocaleString('zh-CN', { hour12: false }));
  });

  it('缺失时给统一占位，不显示成 1970', () => {
    expect(formatSnapshotTime(null)).toBe('暂无采集');
  });
});
