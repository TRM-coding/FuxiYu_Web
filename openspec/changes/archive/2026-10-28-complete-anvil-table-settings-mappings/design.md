# Design

## Context

本轮覆盖的 45 个 Scenario 已有大量真实行为测试，但旧侧车的 `[X]` 主要按测试名归类，未区分“证明 THEN 的必要断言”和“只证明相邻结构”。`AdminLogs`、`Settings`、`DeletedContainers` 的页面测试分别 mock 外部 API 后直渲目标页面；`TableComponent` 有独立组件测试；`NotFound` 现有测试主要读 CSS 源字符串；构建归属只有 `npm run build`。jsdom 能证明 DOM、事件、请求参数与模块间契约，但不计算 `scrollWidth`、视口高度或真实换行。

对账确认 `AdminLogs` 周/筛选变化会同时重跑列表与统计 effect；既有测试只断言列表，统计调用需要规划测试补齐。A9 的“请求次数不变”按上下文解释为：响应式调整与展开不引入额外请求，不禁止既有换页查询；换页沿现有 effect 可重取列表与统计，新页仍有详情功能，但不保留旧页行的展开 DOM。计划据此断言，不引入新后端或 no-stats 策略。

## Goals / Non-Goals

**Goals:**

- 为 45 个 Scenario 建立可逐行复核的 Test/check、Assertion scope 与 Coverage note。
- 区分既有测试已证明的行为、只能间接证明的行为、尚未覆盖的自动化缺口，以及只能人工浏览器确认的布局限界。
- 规划一个专属新测试文件承载自动化缺口，不改既有测试、共享 fixture 或业务实现。
- 用逐字 no-op 的 MODIFIED delta 保持主规格业务文本不变，避免本轮说明污染主规格。

**Non-Goals:**

- 不实现测试、不改应用代码、不改主规格/侧车、作者不创建 tasks/review、不 commit。
- 不修复未确认的行为差异，也不通过改规格或新增“只测当前实现”的测试把差异写成通过。
- 不把 jsdom 或 CSS 源字符串包装成真实像素/视口结论。
- 不证明后端真实行为、真实设备、CI 远程矩阵或生产部署。
- `Settings` 的 `invalid_setting`/`update_failed` 只证明前端对模拟响应的参数传递、映射与弹窗展示；Ctrl 的未知键/越界校验、事务写入与实际错误枚举不在本前端测试计划范围。
- 不新增后端契约、不引入 no-stats 策略；`AdminLogs` 换页是否重取统计沿现有 effect，测试只按上下文解释断言。

## Decisions

### 1. Delta 逐字 no-op

四个 delta 只包含 `## MODIFIED Requirements`，Requirement 块从主规格 `### Requirement:` 到 `## Source references` 之前逐字复制（无该节时到文件末）。这样官方 sync 的文本结果与主规格一致，不新增 Requirement、Scenario 或本轮说明；所有规划信息只放在本 change 的 proposal/design/test-plan。

### 2. 既有测试按真实断言分级

`[X]` 只用于已在测试代码中定位并读到的断言；如果同一 Scenario 的 THEN 还有未覆盖子句，在 Coverage note 明确写缺哪一部分，不把 `[X]` 当成整条 Scenario 自动全绿。只有测试名、旧侧车记载或源码字符串而没有行为断言的，不作为 `[X]` 证据。

### 3. 缺口集中到单一新测试文件

自动化缺口统一规划到 `src/test/AnvilTableSettings.test.jsx`，便于后续实现阶段一次补齐且不碰既有测试。测试优先真实渲染 `AppRoutes`、`AdminLogs`、`Settings`、`DeletedContainers`、`TableComponent`、`NotFound`；只 mock API、`matchMedia`/视口、剪贴板等外部边界。跨 capability 的同一测试可以复用，但每个 Scenario 的 Assertion scope 分别说明其覆盖子句。

### 4. 路由装配与页面行为分开证明

`AdminLogs`/`Settings` 的“装配页面”用真实 `AppRoutes` + `PermissionProvider` 证明路由、懒加载、AdminLayout 菜单与目标页面同时就位；页面内部行为继续由页面级测试证明。`NotFound` 的未知路径装配已有 `routeLoading` 真实路由证据，返回主页导航另补真实点击测试。

### 5. 布局与像素限界只走人工浏览器

`TableComponent`/`AdminLogs` 的 320px 收窄、404 的视口高度与底部空隙，jsdom 只能证明 DOM 结构、按钮可操作和 CSS 类存在，不能证明真实 `scrollWidth`/高度。计划中明确写人工 Chromium 的视口、HashRouter 实际 URL、操作与测量对象：404 固定访问 `/#/definitely-missing`（路径 `/definitely-missing`），用 `parseFloat(getComputedStyle(page).minHeight)` 的 px 值与 `window.innerHeight` 比较，不比较 `100vh`/`100dvh` 字符串；横向检查比较 `document.documentElement.scrollWidth` 与 `window.innerWidth`。不新增读取 CSS 源字符串的机械测试，也不把现有源字符串测试标成 `[X]`。

### 6. 构建检查限定在真实可观测范围

三个“生成生产产物”Scenario 复用 `npm run build`，只声明退出码 0、构建完成与 `dist` 生成。异步 chunk 命名、`vendor-three-*` 分组、入口是否包含页面源码与 Rollup 警告清单属于产物人工核对/验收观测，不由该命令自动断言。

### 7. AdminLogs“请求次数不变”按响应式调整解释

`AdminLogs` 周/筛选变化会重跑列表与统计 effect；规划测试同时断言 `listOperationLogs` 与 `getOperationLogStats` 被调用。A9 的“请求次数不变”按上下文解释为：响应式调整（桌面 antd/移动卡片切换与展开）不引入额外请求，不禁止既有换页查询；换页沿现有 effect 可重取列表与统计。计划只断言展开不新增 fetch、换页列表参数 `page=2,page_size=20`、统计三卡按响应渲染、第 2 页仍可用 antd 展开打开详情；不把“跨页保留旧行展开 DOM”或“统计请求次数不变”写成通过条件，也不引入新后端或 no-stats 策略。

## Risks / Trade-offs

- 单一新测试文件会同时覆盖四个 capability，文件可能较大；用 `describe` 按 capability 分组，复用页面/Provider 工具，避免跨测试共享可变状态。
- 路由装配测试涉及懒加载和权限 Provider，等待窗口比纯组件测试长；使用显式 `findBy*`/`waitFor`，不以固定 sleep 代替条件等待。
- `Settings` 的真实错误弹窗测试需要处理 antd 旧弹窗残留与 jsdom `getComputedStyle` 差异；沿用既有 `showErrorModalMap` 的可见弹窗过滤与关闭辅助，不读整个 `document.body`。
- 人工浏览器检查不可由 CI 自动复跑；Coverage note 会明确其范围，不把人工结论写成自动化通过。
- A9 的“请求次数不变”按响应式调整/展开不引入额外请求解释，换页沿现有逻辑可重取列表与统计；该解释已在 test-plan 写清，由独立 review 核对，不引入新后端或 no-stats 策略。
