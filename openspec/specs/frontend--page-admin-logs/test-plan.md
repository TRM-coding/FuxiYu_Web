# frontend--page-admin-logs Test Plan

Spec: [spec.md](spec.md)

## Current Mapping

### Requirement: AdminLogs 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_admin_logs_route_assembly`
- Assertion scope: 真实 `AppRoutes` + `PermissionProvider` + `MemoryRouter` 访问 `/admin/logs`，`getUserPermissions` 返回 `operation_log:manage` 与 `bypass_auth_entity`；断言 AdminLayout 菜单「操作日志」出现、`.admin-shell` 与 `.admin-logs` 同时存在、日志行「更新机器」渲染；页面身份来自权限快照，不读 localStorage 副本。
- Coverage note: 规划测试，未创建；现有 `AdminLogs.test.jsx` 只直渲页面，不能证明路由、懒加载与布局装配。

### Requirement: AdminLogs 主流程

#### Scenario: 切换周或过滤条件

- Test/check:
  - [X] `src/test/AdminLogs.test.jsx::点击「上一周」以新的时间范围重新查询`
  - [X] `src/test/AdminLogs.test.jsx::test_q22_admin_logs_stale_filter_page`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_admin_logs_week_filter_stats`
- Assertion scope: 上一周点击后第二次 `listOperationLogs` 调用带 `start`/`end`；筛选下拉切换会触发新列表请求，迟到旧筛选响应不覆盖新结果与分页。规划测试在同一交互后断言 `getOperationLogStats` 被调用，且统计三卡按响应渲染。
- Coverage note: 规划测试，未创建；既有断言只覆盖列表请求与渲染，未断言统计调用。当前实现的列表与统计在同一 effect 中重跑，规划测试按此可观察行为编写，不新增伪造请求。THEN 末尾“旧请求覆盖的风险登记在 QUESTIONS”属 Global QUESTIONS 文档职责，不在本仓自动化测试范围。

### Requirement: AdminLogs 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] `npm run build`
- Assertion scope: `vite build` 退出码 0，构建完成并生成 `dist`。
- Coverage note: 只证明构建成功与产物生成；不自动断言 `AdminLogs`/`ModelViewer` 独立 chunk、`vendor-three-*` 分组或 Rollup 警告清单，这些是产物人工核对/验收观测，不由命令退出码证明。

### Requirement: AdminLogs 查询结果必须匹配当前周次、筛选与分页

#### Scenario: 当前上下文响应应用

- Test/check:
  - [X] `src/test/AdminLogs.test.jsx::test_q22_admin_logs_current_response`
- Assertion scope: 当前请求返回后日志「当前周日志」渲染、`listOperationLogs` 恰好 1 次、`total_pages=4` 显示 4 页且第 1 页为 active。

#### Scenario: 旧周次响应晚到

- Test/check:
  - [X] `src/test/AdminLogs.test.jsx::test_q22_admin_logs_stale_week`
- Assertion scope: 上一周结果先返回并渲染、分页 3 页；本周迟到响应后不出现「本周迟到日志」，列表仍显示上一周结果，分页仍为 3 页。
- Coverage note: 断言旧响应不覆盖当前结果；请求序号/控制器资源释放是代码层事实，测试未直接观测释放动作。

#### Scenario: 旧筛选或旧页响应晚到

- Test/check:
  - [X] `src/test/AdminLogs.test.jsx::test_q22_admin_logs_stale_filter_page`
  - [X] `src/test/AdminLogs.test.jsx::test_q22_admin_logs_stale_page`
- Assertion scope: 旧筛选迟到响应不改写新筛选结果，旧 `total_pages=5` 不出现；旧页 2 迟到响应不改写第 1 页结果，第 1 页仍为 active。
- Coverage note: 两个测试分别覆盖旧筛选与旧页；正文的「旧请求只释放自身资源」未由测试直接观测。

### Requirement: AdminLogs 移动端日志详情与 320px 收缩

#### Scenario: 390px 与 768px 展开日志详情

- Test/check:
  - [X] `src/test/AdminLogsMobile.test.jsx::tc_logs_01_mobile_390_768_expand_collapse`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_admin_logs_mobile_expand_no_requests`
- Assertion scope: 既有测试在 390/768 点击「展开详情」后断言按钮变「收起详情」且 `aria-expanded=true`、显示「结构化」「复制详情」，再收起后详情消失；规划测试补断言收起后 `aria-expanded=false`，展开/收起前后 `listOperationLogs` 与 `getOperationLogStats` 调用次数均不变。
- Coverage note: 规划测试，未创建；既有测试未断言收起后的 aria 与请求次数。

#### Scenario: 320px 统计区收缩且详情不溢出

- Test/check:
  - [X] `src/test/AdminLogsMobile.test.jsx::tc_logs_02_320_side_contract`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_admin_logs_320_layout_dom`
  - [ ] `npm run dev`
- Assertion scope: 既有测试在 320 渲染并断言移动卡片、`.als-side`、`.als-wall-wrap` 存在；规划测试补断言统计三卡、筛选栏、日志卡片、分页入口均在 DOM 中。人工浏览器检查在 Chromium 320px 打开 HashRouter 实际地址 `https://localhost:5173/#/admin/logs`（路径 `/admin/logs`），使用现有 Dev/测试数据中一条含已知长 JSON/URL 的日志并展开详情；测量 `document.documentElement.scrollWidth` 与 `window.innerWidth`，断言 `scrollWidth <= 322`，`.als-side` 不再固定 300px、`.als-wall-wrap` 保留内部横向滚动，统计区、筛选、卡片与分页仍可见。
- Coverage note: 规划测试，未创建；既有 `tc_logs_02` 读取 CSS 源字符串断言 `min(300px, 100%)`，按本轮规则不作为真实布局证据；jsdom 不计算 `scrollWidth`，像素结论只来自人工浏览器。

#### Scenario: 1440px 桌面保持 antd 展开与分页

- Test/check:
  - [X] `src/test/AdminLogs.test.jsx::展开行显示前→后对比（状态值翻译）`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_admin_logs_desktop_1440_children_expand_page2`
- Assertion scope: 既有测试在桌面默认 `matchMedia` 下点击 antd `Expand row`，断言「机器状态」「运行中」「维护中」；规划测试在 1440 渲染真实 `AdminLogs`，断言 antd `table`、五列头、展开图标、无移动详情按钮。展开当前行前后 `listOperationLogs` 与 `getOperationLogStats` 调用次数不变（展开不新增 fetch）；点击第 2 页后 `listOperationLogs` 收到 `page=2,page_size=20`，统计三卡按响应渲染，第 2 页仍可用 antd 展开图标打开详情。
- Coverage note: 规划测试，未创建；既有测试未设置 1440、未断言表头、无移动卡片或分页请求。本场景“请求次数不变”按上下文解释为：响应式调整（桌面 antd/移动卡片切换与展开）不引入额外请求，不禁止既有换页查询；换页沿现有 effect 可重取列表与统计。新页仍有详情功能，但不保留旧页行的展开 DOM。计划据此只断言展开不新增请求、换页列表参数、统计三卡渲染与新页展开能力，不引入新后端或 no-stats 策略。

#### Scenario: 长日志详情在 320px 内可读

- Test/check:
  - [X] `src/test/AdminLogsMobile.test.jsx::tc_logs_03_long_detail_320`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_admin_logs_320_long_detail_action`
  - [ ] `npm run dev`
- Assertion scope: 既有测试在 320 展开含长 URL 的详情，断言 `.admin-logs-kv`、长路径文本、「收起详情」按钮存在；规划测试点击「收起详情」，断言详情消失、按钮恢复「展开详情」，再次展开后长文本重新出现。人工浏览器检查在 Chromium 320px 打开 `https://localhost:5173/#/admin/logs`（路径 `/admin/logs`），使用现有 Dev/测试数据中一条含无空格长 JSON、长 URL 或长 diff 行的日志；展开后测量 `document.documentElement.scrollWidth` 与 `window.innerWidth`，断言 `scrollWidth <= 322`，详情在卡片内换行或按既有滚动容器展示，“收起详情”按钮可见且可点击。
- Coverage note: 规划测试，未创建；真实换行/溢出只能人工浏览器，jsdom 不断言像素。
