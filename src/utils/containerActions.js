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
