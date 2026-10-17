/**
 * 公告批量发送的进度轮询（异步发送的配套，2026-09）。
 *
 * 背景：批量发送已改成"发起即返回 + Ctrl 后台线程一封封发"。每封之间有 0.8s 的固定
 * 间隔（服务商限速），一批可能好几分钟——所以发起方**不能等结果**，只能轮询公告状态。
 *
 * 这里刻意做成纯函数：注入 fetchList，自己只管节奏与终态判定，便于单测。
 */

// 轮询间隔。注意这是"看进度"的节奏，不是请求超时——超时用 POLL_TIMEOUT。
export const SEND_POLL_INTERVAL_MS = 3000;

const isSending = (announcement) => String(announcement?.status || '').toLowerCase() === 'sending';

/**
 * 跟踪一批公告的发送进度，直到全部离开 sending。
 *
 * @param {object}   opts
 * @param {number[]} opts.announcementIds 发起时后端回执里的公告 id
 * @param {Function} opts.fetchList       取公告列表（返回 {announcements: [...]}）
 * @param {Function} [opts.onProgress]    每次轮询回调 {total, done, success, fail}
 * @param {Function} [opts.onDone]        全部到终态时回调（收到的是那几条公告）
 * @param {Function} [opts.onError]       单次轮询失败（不中断，下一拍继续）
 * @param {number}   [opts.intervalMs]
 * @returns {Function} stop()：停止轮询（组件卸载时必须调）
 */
export function trackAnnouncementSend({
  announcementIds,
  fetchList,
  onProgress,
  onDone,
  onError,
  intervalMs = SEND_POLL_INTERVAL_MS,
}) {
  const pending = new Set((announcementIds || []).map(String));
  let stopped = false;
  let timer = null;

  const stop = () => {
    stopped = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  if (pending.size === 0) {
    stop();
    return stop;
  }

  const tick = async () => {
    if (stopped) return;
    let finished = null;
    try {
      const res = await fetchList();
      const mine = (res?.announcements || []).filter((a) => pending.has(String(a.id)));
      const done = mine.filter((a) => !isSending(a));
      if (onProgress) {
        onProgress({
          total: pending.size,
          done: done.length,
          success: done.reduce((n, a) => n + (a.success_count || 0), 0),
          fail: done.reduce((n, a) => n + (a.fail_count || 0), 0),
        });
      }
      // mine 为空说明列表里还没有它们（刚发起、或分页没覆盖到）——不当成"已完成"
      if (mine.length > 0 && done.length === mine.length) finished = done;
    } catch (e) {
      // 一次抖动不该中断进度展示
      if (onError) onError(e);
    }
    if (stopped) return;
    if (finished) {
      stop();
      if (onDone) onDone(finished);
      return;
    }
    timer = setTimeout(tick, intervalMs);
  };

  tick();
  return stop;
}
