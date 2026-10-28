# Test Plan

## frontend--page-container-detail-page

### Requirement: ContainerDetailPage 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] src/test/DetailPages.test.jsx::container detail initializes with detail API and polls full authoritative detail
  - [X] src/test/routeLoading.test.jsx::容器详情路径仍匹配并解析 :containerId
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_detail_route_id_drives_api_and_backend_container_id_renders
- Assertion scope: 真实页面在 `/index/containers/12` 渲染标题、成员与详情请求；懒加载路由仍解析 `:containerId`。本变更新增测试用路由 12、后端 `container_id=99` 断言详情请求使用 12、页面身份展示 99，二者不互相覆盖。
- Coverage note: 现有测试未区分路由参数与后端资源主键；该分离行为见本 Scenario 的新增测试。

### Requirement: ContainerDetailPage 主流程

#### Scenario: 启动已受理

- Test/check:
  - [X] src/test/ContainerDetailEligibility.test.jsx::启动受理后权威轮询为 failed 时保持异常，不被受理结果覆盖
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_detail_start_accepted_shows_transition_then_server_online
- Assertion scope: 已断言启动请求成功、立即重取详情、权威 `failed` 不被受理结果覆盖且不残留“启动中”。本变更新增测试用受控详情响应断言受理后的“启动中”过渡态，以及后续权威 `online` 才收敛为运行中。
- Coverage note: 现有用例只覆盖权威失败终态，未直接断言过渡态与权威 online；本变更新增测试覆盖。

#### Scenario: 新增协作者先拿密码再加入

- Test/check:
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_add_collaborator_credentials shows password without optimistic account insert
  - [X] src/test/ContainerDetailRefresh.test.jsx::test_async_add_stale_immediate_refresh_then_background_detail_converges_without_manual_refresh
- Assertion scope: 受理后立即展示一项凭据；立即重取仍为旧成员时不乐观插入、不提示“已添加”；后续 5 秒完整详情出现新成员后无需手刷显示。
- Coverage note: 无。

#### Scenario: 普通角色切换保持原响应

- Test/check:
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_main_flow_password_integration keeps ordinary role change password-free and unknown results unconfirmed
  - [X] src/test/RoleAdversarial.test.jsx::test_detail_non_root_two_credentials_do_not_open_root_handover_modal
- Assertion scope: 非 ROOT 的 ADMIN/COLLABORATOR 切换沿用“角色已更新”，不显示密码弹窗；即使响应夹带两项凭据也不打开 ROOT 交接弹窗。
- Coverage note: 无。

#### Scenario: 详情页 ROOT 交接受理后不等待后台

- Test/check:
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_root_handover_sends_one_request_without_flag_and_shows_both_credentials
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_root_handover_waits_for_authoritative_detail_and_clears_passwords_on_close
- Assertion scope: 只发一次目标 `update_role`，请求体不含 `transfer_root`；受理后立即展示原 owner 与 `root` 两项；立即重取仍为旧角色时不提前改写本地角色，不等待 Node。
- Coverage note: 无。

### Requirement: ContainerDetailPage 详情权威事实周期收敛

#### Scenario: 受理后异步成员自动出现

- Test/check:
  - [X] src/test/ContainerDetailRefresh.test.jsx::test_async_add_stale_immediate_refresh_then_background_detail_converges_without_manual_refresh
- Assertion scope: 受理后立即重取仍为旧 `accounts`；下一拍后台完整详情包含新成员后，用户管理列表自动显示 `@bob · ID 3`，无手动刷新。
- Coverage note: 无。

#### Scenario: 角色变更与移除最终收敛

- Test/check:
  - [X] src/test/ContainerDetailRefresh.test.jsx::test_role_change_eventually_converges_from_authoritative_detail
  - [X] src/test/ContainerDetailRefresh.test.jsx::test_removal_eventually_converges_from_authoritative_detail
- Assertion scope: 立即重取仍为旧角色/旧成员时不改 DOM；后续完整详情返回 ADMIN 或移除后，角色标签或成员列表自动收敛，且不触发密码弹窗。
- Coverage note: 无。

#### Scenario: 运行状态与外部详情事实周期更新

- Test/check:
  - [X] src/test/ContainerDetailRefresh.test.jsx::test_external_detail_facts_refresh_on_background_tick
  - [X] src/test/DetailPages.test.jsx::container detail initializes with detail API and polls full authoritative detail
- Assertion scope: 周期完整详情更新冻结状态、长期勾选、磁盘、CPU、上次 SSH 与运行指标；周期请求使用 `POLL_TIMEOUT`，不再调用仅含状态的接口。
- Coverage note: 无。

#### Scenario: 隐藏页跳过与重新可见恢复

- Test/check:
  - [X] src/test/ContainerDetailRefresh.test.jsx::test_hidden_page_skips_background_refresh_and_visibility_restore_refreshes
- Assertion scope: `visibilityState=hidden` 时周期不请求详情或历史；恢复可见立即复读详情与历史，并显示新成员、新历史。
- Coverage note: 无。

#### Scenario: 后台失败保留、防并发

- Test/check:
  - [X] src/test/ContainerDetailRefresh.test.jsx::test_background_refresh_failure_keeps_existing_detail_without_error_modal
  - [X] src/test/ContainerDetailRefresh.test.jsx::test_background_refresh_is_reentrancy_guarded_before_request_pileup
- Assertion scope: 后台 reject 保留既有详情且不调用 `showErrorModal`；在途后台请求未结束时下一拍不叠加，完成后才再次请求。
- Coverage note: 无。

#### Scenario: 旧响应、换路由与卸载不回写

- Test/check:
  - [X] src/test/ContainerDetailRefresh.test.jsx::test_late_old_route_detail_response_does_not_overwrite_current_route
  - [X] src/test/ContainerDetailRefresh.test.jsx::test_unmount_during_detail_request_does_not_show_late_error
- Assertion scope: 旧容器晚到详情不覆盖新路由 `train-b`；卸载后晚到 reject 不弹错误。未直接构造“卸载后成功详情”的写入断言。
- Coverage note: 卸载后成功响应与错误响应共用 mounted/seq 守卫，但现有用例只覆盖错误晚到；不声称成功晚到已单独断言。

#### Scenario: 错误弹窗等待不占用后台刷新与 loading

- Test/check:
  - [X] src/test/ContainerDetailRefresh.test.jsx::test_foreground_error_modal_pending_does_not_hold_detail_inflight
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_detail_foreground_error_modal_releases_loading_before_wait
- Assertion scope: 既有用例断言 `showErrorModal` 返回 pending Promise 时，下一次周期仍能发起并完成完整详情请求；未断言前台请求网络结束时 loading 立即释放。新增测试断言前台失败后 spinner 立即消失，随后错误弹窗仍 pending。
- Coverage note: 既有测试只覆盖后台请求不被错误弹窗占用；loading 释放见本 Scenario 的 `test_detail_foreground_error_modal_releases_loading_before_wait` 行。

#### Scenario: 显式请求被 silent 请求淘汰后仍释放 loading

- Test/check:
  - [X] src/test/ContainerDetailRefresh.test.jsx::test_stale_non_silent_request_releases_loading_owned_by_its_lifecycle
- Assertion scope: 显式 A 在途、silent B 先返回空详情后，A 晚到被丢弃但其 network 生命周期结束即清除 loading；Spin 消失，不回写 A 的详情。
- Coverage note: 无。

#### Scenario: 旧路由慢请求不阻塞新页后台

- Test/check:
  - [X] src/test/ContainerDetailRefresh.test.jsx::test_old_route_pending_request_does_not_block_new_route_background_refresh
- Assertion scope: 旧容器 12 慢请求仍 pending 时，容器 13 的下一拍后台完整详情仍发起并显示新成员；旧响应不覆盖新路由。
- Coverage note: 无。

#### Scenario: 候选平台用户按需刷新

- Test/check:
  - [X] src/test/ContainerDetailRefresh.test.jsx::test_candidate_users_reload_when_dropdown_opens_without_periodic_platform_user_polling
- Assertion scope: 展开候选下拉触发一次平台用户重取并显示 `charlie`；5 秒周期后用户请求次数不再增加，未周期轮询平台用户列表。
- Coverage note: 无。

### Requirement: 成员增删改失败按既有守卫原因显示中文

#### Scenario: 离线移除成员

- Test/check:
  - [X] src/test/ContainerMemberGuardErrors.test.jsx::离线移除成员：显示中文原因，不残留英文守卫原文或通用 400 提示
- Assertion scope: 真实 Ctrl 400 `container_offline` 经真实 API、页面 catch 与真实错误弹窗显示“容器未在线，无法移除协作者”；无英文守卫、通用 400 或“未收录的错误原因”。
- Coverage note: 无。

#### Scenario: 冻结、异常或处理中拒绝成员动作

- Test/check:
  - [X] src/test/ContainerMemberGuardErrors.test.jsx::冻结容器更新角色：显示冻结中文原因，不退回未知原因或 409 通用提示
  - [X] src/test/ContainerMemberGuardErrors.test.jsx::冻结容器移除成员：同样映射为冻结中文原因
  - [X] src/test/ContainerMemberGuardErrors.test.jsx::$name：包装器 + 归一化 + 真实弹窗保留中文守卫原因
  - [X] src/test/ContainerMemberGuardErrors.test.jsx::401/403 保留专门认证/权限提示，不当作普通 400 或成员状态错误
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_detail_member_guard_failure_does_not_retry_or_bypass
- Assertion scope: 既有六类守卫矩阵由 API 包装器 + 真实错误弹窗验证，不渲染 `ContainerDetailPage`；页面级只覆盖 paused/offline 采样。新增测试在详情页对 add/update/remove 失败断言单次请求、无自动重试/绕过请求，且错误原因保留。
- Coverage note: 既有六类原因矩阵由真实 API 包装器 + 真实错误弹窗覆盖；页面级仅 add/update/remove 三操作采样；无自动重试与无绕过请求见 `test_detail_member_guard_failure_does_not_retry_or_bypass` 行，不把六类原因扩张为页面级 `[X]`。`$name` 行为 `it.each` 模板，具体 name 见 Assertion scope 的六类守卫矩阵。

### Requirement: 新增协作者凭据与不乐观加入

#### Scenario: 新增 ADMIN 协作者

- Test/check:
  - [X] src/test/containerApiCredentials.test.js::test_audit_reuse_no_duplicate_logs sends add/reset requests without passwords and parses one credential
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_detail_add_admin_collaborator_shows_one_credential_without_optimistic_insert
- Assertion scope: 现有 API 断言 `role: 'ADMIN'` 请求体、一项凭据与 `cache: 'no-store'`；本变更新增页面级测试选择 ADMIN，断言只展示一项凭据、不立即插入账号、不提示“已加入”。
- Coverage note: 没有现有页面用例显式选择 ADMIN；现有 Home/详情新增用例走默认 COLLABORATOR，故 UI 行为由本变更新增测试覆盖。

#### Scenario: 新增 COLLABORATOR 协作者

- Test/check:
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_add_collaborator_credentials shows password without optimistic account insert
  - [X] src/test/ContainerDetailRefresh.test.jsx::test_async_add_stale_immediate_refresh_then_background_detail_converges_without_manual_refresh
- Assertion scope: 请求体精确为 `{ user_id, container_id, role: 'COLLABORATOR' }`；受理后展示一项响应凭据，不发送前端账号名/密码/默认口令，不乐观插入。
- Coverage note: 无。

#### Scenario: 新增受理失败或凭据异常

- Test/check:
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_add_collaborator_credentials shows password without optimistic account insert
  - [X] src/test/credentialResponse.test.js::test_non_root_credentials_require_exactly_one_complete_item
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_detail_credential_envelope_failures_never_render_passwords
- Assertion scope: 现有页面用例覆盖 422 失败时不显示凭据、不提示成功、只调用错误弹窗；解析器覆盖空数组、多项与空字段拒绝。本变更新增测试覆盖 `accepted: true` 但项数/字段非法的增删改入口，断言不出现任何部分密码。
- Coverage note: 现有页面用例未构造 `accepted: true` 的非法凭据；解析器拒绝与页面 catch 的组合覆盖由本变更新增测试覆盖。

### Requirement: 账号卡密码重置入口与权限

#### Scenario: ROOT 本人可见

- Test/check:
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_permission_guards requires method, ROOT/resource and online, and only detail page
- Assertion scope: ROOT 绑定本人、`container:operation`、在线时两个账号卡均出现“重置密码”按钮。
- Coverage note: 无。

#### Scenario: 资源管理通配者可见

- Test/check:
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_permission_guards requires method, ROOT/resource and online, and only detail page
- Assertion scope: 非 ROOT、`containerResourceUnrestricted=true`、有方法权限时账号卡仍显示“重置密码”，不要求 ROOT 绑定。
- Coverage note: 无。

#### Scenario: ADMIN、COLLABORATOR 与方法通配不得放行

- Test/check:
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_permission_guards requires method, ROOT/resource and online, and only detail page
  - [X] src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability requires method, ROOT/resource and online guard for reset
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_detail_reset_hidden_for_admin_and_bypass_entity_without_resource
- Assertion scope: 页面用例覆盖非 ROOT COLLABORATOR 不显示按钮；helper 断言 ADMIN 且资源不通配时 `visible=false`。本变更新增页面级测试直接覆盖 ADMIN 与仅 `bypass_auth_entity` 且资源不通配时不显示按钮、不发请求。
- Coverage note: 现有页面用例未单独渲染 ADMIN/bypass 身份；helper 不是页面渲染断言，故本变更新增测试覆盖。

#### Scenario: 缺少 container:operation 方法层守卫

- Test/check:
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_permission_guards requires method, ROOT/resource and online, and only detail page
  - [X] src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability requires method, ROOT/resource and online guard for reset
- Assertion scope: 无 `container:operation` 时页面不渲染“重置密码”；helper 的 `visible=false` 保证不发请求。规格允许隐藏或禁用并给出原因；当前实现选择隐藏且未展示原因。
- Coverage note: 未展示方法权限原因，且“隐藏或禁用并给出原因”的断句存在歧义；本行只映射隐藏与不发请求，不宣称原因展示已覆盖。

#### Scenario: 容器不在线或主机不可用

- Test/check:
  - [X] src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability requires method, ROOT/resource and online guard for reset
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_detail_reset_disabled_for_offline_host_offline_and_maintenance
- Assertion scope: helper 断言 `offline` 时 `visible=true`、`enabled=false`；本变更新增页面级测试覆盖 offline、host_offline、host_maintenance 与过渡态下按钮禁用、点击不打开确认、不发请求。
- Coverage note: 现有用例只测 helper 的 offline，未覆盖页面级 host/过渡态；本变更新增测试覆盖。

#### Scenario: 目标绑定缺少 user_id 或提交前变化

- Test/check:
  - [ ] src/test/AnvilDetailCredentials.test.jsx::test_detail_reset_missing_user_id_disabled_reason_without_request
  - [ ] src/test/AnvilDetailCredentials.test.jsx::test_detail_reset_presubmit_change_warns_without_request_or_password
- Assertion scope: 这两个暂缓定位的预期是：缺失有效 `user_id` 时，“重置密码”按钮禁用并显示原因，点击不打开确认、不发 reset 请求、不出现密码；确认框打开后容器变为离线/维护/过渡态时，提交提示状态原因、关闭确认、不发请求、不出现密码。这里保留规格要求，不表示当前实现已经满足；断言只要求可见原因/警告，不绑定精确修复文案。
- Coverage note: 当前实现缺用户 ID 时按钮禁用但没有该原因，确认前状态变化时静默关闭。用户决定本轮只记录这两项缺陷，暂缓业务修复及这两个依赖回归；定位保持 `[ ]`、尚未创建、不执行，不加 skip/xfail，不应用外部修正草案。对应 Global QUESTIONS.md Q76（源码确认、修复暂缓）。本计划 23 个唯一定位中，21 个独立测试按本计划实施，2 个暂缓定位保持 `[ ]`；本 Scenario 仍未覆盖。

#### Scenario: 不得回退到默认密码

- Test/check:
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_request_and_result submits bound user_id, shows one credential, and keeps errors secret-free
  - [X] src/test/containerApiCredentials.test.js::test_audit_reuse_no_duplicate_logs sends add/reset requests without passwords and parses one credential
  - [X] src/test/containerCredentialContract.test.js::test_audit_reuse_no_duplicate_logs never puts passwords in requests and uses no-store
- Assertion scope: 重置请求体精确为 `{ container_id, user_id }`，无 `login_name`/`password`/`username`；页面只展示响应 `credentials` 中的密码。未显式断言字符串 `user123`/`owner123`，但请求体精确断言排除了默认口令发送。
- Coverage note: 无默认口令的显式否定断言；由精确请求体与只消费响应凭据组合覆盖。

### Requirement: 账号卡密码重置请求与受理

#### Scenario: 只提交绑定身份

- Test/check:
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_request_and_result submits bound user_id, shows one credential, and keeps errors secret-free
  - [X] src/test/containerApiCredentials.test.js::test_audit_reuse_no_duplicate_logs sends add/reset requests without passwords and parses one credential
- Assertion scope: 页面调用 `resetContainerPassword({ container_id: 12, user_id: 2 })`；API 请求体精确只有 `container_id` 与 `user_id`。
- Coverage note: 无。

#### Scenario: 登录名以前端展示名伪装

- Test/check:
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_request_and_result submits bound user_id, shows one credential, and keeps errors secret-free
  - [X] src/test/CredentialModal.test.jsx::test_credential_modal_render_copy_close renders exact lines, copies, closes and clears
- Assertion scope: 账号卡展示名为 `Alice` 时，弹窗使用响应 `login_name=alice`，文案为“重置后alice的密码：”；共享弹窗只消费传入的 `login_name`。
- Coverage note: 无。

#### Scenario: 受理后立即展示

- Test/check:
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_request_and_result submits bound user_id, shows one credential, and keeps errors secret-free
- Assertion scope: 重置 response 到达后立即出现“重置后alice的密码：”，不等待容器状态或 Node，不发起密码轮询。
- Coverage note: 无。

#### Scenario: 后续结果只看 oplog

- Test/check:
  - [X] src/test/ContainerDetailRefresh.test.jsx::test_reset_password_terminal_history_uses_chinese_label_without_password
- Assertion scope: 周期历史返回 `reset_container_password` 后显示“重置容器密码”，不显示原始操作码或密码；历史列表不含密码。
- Coverage note: 未单独断言 toast 是否宣称密码已生效，也未单独构造 oplog 的未知结果文案；现有历史只显示成功/失败标签，密码不回查。

#### Scenario: 重置失败不泄露密码

- Test/check:
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_request_and_result submits bound user_id, shows one credential, and keeps errors secret-free
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_detail_reset_failure_keeps_console_free_of_password
- Assertion scope: 既有用例断言 409 失败响应夹带 `credentials: [{ password: 'secret' }]` 时，错误弹窗参数与 message 不含 `secret`，不打开密码弹窗，保留账号与角色展示；未断言 console 通道。新增测试 spy `console.error`/`console.log`，断言无密码或原始 body。
- Coverage note: 既有测试只覆盖错误弹窗与错误对象；console 不泄密见 `test_detail_reset_failure_keeps_console_free_of_password` 行。

#### Scenario: 受理凭据数量或字段非法

- Test/check:
  - [X] src/test/credentialResponse.test.js::test_non_root_credentials_require_exactly_one_complete_item
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_detail_credential_envelope_failures_never_render_passwords
- Assertion scope: 解析器拒绝空数组、多项、空 `login_name`/`password`；本变更新增页面级测试覆盖 `accepted: true` 但项数/字段非法的重置响应，断言无部分密码、显示通用响应异常、不自动重试。
- Coverage note: 现有页面用例未构造非法 `accepted` 响应；本变更新增测试覆盖。

### Requirement: 详情页 ROOT 上位统一交接

#### Scenario: 只提交一次无分支交接请求

- Test/check:
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_root_handover_sends_one_request_without_flag_and_shows_both_credentials
  - [X] src/test/RoleAdversarial.test.jsx::test_detail_root_rejection_does_not_fake_success_or_credentials
  - [X] src/test/RoleAdversarial.test.jsx::test_api_root_omits_flag_and_consumes_seeded_two_and_n_plus_one
- Assertion scope: 只发一次目标 `update_role`，请求体精确 `{ container_id, user_id, updated_role: 'ROOT' }`，无 `transfer_root`；不调用旧 ROOT 降级请求，不要求旧 ROOT 凭据。
- Coverage note: 无。

#### Scenario: 普通 ADMIN/COLLABORATOR 互换不生成密码

- Test/check:
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_main_flow_password_integration keeps ordinary role change password-free and unknown results unconfirmed
  - [X] src/test/RoleAdversarial.test.jsx::test_detail_non_root_two_credentials_do_not_open_root_handover_modal
- Assertion scope: 非 ROOT 角色切换只调用既有 updateRole，显示“角色已更新”，不打开密码弹窗、不生成密码；响应即使夹带两项凭据也不展示。
- Coverage note: 无。

### Requirement: 详情页 ROOT 交接展示全部凭据且不乐观更新

#### Scenario: 展示原 owner 与 root 两项

- Test/check:
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_root_handover_sends_one_request_without_flag_and_shows_both_credentials
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_root_handover_waits_for_authoritative_detail_and_clears_passwords_on_close
- Assertion scope: 弹窗逐项显示“重置后root_user的密码：”和“重置后root的密码：”，不省略原 owner、不只展示 root，不合并为一项。
- Coverage note: 无。

#### Scenario: 历史多个旧 owner 的 N+1 项全部展示

- Test/check:
  - [X] src/test/credentialResponse.test.js::test_root_handover_accepts_two_or_more_distinct_complete_credentials
  - [X] src/test/RoleAdversarial.test.jsx::test_api_root_omits_flag_and_consumes_seeded_two_and_n_plus_one
  - [X] src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_preserves_n_plus_one_and_normal_role_swaps_password_free
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_detail_root_handover_renders_n_plus_one_credentials
- Assertion scope: 解析器保留 3 项、HTTP 边界返回 3 项、Home 回调收到 3 项；本变更新增详情页测试断言弹窗逐项显示 3 项 login_name 与密码，不截断为两项。
- Coverage note: 现有断言覆盖解析、API 与 Home 透传，未直接渲染详情页 N+1；本变更新增测试覆盖。

#### Scenario: 凭据少于两项、重复或字段非法

- Test/check:
  - [X] src/test/credentialResponse.test.js::test_root_handover_rejects_short_duplicate_or_incomplete_credentials
  - [X] src/test/containerApiCredentials.test.js::test_root_update_rejects_single_credential_without_retry_or_second_request
  - [X] src/test/RoleAdversarial.test.jsx::test_api_root_rejects_single
  - [X] src/test/RoleAdversarial.test.jsx::test_api_root_rejects_empty
  - [X] src/test/RoleAdversarial.test.jsx::test_api_root_rejects_duplicate-login
  - [X] src/test/RoleAdversarial.test.jsx::test_api_root_rejects_duplicate-password
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_detail_credential_envelope_failures_never_render_passwords
- Assertion scope: 解析器与真实 API 拒绝少于两项、空字段、重复 login_name/password；本变更新增页面级测试断言非法 `accepted` 响应不产生部分密码、不乐观改写角色、只显示通用响应异常。
- Coverage note: 现有页面用例只覆盖 reject 失败路径，未构造非法 `accepted` 响应；本变更新增测试覆盖。其中 RoleAdversarial 四行由 `it.each` 模板 `test_api_root_rejects_$label` 生成，label 为 `single`/`empty`/`duplicate-login`/`duplicate-password`。

#### Scenario: 目标成为 ROOT 不乐观更新

- Test/check:
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_root_handover_waits_for_authoritative_detail_and_clears_passwords_on_close
- Assertion scope: 受理后立即重取仍返回旧角色时，目标行保持“协作者”、不提前显示“超级管理员”；完整详情返回旧 ROOT→ADMIN、目标→ROOT 后才更新。
- Coverage note: 无。

#### Scenario: 提升失败或结果未知

- Test/check:
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_root_handover_failure_shows_error_without_credentials_or_success
  - [X] src/test/RoleAdversarial.test.jsx::test_detail_root_rejection_does_not_fake_success_or_credentials
- Assertion scope: 失败/拒绝时不打开或保留密码弹窗，不提示“ROOT 交接请求已受理”或 Node 已确认，不改变本地角色；只显示脱敏错误。
- Coverage note: 无。

#### Scenario: 关闭弹窗清空全部密码

- Test/check:
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_root_handover_waits_for_authoritative_detail_and_clears_passwords_on_close
  - [X] src/test/RoleAdversarial.test.jsx::test_detail_open_credentials_are_closed_when_container_changes
- Assertion scope: 点击关闭后两项密码从 DOM 消失，`localStorage`/`sessionStorage` 为空；切换容器时已打开凭据立即消失，无查回请求。
- Coverage note: 未直接按 Esc；Esc 关闭由凭据 capability 的本变更新增测试覆盖。

### Requirement: ContainerDetailPage 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] src/test/routeLoading.test.jsx::容器详情路径仍匹配并解析 :containerId
  - [X] src/test/loginViewerLazy.test.jsx::viewer 模块未完成时：右侧是空占位，左侧登录表单照常可用
  - [X] npm run build
- Assertion scope: 路由测试证明详情页与布局懒加载后仍保留路径含义与 Suspense；viewer 测试证明 three 相关模块独立加载。`npm run build` 只证明构建命令成功，不自动断言 `dist/assets` 的 chunk 组成或警告。
- Coverage note: `dist/assets` 中页面/ModelViewer 异步 chunk、入口不含其代码、无静态/动态双导入警告需 apply 阶段人工核对；chunk 体积与警告清单是观测项，不作为固定历史指标，也没有自动化 locator。

### Requirement: ContainerDetailPage 容器动作使用共享结果

#### Scenario: 与其他页面同上下文一致

- Test/check:
  - [X] src/test/containerActionMatrix.test.js::同一 online 容器在 ROOT 下：启停/删除/长期启用口径明确
  - [X] src/test/containerActionMatrix.test.js::同一容器同上下文在 status 矩阵下删除/启停/解冻一致
  - [X] src/test/ContainerDetailEligibility.test.jsx::COLLABORATOR 无资源角色不显示删除/启停，长期入口保留但禁用
- Assertion scope: 共享 resolver 对同一容器/状态/权限给出统一 visible/enabled/reason；详情页实际渲染消费该结论，COLLABORATOR 无资源角色时不显示删除/启停、长期入口禁用并带原因。
- Coverage note: 未逐页重放 Home/ManageMachine/ManageUser 的完整 DOM；跨页一致性由共享 resolver 矩阵支撑。

#### Scenario: 失败容器可删除、过渡态不可删除

- Test/check:
  - [X] src/test/ContainerDetailEligibility.test.jsx::删除状态 %s disabled=%s
  - [X] src/test/DetailPages.test.jsx::container detail delete button opens confirm and calls delete API after confirmation
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_detail_delete_disabled_reason_and_no_request
- Assertion scope: 既有用例断言 `failed` 删除启用、过渡/主机/未知状态删除禁用，以及确认后实际调用 `deleteContainer(12)`；未断言禁用按钮的 title 原因与“不发送删除请求”。新增测试按共享 resolver 的 reason 断言 title 为非空中文原因，点击禁用按钮不打开确认、不调用 `deleteContainer`。
- Coverage note: `删除状态 %s disabled=%s` 是 `it.each` 模板，参数为上述状态与对应 disabled 断言；reason 与 no-request 见 `test_detail_delete_disabled_reason_and_no_request` 行。

#### Scenario: 长期配额、磁盘与冻结残留

- Test/check:
  - [X] src/test/ContainerDetailEligibility.test.jsx::长期既有字段拒绝只禁用长期，删除仍可用
  - [X] src/test/ContainerDetailEligibility.test.jsx::长期取消：paused 禁用；online 冻结行残留允许；409 重读且不伪造 checked
  - [X] src/test/containerActionMatrix.test.js::冻结行残留不参与资格：online/offline 仍可取消长期
  - [X] src/test/containerActions.test.js::启用方向：配额 false / 磁盘 100% 禁用，缺字段或未达阈值不额外禁用
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_detail_long_term_disk_100_only_disables_enable
- Assertion scope: 纯 resolver 分别断言配额 false（`long_term_limit_reached`）与磁盘 100%（`disk_usage_over_limit`）单分支；既有页面用例断言配额+磁盘组合、paused 取消禁用、online/offline 冻结行残留仍可取消、409 重读不伪造 checked，删除仍可用。新增页面测试只给磁盘 100%、配额可启用，断言长期勾选禁用并显示磁盘原因，删除仍可用。
- Coverage note: 既有页面用例同时设置配额与磁盘时只命中配额原因；磁盘-only 的 resolver 分支由 `containerActions` 用例覆盖，页面磁盘-only 渲染见 `test_detail_long_term_disk_100_only_disables_enable` 行。

#### Scenario: 提交前重解析

- Test/check:
  - [X] src/test/ContainerDetailEligibility.test.jsx::打开启动确认后状态变为 failed：提交前重解析，不调用 API
  - [X] src/test/ContainerDetailEligibility.test.jsx::长期取消：paused 禁用；online 冻结行残留允许；409 重读且不伪造 checked
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_detail_delete_and_unpause_confirms_recheck_status_before_api
- Assertion scope: 已断言启动确认打开后状态变为 failed 时提交不调用 API、只提示；长期动作 409 后重读且不伪造 checked。本变更新增测试覆盖删除/解冻确认打开后状态变化，确认时重新解析且不发请求。
- Coverage note: 现有用例覆盖启动与长期，不覆盖删除/解冻确认框；本变更新增测试覆盖。

#### Scenario: 解冻或启动失败不覆盖权威终态

- Test/check:
  - [X] src/test/ContainerDetailEligibility.test.jsx::解冻失败重读权威 paused，不伪造已解冻
  - [X] src/test/ContainerDetailEligibility.test.jsx::启动受理后权威轮询为 failed 时保持异常，不被受理结果覆盖
- Assertion scope: 解冻失败后重读权威 `paused`，不显示“已解冻”；启动受理后权威轮询 `failed` 时保持异常，不残留“启动中”，不写猜测的 paused/online。
- Coverage note: 无。

#### Scenario: 动作确认弹窗不另建资格

- Test/check:
  - [X] src/test/DetailPages.test.jsx::container detail start action keeps informational confirmation before API call
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_detail_action_confirm_modal_has_no_long_term_controls
- Assertion scope: 现有用例断言确认弹窗呈现动作与容器信息后才调用 API；本变更新增测试给容器带 `is_long_term`、`freeze_state`、旧配额字段并打开确认，断言弹窗不出现长期控件、不因这些字段另建删除/长期资格。
- Coverage note: 现有用例未断言长期/冻结字段不出现在动作确认弹窗；本变更新增测试覆盖。

### Requirement: ContainerDetailPage 展示并复制既有宿主 bind 路径

#### Scenario: 有记录时完整展示与复制

- Test/check:
  - [X] src/test/ContainerDetailDisplay.test.jsx::test_bind_path_and_resources_render_in_runtime_metrics
  - [X] src/test/ContainerDetailBindPath.test.jsx::非空路径原样展示并复制完整值，不请求 Node/统计接口
- Assertion scope: 运行指标区域原样展示 bind 路径、GPU 分配与共享内存并复制完整路径；镜像卡只显示镜像身份与 Dockerfile，不重复资源；只调用详情接口，不请求 Node。
- Coverage note: 无。

#### Scenario: 空值或旧 Ctrl 缺字段

- Test/check:
  - [X] src/test/ContainerDetailDisplay.test.jsx::test_missing_bind_path_uses_unrecorded_placeholder_without_request
  - [X] src/test/ContainerDetailBindPath.test.jsx::%s 显示未记录且没有复制候选
  - [X] src/test/ContainerDetailDisplay.test.jsx::test_zero_resource_is_distinct_from_missing_resource
- Assertion scope: `null`/空串/缺字段显示“未记录”，无复制控件，不生成候选路径；GPU/共享内存合法 0 显示为 0 而非缺失，其余详情仍正常。
- Coverage note: `%s 显示未记录且没有复制候选` 是 `it.each` 模板，参数为 `null`、空串与缺字段。

#### Scenario: 最近记录与实时核对的区别

- Test/check:
  - [X] src/test/ContainerDetailDisplay.test.jsx::test_bind_path_is_labeled_as_recent_record
- Assertion scope: 字段旁显示“最近记录，非实时核对”，不出现“实时核对/刚刚/已核实”等误导文案；复制值逐字一致，只调用详情接口。
- Coverage note: 无。

#### Scenario: 复制失败

- Test/check:
  - [X] src/test/ContainerDetailDisplay.test.jsx::test_bind_path_copy_failure_preserves_value
- Assertion scope: 剪贴板失败时显示“复制失败”，路径、`title` 与页面展示值保持不变，不发起 API 或 Node 请求。
- Coverage note: 无。

### Requirement: ContainerDetailPage 运行指标资源归属

#### Scenario: 资源字段放入运行指标

- Test/check:
  - [X] src/test/ContainerDetailDisplay.test.jsx::test_bind_path_and_resources_render_in_runtime_metrics
  - [X] src/test/ContainerDetailDisplay.test.jsx::test_gpu_and_shared_memory_are_not_rendered_in_image_card
- Assertion scope: 运行指标显示 GPU 分配 `4, 0` 与共享内存 `1 GB`；镜像卡不显示这两项或 bind 路径，只显示镜像身份与 Dockerfile。
- Coverage note: 无。

#### Scenario: 资源值缺失或为零

- Test/check:
  - [X] src/test/ContainerDetailDisplay.test.jsx::test_zero_resource_is_distinct_from_missing_resource
- Assertion scope: `alloc_gpu_number=0`/`shared_gb=0` 显示为合法 0 值；字段缺失显示既有未知占位 `-`；不发起补充请求。
- Coverage note: 无。

#### Scenario: 镜像内容缺失

- Test/check:
  - [X] src/test/ContainerDetailDisplay.test.jsx::test_missing_image_and_dockerfile_use_explicit_placeholders
- Assertion scope: 镜像名为空显示“未知”；`image_dockerfile` 为 null/空串/缺字段时不渲染 `pre.container-dockerfile`，不生成伪造内容或空代码块。
- Coverage note: 无。

### Requirement: ContainerDetailPage 操作历史随事实刷新

#### Scenario: 点击刷新按钮重取历史

- Test/check:
  - [X] src/test/ContainerDetailHistory.test.jsx::test_q61_refresh_button_refetches_history
- Assertion scope: 点击刷新后同时重取详情与历史，历史出现刷新时刻的新 `start_container` 记录。
- Coverage note: 无。

#### Scenario: 操作成功后历史包含最新事实

- Test/check:
  - [X] src/test/ContainerDetailHistory.test.jsx::test_q61_action_success_refetches_history
- Assertion scope: 启动成功后重取历史，出现“启动容器”记录与“启动成功”提示，不只更新详情字段。
- Coverage note: 无。

#### Scenario: 操作失败不追加成功历史

- Test/check:
  - [X] src/test/ContainerDetailHistory.test.jsx::test_q61_action_failure_no_success_history
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_detail_action_failure_preserves_error_reason
- Assertion scope: 既有用例断言启动失败后历史仍只有“停止容器”，不出现“启动容器”，不提示“启动成功”，且 `showErrorModal` 被调用；未检查错误参数中的原因。新增测试断言 `showErrorModal` 收到 `start failed`/`start_failed`，历史不追加成功记录。
- Coverage note: 既有测试只断言错误弹窗被调用；失败原因参数见 `test_detail_action_failure_preserves_error_reason` 行。

#### Scenario: 异步成员变更终态自动出现

- Test/check:
  - [X] src/test/ContainerDetailRefresh.test.jsx::test_async_add_operation_log_appears_after_background_history_refresh
- Assertion scope: 受理后立即历史重取仍为旧日志时不出现“添加协作者”；下一拍后台历史返回 `add_collaborator` 后自动显示“添加协作者”，历史不含密码。
- Coverage note: 无。

#### Scenario: 重置密码终态使用中文标签

- Test/check:
  - [X] src/test/ContainerDetailRefresh.test.jsx::test_reset_password_terminal_history_uses_chinese_label_without_password
- Assertion scope: 后台历史返回 `reset_container_password` 后显示“重置容器密码”，不显示原始操作码或 `pw-reset`。
- Coverage note: 无。

#### Scenario: 历史后台失败保留、防并发

- Test/check:
  - [X] src/test/ContainerDetailRefresh.test.jsx::test_operation_history_background_uses_short_timeout_guards_and_keeps_logs_on_failure
- Assertion scope: 后台历史使用 `POLL_TIMEOUT`；在途时下一拍不叠加；失败保留既有“启动容器”记录且不调用 `showErrorModal`，只 warn。
- Coverage note: 无。

#### Scenario: 历史隐藏跳过与恢复

- Test/check:
  - [X] src/test/ContainerDetailRefresh.test.jsx::test_hidden_page_skips_background_refresh_and_visibility_restore_refreshes
- Assertion scope: 隐藏期间历史请求次数保持 1；恢复可见后立即增至 2 并显示新“启动容器”记录。
- Coverage note: 无。

#### Scenario: 旧路由与卸载后的历史不回写

- Test/check:
  - [X] src/test/ContainerDetailRefresh.test.jsx::test_late_old_route_history_refresh_does_not_overwrite_current_route
  - [X] src/test/ContainerDetailRefresh.test.jsx::test_unmounted_history_background_failure_does_not_write_or_warn
- Assertion scope: 旧容器 12 的晚到历史不覆盖容器 13 的“启动容器”；卸载后 reject 不写状态且不产生历史告警。
- Coverage note: 无。

### Requirement: ContainerDetailPage 窄屏布局不横向溢出且长内容可读

#### Scenario: 390px 长标题与长 bind 路径

- Test/check:
  - [X] src/test/DetailPagesLayout.test.js::tc_container_css_01_390_title_path
  - [X] src/test/ContainerDetailBindPath.test.jsx::长路径完整展示、使用可换行复制块且不截断值
  - [X] src/test/ContainerDetailDisplay.test.jsx::test_bind_path_and_resources_render_in_runtime_metrics
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_detail_long_bind_path_copy_control_preserves_title
- Assertion scope: CSS 契约断言共享网格、卡片 `min-width:0`、标题与 bind 块可换行；组件断言长路径完整展示、class 可换行、复制值完整。既有用例未直接断言长路径复制控件的 `title`；新增测试在真实详情页断言 `title` 与复制值均为完整长路径。
- Coverage note: jsdom 与 CSS 正则不计算真实 `scrollWidth`；真实 390px 溢出与可读性不由本行宣称已断言。长路径 `title` 见 `test_detail_long_bind_path_copy_control_preserves_title` 行。

#### Scenario: 320px 长运行指标文案

- Test/check:
  - [X] src/test/DetailPagesLayout.test.js::tc_container_css_02_320_metrics
- Assertion scope: CSS 声明 `.detail-metric`/值/补充文案具备 `min-width:0` 与 `overflow-wrap:anywhere`；这是样式契约，不是 jsdom 真实布局结果。
- Coverage note: 仅 CSS 契约；真实 320px 像素与文本可读性未在 jsdom 断言。

#### Scenario: 768px 与桌面的共享布局

- Test/check:
  - [X] src/test/DetailPagesLayout.test.js::tc_container_css_03_768_desktop
- Assertion scope: CSS 声明共享 `.container-detail-layout` 使用可收缩 `minmax(min(460px, 100%), 1fr)`、运行指标项 `min-width:0`；这是样式契约，不是 768/1440 实际布局断言。
- Coverage note: 仅 CSS 契约；真实 768/1440 布局未在 jsdom 断言。

#### Scenario: 缺少 bind 路径或存在无空格长串

- Test/check:
  - [X] src/test/ContainerDetailDisplay.test.jsx::test_missing_bind_path_uses_unrecorded_placeholder_without_request
  - [X] src/test/ContainerDetailBindPath.test.jsx::%s 显示未记录且没有复制候选
  - [X] src/test/DetailPagesLayout.test.js::tc_container_css_01_390_title_path
- Assertion scope: 无 bind 路径时显示“未记录”且无复制控件；CSS 声明标题/复制块可任意断行；不生成猜测路径或额外请求。样式声明不等于真实 320px 布局。
- Coverage note: `%s 显示未记录且没有复制候选` 行是 `it.each` 模板，参数为 `null`/空串/缺字段；真实 320px 下无空格长串的 `scrollWidth` 未在 jsdom 断言，仅 CSS 契约。

## frontend--container-credentials

### Requirement: 一次性凭据响应的结构校验

#### Scenario: 创建受理返回一项

- Test/check:
  - [X] src/test/CreateContainerPassword.test.jsx::test_create_accepts_credentials_and_navigation shows modal before navigating and reuses one create path
  - [X] src/test/credentialResponse.test.js::test_non_root_credentials_require_exactly_one_complete_item
- Assertion scope: 创建响应 `accepted: true`、`success: 1`、一项 `login_name=root` 时解析为一项并进入受控弹窗；创建页在导航前展示密码，保留既有成功路径。
- Coverage note: 无。

#### Scenario: 新增协作者受理返回一项

- Test/check:
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_add_collaborator_credentials shows password without optimistic account insert
  - [X] src/test/credentialResponse.test.js::test_non_root_credentials_require_exactly_one_complete_item
- Assertion scope: 新增 ADMIN/COLLABORATOR 响应一项时展示该凭据；使用响应 `login_name`，不把前端展示名当登录名，不插入未确认的本地账号。
- Coverage note: 页面用例走 COLLABORATOR；ADMIN 请求由 API 用例覆盖，详情页 ADMIN 渲染由本 change 的新增测试。

#### Scenario: 恢复成功返回 root 凭据

- Test/check:
  - [X] src/test/DeletedContainersRestorePassword.test.jsx::test_deleted_restore_root_credential shows root password, bypasses requires_choice, and keeps errors sanitized
  - [X] src/test/containerApiCredentials.test.js::test_deleted_restore_root_credential bypasses requires_choice and parses accepted root credential
- Assertion scope: 恢复实际成功并返回一项 root 凭据时展示“重置后root的密码：”；`requires_choice` 响应不展示密码，错误路径不含 secret。
- Coverage note: 无。

#### Scenario: 凭据项只带 login_name

- Test/check:
  - [X] src/test/credentialResponse.test.js::test_non_root_credentials_require_exactly_one_complete_item
  - [X] src/test/CredentialModal.test.jsx::test_credential_modal_render_copy_close renders exact lines, copies, closes and clears
- Assertion scope: 解析器接受仅含 `login_name`/`password` 的项，不要求或补造 `user_id`；共享弹窗只按这两个字段渲染。
- Coverage note: 无。

#### Scenario: 登录名以响应为准

- Test/check:
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_request_and_result submits bound user_id, shows one credential, and keeps errors secret-free
  - [X] src/test/CredentialModal.test.jsx::test_credential_modal_render_copy_close renders exact lines, copies, closes and clears
- Assertion scope: 账号卡展示名 `Alice` 与响应 `login_name=alice` 不同时，弹窗使用 `alice`；共享弹窗不使用本地推断的展示名。
- Coverage note: 无。

### Requirement: ROOT 交接凭据的结构校验

#### Scenario: ROOT 交接常规两项

- Test/check:
  - [X] src/test/credentialResponse.test.js::test_root_handover_accepts_two_or_more_distinct_complete_credentials
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_root_handover_sends_one_request_without_flag_and_shows_both_credentials
  - [X] src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_sends_one_request_without_flag_and_receives_two_credentials
- Assertion scope: 两个入口都只提交一次无 `transfer_root` 的 `update_role`；解析器保留原 owner 与永久 `root` 两项不同 login_name/password，不重排、不合并、不假设共享密码。
- Coverage note: 无。

#### Scenario: 历史多旧 ROOT 全部保留

- Test/check:
  - [X] src/test/credentialResponse.test.js::test_root_handover_accepts_two_or_more_distinct_complete_credentials
  - [X] src/test/RoleAdversarial.test.jsx::test_api_root_omits_flag_and_consumes_seeded_two_and_n_plus_one
  - [X] src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_preserves_n_plus_one_and_normal_role_swaps_password_free
- Assertion scope: 解析器与真实 API 原样保留 3 项 N+1；Home 回调收到 3 项，不截断、不丢弃旧 owner。
- Coverage note: 详情页逐项渲染 N+1 的本变更新增测试见 `ContainerDetailPage 详情页 ROOT 交接展示全部凭据且不乐观更新 / 历史多个旧 owner 的 N+1 项全部展示`。

#### Scenario: ROOT 凭据必须完整且互不相同

- Test/check:
  - [X] src/test/credentialResponse.test.js::test_root_handover_rejects_short_duplicate_or_incomplete_credentials
  - [X] src/test/containerApiCredentials.test.js::test_root_update_rejects_single_credential_without_retry_or_second_request
  - [X] src/test/RoleAdversarial.test.jsx::test_api_root_rejects_single
  - [X] src/test/RoleAdversarial.test.jsx::test_api_root_rejects_empty
  - [X] src/test/RoleAdversarial.test.jsx::test_api_root_rejects_duplicate-login
  - [X] src/test/RoleAdversarial.test.jsx::test_api_root_rejects_duplicate-password
- Assertion scope: 少于 2 项、空数组、空字段、重复 login_name/password 或缺少 `root` 时整体拒绝，不展示部分密码、不重试、不写成功状态。
- Coverage note: RoleAdversarial 四行由 `it.each` 模板 `test_api_root_rejects_$label` 生成，label 为 `single`/`empty`/`duplicate-login`/`duplicate-password`。

### Requirement: 旧响应与无凭据兼容

#### Scenario: 旧创建响应无凭据

- Test/check:
  - [X] src/test/credentialResponse.test.js::test_credential_legacy_and_empty keeps legacy create and rejects missing acceptance for new flows
  - [X] src/test/CreateContainerPassword.test.jsx::test_create_accepts_credentials_and_navigation keeps legacy success without a fake modal
- Assertion scope: 解析器保留旧创建 `success: 1` 与 message；页面测试断言旧响应仍导航到 Home、不打开密码弹窗、不伪造密码。未断言页面 `message.success` 的具体 toast。
- Coverage note: 既有页面用例只覆盖导航与无密码弹窗；解析器保留 message 不等于页面 toast 已断言。

#### Scenario: 普通角色互换无凭据

- Test/check:
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_main_flow_password_integration keeps ordinary role change password-free and unknown results unconfirmed
  - [X] src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_preserves_n_plus_one_and_normal_role_swaps_password_free
- Assertion scope: 非 ROOT 的 ADMIN/COLLABORATOR 互换响应无凭据时沿用成功提示，不打开弹窗、不生成或改变密码。
- Coverage note: 无。

#### Scenario: 新流程缺少受理标志

- Test/check:
  - [X] src/test/credentialResponse.test.js::test_credential_legacy_and_empty keeps legacy create and rejects missing acceptance for new flows
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_detail_credential_envelope_failures_never_render_passwords
- Assertion scope: 解析器对新增/重置/ROOT 缺少 `accepted: true` 直接拒绝；本变更新增页面级测试覆盖详情页三个入口，断言不展示密码、显示通用未受理/响应异常，不按旧成功流程放行。
- Coverage note: 解析器已覆盖，详情页逐入口的页面级断言由本变更新增测试覆盖。

### Requirement: 凭据响应异常的脱敏

#### Scenario: 普通失败保留安全信息

- Test/check:
  - [X] src/test/credentialResponse.test.js::test_credential_error_sanitization preserves safe message and strips secret/body
  - [X] src/test/containerApiCredentials.test.js::test_guard_rejection_and_unknown_result parses accepted credentials, applies no-store and keeps safe errors
  - [X] src/test/containerApiCredentials.test.js::test_422_detail_failure_is_safe_and_understandable
- Assertion scope: 400（`invalid_config`，含 8GB/4GB 数值）与 422（`invalid_payload`）均保留 status/route/error_reason 与安全 message；错误对象无原始 body、凭据或密码。
- Coverage note: 安全数值由 sanitization 用例断言，`invalid_payload` 由 422 用例断言，两者组合覆盖。

#### Scenario: 失败响应夹带密码

- Test/check:
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_request_and_result submits bound user_id, shows one credential, and keeps errors secret-free
  - [X] src/test/RoleAdversarial.test.jsx::test_api_root_error_with_sensitive_message_and_credentials_is_sanitized
  - [X] src/test/DeletedContainersRestorePassword.test.jsx::test_deleted_restore_root_credential shows root password, bypasses requires_choice, and keeps errors sanitized
- Assertion scope: 500/400 响应体夹带 `credentials`/`password` 时，错误 status/route/error_reason 可保留，但 message、错误对象与 `showErrorModal` 参数均不含密码或原始 body。
- Coverage note: console 未在这些失败用例中直接断言；`containerCredentialContract` 只断言成功请求未触发 console.error。

#### Scenario: 安全 message 与密码同体

- Test/check:
  - [X] src/test/credentialResponse.test.js::test_credential_error_sanitization preserves safe message and strips secret/body
  - [X] src/test/containerApiCredentials.test.js::test_guard_rejection_and_unknown_result parses accepted credentials, applies no-store and keeps safe errors
  - [X] src/test/CreateContainerPassword.test.jsx::test_create_error_safe_message preserves safe quota message and never shows a password
- Assertion scope: 响应同时含安全 message 数值与 `credentials`/`root_password` 时，错误保留 8GB/4GB 数值，同时剥离所有 secret 与 unsafe body；页面不显示密码。
- Coverage note: 无。

#### Scenario: ROOT 交接凭据少于两项或字段非法

- Test/check:
  - [X] src/test/credentialResponse.test.js::test_root_handover_rejects_short_duplicate_or_incomplete_credentials
  - [X] src/test/containerApiCredentials.test.js::test_root_update_rejects_single_credential_without_retry_or_second_request
- Assertion scope: ROOT 响应缺少数组、少于 2 项、空 login_name/password 或缺少 `root` 时整体拒绝，不展示部分密码、不自动重试、不写成功状态。
- Coverage note: 无。

#### Scenario: ROOT 交接凭据重复

- Test/check:
  - [X] src/test/credentialResponse.test.js::test_root_handover_rejects_short_duplicate_or_incomplete_credentials
  - [X] src/test/RoleAdversarial.test.jsx::test_api_root_rejects_duplicate-login
  - [X] src/test/RoleAdversarial.test.jsx::test_api_root_rejects_duplicate-password
- Assertion scope: 至少 2 项但 login_name 或 password 重复时整体拒绝，不展示任何部分密码、不自动重试、不写成功状态。
- Coverage note: RoleAdversarial 两行由 `it.each` 模板 `test_api_root_rejects_$label` 生成，label 为 `duplicate-login`/`duplicate-password`。

### Requirement: 受理前守卫与后台复核

#### Scenario: 前置守卫失败

- Test/check:
  - [X] src/test/ContainerMemberGuardErrors.test.jsx::离线新增成员：包装器保留 error_reason，并隐藏通用英文失败文案与 400 提示
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_add_collaborator_credentials shows password without optimistic account insert
  - [X] src/test/containerApiCredentials.test.js::test_guard_rejection_and_unknown_result parses accepted credentials, applies no-store and keeps safe errors
  - [X] src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability requires method, ROOT/resource and online guard for reset
- Assertion scope: Ctrl 在受理前拒绝时不返回密码，页面不打开密码弹窗，只按安全原因提示；新增失败响应即使夹带凭据，页面错误弹窗文本也不含 secret；reset UI 三层资格不满足时不发请求。
- Coverage note: Ctrl 真实前置 guard 属跨仓；Web 侧验证错误无密码、按钮门与请求体，不声称后端状态机已由本仓断言。

#### Scenario: 受理后最小复核

- Test/check:
  - [X] src/test/containerApiCredentials.test.js::test_audit_reuse_no_duplicate_logs sends add/reset requests without passwords and parses one credential
  - [X] src/test/containerApiCredentials.test.js::test_add_and_role_requests_use_web_contract_without_secrets
- Assertion scope: Web 的 add/reset/ROOT 请求体精确、每次调用只发一次 HTTP，不新增持久 DTO、租约或密码字段；create 请求也不夹带 `root_password`。
- Coverage note: Ctrl 后台执行前的最小既有 guard 复核不在 Web 仓；本行只证明 Web 不新增 DTO/请求，不证明后台复核结果。

#### Scenario: 后台结果未知

- Test/check:
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_main_flow_password_integration keeps ordinary role change password-free and unknown results unconfirmed
  - [X] src/test/ContainerDetailRefresh.test.jsx::test_reset_password_terminal_history_uses_chinese_label_without_password
- Assertion scope: 未知/失败结果不显示为 Node 已确认成功；历史只按成功/失败标签展示“重置容器密码”，密码不回查、不轮询。
- Coverage note: 未单独构造“未知”历史枚举；现有页面只有成功/失败标签，未知结果按失败呈现。

### Requirement: 审计复用且不重复记录

#### Scenario: 创建与新增协作者只留既有审计

- Test/check:
  - [X] src/test/containerCredentialContract.test.js::test_audit_reuse_no_duplicate_logs never puts passwords in requests and uses no-store
  - [X] src/test/ContainerDetailRefresh.test.jsx::test_async_add_operation_log_appears_after_background_history_refresh
- Assertion scope: Web 请求不含 password/root_password/credentials/login_name；新增终态历史只出现既有“添加协作者”标签，不含密码。
- Coverage note: Ctrl 的 CREATE/ADD_COLLABORATOR oplog 写入属跨仓；Web 侧只证明不新增密码请求/日志通道，不证明后端只写一条审计。

#### Scenario: 重置使用固定操作码

- Test/check:
  - [X] src/test/ContainerDetailRefresh.test.jsx::test_reset_password_terminal_history_uses_chinese_label_without_password
- Assertion scope: 历史记录 `reset_container_password` 映射为“重置容器密码”，不显示原始操作码或密码。
- Coverage note: 后端只写一条 oplog 的约束不在 Web 仓；Web 只验证展示映射。

#### Scenario: ROOT 各步沿用既有角色审计

- Test/check:
  - [X] src/test/containerApiCredentials.test.js::test_root_update_is_always_handover_without_flag_and_accepts_n_plus_one
  - [X] src/test/RoleAdversarial.test.jsx::test_api_root_omits_flag_and_consumes_seeded_two_and_n_plus_one
- Assertion scope: Web 的 ROOT 交接只发一次 `update_role`、无 `transfer_root`、无第二个 HTTP；失败错误不含 secret。
- Coverage note: Ctrl 各步 `UPDATE_COLLABORATOR_ROLE` oplog 与后台顺序属跨仓；Web 不新增密码交接日志。

### Requirement: 受控一次性密码弹窗

#### Scenario: 单凭据展示与复制

- Test/check:
  - [X] src/test/CredentialModal.test.jsx::test_credential_modal_render_copy_close renders exact lines, copies, closes and clears
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_detail_single_credential_unmount_remount_no_lookup_no_abort_and_late_no_error
- Assertion scope: 既有弹窗测试用两项凭据断言逐行文案、复制与关闭清空；未证明 N=1 只渲染一行。新增测试用一项凭据断言只渲染一行、复制该项，并覆盖其卸载/重挂生命周期。
- Coverage note: 既有测试只覆盖多项逐行；单项只渲染一行见 `test_detail_single_credential_unmount_remount_no_lookup_no_abort_and_late_no_error` 行。

#### Scenario: ROOT 交接两项或 N+1 全部展示

- Test/check:
  - [X] src/test/CredentialModal.test.jsx::test_credential_modal_render_copy_close renders exact lines, copies, closes and clears
  - [X] src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_modal_shows_owner_and_root_then_close_clears_passwords
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_root_handover_sends_one_request_without_flag_and_shows_both_credentials
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_detail_root_handover_renders_n_plus_one_credentials
- Assertion scope: 共享弹窗逐项使用各自 login_name/password，两项不合并、不省略；新增详情页测试断言 N+1 的 3 项全部渲染、不截断。
- Coverage note: 既有两项渲染与 Home N+1 透传已覆盖；详情页 N+1 渲染见 `test_detail_root_handover_renders_n_plus_one_credentials` 行。

#### Scenario: 关闭或卸载后不可再查看

- Test/check:
  - [X] src/test/CredentialModal.test.jsx::test_credential_modal_render_copy_close renders exact lines, copies, closes and clears
  - [X] src/test/RoleAdversarial.test.jsx::test_detail_open_credentials_are_closed_when_container_changes
  - [X] src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_modal_shows_owner_and_root_then_close_clears_passwords
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_detail_escape_closes_and_clears_credentials
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_detail_single_credential_unmount_remount_no_lookup_no_abort_and_late_no_error
- Assertion scope: 既有用例覆盖点击关闭、切换容器与 Home 关闭后密码从 DOM/父状态消失、storage 为空；未覆盖已打开凭据在卸载后的清理、重新挂载不显示、无查回请求。新增测试按 Esc 关闭；另一新增测试断言卸载后状态清空、重挂不显示、无凭据查回请求。
- Coverage note: 既有测试未按 Esc，也未覆盖卸载/重挂；Esc 见 `test_detail_escape_closes_and_clears_credentials` 行，卸载/重挂/无查回见 `test_detail_single_credential_unmount_remount_no_lookup_no_abort_and_late_no_error` 行。

#### Scenario: 复制失败

- Test/check:
  - [X] src/test/CredentialModal.test.jsx::test_credential_no_persistence does not store passwords or log them; copy failure is safe
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_credential_copy_failure_keeps_password_visible_until_close
- Assertion scope: 既有用例断言剪贴板拒绝时显示普通“复制失败”反馈，console/localStorage/sessionStorage 不含密码；未断言错误提示后密码行仍可见。新增测试使用真实 `CredentialModal`，断言复制失败后密码行与密码仍可见，点击关闭后从 DOM 清除。
- Coverage note: 既有测试只覆盖失败提示与无持久化；密码行在关闭前仍可见、关闭后清除见 `test_credential_copy_failure_keeps_password_visible_until_close` 行。

#### Scenario: 旧容器、关闭或卸载后的凭据晚到

- Test/check:
  - [X] src/test/RoleAdversarial.test.jsx::test_detail_root_late_credentials_after_route_switch_do_not_render_on_new_container
  - [X] src/test/RoleAdversarial.test.jsx::test_detail_root_late_credentials_after_unmount_do_not_render
  - [X] src/test/RoleAdversarial.test.jsx::test_home_root_pending_disables_duplicate_and_closed_modal_ignores_late_credentials
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_detail_single_credential_unmount_remount_no_lookup_no_abort_and_late_no_error
- Assertion scope: 既有测试断言详情切换容器、详情卸载、Home 弹窗关闭后晚到的 ROOT/新增响应不写密码、不提示受理成功、不重新打开旧弹窗；未断言 `showErrorModal` 未被调用。新增测试对详情晚到响应断言不弹错误窗、不写密码。
- Coverage note: 详情新增/重置的晚到响应未逐一构造；ROOT 会话逻辑已覆盖，新增/重置共用同一导航 epoch 守卫。晚到不弹错误见 `test_detail_single_credential_unmount_remount_no_lookup_no_abort_and_late_no_error` 行。

#### Scenario: ROOT 请求在途重复提交

- Test/check:
  - [X] src/test/RoleAdversarial.test.jsx::test_home_root_pending_disables_duplicate_and_closed_modal_ignores_late_credentials
- Assertion scope: Home 人员弹窗 ROOT 请求在途时角色控件 disabled；再次选择不产生第二次 `update_role`，完成后 finally 释放。
- Coverage note: 详情页角色选择也由 `peopleSaving` 禁用，但未单独断言重复提交；本场景按“人员弹窗”映射 Home。

### Requirement: 容器导航与凭据生命周期

#### Scenario: 切换容器立即清空已打开凭据与重置确认

- Test/check:
  - [X] src/test/RoleAdversarial.test.jsx::test_detail_open_credentials_are_closed_when_container_changes
  - [X] src/test/RoleAdversarial.test.jsx::test_detail_reset_confirm_is_cleared_when_container_changes
- Assertion scope: 已打开密码弹窗或重置确认框在容器 ID 变化后立即消失，新容器不显示旧凭据/确认框。
- Coverage note: 无。

#### Scenario: 离开后返回同一容器 ID 的旧响应拒绝

- Test/check:
  - [X] src/test/RoleAdversarial.test.jsx::test_detail_old_root_response_after_returning_to_same_container_is_rejected
- Assertion scope: A→B→A 后离开 A 前的旧 ROOT 响应晚到，导航 epoch 已变化，不写密码、不提示成功、不弹错误；不能仅因当前 ID 相同而接受。
- Coverage note: 无。

### Requirement: 密码不进入持久化、日志与回查通道

#### Scenario: 打开与关闭弹窗无持久化

- Test/check:
  - [X] src/test/CredentialModal.test.jsx::test_credential_no_persistence does not store passwords or log them; copy failure is safe
  - [X] src/test/containerApiCredentials.test.js::test_audit_reuse_no_duplicate_logs sends add/reset requests without passwords and parses one credential
- Assertion scope: 打开/关闭弹窗后 localStorage、sessionStorage、console 不含密码；凭据 POST 的 `cache: 'no-store'` 被断言。
- Coverage note: URL、IndexedDB、WSS、action 缓存与响应 `Cache-Control: no-store` 未在 Web 单测中断言；响应头属 Ctrl 跨仓。

#### Scenario: 顶层 root_password 不进入 Web

- Test/check:
  - [X] src/test/credentialResponse.test.js::test_credential_error_sanitization preserves safe message and strips secret/body
  - [X] src/test/RoleAdversarial.test.jsx::test_api_root_error_with_sensitive_message_and_credentials_is_sanitized
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_detail_top_level_root_password_is_not_rendered_or_stored
- Assertion scope: 现有失败路径断言顶层 `root_password` 从错误 message/对象中剥离；本变更新增测试用成功响应同时含 `root_password` 与 `credentials`，断言 UI、console、storage 与后续请求只用 `credentials`。
- Coverage note: 成功响应并含顶层 `root_password` 的场景无现有断言；本变更新增测试覆盖。

#### Scenario: 卸载不取消已受理任务

- Test/check:
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_detail_single_credential_unmount_remount_no_lookup_no_abort_and_late_no_error
- Assertion scope: 新增测试在请求已发出后卸载页面，断言 `fetch` 的 `AbortSignal` 未被 abort、没有取消/重发调用，后台响应仍可完成且不写已卸载页面状态；重挂后不显示旧密码、无查回请求。
- Coverage note: 既有测试未直接断言 AbortSignal；RoleAdversarial 卸载用例只验证晚到不渲染，不能证明未取消。

#### Scenario: 超时或断连不重复提交

- Test/check:
  - [X] src/test/AnvilDetailCredentials.test.jsx::test_detail_credential_timeout_shows_error_without_retry_or_password
- Assertion scope: 新增测试用受控超时/断连驱动详情重置，断言只发一次请求、不自动重试、不展示或持久化密码、不宣称成功或失败已由 Node 确认。
- Coverage note: 既有测试未覆盖凭据超时/重试；超时/断连行为见 `test_detail_credential_timeout_shows_error_without_retry_or_password` 行。

### Requirement: 凭据入口统一且错误通道隔离

#### Scenario: 四个容器入口使用同一展示组件

- Test/check:
  - [X] src/test/CreateContainerPassword.test.jsx::test_create_accepts_credentials_and_navigation shows modal before navigating and reuses one create path
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_add_collaborator_credentials shows password without optimistic account insert
  - [X] src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_modal_shows_owner_and_root_then_close_clears_passwords
  - [X] src/test/DeletedContainersRestorePassword.test.jsx::test_deleted_restore_root_credential shows root password, bypasses requires_choice, and keeps errors sanitized
- Assertion scope: 创建、详情新增、Home ROOT 交接、删除恢复四个真实入口均展示严格行文案的受控弹窗。
- Coverage note: 未证明四者组件同一性，也未逐入口断言 `showErrorModal` 未被调用；不使用 `containerCredentialContract` 的源码字符串检查作为行为证据。

#### Scenario: 错误路径不显示密码

- Test/check:
  - [X] src/test/CreateContainerPassword.test.jsx::test_create_error_safe_message preserves safe quota message and never shows a password
  - [X] src/test/DeletedContainersRestorePassword.test.jsx::test_deleted_restore_root_credential shows root password, bypasses requires_choice, and keeps errors sanitized
  - [X] src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_request_and_result submits bound user_id, shows one credential, and keeps errors secret-free
  - [X] src/test/RoleAdversarial.test.jsx::test_api_root_error_with_sensitive_message_and_credentials_is_sanitized
  - [X] src/test/credentialResponse.test.js::test_credential_error_sanitization preserves safe message and strips secret/body
- Assertion scope: 任一入口失败且响应/异常含密码字段时，只显示脱敏错误，不打开密码弹窗，原始 body 不进入错误弹窗参数。
- Coverage note: 现有失败用例断言错误参数/对象不含 secret 与 raw body；未逐一断言 console，成功路径的 console.error 由 contract 用例单独覆盖。


