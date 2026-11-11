# 测试修复说明（第 3 轮，仅测试文件）

主审 full Web suite：147 passed / 9 failed（28 文件 156 用例）。`MachineSharedLimit` 全通过；`ResourceLimits` 5/6 过；`ErrorPresentation` 8 例全败在 `afterEach` 清理。两个根因均由主审定位，本轮只做最小修正，**未改任何组件/源码/认证/规范/文档整理文件**。

## 1. `src/test/ErrorPresentation.test.jsx`

- 根因：antd 在两个汉字间自动插空格，确认按钮 `textContent` 实际是 `好 的`；`closeAllDialogs` 原先筛 `.trim() === '好的'` 匹配不到任何按钮 → 每例 `waitFor(可见弹窗归零)` 失败、旧弹窗节点逐例累积。
- 修正：筛选条件改为 `(btn.textContent || '').replace(/\s/g, '') === '好的'`，仍按 DOM 取真实按钮并 `click()`，清理仍由 React 自身 `onConfirm → cleanup()` 完成（不手动删 DOM、不用 `Modal.destroyAll`——`showErrorModal` 是独立 `createRoot` + 自定义 `ConfirmModal`，该 API 不适用）。
- 保留不变：`openModal` 计数口径、`visibleDialogs`/`dialogText` 的当前 dialog 定位、全部数字映射断言（`8GB`/`4GB`/`16GB`、422/400 提示、原因文案）。

## 2. `src/test/ResourceLimits.test.jsx`

- 根因：最后一个 `zero-mem` 用例在全套 28 worker 并发下 `Test timed out in 5000ms`；此前单文件/独立首套运行该例通过，属并发下的慢交互，非断言错误。
- 修正：仅给该用例加 per-test timeout `15000`（`it(..., async () => {...}, 15000)`）。**未**调整全局 `testTimeout`、**未**延长其它 `waitFor` 默认、**未**加 sleep、**未**改断言。
- 其余 5 例（已通过）未改动。

## 3. 未运行事实

- 本代理沙箱内 `pwsh` 不可用（`SetNamedSecurityInfoW` Win32 5），**本轮未执行任何测试或构建**，不声称通过。
- 上述两个根因与 147/9 的分布来自主审实跑结果，非本代理执行。
- 待主审定向复跑 `ErrorPresentation` 8 例与 `ResourceLimits` 6 例通过后，再重跑全套；**tasks 勾选项未改动**（1.3、2.1 仍未勾）。