export const LIST_REFRESH_INTERVAL_MS = 5000;

export function canRunListRefresh() {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden';
}

export function containerListFingerprint(rows = [], meta = {}) {
  return JSON.stringify({
    meta,
    rows: rows.map(row => [
      row.key,
      row.container_id ?? null,
      row.effective_status ?? null,
      row.failed_reason ?? null,
      row.failed_detail ?? null,
      row.runtime_metrics?.collected_at ?? null,
      row.disk_usage_percent ?? null,
      row.last_ssh_login_time ?? null,
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

export function machineListFingerprint(rows = [], meta = {}) {
  return JSON.stringify({
    meta,
    rows: rows.map(row => [
      row.key,
      row.machine_id ?? null,
      row.machine_status ?? null,
      row.is_maintenance === true,
      row.runtime_snapshot?.collected_at ?? null,
    ]),
  });
}

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
