# Design

## Context

- 规划根：`E:\AI\Fuxi\FuxiYu_Web`（`openspec context` 返回 `root.source=nearest`，使用本地 `openspec/specs` 与 `openspec/changes`）。
- 四个主规格已经存在：`frontend--authentication`（4 Requirement / 13 Scenario）、`frontend--page-login`（5 / 9）、`frontend--page-register`（6 / 11）、`frontend--page-rbac-matrix`（3 / 7），共 40 Scenario。
- 侧车现状：`frontend--authentication`、`frontend--page-login`、`frontend--page-register` 的 `test-plan.md` 仍保留“待复核”项；`frontend--page-rbac-matrix` 没有侧车。本 change 不写主侧车，sync 成功后由 `anvil-test-plan` 按实际主规格维护。
- 既有测试资源（本轮已读代码确证）：`Login.test.jsx`、`Register.test.jsx`、`loginViewerLazy.test.jsx`、`loginViewerFailure.test.jsx`、`routeLoading.test.jsx`、`RbacMatrix.test.jsx`、`rbacMatrixUtils.test.js`、`PermissionContext.test.jsx`、`apiAuthSignal.test.js`、`permissionControllerRelease.test.js`、`ContainerResourcePermission.test.jsx`、`ContainerDetailPasswords.test.jsx`、`containerActions.test.js`、`showErrorModalMap.test.js`。
- 测试环境：Vitest + jsdom，`setupFiles: './src/test/setup.js'`；构建检查为 `npm run build`（`vite build`）。
- 既有 change 目录仅有 `.openspec.yaml`，没有可续写的 proposal/specs/design/test-plan；本轮在原 change 上补齐，不新建重复 change。同期 Web basic-page change 与其 `AnvilBasicPages.test.jsx` 不在本设计写入范围。

## Goals / Non-Goals

**Goals:**

- 为 40 个 Scenario 建立可审查的 Requirement→Scenario→Test/check→Assertion scope 映射。
- 已读测试代码确证的映射标 `[X]`；未覆盖或只能部分覆盖的 THEN 标 `[ ]`，落到专属新测试文件。
- 让后续 apply 的改动面最小：只新增 `src/test/AnvilAuthPages.test.jsx` 与隔离的 `src/test/AnvilAuthContainerDetail.test.jsx`，不改既有测试与业务实现。
- 如实记录缺口：15 个计划测试、16 条 `[ ]` 映射，覆盖 15 个 Scenario。

**Non-Goals:**

- 不改任何业务实现、路由、构建配置、默认 schema、`openspec/config.yaml`、skills、CI 或 Git hooks。
- 不新增或调整 Requirement/Scenario 语义；不把主规格改成测试清单。
- 不为静态文案新增机械测试；不把 run/pass/时间戳写进计划。
- 不改主侧车；不创建 `review.md`、`tasks.md`、测试文件或 apply。
- 不处理与这 4 个 capability 无关的功能缺陷；对账若发现实现与规格不符，只报告。

## Decisions

### D1 用 MODIFIED 完整重述原 Requirement 块，而不是 ADDED

每个 capability 的 delta 以 `## MODIFIED Requirements` 承载主规格中原有 Requirement 的完整块，Requirement 名、Scenario 名与 WHEN/THEN 逐字一致；本轮不新增语义。理由：测试对账需要让 40 个 Scenario 进入 delta 与 test-plan，但不得借机改动主规格；`MODIFIED + 全文重述` 能让 sync 后主规格文本零漂移。备选 `ADDED` 会向主规格注入“测试对账”这种非业务要求，否决。

### D2 `[X]` 只给已从测试代码确证的断言，`[ ]` 集中到专属新测试文件

- `[X]` 只在已读测试文件、确认其断言覆盖该 Scenario 的关键 THEN 时使用；同一 Scenario 的其余 THEN 未覆盖时，用 `[ ]` 行或在 Coverage note 明确缺口，不把部分覆盖升级为全场景覆盖。
- 新增测试统一规划到 `src/test/AnvilAuthPages.test.jsx`（jsdom + `@testing-library/react`）；真实 `ContainerDetailPage` 组合单独放到 `src/test/AnvilAuthContainerDetail.test.jsx`，不改 detail-credential 批次的测试与组件。理由：与其他 Web 批次并行，改既有文件或复用其文件会交错并让既有 `[X]` 映射失稳。
- 规划测试清单（15 个，`[ ]` 行 16 条）：
  - `test_anvil_login_authenticated_snapshot_replaces_to_index`
  - `test_anvil_login_refresh_failure_still_enters_index`
  - `test_anvil_login_viewer_loading_keeps_form_and_submit_available`
  - `test_anvil_login_viewer_ready_keeps_form_and_submit_available`
  - `test_anvil_login_register_viewer_failure_keeps_both_routes`（同时服务 Login / Register 的模型失败 Scenario）
  - `test_anvil_login_network_failure_hides_english_original`
  - `test_anvil_register_viewer_loading_placeholder_keeps_form`
  - `test_anvil_register_viewer_ready_replaces_placeholder`
  - `test_anvil_register_conflict_retains_form_and_allows_corrected_retry`
  - `test_anvil_register_rejects_non_empty_invalid_username`
  - `test_anvil_permission_controller_unregister_is_idempotent`
  - `test_anvil_rbac_route_assembles_for_rbac_manage`
  - `test_anvil_rbac_denies_without_rbac_manage`
  - `test_anvil_rbac_save_refreshes_matrix_from_returned_group`
  - `test_anvil_container_detail_hides_reset_for_method_wildcard_without_resource_flag`（独立详情页文件）

### D3 交互类 Scenario 用真实组件行为，不用源码字符串或 mock 目标页

- 装配/路由类：使用真实 `AppRoutes` + 真实 `PermissionProvider` + `AdminLayout`/`LoginLayout` + `MemoryRouter`（需要断言 replace 时用 `createMemoryRouter` 的 `historyAction`），只替换 API、必要时错误弹窗、装饰性 `ModelViewer` 与非目标兄弟页（如 `Home`）。
- 主流程类：真实渲染 `Login`、`Register`、`RbacMatrix`、`ContainerDetailPage`，用可见文案、DOM 元素、`navigate`/history 动作、API 调用参数和状态变化断言，不搜索页面源码字符串。
- 例外：`Login 删除 userMsg…` 与 `Register 删除 validateMessages…` 这两个 Scenario 的 THEN 本身就是“源码中不存在”，静态读取该页面是精确检查；不把这个例外扩展到其他业务 Scenario。
- 3D 预览在 jsdom 无 WebGL，允许 mock `ModelViewer`；新文件用可控的挂起/抛错替身覆盖加载中、就绪与渲染失败三种边界，不声称真实 WebGL 渲染。

### D4 缺口按可观察行为落位，不用测试运行账本

- 缺口包括：登录认证快照 replace、登录成功但权限刷新失败仍进站、Login 3D 加载/就绪的提交入口与舞台内播报、共享登录布局失败时 `/register` 仍可达、Login 网络失败不展示英文原文、Register 三条 3D 加载 Scenario、Register 冲突后保留输入并用完整五字段重试、Register 非空非法用户名、controller 重复注销幂等、RbacMatrix 路由/`rbac:manage` 门禁、RbacMatrix 保存后按响应刷新、真实详情页中方法通配快照无重置入口。
- 每个缺口写成具体测试名与可观察断言；计划阶段不创建测试，不写 pass/fail、时间戳、覆盖数字或“已运行”声明。
- 对只能由 Ctrl 裁决的约束（验证码消费、组名唯一性、后端所有权）在 Coverage note 明确留在 Web 测试之外，不伪造前端覆盖。

### D5 构建 Scenario 复用既有精确构建检查

- 4 个 `生成生产产物` Scenario 使用精确命令 `npm run build`；Assertion scope 写明命令只证明退出码 0 与 `dist` 生成，页面/`ModelViewer` 的独立 chunk 与入口未包含其源码是对 `dist/assets` 的人工核对，不由退出码自动证明。
- `React.lazy`/`Suspense` 组织、`manualChunks` 配置、`requestManager.jsx`/`validateCmdArg.jsx` 的静态导入、chunk 体积与警告清单不作为 build 断言，最多作为人工核对事实写入 Coverage note；不新增静态机械测试。

### D6 主 sidecar 延后到 sync 成功之后

`openspec/specs/<capability>/test-plan.md` 本轮不写。官方 main-spec sync 成功后，由 `anvil-test-plan` 按实际 synced 主规格回填；若 sync 失败、取消或被跳过且主规格未同步，则不写未来映射。

## Risks / Trade-offs

- **jsdom 局限**：组件测试不覆盖真实浏览器、真实 WebGL、真实 Ctrl 时序（验证码消费、公告/权限后台状态）；这些限制写入 Coverage note，不伪装覆盖。
- **装配断言较薄**：路由/守卫类只断言路径、页面落位、权限快照来源与可见门禁，不重测布局样式，避免脆弱的视觉断言。
- **部分既有测试是静态检查**：Login/Register 的两个源码不存在 Scenario 以静态读取为精确检查；其他 Scenario 明确不靠源码字符串。
- **缺口测试在计划阶段未创建**：所有新规划行保持 `[ ]`，不预写 locator 之外的断言细节，避免“伪造 locator”；review 会核对 `[X]` 与真实断言的一致性。
- **对账可能暴露实现偏差**：若新测试发现页面行为与规格不符，按约定只报告，不在规划阶段修实现，也不修改 Scenario 语义。
- **并行批次冲突**：`AnvilAuthPages.test.jsx` 与隔离的 `AnvilAuthContainerDetail.test.jsx` 独享；不触碰 basic-page change 的 `AnvilBasicPages.test.jsx`，也不触碰 detail-credential 批次的测试与组件。
