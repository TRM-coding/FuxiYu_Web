# frontend--page-user Test Plan

Spec: [spec.md](spec.md)

## Current Mapping

### Requirement: User 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] `src/test/AnvilBasicPages.test.jsx::test_anvil_user_route_assembles_from_permission_snapshot`
- Assertion scope: 真实 `AppRoutes` + `PermissionProvider` + `MemoryRouter` 渲染 `/index/user`：`location.pathname` 为 `/index/user`，页面卡片标题「用户信息管理」出现；资料查询使用 `PermissionContext` 的 `userId` 快照（`localStorage` 中放置另一 id 时仍按快照 id 调用 `getUserDetailInformation`），不从 `localStorage` 推断授权。
- Coverage note: 仅断言后端资源主键来自快照而非本地存储，不重测布局样式。

### Requirement: User 主流程

#### Scenario: 退出登录成功

- Test/check:
  - [X] `src/test/AnvilBasicPages.test.jsx::test_anvil_user_logout_calls_backend_then_clears_auth_and_permission_and_replaces_root`
  - [X] `src/test/authHelpers.test.js::clearAuth 只清历史遗留的本地缓存，不碰 cookie`
- Assertion scope: 点击 `aria-label` 为「登出」的按钮后，先 `await logoutUser(...)` 调后端登出（后端失败也继续收尾、不误报成功），随后调用 `clearAuth()` 与 `PermissionContext` 的 `clear()`，最后以 `navigate('/', { replace: true })` 回登录页；`clearAuth` 只清历史遗留的 localStorage 身份缓存、不清 cookie（`auth_token` 为 HttpOnly）。
- Coverage note: 既有 `authHelpers.test.js` 覆盖 `clearAuth` 自身语义；本 Scenario 的 logout → clearAuth 顺序、权限快照清空与回落到 '/'（含后端失败仍收尾）由 `src/test/AnvilBasicPages.test.jsx` 用例断言。

### Requirement: User 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] `npm run build`
- Assertion scope: 既有 `vite build` 检查（`npm run build`）：退出码 0；构建输出为页面级异步 chunk 结构，`User` 以独立异步 chunk 产出、不与入口 chunk 合并。
- Coverage note: 该 check 只对构建命令与其可观测产物负责。`React.lazy`/`Suspense` 组织、`vite.config.js` 的 `manualChunks` 配置与 `requestManager.jsx`/`validateCmdArg.jsx` 的静态导入现状属人工核对事实，不由本 check 断言，也不新增静态机械测试；chunk 体积与警告清单不作为规格指标。
