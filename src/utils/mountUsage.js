// 已删除容器：pending 快速查询，其他状态低频复查，Node 缓存控制实际 du 频率。
export const MOUNT_USAGE_POLL_INTERVAL_MS = 5000;
export const MOUNT_USAGE_RECHECK_INTERVAL_MS = 60000;

const isBlankTime = value => value === null || value === undefined || value === '';

/**
 * 已清理的条件是 `mount_cleaned === true` 或 `cleaned_at` 非空，满足其一即可。
 * 此标记不阻止对历史路径进行只读采样。
 */
export const isDeletedMountCleaned = record => (
  record?.mount_cleaned === true || !isBlankTime(record?.cleaned_at)
);

/**
 * 只有当前页里同时满足以下条件的行才允许请求统计：
 * 正整数 deleted_id、非空 mount_path。
 *
 * 已清理记录也保留历史路径，仍可请求统计以判断目录是否实际存在或残留。
 * 这里不读 machine_id，也不把 mount_path 交给请求层；路径只用于展示。
 */
export const isMeasurableDeletedRecord = record => {
  if (!record) return false;
  const id = record.deleted_id;
  if (!Number.isInteger(id) || id <= 0) return false;
  if (typeof record.mount_path !== 'string' || record.mount_path === '') return false;
  return true;
};

export const deriveMeasurableDeletedIds = records => {
  if (!Array.isArray(records)) return [];
  const ids = [];
  const seen = new Set();
  for (const record of records) {
    if (!isMeasurableDeletedRecord(record)) continue;
    if (seen.has(record.deleted_id)) continue;
    seen.add(record.deleted_id);
    ids.push(record.deleted_id);
  }
  return ids;
};

const BYTE_UNITS = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];

/**
 * `du -sb` 的逻辑字节数，不是物理磁盘块。
 * 只有非负整数才会被格式化；null/畸形值返回 null，调用方不得回落到 0 B。
 */
export const formatLogicalBytes = value => {
  if (!Number.isInteger(value) || value < 0) return null;
  if (value === 0) return '0 B';
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < BYTE_UNITS.length - 1) {
    size /= 1024;
    unit += 1;
  }
  const text = unit === 0 ? String(size) : size.toFixed(1).replace(/\.0$/, '');
  return `${text} ${BYTE_UNITS[unit]}`;
};

// Ctrl/Node 契约里的稳定原因码。只接受这份 allowlist，未知 code、HTML、stderr
// 长文都不回显，统一按“统计不可用”降级。
const MOUNT_USAGE_ERROR_LABELS = {
  node_unsupported: '统计不可用（旧 Node）',
  node_timeout: '统计超时',
  node_unavailable: '机器离线/不可用',
  node_bad_response: '统计响应异常',
  not_found: '统计不可用（目录不存在）',
  invalid_path: '统计不可用（路径无效）',
  permission_denied: '统计不可用（无权限读取目录）',
  timeout: '统计超时',
  non_zero_exit: '统计不可用（du 退出码非零）',
  empty_output: '统计不可用（du 无输出）',
  parse_error: '统计不可用（du 输出无法解析）',
  du_unavailable: '统计不可用（du 不可用）',
  du_failed: '统计不可用（du 执行失败）',
};

export const MOUNT_USAGE_ERROR_CODES = Object.freeze(Object.keys(MOUNT_USAGE_ERROR_LABELS));
const MOUNT_USAGE_ERROR_CODE_SET = new Set(MOUNT_USAGE_ERROR_CODES);

export const isStableMountUsageError = error => (
  typeof error === 'string' && MOUNT_USAGE_ERROR_CODE_SET.has(error)
);

export const describeMountUsageError = error => (
  isStableMountUsageError(error) ? MOUNT_USAGE_ERROR_LABELS[error] : '统计不可用'
);

/**
 * 仅凭列表事实与当前页已有的路径用量结果派生挂载实际状态。
 * 只有“已清理 + 成功样本”和两个明确错误码会覆盖列表事实；
 * pending、加载中、缺项、Node 不可用等其他失败一律回退，避免误称目录不存在或残留。
 */
export const deriveDeletedMountState = (record, usage) => {
  if (!record?.mount_path) return { key: 'no_mount', label: '无挂载' };
  const cleaned = isDeletedMountCleaned(record);
  if (usage?.status === 'success' && cleaned) {
    return { key: 'residual', label: '可能存在残留' };
  }
  if (usage?.status === 'error' && usage.reason === 'not_found') {
    return { key: 'not_found', label: '目录不存在' };
  }
  if (usage?.status === 'error' && usage.reason === 'permission_denied') {
    return { key: 'permission_denied', label: '无权限' };
  }
  if (cleaned) return { key: 'cleaned', label: '已清理' };
  if (record.cleanup_escalation) return { key: 'escalation', label: '升级清理' };
  return { key: 'retained', label: 'mount 保留' };
};

const UTC_TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|\+00:00)$/;

const isLeapYear = year => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const daysInUtcMonth = (year, month) => {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
};

/**
 * 成功样本的 measured_at 只接受 UTC ISO：
 * `YYYY-MM-DDTHH:mm:ss[.fraction]Z` 或 `... +00:00`。
 * 无时区、非零 offset、非法日历日期（如 2026-02-30）一律拒绝，不交给 JS Date 自动进位。
 */
export const isValidUtcTimestamp = value => {
  if (typeof value !== 'string') return false;
  const match = UTC_TIMESTAMP_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > daysInUtcMonth(year, month)) return false;
  if (hour > 23 || minute > 59 || second > 59) return false;

  const millis = match[7] ? Number(match[7].slice(0, 3).padEnd(3, '0')) : 0;
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, millis);
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    && date.getUTCHours() === hour
    && date.getUTCMinutes() === minute
    && date.getUTCSeconds() === second;
};

const MOUNT_USAGE_ITEM_FIELDS = ['deleted_id', 'bytes', 'measured_at', 'pending', 'error'];
const hasAllMountUsageFields = item => MOUNT_USAGE_ITEM_FIELDS.every(
  field => Object.prototype.hasOwnProperty.call(item, field),
);

/**
 * 严格校验单条三态记录。五个字段必须实际存在：
 * - success: pending=false, error=null, bytes 非负整数, measured_at 为合法 UTC ISO
 * - pending: bytes=null, measured_at=null, pending=true, error=null
 * - error:   bytes=null, measured_at=null, pending=false, error 为契约内稳定 code
 *
 * 畸形项返回 null（由调用方标为不可用），绝不补 0，也不回显任意 error 文本。
 */
export const normalizeMountUsageItem = item => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  if (!hasAllMountUsageFields(item)) return null;
  if (!Number.isInteger(item.deleted_id) || item.deleted_id <= 0) return null;
  if (typeof item.pending !== 'boolean') return null;

  if (item.pending) {
    if (item.bytes !== null || item.measured_at !== null || item.error !== null) return null;
    return { status: 'pending' };
  }

  if (item.error !== null) {
    if (!isStableMountUsageError(item.error)) return null;
    if (item.bytes !== null || item.measured_at !== null) return null;
    return { status: 'error', reason: item.error };
  }

  if (!Number.isInteger(item.bytes) || item.bytes < 0) return null;
  if (!isValidUtcTimestamp(item.measured_at)) return null;
  return { status: 'success', bytes: item.bytes, measuredAt: item.measured_at };
};

const unavailable = () => ({ status: 'unavailable', message: '统计不可用' });

/**
 * 把一批原始项映射到本次请求的 ID。
 * 缺项、重复 ID、未知/畸形字段都只影响对应行，不会被解释成 0 或“无挂载”。
 */
export const resolveMountUsageBatch = (usages, requestedIds) => {
  const requested = [];
  const seenRequested = new Set();
  for (const id of Array.isArray(requestedIds) ? requestedIds : []) {
    if (!Number.isInteger(id) || id <= 0 || seenRequested.has(id)) continue;
    seenRequested.add(id);
    requested.push(id);
  }

  const byId = new Map();
  const duplicated = new Set();
  for (const item of Array.isArray(usages) ? usages : []) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const id = item.deleted_id;
    if (!Number.isInteger(id) || id <= 0) continue;
    if (byId.has(id)) duplicated.add(id);
    else byId.set(id, item);
  }

  const result = {};
  for (const id of requested) {
    if (duplicated.has(id)) {
      result[id] = unavailable();
      continue;
    }
    const normalized = normalizeMountUsageItem(byId.get(id));
    if (!normalized) {
      result[id] = unavailable();
      continue;
    }
    result[id] = normalized.status === 'error'
      ? { ...normalized, message: describeMountUsageError(normalized.reason) }
      : normalized;
  }
  return result;
};
