import { useCallback, useRef } from 'react';

/**
 * 页面级“最新容器快照”登记器。
 *
 * 只做本地版本排序，不发起请求、不读时钟：
 * - 每次列表/详情响应都登记为新的 revision；
 * - 同一查询上下文的新列表若缺少旧行，登记 null 墓碑，旧记录不得再用于提交；
 * - 详情比列表新时，最终提交使用详情；列表比详情新时，使用列表。
 *
 * 页面在最终确认/直接提交前必须用 get(cid) 重新解析，禁止回退点击时的旧 record。
 * 本模块只含 React refs，不读写浏览器存储、不发网络请求、不读取当前时间。
 */
export function useContainerSnapshots() {
  const sequenceRef = useRef(0);
  const snapshotsRef = useRef(new Map());
  const contextsRef = useRef(new Map());

  const nextVersion = () => {
    sequenceRef.current += 1;
    return sequenceRef.current;
  };

  const remember = useCallback((record, source = 'list') => {
    const cid = record?.key || record?.container_id;
    if (cid === undefined || cid === null || String(cid) === '') return;
    snapshotsRef.current.set(String(cid), {
      record,
      version: nextVersion(),
      source,
    });
  }, []);

  const rememberList = useCallback((records, contextKey, source = 'list') => {
    const list = Array.isArray(records) ? records : [];
    const seen = new Set();
    for (const record of list) {
      const cid = record?.key || record?.container_id;
      if (cid === undefined || cid === null || String(cid) === '') continue;
      const key = String(cid);
      seen.add(key);
      snapshotsRef.current.set(key, {
        record,
        version: nextVersion(),
        source,
      });
    }

    const previous = contextsRef.current.get(contextKey) || new Set();
    for (const cid of previous) {
      if (seen.has(cid)) continue;
      if (!snapshotsRef.current.has(cid)) continue;
      snapshotsRef.current.set(cid, {
        record: null,
        version: nextVersion(),
        source: 'removed',
      });
    }
    contextsRef.current.set(contextKey, seen);
  }, []);

  const markUnavailable = useCallback((cid) => {
    if (cid === undefined || cid === null || String(cid) === '') return;
    snapshotsRef.current.set(String(cid), {
      record: null,
      version: nextVersion(),
      source: 'detail-missing',
    });
  }, []);

  const get = useCallback((cid) => {
    if (cid === undefined || cid === null || String(cid) === '') return null;
    return snapshotsRef.current.get(String(cid))?.record || null;
  }, []);

  return { remember, rememberList, markUnavailable, get };
}
