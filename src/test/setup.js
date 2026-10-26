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

// jsdom 未实现 Range 的布局矩形；CodeMirror 的异步测量会调用它们。
// 只补空矩形，不替代编辑器状态、选区或按键行为。
if (typeof Range !== 'undefined') {
  const emptyRect = () => ({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    toJSON: () => ({}),
  });

  if (typeof Range.prototype.getClientRects !== 'function') {
    Range.prototype.getClientRects = () => Object.assign([], { item: () => null });
  }
  if (typeof Range.prototype.getBoundingClientRect !== 'function') {
    Range.prototype.getBoundingClientRect = emptyRect;
  }
}
