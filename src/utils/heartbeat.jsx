// Web heartbeat utility: poll Ctrl for container status until RUNNING
import { BACKEND_ORIGIN, POLL_TIMEOUT } from '../configs/backend_config';

export function startContainerStatusHeartbeat({ machine_id, container_name, container_id, onRunning, onTerminal, onProgress, terminalState = 'online', requiredProgressState = '', timeout = 180000, interval = 3000 }) {
  let stopped = false;
  const startTs = Date.now();
  let timerId = null;
  let hasRequiredProgress = !requiredProgressState;
  const normalizedRequiredProgress = String(requiredProgressState || '').toLowerCase();

  // backward-compatibility: if caller supplied onRunning and not onTerminal and terminalState is 'online'
  const terminalCb = typeof onTerminal === 'function' ? onTerminal : (terminalState === 'online' && typeof onRunning === 'function' ? onRunning : null);

  const doCheck = async () => {
    if (stopped) return;
    if (Date.now() - startTs > timeout) {
      stopped = true;
      return;
    }
    try {
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), POLL_TIMEOUT);
      const headers = { 'Content-Type': 'application/json' };
      const url = new URL('/api/containers/container_status', BACKEND_ORIGIN).toString();
      const res = await fetch(url, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ machine_id, container_name, container_id }),
        signal: controller.signal,
      });
      clearTimeout(to);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const st = data && data.effective_status;
        const normalizedStatus = String(st || '').toLowerCase();
        if (st && typeof onProgress === 'function') {
          onProgress(data);
        }
        if (normalizedStatus && normalizedStatus === normalizedRequiredProgress) {
          hasRequiredProgress = true;
        }
        if (st && normalizedStatus === String(terminalState).toLowerCase() && hasRequiredProgress) {
          stopped = true;
          if (typeof terminalCb === 'function') terminalCb(data);
          return;
        }
        // also surface failures
        if (st && normalizedStatus === 'failed') {
          stopped = true;
          if (typeof terminalCb === 'function') terminalCb(data);
          return;
        }
      }
    } catch (e) {
      // ignore errors and continue polling until timeout
    }
    if (!stopped) timerId = setTimeout(doCheck, interval);
  };

  doCheck();
  return () => {
    stopped = true;
    if (timerId) clearTimeout(timerId);
  };
}

export function startMachineStatusHeartbeat({ machine_id, onTerminal, terminalState = 'maintenance', timeout = 240000, interval = 3000 }) {
  let stopped = false;
  const startTs = Date.now();
  let timerId = null;

  const doCheck = async () => {
    if (stopped) return;
    if (Date.now() - startTs > timeout) {
      stopped = true;
      return;
    }
    try {
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), POLL_TIMEOUT);
      const headers = { 'Content-Type': 'application/json' };
      const url = new URL('/api/machines/list_all_machine_bref_information', BACKEND_ORIGIN).toString();
      const res = await fetch(url, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ page_number: 0, page_size: 1000 }),
        signal: controller.signal,
      });
      clearTimeout(to);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const list = (data && data.machines) || [];
        const m = list.find(it => String(it.machine_id) === String(machine_id));
        const st = (m && m.machine_status) ? String(m.machine_status).toLowerCase() : '';
        if (st && (st === String(terminalState).toLowerCase() || st === 'offline')) {
          stopped = true;
          if (typeof onTerminal === 'function') onTerminal(m || { machine_id, machine_status: st });
          return;
        }
      }
    } catch (e) {
      // ignore and retry until timeout
    }
    if (!stopped) timerId = setTimeout(doCheck, interval);
  };

  doCheck();
  return () => {
    stopped = true;
    if (timerId) clearTimeout(timerId);
  };
}

// ── 渲染侧 ing 看护（状态驱动） ─────────────────────────────
// 补「手动刷新页面 / 他人操作后进页面 → 列表返回 ing 态」的缺口：
// 卡片渲染出 ing 态即自动轮询至终态，动作驱动的 startContainerStatusHeartbeat 不受影响。
// ing 态在 DB 侧本身有界（Node pending TTL 兜底，create 最长 1800s），
// 客户端给 60 分钟安全上限防止异常服务器下无限轮询。
export const ING_CONTAINER_STATES = new Set([
  'building', 'creating', 'starting', 'stopping', 'restarting', 'pausing', 'unpausing',
  // 容器轴复核（node 重启后 cold_start_verify 波）：ing 语义，自动轮询至终态
  'status_unknown',
]);

export function watchIngContainerUntilTerminal({ machine_id, container_id, container_name, onTerminal, onProgress, timeout = 3600000, interval = 3000 }) {
  let stopped = false;
  const startTs = Date.now();
  let timerId = null;

  const doCheck = async () => {
    if (stopped) return;
    if (Date.now() - startTs > timeout) {
      stopped = true;
      return;
    }
    try {
      const controller = new AbortController();
      const to = setTimeout(() => controller.abort(), POLL_TIMEOUT);
      const headers = { 'Content-Type': 'application/json' };
      const url = new URL('/api/containers/container_status', BACKEND_ORIGIN).toString();
      const res = await fetch(url, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ machine_id, container_name, container_id }),
        signal: controller.signal,
      });
      clearTimeout(to);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const st = data && data.effective_status ? String(data.effective_status).toLowerCase() : '';
        // 中间态也回调：列表渲染侧借 onProgress 实时 patch，避免 UI 停留在加载时的旧 ing 态
        if (st && typeof onProgress === 'function') {
          onProgress(data);
        }
        if (st && !ING_CONTAINER_STATES.has(st)) {
          stopped = true;
          if (typeof onTerminal === 'function') onTerminal(data);
          return;
        }
      }
    } catch (e) {
      // ignore errors and continue polling until timeout
    }
    if (!stopped) timerId = setTimeout(doCheck, interval);
  };

  doCheck();
  return () => {
    stopped = true;
    if (timerId) clearTimeout(timerId);
  };
}

export default { startContainerStatusHeartbeat, startMachineStatusHeartbeat, watchIngContainerUntilTerminal, ING_CONTAINER_STATES };
