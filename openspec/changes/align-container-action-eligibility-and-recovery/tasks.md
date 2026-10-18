# Tasks

## 1. 共享纯函数策略

- [ ] 1.1 扩展 `src/utils/containerActions.js`，导出 `CONTAINER_ACTION_KEYS`、`normalizeContainerActionContext`、`resolveContainerActions` 与原因文案 helper，覆盖七个动作；输入输出按 design 契约，模块保持无 IO/副作用/隐式 `Date.now()`。验证：纯函数单测覆盖七个 key、`disabled === !enabled`、未知 key 忽略、无网络/存储访问。
- [ ] 1.2 在共享层归一化权限/角色/只读：`container:operation`、`container:manage`、`bypass_auth_entity`、`bypass_resource` 的关系与 Ctrl 一致；缺失/undefined/未知角色 fail closed；`containerRole` 只认 ROOT/ADMIN/COLLABORATOR；`readOnly` 必须原生 boolean，true 或缺失/非法时禁用全部七个写动作。验证：单测覆盖 ROOT、ADMIN、COLLABORATOR、空角色、空数组、`container:manage` 资源通配、`bypass_auth_entity` 非资源通配及 `readOnly` 的 true/false/缺失/"false"/0。
- [ ] 1.3 实现删除、启停、解冻状态矩阵：删除允许 online/offline/paused/failed，拒绝 building/creating/starting/stopping/restarting/host_offline/host_maintenance/status_unknown 和本地 pausing/unpausing/空状态；start 仅 offline；stop/restart 仅 online；unpause 仅 paused 且具备 `container:manage`。验证：参数化单测明确 failed 可删、paused 可删、starting 不可删、host/unknown 不可删，保持 failed restart 的前端保守行为。
- [ ] 1.4 实现长期既有字段逻辑：严格 `is_long_term` 选向；启用读 `long_term_container_can_enable` 与 `isDiskOverLimit`（`disk_usage_percent` 或 `disk_usage.usage_percent`），缺字段不额外禁用；取消在实际状态 `paused` 时禁用并给 `container_paused`，online/offline 即使 `freeze_state` 行仍在也允许；`is_long_term` 非法只禁用两个长期动作，不影响删除/启停/解冻。验证：单测覆盖 true/false/缺失/字符串/null、配额 false、磁盘 100%、用量缺失、冻结行残留、paused 取消与 online 取消。
- [ ] 1.5 实现统一 reason、loading、pending 优先级：上下文/只读 → 权限/角色 → 长期方向有效性 → loading → pending → 状态门 → 既有配额/磁盘/冻结原因；`readOnly` 与权限原因优先于 loading；`pausing/unpausing` 返回 pending；不加资格未知对象。验证：单测逐层短路，断言 loading 已授权时 reason 为 null、权限失效时 loading 不覆盖、pending 不被当终态。
- [ ] 1.6 收敛/移除旧规则：`getContainerActionState` 如保留必须薄委托同一状态表，`getRoleActionSet` 不再参与资格；删除各页对旧配额/磁盘长期门、`canSetLongTerm` 决策和重复角色表的直接使用。验证：源码检索不存在第二套长期决策；旧单测更新为共享契约断言。

## 2. Home

- [ ] 2.1 Home 卡片的 start/stop/restart、解冻、长期改用共享结果渲染 `disabled/reason/loading`，删除弹窗使用同一 `actions.delete`；移除 `isDiskOverLimit`/旧配额对长期按钮的第二套门。验证：组件测试覆盖 online/offline/failed/过渡、配额 false、磁盘 100%、冻结行残留，断言与 resolver 结果一致。
- [ ] 2.2 Home 解冻只按 `container:manage` 与 `paused` 显示/启用，受理文案为“解冻指令已发送”；失败/超时清除 transition、loading、message loading 并重读权威快照，不在 catch 写 `paused`/`online`。验证：组件测试覆盖受理后 online、失败、超时、后续启动验证 failed，断言无“已解冻”。
- [ ] 2.3 Home 删除按共享 delete 结果：ADMIN/ROOT 可见可删，COLLABORATOR 不显示可执行删除；failed 可删，过渡/主机/未知不可删；`delete.visible=false` 不推导解除关联授权。验证：组件测试覆盖角色差异、failed 删除、403/409/超时不提前移除行，以及 leave 独立流程断言。

## 3. ManageMachine 与弹窗

- [ ] 3.1 ManageMachine 卡片的 start/stop/restart、解冻、长期改用共享结果；`ContainerDetailModal` 不再传 `forceSystemAdmin=true` 伪造删除，改传真实 `containerRole`/权限；人员管理能力另用显式 `canManagePeople`，不与删除/解冻/长期复用。验证：组件测试覆盖 ROOT/ADMIN/COLLABORATOR、failed 可删、starting 不可删、人员管理入口仍可用且不放开删除。
- [ ] 3.2 ManageMachine 删除/长期/解冻失败后清除 loading/pending、重读机器容器列表，不提前更新计数或移除行；长期成功后才更新行，解冻失败后按钮可恢复。验证：组件测试断言失败后无残留 loading/pending、无“已解冻”，删除/长期失败保留原行并可重试。

## 4. ManageUser 与表格

- [ ] 4.1 ManageUser 卡片的 start/stop/restart、unpause、长期改用共享结果；unpause 只需 `container:manage`，start/stop/restart 按权限矩阵；不新增容器删除入口；长期只用既有配额/磁盘/状态字段。验证：组件测试覆盖四种角色/权限上下文、只读缺失/非法、online/offline/paused/failed、过渡态、配额 false、磁盘 100%、冻结行残留。
- [ ] 4.2 ManageUser 解冻失败清理该容器的 transition、操作 loading、消息 loading，重读权威快照；不 catch 后 patch paused；后续真实 online 清 pending，启动验证 failed 保持 failed。验证：组件测试断言失败后按钮恢复、无残留 unpausing、错误可见且无“已解冻”。
- [ ] 4.3 ManageUserInTable 长期列只消费父组件传入的 `longTerm`/共享结果，不读取 `long_term_container_remaining`、`long_term_container_can_enable`、磁盘百分比或 `freeze_state` 自行重算；严格 `is_long_term` 方向，缺失/非法按未知禁用；保存中 loading、失败回滚到父级权威值；无删除/启停/解冻入口。验证：表格组件测试覆盖方向 true/false/非法、资格未知、旧字段冲突、保存中、409/失败回滚与无删除按钮。

## 5. ContainerDetailPage 与 ContainerDetailModal

- [ ] 5.1 ContainerDetailPage 删除改用共享 delete：移除 `['building','creating']` 硬编码；ADMIN/ROOT 可删，COLLABORATOR 不显示可执行删除；failed 可删，过渡/主机/未知不可删；失败/409/超时展示原因并重读，不提前导航成功。验证：详情页测试覆盖完整删除状态矩阵、角色差异、failed 删除、403/409/超时。
- [ ] 5.2 ContainerDetailPage 的 start/stop/restart/unpause 使用共享结果；解冻仍只在 `container:manage` 下渲染，失败/超时清 loading/pending 并重读，真实 online/failed 按权威展示。验证：详情页测试覆盖按钮状态、受理/失败/超时、启动验证 failed 不被受理提示覆盖。
- [ ] 5.3 ContainerDetailPage 长期勾选只用既有字段：严格 `is_long_term` 选向，缺失/非法只禁用长期并显示未知原因；配额 false/磁盘 100% 禁用启用；paused 禁用取消；online/offline 且冻结行残留允许取消；提交中不伪造 checked，409/超时重读。验证：详情页测试覆盖两个方向、非法布尔、配额/磁盘/冻结残留、409/超时。
- [ ] 5.4 ContainerDetailModal 不提供长期控件；删除/解冻使用父页面传入的 action 结果，不用 `isRoot`/`forceSystemAdmin`/状态字符串另造判据；解除关联不由 `delete.visible` 推导。验证：弹窗测试覆盖 ROOT/ADMIN/COLLABORATOR、failed 删除、过渡禁用、只读模式、无长期控件与 leave 独立流程。

## 6. 跨页与集成验证

- [ ] 6.1 建立同容器跨页面矩阵：同一 `container/effective_status/权限上下文` 下 Home、ManageMachine、ManageUser、ManageUserInTable、ContainerDetailPage 得到相同 action 结论；不同上下文（ROOT/ADMIN/COLLABORATOR、`container:manage` 操作员、undefined 权限、readOnly true/缺失/非法、`is_long_term` 缺失/非法）得到明确差异而非页面漂移。验证：共享 resolver 参数化测试 + 各页组件断言，逐项记录上下文。
- [ ] 6.2 建立长期与失败专项矩阵：配额 false 不能启用；磁盘 100% 不能启用；paused 不能取消；online/offline 且冻结行残留可取消；is_long_term 非法只禁用长期；409/超时/重读失败不伪造成功或终态；解冻失败清 pending/loading；`ready_identity`/Node 动作字段不被 Web 用于推断成功、失败或删除资格。验证：纯函数 + 五个页面测试覆盖。
- [ ] 6.3 实现提交前重解析：所有写动作在真正调用 API 前重解析；有 confirm 的在用户点击确认时，长期勾选等直接提交的在 API 前，用最新容器状态、权限/角色、长期字段与 pending 重新调用 `resolveContainerActions`；禁用/隐藏或 readOnly/上下文非法则不调用 API，并更新原因/关闭确认框。验证：五个页面组件测试分别覆盖“打开/初次选择时可用、提交前状态/权限/长期字段/pending 变化”，断言 API 未被调用且原因已更新。
- [ ] 6.4 源码审查确认只有一套规则：页面不再直接使用 `canSetLongTerm`、旧配额/磁盘长期门、`getRoleActionSet` 或各页硬编码删除状态；`resolveContainerActions` 是唯一动作资格入口；`ContainerDetailModal` 未被新增长期开关；共享七动作无 leave，无 `delete.visible` 推导 leave；readOnly 覆盖长期/unpause。验证：定向 grep + review，逐文件记录。
- [ ] 6.5 运行定向测试与全量 `npm test`，再运行 `npm run build`；保存输出，失败项逐条定位，不以 lint 债务或环境 warning 代替业务验证。验证：测试与构建通过，既有基线无回归。
- [ ] 6.6 运行 `openspec validate align-container-action-eligibility-and-recovery --strict`、`openspec status --change ...`，确认 artifact 完整；再运行 `git diff --check`，检查变更内链接与字段清单。验证：strict 无 ERROR/非环境 warning；无新增资格对象/API/响应字段。
- [ ] 6.7 最终 diff 的业务代码仅限本变更列出的 Web 容器动作文件与测试；不含 Ctrl/Node 实现、正式 specs/archive、报告、commit/push 或 skills。验证：`git status`/`git diff --check` 与影响清单逐项核对，确认 Q67/Q70 未被顺手修改。

## Workflow follow-up

- 本提案当前未实施：tasks 保持未勾选。
- 实现完成并通过评审后，逐项勾选 tasks、保存测试/构建/评审证据，并按仓库流程归档；归档时把 delta 合并到五个既有页面主规格。
- 归档前再次核对 Ctrl 长期静态守卫与既有字段实际状态；不把删除守卫或长期资格误报为已经修复。
