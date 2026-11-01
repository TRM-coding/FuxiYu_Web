import { describe, it, expect } from 'vitest';
import { isDiskOverLimit } from '../utils/diskLimit';

describe('isDiskOverLimit', () => {
  it('用量达到或超过 100% 判为超限', () => {
    expect(isDiskOverLimit({ disk_usage_percent: 100 })).toBe(true);
    expect(isDiskOverLimit({ disk_usage_percent: 137.5 })).toBe(true);
  });

  it('未到 100% 不算超限', () => {
    expect(isDiskOverLimit({ disk_usage_percent: 99.9 })).toBe(false);
    expect(isDiskOverLimit({ disk_usage_percent: 0 })).toBe(false);
  });

  it('详情接口的嵌套形状同样认（disk_usage.usage_percent）', () => {
    expect(isDiskOverLimit({ disk_usage: { usage_percent: 100 } })).toBe(true);
    expect(isDiskOverLimit({ disk_usage: { usage_percent: 12.3 } })).toBe(false);
  });

  it('快照缺失一律按未超限（不灰勾选框）', () => {
    expect(isDiskOverLimit({ disk_usage_percent: null })).toBe(false);
    expect(isDiskOverLimit({ disk_usage_percent: undefined })).toBe(false);
    expect(isDiskOverLimit({ disk_usage: null })).toBe(false);
    expect(isDiskOverLimit({})).toBe(false);
    expect(isDiskOverLimit(null)).toBe(false);
  });
});
