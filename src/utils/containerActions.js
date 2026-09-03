/** 容器操作可用性纯函数：前端状态机唯一事实源。
 *  从 Home.jsx 的条件判断抽出，便于单测与统一维护。 */

/** 由"容器 DB 状态 + 派生展示态"计算按钮可用性 */
export function getContainerActionState(effectiveStatus) {
  const status = String(effectiveStatus || '').toLowerCase();
  const hostOffline = status === 'host_offline';
  const blockedByHost = hostOffline || status === 'host_maintenance' || status === 'status_unknown';
  return {
    hostOffline,
    canStart: !blockedByHost && status === 'offline',
    canStop: !blockedByHost && status === 'online',
    canRestart: !blockedByHost && status === 'online',
    canUnpause: !blockedByHost && status === 'paused',
  };
}

/** 操作列角色可见性：角色 → 按钮集合 */
export function getRoleActionSet(role) {
  const r = String(role || '').toUpperCase();
  return {
    showInvite: r === 'ADMIN',
    showDeleteContainer: r === 'ADMIN',
    showLeave: r === 'COLLABORATOR',
    showLongTerm: r === 'ROOT',
  };
}

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

export function normalizeContainerStatus(status) {
  return String(status || '').toLowerCase();
}

export function createContainerStatusTransition(fromStatus, transitionStatus, options = {}) {
  const transition = normalizeContainerStatus(transitionStatus);
  return {
    from: normalizeContainerStatus(fromStatus),
    transition,
    target: normalizeContainerStatus(options.targetStatus || DEFAULT_TARGET_STATUS[transition] || ''),
    startedAt: options.startedAt || Date.now(),
    timeoutMs: options.timeoutMs || DEFAULT_TIMEOUT_STATUS[transition] || DEFAULT_TRANSITION_TIMEOUT_MS,
    reachedTransition: false,
  };
}

export function deriveContainerEffectiveStatus(rawStatus, pendingTransition, now = Date.now()) {
  const incoming = normalizeContainerStatus(rawStatus);
  if (!pendingTransition || !pendingTransition.transition) {
    return { status: incoming, pendingTransition: null, cleared: false };
  }

  const transition = normalizeContainerStatus(pendingTransition.transition);
  const from = normalizeContainerStatus(pendingTransition.from);
  const target = normalizeContainerStatus(pendingTransition.target);
  const startedAt = Number(pendingTransition.startedAt || 0);
  const timeoutMs = Number(pendingTransition.timeoutMs || DEFAULT_TRANSITION_TIMEOUT_MS);

  // building 只允许从空状态或 building/creating 链路进入。
  // 如果刷新后后端已给出 online/failed 等终态，说明创建链路已结束，不应再把终态压回构建中。
  if (transition === 'building' && CONTAINER_TERMINAL_STATES.has(from) && incoming === from) {
    return { status: incoming, pendingTransition: null, cleared: true };
  }

  if (startedAt > 0 && now - startedAt > timeoutMs) {
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
          startedAt: now,
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
