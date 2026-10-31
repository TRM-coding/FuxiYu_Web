import { describe, it, expect } from 'vitest';
import { normalizeGraduationYear } from '../utils/graduationYear';

describe('normalizeGraduationYear', () => {
  it('拒绝空串、null 与 undefined，不返回可提交值', () => {
    for (const raw of ['', null, undefined]) {
      const result = normalizeGraduationYear(raw);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('empty');
      expect(result.message).toContain('不能为空');
      expect(result).not.toHaveProperty('value');
    }
  });

  it('拒绝非整数', () => {
    for (const raw of [2024.5, 'abc']) {
      const result = normalizeGraduationYear(raw);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('invalid');
    }
  });

  it('接受整数并归一为数值', () => {
    expect(normalizeGraduationYear(1900)).toMatchObject({ ok: true, value: 1900 });
    expect(normalizeGraduationYear('2024')).toMatchObject({ ok: true, value: 2024 });
    expect(normalizeGraduationYear(2100)).toMatchObject({ ok: true, value: 2100 });
    expect(normalizeGraduationYear(2101)).toMatchObject({ ok: true, value: 2101 });
  });
});
