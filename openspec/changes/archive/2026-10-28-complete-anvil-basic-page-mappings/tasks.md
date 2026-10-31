# Tasks

<!-- 仅补测试：不修改 app 代码、既有测试文件、共享 fixture、目录结构或依赖。
     任务复选框只表示任务完成，不是运行结果台账；结果留在测试日志与官方 verify。 -->

## 1. AdminProfile 对账实施（frontend--page-admin-profile）

- [x] 1.1 新增 `src/test/AnvilBasicPages.test.jsx` 并建立公共装配：真实 `AppRoutes` + 真实 `PermissionProvider` + `MemoryRouter`，为 `../api/user_api`、`../api/announcement_api`、`../api/machine_api`、`../api/container_api`、`../utils/showErrorModal` 提供替身，`../components/ModelViewer` 与兄弟页面 `../pages/Home`（非本批目标页面，沿用 `routeLoading.test.jsx` 的桩化惯例）以桩替代。验证：`npm run test:web -- src/test/AnvilBasicPages.test.jsx` 能收集到该文件用例（允许先有失败用例占位，最终以 1.2–4.3 通过为准）。
- [x] 1.2 实施 `frontend--page-admin-profile` / `Requirement: AdminProfile 页面入口与身份` / `Scenario: 装配页面` 两条规划映射：`test_anvil_adminprofile_route_assembles_from_permission_snapshot`（`/admin/profile` 落位、「管理员信息」可见、按 `PermissionContext` 快照 userId 查询而 `localStorage` 另一 id 不生效）与 `test_anvil_adminprofile_denies_without_bypass_and_navigates`（无 `bypass_auth_entity` 时 `showErrorModal` 收到 403、导航到 `/index`、不发起资料查询）。验证：两条测试名在定向运行中通过。
- [x] 1.3 实施 `frontend--page-admin-profile` / `Requirement: AdminProfile 主流程` / `Scenario: 资料查询成功`：`test_anvil_adminprofile_maps_user_info_fields_and_placeholders` 断言 username/email/graduation_year/容器数量按 user_info 映射，空 email 与空 graduation_year 渲染「未知」占位、空容器数量为空串占位，非 401 查询失败不弹框。验证：该测试名在定向运行中通过。

## 2. Apply 主流程既有 locator 复核（frontend--page-apply）

- [x] 2.1 定向复核 `frontend--page-apply` / `Requirement: Apply 主流程` / `Scenario: 通过旧表单提交创建` 与 `Scenario: 装配页面` 已列既有 locator：`src/test/legacyApplyRedirect.test.jsx`（4 例）、`src/test/CreateContainer.test.jsx::普通用户提交 payload 不带 owner_user_id（后端归一为自己）`、`src/test/ResourceLimits.test.jsx`（同口径取小提交、超限阻止两例）。验证：这些文件在定向运行中全部通过，且不改动其内容。

## 3. User 对账实施（frontend--page-user）

- [x] 3.1 实施 `frontend--page-user` / `Requirement: User 页面入口与身份` / `Scenario: 装配页面`：`test_anvil_user_route_assembles_from_permission_snapshot` 断言 `/index/user` 落位、「用户信息管理」可见、资料查询按权限快照 userId 而非 `localStorage` 副本。验证：该测试名在定向运行中通过。
- [x] 3.2 实施 `frontend--page-user` / `Requirement: User 主流程` / `Scenario: 退出登录成功`：`test_anvil_user_logout_calls_backend_then_clears_auth_and_permission_and_replaces_root` 断言先 `logoutUser`、再 `clearAuth` 与权限快照 `clear()`（探针由有实体变为空）、最后 `replace('/')`；后端登出失败时同样完成收尾。验证：该测试名在定向运行中通过。

## 4. Announcements 对账实施（frontend--page-announcements）

- [x] 4.1 实施 `frontend--page-announcements` / `Requirement: Announcements 页面入口与身份` / `Scenario: 装配页面`：`test_anvil_announcements_route_assembles_and_queries_lists_separately` 断言 `AdminLayout` 守卫下 `/admin/announcements` 落位、公告列表与私有草稿列表两个接口各自被调用且互不替代；无 manage 权限时被 403 拦截且不发起查询。验证：该测试名在定向运行中通过。
- [x] 4.2 实施同 capability / `Requirement: Announcements 主流程` / `Scenario: 后台尚未完成发送`：`test_anvil_announcements_shows_sending_progress_not_delivered` 断言受理前发送按钮 loading、受理后进度行为「发送中 0/1 条」、`message.success` 为受理文案、页面不出现「已完成 / 成功」终态。验证：该测试名在定向运行中通过。
- [x] 4.3 实施同 capability / `Requirement: Announcements 主流程` / `Scenario: 草稿无模板` 两条映射：`test_anvil_announcements_sends_saved_draft_content_without_template`（`batchSendDrafts` 请求体仅 `draft_ids`/`targets`、无 `template_id`，未调用模板接口，受理后进入轮询）与 `test_anvil_announcements_rejected_draft_shows_refusal_without_success_state`（403 带后端拒绝文案与 404/无 message 时缺省「批量发送失败」两路；`message.success` 不被调用，无「发送中 / 已完成」终态，勾选与收件人不清空，按钮退出 loading）。验证：两条测试名在定向运行中通过。

## 5. 构建、静态检查与计划回填

- [x] 5.1 一次 `npm run build` 覆盖 4 个 `Requirement: * 构建归属` / `Scenario: 生成生产产物` 的既有 check。验证：命令退出码 0 且产物为页面级异步 chunk 结构。
- [x] 5.2 `npm run lint`。验证：退出码 0，0 errors / 0 warnings。
- [x] 5.3 定向运行 `src/test/AnvilBasicPages.test.jsx` 与所列既有相关文件（`legacyApplyRedirect`、`CreateContainer`、`ResourceLimits`、`announcementSend`、`announcementDraftContract`、`authHelpers`）。验证：全部通过，0 failed / 0 skipped。
- [x] 5.4 核对实际断言后，仅把 `test-plan.md` 中已确认的 `[ ]` 映射行重算为 `[X]`；不改 locator、Assertion scope 或 Coverage note 语义，不写运行结果。验证：13 个 Scenario 的映射行与已实施测试逐一对应，`openspec validate --change complete-anvil-basic-page-mappings --strict` 通过。

## Workflow follow-up

- 官方 `openspec-verify-change` 简短 advisory 复核（不生成 verify artifact）。
- 官方 sync：确认 4 个 delta 成功落入主规格，保留 Purpose 与未触及内容。
- 对 4 个 capability 调用 `anvil-test-plan`，各写独立 canonical 主 sidecar（不加表格与运行台账，不复制整份 change 计划）。
- 官方 archive 到 `2026-10-28-complete-anvil-basic-page-mappings`（北京时间日期），归档前确认任务真实完成。
- 交付说明：不 commit、不 push（由父代理验收后提交）。
