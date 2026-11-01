/** RBAC 矩阵页面纯函数：覆盖判定与组名校验，口径对齐 Ctrl `services/rbac_service.py`。
 *
 * 边界：`bypass_auth_entity` 覆盖除 `bypass_resource` 外的权限点（含 `*:manage`）；
 * `{domain}:manage` 只派生同域非 manage 点；资源通配不进入方法层。
 */

export const BYPASS_AUTH_ENTITY = 'bypass_auth_entity';
export const BYPASS_RESOURCE = 'bypass_resource';

/** 与 Ctrl `_GROUP_NAME_RE` 一致：英文字母开头，总长 2-64，仅 [A-Za-z0-9_-]。 */
export const RBAC_GROUP_NAME_RE = /^[a-zA-Z][a-zA-Z0-9_-]{1,63}$/;

/** 派生覆盖原因：方法实体通配 / 同域 manage 派生。 */
export const COVERAGE_BYPASS_AUTH = 'bypass_auth';
export const COVERAGE_MANAGE = 'manage';

export const COVERAGE_LABELS = {
  [COVERAGE_BYPASS_AUTH]: '实体通配',
  [COVERAGE_MANAGE]: '管理覆盖',
};

export const COVERAGE_TITLES = {
  [COVERAGE_BYPASS_AUTH]: '已由方法实体通配覆盖',
  [COVERAGE_MANAGE]: '已由同域管理权限覆盖',
};

export const isBypassCode = code => code === BYPASS_AUTH_ENTITY || code === BYPASS_RESOURCE;

export const entityDomain = (code) => {
  const normalized = String(code || '');
  if (normalized.startsWith('bypass_')) return 'bypass';
  return normalized.split(':', 1)[0] || 'other';
};

export const entityAction = (code) => {
  const normalized = String(code || '');
  if (normalized.startsWith('bypass_')) return normalized;
  return normalized.includes(':') ? normalized.split(':')[1] : normalized;
};

/** 同域 manage 派生码；bypass、无冒号、manage 自身及不存在的 manage 码都不派生。 */
export const manageEntityFor = (code, validCodeSet) => {
  const normalized = String(code || '').trim();
  if (!normalized || normalized.startsWith('bypass_') || !normalized.includes(':')) return null;
  const separator = normalized.indexOf(':');
  const action = normalized.slice(separator + 1);
  if (action === 'manage') return null;
  const manageCode = `${normalized.slice(0, separator)}:manage`;
  if (validCodeSet && !validCodeSet.has(manageCode)) return null;
  return manageCode;
};

/** 返回派生覆盖原因（`bypass_auth` / `manage`）；直接赋予与未赋予都返回 `null`（直接优先）。 */
export const entityCoverage = (entity, currentCodeSet, validCodeSet) => {
  const code = String(entity?.code || '');
  if (!code) return null;
  const codes = currentCodeSet || new Set();
  if (codes.has(code) || isBypassCode(code)) return null;
  if (codes.has(BYPASS_AUTH_ENTITY)) return COVERAGE_BYPASS_AUTH;
  const manageCode = manageEntityFor(code, validCodeSet);
  if (manageCode && codes.has(manageCode)) return COVERAGE_MANAGE;
  return null;
};

/** 组名前端校验；返回 `{ ok, message }`，消息与 Ctrl `invalid_group_name` 的原因对齐。 */
export const validateGroupName = (name) => {
  const value = String(name ?? '').trim();
  if (!value) return { ok: false, message: '请填写角色名称' };
  if (value.length < 2) return { ok: false, message: '角色名称至少 2 个字符' };
  if (value.length > 64) return { ok: false, message: '角色名称不能超过 64 个字符' };
  if (!/^[a-zA-Z]/.test(value)) return { ok: false, message: '角色名称必须以英文字母开头' };
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    return { ok: false, message: '角色名称只能包含英文字母、数字、下划线或连字符' };
  }
  return { ok: true, message: null };
};
