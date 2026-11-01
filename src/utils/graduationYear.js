/**
 * 毕业年份接受整数；空值不允许提交。
 * 返回结构供各编辑入口统一阻断，不把空串/NaN/null 静默传给接口。
 */
export function normalizeGraduationYear(raw) {
  if (raw === undefined || raw === null || (typeof raw === 'string' && !raw.trim())) {
    return { ok: false, reason: 'empty', message: '毕业年份不能为空' };
  }
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    return {
      ok: false,
      reason: 'invalid',
      message: '毕业年份必须是整数',
    };
  }
  return { ok: true, value };
}
