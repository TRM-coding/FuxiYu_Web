import { useEffect, useState } from 'react';

/**
 * 侧边栏响应式收窄（2026-09）：桌面中宽区间（769 ~ breakpointMax）侧边栏让位
 * 给主内容区——inlineCollapsed（icon-only + tooltip），避免内容页被挤到卡片溢出。
 * 窄屏（≤768）由各布局自身切移动顶栏，本 hook 返回 false。
 */
export default function useResponsiveCollapse(breakpointMax = 1200) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(`(min-width: 769px) and (max-width: ${breakpointMax}px)`);
    const update = () => setCollapsed(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, [breakpointMax]);

  return collapsed;
}
