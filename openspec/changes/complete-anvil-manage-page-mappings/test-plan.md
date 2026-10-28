# Test Plan

<!-- Mapping only. 本文件是 scenario→test 对账计划，不是执行结果台账：
     不记录 run/pass/fail/时间戳/覆盖数字。`[X]` 仅表示该映射所引用的既有测试/检查存在，
     且其断言已从测试代码或构建配置确认；`[ ]` 表示该映射为规划项，不代表执行结果或完整覆盖。 -->

## 当前计数与待补断言

- 映射总数：175 个 locator；其中 `[X]` 173、`[ ]` 2。
- 唯一 planned test：37 个；已创建 35 个（online 同源现有覆盖 + 本轮 6 项真实断言已核实）；Q84/Q85 两项未创建。
- 已按批准的 Q84/Q85 拆分方案，从现有 online 函数移出 paused 详情红片段；当前 35 个 created 测试全绿，Q85 独立 future locator 仍未创建。Q84/Q85 两个 locator 保持 `[ ]`。
- 计数增加原因：不删除原 36 planned 目标，也不把 35 created 静默改 34；把本轮暴露的 paused 详情解冻失败从现有 online 同源测试精确拆成独立未来 locator（+1），因此 36 → 37，35 created + Q84/Q85 两个未创建。
- 待补/未创建：
  1. `test_home_paused_detail_exposes_same_unpause_action_as_card`（Q85）：未创建；要求 paused + root/manage 下 Home 卡片「解冻」enabled，详情弹窗「解冻容器」enabled 且同源；当前 Home 未传 `onUnpause`，实际失败，保留完整红证据，不改成“期望按钮缺失”。
  2. `test_manage_user_replace_rbac_groups_submits_deduped_ids`（Q84）：未创建；重复外部输入期望 `[2,5]`，实际 `[2,2,5]`，不修 app、不弱化。
- 现有 online 同源测试保留原有通过断言，并保留本轮新增的 start/restart 断言；其 `[X]` 只覆盖 online 可观察部分，不宣称 paused/Q85 或整个 Scenario 全覆盖。
- Q38 与两项 non-blocking 仍保留：ManageUser 缺角色入口归 Q38；普通角色互换的凭据/弹窗与关闭日志已在本轮 ROOT locator 补断言；Home 路由不虚构 `container_id`/`machine_id`/localStorage 断言。

## frontend--page-home

### Requirement: Home 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] src/test/AnvilManagePages.test.jsx::test_home_route_mounts_page_and_uses_permission_snapshot
- Assertion scope: 真实 `AppRoutes` + `PermissionProvider` + `MemoryRouter` 渲染 `/index`（`MainLayout` 与真实 `Home`，仅替身 API/心跳/Three 装饰）：`location.pathname` 为 `/index`，「我的容器」与容器卡片出现，`listAllContainerBrefInformation` 被调用；当前身份快照下 COLLABORATOR 不显示停止入口。该 locator 不断言 `container_id`/`machine_id` 来源，也不断言 `localStorage` 未参与授权；不从路由测试反推这两个实现细节。
- Coverage note: 既有 `Home.test.jsx`/`HomeEligibility.test.jsx` 直接渲染 `Home` 并 mock `PermissionContext`，没有断言 `/index` 路由装配；本 locator 补路由与身份快照的实际可观察部分。资源主键/localStorage 未断言，不写成页面验收。

### Requirement: Home 主流程

#### Scenario: 已受理停止或重启

- Test/check:
  - [X] src/test/Home.test.jsx::停止请求未决时不改本地状态、不提示成功、不启动轮询
  - [X] src/test/Home.test.jsx::停止受理后才进入 stopping 并启动心跳，提示请求已发送
  - [X] src/test/AnvilManagePages.test.jsx::test_home_restart_accepted_enters_restarting_without_terminal_claim
- Assertion scope: 停止请求未决时卡片保持「运行中」，无「停止中」、无成功提示、不启动心跳；受理后显示「停止中」与「停止请求已发送」，心跳只启动一次，且不提前声称「已停止」。缺口 locator 对 restart 受理断言「重启中」与「重启请求已发送」、心跳一次，不出现「运行中/已重启」终态。
- Coverage note: 既有 locator 覆盖 stop 受理与未决两段；restart 受理中间态由本 locator 覆盖，checkbox 已核实为 `[X]`。

#### Scenario: 操作失败

- Test/check:
  - [X] src/test/Home.test.jsx::停止失败：保持原状态并呈现具体错误，不提示成功、不启动轮询
  - [X] src/test/Home.test.jsx::重启失败：保持原状态并呈现具体错误，不提示成功
  - [X] src/test/Home.test.jsx::退出关联失败：保留本地行并展示具体错误，不提示成功
  - [X] src/test/containerApiSuccess.test.js::HTTP 200 + success=0：拒绝并保留后端 body，供错误展示映射
  - [X] src/test/containerApiSuccess.test.js::HTTP 200 + success=false：同样拒绝
- Assertion scope: stop 失败经 `showErrorModal` 显示标题与后端 message；restart 失败现有用例只断言标题，未断言 message；两者都保持原状态、不提示成功、不启动心跳。退出关联失败保留本地行并显示具体错误，不提示成功。API 边界：`success=0` 的用例断言 `status`、`body`、`route`；`success=false` 的用例只断言 rejection 与 `body.success=false`，没有断言 `status`/`route`。
- Coverage note: 页面层验证 rejection 分支，API 层验证「HTTP 成功但业务失败不算成功」；restart 的 message 文案未被现有断言覆盖，不把测试名当作断言。`success=false` 的 status/route 未单独断言，本 scope 不把它们写成已覆盖。

### Requirement: Home 新增协作者凭据

#### Scenario: 新增 ADMIN 或 COLLABORATOR 后展示密码

- Test/check:
  - [X] src/test/EditUserModalPasswords.test.jsx::test_home_add_collaborator_credentials emits one credential for ADMIN/COLLABORATOR and does not insert optimistically
  - [X] src/test/containerApiCredentials.test.js::test_add_and_role_requests_use_web_contract_without_secrets
  - [X] src/test/AnvilManagePages.test.jsx::test_home_add_admin_credential_modal_after_people_close
- Assertion scope: 默认 COLLABORATOR 新增调用 `addCollaborator`，请求体为 `{user_id, container_id, role}`，受理后回调一项凭据、提示「新增协作者请求已受理」且不提示「用户已添加」；API 边界断言 ADMIN 请求体精确为 `role: 'ADMIN'`，请求不含密码/登录名。缺口 locator 在真实 `Home` 中新增 ADMIN，受理后**显式触发人员弹窗关闭**（真实 `EditUserModal` 的完成/关闭控件，不假定业务新增会自动关闭），断言同一个受控密码弹窗仍打开并显示该项与「重置后{login_name}的密码：」，本地账号列表不立即插入，`addCollaborator` 只调用一次。
- Coverage note: 主规格 `spec.md:32` 说的是“人员弹窗关闭过程中仍展示”，Scenario `spec.md:38` 说的是“关闭后仍展示”，均未要求新增成功后必须自动关闭。ADD 分支没有 `onClose()` 本身不是违规；本 locator 用真实 Home/共享弹窗生命周期主动关闭人员弹窗后验证同一凭据弹窗仍在，不模拟业务自动关闭，不预判失败。只有显式关闭后凭据确实丢失，才作为父级 Global 缺口报告；ROOT 自动关闭路径独立由 `test_home_root_handover_credential_modal_after_people_close` 验证。既有 locator 覆盖默认 COLLABORATOR 的凭据回调/成功提示与 ADMIN 的 API 契约，未断言调用次数，也未覆盖显式关闭后的凭据保持。

#### Scenario: 新增失败或凭据异常

- Test/check:
  - [X] src/test/EditUserModalPasswords.test.jsx::test_home_add_collaborator_credentials reports add failure without credential callback
  - [X] src/test/credentialResponse.test.js::test_non_root_credentials_require_exactly_one_complete_item
  - [X] src/test/containerApiCredentials.test.js::test_audit_reuse_no_duplicate_logs sends add/reset requests without passwords and parses one credential
  - [X] src/test/AnvilManagePages.test.jsx::test_home_add_failure_hides_password_and_keeps_account_list
- Assertion scope: 既有失败用例只断言 `showErrorModal` 被调用、`onCredentialAccepted` 未被回调；解析器拒绝 `accepted:true` 但凭据为空、多于一项、`login_name`/`password` 为空；新增/重置请求体不含密码或登录名，受理响应只解析一项凭据。缺口 locator 在真实 `Home` + 真实 `EditUserModal` + 真实 `showErrorModal` 中让 `addCollaborator` 拒绝（body 带安全 message 与 `credentials.password`），断言弹窗显示脱敏 message、不显示该密码、不提示「新增协作者请求已受理」、`message.success` 不因添加被调用；`EditUserModal` 的 `accounts` 状态（`src/components/EditUserModal.jsx:30,71`）保持原列表，新用户未进入「当前用户列表」行，用户计数不变。
- Coverage note: 现有 `[X]` 只覆盖「未回调凭据 + 调用错误弹窗」，不覆盖脱敏文案、无密码、无成功提示或不新增行；不能把「组件不持有账号列表」当作证据。缺口 locator 按真实 DOM/状态断言，`[ ]` 仍在专属测试文件规划中。

### Requirement: 人员弹窗成员操作失败保留守卫原因

#### Scenario: 新增或移除时容器离线

- Test/check:
  - [X] src/test/EditUserModalPasswords.test.jsx::test_home_member_guard_failures_keep_error_reason
  - [X] src/test/ContainerMemberGuardErrors.test.jsx::离线移除成员：显示中文原因，不残留英文守卫原文或通用 400 提示
  - [X] src/test/ContainerMemberGuardErrors.test.jsx::离线新增成员：包装器保留 error_reason，并隐藏通用英文失败文案与 400 提示
  - [X] src/test/AnvilManagePages.test.jsx::test_home_member_guard_failures_show_chinese_reasons
- Assertion scope: 新增/移除 `container_offline` 失败时 `showErrorModal` 入参保留 `status`、`route`、`error_reason` 与安全 message；真实错误弹窗显示「容器未在线，无法添加协作者」/「容器未在线，无法移除协作者」，不出现英文守卫原文、`未收录的错误原因` 或仅 400 提示。缺口 locator 在真实 `Home` + 真实 `EditUserModal` + 真实 `showErrorModal` 中重放同一路由，断言页面级中文文案与人员弹窗不误报成功、不乐观插入账号。
- Coverage note: 组件层的 reason 保留与共享错误映射已确证；Home 页面级中文展示由本 locator 覆盖，checkbox 已核实为 `[X]`。

#### Scenario: 改角色时容器冻结或处理中

- Test/check:
  - [X] src/test/EditUserModalPasswords.test.jsx::test_home_member_guard_failures_keep_error_reason
  - [X] src/test/ContainerMemberGuardErrors.test.jsx::冻结容器更新角色：显示冻结中文原因，不退回未知原因或 409 通用提示
  - [X] src/test/ContainerMemberGuardErrors.test.jsx::remove failed：包装器 + 归一化 + 真实弹窗保留中文守卫原因
  - [X] src/test/AnvilManagePages.test.jsx::test_home_member_guard_failures_show_chinese_reasons
- Assertion scope: `container_paused` 的 `update_role` 失败保留 `error_reason` 并显示「容器已冻结，无法更新角色」，不退回 409 通用冲突提示；同文件参数化矩阵覆盖 remove failed/busy/status unknown/host offline/host maintenance、add busy 与 update failed 的中文原因，均不出现英文原文或 `未收录的错误原因`。缺口 locator 额外覆盖 update_role 的 `container_busy`（「容器正在处理中，暂时无法更新角色」）与 Home 页面级展示。
- Coverage note: paused、failed、status unknown 与宿主机不可用由既有矩阵覆盖；update_role 的 busy 与 Home 页面集成由本 locator 覆盖，checkbox 已核实为 `[X]`。

### Requirement: Home ROOT 交接统一提交一次

#### Scenario: 只发一次无分支交接请求

- Test/check:
  - [X] src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_sends_one_request_without_flag_and_receives_two_credentials
  - [X] src/test/containerApiCredentials.test.js::test_root_update_is_always_handover_without_flag_and_accepts_n_plus_one
  - [X] src/test/containerApiCredentials.test.js::test_root_update_rejects_single_credential_without_retry_or_second_request
- Assertion scope: 把非 ROOT 账号改选为 ROOT 只调用一次 `updateRole`，请求体精确为 `{container_id, user_id, updated_role:'ROOT'}`，不含 `transfer_root`；不自行降级旧 ROOT、不发送密码/登录名、不发第二个 HTTP；API 层同样只提交一次交接请求，单凭据响应被拒绝且不重试、不发第二次请求。
- Coverage note: 组件层与 API 边界共同覆盖「一次请求、无 flag、无旧 ROOT 降级」；Ctrl 后台的两步执行不在 Web 断言范围。

### Requirement: Home ROOT 交接双凭据且不伪装完成

#### Scenario: 人员弹窗关闭后展示全部凭据

- Test/check:
  - [X] src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_preserves_n_plus_one_and_normal_role_swaps_password_free
  - [X] src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_modal_shows_owner_and_root_then_close_clears_passwords
  - [X] src/test/AnvilManagePages.test.jsx::test_home_root_handover_credential_modal_after_people_close
- Assertion scope: 两项与 N+1 项凭据全部传入同一受控密码弹窗，逐项显示「重置后{login_name}的密码：」，不截断、不丢弃历史账号；受理后本地角色不乐观改写（alice 仍显示协作者）。本轮 locator 已补：一次 ROOT 交接返回三项时同屏逐项显示；普通 ADMIN/COLLABORATOR 互换只成功更新角色、不产生凭据弹窗；关闭前挂 `console.log` spy，关闭后不出现密码内容。
- Coverage note: 既有 N+1 用例只断言回调数组长度；普通互换只断言 updateRole/成功提示；关闭用例只断言 DOM/localStorage/sessionStorage，未挂日志 spy。上述三类已由本 locator 补真实断言并标 `[X]`；不声称执行台账或完整 36 通过。

#### Scenario: 部分完成不伪报成功

- Test/check:
  - [X] src/test/AnvilManagePages.test.jsx::test_home_root_handover_partial_completion_uses_authoritative_refresh
- Assertion scope: ROOT 交接受理后，Home 的静默刷新返回「旧 ROOT 已变 ADMIN、目标仍为 COLLABORATOR」的权威列表；页面不出现「ROOT 交接成功/已交接」等成功宣称，不把目标显示为「超级管理员」，不乐观改写角色；旧 ROOT 的 ADMIN 结果按权威列表显示，后续以刷新/oplog 为准。
- Coverage note: 既有测试没有构造「后台只完成旧 ROOT→ADMIN、目标→ROOT 失败」的部分完成；该行为由本 locator 覆盖，checkbox 已核实为 `[X]`。

#### Scenario: 受理凭据少于两项、重复或字段非法

- Test/check:
  - [X] src/test/credentialResponse.test.js::test_root_handover_rejects_short_duplicate_or_incomplete_credentials
  - [X] src/test/containerApiCredentials.test.js::test_root_update_rejects_single_credential_without_retry_or_second_request
  - [X] src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_failure_reports_without_pretending_success
  - [X] src/test/AnvilManagePages.test.jsx::test_home_root_handover_rejections_keep_no_password_and_authoritative_roles
- Assertion scope: 解析器拒绝少于两项、空字段、重复 login_name 或 password；API 层单凭据响应只发一次请求即拒绝；页面层 rejection 不回调凭据、不提示「ROOT 交接请求已受理」。缺口 locator 断言真实错误弹窗显示通用「凭据响应异常，请稍后重试」类文案、不展示任何部分密码、不乐观改写角色、不自动重试。
- Coverage note: 结构拒绝与「不重试」已确证；页面级通用错误文案与无部分密码展示由本 locator 覆盖，checkbox 已核实为 `[X]`。

#### Scenario: 交接失败

- Test/check:
  - [X] src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_failure_reports_without_pretending_success
  - [X] src/test/AnvilManagePages.test.jsx::test_home_root_handover_rejections_keep_no_password_and_authoritative_roles
- Assertion scope: 请求失败/拒绝/超时经 `showErrorModal` 显示脱敏错误，不打开密码弹窗、不改写角色、不提示成功。缺口 locator 在真实 `Home` 中重放失败，断言密码弹窗不打开、角色仍为权威旧值、错误文案不含秘密。
- Coverage note: 既有 locator 覆盖「不回调凭据、不提示受理成功」；无密码弹窗与角色保持由本 locator 覆盖，checkbox 已核实为 `[X]`。

#### Scenario: 普通 ADMIN/COLLABORATOR 互换不生成密码

- Test/check:
  - [X] src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_preserves_n_plus_one_and_normal_role_swaps_password_free
- Assertion scope: 非 ROOT 的 ADMIN/COLLABORATOR 互换调用普通 `updateRole`，沿用「角色已更新」成功提示并更新本地角色结果。现有 locator 不断言 credentials/密码弹窗；本轮 ROOT locator 已补普通互换不产生凭据、不打开密码弹窗。
- Coverage note: 现有 `[X]` 只覆盖普通 updateRole/成功提示/角色结果；普通角色无凭据、无密码弹窗已由 `test_home_root_handover_credential_modal_after_people_close` 补断言，不把现有覆盖写成完整分支。

#### Scenario: 关闭弹窗清空全部密码

- Test/check:
  - [X] src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_modal_shows_owner_and_root_then_close_clears_passwords
- Assertion scope: 关闭后两项密码文案从 DOM 消失，`document.body.textContent` 不含 `pw-old`/`pw-root`，`localStorage` 与 `sessionStorage` 长度为 0。现有 locator 没有挂 `console.log` spy；本轮 ROOT locator 已补关闭后无密码日志。
- Coverage note: 关闭按钮、DOM 移除与 storage 清空已确证；日志已由 `test_home_root_handover_credential_modal_after_people_close` 补 `console.log` spy 断言，不再写成本行日志未覆盖。

### Requirement: Home 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] npm run build
- Assertion scope: 既有 `vite build` 检查（`npm run build`）：退出码 0，完成构建并产生 `dist` 产物。该 check 只证明构建可完成与产物存在；`Home`/`ModelViewer` 的页面级异步 chunk、`requestManager.jsx`/`validateCmdArg.jsx` 静态导入与 Rollup 警告清单不是该命令的自动断言，属实现上下文与验收观测，不作为本 check 的通过条件。
- Coverage note: 该 check 只对构建命令与产物负责；`React.lazy`/`Suspense` 组织、`manualChunks` 配置与具体警告清单属实现上下文/验收观测，不由本 check 或源码字符串断言。

### Requirement: Home 静默刷新覆盖权限与展示变化

#### Scenario: 只改变角色或磁盘限额

- Test/check:
  - [X] src/test/listRefresh.test.js::covers container role, disk limit, operation gates and displayed fields without order noise
  - [X] src/test/AnvilManagePages.test.jsx::test_home_silent_refresh_role_and_disk_updates_actions
- Assertion scope: 容器刷新指纹在 accounts 角色变化、`disk_limit_gb`/`disk_total_gb` 变化时改变，在成员集合仅换序时保持稳定。本轮 locator 的第二次列表响应同时改变 `disk_total_gb`/`disk_limit_gb`，`visibilitychange` 后断言卡片「磁盘 {total}G / {limit}G」显示新值，并保留角色驱动停止入口断言。
- Coverage note: 指纹比较已确证；页面操作入口更新与磁盘新值展示均由本 locator 补真实断言并标 `[X]`，不把角色断言冒充完整 THEN。

### Requirement: Home 容器动作使用共享纯函数结果

#### Scenario: 卡片与详情弹窗同源

- Test/check:
  - [X] src/test/HomeEligibility.test.jsx::COLLABORATOR 不显示可执行删除，也不自动生成 leave 授权；长期入口禁用可见
  - [X] src/test/HomeEligibility.test.jsx::starting 删除可见但禁用并显示原因，不打开确认
  - [X] src/test/containerActionMatrix.test.js::同一容器同上下文在 status 矩阵下删除/启停/解冻一致
  - [X] src/test/AnvilManagePages.test.jsx::test_home_card_and_detail_modal_share_action_resolution
  - [X] src/test/AnvilManagePages.test.jsx::test_home_collaborator_role_hides_delete_and_disables_long_term
  - [ ] src/test/AnvilManagePages.test.jsx::test_home_paused_detail_exposes_same_unpause_action_as_card
- Assertion scope: `HomeEligibility` 的同名用例实际把容器账号设为 `user_id:9` 的 ROOT、当前 `userId` 为 1，覆盖的是“当前账号在 accounts 中缺失角色”，不是 COLLABORATOR；它断言卡片长期勾选禁用、弹窗无删除/解除关联，但没有断言 `deleteContainer` 未调用。starting 用例断言弹窗删除可见但禁用并显示「容器正在处理中，暂不可操作」；共享矩阵断言 online/offline/paused/failed 的删除/启停/解冻结论。现有 `test_home_card_and_detail_modal_share_action_resolution` 只覆盖 online ROOT 可观察部分：卡片 start 禁用、stop/restart 启用、long-term 启用，详情 delete/close 可用且没有 start/stop/restart/long-term 按钮；该 `[X]` 不宣称 paused 或整个 Scenario 覆盖。未来 `test_home_paused_detail_exposes_same_unpause_action_as_card` 覆盖 paused + root/manage：卡片「解冻」enabled，详情「解冻容器」enabled 且同源；当前 Home 未传 `onUnpause`，实际失败，Q85 未创建。不得把失败改成“期望详情按钮缺失”，也不发明详情不存在的按钮；真实 COLLABORATOR 由已核实 locator 覆盖删除/长期门禁与 `deleteContainer` 未调用。
- Coverage note: 现有 `[X]` 只作“缺失账号角色”证据，不得用作 COLLABORATOR 已覆盖；真实 COLLABORATOR 与 `deleteContainer` 未调用由已核实的 `test_home_collaborator_role_hides_delete_and_disables_long_term` 覆盖。online 同源 `[X]` 与 Q85 paused 详情 `[ ]` 分列；主规格 Scenario THEN 不变，但因 Q85 尚未创建，本场景不宣称全覆盖。Q85 红证据保存在外部 `Q85-paused-detail-current-failing.test.jsx.txt` 与 `Q85-paused-detail.raw.log`；已按批准方案从当前 online 函数移出 paused 红片段，Q85 future 仍未创建。

#### Scenario: 长期超限或冻结残留

- Test/check:
  - [X] src/test/HomeEligibility.test.jsx::长期启用只消费既有字段：配额 false 与磁盘 100% 禁用，缺字段不额外禁用
  - [X] src/test/HomeEligibility.test.jsx::长期取消：冻结行残留但状态 online 时允许取消；失败重读且不伪造勾选
  - [X] src/test/containerActions.test.js::启用方向：配额 false / 磁盘 100% 禁用，缺字段或未达阈值不额外禁用
  - [X] src/test/containerActions.test.js::取消方向：paused 禁用；online/offline 即使 freeze_state 行残留也允许；不检查配额/磁盘
  - [X] src/test/AnvilManagePages.test.jsx::test_home_paused_long_term_cancel_disabled_with_reason
- Assertion scope: 非长期容器 `long_term_container_can_enable=false` 时勾选禁用并显示「绑定用户已达到长期容器上限」；`disk_usage_percent=100` 或 `disk_usage.usage_percent=100` 时禁用并显示磁盘上限原因；两者缺字段/未达阈值不额外禁用；已长期容器 `online/offline` 即使 `freeze_state` 残留也允许取消。helper 对 `paused + is_long_term` 的取消禁用只证明纯函数；缺口 locator 在真实 Home 卡片渲染 `effective_status:'paused'` 且 `is_long_term:true` 的行，断言长期勾选可见、checked、disabled，title 为「容器已冻结」，不把 helper 当页面覆盖。
- Coverage note: Home 页面既有测试只覆盖配额/磁盘与 online/offline 冻结残留；`paused` 已长期行的 DOM 门禁由本 locator 覆盖，checkbox 已核实为 `[X]`。`src/utils/containerActions.js:291-306` 的 helper 结论保留为纯函数证据，不冒充页面接线。

#### Scenario: 权限或只读上下文缺失

- Test/check:
  - [X] src/test/containerActions.test.js::缺失/undefined/空数组/非数组权限失败关闭
  - [X] src/test/containerActions.test.js::readOnly 必须是原生 boolean：true 或缺失/非法时禁用全部七个写动作
  - [X] src/test/containerActionMatrix.test.js::readOnly true/缺失/非法统一覆盖全部七个写动作（含 longTerm/unpause）
  - [X] src/test/HomeEligibility.test.jsx::COLLABORATOR 不显示可执行删除，也不自动生成 leave 授权；长期入口禁用可见
  - [X] src/test/AnvilManagePages.test.jsx::test_home_collaborator_role_hides_delete_and_disables_long_term
- Assertion scope: 缺少 `container:operation`/`container:root`/`container:manage` 时对应动作隐藏或禁用并给出原因，删除不调用 API；`readOnly` 为 true、缺失、字符串/数字等非 boolean 时七个写动作全部禁用，longTerm 隐藏。现有 `HomeEligibility` 用例虽名为 COLLABORATOR，但其 fixture 把容器账号设为 `user_id:9` 的 ROOT、当前 `userId` 仍为 1，实际覆盖的是「当前账号在 accounts 中缺失角色」，不是 COLLABORATOR；它也没有断言 `deleteContainer` 未调用。缺口 locator 显式把当前账号设为 `role:'COLLABORATOR'`（仅 `container:operation`），在真实 Home 卡片/详情弹窗断言删除与解除关联不渲染、长期勾选可见但禁用、`deleteContainer` 未调用。
- Coverage note: 现有 `[X]` 只作为“缺失账号角色”证据，名称中的 COLLABORATOR 不成立；真实 COLLABORATOR 的卡片/详情门禁与删除 API 未调用由本 locator 覆盖，checkbox 已核实为 `[X]`。Home 当前固定传 `readOnly:false`，readOnly 分支由共享 resolver 覆盖；不伪造 Home 中不存在的只读入口。

#### Scenario: 提交前重解析

- Test/check:
  - [X] src/test/HomeEligibility.test.jsx::打开确认框后状态变为 failed：确认时重解析，不调用启动 API
  - [X] src/test/HomeEligibility.test.jsx::打开确认框后权限失效：确认时重解析，不调用停止 API
- Assertion scope: 打开启动确认后列表状态变为 failed，卡片显示「异常」，确认时重解析阻止 `startContainer` 并给出 warning；权限失效后确认停止不调用 `stopContainer` 并给出 warning。长期动作点击即重解析，没有独立确认步骤可伪造。
- Coverage note: 确认框路径已覆盖；长期动作没有独立的「已勾选后提交」步骤，其重解析在点击处理器内完成，未另造不可达场景。

#### Scenario: 解冻失败不伪造终态

- Test/check:
  - [X] src/test/HomeEligibility.test.jsx::解冻受理只说指令已发送并保持 pending；失败不写 paused 假终态且按钮恢复
  - [X] src/test/AnvilManagePages.test.jsx::test_home_unpause_failure_rereads_authoritative_snapshot
- Assertion scope: 解冻受理只提示「解冻指令已发送」并进入「解冻中」，不显示「已解冻」；失败经 `showErrorModal` 显示具体错误，卡片回到「已冻结」，清除「解冻中」并恢复按钮，不写 `online`/`paused` 猜测终态。缺口 locator 断言失败后确实重读权威列表，并以随后返回的 `online` 结束 pending。
- Coverage note: 受理/失败 UI 与 pending 清除已确证；失败后的权威重读由本 locator 覆盖，checkbox 已核实为 `[X]`。

## frontend--page-machine-detail-page

### Requirement: MachineDetailPage 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] src/test/routeLoading.test.jsx::机器详情路径仍匹配并解析 :machineId
  - [X] src/test/DetailPages.test.jsx::machine detail initializes with detail API and polls machine_status cache only
  - [X] src/test/AnvilManagePages.test.jsx::test_machine_detail_route_uses_path_id_and_repair_permission_gate
- Assertion scope: 真实路由 `/index/machines/7` 解析 `machineId=7`，页面以 `getDetailInformation(7)` 加载并以 `getMachineStatus(7, POLL_TIMEOUT)` 轮询；标题/ID 7 与机器数据来自路径主键。缺口 locator 只断言 `machine:manage` 对「修复连接」入口的显示门（有权限显示、无权限隐藏），并断言该门不改变路径主键/读取请求；不把编辑/删除按钮写成受 `machine:manage` 控制。
- Coverage note: 路由参数解析与真实页面加载分别覆盖；精确 DB id 与修复入口门由本 locator 覆盖，checkbox 已核实为 `[X]`。主规格 `openspec/specs/frontend--page-machine-detail-page/spec.md:11` 只规定读取/修改的方法能力，只有“确认后修复连接”Scenario 的 `spec.md:32` 明确“无权限不显示入口”；编辑/删除按钮没有“SHALL 隐藏”的明确约束，因此计划不断言额外前端 edit/delete 门，也不把 Ctrl/后端权限验证冒充成页面隐藏。读取侧 `machine:view`/资源权也没有明确的前端隐藏 SHALL（`src/routes/index.jsx:92` 直接挂载），由入口与 Ctrl/后端作最终读取裁决，本 plan 不伪造该门。

### Requirement: MachineDetailPage 主流程

#### Scenario: 保存未修改端口的基本信息

- Test/check:
  - [X] src/test/MachineDetailPort.test.jsx::标题区显示记录里的实际端口，编辑草稿预填该端口
  - [X] src/test/MachineDetailPort.test.jsx::未改动端口时保存回传真实端口，而不是 null
  - [X] src/test/MachineDetailPort.test.jsx::端口未配置时给出明确缺省语义，不显示默认端口号
  - [X] src/test/AnvilManagePages.test.jsx::test_machine_detail_explicit_null_port_clears_platform_default
  - [X] src/test/AnvilManagePages.test.jsx::test_machine_detail_maintenance_switch_independent_of_machine_status
- Assertion scope: 详情 `port=6789` 时标题显示「端口 6789」，编辑草稿预填 6789；只改描述保存时 `updateMachine(7, ...)` 的 `port` 仍为 6789，不发送 null；详情 `port=null` 时显示「端口 未配置（平台默认）」，不硬编码 5789（已由独立 locator 断言）。维护开关部分已补：捕获真实 `getMachineStatus` 轮询回调并以 `{machine_status:'offline', is_maintenance:true}` 响应，断言维护标记不被轮询清除、状态按离线更新；切换仍先 `updateMachine(7, fields)`、后 `setMachineMaintenance(7,true)`、参数正确且 `machine_status` 不写入。
- Coverage note: 未修改端口与显式清空端口已由独立 `[X]` locator 覆盖；维护开关写入顺序与“轮询不清除维护”均由本 locator 补真实断言并标 `[X]`。`src/pages/MachineDetailPage.jsx:117-126` 的实际顺序是 `updateMachine` 后按维护值变化调用 `setMachineMaintenance`。

#### Scenario: 内存限额 32 GB、共享限额 16 GB

- Test/check:
  - [X] src/test/MachineSharedLimit.test.jsx::共享内存滑条上限取本次编辑的 max_memory_gb（32 GB），不再固定 8 GB
- Assertion scope: 硬件内存 64 GB、本次 `max_memory_gb=32` 时共享滑条与数字输入的 `aria-valuemax` 均为 32，16 GB 可选、可提交；保存 payload `max_memory_gb=32`、`max_shared_gb=16`，不受固定 8 GB 限制。
- Coverage note: 共享上限、16 GB 可选与提交 payload 已确证；未改动端口保存保持原端口由端口场景覆盖。

#### Scenario: 确认后修复连接

- Test/check:
  - [X] src/test/AnvilManagePages.test.jsx::test_machine_detail_renew_trust_confirm_success_failure_and_permission
- Assertion scope: 具备 `machine:manage` 时显示「修复连接」；点击后出现二次确认，确认才调用 `renewMachineTrust(7)`；成功提示「连接信任已重建」，`uid_reissued`/`uid_mismatch` 按响应追加文案，随后静默刷新详情；失败经 `showErrorModal` 显示具体错误；无权限不显示入口，不调用 `registerMachine`、不重建机器档案。
- Coverage note: 既有 `MachineDetailPort`/`MachineSharedLimit` mock 了 `renewMachineTrust` 但没有用例触发；该行为由本 locator 覆盖，checkbox 已核实为 `[X]`。

### Requirement: MachineDetailPage 限额编辑的输入口径与超限阻断

#### Scenario: 降低内存限额

- Test/check:
  - [X] src/test/MachineSharedLimit.test.jsx::降低内存上限时同步收敛已有共享值（32→4 时 shared 16→4），保存 payload 不超限
- Assertion scope: 当前 `max_memory_gb=32`、`max_shared_gb=16`，把内存降到 4 后共享值立即变为 4，数字输入与滑条读数一致，出现「已将共享内存上限下调到 4 GB」提示；保存 payload 为 `max_memory_gb=4`、`max_shared_gb=4` 且后者不大于前者。
- Coverage note: 收敛、可见提示与保存 payload 均已确证。

#### Scenario: 数字输入与滑条同口径

- Test/check:
  - [X] src/test/MachineSharedLimit.test.jsx::四项限额都有与滑条同口径的数字输入，超上限输入收敛到同一上限
- Assertion scope: cpu/memory/shared/disk 四项都有与滑条同 min/max/step 的数字输入；memory 上限 64、cpu 16、shared 32；在 shared 输入 99 后 blur 收敛到 32，滑条与输入一致，并显示「不得高于本次内存上限 32 GB」「硬件内存 64 GB」。
- Coverage note: 四项同口径与超上限收敛已确证；硬盘/CPU 的独立超上限未逐一造数，但同一收敛函数与 max 属性已断言。

#### Scenario: 限额只在机器详情页编辑

- Test/check:
  - [X] src/test/AnvilManagePages.test.jsx::test_manage_machine_add_host_sends_only_trust_anchor_fields
- Assertion scope: 真实 `ManageMachine` 的「添加宿主机」弹窗包含机器名、IP、可选 Node 端口与「描述」`Input.TextArea`；填写描述后提交，断言 `registerMachine` 请求体的 `machine_description` 等于填写值；清空描述再提交，断言 `machine_description` 为空串。请求体只含 `machine_name`/`machine_ip`/`machine_description`/可选 `port`，不含 `max_*`、硬件容量或默认策略字段；弹窗不出现内存/CPU/GPU/磁盘限额输入，限额仍只在机器详情页编辑。
- Coverage note: `src/pages/ManageMachine.jsx:1556-1558` 确有 `machine_description` 的 `Input.TextArea`，`specs/frontend--page-machine-detail-page/spec.md:50` 也明确列出“描述”；本计划不再写“描述没有输入项”。现有测试没有覆盖添加宿主机提交，该行为由本 locator 覆盖，checkbox 已核实为 `[X]`。

### Requirement: MachineDetailPage 保存失败的错误呈现

#### Scenario: 服务层拒绝共享超内存

- Test/check:
  - [X] src/test/MachineSharedLimit.test.jsx::保存被后端拒绝时把具体 message、状态与路由交给 showErrorModal
  - [X] src/test/AnvilManagePages.test.jsx::test_machine_detail_update_failed_422_shows_route_chinese_with_numbers
- Assertion scope: `updateMachine` 返回 422、`error_reason=update_failed`、message 为 `max_shared_gb 16GB cannot exceed max_memory_gb 8GB` 时，页面把原始 body、status 422、route 交给 `showErrorModal`；缺口 locator 使用真实弹窗断言保留 message 与 16GB/8GB，同时出现「更新机器失败」与 422 的中文提示，不出现容器创建超限（`invalid_config`）文案。
- Coverage note: 调用参数已确证；真实弹窗中文/数值与「不串到容器创建」的呈现由本 locator 覆盖，checkbox 已核实为 `[X]`。

#### Scenario: 请求模型层非法值

- Test/check:
  - [X] src/test/AnvilManagePages.test.jsx::test_machine_detail_invalid_payload_400_uses_machine_route_chinese
- Assertion scope: `updateMachine` 返回 400、`error_reason=invalid_payload` 时，真实 `showErrorModal` 显示「机器配置限额参数无效」与 400 的中文提示，不显示容器创建超限文案，也不把 400 当成普通成功或静默失败。
- Coverage note: 机器更新路由的 `invalid_payload` 映射存在，但没有既有行为测试命中该路由；该行为由本 locator 覆盖，checkbox 已核实为 `[X]`。

### Requirement: MachineDetailPage 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] npm run build
- Assertion scope: `npm run build` 退出码 0，完成构建并产生 `dist` 产物。该 check 只证明构建可完成与产物存在；机器详情页/共同布局的懒加载 chunk、`ModelViewer` 的 three 分包与 Rollup 警告清单不是该命令的自动断言，属实现上下文与验收观测，不作为本 check 的通过条件。
- Coverage note: 该 check 只对构建命令与产物负责；`React.lazy`/`manualChunks`/three 分包与具体警告清单不是该命令的自动断言，属实现上下文与验收观测；不新增源码字符串机械测试。

### Requirement: MachineDetailPage 窄屏共享布局不横向溢出

#### Scenario: 390px 长机器名与长指标文案

- Test/check:
  - [X] src/test/DetailPagesLayout.test.js::tc_machine_css_01_390
  - [X] src/test/AnvilManagePages.test.jsx::test_machine_detail_responsive_dom_and_optional_metrics
- Assertion scope: CSS 静态检查确认共享网格使用 `repeat(auto-fit, minmax(min(460px, 100%), 1fr))`、标题 `overflow-wrap:anywhere`、指标补充文案声明可换行；缺口 locator 在 jsdom 中渲染 390px 场景的长机器名/较长描述与完整 CPU/内存/GPU/磁盘指标，只断言名称、指标文案、趋势图标题、保存/编辑控件存在于真实 DOM，保存/编辑可被调用，卡片分组与 DOM 顺序可读。jsdom 不做布局计算，不证明单列、换行、`scrollWidth <= 392` 或无横向滚动；这些由真实浏览器验收。
- Coverage note: 既有 CSS locator 只证明声明契约；本 locator 只补真实 DOM/控件存在与可调用，不伪造像素布局。390px 换行、单列与滚动边界需真实浏览器证据；DOM 映射 checkbox 已核实为 `[X]`。

#### Scenario: 320px 长 GPU 名称与限制说明

- Test/check:
  - [X] src/test/DetailPagesLayout.test.js::tc_machine_css_02_320
  - [X] src/test/AnvilManagePages.test.jsx::test_machine_detail_responsive_dom_and_optional_metrics
- Assertion scope: CSS 静态检查确认 980px 以下 `.machine-limit-row` 声明改为纵向、GPU 选项 `max-width:140px`、`.detail-card` `min-width:0`；缺口 locator 在 jsdom 中渲染 320px 场景的无空格长 GPU 名称与长限制说明，只断言长文本存在、保存按钮与 GPU 选择控件存在于真实 DOM 且可点击。jsdom 不证明实际换行、省略、控件完整可见或页面无横向滚动；这些由真实浏览器验收。
- Coverage note: 静态 CSS 与 jsdom DOM 是两类证据；本 locator 不声称 320px 下的视觉换行/完整可见/无滚动，只补文本与控件接线；DOM 映射 checkbox 已核实为 `[X]`，像素布局需浏览器验收。

#### Scenario: 768px 与桌面的共享布局

- Test/check:
  - [X] src/test/DetailPagesLayout.test.js::tc_machine_css_03_768_desktop
  - [X] src/test/AnvilManagePages.test.jsx::test_machine_detail_responsive_dom_and_optional_metrics
- Assertion scope: CSS 静态检查确认共享网格在桌面/768 声明可收缩最小列宽、指标卡 `min-width:0`；缺口 locator 分别在 jsdom 的 768px/1440px 场景渲染同一份详情，只断言指标、趋势图、限额编辑控件均存在于真实 DOM，且 DOM 文档顺序不因视口设置改变。jsdom 不证明网格收缩、无横向溢出、多列布局或视觉归属；这些由真实浏览器验收。
- Coverage note: 既有 locator 只断言 CSS；本 locator 只补 DOM/控件存在与文档顺序，不冒充 768/1440 布局或溢出结论；DOM 映射 checkbox 已核实为 `[X]`，像素布局需浏览器验收。

#### Scenario: 可选指标缺失时仍保持布局

- Test/check:
  - [X] src/test/DetailPagesLayout.test.js::tc_machine_css_04_optional_metrics
  - [X] src/test/AnvilManagePages.test.jsx::test_machine_detail_responsive_dom_and_optional_metrics
- Assertion scope: CSS 静态检查确认指标值/补充文案/运行项声明允许换行且 `min-width:0`；缺口 locator 在 jsdom 中让 `runtime_snapshot` 缺少 CPU、GPU 或磁盘部分字段，只断言缺失项按既有未知占位显示、页面不发起补充请求或伪造数值、保存/限额控件仍存在于真实 DOM。jsdom 不证明卡片不超视口、长标题实际换行或视觉可读性；这些由真实浏览器验收。
- Coverage note: 静态 CSS 不覆盖未知占位与请求行为；本 locator 补 DOM/占位/无补充请求，不声称视口或换行结果；DOM 映射 checkbox 已核实为 `[X]`，像素布局需浏览器验收。

## frontend--page-manage-machine

### Requirement: ManageMachine 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] src/test/ManageMachineEligibility.test.jsx::online 卡片 stop/restart 可用、start 禁用；无新增详情/删除按钮
  - [X] src/test/AnvilManagePages.test.jsx::test_manage_machine_route_requires_bypass_and_renders_page
- Assertion scope: 真实页面在 `/admin/machines` 下装配，读取机器/容器列表并渲染机器卡片；页面自身检查 `bypass_auth_entity`：缺失时经 `showErrorModal` 提示「需要操作员权限」并导航 `/index`，不把无权限状态当成可管理页面；具备 `machine:manage` + `bypass_auth_entity` 时真实 `ManageMachine` 落位。缺口 locator 使用真实 `AppRoutes` + `PermissionProvider`，并断言页面身份快照与机器资源主键分别处理。
- Coverage note: 既有页面测试直接渲染 `ManageMachine` 且 mock `PermissionContext`，没有路由装配和页面级 bypass 断言；该行为由本 locator 覆盖，checkbox 已核实为 `[X]`。守卫只负责拒绝/导航，不以“列表请求是否已发出”作为权限结论。

### Requirement: ManageMachine 主流程

#### Scenario: 机器上仍有容器时尝试删除机器

- Test/check:
  - [X] src/test/AnvilManagePages.test.jsx::test_manage_machine_delete_blocked_when_containers_remain
- Assertion scope: 点击机器卡片的「删除」后，确认面板先按 `{machine_id, page_number:1, page_size:1}` 查询容器总数；总数大于 0 时显示「该机器仍有 N 个容器，请先手动清理后再删除。」并禁用确认，不调用 `removeMachine`；总数为 0 时确认可用，确认后调用 `removeMachine([id])`；最终仍由后端拒绝带容器机器作为权威兜底。
- Coverage note: 机器详情页的删除确认另有测试，但不覆盖机器列表的容器计数/禁用；该行为由本 locator 覆盖，checkbox 已核实为 `[X]`。

### Requirement: ManageMachine 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] npm run build
- Assertion scope: `npm run build` 退出码 0，完成构建并产生 `dist` 产物。该 check 只证明构建可完成与产物存在；`ManageMachine` 的懒加载 chunk、共同布局/`ModelViewer` 分包与 Rollup 警告清单不是该命令的自动断言，属实现上下文与验收观测，不作为本 check 的通过条件。
- Coverage note: 该 check 只对构建命令与产物负责；`React.lazy`/`manualChunks`/three 分包与具体警告清单不是该命令的自动断言，属实现上下文与验收观测；不新增源码字符串机械测试。

### Requirement: ManageMachine 静默刷新覆盖展示与权限字段

#### Scenario: 机器展示或容器权限单独变化

- Test/check:
  - [X] src/test/listRefresh.test.js::covers machine display fields and live snapshot meters
  - [X] src/test/listRefresh.test.js::covers container role, disk limit, operation gates and displayed fields without order noise
  - [X] src/test/ManageMachineDetailRefresh.test.jsx::test_q69_manage_machine_unpause_keeps_second_page
  - [X] src/test/AnvilManagePages.test.jsx::test_manage_machine_silent_refresh_updates_machine_and_role_keeps_page
- Assertion scope: 机器指纹覆盖名称、地址、类型、状态、维护标记与实时 CPU/内存/GPU 利用率，GPU 数组换序不触发刷新；容器指纹覆盖账号角色、绑定、长期配额与磁盘限额，集合顺序无语义变化保持稳定。本轮 locator 已补：第二页保持「2 / 3」；机器列表刷新提供新的 CPU/内存/GPU 利用率，卡片对应百分比更新；容器角色 COLLABORATOR→ADMIN 后停止入口按共享 resolver 变为可见但禁用；不把 `listRefresh` 指纹测试混写成本用例已断言。
- Coverage note: 指纹字段与「解冻保第二页」分别由既有 locator 覆盖；本 locator 的机器实时展示与新角色操作入口已补真实断言并标 `[X]`。

### Requirement: ManageMachine 使用真实权限与共享动作结果

#### Scenario: 卡片与既有组件契约结论一致

- Test/check:
  - [X] src/test/ManageMachineEligibility.test.jsx::test_q35_manage_machine_shared_action_contract
  - [X] src/test/ManageMachineEligibility.test.jsx::test_q35_manage_machine_long_term_unpause_fields
  - [X] src/test/AnvilManagePages.test.jsx::test_manage_machine_paused_card_unpause_matches_shared_resolution
- Assertion scope: 共享 resolver 对 online/ROOT 给出 stop/restart 可执行、start 禁用、delete 可见可执行、longTerm 未勾选；真实机器卡片显示 stop/restart 可执行、start 禁用、长期勾选未选中，且没有容器删除按钮。resolver 对 paused 容器给出 unpause 可见可执行；缺口 locator 在真实 paused 机器卡片上同时断言「解冻」按钮可见/可执行，并与 `resolveContainerActions` 的 unpause 结论逐项一致，不把 helper 当页面契约。
- Coverage note: `test_q35_manage_machine_shared_action_contract` 只覆盖 stop/start/delete 与长期勾选，没有 unpause；`test_q35_manage_machine_long_term_unpause_fields` 只证明 resolver 的 unpause，仍不足页面契约。真实 paused 卡片的 unpause 页面门由本 locator 覆盖，checkbox 已核实为 `[X]`。

#### Scenario: 失败容器仍可删除

- Test/check:
  - [X] src/test/ManageMachineEligibility.test.jsx::test_q35_manage_machine_failed_delete_eligibility
  - [X] src/test/DetailPages.test.jsx::container detail delete button opens confirm and calls delete API after confirmation
- Assertion scope: `failed` 容器在 `container:operation` + ADMIN 级资源角色下共享删除资格为可见可执行，长期资格拒绝 `failed` 只影响长期；真实机器卡片不出现容器删除按钮；实际删除沿既有容器详情页入口执行：详情页删除按钮打开「确认删除容器」，确认后调用 `deleteContainer(12)` 并导航。
- Coverage note: 失败容器资格由 resolver 断言，详情页实际删除由既有详情测试在 online 容器上断言；同日径 handler 与 resolver 不另写源码字符串伪证。

#### Scenario: 过渡或主机异常不可删除

- Test/check:
  - [X] src/test/ManageMachineEligibility.test.jsx::test_q35_manage_machine_transition_delete_denied
- Assertion scope: `building/creating/starting/stopping/restarting` 的删除资格为可见、禁用、原因 `container_busy`；`host_offline`/`host_maintenance`/`status_unknown` 分别为对应宿主机/状态原因；机器卡片不发送删除请求，`ManageMachine.jsx` 不调用 `deleteContainer`。
- Coverage note: 该用例的 source 检查只用于「卡片不调用删除」的负向约束；资格结论由 resolver 的真实断言给出。

#### Scenario: 不用系统管理员标志伪造删除

- Test/check:
  - [X] src/test/ManageMachineEligibility.test.jsx::test_q35_manage_machine_no_sysadmin_delete_bypass
- Assertion scope: 缺少方法权限与 ADMIN 级资源角色时删除资格不可见/不可执行；即使上下文带 `forceSystemAdmin:true`/`isRoot:true`，删除与长期结果与无权限基线完全一致；人员管理能力不复用删除资格。后端 403 仍按真实错误展示，前端不伪造可执行。
- Coverage note: 前端资格矩阵已确证；真实 Ctrl 403 属于后端最终裁决与通用错误链路，未在本用例重测。

#### Scenario: 长期与解冻使用既有字段

- Test/check:
  - [X] src/test/ManageMachineEligibility.test.jsx::长期启用配额 false / 磁盘 100% 禁用；冻结行残留的已长期容器允许取消
  - [X] src/test/ManageMachineEligibility.test.jsx::解冻受理固定文案；失败清 pending/loading 并重读，无“已解冻”
  - [X] src/test/ManageMachineEligibility.test.jsx::长期失败清除更新中、保留行与计数并可重试
  - [X] src/test/containerActions.test.js::取消方向：paused 禁用；online/offline 即使 freeze_state 行残留也允许；不检查配额/磁盘
- Assertion scope: 非长期容器配额已满/磁盘 100% 时勾选禁用并显示对应原因；已长期容器 `online/offline` 即使冻结行残留也勾选且可取消；helper 对 `paused + is_long_term` 取消禁用只作纯函数证据；解冻受理提示「解冻指令已发送」、不显示「已解冻」，失败清除 pending/loading、显示错误并重读，保留行/计数并可重试，不伪造终态。
- Coverage note: 页面覆盖配额/磁盘、冻结残留与解冻失败；`paused` 已长期行的真实页面门禁由 Home/ManageUser/ManageUserInTable 的已核实 locator 覆盖，ManageMachine 未单独渲染该分支，本行不宣称 ManageMachine 页面 DOM 覆盖。

### Requirement: ManageMachine 容器详情统一使用专用详情页

#### Scenario: 点击容器标题进入专用详情页

- Test/check:
  - [X] src/test/ManageMachineDetailRefresh.test.jsx::test_q35_manage_machine_card_navigates_detail
- Assertion scope: 点击机器页容器标题后路由路径匹配 `/index/containers/12`（既有用例的详情页为 `<div data-testid>` 桩，不是真实详情页渲染），页面不出现旧「容器详细信息」弹窗；标题按钮语义保留，不打开旧 `ContainerDetailModal`。
- Coverage note: 现有用例只证明路由路径匹配（页面为桩）与旧弹窗不渲染；不把桩页面称为真实专用详情页落点。

#### Scenario: 删除确认取消不打开旧详情弹窗

- Test/check:
  - [X] src/test/ManageMachineDetailRefresh.test.jsx::test_q35_manage_machine_cancel_delete_no_modal
- Assertion scope: 真实机器卡片没有容器删除按钮，初始无 `role=dialog`；旧详情弹窗来源的删除确认回跳符号不再存在；本 change 不新增卡片删除入口，实际删除仍沿容器详情页既有入口。
- Coverage note: 无按钮/无弹窗由真实 DOM 断言，旧回跳链的「不存在」由同用例的静态源码检查直接核对；这是主规格明确要求的负向清理，不升级为行为断言。

#### Scenario: 源码不再引用旧弹窗链

- Test/check:
  - [X] src/test/ManageMachineDetailRefresh.test.jsx::test_q35_manage_machine_no_legacy_modal
- Assertion scope: `ManageMachine.jsx` 源码不再匹配 `ContainerDetailModal`、`openContainerDetail`、`returnToDetail`、`detailModalVisible`；真实页面也不出现旧「容器详细信息」弹窗。
- Coverage note: 该 Scenario 的 THEN 就是静态符号清理，源码检查是直接检查；不把该检查用于其它行为场景。

### Requirement: ManageMachine 解冻后保留当前页与筛选并防止旧结果回拉

#### Scenario: 第二页解冻后仍在第二页

- Test/check:
  - [X] src/test/ManageMachineDetailRefresh.test.jsx::test_q69_manage_machine_unpause_keeps_second_page
- Assertion scope: 在机器容器子列表第二页解冻一个容器，受理成功后刷新请求仍使用 `page_number=1`（第二页）与当前搜索词，页面仍显示「2 / 3」和原第二页容器，不跳回第一页。
- Coverage note: 页码、搜索词与解冻后列表保持均已断言。

#### Scenario: 操作期间切页后旧刷新不回拉

- Test/check:
  - [X] src/test/ManageMachineDetailRefresh.test.jsx::test_q69_manage_machine_unpause_switch_page_race
- Assertion scope: 解冻请求在途时切到上一页，旧刷新随后返回；旧结果被丢弃，页面保持用户切换后的「1 / 3」与第一页容器，不把第二页内容拉回。
- Coverage note: 真实组件 + 延迟响应构造竞态；旧结果丢弃已断言。

#### Scenario: 解冻失败保留当前页

- Test/check:
  - [X] src/test/ManageMachineDetailRefresh.test.jsx::test_q69_manage_machine_unpause_failure_keeps_page
  - [X] src/test/ManageMachineEligibility.test.jsx::解冻受理固定文案；失败清 pending/loading 并重读，无“已解冻”
- Assertion scope: 第二页解冻接口失败后仍停留在「2 / 3」，保留当前页容器与筛选，卡片回到「磁盘已冻结」、无「解冻中」，不把列表重置为第一页。失败原因由 `ManageMachineEligibility` 断言：`showErrorModal` 收到 `message.message === 'unpause failed'`；`ManageMachineDetailRefresh` 只断言页码/卡片状态与错误弹窗被调用，不把“原因文案”归给它。
- Coverage note: 页码、卡片状态与错误弹窗调用由 `test_q69_manage_machine_unpause_failure_keeps_page` 断言；失败原因参数由 `ManageMachineEligibility` 的同路由用例断言，两者合起来才覆盖本 Scenario。不写“均已断言”而不列原因 locator。

## frontend--page-manage-user

### Requirement: ManageUser 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] src/test/routeLoading.test.jsx::"/admin/users" 无 manage 权限 → AdminLayout 守卫仍渲染 403，不进入管理页
  - [X] src/test/routeLoading.test.jsx::"/admin/users" 有 user:manage → 管理布局与管理页正常就位
  - [X] src/test/ManageUserDetailLink.test.jsx::test_q35_manage_user_container_row_navigates_detail
  - [X] src/test/AnvilManagePages.test.jsx::test_manage_user_route_requires_bypass_and_renders_page
- Assertion scope: `/admin/users` 路由在无 manage 权限时由 `AdminLayout` 渲染 403，不进入管理页；有 `user:manage` 时管理布局与管理页落位；真实 `ManageUser` 在 `/admin/users` 下加载用户/容器列表。缺口 locator 补页面自身 `bypass_auth_entity`：缺失时显示「需要操作员权限」403 并导航 `/index`，具备时真实页面渲染「用户与容器关系」；页面身份快照与用户/容器资源主键分别处理。
- Coverage note: 既有 routeLoading 桩化 `ManageUser`，只证明路由/布局守卫；真实页面测试直接渲染组件，不经过页面级 bypass。该守卫与真实入口由本 locator 覆盖，checkbox 已核实为 `[X]`。

### Requirement: ManageUser 主流程

#### Scenario: 为用户替换权限组

- Test/check:
  - [ ] src/test/AnvilManagePages.test.jsx::test_manage_user_replace_rbac_groups_submits_deduped_ids
  - [X] src/test/AnvilManagePages.test.jsx::test_manage_user_reset_and_delete_keep_user_scope
- Assertion scope: 该 Q84 locator 当前未创建，保留 `[ ]`：当实现时，在真实 `ManageUser` 中打开「权限组」弹窗并构造重复 matrix/bindings 输入（matrix 返回同一 group id 两次，或 `getUserRbacGroups` 返回重复 `group_ids`），保存后断言 `setUserRbacGroups(7, uniqueNumericIds)` 的 `group_ids` 已去重、全为数字、不夹带权限对象。当前实际调用收到 `[2, 2, 5]`，不是去重后的 `[2, 5]`，因此不能标 `[X]`。重置密码/删除用户由独立 `[X]` locator 承载。
- Coverage note: Global Q84 已登记重复外部 matrix/bindings 输入下提交 ID 未去重；唯一依赖该修复的 locator 未创建，不用 skip/xfail，不修 app。原规划 36 项未删减，增加 Q85 后总 37 个唯一 planned；当前 35 个已创建测试的 online/既有断言已确认，Q84/Q85 未创建。组存在性、自锁保护与角色变更的跨仓契约不在 Web 断言范围；主规格正文的“容器角色变更”仍归入既有 Global Q38，不造入口通过测试。运行证据与原失败测试保存在外部审计产物，不属于本映射。

### Requirement: 移除容器关联失败保留守卫原因

#### Scenario: 离线移除关联

- Test/check:
  - [X] src/test/ManageUserEligibility.test.jsx::test_manage_user_remove_association_failure_keeps_error_reason
  - [X] src/test/ContainerMemberGuardErrors.test.jsx::离线移除成员：显示中文原因，不残留英文守卫原文或通用 400 提示
  - [X] src/test/AnvilManagePages.test.jsx::test_manage_user_remove_offline_shows_chinese_guard_reason
- Assertion scope: `remove_collaborator` 返回 400、`error_reason=container_offline` 与英文守卫 message 时，页面把 status/route/error_reason 保留给 `showErrorModal`；真实弹窗显示「容器未在线，无法移除协作者」，不出现英文原文、`未收录的错误原因` 或仅「请求无效」的 400 提示。缺口 locator 在真实 `ManageUser` + 真实错误弹窗中重放，断言页面级中文文案、不本地拼接 message、不误移除行。
- Coverage note: 组件层 reason 保留与共享错误映射已确证；ManageUser 页面级中文展示由本 locator 覆盖，checkbox 已核实为 `[X]`。

### Requirement: ManageUser 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] npm run build
- Assertion scope: `npm run build` 退出码 0，完成构建并产生 `dist` 产物。该 check 只证明构建可完成与产物存在；`ManageUser` 的懒加载 chunk、共同布局/`ModelViewer` 分包与 Rollup 警告清单不是该命令的自动断言，属实现上下文与验收观测，不作为本 check 的通过条件。
- Coverage note: 该 check 只对构建命令与产物负责；`React.lazy`/`manualChunks`/three 分包与具体警告清单不是该命令的自动断言，属实现上下文与验收观测；不新增源码字符串机械测试。

### Requirement: ManageUser 静默刷新覆盖身份与容器操作字段

#### Scenario: 用户或关联容器业务字段变化

- Test/check:
  - [X] src/test/listRefresh.test.js::covers user profile fields shown in the user list
  - [X] src/test/listRefresh.test.js::covers container role, disk limit, operation gates and displayed fields without order noise
  - [X] src/test/ManageUserEligibility.test.jsx::test_q59_parent_controls_second_page_with_page_size_four
  - [X] src/test/AnvilManagePages.test.jsx::test_manage_user_silent_refresh_updates_fields_keeps_page
- Assertion scope: 用户指纹覆盖用户名/邮箱/毕业年份/各项容器统计，容器指纹覆盖角色、绑定、长期配额与磁盘限额，集合顺序无语义变化保持稳定；子列表分页使用 `page_size=4` 并由父页当前页控制。本轮 locator 已补：用户容器计数 6→7、第二页「2 / 2」、容器角色 COLLABORATOR→ADMIN 后管理员标签出现、第二页容器磁盘「磁盘 140G / 160G」更新，并在本用例内断言 `page_number=1, page_size=4`。
- Coverage note: 指纹与既有父页分页由其它 locator 覆盖；本用例的磁盘限额新值与 `page_size=4` 归属已补真实断言并标 `[X]`。

### Requirement: ManageUser 容器动作使用共享结果且不新增删除入口

#### Scenario: 与其他页面同上下文一致

- Test/check:
  - [X] src/test/ManageUserEligibility.test.jsx::test_q35_manage_user_shared_action_consistency
  - [X] src/test/containerActionMatrix.test.js::同一容器同上下文在 status 矩阵下删除/启停/解冻一致
  - [X] src/test/ManageMachineEligibility.test.jsx::test_q35_manage_machine_shared_action_contract
  - [X] src/test/ContainerDetailEligibility.test.jsx::COLLABORATOR 无资源角色不显示删除/启停，长期入口保留但禁用
  - [X] src/test/ContainerDetailEligibility.test.jsx::长期取消：paused 禁用；online 冻结行残留允许；409 重读且不伪造 checked
  - [X] src/test/AnvilManagePages.test.jsx::test_manage_user_shared_actions_match_other_pages
- Assertion scope: shared resolver 对 online/ROOT 给出 stop/restart 可执行、start 禁用、longTerm 启用；对 paused 容器给出 unpause 可执行，对 `paused + is_long_term` 给出长期取消禁用。本轮 locator 已在 Home/ManageMachine/ManageUser 三页真实卡片补 online/ROOT 与 paused 可观察控件：online start 禁用、stop/restart 启用、long-term 启用；paused unpause 启用、长期 checked/disabled；删除只在 Home 详情弹窗存在，ManageMachine/ManageUser 卡片没有删除按钮，不发明跨页删除对照。
- Coverage note: 既有用例含 resolver 与 ContainerDetailPage 矩阵；本 locator 已补三页真实卡片（不 mock 页面）的 online 与 paused 可观察控件断言并标 `[X]`，不把 helper 或 mock 页面写成完整矩阵。

#### Scenario: 操作员与容器角色差异

- Test/check:
  - [X] src/test/ManageUserEligibility.test.jsx::COLLABORATOR 无资源通配时启停隐藏，长期入口保留但禁用
  - [X] src/test/ManageUserEligibility.test.jsx::test_q35_manage_user_role_matrix
  - [X] src/test/containerActionMatrix.test.js::同一 online 容器在 ROOT 下：启停/删除/长期启用口径明确
  - [X] src/test/containerActionMatrix.test.js::ADMIN 的 command 权限与 longTerm 权限差异明确
  - [X] src/test/containerActionMatrix.test.js::manage operator 的 command 权限与 longTerm 权限差异明确
  - [X] src/test/containerActions.test.js::COLLABORATOR 只能解冻，不能启停/删除；ADMIN 可启停删
  - [X] src/test/AnvilManagePages.test.jsx::test_manage_user_admin_and_manage_operator_start_stop_matrix
- Assertion scope: 现有真实断言只支撑以下部分：`test_q35_manage_user_role_matrix` 断言 ROOT/ADMIN 的 stop、ADMIN 无长期权限、COLLABORATOR 的 stop 隐藏与长期禁用、缺失角色的 stop/longTerm/delete 保守结果；`containerActionMatrix` 的 ROOT 行断言 start 可见禁用、stop/restart/delete 可执行、longTerm 未勾选启用；其 ADMIN/manage operator 参数化行只断言 delete 与 longTerm；`containerActions.test.js` 的“ADMIN 可启停删”标题下实际只断言 COLLABORATOR 的 start/delete 隐藏与 ADMIN 的 delete 可执行，没有 start/stop。缺口 locator 在真实 ManageUser 中分别以仅 `container:manage` 的操作员与 `container:operation` + ADMIN 角色渲染 online/offline 容器，断言 start/stop 的 visible/enabled 与共享 resolver 一致，并保留 COLLABORATOR 启停隐藏、缺失角色保守禁用及长期权限差异。
- Coverage note: ADMIN 与 manage operator 的 start/stop 没有既有真实断言；不得用测试标题“可启停删”补足。`ADMIN`/`manage operator` 两行是 `containerActionMatrix` 的 `it.each` 生成名，仅覆盖 delete/longTerm。该 start/stop 行为由本 locator 覆盖，checkbox 已核实为 `[X]`；既有 `[X]` 只覆盖 delete/longTerm 与 ADMIN stop、COLLABORATOR/缺失角色停止门。

#### Scenario: 长期使用既有字段

- Test/check:
  - [X] src/test/ManageUserEligibility.test.jsx::长期只消费既有字段：配额 false/磁盘 100% 禁用；非法 is_long_term 只禁用长期
  - [X] src/test/ManageUserEligibility.test.jsx::长期取消：冻结行残留但 online 允许；409 不提示成功并重读
  - [X] src/test/containerActions.test.js::取消方向：paused 禁用；online/offline 即使 freeze_state 行残留也允许；不检查配额/磁盘
  - [X] src/test/AnvilManagePages.test.jsx::test_manage_user_paused_long_term_cancel_disabled_with_reason
- Assertion scope: 配额已满/磁盘 100% 时长期启用禁用并显示对应原因；`is_long_term` 非法时只禁用长期，不连带启停；已长期 `online` 即使冻结行残留也允许取消，409 失败不提示成功并重读，勾选保持权威值。helper 对 `paused + is_long_term` 的取消禁用只证明纯函数；缺口 locator 在真实 ManageUser 卡片渲染 `effective_status:'paused'` 且 `is_long_term:true` 的行，断言长期勾选可见、checked、disabled，title 为「容器已冻结」，不把 helper 当页面覆盖。
- Coverage note: 页面既有测试覆盖配额/磁盘/非法标记/冻结残留与 409；`paused` 已长期行的 DOM 门禁由本 locator 覆盖，checkbox 已核实为 `[X]`。`src/utils/containerActions.js:291-306` 的 helper 结论保留为纯函数证据，不冒充页面接线。

#### Scenario: 卡片无删除入口与既有只读组件契约

- Test/check:
  - [X] src/test/ManageUserEligibility.test.jsx::卡片使用共享结果；无容器删除/详情新增按钮
  - [X] src/test/ManageUserEligibility.test.jsx::test_q35_manage_user_no_delete_or_modal_contract
  - [X] src/test/ManageUserDetailLink.test.jsx::test_q35_manage_user_no_new_detail_entry
  - [X] src/test/AnvilManagePages.test.jsx::test_manage_user_reset_and_delete_keep_user_scope
- Assertion scope: 用户容器卡片不出现容器删除按钮或「详情」新增按钮，不调用容器删除 API；页面不保留旧 `ContainerDetailModal`/`openContainerDetail`/`detailModalVisible` 契约；「删除用户」只调用 `deleteUser`，不调用 `deleteContainer`，不复用容器删除资格。缺口 locator 真实点击用户「删除」并确认，断言只发出用户删除请求，容器仍在。
- Coverage note: 卡片无容器删除/详情入口与旧弹窗清理已确证；「删除用户只删用户」的请求级断言由本 locator 覆盖，checkbox 已核实为 `[X]`。

#### Scenario: 解冻失败恢复

- Test/check:
  - [X] src/test/ManageUserEligibility.test.jsx::test_q35_manage_user_unpause_failure_recovery
- Assertion scope: 解冻失败/拒绝/超时后清除该容器 pending、操作 loading 与消息 loading，`showErrorModal` 入参保留后端 `message.message === 'unpause failed'`（参数级断言），显示具体错误并重读权威状态；不提示「已解冻」、不写入猜测的 `paused`/`online`，卡片回到「磁盘已冻结」且按钮恢复，随后列表请求再次发生。
- Coverage note: 错误参数、pending/loading 清除、按钮恢复与重读均已由 `test_q35_manage_user_unpause_failure_recovery` 的真实页面断言覆盖；不把「显示错误」写成未断言的泛化结论。

### Requirement: ManageUser 容器行只走专用详情路由并删除不可达弹窗

#### Scenario: 点击容器行进入专用详情页

- Test/check:
  - [X] src/test/ManageUserDetailLink.test.jsx::test_q35_manage_user_container_row_navigates_detail
  - [X] src/test/AnvilManagePages.test.jsx::test_manage_user_container_title_does_not_select_user_row
- Assertion scope: 点击容器标题后路由路径匹配 `/index/containers/12`（既有用例的详情页为 `<div data-testid>` 桩，不是真实详情页落点），用户行不被选中，旧详情弹窗不渲染；标题按钮阻止行选择冒泡。缺口 locator 增加选中行探针，断言点击前后当前选中用户不变。
- Coverage note: 现有用例只证明路由路径匹配（页面为桩）与旧弹窗不渲染；「用户行不会被选中」的选中状态断言由本 locator 覆盖，checkbox 已核实为 `[X]`。不把桩页面称为真实专用详情页。

#### Scenario: 源码不再包含旧详情弹窗链

- Test/check:
  - [X] src/test/ManageUserDetailLink.test.jsx::test_q36_manage_user_no_dead_detail_modal
  - [X] src/test/ManageUserEligibility.test.jsx::test_q35_manage_user_no_delete_or_modal_contract
- Assertion scope: `ManageUser.jsx` 源码不再匹配 `ContainerDetailModal`、`openContainerDetail`、`detailModalVisible`、`setDetailModalVisible`；真实页面不出现「容器详细信息」弹窗。
- Coverage note: 该 Scenario 的 THEN 就是静态符号清理，源码检查是直接检查；不把该检查用于其它行为场景。

#### Scenario: 不新增用户管理页详情入口

- Test/check:
  - [X] src/test/ManageUserDetailLink.test.jsx::test_q35_manage_user_no_new_detail_entry
- Assertion scope: 用户容器卡片只有现有容器标题按钮，没有新增「详情」按钮或弹窗入口；容器行操作区不含新增详情入口。
- Coverage note: 真实 DOM 断言已确证；不新增入口是负向断言，不另造源码正则。

## frontend--page-manage-user-in-table

### Requirement: ManageUserInTable 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] src/test/ManageUserInTable.test.jsx::只消费父级 longTerm：方向 true/false 与原因/loading 均来自父级
  - [X] src/test/ManageUserInTable.test.jsx::test_q60_edit_action_does_not_select_row
  - [X] src/test/AnvilManagePages.test.jsx::test_manage_user_in_table_mobile_expands_real_cards
- Assertion scope: 组件无独立路由，通过 props 接收 `dataSource`、展开键、选中键、容器映射与回调；真实渲染时用户行主键来自 props，不自行读取认证/API，也不生成用户或容器身份。缺口 locator 在 `window.matchMedia('(max-width: 768px)')` 为 true 时渲染真实 `ManageUserInTable`/`TableComponent`，断言移动端卡片、用户字段、展开容器内容与行操作均来自传入 props，不使用 mock 表格或源码字符串。
- Coverage note: 既有测试在桌面/默认 `matchMedia` 下真实渲染组件；移动端真实 `TableComponent` 分支由本 locator 覆盖，checkbox 已核实为 `[X]`。

### Requirement: ManageUserInTable 主流程

#### Scenario: 展开一名用户

- Test/check:
  - [X] src/test/ManageUserEligibility.test.jsx::test_q59_parent_controls_second_page_with_page_size_four
  - [X] src/test/ManageUserInTable.test.jsx::test_q60_edit_action_does_not_select_row
- Assertion scope: 点击「编辑用户」只调用父级 `toggleExpand('7')`，不改变选中行；父页 `ManageUser` 展开后按 `user_id=7` 请求子容器并渲染父组件提供的容器映射/分页，组件不自行生成用户或容器身份。
- Coverage note: 子组件断言展开回调，父页真实集成断言请求与渲染；移动端展开由装配场景的 mobile locator 覆盖。

### Requirement: ManageUserInTable 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] npm run build
- Assertion scope: `npm run build` 退出码 0，完成构建并产生 `dist` 产物。该 check 只证明构建可完成与产物存在；`ManageUserInTable` 作为 `ManageUser` 页面 chunk 组成部分、共同布局/`ModelViewer` 分包与 Rollup 警告清单不是该命令的自动断言，属实现上下文与验收观测，不作为本 check 的通过条件。
- Coverage note: 该 check 只对构建命令与产物负责；`React.lazy`/`manualChunks`/three 分包与具体警告清单不是该命令的自动断言，属实现上下文与验收观测；不新增源码字符串机械测试。

### Requirement: ManageUserInTable 长期列只消费父级共享结果

#### Scenario: 父级结果优先

- Test/check:
  - [X] src/test/ManageUserInTable.test.jsx::只消费父级 longTerm：方向 true/false 与原因/loading 均来自父级
  - [X] src/test/ManageUserInTable.test.jsx::父级未知/非法方向时禁用并显示父级原因，不退回旧字段自算
  - [X] src/test/AnvilManagePages.test.jsx::test_manage_user_in_table_paused_long_term_renders_parent_disabled
- Assertion scope: 长期列只读取行上的 `longTerm`：父级 `checked=true/direction=disable` 时勾选且可操作；父级 `checked=false/direction=enable/enabled=false/reason=long_term_limit_reached` 时未勾选、禁用并显示父级原因；父级 `stateKnown=false` 时即使行上 `is_long_term=true`、`long_term_container_can_enable=true`、`long_term_container_remaining=9` 也按未知禁用，不回退旧配额字段。缺口 locator 在真实 `ManageUserInTable`/`TableComponent` 中传入父级 `checked:true,disabled:true,reason:'container_paused'` 与 `is_long_term:true` 的行，断言长期勾选 checked、disabled、title「容器已冻结」，不调用 helper 或自行重算。
- Coverage note: 父级结果优先与旧字段冲突已由两个用例覆盖；`paused` 已长期行的表内 DOM 门禁由本 locator 覆盖，checkbox 已核实为 `[X]`。组件不自行读取配额/磁盘/freeze_state 重算，in-table 只消费父级结果。

#### Scenario: 资格未知或方向拒绝

- Test/check:
  - [X] src/test/ManageUserInTable.test.jsx::父级未知/非法方向时禁用并显示父级原因，不退回旧字段自算
  - [X] src/test/ManageUserInTable.test.jsx::只消费父级 longTerm：方向 true/false 与原因/loading 均来自父级
- Assertion scope: 父级 `stateKnown=false/direction=null` 时长期勾选未选中、禁用并显示「长期标记未知，无法切换长期状态」；父级方向为 enable 但 `enabled=false/reason=long_term_limit_reached` 时禁用并显示「绑定用户已达到长期容器上限」；不自行拼 fallback 文案。
- Coverage note: 未知与方向拒绝均来自父级 reason；组件不读旧字段。

#### Scenario: 长期标记缺失或非法

- Test/check:
  - [X] src/test/ManageUserInTable.test.jsx::父级未提供 longTerm 时不渲染长期控件，也不回退旧字段
  - [X] src/test/ManageUserInTable.test.jsx::父级未知/非法方向时禁用并显示父级原因，不退回旧字段自算
- Assertion scope: 父级完全不提供 `longTerm` 时不渲染长期控件，也不回退行上的 `is_long_term`/`long_term_container_can_enable`；父级提供未知结果（非 boolean/未知方向）时按未知禁用并显示父级原因，不默认按启用方向解析、不把非法值当 false 放行。
- Coverage note: 「完全不提供结果」比「未知禁用」更保守，属于额外防御边界；规格要求的「未知禁用」由父级 `stateKnown=false` 用例覆盖。

#### Scenario: 保存中与失败回滚

- Test/check:
  - [X] src/test/ManageUserInTable.test.jsx::保存中显示 loading 并禁用；父级回滚 checked 后不保留未确认目标
- Assertion scope: 父级 `loading=true` 时勾选框禁用并显示「保存中」，不能重复操作；父级随后回滚为 `checked=false/direction=enable/reason=disk_usage_over_limit` 时，勾选回到未选中、禁用并显示磁盘原因，不提示成功、不保留未确认目标。
- Coverage note: 保存中与权威回滚均由父级 props 驱动，组件不维护独立乐观值。

#### Scenario: 无容器命令入口

- Test/check:
  - [X] src/test/ManageUserInTable.test.jsx::没有容器删除/启停/解冻入口，用户删除回调仍独立
  - [X] src/test/ManageUserEligibility.test.jsx::test_manage_user_remove_association_failure_keeps_error_reason
- Assertion scope: 展开的用户容器区不出现「删除容器」「启动」「停止」「解冻」按钮；用户「删除」按钮仍存在且只调用用户删除回调；解除关联仍走独立既有回调，本 change 不新增容器命令入口。
- Coverage note: 真实展开 DOM 已断言；解除关联入口/请求由父页用例真实点击「解除」并断言 `removeCollaborator` 失败参数，用户删除与容器删除的回调边界由本用例和用户页删除场景共同覆盖。

### Requirement: ManageUserInTable 用户表行操作不得改变选中行

#### Scenario: 点击编辑用户不改变选中行

- Test/check:
  - [X] src/test/ManageUserInTable.test.jsx::test_q60_edit_action_does_not_select_row
- Assertion scope: 点击「编辑用户」只调用 `toggleExpand('7')` 一次，`setSelectedRowKey` 不被调用；当前选中行保持原用户，操作只针对被点击用户。
- Coverage note: `stopPropagation` 的行为结果已确证；不依赖源码符号。

#### Scenario: 删除、重置密码与权限组同样不冒泡

- Test/check:
  - [X] src/test/ManageUserInTable.test.jsx::test_q60_other_actions_do_not_bubble
- Assertion scope: 分别点击「删除」「重置密码」「权限组」，各自只触发对应回调一次，`setSelectedRowKey` 不被调用、`toggleExpand` 不被额外触发；当前选中行不变。
- Coverage note: 三个操作均真实点击；容器子行动作语义未改变。

### Requirement: 子容器分页按服务端 total 且父页保持 pageSize=4

#### Scenario: 六个子容器第二页可达第 5/6 个

- Test/check:
  - [X] src/test/ManageUserInTable.test.jsx::test_q59_six_containers_second_page_reachable
  - [X] src/test/ManageUserEligibility.test.jsx::test_q59_parent_controls_second_page_with_page_size_four
- Assertion scope: 首次请求保留父页 `page_size=4`，返回前 4 条；点击子表第 2 页时调用 `fetchContainersForUser('7', 1)`，父页以 `page_number=1`、`page_size=4` 请求第二页，显示第 5/6 条，分页总数 6；不一次性拉取全部子容器。
- Coverage note: 子组件分页回调与父页真实 API/页码/页大小均已断言。

#### Scenario: 服务端 total 不超过 4 不显示分页

- Test/check:
  - [X] src/test/ManageUserInTable.test.jsx::test_q59_total_at_most_four_no_pagination
- Assertion scope: 服务端 total 为 4（`total_number=4`、`total_page=1`）时子表不渲染分页入口，也不额外请求第二页；只有 total>4 才出现分页。
- Coverage note: 真实展开 DOM 与请求次数均已断言。
