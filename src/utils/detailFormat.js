// 推不出运行镜像标签时的统一占位（如本次改造前就存在的裸镜像容器）。
// 后端对"推不出来"返回 null，**不编造**——标签是 Node 侧的缓存键，编一个就指着一个
// 没跑过的制品。所以"不知道"这件事由展示层说，且全站说同一句话。
export const UNKNOWN_IMAGE = '未知';

export const formatContainerImage = value => value || UNKNOWN_IMAGE;

export const formatNumber = (value, suffix = '') => {
  if (value === null || value === undefined || value === '') return '-';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return `${n.toFixed(n % 1 === 0 ? 0 : 1)}${suffix}`;
};

/**
 * 解析后端时间戳。
 *
 * 平台后端一律发**不带时区后缀的 UTC**（`2026-09-19T06:41:21`）。JS 的 `new Date()`
 * 会把这种串按**本地时间**解析——于是 UTC 的数值被当成本地时间原样显示，整体差 8 小时。
 * 没有时区标记时补上 `Z`，让它回到 UTC 再交给 `toLocale*` 换算。
 *
 * 所有消费后端时间的地方都该走这里，不要在各自文件里裸用 `new Date(value)`。
 */
export const parseServerTime = value => {
  if (!value) return null;
  const text = String(value);
  const date = new Date(text.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(text) ? text : `${text}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatSnapshotTime = value => {
  if (!value) return '暂无采集';
  const date = parseServerTime(value);
  return date ? date.toLocaleString('zh-CN', { hour12: false }) : String(value);
};
