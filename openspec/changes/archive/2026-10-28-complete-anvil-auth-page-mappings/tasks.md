# Tasks

## 1. AnvilAuthPages：Login 场景

- [x] 1.1 创建 `src/test/AnvilAuthPages.test.jsx` 的公共测试骨架：真实 `PermissionProvider`/`AppRoutes`/`MemoryRouter`，mock `user_api`、`rbac_api`、antd `message` 与可控 `ModelViewer`（挂起/就绪/抛错），并在 `afterEach` 清理弹窗与局部存储。完成后运行该文件，确认基础导入与首个 Login 用例可执行。
- [x] 1.2 实现 `frontend--page-login / Login 页面入口与身份 / 装配页面` 的 `test_anvil_login_authenticated_snapshot_replaces_to_index`：真实 `MemoryRouter` + `PermissionProvider` + `Login` + `useNavigationType` 探针（`createMemoryRouter` 数据路由在 jsdom 会触发 Request AbortSignal 不兼容），快照 `loaded:true`、`userId:7`，localStorage 放干扰 id；断言路径 `/index`、导航类型 REPLACE、登录表单移除、`loginUser` 未调用。运行该用例。
- [x] 1.3 实现 `frontend--page-login / Login 主流程 / 权限快照刷新失败` 的 `test_anvil_login_refresh_failure_still_enters_index`：login 成功、第二次 `getUserPermissions` 拒绝；断言 refresh 被调用、仍进 `/index`、`message.success` 被调用、无真实错误弹窗、payload 含 username/password/remember、localStorage 无身份副本。运行该用例。
- [x] 1.4 实现 `frontend--page-login / Login 登录布局与 3D 预览的独立加载` 的加载中/就绪/导入被拒绝三个测试，以及 `Login 删除 userMsg… / 网络失败仍显示中文兜底` 的 `test_anvil_login_network_failure_hides_english_original`：等待真实表单出现后断言提交按钮可用、`model-stage` 内无 `role=status`/`aria-live`；失败态 `/` 与 `/register` 均可达；网络弹窗含中文且不含英文原文。逐个运行这四个用例。

## 2. AnvilAuthPages：Register 场景

- [x] 2.1 实现 `frontend--page-register / Register 登录布局与 3D 预览的独立加载` 的加载中/就绪/导入被拒绝三个测试：真实 `/register`、真实表单、舞台占位/就绪/失败与 `/` 登录表单可达；`role=status`/`aria-live` 断言仅限 `model-stage`。运行这三个用例。
- [x] 2.2 实现 `frontend--page-register / Register 主流程 / 验证码验证失败或注册冲突` 的 `test_anvil_register_conflict_retains_form_and_allows_corrected_retry`：首次 `username_exists` 冲突后关闭真实错误弹窗，断言输入保留；修正用户名后第二次提交，断言 payload 五字段（username/password/email/graduation_year/registration_code）与同一验证码，随后出现注册成功弹窗。运行该用例。
- [x] 2.3 实现 `frontend--page-register / Register 删除无效 validateMessages 配置并保留字段规则 / 非法用户名仍显示字段规则消息` 的 `test_anvil_register_rejects_non_empty_invalid_username`：填入 `bad-name` 与合法其余字段，断言 `registerUser` 未调用且真实错误弹窗显示「用户名仅允许英文、数字和下划线」。运行该用例。

## 3. AnvilAuthPages：RbacMatrix 与控制器

- [x] 3.1 实现 `frontend--page-rbac-matrix / RbacMatrix 页面入口与身份 / 装配页面` 的 `test_anvil_rbac_route_assembles_for_rbac_manage` 与 `test_anvil_rbac_denies_without_rbac_manage`：真实 `AppRoutes` + `PermissionProvider` + `AdminLayout` 访问 `/admin/rbac`；有 `rbac:manage` 时断言标题、路径与 `getRbacMatrix` 调用，仅有 `user:manage` 时断言「403 - 无权限矩阵管理权限」且未取目录。运行这两个用例。
- [x] 3.2 实现 `frontend--page-rbac-matrix / RbacMatrix 主流程 / 保存有效权限组配置` 的 `test_anvil_rbac_save_refreshes_matrix_from_returned_group`：保存返回更新后的 group，断言「权限已保存」、`container:create` chip 的 `aria-label` 从 `开启` 变 `关闭` 且文案为「启用」。运行该用例。
- [x] 3.3 实现 `frontend--authentication / 权限查询必须在 finally 注销控制器 / 成功返回后释放控制器` 的 `test_anvil_permission_controller_unregister_is_idempotent`：真实 `requestManager` 创建控制器，`unregisterController` 调两次不抛错，`abortAll` 后 signal 未中止。运行该用例。

## 4. AnvilAuthContainerDetail：真实页面组合

- [x] 4.1 创建 `src/test/AnvilAuthContainerDetail.test.jsx` 并实现 `frontend--authentication / 容器资源能力独立于方法权限展开 / 方法通配不得单独放行` 的 `test_anvil_container_detail_hides_reset_for_method_wildcard_without_resource_flag`：真实 `ContainerDetailPage` + `PermissionProvider` + `MemoryRouter`，mock `container_api` 全部导出与 `user_api.getUserPermissions`/`listAllUserBrefInformation`；快照 `entities:['container:operation','container:manage','bypass_auth_entity']`、flag false、alice 非 ROOT、详情 online。断言页面加载 `train-a` 后无「重置密码」且 `resetContainerPassword` 未调用。运行该用例。

## 5. 定向测试与 lint

- [x] 5.1 一次运行两个新测试文件与相关原映射测试：`npm run test:web -- src/test/AnvilAuthPages.test.jsx src/test/AnvilAuthContainerDetail.test.jsx src/test/Login.test.jsx src/test/Register.test.jsx src/test/loginViewerLazy.test.jsx src/test/loginViewerFailure.test.jsx src/test/RbacMatrix.test.jsx src/test/PermissionContext.test.jsx src/test/permissionControllerRelease.test.js src/test/ContainerResourcePermission.test.jsx`，要求全部通过；若失败先判定是否为测试实现问题，出现业务不符或需改 plan 时停止并报告。
- [x] 5.2 仅对两个新文件运行定向 eslint：`npx eslint src/test/AnvilAuthPages.test.jsx src/test/AnvilAuthContainerDetail.test.jsx`，要求退出码 0；不改既有测试、页面、fixtures、依赖或配置。

## 6. Official verify（advisory）

- [x] 6.1 按官方 `openspec-verify-change` 流程核对 tasks、delta Scenario 与新增测试映射，输出 advisory 结论；不创建 `verify.md`、不伪造运行结果、不修改业务源码。

## Workflow follow-up

- 官方 main-spec sync：将 4 份 MODIFIED delta 幂等同步到 4 个主规格，保留原 Purpose、Requirement 与附录。
- 按 `anvil-test-plan` 为 4 个 capability 写 canonical main sidecars。
- 官方 archive 到 `openspec/changes/archive/2026-10-28-complete-anvil-auth-page-mappings`。
- 父代理验收后 commit；本批次不 commit/push。
