import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getDeletedContainerMountUsage } from '../api/container_api';
import {
  MOUNT_USAGE_POLL_INTERVAL_MS,
  MOUNT_USAGE_RECHECK_INTERVAL_MS,
  deriveMeasurableDeletedIds,
  isMeasurableDeletedRecord,
  resolveMountUsageBatch,
} from './mountUsage';

/**
 * 已删除容器当前页的用量生命周期。
 *
 * 约束：
 * - pending 每 5 秒查询，全部当前页路径每 60 秒复查，页面离开后停止。
 * - 单计时器 + 单在途：上一批返回后才安排下一拍，慢请求不会堆叠。
 * - 页面卸载/翻页/刷新/清理/恢复时由调用方 reset/invalidate 或 effect cleanup
 *   推进代次并 abort；迟到响应按代次、页 key 和当前行集合三重校验后丢弃。
 */
export const useDeletedMountUsage = () => {
  const [usageById, setUsageById] = useState({});
  const usageRef = useRef({});
  const recordsRef = useRef([]);
  const pageKeyRef = useRef(null);
  const generationRef = useRef(0);
  const timerRef = useRef(null);
  const inFlightRef = useRef(null);
  const nextFullRef = useRef(0);
  const activeRef = useRef(false);
  const mountedRef = useRef(true);

  const publishUsage = useCallback(next => {
    usageRef.current = next || {};
    if (mountedRef.current) setUsageById(usageRef.current);
  }, []);

  const controller = useMemo(() => {
    const clearTimer = () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const abortInFlight = () => {
      const current = inFlightRef.current;
      inFlightRef.current = null;
      if (current?.controller) {
        try { current.controller.abort(); } catch { /* ignore */ }
      }
    };

    const stillMatches = (generation, pageKey) => (
      mountedRef.current
      && generation === generationRef.current
      && pageKey === pageKeyRef.current
      && activeRef.current
    );

    const currentRecord = id => recordsRef.current.find(
      record => Number(record?.deleted_id) === Number(id),
    );

    const measurableIds = () => {
      const ids = [];
      const seen = new Set();
      for (const record of recordsRef.current) {
        if (!isMeasurableDeletedRecord(record) || seen.has(record.deleted_id)) continue;
        seen.add(record.deleted_id);
        ids.push(record.deleted_id);
      }
      return ids;
    };

    const pendingIds = () => measurableIds()
      .filter(id => usageRef.current[id]?.status === 'pending');

    const markUnavailable = ids => {
      const next = { ...usageRef.current };
      for (const id of ids) {
        const record = currentRecord(id);
        if (record && isMeasurableDeletedRecord(record)) {
          next[id] = { status: 'unavailable', message: '统计不可用' };
        } else {
          delete next[id];
        }
      }
      return next;
    };

    let scheduleNext;

    const finishBatch = (nextUsage, generation, pageKey) => {
      if (!stillMatches(generation, pageKey)) return;
      scheduleNext(generation, pageKey);
    };

    const applyBatch = (ids, usages, generation, pageKey, isPoll) => {
      if (!stillMatches(generation, pageKey)) return;
      const resolved = resolveMountUsageBatch(usages, ids);
      const next = { ...usageRef.current };
      for (const id of ids) {
        const record = currentRecord(id);
        if (!record || !isMeasurableDeletedRecord(record)) {
          delete next[id];
          continue;
        }
        next[id] = resolved[id] || { status: 'unavailable', message: '统计不可用' };
      }
      publishUsage(next);
      finishBatch(next, generation, pageKey, isPoll);
    };

    const markBatchUnavailable = (ids, generation, pageKey) => {
      if (!stillMatches(generation, pageKey)) return;
      publishUsage(markUnavailable(ids));
      nextFullRef.current = Date.now() + MOUNT_USAGE_RECHECK_INTERVAL_MS;
      scheduleNext(generation, pageKey);
    };

    const runBatch = (ids, generation, pageKey, isPoll) => {
      if (!stillMatches(generation, pageKey) || inFlightRef.current) return;
      const abortController = new AbortController();
      const inFlight = { controller: abortController, generation };
      inFlightRef.current = inFlight;

      Promise.resolve()
        .then(() => getDeletedContainerMountUsage(ids, { signal: abortController.signal }))
        .then(res => {
          if (inFlightRef.current === inFlight) inFlightRef.current = null;
          // 统一取消（卸载/翻页/刷新/清理/恢复）后，信号已 abort：静默丢弃。
          if (abortController.signal.aborted) return;
          applyBatch(ids, res?.usages, generation, pageKey, isPoll);
        })
        .catch(err => {
          if (inFlightRef.current === inFlight) inFlightRef.current = null;
          if (abortController.signal.aborted || err?.name === 'AbortError') return;
          // 认证/权限失败停止；网络与超时等错误低频重试。
          if (err?.status === 401 || err?.status === 403) {
            activeRef.current = false;
            publishUsage(markUnavailable(ids));
            return;
          }
          markBatchUnavailable(ids, generation, pageKey);
        });
    };

    scheduleNext = (generation, pageKey) => {
      if (!stillMatches(generation, pageKey) || timerRef.current !== null) return;
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (!stillMatches(generation, pageKey)) return;
        // 防御性单飞：若仍有在途请求，不消费 tick，也不叠请求，5 秒后再看。
        if (inFlightRef.current) {
          scheduleNext(generation, pageKey);
          return;
        }
        const full = Date.now() >= nextFullRef.current;
        const ids = full ? measurableIds() : pendingIds();
        if (!ids.length) {
          scheduleNext(generation, pageKey);
          return;
        }
        if (full) nextFullRef.current = Date.now() + MOUNT_USAGE_RECHECK_INTERVAL_MS;
        runBatch(ids, generation, pageKey, true);
      }, pendingIds().length ? MOUNT_USAGE_POLL_INTERVAL_MS : Math.max(0, nextFullRef.current - Date.now()));
    };

    const start = (records, pageKey = null) => {
      const list = Array.isArray(records) ? records : [];
      generationRef.current += 1;
      const generation = generationRef.current;
      activeRef.current = false;
      nextFullRef.current = Date.now() + MOUNT_USAGE_RECHECK_INTERVAL_MS;
      clearTimer();
      abortInFlight();
      recordsRef.current = list;
      pageKeyRef.current = pageKey;

      const ids = deriveMeasurableDeletedIds(list);
      if (!ids.length) {
        publishUsage({});
        return;
      }

      const loading = {};
      for (const id of ids) loading[id] = { status: 'loading' };
      publishUsage(loading);
      activeRef.current = true;
      runBatch(ids, generation, pageKey, false);
    };

    const reset = () => {
      generationRef.current += 1;
      activeRef.current = false;
      clearTimer();
      abortInFlight();
      recordsRef.current = [];
      pageKeyRef.current = null;
      publishUsage({});
    };

    // 清理/恢复开始时调用：旧计时器、在途请求和旧 bytes/pending 立即失效。
    // 动作失败或需要选择时由调用方重新采样当前页。
    const invalidate = () => {
      generationRef.current += 1;
      activeRef.current = false;
      clearTimer();
      abortInFlight();
      const next = {};
      for (const record of recordsRef.current) {
        if (isMeasurableDeletedRecord(record)) {
          next[record.deleted_id] = { status: 'unavailable', message: '统计不可用' };
        }
      }
      publishUsage(next);
    };

    const stop = () => {
      generationRef.current += 1;
      activeRef.current = false;
      clearTimer();
      abortInFlight();
    };

    const resume = () => {
      if (!activeRef.current && recordsRef.current.length) {
        start(recordsRef.current, pageKeyRef.current);
      }
    };

    return { start, reset, invalidate, resume, stop };
  }, [publishUsage]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controller.stop();
    };
  }, [controller]);

  return {
    usageById,
    start: controller.start,
    reset: controller.reset,
    invalidate: controller.invalidate,
    resume: controller.resume,
  };
};

export default useDeletedMountUsage;
