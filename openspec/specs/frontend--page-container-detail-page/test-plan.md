# ContainerDetailPage 测试覆盖

规格：[spec.md](spec.md)

## 台账状态

- 主 spec SHA256：`5a44ca43e9997c71b810a1e93204f5b2462c815c1c0f59bdb7d5b363eeecb3b7`
- 历史映射：已覆盖 10；部分覆盖 4；待复核 9；2026-10-24 凭据增量 25 行、详情/历史刷新增量 15 行、ROOT 交接统一增量见文末。
- 测试基线：当前工作区最终实现（未提交）；保留 a98e51d 与 2026-10-24 凭据增量的历史记录，本轮新增详情权威事实/操作历史后台刷新、ROOT 统一交接与“不乐观更新/关闭清密”证据。
- 运行证据：详情/历史刷新定向 7 files / 74 tests（`ContainerDetailRefresh` 18/18）已绿；ROOT 交接焦点 6 files / 30 tests 已绿；最终全量结果见文末“2026-10-24 ROOT 交接统一验证”。
- 真实浏览器：历史 26 cases / 315 checks 的 sourceHashes 对应旧实现；本次详情/历史刷新另有独立 RED 浏览器证据 `RED-history-live.json`，当前源码仍待主代理复验，不能把历史结果当作当前源码的浏览器通过证据。
- 限制：jsdom 组件测试和 CSS 契约测试不计算真实 `scrollWidth`；真实 320/390/768/1440 宽度由历史外部浏览器结果补足；本次详情/历史刷新无真实后端/浏览器审计；CI Node 20.19.0/22 未在本轮实际远程运行。

## 当前场景映射

| Requirement | Scenario | 覆盖状态 | 测试位置与 nodeid/参数 | 验证范围或缺口 |
| --- | --- | --- | --- | --- |
| ContainerDetailPage 页面入口与身份 | 装配页面 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ContainerDetailPage 主流程 | 启动已受理 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ContainerDetailPage 构建归属 | 生成生产产物 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ContainerDetailPage 容器动作使用共享结果 | 与其他页面同上下文一致 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ContainerDetailPage 容器动作使用共享结果 | 失败容器可删除、过渡态不可删除 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ContainerDetailPage 容器动作使用共享结果 | 长期配额、磁盘与冻结残留 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ContainerDetailPage 容器动作使用共享结果 | 提交前重解析 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ContainerDetailPage 容器动作使用共享结果 | 解冻或启动失败不覆盖权威终态 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ContainerDetailPage 容器动作使用共享结果 | 动作确认弹窗不另建资格 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ContainerDetailPage 展示并复制既有宿主 bind 路径 | 有记录时完整展示与复制 | 已覆盖 | ../../../src/test/ContainerDetailDisplay.test.jsx::test_bind_path_and_resources_render_in_runtime_metrics | 断言「有记录时完整展示与复制」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ContainerDetailPage 展示并复制既有宿主 bind 路径 | 空值或旧 Ctrl 缺字段 | 已覆盖 | ../../../src/test/ContainerDetailDisplay.test.jsx::test_missing_bind_path_uses_unrecorded_placeholder_without_request | 断言「空值或旧 Ctrl 缺字段」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ContainerDetailPage 展示并复制既有宿主 bind 路径 | 最近记录与实时核对的区别 | 已覆盖 | ../../../src/test/ContainerDetailDisplay.test.jsx::test_bind_path_is_labeled_as_recent_record | 断言「最近记录与实时核对的区别」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ContainerDetailPage 展示并复制既有宿主 bind 路径 | 复制失败 | 已覆盖 | ../../../src/test/ContainerDetailDisplay.test.jsx::test_bind_path_copy_failure_preserves_value | 断言「复制失败」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ContainerDetailPage 运行指标资源归属 | 资源字段放入运行指标 | 已覆盖 | ../../../src/test/ContainerDetailDisplay.test.jsx::test_gpu_and_shared_memory_are_not_rendered_in_image_card | 断言「资源字段放入运行指标」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ContainerDetailPage 运行指标资源归属 | 资源值缺失或为零 | 已覆盖 | ../../../src/test/ContainerDetailDisplay.test.jsx::test_zero_resource_is_distinct_from_missing_resource | 断言「资源值缺失或为零」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ContainerDetailPage 运行指标资源归属 | 镜像内容缺失 | 已覆盖 | ../../../src/test/ContainerDetailDisplay.test.jsx::test_missing_image_and_dockerfile_use_explicit_placeholders | 断言「镜像内容缺失」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ContainerDetailPage 操作历史随事实刷新 | 点击刷新按钮重取历史 | 已覆盖 | ../../../src/test/ContainerDetailHistory.test.jsx::test_q61_refresh_button_refetches_history | 断言「点击刷新按钮重取历史」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ContainerDetailPage 操作历史随事实刷新 | 操作成功后历史包含最新事实 | 已覆盖 | ../../../src/test/ContainerDetailHistory.test.jsx::test_q61_action_success_refetches_history | 断言「操作成功后历史包含最新事实」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ContainerDetailPage 操作历史随事实刷新 | 操作失败不追加成功历史 | 已覆盖 | ../../../src/test/ContainerDetailHistory.test.jsx::test_q61_action_failure_no_success_history | 断言「操作失败不追加成功历史」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |

| ContainerDetailPage 窄屏布局不横向溢出且长内容可读 | 390px 长标题与长 bind 路径 | 部分覆盖 | ../../../src/test/DetailPagesLayout.test.js::tc_container_css_01_390_title_path | 断言共享网格/标题/复制块 CSS 契约；真实 390px `scrollWidth` 与复制由父代理外部 26/315 补足。 |
| ContainerDetailPage 窄屏布局不横向溢出且长内容可读 | 320px 长运行指标文案 | 部分覆盖 | ../../../src/test/DetailPagesLayout.test.js::tc_container_css_02_320_metrics | 断言指标换行/收缩 CSS 契约；真实 320px 宽度由外部 26/315 补足。 |
| ContainerDetailPage 窄屏布局不横向溢出且长内容可读 | 768px 与桌面的共享布局 | 部分覆盖 | ../../../src/test/DetailPagesLayout.test.js::tc_container_css_03_768_desktop | 断言共享 `minmax(min(460px, 100%), 1fr)` 与换行边界；真实 768/1440 布局由外部 26/315 补足。 |
| ContainerDetailPage 窄屏布局不横向溢出且长内容可读 | 缺少 bind 路径或存在无空格长串 | 部分覆盖 | ../../../src/test/ContainerDetailBindPath.test.jsx::it.each(%s 显示未记录且没有复制候选)；../../../src/test/DetailPagesLayout.test.js::tc_container_css_01_390_title_path | 缺失路径由组件测试覆盖；长串与 320px 无溢出由 CSS 契约和外部 26/315 补足。 |

## 最近验证（2026-10-21 历史）

- 时间：2026-10-21 15:38 +08:00（父代理最终全量）；历史记录保留 2026-10-21 04:01:26 的 a98e51d 基线。
- 版本：当前工作区最终实现；历史基线 `a98e51d`。
- 主 spec SHA256：`14c4ad545eb63165805bf7ddf8c7732f0f57b69543af0d5798ffa05dc8adb54b`。
- 命令与环境：父代理 `npm test` → 前端 68 files/652 tests、server 40 tests，0 failed；`final-table-contract.log` 19 通过；本 capability 历史定向证据 C 组 19 files/189、Q61 6 files/58、change1 6 files/57 保留。
- 结果：新增/修改场景按上表具名测试或机械检查映射；新布局场景标“部分覆盖”，不把 CSS 契约测试写成真实像素通过。
- 稳定性：本会话第 15/16 次全量遇到既有用例 5 秒超时，单 worker 28 项通过，父代理最终全量通过；原因未充分证明，保留 warning。
- 本段限制：jsdom/CSS 契约测试；真实浏览器补充见下；CI Node 20.19.0/22 未实际远程运行。

## 真实浏览器渲染审计（历史与当前）

### 历史基线（2026-10-21）

- 基线：`e659c22`，页面源码未改。临时审计脚本与产物已移至仓库外，不作为仓库内测试依赖。
- 用例：`detail-desktop`、`detail-mobile`、`detail-missing-path`；真实 Chromium 153，1440px/390px，固定 API 夹具。
- 增量证据：运行指标的 GPU/共享内存归属、镜像卡去重、长中文空格路径完整复制到真实剪贴板、缺路径无复制控件、刷新及在线启动禁用已直接检查。
- 历史运行结果：桌面通过；两个窄屏用例均因页面宽度 `468px > 390px` 失败。复制与字段归属断言通过，当时不能据此写成窄屏布局通过。
- 历史缺陷：共享详情网格的最小列宽超过窄屏宽度；该缺陷是本 change 的修复对象，以下当前证据显示已收敛，不再作为当前未修复状态。

### 当前补验（父代理，2026-10-21 15:38 之后）

- 真实 Chromium 26 cases / 315 checks 全部通过，覆盖 320/390/768/1440px；`verified-complete/results.json` 的 sourceHashes 与当前实现一致。
- 当前 `detail` 用例覆盖 390/320 长标题、长 bind 路径真实复制、320 长指标、768/1440 共享布局、缺路径无复制控件，均通过。
- 父代理最终 `npm test` 68 files/652 tests + server 40 tests 全部通过；本会话第 15/16 次全量遇到既有 `HomeEligibility`/`DeletedContainersMountUsage` 5 秒超时，单 worker 28 项通过，父代理最终全量通过；原因未充分证明，保留 warning。
- 未覆盖：真实后端、真实设备、其他浏览器、全部历史场景；当前通过证据只对应上述 26 cases/315 checks 与当前源码 hash。

## 2026-10-24 容器凭据增量映射

| Requirement | Scenario | 覆盖状态 | 测试位置与 nodeid/参数 | 验证范围或缺口 |
| --- | --- | --- | --- | --- |
| 新增协作者凭据与不乐观加入 | 新增 ADMIN 协作者 | 部分覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_add_collaborator_credentials | 当前用例走 COLLABORATOR 新增路径；ADMIN 仅由同一处理器推断，未单独断言。 |
| 新增协作者凭据与不乐观加入 | 新增 COLLABORATOR 协作者 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_add_collaborator_credentials | 断言返回一项凭据、弹窗文案、无“用户已添加”提示且不乐观插入。 |
| 新增协作者凭据与不乐观加入 | 新增受理失败或凭据异常 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_add_collaborator_credentials | 追加 422 rejection：不展示凭据、不显示成功提示、只调用 showErrorModal。 |
| 账号卡密码重置入口与权限 | ROOT 本人可见 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_permission_guards | 断言 ROOT 本人渲染两个账号的重置按钮。 |
| 账号卡密码重置入口与权限 | 资源管理通配者可见 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_permission_guards | 断言资源通配、非 ROOT 时仍显示按钮。 |
| 账号卡密码重置入口与权限 | ADMIN、COLLABORATOR 与方法通配不得放行 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_permission_guards | 断言普通管理员/协作者/无资源位时不显示按钮。 |
| 账号卡密码重置入口与权限 | 缺少 container:operation 方法层守卫 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_permission_guards | 断言 entities 无 container:operation 时按钮不出现。 |
| 账号卡密码重置入口与权限 | 容器不在线或主机不可用 | 已覆盖 | ../../../src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability | helper 断言 offline 时 visible=true、enabled=false；详情页沿用同一谓词。 |
| 账号卡密码重置入口与权限 | 目标绑定缺少 user_id 或提交前变化 | 待复核 | — | 当前 UI 用例未构造缺 user_id 或确认前状态变化；保留缺口。 |
| 账号卡密码重置入口与权限 | 不得回退到默认密码 | 已覆盖 | ../../../src/test/containerApiCredentials.test.js::test_audit_reuse_no_duplicate_logs | 断言 reset 请求体只含 container_id/user_id，无 password/login_name。 |
| 账号卡密码重置请求与受理 | 只提交绑定身份 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_request_and_result | 断言 resetContainerPassword 收到绑定 user_id=2、container_id=12。 |
| 账号卡密码重置请求与受理 | 登录名以前端展示名伪装 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_request_and_result | 断言弹窗使用响应 login_name=alice，而非卡片展示名。 |
| 账号卡密码重置请求与受理 | 受理后立即展示 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_request_and_result | 断言响应后立即出现一项凭据弹窗，不等待轮询。 |
| 账号卡密码重置请求与受理 | 后续结果只看 oplog | 待复核 | — | 未在 UI 用例中断言刷新 oplog 的 reset_container_password 记录；保留缺口。 |
| 账号卡密码重置请求与受理 | 重置失败不泄露密码 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_request_and_result | 失败响应夹带 secret，断言错误参数不含 secret。 |
| 账号卡密码重置请求与受理 | 受理凭据数量或字段非法 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_non_root_credentials_require_exactly_one_complete_item | 断言 reset 非预期项数与空字段被拒。 |
| 详情页 ROOT 上位统一交接 | 只提交一次无分支交接请求 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_root_handover_sends_one_request_without_flag_and_shows_both_credentials | 断言只发一次 updateRole，请求体无 `transfer_root`，无旧 ROOT 降级调用，也无第二个 HTTP。 |
| 详情页 ROOT 上位统一交接 | 普通 ADMIN/COLLABORATOR 互换不生成密码 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_main_flow_password_integration | 断言普通角色切换无凭据弹窗、沿用“角色已更新”。 |
| 详情页 ROOT 交接展示全部凭据且不乐观更新 | 展示原 owner 与 root 两项 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_root_handover_sends_one_request_without_flag_and_shows_both_credentials | 断言弹窗同时显示原 owner 与永久 root 两项，不只展示 root。 |
| 详情页 ROOT 交接展示全部凭据且不乐观更新 | 历史多个旧 owner 的 N+1 项全部展示 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_root_handover_accepts_two_or_more_distinct_complete_credentials；../../../src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_preserves_n_plus_one_and_normal_role_swaps_password_free | parser 断言 3 项原样保留；Home 用例断言 N+1 不截断，详情复用同一弹窗与数组。 |
| 详情页 ROOT 交接展示全部凭据且不乐观更新 | 凭据少于两项、重复或字段非法 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_root_handover_rejects_short_duplicate_or_incomplete_credentials；../../../src/test/containerApiCredentials.test.js::test_root_update_rejects_single_credential_without_retry_or_second_request | 断言少于 2 项、空字段、重复 login_name/password 及 API 单凭据均被拒。 |
| 详情页 ROOT 交接展示全部凭据且不乐观更新 | 目标成为 ROOT 不乐观更新 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_root_handover_waits_for_authoritative_detail_and_clears_passwords_on_close | 断言立即重取仍为旧角色时目标不提前显示 ROOT；完整详情返回旧 ROOT→ADMIN、目标→ROOT 后才收敛。 |
| 详情页 ROOT 交接展示全部凭据且不乐观更新 | 提升失败或结果未知 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_root_handover_failure_shows_error_without_credentials_or_success | 断言 rejection 无成功提示、无凭据弹窗、只显示脱敏错误。 |
| 详情页 ROOT 交接展示全部凭据且不乐观更新 | 关闭弹窗清空全部密码 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_root_handover_waits_for_authoritative_detail_and_clears_passwords_on_close | 断言关闭后两项密码从 DOM 消失，localStorage/sessionStorage 为空。 |
| ContainerDetailPage 主流程 | 启动已受理 | 待复核 | — | 历史主流程场景未在本 change 重跑或重新断言；保留旧台账缺口。 |
| ContainerDetailPage 主流程 | 新增协作者先拿密码再加入 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_add_collaborator_credentials | 断言先展示密码、不乐观插入账号。 |
| ContainerDetailPage 主流程 | 普通角色切换保持原响应 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_main_flow_password_integration | 断言普通角色沿用原成功提示、无密码弹窗。 |
| ContainerDetailPage 主流程 | 详情页 ROOT 交接受理后不等待后台 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_root_handover_sends_one_request_without_flag_and_shows_both_credentials | 断言立即展示原 owner 与 root 两项，不阻塞 Node，不提前改角色。 |

- 2026-10-24 增量验证：主 spec SHA256 `2f0fe32c4f66c24d316e3952cfbd8f15c6435676ed45fc911af80f526200feb2`；实现提交 `f14a16f`；全量证据 `npm test` Web 77/686 + server 40，0 failed/0 skipped；定向 `ContainerDetailPasswords.test.jsx` 6/6、`ContainerResourcePermission.test.jsx` 3/3。
- 未覆盖/待复核保留：ADMIN 新增单独断言、缺 user_id/提交前状态变化、oplog 刷新、旧“启动已受理”。这些不写成已覆盖。

## 2026-10-24 详情与历史刷新增量映射

主 spec SHA256：`e446ad02cc4b690a6df1684c7e70d9081c061046c82c4786c5121437a65d6448`

| Requirement | Scenario | 覆盖状态 | 测试位置与 nodeid/参数 | 验证范围或缺口 |
| --- | --- | --- | --- | --- |
| ContainerDetailPage 详情权威事实周期收敛 | 受理后异步成员自动出现 | 已覆盖 | ../../../src/test/ContainerDetailRefresh.test.jsx::test_async_add_stale_immediate_refresh_then_background_detail_converges_without_manual_refresh | 断言受理后立即重取仍为旧成员、凭据先展示、不乐观插入；下一次周期完整详情包含新成员后无需手刷显示 `@bob · ID 3`。 |
| ContainerDetailPage 详情权威事实周期收敛 | 角色变更与移除最终收敛 | 已覆盖 | ../../../src/test/ContainerDetailRefresh.test.jsx::test_role_change_eventually_converges_from_authoritative_detail；../../../src/test/ContainerDetailRefresh.test.jsx::test_removal_eventually_converges_from_authoritative_detail | 断言立即重取返回旧角色/旧成员时不改 DOM；后续完整详情返回 ADMIN/移除后自动收敛，且不触发密码弹窗。 |
| ContainerDetailPage 详情权威事实周期收敛 | 运行状态与外部详情事实周期更新 | 已覆盖 | ../../../src/test/ContainerDetailRefresh.test.jsx::test_external_detail_facts_refresh_on_background_tick；../../../src/test/DetailPages.test.jsx::container detail initializes with detail API and polls full authoritative detail | 断言冻结状态、长期勾选、磁盘 `77 GB`、CPU `30%`、上次 SSH、运行指标随完整详情更新；周期请求使用 `POLL_TIMEOUT`，`getContainerStatus` 不再被调用。 |
| ContainerDetailPage 详情权威事实周期收敛 | 隐藏页跳过与重新可见恢复 | 已覆盖 | ../../../src/test/ContainerDetailRefresh.test.jsx::test_hidden_page_skips_background_refresh_and_visibility_restore_refreshes | `visibilityState=hidden` 时周期回调不请求详情/历史；恢复可见触发一次详情与历史刷新并显示新成员、新历史。 |
| ContainerDetailPage 详情权威事实周期收敛 | 后台失败保留、防并发 | 已覆盖 | ../../../src/test/ContainerDetailRefresh.test.jsx::test_background_refresh_failure_keeps_existing_detail_without_error_modal；../../../src/test/ContainerDetailRefresh.test.jsx::test_background_refresh_is_reentrancy_guarded_before_request_pileup | 断言后台 reject 保留既有详情、不调用 `showErrorModal`；未完成的后台请求在下一拍不叠加，只在完成后再次请求。 |
| ContainerDetailPage 详情权威事实周期收敛 | 旧响应、换路由与卸载不回写 | 已覆盖 | ../../../src/test/ContainerDetailRefresh.test.jsx::test_late_old_route_detail_response_does_not_overwrite_current_route；../../../src/test/ContainerDetailRefresh.test.jsx::test_unmount_during_detail_request_does_not_show_late_error | 旧容器 12 的晚到详情不覆盖路由 13 的 `train-b`；卸载后 reject 不弹晚到错误。 |
| ContainerDetailPage 详情权威事实周期收敛 | 错误弹窗等待不占用后台刷新与 loading | 已覆盖 | ../../../src/test/ContainerDetailRefresh.test.jsx::test_foreground_error_modal_pending_does_not_hold_detail_inflight | `showErrorModal` 返回 pending Promise 时，网络失败后的下一次周期仍能发起并完成详情请求。 |
| ContainerDetailPage 详情权威事实周期收敛 | 显式请求被 silent 请求淘汰后仍释放 loading | 已覆盖 | ../../../src/test/ContainerDetailRefresh.test.jsx::test_stale_non_silent_request_releases_loading_owned_by_its_lifecycle | 显式 A 在途、silent B 先返回空详情后，A 晚到被丢弃但仍清除 loading；Spin 消失并显示回退标题，不永久卡加载。 |
| ContainerDetailPage 详情权威事实周期收敛 | 旧路由慢请求不阻塞新页后台 | 已覆盖 | ../../../src/test/ContainerDetailRefresh.test.jsx::test_old_route_pending_request_does_not_block_new_route_background_refresh | 旧容器 12 的慢请求仍 pending 时，容器 13 的下一次后台详情刷新仍发起（`POLL_TIMEOUT`）并显示新成员；旧响应不覆盖。 |
| ContainerDetailPage 详情权威事实周期收敛 | 候选平台用户按需刷新 | 已覆盖 | ../../../src/test/ContainerDetailRefresh.test.jsx::test_candidate_users_reload_when_dropdown_opens_without_periodic_platform_user_polling | 下拉展开触发一次候选用户重取并出现 `charlie`；周期回调后用户请求次数仍为 2，未周期轮询平台用户。 |
| ContainerDetailPage 操作历史随事实刷新 | 异步成员变更终态自动出现 | 已覆盖 | ../../../src/test/ContainerDetailRefresh.test.jsx::test_async_add_operation_log_appears_after_background_history_refresh | 受理后立即历史重取仍为旧日志；下一次周期历史返回 `add_collaborator` 后自动显示“添加协作者”，历史不含密码。 |
| ContainerDetailPage 操作历史随事实刷新 | 重置密码终态使用中文标签 | 已覆盖 | ../../../src/test/ContainerDetailRefresh.test.jsx::test_reset_password_terminal_history_uses_chinese_label_without_password | 周期历史返回 `reset_container_password` 后显示“重置容器密码”；不显示原始操作码或 `pw-reset`。 |
| ContainerDetailPage 操作历史随事实刷新 | 历史后台失败保留、防并发 | 已覆盖 | ../../../src/test/ContainerDetailRefresh.test.jsx::test_operation_history_background_uses_short_timeout_guards_and_keeps_logs_on_failure | 周期历史使用 `POLL_TIMEOUT`；在途时下一拍不叠加；失败保留既有“启动容器”记录且不调用 `showErrorModal`。 |
| ContainerDetailPage 操作历史随事实刷新 | 历史隐藏跳过与恢复 | 已覆盖 | ../../../src/test/ContainerDetailRefresh.test.jsx::test_hidden_page_skips_background_refresh_and_visibility_restore_refreshes | 隐藏时历史请求次数保持 1；可见后增至 2 并显示新“启动容器”记录。 |
| ContainerDetailPage 操作历史随事实刷新 | 旧路由与卸载后的历史不回写 | 已覆盖 | ../../../src/test/ContainerDetailRefresh.test.jsx::test_late_old_route_history_refresh_does_not_overwrite_current_route；../../../src/test/ContainerDetailRefresh.test.jsx::test_unmounted_history_background_failure_does_not_write_or_warn | 旧容器 12 的晚到后台历史不覆盖容器 13；卸载后 reject 不写状态且不产生历史告警。 |

### 2026-10-24 详情刷新验证

- 时间：2026-10-24 20:06 +08:00。
- 版本：基线 `97fd6c5`，工作区未提交；实现与测试为本轮改动。
- 主 spec SHA256：`e446ad02cc4b690a6df1684c7e70d9081c061046c82c4786c5121437a65d6448`。
- RED 第一轮：未改源码时新增 `ContainerDetailRefresh.test.jsx` 10 项全部失败；主失败为“立即重取旧列表后触发下一拍周期刷新，仍找不到 `@bob · ID 3`”，另有 role/removal 仍停在 2 次详情请求、外部字段不更新、旧响应晚到覆盖、卸载后仍弹错误、后台未走完整详情、无可见性恢复、候选用户不重取。
- RED 第二轮（独立审查缺口）：补 pending `showErrorModal`、loading 生命周期、跨路由旧请求、历史后台终态后，未改源码时新文件 18 项中 9 项失败：错误弹窗 pending 时后台仍被 in-flight 占用、silent B 先完成后 loading 卡 Spin、旧路由慢请求阻塞新页后台、add/reset 终态历史不出现、历史无短超时/防重入/失败保留、历史无可见性恢复、旧路由历史晚到与卸载防护未覆盖。
- GREEN：`ContainerDetailRefresh` 18/18；相关详情 7 files/74 tests 全通过；`npm test` Web 78 files/704 tests + server 40 tests，0 failed/0 skipped；`npm run build` 通过；`openspec validate --specs --strict` 28/28 通过。
- 日志：`E:/AI/Fuxi_audit_artifacts/detail-refresh-2026-10-24/`（`RED-*`、`RED2-*`、`full-npm-test-final3.log`、`build-final3.log`、`openspec-validate-final3.log`）。
- 限制：测试为 jsdom + 拦截 5s interval 的确定性回调/延迟 Promise，不覆盖真实浏览器可见性事件和真实后端时序；主代理已有独立浏览器 RED（`RED-history-live.json`），当前源码仍待其复验；本 capability 历史真实浏览器结果不对应本轮实现。

## 2026-10-24 ROOT 交接统一验证

- 时间：2026-10-24 +08:00。
- 版本：基线 `97fd6c5` + 当前工作区未提交改动；本轮保留另一 DSH 已完成的完整详情/操作历史 5s 刷新生命周期修复，并在其上统一 ROOT 交接。
- 主 spec SHA256：`5a44ca43e9997c71b810a1e93204f5b2462c815c1c0f59bdb7d5b363eeecb3b7`。
- RED（先写测试、未改实现）：焦点 6 files / 30 tests 中 11 failed / 19 passed。关键失败为：ROOT 请求仍带 `transfer_root:false/true`、ROOT 单凭据被 API 接受（single bypass）、parser 忽略 `rootHandover` 并拒绝两项、详情与 Home 契约测试仍断言旧 flag、ROOT 两项/关闭清密用例失败。
- GREEN 焦点：6 files / 30 tests 全部通过；`ContainerDetailRefresh.test.jsx` 18/18 保持通过；详情页 ROOT 用例断言只发一次无 flag 请求、同时展示原 owner 与永久 root 两项、立即重取仍为旧角色时不乐观更新、完整详情返回后才收敛、关闭后 DOM/Storage 无密码。
- 全量：`npm test` 通过 Web 78 files/708 tests + server 40 tests（0 failed/0 skipped）；`npm run build` 15.17s 通过；`npm run lint` 通过；`openspec validate --specs --strict` 28/28 通过。
- 真实浏览器（复用外部 Playwright 脚本，mock Ctrl API，不操作真实 DB）：`ROOT-after-web-fix` 4/4 检查通过；请求序列仅一次 `update_role` 且无 `transfer_root`，弹窗同时显示 `root` 与 `former_owner` 两项，关闭后两项密码消失，后台权威详情收敛为旧 owner ADMIN + 恰好一个新 ROOT。
- 限制：jsdom 焦点测试；Ctrl 后台 true/false/省略兼容与真实 Node 时序不在本仓验证；未操作真实 DB。
- 日志：`E:/AI/Fuxi_audit_artifacts/root-handover-2026-10-24/`（`web-RED-focused.log`、`web-GREEN-focused.log`、`web-GREEN-detail-refresh-18.log`、`web-GREEN-npm-test.log`、`web-GREEN-build.log`、`web-GREEN-lint.log`、`web-GREEN-openspec-strict.log`）。
