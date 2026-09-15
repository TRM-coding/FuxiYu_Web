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

export const formatSnapshotTime = value => {
  if (!value) return '暂无采集';
  const text = String(value);
  const date = new Date(text.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(text) ? text : `${text}Z`);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleString('zh-CN', { hour12: false });
};
