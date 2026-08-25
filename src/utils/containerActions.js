/** 容器操作可用性纯函数：前端状态机唯一事实源。
 *  从 Home.jsx 的条件判断抽出，便于单测与统一维护。 */

/** 由"容器 DB 状态 + 派生展示态"计算按钮可用性 */
export function getContainerActionState(containerStatus, displayStatus = null) {
  const status = String(containerStatus || '').toLowerCase();
  const hostOffline = String(displayStatus || '') === 'host_offline';
  return {
    hostOffline,
    // 宿主机离线时一切操作不可用（后端也会拦，这里只是 UI 诚实）
    canStart: !hostOffline && status === 'offline',
    canStop: !hostOffline && status === 'online',
    canRestart: !hostOffline && status === 'online',
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
  'creating', 'starting', 'stopping', 'restarting', 'pausing', 'unpausing',
]);

export const CONTAINER_TERMINAL_STATES = new Set([
  'online', 'offline', 'paused', 'failed', 'unknown',
]);

const DEFAULT_TRANSITION_TIMEOUT_MS = 60000;

const DEFAULT_TARGET_STATUS = {
  starting: 'online',
  stopping: 'offline',
  restarting: 'online',
  pausing: 'paused',
  unpausing: 'online',
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
    timeoutMs: options.timeoutMs || DEFAULT_TRANSITION_TIMEOUT_MS,
    reachedTransition: false,
  };
}

export function deriveContainerDisplayStatus(rawStatus, pendingTransition, now = Date.now()) {
  const incoming = normalizeContainerStatus(rawStatus);
  if (!pendingTransition || !pendingTransition.transition) {
    return { status: incoming, pendingTransition: null, cleared: false };
  }

  const transition = normalizeContainerStatus(pendingTransition.transition);
  const from = normalizeContainerStatus(pendingTransition.from);
  const target = normalizeContainerStatus(pendingTransition.target);
  const startedAt = Number(pendingTransition.startedAt || 0);
  const timeoutMs = Number(pendingTransition.timeoutMs || DEFAULT_TRANSITION_TIMEOUT_MS);

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
