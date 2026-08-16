// Vitest 全局初始化：jest-dom 断言 + jsdom 缺失的浏览器 API 补齐
import '@testing-library/jest-dom/vitest';

// TableComponent 用 window.matchMedia 判断移动端 —— jsdom 没有，mock 成桌面
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() { return false; },
  });
}

// antd 组件（Table 等）依赖 ResizeObserver —— jsdom 没有
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
