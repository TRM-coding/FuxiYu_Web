# Proposal

## Why

同一容器的动作展示仍分散在各页：删除按钮在 ContainerDetailPage 硬编码为仅 `building`/`creating` 禁用，在 ContainerDetailModal/Home/ManageMachine 又分别按 ROOT 或 `forceSystemAdmin` 推导；长期勾选继续混用旧配额、磁盘百分比和本地状态；start/stop/restart/unpause 也由各页各写一套状态判断。结果是同一容器在不同视图、不同角色下结论不一致，且前端显示的可用性可能与 Ctrl 的真实守卫相反。

Q21 / V14.4 的删除动作门本轮已按源码核对：Ctrl `services/container_tasks.py` 的 `remove_container` 确实先调用 `_ensure_container_action(container, "remove")`，其 `services/container_module/operation_guard.py` 拒绝 `building/creating/starting/stopping/restarting` 与 `host_offline/host_maintenance/status_unknown`，允许 `online/offline/paused/failed`；删除 API 另要求 `container:operation` 方法权限、`container:admin` 资源角色和机器访问权。前端并未按这套真实集合统一，V14.4 的“后端是否拒绝未验证”至此已有答案。长期部分仍以 Ctrl `guard-long-term-container-transitions` 的固定 DTO 为准，但 Web 需要与删除共用同一展示策略，而不是再建一套竞争规则。

## What Changes

- 扩展现有 `src/utils/containerActions.js` 为单一纯函数动作策略层（允许薄 adapter/helper，禁止第二套覆盖规则）。该层 MUST 明确导出输入/输出契约，负责 `start`、`stop`、`restart`、`unpause`、`delete`、`long_term_enable`、`long_term_disable` 的 `visible`、`enabled`/`disabled`、`reason`、`loading`、`pending` 展示语义；页面只保留布局、确认弹窗和 API 回调，不把业务流程搬进 util，也不新增万能 JS 类。
- 权限与角色由调用方提供真实上下文，并在共享层归一化：方法权限（含同域 manage/实体通配的实际等价来源）、容器角色和资源通配；`undefined`、缺字段、非法角色一律 fail closed，MUST NOT 默认放行。机器访问权仍由 Ctrl 最终校验，前端不伪造。
- `is_long_term` MUST 严格区分原生 `true`/`false`：缺失或非法只让长期方向未知并禁用长期动作，不得默认为 enable，也不得连带禁用删除/启停/重启/解冻。`readOnly` MUST 为原生 boolean；`true` 或缺失/非法时所有写动作（含 long-term 与 unpause）保守禁用，不能把非 `true` 当 `false` 放行。
- 删除按已核对的后端删除集合判断：`online/offline/paused/failed` 可删，`building/creating/starting/stopping/restarting` 及宿主/采集未知状态不可删；`failed` 仍可删。未知空状态和本地的 `pausing/unpausing` 按保守态禁用并给出原因；删除不得复用长期资格守卫，也不得把所有过渡态或所有非 online 状态一律禁止。解除关联不在共享策略的 7 个动作内，沿用既有独立流程与 `remove_collaborator` 的后端 ROOT 前置，不能由删除不可见推导授权。
- 长期动作 MUST 读取服务端权威固定 8 字段 DTO `long_term_eligibility = {can_enable, can_disable, enable_reason, disable_reason, evaluated_at, disk_total_bytes, disk_limit_bytes, disk_measured_at}`：严格校验类型、UTC 时间与 reason 方向，按当前 `is_long_term` 只消费目标方向；不得用磁盘百分比、旧 `long_term_container_can_enable` 或 `freeze_state` 自行重算完整资格。缺 DTO、字符串真假值、半对象或坏时间按资格未知禁用真实切换。
- 普通按钮使用已核对的明确后端状态表或既有本地保守态，后端仍是最终裁决。start 仅在 offline 可用，stop/restart 仅在 online 可用（不因后端允许 failed restart 而扩大现有 UI 行为），unpause 仅在 paused 且具备 `container:manage` 方法权限时可用，后端仍校验机器访问；各页 MUST 消费同一策略结果，不再硬编码状态。reason 优先级 MUST 按上下文有效性/只读 → 展示权限 → 长期方向有效性 → 动作 loading → pending → DTO/状态/服务端原因短路；loading 不得覆盖授权。
- 所有写动作 MUST 在真正提交 API 前（有确认框则在最终确认时）用最新的容器、权限/角色、DTO 与 pending 重新解析；若结果禁用/隐藏则不发请求并更新原因，不得复用打开弹窗或首次选择时的快照。util 保持无 IO，页面负责取最新值，后端最终裁决。
- 保留前轮长期/解冻规则：解冻受理只说“指令已发送”，失败/超时清除本地 pending 与 loading、显示具体错误并重读权威快照，不伪造 `paused`/`online`；权威 `online` 结束 pending，真实 `failed` 保持 `failed`。Node `ready_identity` 与 Ctrl 可选 `action_ref`/`last_action` 只作为服务端事实边界，Web 不以它们推断成功或自造终态，也不把 action_ref 当删除身份。
- 恢复政策不变：实际恢复长期快照仍自动静默授予一次既有 `container.disk_freeze_grace_days` 宽限，不加超限确认弹窗、确认 token 或新恢复状态机；image 差异选择照旧。UI 展示策略不得反向改写恢复、冻结或长期政策。
- 本变更完整承接 Q21 的删除与长期动作统一问题，但仍是提案：不实施 Ctrl/Node/Web 代码，不声称 Q21、Q58、Q67、Q69、Q70 或任何线上状态已修复。

## Capabilities

### New Capabilities

无。继续复用既有页面能力，不新增重复 capability。

### Modified Capabilities

- `frontend--page-home`: 卡片与详情弹窗统一消费动作策略，覆盖删除、长期、启停重启、解冻和失败恢复。
- `frontend--page-manage-machine`: 机器容器卡片与详情弹窗统一消费动作策略，删除不再靠 `forceSystemAdmin` 绕过角色。
- `frontend--page-manage-user`: 用户容器卡片统一消费动作策略；长期与解冻按同一展示语义，只读弹窗不新增长期入口。
- `frontend--page-manage-user-in-table`: 长期列消费父组件共享策略结果，不自行拼条件；不新增删除入口。
- `frontend--page-container-detail-page`: 详情页删除、长期、启停重启、解冻及弹窗边界统一到同一策略。

## Impact

- Web：`src/utils/containerActions.js`、`src/utils/listRefresh.js`、`src/pages/Home.jsx`、`ManageMachine.jsx`、`ManageUser.jsx`、`ManageUserInTable.jsx`、`ContainerDetailPage.jsx`、`src/components/ContainerDetailModal.jsx`、相关错误/展示工具与测试。
- Ctrl：只读依赖既有 `operation_guard.py`、删除 API 权限和 `guard-long-term-container-transitions` 的固定 DTO/409 契约；本变更不修改 Ctrl。
- Node：只读依赖 `guard-runtime-state-reconciliation` 的 `ready_identity`、运行态恢复与可选 action_ref 边界；本变更不修改 Node。
- 兼容性：旧响应缺 DTO 时长期动作安全降级为未知禁用；删除/启停等旧操作不因 DTO 缺失被错误放开或阻断。旧字段保留展示，但不得覆盖共享策略。
- 边界：Q67 的长期数量并发、Q69 的分页保持、Q70 的跨进程删除代际不在本变更；Q71 的 dev/inode 仅由 Node 内部校正 `mount_path`、业务只用路径的边界不变；不新增正式 specs/archive 或业务代码改动。
