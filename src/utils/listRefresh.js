export const LIST_REFRESH_INTERVAL_MS = 5000;

export function canRunListRefresh() {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden';
}

// 归一化：集合顺序无语义时排序后比较，真实成员/角色/配额变化仍产生不同指纹。
const seedValue = (value) => (value === undefined ? null : value);

const normalizeAccounts = (accounts) => {
  if (!Array.isArray(accounts)) return [];
  return accounts
    .map((item) => {
      if (Array.isArray(item)) return [seedValue(item[0]), seedValue(item[1])];
      if (item && typeof item === 'object') {
        return [
          seedValue(item.user_id),
          seedValue(item.username ?? item.name),
          seedValue(item.role ?? item.type),
        ];
      }
      return [seedValue(item)];
    })
    .sort((a, b) => String(a[0] ?? a[1] ?? '').localeCompare(String(b[0] ?? b[1] ?? '')));
};

const normalizeNames = (list) => {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      if (item && typeof item === 'object') {
        return seedValue(item.username ?? item.name ?? item.user_id ?? item.id);
      }
      return seedValue(item);
    })
    .sort((a, b) => String(a ?? '').localeCompare(String(b ?? '')));
};

const normalizeIds = (list) => (
  Array.isArray(list)
    ? list.map(seedValue).sort((a, b) => String(a ?? '').localeCompare(String(b ?? '')))
    : []
);

const normalizeCountMap = (map) => {
  if (!map || typeof map !== 'object') return [];
  return Object.keys(map).sort().map(key => [key, seedValue(map[key])]);
};

const normalizeGpuUtilization = (gpu) => (
  Array.isArray(gpu)
    ? gpu
      .map(item => [seedValue(item?.index), seedValue(item?.utilization_gpu_percent)])
      .sort((a, b) => String(a[0] ?? '').localeCompare(String(b[0] ?? '')))
    : []
);

/** 容器列表指纹。消费者：Home.jsx、ManageUser.jsx、ManageMachine.jsx 的容器卡片。 */
export function containerListFingerprint(rows = [], meta = {}) {
  return JSON.stringify({
    meta,
    rows: rows.map(row => [
      row.key,
      row.container_id ?? null,
      row.container_name ?? null,
      row.image_name ?? null,
      row.port ?? null,
      row.machine_id ?? null,
      row.machine_ip ?? null,
      row.effective_status ?? null,
      row.failed_reason ?? null,
      row.failed_detail ?? null,
      normalizeAccounts(row.accounts),
      row.userRole ?? null,
      normalizeNames(row.owners),
      normalizeIds(row.long_term_container_blocked_user_ids),
      normalizeCountMap(row.long_term_container_remaining_by_user),
      row.long_term_container_can_enable !== false,
      row.runtime_metrics?.collected_at ?? null,
      row.disk_total_gb ?? null,
      row.disk_limit_gb ?? null,
      row.disk_usage_percent ?? null,
      row.last_ssh_login_time ?? null,
      row.cleanup_after_days ?? null,
      row.cleanup_at ?? null,
      row.seconds_until_cleanup ?? null,
      row.cleanup_status ?? null,
      row.is_long_term === true,
      row.freeze_first_frozen_at ?? null,
      row.freeze_grace_until ?? null,
      row.freeze_days_frozen ?? null,
      row.freeze_escalation_days ?? null,
    ]),
  });
}

/** 机器列表指纹。消费者：ManageMachine.jsx 的机器卡片。 */
export function machineListFingerprint(rows = [], meta = {}) {
  return JSON.stringify({
    meta,
    rows: rows.map(row => [
      row.key,
      row.machine_id ?? null,
      row.machine_name ?? null,
      row.machine_ip ?? null,
      row.machine_type ?? null,
      row.machine_status ?? null,
      row.is_maintenance === true,
      row.runtime_snapshot?.collected_at ?? null,
      row.runtime_snapshot?.cpu?.usage_percent ?? null,
      row.runtime_snapshot?.memory?.usage_percent ?? null,
      normalizeGpuUtilization(row.runtime_snapshot?.gpu),
    ]),
  });
}

/** 用户列表指纹。消费者：ManageUser.jsx 的用户列表。 */
export function userListFingerprint(rows = [], meta = {}) {
  return JSON.stringify({
    meta,
    rows: rows.map(row => [
      row.key,
      row.username ?? null,
      row.email ?? null,
      row.graduation_year ?? null,
      row.amount_of_container ?? null,
      row.amount_of_functional_container ?? null,
      row.amount_of_managed_container ?? null,
      row.amount_of_long_term_container ?? null,
    ]),
  });
}
