# frontend--container-credentials 测试覆盖

规格：[spec.md](spec.md)

- 主 spec SHA256：`24f8fbf637285789f223386252cd10d431b7a91921d5e01ddf97a3ea36553896`（2026-10-24 导航 epoch 守卫后）。

## 当前场景映射

| Requirement | Scenario | 覆盖状态 | 测试位置与 nodeid/参数 | 验证范围或缺口 |
| --- | --- | --- | --- | --- |
| 一次性凭据响应的结构校验 | 创建受理返回一项 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_non_root_credentials_require_exactly_one_complete_item；../../../src/test/containerApiCredentials.test.js::test_guard_rejection_and_unknown_result | 断言创建仅接受一项完整凭据并保留 success/message。 |
| 一次性凭据响应的结构校验 | 新增协作者受理返回一项 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_non_root_credentials_require_exactly_one_complete_item；../../../src/test/containerApiCredentials.test.js::test_audit_reuse_no_duplicate_logs | 断言新增只接受一项完整凭据，不插入未确认本地账号。 |
| ROOT 交接凭据的结构校验 | ROOT 交接常规两项 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_root_handover_accepts_two_or_more_distinct_complete_credentials；../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_root_handover_sends_one_request_without_flag_and_shows_both_credentials；../../../src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_sends_one_request_without_flag_and_receives_two_credentials | 断言 Web 不发 `transfer_root`、每个入口只发一次请求，原 owner 与永久 root 两项不同凭据全部保留。 |
| ROOT 交接凭据的结构校验 | 历史多旧 ROOT 全部保留 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_root_handover_accepts_two_or_more_distinct_complete_credentials；../../../src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_preserves_n_plus_one_and_normal_role_swaps_password_free | 断言 3 项 N+1 凭据原样保留，不截断为两项。 |
| ROOT 交接凭据的结构校验 | ROOT 凭据必须完整且互不相同 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_root_handover_rejects_short_duplicate_or_incomplete_credentials；../../../src/test/containerApiCredentials.test.js::test_root_update_rejects_single_credential_without_retry_or_second_request | 断言少于 2 项、空字段、重复 login_name/password 及 API 单凭据均被拒，不重试。 |
| 一次性凭据响应的结构校验 | 恢复成功返回 root 凭据 | 已覆盖 | ../../../src/test/containerApiCredentials.test.js::test_deleted_restore_root_credential | 断言恢复实际成功才解析一项 root 凭据，`requires_choice` 不展示密码。 |
| 一次性凭据响应的结构校验 | 凭据项只带 login_name | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_non_root_credentials_require_exactly_one_complete_item；../../../src/test/CredentialModal.test.jsx::test_credential_modal_render_copy_close | 断言只提供 login_name/password 时接受并展示，不要求 user_id。 |
| 一次性凭据响应的结构校验 | 登录名以响应为准 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_request_and_result；../../../src/test/CredentialModal.test.jsx::test_credential_modal_render_copy_close | 断言弹窗使用响应 login_name，不使用卡片展示名。 |
| 旧响应与无凭据兼容 | 旧创建响应无凭据 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_credential_legacy_and_empty | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 旧响应与无凭据兼容 | 普通角色互换无凭据 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_credential_legacy_and_empty | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 旧响应与无凭据兼容 | 新流程缺少受理标志 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_credential_legacy_and_empty | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 凭据响应异常的脱敏 | 普通失败保留安全信息 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_credential_error_sanitization | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 凭据响应异常的脱敏 | 失败响应夹带密码 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_credential_error_sanitization | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 凭据响应异常的脱敏 | 安全 message 与密码同体 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_credential_error_sanitization | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 凭据响应异常的脱敏 | ROOT 交接凭据少于两项或字段非法 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_root_handover_rejects_short_duplicate_or_incomplete_credentials | 断言 ROOT 非法凭据整体拒绝，不展示部分密码。 |
| 凭据响应异常的脱敏 | ROOT 交接凭据重复 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_root_handover_rejects_short_duplicate_or_incomplete_credentials | 断言重复 login_name/password 整体拒绝，不展示部分密码。 |
| 受理前守卫与后台复核 | 前置守卫失败 | 已覆盖 | ../../../src/test/containerApiCredentials.test.js::test_guard_rejection_and_unknown_result | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 受理前守卫与后台复核 | 受理后最小复核 | 已覆盖 | ../../../src/test/containerApiCredentials.test.js::test_guard_rejection_and_unknown_result | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 受理前守卫与后台复核 | 后台结果未知 | 已覆盖 | ../../../src/test/containerApiCredentials.test.js::test_guard_rejection_and_unknown_result | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 审计复用且不重复记录 | 创建与新增协作者只留既有审计 | 已覆盖 | ../../../src/test/containerCredentialContract.test.js::test_audit_reuse_no_duplicate_logs | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 审计复用且不重复记录 | 重置使用固定操作码 | 已覆盖 | ../../../src/test/containerCredentialContract.test.js::test_audit_reuse_no_duplicate_logs | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 审计复用且不重复记录 | ROOT 各步沿用既有角色审计 | 已覆盖 | ../../../src/test/containerCredentialContract.test.js::test_audit_reuse_no_duplicate_logs | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 受控一次性密码弹窗 | 单凭据展示与复制 | 已覆盖 | ../../../src/test/CredentialModal.test.jsx::test_credential_modal_render_copy_close | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 受控一次性密码弹窗 | ROOT 交接两项或 N+1 全部展示 | 已覆盖 | ../../../src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_modal_shows_owner_and_root_then_close_clears_passwords；../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_root_handover_waits_for_authoritative_detail_and_clears_passwords_on_close；../../../src/test/CredentialModal.test.jsx::test_credential_modal_render_copy_close | 断言 Home 与详情均显示原 owner 与 root 两项（N+1 由 Home 用例覆盖），不合并、不省略。 |
| 受控一次性密码弹窗 | 关闭或卸载后不可再查看 | 已覆盖 | ../../../src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_modal_shows_owner_and_root_then_close_clears_passwords；../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_root_handover_waits_for_authoritative_detail_and_clears_passwords_on_close；../../../src/test/CredentialModal.test.jsx::test_credential_modal_render_copy_close | 断言关闭后密码从 DOM 消失、父状态清空、localStorage/sessionStorage 为空。 |
| 受控一次性密码弹窗 | 复制失败 | 已覆盖 | ../../../src/test/CredentialModal.test.jsx::test_credential_modal_render_copy_close | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 密码不进入持久化、日志与回查通道 | 打开与关闭弹窗无持久化 | 已覆盖 | ../../../src/test/CredentialModal.test.jsx::test_credential_no_persistence | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 密码不进入持久化、日志与回查通道 | 顶层 root_password 不进入 Web | 已覆盖 | ../../../src/test/CredentialModal.test.jsx::test_credential_no_persistence | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 密码不进入持久化、日志与回查通道 | 卸载不取消已受理任务 | 已覆盖 | ../../../src/test/CredentialModal.test.jsx::test_credential_no_persistence | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 密码不进入持久化、日志与回查通道 | 超时或断连不重复提交 | 已覆盖 | ../../../src/test/CredentialModal.test.jsx::test_credential_no_persistence | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 凭据入口统一且错误通道隔离 | 四个容器入口使用同一展示组件 | 已覆盖 | ../../../src/test/containerCredentialContract.test.js::test_credential_unified_entrances | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 凭据入口统一且错误通道隔离 | 错误路径不显示密码 | 已覆盖 | ../../../src/test/containerCredentialContract.test.js::test_credential_unified_entrances | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |

## 最近验证（2026-10-24 实现阶段历史）

- 时间：2026-10-24 +08:00（实现阶段验收；本轮归档仅同步文档，未重跑套件）。
- 版本：Web 实现提交 `f14a16f`；归档文档同步于 `2026-10-24-generate-container-passwords-once`。
- 主 spec SHA256：`e6cb07b85b7e1010b02dba61d55f3c675d5c24093a0012abd9e270ad6d9a767f`。
- 命令与环境：`npm test`（Node v26）→ Web 77 files/686 tests + 生产入口 40 tests，0 failed/0 skipped/0 todo；`npm run build` 成功（17.73s）。
- 结果：32/32 场景映射为具名 vitest 用例；本台账只覆盖 container-credentials 自身场景，不复制整个 change 的 83 行。
- 限制：jsdom 组件/契约测试；Ctrl/Node 真实跨仓 wire 由父代理与外部仓库验收，本仓不宣称真实生产验证。

## 2026-10-24 ROOT 交接统一验证（历史）

- 时间：2026-10-24 +08:00。
- 版本：当前工作区未提交改动；所有 Web ROOT 入口统一无 flag 交接，API 不再消费单目标分支。
- 主 spec SHA256：`1ddf55bb2e6094d1479cff80d422305412fa702462fb5992570e32f28d7e7483`。
- RED：焦点 6 files / 30 tests 中 11 failed / 19 passed；关键失败为 parser 忽略 `rootHandover`、API 接受单凭据、详情/Home 请求仍带旧 flag、源契约仍要求 `transfer_root`。
- GREEN：焦点 30/30；`rootHandover` 接受 2 项与 3 项 N+1、拒绝少于 2 项/空字段/重复 login_name 或 password；`updateRole` 只发一次无 flag 请求，ROOT 单凭据直接拒绝且不重试；详情与 Home 均展示两项并在关闭后清空密码。
- 全量：`npm test` 通过 Web 78 files/708 tests + server 40 tests（0 failed/0 skipped）；`npm run build` 15.17s 通过；`npm run lint` 通过；`openspec validate --specs --strict` 28/28 通过。
- 限制：jsdom 解析/契约测试；Ctrl 对旧 `false`/省略的兼容与真实后台交接不在本仓验证；未操作真实 DB。
- 日志：`E:/AI/Fuxi_audit_artifacts/root-handover-2026-10-24/`。

## 2026-10-24 ROOT 对抗与守卫修复验证

- 新文件：`src/test/RoleAdversarial.test.jsx`；本轮仅做小范围守卫修复，未改详情 spec/test-plan/实现，未扫全站重构。
- 设计：`updateRole`、`ContainerDetailPage`、`EditUserModal` 使用真实实现，仅 mock 与 ROOT 无关的 API；`fetch` 由受控 Promise 驱动，凭据顺序使用固定种子 `0x5eed1234` 的确定性置换，不使用 sleep/随机等待。
- 结果：**15/15 通过**；详情刷新 `ContainerDetailRefresh` 18/18；ROOT 相关 7 files / 48 tests 全通过。
- 覆盖：API 两并发 ROOT 回包乱序互不串结果；省略 flag 稳定；2 项与 N+1 项原样保留；单项/空/重复 login_name/重复 password 拒绝；敏感错误脱敏；详情切换路由/卸载后晚到凭据不渲染；ROOT 失败不本地假成功；非 ROOT 更新即使夹带两项凭据也不打开 ROOT 交接弹窗；Home ROOT 在途重复选择只发一次，控件 disabled，关闭弹窗后晚到回调不弹密码；密码弹窗已打开后切容器立即消失；重置确认框切容器后关闭；A→B→A 返回同 ID 的旧 ROOT 响应被拒绝。
- 修复 #1 `test_detail_root_late_credentials_after_route_switch_do_not_render_on_new_container`、`test_detail_old_root_response_after_returning_to_same_container_is_rejected`：`ContainerDetailPage` 在现有 `detailMountedRef`/`containerIdRef` 外新增独立 `navigationEpochRef`；离开后即使回到同 ID，旧请求 epoch 不匹配，不写 credentials、不提示成功、不弹错误。epoch 不复用 5 秒详情刷新序号，同容器慢请求不会被周期刷新淘汰。
- 修复 #2 `test_home_root_pending_disables_duplicate_and_closed_modal_ignores_late_credentials`：`EditUserModal` 采用 per-modal ref busy guard + `roleSaving` disabled；请求失败/完成在 finally 释放；用 visible/container/epoch 校验会话，关闭、换容器或重新打开后的迟到 ROOT/新增回调不弹密码或错误。
- 修复 #3 `test_detail_open_credentials_are_closed_when_container_changes`、`test_detail_reset_confirm_is_cleared_when_container_changes`：容器 ID 变化时 layout effect 立即清空 credentials 与 resetConfirm，已打开密码弹窗/重置确认不跨容器保留。
- 新增主 spec 场景映射：
  - `受控一次性密码弹窗 / 旧容器、关闭或卸载后的凭据晚到` → `test_detail_root_late_credentials_after_route_switch_do_not_render_on_new_container`、`test_home_root_pending_disables_duplicate_and_closed_modal_ignores_late_credentials`
  - `受控一次性密码弹窗 / ROOT 请求在途重复提交` → `test_home_root_pending_disables_duplicate_and_closed_modal_ignores_late_credentials`
  - `容器导航与凭据生命周期 / 切换容器立即清空已打开凭据与重置确认` → `test_detail_open_credentials_are_closed_when_container_changes`、`test_detail_reset_confirm_is_cleared_when_container_changes`
  - `容器导航与凭据生命周期 / 离开后返回同一容器 ID 的旧响应拒绝` → `test_detail_old_root_response_after_returning_to_same_container_is_rejected`
- 全量：沿用上一轮（当时为 12 个对抗用例、导航 epoch 修复前）`npm test` Web 79 files / 720 tests，719 passed / 1 failed；失败为未触碰的 `AnnouncementEditor.test.jsx::test_q52_announcement_template_205` 在全量并行下找不到“加载更多”，单文件重跑 15/15 通过，判定为与本轮无关的并行/时序 flake；server 40/40。按指示本次小补丁不再跑第三次全量。
- 本次小补丁验证：对抗 15/15、详情 18/18 + ROOT 相关 48/48、改动文件 targeted ESLint 通过、生产改动后 `npm run build` 11.19s 通过、`openspec validate --specs --strict` 28/28。
- 限制：jsdom 受控 Promise 测试；未覆盖真实 Ctrl/Node 后台时序；未操作真实 DB；父级将另做真实浏览器复核。
- 日志：`E:/AI/Fuxi_audit_artifacts/root-handover-2026-10-24/adversarial-web/`（`ROOT-open-navigation-red.log`、`ROOT-open-navigation-green3.log`、`related-green-after-nav-fix.log`、`eslint-fix.log`、`full-npm-test-after-fix.log`、构建日志、`summary.md`）。

## ROOT 登录名补验（2026-10-24）

- ROOT 交接响应若只有两个普通账号而没有永久 root，拒绝展示。定位：src/test/credentialResponse.test.js 的 test_root_handover_rejects_short_duplicate_or_incomplete_credentials；补断言后 RED 为 1 failed/5 passed，修正后凭据与页面相关 5 files/41 tests 全部通过。
- 日志位于外部 adversarial-web/missing-root-red.log 与 missing-root-green.log。
- 当前主规格 SHA256：110D2949B1104851E72713AA9DAFCFD91B7F73567A36C57D0590CBECFE11DE52。
