// SSH 登录时间与清理倒计时的纯格式化函数（从 Home.jsx 抽出，便于单测）

export const parseSshTimeToDate = (raw) => {
    if (!raw || typeof raw !== 'string') return null;
    const t = raw.trim();
    const d0 = new Date(t);
    if (!Number.isNaN(d0.getTime())) return d0;

    // fallback A: parse syslog-like prefix, e.g. "Mar 20 10:35:20 ..."
    const m = t.match(/^([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{2}:\d{2}:\d{2})/);
    if (m) {
      const year = new Date().getFullYear();
      const d1 = new Date(`${m[1]} ${m[2]} ${year} ${m[3]}`);
      if (!Number.isNaN(d1.getTime())) return d1;
    }

    // fallback B: parse `last` output snippet, e.g. "... Fri Mar 20 12:39 ..."
    const m2 = t.match(/\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{2}:\d{2})(?::(\d{2}))?\b/);
    if (m2) {
      const year = new Date().getFullYear();
      const hhmmss = `${m2[3]}:${m2[4] || '00'}`;
      const d2 = new Date(`${m2[1]} ${m2[2]} ${year} ${hhmmss}`);
      if (!Number.isNaN(d2.getTime())) return d2;
    }
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

