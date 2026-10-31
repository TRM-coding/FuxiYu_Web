# frontend--page-home Test Plan

Spec: [spec.md](spec.md)

## Current Mapping

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
- Assertion scope: online 场景核对首页共享动作与弹窗；冻结场景核对首页卡片及弹窗均无解冻入口。详情页解冻权限由其独立测试覆盖。
- Coverage note: 首页移除解冻入口的规格调整见 `remove-home-unpause`；独立详情页解冻权限不在此首页测试范围内。

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
  - [ ] 首页解冻失败测试已移除，等待 `remove-home-unpause` 同步主规格。
- Assertion scope: 首页已移除解冻入口；原首页解冻请求失败场景的规格调整见 `remove-home-unpause`。
- Coverage note: 独立详情页解冻失败由 `ContainerDetailEligibility.test.jsx` 覆盖。
