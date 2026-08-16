// SSH 登录时间与清理倒计时的纯格式化函数（从 Home.jsx 抽出，便于单测）

const ISO_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;
const hasZoneSuffix = (s) => s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s);

// 全站统一 UTC+8 北京时间（无夏令时）
const BJ_OFFSET_MS = 8 * 60 * 60 * 1000;
const MONTH_INDEX = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/** 由北京时间墙钟分量构造 Date（无年份时取北京时间当前年；
 *  目标月晚于当前月（如 1 月读 12 月日志）时回退上一年）。 */
const dateFromBeijingWall = (monthIndex, day, hh, mm, ss) => {
  const bjNow = new Date(Date.now() + BJ_OFFSET_MS);
  let year = bjNow.getUTCFullYear();
  if (monthIndex > bjNow.getUTCMonth()) year -= 1;
  return new Date(Date.UTC(year, monthIndex, day, hh, mm, ss) - BJ_OFFSET_MS);
};

export const parseSshTimeToDate = (raw) => {
    if (!raw || typeof raw !== 'string') return null;
    const t = raw.trim();
    // 时区口径（与 AdminLogs formatTime 一致）：
    // - 后端下发的 ISO 形串是库内 naive UTC → 补 Z 按 UTC 解析；
    // - 节点 syslog 形串是机器本地时间（机器即北京时间）→ 按固定 UTC+8 构造，
    //   不依赖浏览器时区；
    // - 节点 last 形串是 UTC 墙钟（节点侧 TZ=UTC 强制）→ 按 UTC 组装。
    if (ISO_RE.test(t)) {
      const d0 = new Date(hasZoneSuffix(t) ? t : `${t}Z`);
      if (!Number.isNaN(d0.getTime())) return d0;
    }

    // fallback A: parse syslog-like prefix, e.g. "Mar 20 10:35:20 ..."
    const m = t.match(/^([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (m) {
      const d1 = dateFromBeijingWall(
        MONTH_INDEX[m[1]], Number(m[2]), Number(m[3]), Number(m[4]), Number(m[5]),
      );
      if (d1 && !Number.isNaN(d1.getTime())) return d1;
    }

    // fallback B: parse `last` output snippet, e.g. "... Sun Aug 16 16:03 ..."
    // 节点侧 TZ=UTC 强制 last 输出 UTC 墙钟（见 NodeKernel container_service），
    // 必须按 UTC 组装，否则展示会偏 8 小时。
    const m2 = t.match(/\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{2}:\d{2})(?::(\d{2}))?\b/);
    if (m2) {
      const year = new Date().getUTCFullYear();
      const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
      const hhmmss = `${m2[3]}:${m2[4] || '00'}`;
      const [hh, mm, ss] = hhmmss.split(':').map(Number);
      const d2 = new Date(Date.UTC(year, MONTHS[m2[1]], Number(m2[2]), hh, mm, ss));
      if (!Number.isNaN(d2.getTime())) return d2;
    }

    // 最后兜底：交给浏览器解析（歧义串按浏览器本地理解，尽力而为）
    const d0 = new Date(t);
    if (!Number.isNaN(d0.getTime())) return d0;
    return null;
  };

export const formatDuration = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return null;
    if (seconds < 3600) {
      return `${Math.max(1, Math.ceil(seconds / 60))}分钟`;
    }
    const hours = Math.floor(seconds / 3600);
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    if (days > 0 && remainHours > 0) return `${days}天${remainHours}小时`;
    if (days > 0) return `${days}天`;
    return `${Math.max(1, hours)}小时`;
  };
