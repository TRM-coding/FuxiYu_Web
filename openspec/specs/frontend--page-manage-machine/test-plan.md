# frontend--page-manage-machine Test Plan

Spec: [spec.md](spec.md)

## Current Mapping

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
