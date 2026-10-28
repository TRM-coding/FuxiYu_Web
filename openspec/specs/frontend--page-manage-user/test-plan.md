# frontend--page-manage-user Test Plan

Spec: [spec.md](spec.md)

## Current Mapping

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
