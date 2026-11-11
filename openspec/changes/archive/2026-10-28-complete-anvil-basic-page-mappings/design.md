# Design

## Context

- 规划根：`E:\AI\Fuxi\FuxiYu_Web`（`openspec context` 返回 `root.source=nearest`，本地 `openspec/specs` 与 `openspec/changes`）。
- 四个主规格 `frontend--page-admin-profile`、`frontend--page-apply`、`frontend--page-user`、`frontend--page-announcements` 已存在，共 13 个 Scenario；`openspec/specs/<capability>/test-plan.md` 侧车全部缺失（同批另有 capability 缺侧车，不在本轮范围）。
- 现状约束：本轮是**已有规格的测试对账**，不是功能改造。主规格 `openspec/specs/**`、`src/pages/**`、`src/routes/index.jsx` 与构建配置本轮零改动；侧车必须等官方 main-spec sync 成功后由 `anvil-test-plan` 维护，本轮不写。
- 既有测试资源（本轮已读代码确证）：
  - `src/test/legacyApplyRedirect.test.jsx`：旧 `/index/apply` 重定向与机器上下文（`/index/create`、`machine_id`/`machineId`、不退化成 404、`添加容器` 旧表单标题不出现）。
  - `src/test/announcementSend.test.js`：`src/utils/announcementSend` 进度轮询（首拍 `total/done`、未离开发送态不收尾、汇总 success/fail、单次失败不中断、`stop()` 生效）。
  - `src/test/announcementDraftContract.test.js`：`saveDraft` 剥离 `template_id`、保留草稿内容字段。
  - `src/test/routeLoading.test.jsx`、`src/test/authHelpers.test.js`：路由按需加载语义与 `clearAuth`/`handleAuthError` 语义。
  - `src/pages/AdminProfile.jsx`、`src/pages/User.jsx`、`src/pages/Announcements.jsx` 当前**没有**组件级测试文件。
- 测试环境：Vitest `environment: jsdom`，`setupFiles: './src/test/setup.js'`，`npm run test:web`；`npm run build`（`vite build`）为既有构建检查。

## Goals / Non-Goals

**Goals**

- 为 13 个 Scenario 建立可审查的 Scenario→Test/check 映射，逐条给出断言范围与缺口。
- 已从测试代码确证断言的映射标 `[X]`；未覆盖或新规划的标 `[ ]`，并落到专属新文件。
- 让后续 apply 的改动面最小：只新增一个测试文件，不动既有测试文件。

**Non-Goals**

- 不改任何业务实现、路由、构建配置、默认 schema、`openspec/config.yaml`、skills、CI 或 Git hooks。
- 不新增或调整 Requirement/Scenario 语义；不把主规格改成"测试清单"。
- 不为静态文案新增机械测试；不把 run/pass 写进计划。
- 不处理「公告转模板去重」缺陷，不扩张需求；对账若发现实现与规格不符，只报告。

## Decisions

### D1 用 MODIFIED 完整重述原 Requirement 块，而不是 ADDED

delta 以 `## MODIFIED Requirements` 承载每个 capability 原有 Requirement 的完整块（Requirement 名称、Scenario 名称、WHEN/THEN 逐字一致）。已用脚本对 12 个 Requirement 块做逐字比对，全部 verbatim 命中主规格。

- 理由：测试对账要同步进主规格语境，但不得引入语义漂移；`MODIFIED + 全文重述` 让 sync 后主规格逐字不变，同时使 delta 可被 `openspec validate --strict` 接受。
- 备选：ADDED 新增"测试对账"Requirement —— 会向主规格注入非业务要求，否决。

### D2 缺口统一落到新文件 `src/test/AnvilBasicPages.test.jsx`

新规划与未确认的映射集中在 `src/test/AnvilBasicPages.test.jsx`（jsdom + `@testing-library/react`），**不改** `legacyApplyRedirect.test.jsx`、`routeLoading.test.jsx`、`announcementSend.test.js` 等既有文件。

- 理由：Web 第 1 批与他批次并行；改既有文件会产生交错与冲突，也会让既有 `[X]` 映射失稳。
- 备选：按 capability 拆 4 个新文件 —— 4 个 cap 只有 9 条待补映射（`test-plan.md` 中 9 行 `[ ]`），拆文件增加装配样板与 mock 重复，否决。

### D3 交互类 Scenario 用真实组件行为测试，不用源码字符串搜索

- 装配页面：沿用 `legacyApplyRedirect.test.jsx` / `routeLoading.test.jsx` 的成熟模式 —— 真实 `AppRoutes` + 真实 `PermissionProvider` + `MemoryRouter`，`vi.mock('../api/user_api')` 提供权限快照，断言 `location.pathname` 与页面可见标识；仅在需要隔离业务实现时桩化子组件（如 `CreateContainer`）。
- 主流程：真实渲染 `AdminProfile` / `User` / `Announcements`，mock `../api/user_api`、`../api/announcement_api`、`../utils/showErrorModal`，用断言对可观察输出（可见文案、DOM 元素、`navigate` 调用、api 调用参数）而非实现细节字符串。
- 理由：源码字符串搜索对 `THEN` 的业务语义没有证明力，也容易在大文件里误命中。

### D4 `[X]` 只给已确证的既有断言；构建 Scenario 复用既有构建检查

- `[X]` 仅在已读测试代码、确认断言覆盖该 Scenario 的关键 THEN 时使用；同一 Scenario 的其余 THEN 未覆盖时，在 `- Coverage note:` 说明缺哪一部分，选中框不因此"升级"为全场景覆盖。
- 4 个 `生成生产产物` Scenario 复用既有精确构建检查 `npm run build`（`vite build`）；Assertion scope 只写该命令与其可观测产物真正能验证的范围：退出码 0、产物为页面级异步 chunk 结构、目标页面以独立异步 chunk 产出。源码/配置事实（`React.lazy` 与 `Suspense` 组织、`vite.config.js` 的 `manualChunks`、`requestManager.jsx`/`validateCmdArg.jsx` 的静态导入、`src/pages/Apply.jsx` 已清退）属人工核对，写在 Coverage note 中而不冒充 build 断言；chunk 体积与警告清单不是规格指标。不为此新增静态机械测试或静态文案测试。

### D5 主 sidecar 延后到 sync 成功之后

`openspec/specs/<capability>/test-plan.md` 本轮不写。官方 sync 成功后由 `anvil-test-plan` 按实际 synced 主规格回填；若 sync 失败/取消/被跳过，则不写未来映射。

## Risks / Trade-offs

- **jsdom 局限**：组件测试不覆盖真实浏览器渲染、真实 Ctrl 时序（如公告后台逐封发送、部分失败真实节奏），计划在 `Coverage note` 显式标注，不伪装覆盖。
- **装配类断言较薄**：`装配页面` 只断言路由路径与页面落位、权限守卫/快照来源；不重测布局样式，避免脆弱的视觉断言。
- **写计划的真实性风险**：新规划测试在 apply 前不存在，故一律 `[ ]`；不预写 locator 之外的断言细节，避免"伪造 locator"。review 会检查 `[X]` 与真实断言的一致性。
- **对账可能暴露实现偏差**：AdminProfile 空字段占位、Announcements 发送进度文案等细节需以实际 DOM 断言为准；若实测与规格不符，按约定只报告、不在本轮修实现，也不修改 Scenario 语义。
- **并行批次冲突**：新测试文件独享，避免与同批其他 change 在既有测试文件上交错；`npm test` 汇总数字不作为本计划的通过证据。
