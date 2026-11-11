# Tasks

## 1. 新测试文件与详情页入口/启动

- [x] 1.1 新增 `src/test/AnvilDetailCredentials.test.jsx` 的确定性 harness：真实 `ContainerDetailPage`/`container_api`/`CredentialModal`，受控 `fetch`、deferred、`act`/`waitFor`、5s interval 捕获、clipboard/console/storage 清理；不固定 sleep，不覆盖 Q76 两个暂缓定位。对应 `ContainerDetailPage 页面入口与身份 / 装配页面`、`ContainerDetailPage 主流程 / 启动已受理`、`容器导航与凭据生命周期 / 切换容器立即清空已打开凭据与重置确认`。
- [x] 1.2 实现 `test_detail_route_id_drives_api_and_backend_container_id_renders`：路由 12、后端 `container_id=99`，断言详情请求用 12、页面身份显示 99。对应 `ContainerDetailPage 页面入口与身份 / 装配页面`。
- [x] 1.3 实现 `test_detail_start_accepted_shows_transition_then_server_online`：启动受理后显示“启动中”，权威详情 online 才收敛。对应 `ContainerDetailPage 主流程 / 启动已受理`。

## 2. 新增协作者与凭据结构

- [x] 2.1 实现 `test_detail_add_admin_collaborator_shows_one_credential_without_optimistic_insert`：页面选择 ADMIN，断言一项凭据、无本地插入、无“已加入”。对应 `新增协作者凭据与不乐观加入 / 新增 ADMIN 协作者`。
- [x] 2.2 实现 `test_detail_credential_envelope_failures_never_render_passwords`：覆盖新增/重置/ROOT 的缺失 `accepted`、项数或字段非法；断言无部分密码、无本地角色改写、错误脱敏。对应 `新增协作者凭据与不乐观加入 / 新增受理失败或凭据异常`、`账号卡密码重置请求与受理 / 受理凭据数量或字段非法`、`详情页 ROOT 交接展示全部凭据且不乐观更新 / 凭据少于两项、重复或字段非法`、`旧响应与无凭据兼容 / 新流程缺少受理标志`。

## 3. 重置权限、错误通道与 ROOT N+1

- [x] 3.1 实现 `test_detail_reset_hidden_for_admin_and_bypass_entity_without_resource`：ADMIN 与仅 `bypass_auth_entity` 且资源不通配时不显示重置按钮。对应 `账号卡密码重置入口与权限 / ADMIN、COLLABORATOR 与方法通配不得放行`。
- [x] 3.2 实现 `test_detail_reset_disabled_for_offline_host_offline_and_maintenance`：offline/host_offline/host_maintenance/过渡态按钮禁用、点击不打开确认、不发请求。对应 `账号卡密码重置入口与权限 / 容器不在线或主机不可用`。
- [x] 3.3 实现 `test_detail_reset_failure_keeps_console_free_of_password`：reset 409 夹带 secret 时错误弹窗与 console 均不泄露。对应 `账号卡密码重置请求与受理 / 重置失败不泄露密码`。
- [x] 3.4 实现 `test_detail_root_handover_renders_n_plus_one_credentials`：真实详情页 ROOT 交接展示 3 项 N+1，不截断、不合并。对应 `详情页 ROOT 交接展示全部凭据且不乐观更新 / 历史多个旧 owner 的 N+1 项全部展示`、`受控一次性密码弹窗 / ROOT 交接两项或 N+1 全部展示`。

## 4. 动作、删除、loading 与成员守卫

- [x] 4.1 实现 `test_detail_foreground_error_modal_releases_loading_before_wait`：前台详情失败、错误弹窗 pending 时 spinner 已释放。对应 `ContainerDetailPage 详情权威事实周期收敛 / 错误弹窗等待不占用后台刷新与 loading`。
- [x] 4.2 实现 `test_detail_member_guard_failure_does_not_retry_or_bypass`：add/update/remove 守卫失败各只发一次请求，无自动重试/绕过，原因保留。对应 `成员增删改失败按既有守卫原因显示中文 / 冻结、异常或处理中拒绝成员动作`。
- [x] 4.3 实现 `test_detail_delete_disabled_reason_and_no_request`：过渡/主机/未知禁用删除时 title 为中文原因，点击不打开确认、不调用删除 API。对应 `ContainerDetailPage 容器动作使用共享结果 / 失败容器可删除、过渡态不可删除`。
- [x] 4.4 实现 `test_detail_delete_and_unpause_confirms_recheck_status_before_api`：删除/解冻确认打开后状态变化，提交前重解析，不发 API。对应 `ContainerDetailPage 容器动作使用共享结果 / 提交前重解析`。
- [x] 4.5 实现 `test_detail_action_confirm_modal_has_no_long_term_controls`：动作确认弹窗不出现长期控件，不另建资格。对应 `ContainerDetailPage 容器动作使用共享结果 / 动作确认弹窗不另建资格`。
- [x] 4.6 实现 `test_detail_action_failure_preserves_error_reason`：启动失败错误弹窗保留 `start failed`/`start_failed`，不追加成功历史。对应 `ContainerDetailPage 操作历史随事实刷新 / 操作失败不追加成功历史`。

## 5. 长路径、磁盘与失败原因

- [x] 5.1 实现 `test_detail_long_term_disk_100_only_disables_enable`：仅磁盘 100%、配额可启用时长期勾选禁用并显示磁盘原因，删除仍可用。对应 `ContainerDetailPage 容器动作使用共享结果 / 长期配额、磁盘与冻结残留`。
- [x] 5.2 实现 `test_detail_long_bind_path_copy_control_preserves_title`：真实详情页长 bind 路径复制控件 `title` 与复制值为完整路径。对应 `ContainerDetailPage 窄屏布局不横向溢出且长内容可读 / 390px 长标题与长 bind 路径`。

## 6. 凭据弹窗生命周期与错误边界

- [x] 6.1 实现 `test_detail_single_credential_unmount_remount_no_lookup_no_abort_and_late_no_error`：单凭据一行/复制；卸载后不 abort 请求、晚到不弹错误/不写密码；重挂不显示旧密码、无查回请求。对应 `受控一次性密码弹窗 / 单凭据展示与复制`、`受控一次性密码弹窗 / 关闭或卸载后不可再查看`、`受控一次性密码弹窗 / 旧容器、关闭或卸载后的凭据晚到`、`密码不进入持久化、日志与回查通道 / 卸载不取消已受理任务`。
- [x] 6.2 实现 `test_detail_escape_closes_and_clears_credentials`：Esc 关闭后密码行与状态清除，无查回。对应 `受控一次性密码弹窗 / 关闭或卸载后不可再查看`。
- [x] 6.3 实现 `test_detail_top_level_root_password_is_not_rendered_or_stored`：成功响应顶层 `root_password` 不进入 UI/console/storage/后续请求。对应 `密码不进入持久化、日志与回查通道 / 顶层 root_password 不进入 Web`。
- [x] 6.4 实现 `test_detail_credential_timeout_shows_error_without_retry_or_password`：受控超时/断连只发一次请求、不重试、不显示/持久化密码。对应 `密码不进入持久化、日志与回查通道 / 超时或断连不重复提交`。
- [x] 6.5 实现 `test_credential_copy_failure_keeps_password_visible_until_close`：真实 `CredentialModal` clipboard 拒绝后密码行仍可见，关闭后清除。对应 `受控一次性密码弹窗 / 复制失败`。

## 7. 定向验证

- [x] 7.1 运行新文件 21 个独立测试：`npm run test:web -- src/test/AnvilDetailCredentials.test.jsx`，全部通过，无 skip/xfail。Q76 两个暂缓 reset 定位不创建、不执行。
- [x] 7.2 运行相关原套件：`ContainerDetailRefresh`、`ContainerDetailPasswords`、`ContainerDetailHistory`、`ContainerDetailEligibility`、`ContainerDetailDisplay`、`ContainerDetailBindPath`、`ContainerMemberGuardErrors`、`CredentialModal`、`credentialResponse`、`containerApiCredentials`、`RoleAdversarial`、`EditUserModalPasswords`、`CreateContainerPassword`、`DeletedContainersRestorePassword`、`DetailPages`、`DetailPagesLayout`；全部通过。
- [x] 7.3 仅对新文件运行 ESLint：`npx eslint src/test/AnvilDetailCredentials.test.jsx`，无错误。

## Workflow follow-up

- 运行 official `openspec-verify-change` advisory；不创建 `verify.md`，如实报告 21 个独立测试已实施、2 个 Q76 暂缓定位仍未覆盖。
- 运行官方 no-op sync；同步后核对两份主 spec 与全部既有 main spec 的 SHA 不变（用户所述 65 个原 SHA）。
- 官方 sync 成功后，用 `anvil-test-plan` 更新 `frontend--page-container-detail-page` 与 `frontend--container-credentials` 两个 canonical sidecar；保留 Q76 两个 `[ ]` 与真实 Coverage note。
- 用官方 archive 归档到北京时间 `2026-10-28`；不 commit/push，root 验收后由父代理提交。
