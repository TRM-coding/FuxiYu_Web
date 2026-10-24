## Test Plan

<!-- Every scenario from specs/ mapped to a concrete test. The mapping is a floor, not a ceiling. -->

| Requirement | Scenario | Test File | Test Name | Initial State |
|-------------|----------|-----------|-----------|---------------|
| specs/frontend--authentication/spec.md → 容器资源能力独立于方法权限展开 | 相同方法列表但容器资源能力不同 | src/test/ContainerResourcePermission.test.jsx | test_auth_container_resource_capability | 🔴 red |
| specs/frontend--authentication/spec.md → 容器资源能力独立于方法权限展开 | 直持资源通配 | src/test/ContainerResourcePermission.test.jsx | test_auth_container_resource_capability | 🔴 red |
| specs/frontend--authentication/spec.md → 容器资源能力独立于方法权限展开 | 字段缺失或旧后端 | src/test/ContainerResourcePermission.test.jsx | test_auth_container_resource_capability | 🔴 red |
| specs/frontend--authentication/spec.md → 容器资源能力独立于方法权限展开 | 换账号或清空身份 | src/test/ContainerResourcePermission.test.jsx | test_auth_container_resource_capability | 🔴 red |
| specs/frontend--authentication/spec.md → 容器资源能力独立于方法权限展开 | 方法通配不得单独放行 | src/test/ContainerResourcePermission.test.jsx | test_auth_container_resource_capability | 🔴 red |
| specs/frontend--container-credentials/spec.md → 一次性凭据响应的结构校验 | 创建受理返回一项 | src/test/credentialResponse.test.js | test_credential_shape_and_counts | 🔴 red |
| specs/frontend--container-credentials/spec.md → 一次性凭据响应的结构校验 | 新增协作者受理返回一项 | src/test/credentialResponse.test.js | test_credential_shape_and_counts | 🔴 red |
| specs/frontend--container-credentials/spec.md → 一次性凭据响应的结构校验 | 详情页 ROOT 提升只返回 root | src/test/credentialResponse.test.js | test_credential_shape_and_counts | 🔴 red |
| specs/frontend--container-credentials/spec.md → 一次性凭据响应的结构校验 | Home 交接常规两项 | src/test/credentialResponse.test.js | test_credential_shape_and_counts | 🔴 red |
| specs/frontend--container-credentials/spec.md → 一次性凭据响应的结构校验 | 历史多 ROOT 全部保留 | src/test/credentialResponse.test.js | test_credential_shape_and_counts | 🔴 red |
| specs/frontend--container-credentials/spec.md → 一次性凭据响应的结构校验 | 恢复成功返回 root 凭据 | src/test/credentialResponse.test.js | test_credential_shape_and_counts | 🔴 red |
| specs/frontend--container-credentials/spec.md → 一次性凭据响应的结构校验 | 凭据项只带 login_name | src/test/credentialResponse.test.js | test_credential_shape_and_counts | 🔴 red |
| specs/frontend--container-credentials/spec.md → 一次性凭据响应的结构校验 | 登录名以响应为准 | src/test/credentialResponse.test.js | test_credential_shape_and_counts | 🔴 red |
| specs/frontend--container-credentials/spec.md → 旧响应与无凭据兼容 | 旧创建响应无凭据 | src/test/credentialResponse.test.js | test_credential_legacy_and_empty | 🔴 red |
| specs/frontend--container-credentials/spec.md → 旧响应与无凭据兼容 | 普通角色互换无凭据 | src/test/credentialResponse.test.js | test_credential_legacy_and_empty | 🔴 red |
| specs/frontend--container-credentials/spec.md → 旧响应与无凭据兼容 | 新流程缺少受理标志 | src/test/credentialResponse.test.js | test_credential_legacy_and_empty | 🔴 red |
| specs/frontend--container-credentials/spec.md → 凭据响应异常的脱敏 | 普通失败保留安全信息 | src/test/credentialResponse.test.js | test_credential_error_sanitization | 🔴 red |
| specs/frontend--container-credentials/spec.md → 凭据响应异常的脱敏 | 失败响应夹带密码 | src/test/credentialResponse.test.js | test_credential_error_sanitization | 🔴 red |
| specs/frontend--container-credentials/spec.md → 凭据响应异常的脱敏 | 安全 message 与密码同体 | src/test/credentialResponse.test.js | test_credential_error_sanitization | 🔴 red |
| specs/frontend--container-credentials/spec.md → 凭据响应异常的脱敏 | transfer_root:false 凭据不是恰好一项 | src/test/credentialResponse.test.js | test_credential_error_sanitization | 🔴 red |
| specs/frontend--container-credentials/spec.md → 凭据响应异常的脱敏 | transfer_root:true 凭据少于两项 | src/test/credentialResponse.test.js | test_credential_error_sanitization | 🔴 red |
| specs/frontend--container-credentials/spec.md → 受理前守卫与后台复核 | 前置守卫失败 | src/test/containerApiCredentials.test.js | test_guard_rejection_and_unknown_result | 🔴 red |
| specs/frontend--container-credentials/spec.md → 受理前守卫与后台复核 | 受理后最小复核 | src/test/containerApiCredentials.test.js | test_guard_rejection_and_unknown_result | 🔴 red |
| specs/frontend--container-credentials/spec.md → 受理前守卫与后台复核 | 后台结果未知 | src/test/containerApiCredentials.test.js | test_guard_rejection_and_unknown_result | 🔴 red |
| specs/frontend--container-credentials/spec.md → 审计复用且不重复记录 | 创建与新增协作者只留既有审计 | src/test/containerCredentialContract.test.js | test_audit_reuse_no_duplicate_logs | 🔴 red |
| specs/frontend--container-credentials/spec.md → 审计复用且不重复记录 | 重置使用固定操作码 | src/test/containerCredentialContract.test.js | test_audit_reuse_no_duplicate_logs | 🔴 red |
| specs/frontend--container-credentials/spec.md → 审计复用且不重复记录 | ROOT 各步沿用既有角色审计 | src/test/containerCredentialContract.test.js | test_audit_reuse_no_duplicate_logs | 🔴 red |
| specs/frontend--container-credentials/spec.md → 受控一次性密码弹窗 | 单凭据展示与复制 | src/test/CredentialModal.test.jsx | test_credential_modal_render_copy_close | 🔴 red |
| specs/frontend--container-credentials/spec.md → 受控一次性密码弹窗 | ROOT 交接两项展示 | src/test/CredentialModal.test.jsx | test_credential_modal_render_copy_close | 🔴 red |
| specs/frontend--container-credentials/spec.md → 受控一次性密码弹窗 | 关闭或卸载后不可再查看 | src/test/CredentialModal.test.jsx | test_credential_modal_render_copy_close | 🔴 red |
| specs/frontend--container-credentials/spec.md → 受控一次性密码弹窗 | 复制失败 | src/test/CredentialModal.test.jsx | test_credential_modal_render_copy_close | 🔴 red |
| specs/frontend--container-credentials/spec.md → 密码不进入持久化、日志与回查通道 | 打开与关闭弹窗无持久化 | src/test/CredentialModal.test.jsx | test_credential_no_persistence | 🔴 red |
| specs/frontend--container-credentials/spec.md → 密码不进入持久化、日志与回查通道 | 顶层 root_password 不进入 Web | src/test/CredentialModal.test.jsx | test_credential_no_persistence | 🔴 red |
| specs/frontend--container-credentials/spec.md → 密码不进入持久化、日志与回查通道 | 卸载不取消已受理任务 | src/test/CredentialModal.test.jsx | test_credential_no_persistence | 🔴 red |
| specs/frontend--container-credentials/spec.md → 密码不进入持久化、日志与回查通道 | 超时或断连不重复提交 | src/test/CredentialModal.test.jsx | test_credential_no_persistence | 🔴 red |
| specs/frontend--container-credentials/spec.md → 凭据入口统一且错误通道隔离 | 四个容器入口使用同一展示组件 | src/test/containerCredentialContract.test.js | test_credential_unified_entrances | 🔴 red |
| specs/frontend--container-credentials/spec.md → 凭据入口统一且错误通道隔离 | 错误路径不显示密码 | src/test/containerCredentialContract.test.js | test_credential_unified_entrances | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → 新增协作者凭据与不乐观加入 | 新增 ADMIN 协作者 | src/test/ContainerDetailPasswords.test.jsx | test_detail_add_collaborator_credentials | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → 新增协作者凭据与不乐观加入 | 新增 COLLABORATOR 协作者 | src/test/ContainerDetailPasswords.test.jsx | test_detail_add_collaborator_credentials | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → 新增协作者凭据与不乐观加入 | 新增受理失败或凭据异常 | src/test/ContainerDetailPasswords.test.jsx | test_detail_add_collaborator_credentials | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → 账号卡密码重置入口与权限 | ROOT 本人可见 | src/test/ContainerDetailPasswords.test.jsx | test_detail_reset_permission_guards | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → 账号卡密码重置入口与权限 | 资源管理通配者可见 | src/test/ContainerDetailPasswords.test.jsx | test_detail_reset_permission_guards | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → 账号卡密码重置入口与权限 | ADMIN、COLLABORATOR 与方法通配不得放行 | src/test/ContainerDetailPasswords.test.jsx | test_detail_reset_permission_guards | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → 账号卡密码重置入口与权限 | 缺少 container:operation 方法层守卫 | src/test/ContainerDetailPasswords.test.jsx | test_detail_reset_permission_guards | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → 账号卡密码重置入口与权限 | 容器不在线或主机不可用 | src/test/ContainerDetailPasswords.test.jsx | test_detail_reset_permission_guards | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → 账号卡密码重置入口与权限 | 目标绑定缺少 user_id 或提交前变化 | src/test/ContainerDetailPasswords.test.jsx | test_detail_reset_permission_guards | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → 账号卡密码重置入口与权限 | 不得回退到默认密码 | src/test/ContainerDetailPasswords.test.jsx | test_detail_reset_permission_guards | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → 账号卡密码重置请求与受理 | 只提交绑定身份 | src/test/ContainerDetailPasswords.test.jsx | test_detail_reset_request_and_result | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → 账号卡密码重置请求与受理 | 登录名以前端展示名伪装 | src/test/ContainerDetailPasswords.test.jsx | test_detail_reset_request_and_result | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → 账号卡密码重置请求与受理 | 受理后立即展示 | src/test/ContainerDetailPasswords.test.jsx | test_detail_reset_request_and_result | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → 账号卡密码重置请求与受理 | 后续结果只看 oplog | src/test/ContainerDetailPasswords.test.jsx | test_detail_reset_request_and_result | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → 账号卡密码重置请求与受理 | 重置失败不泄露密码 | src/test/ContainerDetailPasswords.test.jsx | test_detail_reset_request_and_result | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → 账号卡密码重置请求与受理 | 受理凭据数量或字段非法 | src/test/ContainerDetailPasswords.test.jsx | test_detail_reset_request_and_result | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → 详情页 ROOT 提升默认单目标 | 只提升目标 | src/test/ContainerDetailPasswords.test.jsx | test_detail_root_transfer_single_target | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → 详情页 ROOT 提升默认单目标 | 普通 ADMIN/COLLABORATOR 互换不生成密码 | src/test/ContainerDetailPasswords.test.jsx | test_detail_root_transfer_single_target | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → 详情页 ROOT 提升只展示 root 单凭据 | 只展示 root 一项 | src/test/ContainerDetailPasswords.test.jsx | test_detail_root_transfer_one_credential | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → 详情页 ROOT 提升只展示 root 单凭据 | 凭据不是恰好一项 | src/test/ContainerDetailPasswords.test.jsx | test_detail_root_transfer_one_credential | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → 详情页 ROOT 提升只展示 root 单凭据 | 提升失败或结果未知 | src/test/ContainerDetailPasswords.test.jsx | test_detail_root_transfer_one_credential | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → ContainerDetailPage 主流程 | 启动已受理 | src/test/ContainerDetailPasswords.test.jsx | test_detail_main_flow_password_integration | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → ContainerDetailPage 主流程 | 新增协作者先拿密码再加入 | src/test/ContainerDetailPasswords.test.jsx | test_detail_main_flow_password_integration | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → ContainerDetailPage 主流程 | 普通角色切换保持原响应 | src/test/ContainerDetailPasswords.test.jsx | test_detail_main_flow_password_integration | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → ContainerDetailPage 主流程 | 详情页 ROOT 提升受理后不等待后台 | src/test/ContainerDetailPasswords.test.jsx | test_detail_main_flow_password_integration | 🔴 red |
| specs/frontend--page-create-container/spec.md → 创建受理后立即展示一次性 root 密码 | 从主导航创建并立即拿到密码 | src/test/CreateContainerPassword.test.jsx | test_create_accepts_credentials_and_navigation | 🔴 red |
| specs/frontend--page-create-container/spec.md → 创建受理后立即展示一次性 root 密码 | 机器页带入机器与旧 Apply 重定向复用同一机制 | src/test/CreateContainerPassword.test.jsx | test_create_accepts_credentials_and_navigation | 🔴 red |
| specs/frontend--page-create-container/spec.md → 创建受理后立即展示一次性 root 密码 | 旧响应没有凭据 | src/test/CreateContainerPassword.test.jsx | test_create_accepts_credentials_and_navigation | 🔴 red |
| specs/frontend--page-create-container/spec.md → 创建受理后立即展示一次性 root 密码 | 已受理但凭据缺失或非法 | src/test/CreateContainerPassword.test.jsx | test_create_accepts_credentials_and_navigation | 🔴 red |
| specs/frontend--page-create-container/spec.md → 创建受理后立即展示一次性 root 密码 | 创建失败夹带密码 | src/test/CreateContainerPassword.test.jsx | test_create_accepts_credentials_and_navigation | 🔴 red |
| specs/frontend--page-create-container/spec.md → 创建受理后立即展示一次性 root 密码 | 关闭或离开页面后密码不可回看 | src/test/CreateContainerPassword.test.jsx | test_create_accepts_credentials_and_navigation | 🔴 red |
| specs/frontend--page-create-container/spec.md → CreateContainer 创建失败的错误呈现 | invalid_config 带具体数值 | src/test/CreateContainerPassword.test.jsx | test_create_error_safe_message | 🔴 red |
| specs/frontend--page-create-container/spec.md → CreateContainer 创建失败的错误呈现 | 机器离线 | src/test/CreateContainerPassword.test.jsx | test_create_error_safe_message | 🔴 red |
| specs/frontend--page-create-container/spec.md → CreateContainer 创建失败的错误呈现 | 创建权限不足 | src/test/CreateContainerPassword.test.jsx | test_create_error_safe_message | 🔴 red |
| specs/frontend--page-create-container/spec.md → CreateContainer 创建失败的错误呈现 | 失败响应夹带凭据字段 | src/test/CreateContainerPassword.test.jsx | test_create_error_safe_message | 🔴 red |
| specs/frontend--page-deleted-containers/spec.md → 恢复成功后的 root 凭据展示 | 恢复成功展示 root 密码 | src/test/DeletedContainersRestorePassword.test.jsx | test_deleted_restore_root_credential | 🔴 red |
| specs/frontend--page-deleted-containers/spec.md → 恢复成功后的 root 凭据展示 | requires_choice 不展示密码 | src/test/DeletedContainersRestorePassword.test.jsx | test_deleted_restore_root_credential | 🔴 red |
| specs/frontend--page-deleted-containers/spec.md → 恢复成功后的 root 凭据展示 | 恢复失败或凭据非法 | src/test/DeletedContainersRestorePassword.test.jsx | test_deleted_restore_root_credential | 🔴 red |
| specs/frontend--page-home/spec.md → Home 新增协作者凭据 | 新增 ADMIN 或 COLLABORATOR 后展示密码 | src/test/EditUserModalPasswords.test.jsx | test_home_add_collaborator_credentials | 🔴 red |
| specs/frontend--page-home/spec.md → Home 新增协作者凭据 | 新增失败或凭据异常 | src/test/EditUserModalPasswords.test.jsx | test_home_add_collaborator_credentials | 🔴 red |
| specs/frontend--page-home/spec.md → Home ROOT 交接只提交一次目标请求 | 只发一次目标请求且显式交接 | src/test/EditUserModalPasswords.test.jsx | test_home_root_transfer_request | 🔴 red |
| specs/frontend--page-home/spec.md → Home ROOT 交接双凭据且不伪装完成 | 人员弹窗关闭后展示全部凭据 | src/test/EditUserModalPasswords.test.jsx | test_home_root_transfer_credentials | 🔴 red |
| specs/frontend--page-home/spec.md → Home ROOT 交接双凭据且不伪装完成 | 部分完成不伪报成功 | src/test/EditUserModalPasswords.test.jsx | test_home_root_transfer_credentials | 🔴 red |
| specs/frontend--page-home/spec.md → Home ROOT 交接双凭据且不伪装完成 | 受理凭据少于两项或字段非法 | src/test/EditUserModalPasswords.test.jsx | test_home_root_transfer_credentials | 🔴 red |
| specs/frontend--page-home/spec.md → Home ROOT 交接双凭据且不伪装完成 | 交接失败 | src/test/EditUserModalPasswords.test.jsx | test_home_root_transfer_credentials | 🔴 red |
| specs/frontend--page-home/spec.md → Home ROOT 交接双凭据且不伪装完成 | 普通 ADMIN/COLLABORATOR 互换不生成密码 | src/test/EditUserModalPasswords.test.jsx | test_home_root_transfer_credentials | 🔴 red |

## Coverage Notes

- 上表每个 Scenario 映射到同一 Requirement 下的具名 Vitest 测试；一个测试可覆盖同 Requirement 的多个场景，均使用真实断言。
- Ctrl/Node 专属合同（oplog 操作码、后端 guard、Node 422 脱敏）在本仓不可直接执行；Web 侧用 API 请求/响应契约测试覆盖可见部分，Coverage Notes 不把其声称为真实后端验证。
- Web 全量：`npm test`（含生产入口集成测试）；构建：`npm run build`。
