# frontend--container-credentials Test Plan

Spec: [spec.md](spec.md)

## Current Mapping

### Requirement: 一次性凭据响应的结构校验

#### Scenario: 创建受理返回一项

- Test/check:
  - [X] ../../../src/test/CreateContainerPassword.test.jsx::test_create_accepts_credentials_and_navigation shows modal before navigating and reuses one create path
  - [X] ../../../src/test/credentialResponse.test.js::test_non_root_credentials_require_exactly_one_complete_item
- Assertion scope: 创建响应 `accepted: true`、`success: 1`、一项 `login_name=root` 时解析为一项并进入受控弹窗；创建页在导航前展示密码，保留既有成功路径。
- Coverage note: 无。

#### Scenario: 新增协作者受理返回一项

- Test/check:
  - [X] ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_add_collaborator_credentials shows password without optimistic account insert
  - [X] ../../../src/test/credentialResponse.test.js::test_non_root_credentials_require_exactly_one_complete_item
- Assertion scope: 新增 ADMIN/COLLABORATOR 响应一项时展示该凭据；使用响应 `login_name`，不把前端展示名当登录名，不插入未确认的本地账号。
- Coverage note: 页面用例走 COLLABORATOR；ADMIN 请求由 API 用例覆盖，详情页 ADMIN 渲染由本 change 的新增测试。

#### Scenario: 恢复成功返回 root 凭据

- Test/check:
  - [X] ../../../src/test/DeletedContainersRestorePassword.test.jsx::test_deleted_restore_root_credential shows root password, bypasses requires_choice, and keeps errors sanitized
  - [X] ../../../src/test/containerApiCredentials.test.js::test_deleted_restore_root_credential bypasses requires_choice and parses accepted root credential
- Assertion scope: 恢复实际成功并返回一项 root 凭据时展示“重置后root的密码：”；`requires_choice` 响应不展示密码，错误路径不含 secret。
- Coverage note: 无。

#### Scenario: 凭据项只带 login_name

- Test/check:
  - [X] ../../../src/test/credentialResponse.test.js::test_non_root_credentials_require_exactly_one_complete_item
  - [X] ../../../src/test/CredentialModal.test.jsx::test_credential_modal_render_copy_close renders exact lines, copies, closes and clears
- Assertion scope: 解析器接受仅含 `login_name`/`password` 的项，不要求或补造 `user_id`；共享弹窗只按这两个字段渲染。
- Coverage note: 无。

#### Scenario: 登录名以响应为准

- Test/check:
  - [X] ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_request_and_result submits bound user_id, shows one credential, and keeps errors secret-free
  - [X] ../../../src/test/CredentialModal.test.jsx::test_credential_modal_render_copy_close renders exact lines, copies, closes and clears
- Assertion scope: 账号卡展示名 `Alice` 与响应 `login_name=alice` 不同时，弹窗使用 `alice`；共享弹窗不使用本地推断的展示名。
- Coverage note: 无。

### Requirement: ROOT 交接凭据的结构校验

#### Scenario: ROOT 交接常规两项

- Test/check:
  - [X] ../../../src/test/credentialResponse.test.js::test_root_handover_accepts_two_or_more_distinct_complete_credentials
  - [X] ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_root_handover_sends_one_request_without_flag_and_shows_both_credentials
  - [X] ../../../src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_sends_one_request_without_flag_and_receives_two_credentials
- Assertion scope: 两个入口都只提交一次无 `transfer_root` 的 `update_role`；解析器保留原 owner 与永久 `root` 两项不同 login_name/password，不重排、不合并、不假设共享密码。
- Coverage note: 无。

#### Scenario: 历史多旧 ROOT 全部保留

- Test/check:
  - [X] ../../../src/test/credentialResponse.test.js::test_root_handover_accepts_two_or_more_distinct_complete_credentials
  - [X] ../../../src/test/RoleAdversarial.test.jsx::test_api_root_omits_flag_and_consumes_seeded_two_and_n_plus_one
  - [X] ../../../src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_preserves_n_plus_one_and_normal_role_swaps_password_free
- Assertion scope: 解析器与真实 API 原样保留 3 项 N+1；Home 回调收到 3 项，不截断、不丢弃旧 owner。
- Coverage note: 详情页逐项渲染 N+1 的专项测试见 `ContainerDetailPage 详情页 ROOT 交接展示全部凭据且不乐观更新 / 历史多个旧 owner 的 N+1 项全部展示`。

#### Scenario: ROOT 凭据必须完整且互不相同

- Test/check:
  - [X] ../../../src/test/credentialResponse.test.js::test_root_handover_rejects_short_duplicate_or_incomplete_credentials
  - [X] ../../../src/test/containerApiCredentials.test.js::test_root_update_rejects_single_credential_without_retry_or_second_request
  - [X] ../../../src/test/RoleAdversarial.test.jsx::test_api_root_rejects_single
  - [X] ../../../src/test/RoleAdversarial.test.jsx::test_api_root_rejects_empty
  - [X] ../../../src/test/RoleAdversarial.test.jsx::test_api_root_rejects_duplicate-login
  - [X] ../../../src/test/RoleAdversarial.test.jsx::test_api_root_rejects_duplicate-password
- Assertion scope: 少于 2 项、空数组、空字段、重复 login_name/password 或缺少 `root` 时整体拒绝，不展示部分密码、不重试、不写成功状态。
- Coverage note: RoleAdversarial 四行由 `it.each` 模板 `test_api_root_rejects_$label` 生成，label 为 `single`/`empty`/`duplicate-login`/`duplicate-password`。

### Requirement: 旧响应与无凭据兼容

#### Scenario: 旧创建响应无凭据

- Test/check:
  - [X] ../../../src/test/credentialResponse.test.js::test_credential_legacy_and_empty keeps legacy create and rejects missing acceptance for new flows
  - [X] ../../../src/test/CreateContainerPassword.test.jsx::test_create_accepts_credentials_and_navigation keeps legacy success without a fake modal
- Assertion scope: 解析器保留旧创建 `success: 1` 与 message；页面测试断言旧响应仍导航到 Home、不打开密码弹窗、不伪造密码。未断言页面 `message.success` 的具体 toast。
- Coverage note: 既有页面用例只覆盖导航与无密码弹窗；解析器保留 message 不等于页面 toast 已断言。

#### Scenario: 普通角色互换无凭据

- Test/check:
  - [X] ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_main_flow_password_integration keeps ordinary role change password-free and unknown results unconfirmed
  - [X] ../../../src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_preserves_n_plus_one_and_normal_role_swaps_password_free
- Assertion scope: 非 ROOT 的 ADMIN/COLLABORATOR 互换响应无凭据时沿用成功提示，不打开弹窗、不生成或改变密码。
- Coverage note: 无。

#### Scenario: 新流程缺少受理标志

- Test/check:
  - [X] ../../../src/test/credentialResponse.test.js::test_credential_legacy_and_empty keeps legacy create and rejects missing acceptance for new flows
  - [X] ../../../src/test/AnvilDetailCredentials.test.jsx::test_detail_credential_envelope_failures_never_render_passwords
- Assertion scope: 解析器对新增/重置/ROOT 缺少 `accepted: true` 直接拒绝；页面级专项测试覆盖详情页三个入口，断言不展示密码、显示通用未受理/响应异常，不按旧成功流程放行。
- Coverage note: 解析器已覆盖，详情页逐入口的页面级断言由专项测试覆盖。

### Requirement: 凭据响应异常的脱敏

#### Scenario: 普通失败保留安全信息

- Test/check:
  - [X] ../../../src/test/credentialResponse.test.js::test_credential_error_sanitization preserves safe message and strips secret/body
  - [X] ../../../src/test/containerApiCredentials.test.js::test_guard_rejection_and_unknown_result parses accepted credentials, applies no-store and keeps safe errors
  - [X] ../../../src/test/containerApiCredentials.test.js::test_422_detail_failure_is_safe_and_understandable
- Assertion scope: 400（`invalid_config`，含 8GB/4GB 数值）与 422（`invalid_payload`）均保留 status/route/error_reason 与安全 message；错误对象无原始 body、凭据或密码。
- Coverage note: 安全数值由 sanitization 用例断言，`invalid_payload` 由 422 用例断言，两者组合覆盖。

#### Scenario: 失败响应夹带密码

- Test/check:
  - [X] ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_request_and_result submits bound user_id, shows one credential, and keeps errors secret-free
  - [X] ../../../src/test/RoleAdversarial.test.jsx::test_api_root_error_with_sensitive_message_and_credentials_is_sanitized
  - [X] ../../../src/test/DeletedContainersRestorePassword.test.jsx::test_deleted_restore_root_credential shows root password, bypasses requires_choice, and keeps errors sanitized
- Assertion scope: 500/400 响应体夹带 `credentials`/`password` 时，错误 status/route/error_reason 可保留，但 message、错误对象与 `showErrorModal` 参数均不含密码或原始 body。
- Coverage note: console 未在这些失败用例中直接断言；`containerCredentialContract` 只断言成功请求未触发 console.error。

#### Scenario: 安全 message 与密码同体

- Test/check:
  - [X] ../../../src/test/credentialResponse.test.js::test_credential_error_sanitization preserves safe message and strips secret/body
  - [X] ../../../src/test/containerApiCredentials.test.js::test_guard_rejection_and_unknown_result parses accepted credentials, applies no-store and keeps safe errors
  - [X] ../../../src/test/CreateContainerPassword.test.jsx::test_create_error_safe_message preserves safe quota message and never shows a password
- Assertion scope: 响应同时含安全 message 数值与 `credentials`/`root_password` 时，错误保留 8GB/4GB 数值，同时剥离所有 secret 与 unsafe body；页面不显示密码。
- Coverage note: 无。

#### Scenario: ROOT 交接凭据少于两项或字段非法

- Test/check:
  - [X] ../../../src/test/credentialResponse.test.js::test_root_handover_rejects_short_duplicate_or_incomplete_credentials
  - [X] ../../../src/test/containerApiCredentials.test.js::test_root_update_rejects_single_credential_without_retry_or_second_request
- Assertion scope: ROOT 响应缺少数组、少于 2 项、空 login_name/password 或缺少 `root` 时整体拒绝，不展示部分密码、不自动重试、不写成功状态。
- Coverage note: 无。

#### Scenario: ROOT 交接凭据重复

- Test/check:
  - [X] ../../../src/test/credentialResponse.test.js::test_root_handover_rejects_short_duplicate_or_incomplete_credentials
  - [X] ../../../src/test/RoleAdversarial.test.jsx::test_api_root_rejects_duplicate-login
  - [X] ../../../src/test/RoleAdversarial.test.jsx::test_api_root_rejects_duplicate-password
- Assertion scope: 至少 2 项但 login_name 或 password 重复时整体拒绝，不展示任何部分密码、不自动重试、不写成功状态。
- Coverage note: RoleAdversarial 两行由 `it.each` 模板 `test_api_root_rejects_$label` 生成，label 为 `duplicate-login`/`duplicate-password`。

### Requirement: 受理前守卫与后台复核

#### Scenario: 前置守卫失败

- Test/check:
  - [X] ../../../src/test/ContainerMemberGuardErrors.test.jsx::离线新增成员：包装器保留 error_reason，并隐藏通用英文失败文案与 400 提示
  - [X] ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_add_collaborator_credentials shows password without optimistic account insert
  - [X] ../../../src/test/containerApiCredentials.test.js::test_guard_rejection_and_unknown_result parses accepted credentials, applies no-store and keeps safe errors
  - [X] ../../../src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability requires method, ROOT/resource and online guard for reset
- Assertion scope: Ctrl 在受理前拒绝时不返回密码，页面不打开密码弹窗，只按安全原因提示；新增失败响应即使夹带凭据，页面错误弹窗文本也不含 secret；reset UI 三层资格不满足时不发请求。
- Coverage note: Ctrl 真实前置 guard 属跨仓；Web 侧验证错误无密码、按钮门与请求体，不声称后端状态机已由本仓断言。

#### Scenario: 受理后最小复核

- Test/check:
  - [X] ../../../src/test/containerApiCredentials.test.js::test_audit_reuse_no_duplicate_logs sends add/reset requests without passwords and parses one credential
  - [X] ../../../src/test/containerApiCredentials.test.js::test_add_and_role_requests_use_web_contract_without_secrets
- Assertion scope: Web 的 add/reset/ROOT 请求体精确、每次调用只发一次 HTTP，不新增持久 DTO、租约或密码字段；create 请求也不夹带 `root_password`。
- Coverage note: Ctrl 后台执行前的最小既有 guard 复核不在 Web 仓；本行只证明 Web 不新增 DTO/请求，不证明后台复核结果。

#### Scenario: 后台结果未知

- Test/check:
  - [X] ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_main_flow_password_integration keeps ordinary role change password-free and unknown results unconfirmed
  - [X] ../../../src/test/ContainerDetailRefresh.test.jsx::test_reset_password_terminal_history_uses_chinese_label_without_password
- Assertion scope: 未知/失败结果不显示为 Node 已确认成功；历史只按成功/失败标签展示“重置容器密码”，密码不回查、不轮询。
- Coverage note: 未单独构造“未知”历史枚举；现有页面只有成功/失败标签，未知结果按失败呈现。

### Requirement: 审计复用且不重复记录

#### Scenario: 创建与新增协作者只留既有审计

- Test/check:
  - [X] ../../../src/test/containerCredentialContract.test.js::test_audit_reuse_no_duplicate_logs never puts passwords in requests and uses no-store
  - [X] ../../../src/test/ContainerDetailRefresh.test.jsx::test_async_add_operation_log_appears_after_background_history_refresh
- Assertion scope: Web 请求不含 password/root_password/credentials/login_name；新增终态历史只出现既有“添加协作者”标签，不含密码。
- Coverage note: Ctrl 的 CREATE/ADD_COLLABORATOR oplog 写入属跨仓；Web 侧只证明不新增密码请求/日志通道，不证明后端只写一条审计。

#### Scenario: 重置使用固定操作码

- Test/check:
  - [X] ../../../src/test/ContainerDetailRefresh.test.jsx::test_reset_password_terminal_history_uses_chinese_label_without_password
- Assertion scope: 历史记录 `reset_container_password` 映射为“重置容器密码”，不显示原始操作码或密码。
- Coverage note: 后端只写一条 oplog 的约束不在 Web 仓；Web 只验证展示映射。

#### Scenario: ROOT 各步沿用既有角色审计

- Test/check:
  - [X] ../../../src/test/containerApiCredentials.test.js::test_root_update_is_always_handover_without_flag_and_accepts_n_plus_one
  - [X] ../../../src/test/RoleAdversarial.test.jsx::test_api_root_omits_flag_and_consumes_seeded_two_and_n_plus_one
- Assertion scope: Web 的 ROOT 交接只发一次 `update_role`、无 `transfer_root`、无第二个 HTTP；失败错误不含 secret。
- Coverage note: Ctrl 各步 `UPDATE_COLLABORATOR_ROLE` oplog 与后台顺序属跨仓；Web 不新增密码交接日志。

### Requirement: 受控一次性密码弹窗

#### Scenario: 单凭据展示与复制

- Test/check:
  - [X] ../../../src/test/CredentialModal.test.jsx::test_credential_modal_render_copy_close renders exact lines, copies, closes and clears
  - [X] ../../../src/test/AnvilDetailCredentials.test.jsx::test_detail_single_credential_unmount_remount_no_lookup_no_abort_and_late_no_error
- Assertion scope: 既有弹窗测试用两项凭据断言逐行文案、复制与关闭清空；未证明 N=1 只渲染一行。新增测试用一项凭据断言只渲染一行、复制该项，并覆盖其卸载/重挂生命周期。
- Coverage note: 既有测试只覆盖多项逐行；单项只渲染一行见 `test_detail_single_credential_unmount_remount_no_lookup_no_abort_and_late_no_error` 行。

#### Scenario: ROOT 交接两项或 N+1 全部展示

- Test/check:
  - [X] ../../../src/test/CredentialModal.test.jsx::test_credential_modal_render_copy_close renders exact lines, copies, closes and clears
  - [X] ../../../src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_modal_shows_owner_and_root_then_close_clears_passwords
  - [X] ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_root_handover_sends_one_request_without_flag_and_shows_both_credentials
  - [X] ../../../src/test/AnvilDetailCredentials.test.jsx::test_detail_root_handover_renders_n_plus_one_credentials
- Assertion scope: 共享弹窗逐项使用各自 login_name/password，两项不合并、不省略；新增详情页测试断言 N+1 的 3 项全部渲染、不截断。
- Coverage note: 既有两项渲染与 Home N+1 透传已覆盖；详情页 N+1 渲染见 `test_detail_root_handover_renders_n_plus_one_credentials` 行。

#### Scenario: 关闭或卸载后不可再查看

- Test/check:
  - [X] ../../../src/test/CredentialModal.test.jsx::test_credential_modal_render_copy_close renders exact lines, copies, closes and clears
  - [X] ../../../src/test/RoleAdversarial.test.jsx::test_detail_open_credentials_are_closed_when_container_changes
  - [X] ../../../src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_modal_shows_owner_and_root_then_close_clears_passwords
  - [X] ../../../src/test/AnvilDetailCredentials.test.jsx::test_detail_escape_closes_and_clears_credentials
  - [X] ../../../src/test/AnvilDetailCredentials.test.jsx::test_detail_single_credential_unmount_remount_no_lookup_no_abort_and_late_no_error
- Assertion scope: 既有用例覆盖点击关闭、切换容器与 Home 关闭后密码从 DOM/父状态消失、storage 为空；未覆盖已打开凭据在卸载后的清理、重新挂载不显示、无查回请求。新增测试按 Esc 关闭；另一新增测试断言卸载后状态清空、重挂不显示、无凭据查回请求。
- Coverage note: 既有测试未按 Esc，也未覆盖卸载/重挂；Esc 见 `test_detail_escape_closes_and_clears_credentials` 行，卸载/重挂/无查回见 `test_detail_single_credential_unmount_remount_no_lookup_no_abort_and_late_no_error` 行。

#### Scenario: 复制失败

- Test/check:
  - [X] ../../../src/test/CredentialModal.test.jsx::test_credential_no_persistence does not store passwords or log them; copy failure is safe
  - [X] ../../../src/test/AnvilDetailCredentials.test.jsx::test_credential_copy_failure_keeps_password_visible_until_close
- Assertion scope: 既有用例断言剪贴板拒绝时显示普通“复制失败”反馈，console/localStorage/sessionStorage 不含密码；未断言错误提示后密码行仍可见。新增测试使用真实 `CredentialModal`，断言复制失败后密码行与密码仍可见，点击关闭后从 DOM 清除。
- Coverage note: 既有测试只覆盖失败提示与无持久化；密码行在关闭前仍可见、关闭后清除见 `test_credential_copy_failure_keeps_password_visible_until_close` 行。

#### Scenario: 旧容器、关闭或卸载后的凭据晚到

- Test/check:
  - [X] ../../../src/test/RoleAdversarial.test.jsx::test_detail_root_late_credentials_after_route_switch_do_not_render_on_new_container
  - [X] ../../../src/test/RoleAdversarial.test.jsx::test_detail_root_late_credentials_after_unmount_do_not_render
  - [X] ../../../src/test/RoleAdversarial.test.jsx::test_home_root_pending_disables_duplicate_and_closed_modal_ignores_late_credentials
  - [X] ../../../src/test/AnvilDetailCredentials.test.jsx::test_detail_single_credential_unmount_remount_no_lookup_no_abort_and_late_no_error
- Assertion scope: 既有测试断言详情切换容器、详情卸载、Home 弹窗关闭后晚到的 ROOT/新增响应不写密码、不提示受理成功、不重新打开旧弹窗；未断言 `showErrorModal` 未被调用。新增测试对详情晚到响应断言不弹错误窗、不写密码。
- Coverage note: 详情新增/重置的晚到响应未逐一构造；ROOT 会话逻辑已覆盖，新增/重置共用同一导航 epoch 守卫。晚到不弹错误见 `test_detail_single_credential_unmount_remount_no_lookup_no_abort_and_late_no_error` 行。

#### Scenario: ROOT 请求在途重复提交

- Test/check:
  - [X] ../../../src/test/RoleAdversarial.test.jsx::test_home_root_pending_disables_duplicate_and_closed_modal_ignores_late_credentials
- Assertion scope: Home 人员弹窗 ROOT 请求在途时角色控件 disabled；再次选择不产生第二次 `update_role`，完成后 finally 释放。
- Coverage note: 详情页角色选择也由 `peopleSaving` 禁用，但未单独断言重复提交；本场景按“人员弹窗”映射 Home。

### Requirement: 容器导航与凭据生命周期

#### Scenario: 切换容器立即清空已打开凭据与重置确认

- Test/check:
  - [X] ../../../src/test/RoleAdversarial.test.jsx::test_detail_open_credentials_are_closed_when_container_changes
  - [X] ../../../src/test/RoleAdversarial.test.jsx::test_detail_reset_confirm_is_cleared_when_container_changes
- Assertion scope: 已打开密码弹窗或重置确认框在容器 ID 变化后立即消失，新容器不显示旧凭据/确认框。
- Coverage note: 无。

#### Scenario: 离开后返回同一容器 ID 的旧响应拒绝

- Test/check:
  - [X] ../../../src/test/RoleAdversarial.test.jsx::test_detail_old_root_response_after_returning_to_same_container_is_rejected
- Assertion scope: A→B→A 后离开 A 前的旧 ROOT 响应晚到，导航 epoch 已变化，不写密码、不提示成功、不弹错误；不能仅因当前 ID 相同而接受。
- Coverage note: 无。

### Requirement: 密码不进入持久化、日志与回查通道

#### Scenario: 打开与关闭弹窗无持久化

- Test/check:
  - [X] ../../../src/test/CredentialModal.test.jsx::test_credential_no_persistence does not store passwords or log them; copy failure is safe
  - [X] ../../../src/test/containerApiCredentials.test.js::test_audit_reuse_no_duplicate_logs sends add/reset requests without passwords and parses one credential
- Assertion scope: 打开/关闭弹窗后 localStorage、sessionStorage、console 不含密码；凭据 POST 的 `cache: 'no-store'` 被断言。
- Coverage note: URL、IndexedDB、WSS、action 缓存与响应 `Cache-Control: no-store` 未在 Web 单测中断言；响应头属 Ctrl 跨仓。

#### Scenario: 顶层 root_password 不进入 Web

- Test/check:
  - [X] ../../../src/test/credentialResponse.test.js::test_credential_error_sanitization preserves safe message and strips secret/body
  - [X] ../../../src/test/RoleAdversarial.test.jsx::test_api_root_error_with_sensitive_message_and_credentials_is_sanitized
  - [X] ../../../src/test/AnvilDetailCredentials.test.jsx::test_detail_top_level_root_password_is_not_rendered_or_stored
- Assertion scope: 现有失败路径断言顶层 `root_password` 从错误 message/对象中剥离；专项测试用成功响应同时含 `root_password` 与 `credentials`，断言 UI、console、storage 与后续请求只用 `credentials`。
- Coverage note: 成功响应并含顶层 `root_password` 的场景无现有断言；专项测试覆盖。

#### Scenario: 卸载不取消已受理任务

- Test/check:
  - [X] ../../../src/test/AnvilDetailCredentials.test.jsx::test_detail_single_credential_unmount_remount_no_lookup_no_abort_and_late_no_error
- Assertion scope: 新增测试在请求已发出后卸载页面，断言 `fetch` 的 `AbortSignal` 未被 abort、没有取消/重发调用，后台响应仍可完成且不写已卸载页面状态；重挂后不显示旧密码、无查回请求。
- Coverage note: 既有测试未直接断言 AbortSignal；RoleAdversarial 卸载用例只验证晚到不渲染，不能证明未取消。

#### Scenario: 超时或断连不重复提交

- Test/check:
  - [X] ../../../src/test/AnvilDetailCredentials.test.jsx::test_detail_credential_timeout_shows_error_without_retry_or_password
- Assertion scope: 新增测试用受控超时/断连驱动详情重置，断言只发一次请求、不自动重试、不展示或持久化密码、不宣称成功或失败已由 Node 确认。
- Coverage note: 既有测试未覆盖凭据超时/重试；超时/断连行为见 `test_detail_credential_timeout_shows_error_without_retry_or_password` 行。

### Requirement: 凭据入口统一且错误通道隔离

#### Scenario: 四个容器入口使用同一展示组件

- Test/check:
  - [X] ../../../src/test/CreateContainerPassword.test.jsx::test_create_accepts_credentials_and_navigation shows modal before navigating and reuses one create path
  - [X] ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_add_collaborator_credentials shows password without optimistic account insert
  - [X] ../../../src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_modal_shows_owner_and_root_then_close_clears_passwords
  - [X] ../../../src/test/DeletedContainersRestorePassword.test.jsx::test_deleted_restore_root_credential shows root password, bypasses requires_choice, and keeps errors sanitized
- Assertion scope: 创建、详情新增、Home ROOT 交接、删除恢复四个真实入口均展示严格行文案的受控弹窗。
- Coverage note: 未证明四者组件同一性，也未逐入口断言 `showErrorModal` 未被调用；不使用 `containerCredentialContract` 的源码字符串检查作为行为证据。

#### Scenario: 错误路径不显示密码

- Test/check:
  - [X] ../../../src/test/CreateContainerPassword.test.jsx::test_create_error_safe_message preserves safe quota message and never shows a password
  - [X] ../../../src/test/DeletedContainersRestorePassword.test.jsx::test_deleted_restore_root_credential shows root password, bypasses requires_choice, and keeps errors sanitized
  - [X] ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_request_and_result submits bound user_id, shows one credential, and keeps errors secret-free
  - [X] ../../../src/test/RoleAdversarial.test.jsx::test_api_root_error_with_sensitive_message_and_credentials_is_sanitized
  - [X] ../../../src/test/credentialResponse.test.js::test_credential_error_sanitization preserves safe message and strips secret/body
- Assertion scope: 任一入口失败且响应/异常含密码字段时，只显示脱敏错误，不打开密码弹窗，原始 body 不进入错误弹窗参数。
- Coverage note: 现有失败用例断言错误参数/对象不含 secret 与 raw body；未逐一断言 console，成功路径的 console.error 由 contract 用例单独覆盖。
