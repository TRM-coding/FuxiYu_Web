# Proposal

## Why

`frontend--page-admin-logs`、`frontend--page-settings`、`frontend--page-not-found`、`frontend--table-component` 四个主规格已经存在，合计 20 个 Requirement、45 个 Scenario；但对应主侧车仍混有“待复核/部分覆盖”和对布局场景只读 CSS 源字符串的旧台账，不能作为本轮可逐行核对的 Scenario→Test/check 规划。原尝试 `d4e704d5` 在写入前已明确 `quota_exceeded` 终态，没有留下本轮可审查的 proposal、specs、design 或 test-plan；本 change 由官方 fallback 独占补齐，只做规划，供独立 fresh review 通过后再进入 apply。

## What Changes

- 为上述 4 个 capability 的 20 个 Requirement、45 个 Scenario 建立中文 canonical 的 `Requirement → Scenario → Test/check → Assertion scope → 可选实际限界 Coverage note` 对账规划。
- 每个 delta 以 `MODIFIED Requirements` 完整、逐字重述主规格原 Requirement 块；Requirement 名、Scenario 名、WHEN/THEN 与正文约束零变化，本轮不新增、不删除、不弱化任何业务要求，也不向主规格插入本轮说明。
- 从真实测试代码逐段核实断言：能证明该 Scenario THEN 必要行为的既有 locator 才标 `[X]`；真实缺口标 `[ ]`，集中规划到专属新测试文件 `src/test/AnvilTableSettings.test.jsx`。本阶段不创建该测试文件，不记录 run/pass/fail 台账。
- 规划测试使用真实页面/组件、真实用户交互，仅 mock 外部 API、时钟或浏览器能力；不以反射、源码字符串、测试名或 mock 调用次数伪造行为。`AdminLogs`、`Settings`、`DeletedContainers`、`TableComponent`、`NotFound` 的目标组件不替换。
- 构建归属类 Scenario 复用既有 `npm run build`，只声明退出码与 `dist` 生成；页面异步 chunk、three 分组与警告清单不写成该命令自动断言。
- jsdom 不计算真实布局：320px/390px/768px/1440px 的 `scrollWidth`、404 视口高度等像素结论只规划可复现的人工 Chromium 检查，不把 CSS 源字符串测试当作真实布局证据；404 固定访问 `/#/definitely-missing`，用 computed `minHeight` 的 px 值与 `window.innerHeight` 比较，不比较 `100vh`/`100dvh` 字符串。
- 对账确认 `AdminLogs` 切换周/筛选会通过 effect 同时重跑 `listOperationLogs` 与 `getOperationLogStats`；既有测试只断言列表，统计调用由规划测试补齐。
- A9 的“请求次数不变”按上下文解释为：响应式调整与展开不引入额外请求，不禁止既有换页查询；换页沿现有 effect 可重取列表与统计，新页仍有详情功能，但不保留旧页行的展开 DOM。不引入新后端或 no-stats 策略。
- `Settings` 错误场景只证明前端对模拟 `invalid_setting`/`update_failed` 响应的参数传递、映射与弹窗展示；后端未知键/越界校验与事务写入不在本前端测试计划范围。
- 若对账发现明确的应用与规格冲突，只报告父代理，不修改应用、不修改主规格、不弱化要求，也不规划伪造通过的测试；当前未发现需要改应用的明确冲突。
- 主规格、主侧车、review、tasks、测试文件、共享 fixture、业务源码、依赖、数据库、配置、CI、hooks、skills、SSH、secrets 与 commit 本轮均不写入。

## Capabilities

### New Capabilities

<!-- 无新增 capability。 -->

### Modified Capabilities

- `frontend--page-admin-logs`: 仅补齐测试对账（5 个 Requirement、10 个 Scenario），Requirement 语义不变。
- `frontend--page-settings`: 仅补齐测试对账（6 个 Requirement、12 个 Scenario），Requirement 语义不变。
- `frontend--page-not-found`: 仅补齐测试对账（4 个 Requirement、5 个 Scenario），Requirement 语义不变。
- `frontend--table-component`: 仅补齐测试对账（5 个 Requirement、18 个 Scenario），Requirement 语义不变。

## Impact

- 规格：仅新增本 change 下的 `proposal.md`、4 个 `specs/frontend--*/spec.md`、`design.md`、`test-plan.md`。不改 `openspec/specs/**` 及其侧车。
- 代码：规划阶段零改动；后续 apply 仅新增 `src/test/AnvilTableSettings.test.jsx`，不改既有测试、页面实现、路由、共享 fixture 或构建配置。
- 构建/依赖/配置：不改默认 schema、`openspec/config.yaml`、`vite.config.js`、`package.json`、CI 或 Git hooks；不读取 `.env`、APIKEY/PASSCODE、SSH 或生产凭据。
- 并行边界：不与既有 4 批 change 交错，不修改 `AnvilBasicPages.test.jsx` 或其它批次计划中的文件。
- 交付：本阶段不 commit、不 push；commit 由父代理在 fresh review 与后续流程完成后负责。
