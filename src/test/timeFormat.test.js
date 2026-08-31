import { describe, it, expect } from 'vitest';
import { parseSshTimeToDate, formatDuration, formatLastSshTime, formatCleanupCountdown } from '../utils/timeFormat';

describe('parseSshTimeToDate', () => {
  it('解析 ISO 时间字符串', () => {
    const d = parseSshTimeToDate('2026-08-16T08:00:00');
    expect(d).not.toBeNull();
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7); // 8 月 = 索引 7
  });

  it('ISO 形串按 naive UTC 解析（后端口径，不是浏览器本地）', () => {
    const d = parseSshTimeToDate('2026-08-16T16:03:33');
    expect(d).not.toBeNull();
    expect(d.toISOString()).toBe('2026-08-16T16:03:33.000Z');
  });

  it('解析 syslog 风格前缀（固定按北京时间墙钟构造）', () => {
    const d = parseSshTimeToDate('Mar 20 10:35:20 ubuntu sshd[123]: Accepted');
    expect(d).not.toBeNull();
    // 北京时间 10:35:20 = UTC 02:35:20（与运行环境时区无关）
    const y = new Date(Date.now() + 8 * 3600 * 1000).getUTCFullYear();
    expect(d.toISOString()).toBe(`${y}-03-20T02:35:20.000Z`);
  });

  it('解析 last 输出片段（无年份取当前年，且按 UTC 组装——节点 TZ=UTC 强制输出）', () => {
    const d = parseSshTimeToDate('user pts/0 Fri Mar 20 12:39 still logged in');
    expect(d).not.toBeNull();
    expect(d.getUTCMonth()).toBe(2);
    expect(d.getUTCDate()).toBe(20);
    expect(d.getUTCHours()).toBe(12);
    expect(d.getUTCMinutes()).toBe(39);
    expect(d.getUTCSeconds()).toBe(0);
  });

  it('垃圾输入返回 null', () => {
    expect(parseSshTimeToDate('not a time')).toBeNull();
    expect(parseSshTimeToDate('')).toBeNull();
    expect(parseSshTimeToDate(null)).toBeNull();
  });
});

describe('formatDuration', () => {
  it('不足一小时显示分钟（向上取整，最少 1 分钟）', () => {
    expect(formatDuration(0)).toBe('1分钟');
    expect(formatDuration(59)).toBe('1分钟');
    expect(formatDuration(3599)).toBe('60分钟');
  });

  it('小时与天数的组合', () => {
    expect(formatDuration(3600)).toBe('1小时');
    expect(formatDuration(86400)).toBe('1天');
    expect(formatDuration(90000)).toBe('1天1小时');
    expect(formatDuration(172800)).toBe('2天');
  });

  it('非法输入返回 null', () => {
    expect(formatDuration(-1)).toBeNull();
    expect(formatDuration(NaN)).toBeNull();
  });
});

describe('formatLastSshTime', () => {
  it('空值显示「从未登录」', () => {
    expect(formatLastSshTime(null)).toBe('从未登录');
    expect(formatLastSshTime('')).toBe('从未登录');
  });

  it('合法 ISO 时间转为北京时间串', () => {
    const text = formatLastSshTime('2026-08-16T08:00:00');
    expect(text).toMatch(/\d{4}\/\d{1,2}\/\d{1,2}/);
    expect(text).toContain('16:00');
  });
});

describe('formatCleanupCountdown', () => {
  it('长期容器显示「长期容器」', () => {
    expect(formatCleanupCountdown('2026-08-16T08:00:00', { is_long_term: true })).toBe('长期容器');
  });

  it('无记录且无秒数显示「从未登录」', () => {
    expect(formatCleanupCountdown(null, { cleanup_status: 'unknown', seconds_until_cleanup: null })).toBe('从未登录');
  });

  it('优先后端秒数', () => {
    expect(formatCleanupCountdown('2026-08-16T08:00:00', { cleanup_status: 'countdown', seconds_until_cleanup: 90000 })).toBe('1天1小时');
    expect(formatCleanupCountdown('2026-08-16T08:00:00', { cleanup_status: 'due', seconds_until_cleanup: 0 })).toBe('可清理');
  });

  it('冻结的长期容器显示升级倒计时', () => {
    expect(formatCleanupCountdown('2026-08-16T08:00:00', {
      is_long_term: true,
      freeze_days_frozen: 3,
      freeze_escalation_days: 7,
    })).toBe('冻结第3天 (4天后清除)');
  });
});
