import { describe, it, expect } from 'vitest';
import { parseSshTimeToDate, formatDuration } from '../utils/timeFormat';

describe('parseSshTimeToDate', () => {
  it('解析 ISO 时间字符串', () => {
    const d = parseSshTimeToDate('2026-08-16T08:00:00');
    expect(d).not.toBeNull();
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7); // 8 月 = 索引 7
  });

  it('解析 syslog 风格前缀', () => {
    const d = parseSshTimeToDate('Mar 20 10:35:20 ubuntu sshd[123]: Accepted');
    expect(d).not.toBeNull();
    expect(d.getMonth()).toBe(2); // Mar
    expect(d.getDate()).toBe(20);
  });

  it('解析 last 输出片段（无年份取当前年）', () => {
    const d = parseSshTimeToDate('user pts/0 Fri Mar 20 12:39 still logged in');
    expect(d).not.toBeNull();
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(20);
    expect(d.getHours()).toBe(12);
    expect(d.getMinutes()).toBe(39);
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
