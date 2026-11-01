# frontend--page-admin-profile Test Plan

Spec: [spec.md](spec.md)

## Current Mapping

### Requirement: AdminProfile 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] `src/test/AnvilBasicPages.test.jsx::test_anvil_adminprofile_route_assembles_from_permission_snapshot`
  - [X] `src/test/AnvilBasicPages.test.jsx::test_anvil_adminprofile_denies_without_bypass_and_navigates`
- Assertion scope: 真实 `AppRoutes` + `PermissionProvider` + `MemoryRouter` 渲染 `/admin/profile`（mock `../api/user_api` 的权限快照提供任一 manage 实体以通过 `AdminLayout` 守卫）：`location.pathname` 为 `/admin/profile`，页面标题「管理员信息」出现（`React.lazy` 装配 + 既有 `Suspense`，不新增加载 UI）；查询用户的 userId 取自 `PermissionContext` 快照（当 `localStorage` 里放另一 id 时仍按快照 id 查询 `getUserDetailInformation`），页面身份与后端资源主键分别处理；权限快照就绪后无 `bypass_auth_entity` 时 `showErrorModal` 收到 403 提示且 `handleAuthError` 导航到 `/index`。
- Coverage note: 「装配页面」THEN 的布局断言只到页面落位与标题可见，不做视觉/样式断言。拒入分支虽出自同一 Requirement 的权限约束，因该 Requirement 下无独立 Scenario，随本 Scenario 一并断言。

### Requirement: AdminProfile 主流程

#### Scenario: 资料查询成功

- Test/check:
  - [X] `src/test/AnvilBasicPages.test.jsx::test_anvil_adminprofile_maps_user_info_fields_and_placeholders`
- Assertion scope: mock `../api/user_api` 的 `getUserDetailInformation` 返回 `{ user_info: { username, email, graduation_year, amount_of_container } }` 后，`username`/`email`/`graduation_year`/「拥有容器」数量按 user_info 映射渲染；空 `email`、空 `graduation_year` 渲染现有占位「未知」，空 `amount_of_container` 沿用当前空串占位；查询失败（非 401）不弹框、不误报。
- Coverage note: 「空字段沿用当前占位行为」要求断言到具体占位文案（`未知` 与空串），不得只断言"渲染成功"。

### Requirement: AdminProfile 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] `npm run build`
- Assertion scope: 既有 `vite build` 检查（`npm run build`）：退出码 0；构建输出为页面级异步 chunk 结构，`AdminProfile` 以独立异步 chunk 产出、不与入口 chunk 合并。
- Coverage note: 该 check 只对构建命令与其可观测产物负责。`React.lazy`/`Suspense` 组织、`vite.config.js` 的 `manualChunks` 配置、`requestManager.jsx`/`validateCmdArg.jsx` 的静态导入现状属人工核对事实，不由本 check 断言，也不新增静态机械测试；chunk 体积与警告清单规格已写明属验收观测，非历史指标。
