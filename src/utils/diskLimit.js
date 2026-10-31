/**
 * 磁盘是否已达上限（用量 ≥ 100%）。
 *
 * 用于「长期容器」勾选框：长期 = 不参与自动清理，所以超限的容器不该再被设为长期容器
 * （否则可以先超限、再勾长期来躲清理，勾完还会立刻撞上冻结升级）。判据只用后端已有的
 * 磁盘字段，不新增接口字段。
 *
 * 容器的磁盘数据有两副形状，两种都要认：
 * - 列表 / 卡片 / brief：扁平三字段 `disk_usage_percent`
 * - 详情接口：嵌套 `disk_usage.usage_percent`（`_build_detail_disk_usage`）
 *
 * 快照缺失（null / undefined / 非数）一律按「未超限」——磁盘采集本身会坏（出现过采集
 * 卡住、所有容器拿不到 bind 用量），那时不该让所有人的勾选框集体变灰。
 */

export const DISK_OVER_LIMIT_PERCENT = 100;

/** 超限时勾选框的置灰提示（五处长期勾选框共用同一句，避免各写各的） */
export const DISK_OVER_LIMIT_MESSAGE = '磁盘用量已达上限，无法设为长期容器';

export function isDiskOverLimit(record) {
  if (!record) return false;
  const raw = record.disk_usage_percent ?? record.disk_usage?.usage_percent;
  const percent = Number(raw);
  return Number.isFinite(percent) && percent >= DISK_OVER_LIMIT_PERCENT;
}
