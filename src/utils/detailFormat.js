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
