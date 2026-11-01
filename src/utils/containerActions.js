import { DISK_OVER_LIMIT_MESSAGE, isDiskOverLimit } from './diskLimit';

/** 容器动作资格纯函数：Web 唯一动作展示策略。
 *
 * 边界：
 * - 不读时钟、不访问 document/网络/存储，无副作用；
 * - 删除状态集合以 Ctrl `operation_guard.py` 的 remove 守卫为来源；
 * - 长期资格只消费既有响应字段（is_long_term / 配额 / 磁盘 / effective_status），
 *   不引入资格 DTO、preflight API 或 freeze_state 门禁；
 * - confirm、toast、API、轮询与 pending 超时判断留在页面。
 */

export const CONTAINER_ACTION_KEYS = [
  'start',
  'stop',
  'restart',
  'unpause',
  'delete',
  'long_term_enable',
  'long_term_disable',
];

export const CONTAINER_ING_STATES = new Set([
  'building', 'creating', 'starting', 'stopping', 'restarting', 'pausing', 'unpausing',
]);

export const CONTAINER_TERMINAL_STATES = new Set([
  'online', 'offline', 'paused', 'failed', 'unknown',
]);

const DEFAULT_TRANSITION_TIMEOUT_MS = 60000;
const LONG_CREATE_TRANSITION_TIMEOUT_MS = 1800000;

const DEFAULT_TARGET_STATUS = {
  building: 'creating',
  creating: 'online',
  starting: 'online',
  stopping: 'offline',
  restarting: 'online',
  pausing: 'paused',
  unpausing: 'online',
};

const DEFAULT_TIMEOUT_STATUS = {
  building: LONG_CREATE_TRANSITION_TIMEOUT_MS,
  creating: LONG_CREATE_TRANSITION_TIMEOUT_MS,
};

const FOLLOW_UP_TRANSITION = {
  building: {
    on: 'creating',
    target: 'online',
  },
};

const CONTAINER_ROLES = ['ROOT', 'ADMIN', 'COLLABORATOR'];
const ROLE_RANK = {
  ROOT: 3,
  ADMIN: 2,
  COLLABORATOR: 1,
};
const ROLE_NONE = 0;

const DELETE_ALLOWED_STATUSES = new Set(['online', 'offline', 'paused', 'failed']);
const TRANSITION_UNCONFIRMED_STATUSES = new Set(['pausing', 'unpausing']);
const BUSY_STATUSES = new Set(['building', 'creating', 'starting', 'stopping', 'restarting']);
const KNOWN_STATUSES = new Set([
  'online', 'offline', 'paused', 'failed',
  'building', 'creating', 'starting', 'stopping', 'restarting',
  'pausing', 'unpausing',
  'host_offline', 'host_maintenance', 'status_unknown',
]);

const REASON_TEXT = {
  read_only: '只读视图不可执行容器操作',
  read_only_unknown: '无法确认可写上下文，已保守禁用',
  container_permission_denied: '当前账号没有执行该操作的权限',
  long_term_state_unknown: '长期标记未知，无法切换长期状态',
  container_transition_unconfirmed: '容器状态正在变化，已暂时禁用',
  container_status_unknown: '容器状态未知，已保守禁用',
  container_no_longer_available: '容器已不在当前列表，请刷新后重试',
  container_busy: '容器正在处理中，暂不可操作',
  container_host_offline: '宿主机离线，暂不可操作',
  container_host_maintenance: '宿主机维护中，暂不可操作',
  container_paused: '容器已冻结',
  container_failed: '容器异常',
  container_not_offline: '仅已停止的容器可启动',
  container_not_online: '仅运行中的容器可停止或重启',
  container_not_paused: '仅已冻结的容器可解冻',
  long_term_limit_reached: '绑定用户已达到长期容器上限',
  disk_usage_over_limit: DISK_OVER_LIMIT_MESSAGE,
};

const isRecordObject = (value) => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
);

const normalizeStatus = (status) => String(status ?? '').toLowerCase().trim();

const readLoading = (loading, key) => isRecordObject(loading) && loading[key] === true;

/** 获取稳定的中文原因；未知服务端原因原样返回，不吞成泛化错误。 */
export function getContainerActionReasonText(reason) {
  if (reason === null || reason === undefined || reason === '') return '';
  return REASON_TEXT[reason] || String(reason);
}

/** 权限/角色/只读上下文归一化，缺失/非法一律失败关闭。 */
export function normalizeContainerActionContext(raw) {
  const context = isRecordObject(raw) ? raw : {};
  const permissions = Array.isArray(context.permissions)
    ? context.permissions.filter(permission => typeof permission === 'string')
    : [];
  const hasOperation = permissions.includes('container:operation')
    || permissions.includes('container:manage')
    || permissions.includes('bypass_auth_entity');
  const hasManage = permissions.includes('container:manage')
    || permissions.includes('bypass_auth_entity');
  const resourceWildcard = permissions.includes('container:manage')
    || permissions.includes('bypass_resource');
  const containerRole = CONTAINER_ROLES.includes(context.containerRole)
    ? context.containerRole
    : null;
  const roleKnown = containerRole !== null;
  const readOnlyKnown = typeof context.readOnly === 'boolean';
  const readOnly = readOnlyKnown ? context.readOnly : null;
  return {
    valid: isRecordObject(raw),
    permissions,
    hasOperation,
    hasManage,
    resourceWildcard,
    containerRole,
    roleKnown,
    roleRank: roleKnown ? ROLE_RANK[containerRole] : ROLE_NONE,
    readOnly,
    readOnlyKnown,
  };
}

/** 只从真实账号快照中提取当前用户容器角色，不扩展角色层级。 */
/** 账号重置三层资格：方法层、ROOT/资源通配、机器在线。
 * 只做展示防呆；Ctrl 仍是最终裁决。 */
export function canResetContainerCredentials({
  accounts,
  userId = null,
  userName = '',
  containerResourceUnrestricted = false,
  hasOperationPermission = false,
  containerStatus = '',
} = {}) {
  const role = getContainerRoleFromAccounts(accounts, userId, userName);
  const methodAllowed = hasOperationPermission === true;
  const resourceAllowed = role === 'ROOT' || containerResourceUnrestricted === true;
  const online = normalizeStatus(containerStatus) === 'online';
  const visible = methodAllowed && resourceAllowed;
  let reason = null;
  if (!methodAllowed) reason = 'container_permission_denied';
  else if (!resourceAllowed) reason = 'container_permission_denied';
  else if (!online) reason = 'container_not_online';
  return { visible, enabled: visible && online, reason };
}

export function getContainerRoleFromAccounts(accounts, userId = null, userName = '') {
  if (!accounts) return null;
  const matchId = userId !== null && userId !== undefined && String(userId) !== '';
  const matchName = String(userName ?? '') !== '';
  const isCurrent = (accountId, accountName) => {
    if (matchId && accountId !== null && accountId !== undefined && String(accountId) !== ''
      && String(accountId) === String(userId)) return true;
    return matchName && String(accountName ?? '') === String(userName);
  };
  const readRole = (role) => (CONTAINER_ROLES.includes(role) ? role : null);
  const readFromObject = (account) => {
    const accountId = account.user_id ?? account.userId ?? account.id;
    const accountName = account.username ?? account.name;
    return isCurrent(accountId, accountName) ? readRole(account.role ?? account.type) : null;
  };

  if (Array.isArray(accounts)) {
    for (const account of accounts) {
      if (Array.isArray(account)) {
        if (isCurrent(null, account[0])) return readRole(account[1]);
      } else if (isRecordObject(account)) {
        const role = readFromObject(account);
        if (role) return role;
      }
    }
    return null;
  }
  return isRecordObject(accounts) ? readFromObject(accounts) : null;
}

const actionState = (visible, enabled, reason, loading, pending) => ({
  visible,
  enabled,
  disabled: !enabled,
  reason,
  loading,
  pending,
});

const hiddenDeniedAction = (reason, loading, pending) => (
  actionState(false, false, reason, loading, pending)
);

const visibleDisabledAction = (reason, loading, pending) => (
  actionState(true, false, reason, loading, pending)
);

const visibleEnabledAction = (pending = false) => (
  actionState(true, true, null, false, pending)
);

const statusFailureReason = (status, actionKey) => {
  if (status === 'host_offline') return 'container_host_offline';
  if (status === 'host_maintenance') return 'container_host_maintenance';
  if (status === 'status_unknown' || status === 'unknown' || status === '') {
    return 'container_status_unknown';
  }
  if (TRANSITION_UNCONFIRMED_STATUSES.has(status)) return 'container_transition_unconfirmed';
  if (BUSY_STATUSES.has(status)) return 'container_busy';
  if (status === 'failed') return 'container_failed';
  if (actionKey === 'start' && status === 'online') return 'container_not_offline';
  if ((actionKey === 'stop' || actionKey === 'restart') && status === 'offline') {
    return 'container_not_online';
  }
  if (actionKey === 'unpause' && status !== 'paused') return 'container_not_paused';
  if (status === 'paused') return 'container_paused';
  return 'container_status_unknown';
};

const deleteFailureReason = (status) => {
  if (status === 'host_offline') return 'container_host_offline';
  if (status === 'host_maintenance') return 'container_host_maintenance';
  if (status === 'status_unknown' || status === 'unknown' || status === '') {
    return 'container_status_unknown';
  }
  if (TRANSITION_UNCONFIRMED_STATUSES.has(status)) return 'container_transition_unconfirmed';
  if (BUSY_STATUSES.has(status)) return 'container_busy';
  return 'container_status_unknown';
};

const longTermStatusReason = (status, direction) => {
  if (status === 'host_offline') return 'container_host_offline';
  if (status === 'host_maintenance') return 'container_host_maintenance';
  if (status === 'status_unknown' || status === 'unknown' || status === '') {
    return 'container_status_unknown';
  }
  if (TRANSITION_UNCONFIRMED_STATUSES.has(status)) return 'container_transition_unconfirmed';
  if (BUSY_STATUSES.has(status)) return 'container_busy';
  if (status === 'failed') return 'container_failed';
  if (status === 'paused') return direction === 'disable' ? 'container_paused' : null;
  if (status === 'online' || status === 'offline') return null;
  return 'container_status_unknown';
};

const resolveLongTermPermission = (context) => (
  context.hasOperation && (context.resourceWildcard || context.roleRank >= ROLE_RANK.ROOT)
);

/** 统一动作资格解析。输入输出契约见 design.md。 */
export function resolveContainerActions(input = {}) {
  const container = isRecordObject(input.container) ? input.container : {};
  const status = normalizeStatus(container.effective_status);
  const statusKnown = KNOWN_STATUSES.has(status) && status !== 'status_unknown';
  const pendingStatus = TRANSITION_UNCONFIRMED_STATUSES.has(status);
  const pendingTransition = isRecordObject(input.pendingTransition)
    && typeof input.pendingTransition.transition === 'string'
    && input.pendingTransition.transition.trim() !== ''
    ? input.pendingTransition
    : null;
  const pending = Boolean(pendingTransition) || pendingStatus;
  const loading = isRecordObject(input.loading) ? input.loading : {};
  const context = normalizeContainerActionContext(input.context);

  const readOnlyDeniedReason = !context.valid || !context.readOnlyKnown
    ? 'read_only_unknown'
    : context.readOnly === true ? 'read_only' : null;
  const readOnlyDenied = Boolean(readOnlyDeniedReason);
  const commandPermission = context.hasOperation
    && (context.resourceWildcard || context.roleRank >= ROLE_RANK.ADMIN);
  const longTermPermission = resolveLongTermPermission(context);

  const actions = {};
  for (const key of CONTAINER_ACTION_KEYS) {
    actions[key] = hiddenDeniedAction(null, readLoading(loading, key), pending);
  }

  // start / stop / restart / delete：container:operation + ADMIN 级资源角色或通配。
  for (const key of ['start', 'stop', 'restart', 'delete']) {
    const actionLoading = readLoading(loading, key);
    if (readOnlyDenied) {
      actions[key] = hiddenDeniedAction(readOnlyDeniedReason, actionLoading, pending);
      continue;
    }
    if (!commandPermission) {
      actions[key] = hiddenDeniedAction('container_permission_denied', actionLoading, pending);
      continue;
    }
    if (actionLoading) {
      actions[key] = visibleDisabledAction(null, true, pending);
      continue;
    }
    if (pending) {
      actions[key] = visibleDisabledAction('container_transition_unconfirmed', false, true);
      continue;
    }
    let allowed = false;
    if (key === 'start') allowed = status === 'offline';
    else if (key === 'stop' || key === 'restart') allowed = status === 'online';
    else if (key === 'delete') allowed = DELETE_ALLOWED_STATUSES.has(status);
    if (allowed) {
      actions[key] = visibleEnabledAction();
    } else if (!statusKnown) {
      actions[key] = visibleDisabledAction('container_status_unknown', false, false);
    } else {
      actions[key] = visibleDisabledAction(
        key === 'delete' ? deleteFailureReason(status) : statusFailureReason(status, key),
        false,
        false,
      );
    }
  }

  // unpause：只要求 container:manage，不要求容器资源角色。
  {
    const actionLoading = readLoading(loading, 'unpause');
    if (readOnlyDenied) {
      actions.unpause = hiddenDeniedAction(readOnlyDeniedReason, actionLoading, pending);
    } else if (!context.hasManage) {
      actions.unpause = hiddenDeniedAction('container_permission_denied', actionLoading, pending);
    } else if (actionLoading) {
      actions.unpause = visibleDisabledAction(null, true, pending);
    } else if (pending) {
      actions.unpause = visibleDisabledAction('container_transition_unconfirmed', false, true);
    } else if (status === 'paused') {
      actions.unpause = visibleEnabledAction();
    } else {
      actions.unpause = visibleDisabledAction(
        statusFailureReason(status, 'unpause'),
        false,
        false,
      );
    }
  }

  // 长期动作：严格 is_long_term 选向；方向非法只影响长期，不连带删除/启停/解冻。
  const isLongTermKnown = typeof container.is_long_term === 'boolean';
  const isLongTerm = isLongTermKnown ? container.is_long_term : null;
  const direction = isLongTerm === true ? 'disable' : isLongTerm === false ? 'enable' : null;
  const targetActionKey = direction === 'disable'
    ? 'long_term_disable'
    : direction === 'enable' ? 'long_term_enable' : null;

  for (const key of ['long_term_enable', 'long_term_disable']) {
    const actionLoading = readLoading(loading, key);
    if (readOnlyDenied) {
      actions[key] = hiddenDeniedAction(readOnlyDeniedReason, actionLoading, pending);
      continue;
    }
    if (!longTermPermission) {
      const visible = isLongTermKnown && key === targetActionKey;
      actions[key] = visible
        ? visibleDisabledAction('container_permission_denied', actionLoading, pending)
        : hiddenDeniedAction('container_permission_denied', actionLoading, pending);
      continue;
    }
    if (!isLongTermKnown) {
      actions[key] = hiddenDeniedAction('long_term_state_unknown', actionLoading, pending);
      continue;
    }
    if (key !== targetActionKey) {
      actions[key] = hiddenDeniedAction('long_term_state_unknown', actionLoading, pending);
      continue;
    }
    if (actionLoading) {
      actions[key] = visibleDisabledAction(null, true, pending);
      continue;
    }
    if (pending) {
      actions[key] = visibleDisabledAction('container_transition_unconfirmed', false, true);
      continue;
    }
    const baseReason = longTermStatusReason(status, direction);
    if (baseReason) {
      actions[key] = visibleDisabledAction(baseReason, false, false);
      continue;
    }
    if (direction === 'enable') {
      if (container.long_term_container_can_enable === false) {
        actions[key] = visibleDisabledAction('long_term_limit_reached', false, false);
        continue;
      }
      if (isDiskOverLimit(container)) {
        actions[key] = visibleDisabledAction('disk_usage_over_limit', false, false);
        continue;
      }
    }
    actions[key] = visibleEnabledAction();
  }

  const longTermAction = targetActionKey ? actions[targetActionKey] : null;
  const longTermReason = readOnlyDeniedReason
    || (!longTermPermission
      ? 'container_permission_denied'
      : !isLongTermKnown
        ? 'long_term_state_unknown'
        : longTermAction?.reason ?? null);
  const longTermResult = {
    stateKnown: isLongTermKnown,
    direction,
    actionKey: targetActionKey,
    checked: isLongTerm,
    visible: !readOnlyDenied,
    enabled: Boolean(longTermAction?.enabled),
    disabled: !longTermAction?.enabled,
    reason: longTermReason,
    loading: Boolean(longTermAction?.loading),
    pending,
  };

  return {
    status,
    statusKnown,
    pending,
    actions,
    longTerm: longTermResult,
  };
}

export function normalizeContainerStatus(status) {
  return normalizeStatus(status);
}

export function createContainerStatusTransition(fromStatus, transitionStatus, options = {}) {
  const transition = normalizeContainerStatus(transitionStatus);
  return {
    from: normalizeContainerStatus(fromStatus),
    transition,
    target: normalizeContainerStatus(options.targetStatus || DEFAULT_TARGET_STATUS[transition] || ''),
    startedAt: options.startedAt ?? null,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_STATUS[transition] ?? DEFAULT_TRANSITION_TIMEOUT_MS,
    reachedTransition: false,
  };
}

export function deriveContainerEffectiveStatus(rawStatus, pendingTransition, now) {
  const incoming = normalizeContainerStatus(rawStatus);
  if (!pendingTransition || !pendingTransition.transition) {
    return { status: incoming, pendingTransition: null, cleared: false };
  }

  const transition = normalizeContainerStatus(pendingTransition.transition);
  const from = normalizeContainerStatus(pendingTransition.from);
  const target = normalizeContainerStatus(pendingTransition.target);
  const startedAt = Number(pendingTransition.startedAt ?? 0);
  const timeoutMs = Number(pendingTransition.timeoutMs ?? DEFAULT_TRANSITION_TIMEOUT_MS);
  // 调用方必须显式提供 now；缺失时按起点处理，绝不隐式读取系统时钟。
  const currentTime = Number.isFinite(Number(now)) ? Number(now) : startedAt;

  // building 只允许从空状态或 building/creating 链路进入。
  // 如果刷新后后端已给出 online/failed 等终态，说明创建链路已结束，不应再把终态压回构建中。
  if (transition === 'building' && CONTAINER_TERMINAL_STATES.has(from) && incoming === from) {
    return { status: incoming, pendingTransition: null, cleared: true };
  }

  if (startedAt > 0 && currentTime - startedAt > timeoutMs) {
    return { status: incoming, pendingTransition: null, cleared: true };
  }

  if (incoming === 'failed') {
    return { status: 'failed', pendingTransition: null, cleared: true };
  }

  if (CONTAINER_ING_STATES.has(incoming)) {
    if (incoming === transition) {
      return {
        status: incoming,
        pendingTransition: { ...pendingTransition, reachedTransition: true },
        cleared: false,
      };
    }
    const followUp = FOLLOW_UP_TRANSITION[transition];
    if (followUp && incoming === target && incoming === followUp.on) {
      return {
        status: incoming,
        pendingTransition: createContainerStatusTransition(incoming, incoming, {
          targetStatus: followUp.target,
          startedAt: currentTime,
          timeoutMs: pendingTransition.timeoutMs,
        }),
        cleared: false,
      };
    }
    return { status: incoming, pendingTransition: null, cleared: true };
  }

  const reachedTransition = pendingTransition.reachedTransition === true;
  const targetReached = target && incoming === target && (incoming !== from || reachedTransition);
  if (targetReached || (CONTAINER_TERMINAL_STATES.has(incoming) && incoming !== from)) {
    return { status: incoming, pendingTransition: null, cleared: true };
  }

  if (!incoming || incoming === from) {
    return { status: transition, pendingTransition, cleared: false };
  }

  return { status: incoming, pendingTransition: null, cleared: true };
}
