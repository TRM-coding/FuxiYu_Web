// Web heartbeat utility: poll Ctrl for container status until RUNNING
import { BACKEND_ORIGIN, REQUEST_TIMEOUT } from '../configs/backend_config';

export function startContainerStatusHeartbeat({ machine_id, container_name, onRunning, onTerminal, terminalState = 'online', timeout = 180000, interval = 3000 }) {
  let stopped = false;
  const startTs = Date.now();
  let timerId = null;

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
      const to = setTimeout(() => controller.abort(), REQUEST_TIMEOUT || 5000);
      const headers = { 'Content-Type': 'application/json' };
      const url = new URL('/api/containers/container_status', BACKEND_ORIGIN).toString();
      const res = await fetch(url, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ machine_id, container_name }),
        signal: controller.signal,
      });
      clearTimeout(to);
      if (res.ok) {
        const data = await res.json().catch(() => null);
        const st = data && data.container_status;
        if (st && String(st).toLowerCase() === String(terminalState).toLowerCase()) {
          stopped = true;
          if (typeof terminalCb === 'function') terminalCb(data);
          return;
        }
        // also surface failures
        if (st && String(st).toLowerCase() === 'failed') {
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
      const to = setTimeout(() => controller.abort(), REQUEST_TIMEOUT || 5000);
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

export default { startContainerStatusHeartbeat, startMachineStatusHeartbeat };
