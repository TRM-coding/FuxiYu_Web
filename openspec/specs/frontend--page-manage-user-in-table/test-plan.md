# frontend--page-manage-user-in-table Test Plan

Spec: [spec.md](spec.md)

## Current Mapping

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
