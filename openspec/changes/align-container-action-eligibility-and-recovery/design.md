# Design

## Context

Web 目前存在多套并行判据：`src/utils/containerActions.js` 的 `getContainerActionState` 只覆盖启停与旧的 `canSetLongTerm`；`getRoleActionSet` 仅被测试和一个未使用的 import 引用，且把删除只给 ADMIN、长期只给 ROOT，与实际后端角色层级不一致；Home、ManageMachine、ManageUser、ManageUserInTable、ContainerDetailPage 又各自拼 `isDiskOverLimit`、`long_term_container_can_enable`、`long_term_container_remaining`、`forceSystemAdmin` 和状态硬编码。`src/components/ContainerDetailModal.jsx` 仍用 `isRoot` 决定删除、用 `effective_status === 'paused'` 决定解冻，没有任何删除状态门。

Q21 / V14.4 的删除动作门已在源码中核验：`services/container_tasks.py:206-218` 的 `remove_container` 在请求 Node 前调用 `_ensure_container_action(container, "remove")`；`services/container_module/lifecycle.py:40-46` 用它派生 effective status 并调用 `services/container_module/operation_guard.py:26-39` 的拒绝矩阵。删除 API 位于 `api/container_api.py:321-342`，要求 `container:operation` 方法权限、`container:admin` 资源角色和 `container` 所在机器的访问权；长期设置（`:428-434`）要求 `container:operation` + `container:root` + 机器访问；解冻（`:788-794`）要求 `container:manage` + 机器访问，但没有容器资源角色检查。此外 `test/container/test_container_operation_guard.py:38-48` 还明确验证 failed 容器允许 `restart` 与 `remove`，与长期资格拒绝 failed 是两套语义。以上是源码与既有守卫测试层面的核验，本轮未运行真实删除或浏览器端到端；不据此声称实现已修复。这是必须保留的入口差异，不能用一个统一角色表抹平。

服务端长期资格由 Ctrl `guard-long-term-container-transitions` 提供固定 8 字段 DTO，并保留既有原因集合；运行态恢复与 `ready_identity`、可选 `action_ref`/`last_action` 由 Node `guard-runtime-state-reconciliation` 定义。本设计只决定 Web 如何消费这些事实。参见 `proposal.md`。

## Goals / Non-Goals

**Goals:**

- 用一个纯函数策略层统一所有现有容器动作的展示与可操作性，并让页面不再保留第二套条件。
- 删除严格对齐已核验的 Ctrl 删除状态集合与角色/方法差异；长期严格消费固定 DTO。
- 对未知状态、非法权限、坏 DTO、缺上下文 fail closed，不把 truthy 当授权。
- 保留既有 pending transition、失败清 pending、权威重读和 Node/Ctrl 动作事实边界。

**Non-Goals:**

- 不实现 Ctrl 状态守卫、资格评估、Node 运行态恢复或任何后端策略。
- 不改变恢复政策：实际恢复长期快照仍自动静默授予一次既有宽限，不加超限确认弹窗、确认 token 或新状态机；image 差异选择照旧，长期控件也不因此新增确认步骤。
- 不把 confirm、toast、API 调用、轮询或业务流程搬进 util；不建万能动作类。
- 不新增 ContainerDetailModal 的长期开关，不将 `freeze_state` 作为长期资格来源。
- 不新增或重构解除关联（leave）资格；共享 7 个动作不含 leave，沿用既有 `remove_collaborator` 独立流程与后端 ROOT 前置。
- 不修复 Q58、Q67、Q69、Q70，不改分页、长期数量并发或跨进程删除代际；不把 action_ref 当删除身份。
- 不改 Q71 路径/对象身份边界：dev/inode 只由 Node 内部校正 `mount_path`，业务动作只用路径，不把对象身份、`mount_path_status` 或 proc 可读性作为 UI 资格。
- 不统一 Q38 的三份状态/磁盘文案；`statusDisplay.js` 与页面状态标签只做展示，不参与动作资格。
- 不扩大现有 start/stop/restart/unpause UI 行为：后端允许 failed 容器 restart，但本变更保留前端保守的 online-only restart；这不改变后端授权。

## Decisions

### 1. 一个纯函数策略入口，显式输入输出，页面只做适配

扩展 `src/utils/containerActions.js`（允许拆出同目录薄 helper，但不得出现第二套判据），拟定导出：

```js
export const CONTAINER_ACTION_KEYS = [
  'start', 'stop', 'restart', 'unpause',
  'delete', 'long_term_enable', 'long_term_disable',
];

export function normalizeLongTermEligibility(raw) {}
export function normalizeContainerActionContext(raw) {}
export function resolveContainerActions(input) {}
export function getContainerActionReasonText(reason) {}
```

`resolveContainerActions(input)` 的输入契约：

```js
{
  container: {
    is_long_term: boolean,        // 必须 true/false；缺失/非法只让长期动作未知禁用
    effective_status: string,     // 服务端/已派生的当前展示状态
  },
  eligibility: object | undefined, // 原始固定 8 字段 DTO
  context: {
    permissions: string[],        // PermissionContext.entities 原样传入
    containerRole: 'ROOT' | 'ADMIN' | 'COLLABORATOR' | null,
    readOnly: boolean,            // 必须原生 boolean；缺失/非法禁用所有写动作
  },
  pendingTransition: object | null, // createContainerStatusTransition 的结果
  loading: { [actionKey]: boolean },
}
```

输出契约：

```js
{
  status: string,
  statusKnown: boolean,
  pending: boolean,
  actions: {
    start:               { visible, enabled, disabled, reason, loading, pending },
    stop:                { ... },
    restart:             { ... },
    unpause:             { ... },
    delete:              { ... },
    long_term_enable:    { ... },
    long_term_disable:   { ... },
  },
  longTerm: {
    stateKnown: boolean,
    direction: 'enable' | 'disable' | null,
    actionKey: 'long_term_enable' | 'long_term_disable' | null,
    checked: boolean | null,      // 未知时为 null，不默认 false/true
    visible, enabled, disabled, reason, loading, pending,
  },
}
```

`disabled` 恒等于 `!enabled`；每个 action 都同时给出 `visible` 与 `reason`，页面不自行补条件。`visible` 表示动作是否应出现在当前视图：启停/删除在缺少方法权限、ADMIN 级资源角色或只读视图时为 false；解冻在缺少 `container:manage` 时为 false；长期按当前方向只显示一个入口，即使缺少 ROOT 级资源角色也可见但 disabled，以便同时展示状态和原因。`reason` 是稳定代码或服务端原始 reason，不把 `undefined` 当可操作。

`is_long_term` 的契约严格区分 `true` 与 `false`：`true` 只启用 `long_term_disable`，`false` 只启用 `long_term_enable`；缺失、`null`、字符串或其他非法值使 `longTerm.stateKnown=false`、方向/checked 为 null，两个长期动作都以 `long_term_state_unknown` 禁用。该非法值 MUST NOT 默认为 enable，也 MUST NOT 连带禁用 delete/start/stop/restart/unpause，这些动作只读取各自的权限与状态。

`readOnly` 必须为原生 boolean。`true` 时所有写动作（含 long-term 与 unpause）不可见/不可执行，原因 `read_only`；`false` 时正常计算；缺失或非法时 `readOnlyKnown=false`，所有写动作保守禁用并给出 `read_only_unknown`，不得把非 `true` 值当作 `false` 放行。共享策略的 7 个 action 中不包含 leave/解除关联；解除关联沿用独立既有流程，不能由 `delete.visible`/`enabled` 推导授权。

`src/utils/statusDisplay.js` 等既有状态展示 helper 继续只提供标签/颜色；策略层使用归一化状态代码，不解析中文文案，也不让展示 helper 参与 eligibility。策略层 MUST 无 IO、无副作用、不读 `document`/网络/localStorage，也不隐式调用 `Date.now()`。需要判断本地 pending 是否过期时，由页面在事件/轮询点取得现在时间并显式传给 `deriveContainerEffectiveStatus(rawStatus, pending, now)`；resolver 只接收已派生的 `effective_status` 和 `pendingTransition`，不做第二套超时推断。`createContainerStatusTransition` 的 `startedAt` 也由调用方显式提供。

### 2. 权限上下文在共享层归一化，精确复刻后端方法/资源两层

`normalizeContainerActionContext` 只接受调用方提供的真实 `PermissionContext.entities` 或等价只读快照，并归一化为：

- `hasOperation`：entities 含 `container:operation`、`container:manage` 或 `bypass_auth_entity`。这对应 Ctrl `user_has_entity` 的同域 manage 提升与实体通配。
- `hasManage`：entities 含 `container:manage` 或 `bypass_auth_entity`。
- `resourceWildcard`：entities 含 `container:manage` 或 `bypass_resource`。`container:manage` 在 Ctrl 中同时是容器资源通配；`bypass_auth_entity` 不是资源通配，不能拿来放行资源级动作。角色层级与资源判断同一口径见 `services/rbac_service.py:313-367`。
- `containerRole`：只接受 `ROOT/ADMIN/COLLABORATOR`；空、未知角色 rank 为 0。
- `readOnly`：必须原生 boolean；`true` 时全部 7 个写动作（含 long-term/unpause）不可执行，`false` 正常计算，缺失/非法时 `readOnlyKnown=false` 并保守禁用全部写动作，不能按非 `true` 当 `false`。

缺字段、非数组权限、未知角色、`undefined` 方法权限一律按无权限处理，MUST NOT 默认放行。非只读的列表/卡片也必须显式传 `readOnly: false`，不能依赖缺省值；只有确认只读的弹窗才传 `true`。机器访问权仍由 Ctrl `require_machine_of_container` 最终校验；列表 DTO 不携带该事实，策略层不把“能取到列表/详情”写成机器权限默认值，后端 403 仍按真实错误展示。这是本设计唯一不在前端预判的后端前置，避免把未知机器权限当成可操作。

动作与后端权限对应表：

| 动作 | 方法权限 | 资源角色 | 备注 |
| --- | --- | --- | --- |
| start / stop / restart / delete | `container:operation` | `container:admin`（ROOT/ADMIN）或资源通配 | 删除 API 还校验机器访问 |
| long_term_enable / disable | `container:operation` | `container:root`（ROOT）或资源通配 | 另需固定 DTO 与状态门 |
| unpause | `container:manage` | 无容器资源角色检查 | API 仍校验机器访问；保持后端既有差异，不要求 ROOT/ADMIN |
| 查看详情/轮询 | `container:view` | `container:collaborator` | 页面可见性既有约束，不在动作层改变 |

角色差异因此是显式的：ROOT 可删除、启停、长期；ADMIN 可删除、启停，但未持 `container:manage`/`bypass_resource` 时不能长期；COLLABORATOR 默认没有命令动作和长期入口；持有 `container:manage` 的操作员同时获得容器方法提升与资源通配，但仍受状态、DTO 和机器校验约束。`getRoleActionSet` 不再参与资格判断，迁移完成后删除或仅保留为无行为兼容壳。

### 3. 删除使用真实后端状态表，允许故障态，保留未知保守门

删除状态门以 `operation_guard.py` 的 `remove` 行为为准，而不是复用 `getContainerActionState().canSetLongTerm` 或“所有非 online 禁止”：

- 允许：`online`、`offline`、`paused`、`failed`。
- 禁止：`building`、`creating`、`starting`、`stopping`、`restarting`、`host_offline`、`host_maintenance`、`status_unknown`。
- 本地保守：`pausing`、`unpausing` 视为未确认过渡，删除禁用；空字符串、`unknown` 和任何未识别状态同样禁用，不因“不在后端矩阵里”而放行。
- 原因映射：不稳定状态用 `container_busy`，暂停/解冻过渡用 `container_transition_unconfirmed`，宿主状态用 `container_host_offline`/`container_host_maintenance`，采集未知用 `container_status_unknown`。`failed` 没有禁用原因。

`pausing/unpausing` 不是 Ctrl `ContainerStatus` 中的持久状态，后端 `remove` 矩阵没有这两个键；Web 之所以禁用，是本地未确认过渡的保守显示，不声称后端会拒绝。待权威状态更新后，删除是否可用按上表重新计算。`failed` 必须保持可删，不能因为长期资格拒绝 failed 就一并禁用。

现有前端差异一并收敛：ContainerDetailPage 的 `['building','creating']` 硬编码删除；Home 弹窗只给 ROOT 删除；ManageMachine 弹窗 `forceSystemAdmin` 无条件显示删除；ContainerDetailModal 不检查状态。这些入口都改为消费同一 `actions.delete`。`delete` 不可见/禁用 MUST NOT 被解释为“允许解除关联”：leave 不在 7 个 action 内，`remove_collaborator` 的既有后端授权（需要容器 ROOT）与页面独立流程不由本策略改变。

### 4. 长期动作严格消费固定 DTO，不用磁盘/旧配额重算

`normalizeLongTermEligibility(raw)` 严格要求对象包含全部 8 个字段：`can_enable`、`can_disable` 为原生 boolean；`enable_reason`、`disable_reason` 为 string 或 null，且与对应布尔方向一致（true 必须 null，false 必须有非空字符串）；`evaluated_at` 为带 UTC 标识的可解析字符串；`disk_total_bytes`、`disk_limit_bytes` 为非负整数或 null；`disk_measured_at` 为带 UTC 标识的字符串或 null。数组、缺字段、字符串/数字布尔、坏时间、null 对象、方向 reason 矛盾一律返回资格未知，绝不使用 `Boolean(...)` 或 truthy 转换。

`resolveContainerActions` 严格按 `container.is_long_term` 选择方向：仅布尔 `true` 选择 `can_disable`/`disable_reason`，仅布尔 `false` 选择 `can_enable`/`enable_reason`；缺失或非法值时 `stateKnown=false`，两个长期方向都禁用，不默认按 enable 处理。另一方向不参与当前结论。该非法值只影响长期动作，不影响 delete/start/stop/restart/unpause。服务端 DTO 是长期资格唯一授权来源：Web 不按 `disk_usage_percent`、`disk_usage.usage_percent`、`long_term_container_can_enable` 或 `freeze_state` 重新计算完整资格，`disk_total_bytes`/`disk_limit_bytes` 只用于契约、诊断或展示。

本地合并顺序统一为：上下文有效性/只读 → 展示权限 → 长期方向有效性 → 动作 loading → 未确认 pending → DTO 未知 → 本地状态门 → 服务端目标方向 reason；任一步不通过即返回。长期状态门保守要求 `online` 或 `offline`：`paused`、`failed`、不稳定、宿主不可用、未知均禁用。它不重算磁盘/配额，只避免在状态明显不可执行时使用过期 DTO。冻结记录不是门禁：只要权威状态为 `online`/`offline` 且服务端 `can_disable=true`，即使 `freeze_state` 仍有记录也允许取消长期；冻结尚未解除时由 DTO 的 `can_disable=false` 与原因保持禁用。

手工超限只通过 DTO 的 `can_enable=false` + `enable_reason` 表现；已确认解冻后的遗留冻结记录不得让取消长期永久禁用；缺 DTO 或 DTO 非法时长期动作不可提交，但删除/启停等不依赖 DTO 的动作仍按各自状态表工作。

### 5. 统一 reason 优先级、loading 与 pending 语义

对每个动作用同一顺序计算；前一步不通过时直接返回，后续 loading/pending 不得覆盖前一步的授权结论：

1. 上下文有效性/只读 → 展示权限/可见性 → 长期方向有效性：上下文非法、`readOnly=true`（`read_only`）或 `readOnly` 非法（`read_only_unknown`）先返回；随后权限/角色不足的动作禁用/隐藏；最后（仅长期动作）`is_long_term` 非法给 `long_term_state_unknown`。非长期动作不受 `is_long_term` 影响。
2. 动作 `loading[actionKey]`：已获授权时按钮禁用并显示 loading，`reason` 为 null（由加载态解释，避免无意义 tooltip）。
3. 本地 `pendingTransition` 未清除或展示状态为 `pausing`/`unpausing`：禁用并给出 `container_transition_unconfirmed`，同时 `pending=true`；不接受“受理即成功”。
4. 长期 DTO 未知：禁用并给出 `long_term_eligibility_unknown`。
5. 状态门：未知/空状态给 `container_status_unknown`；其余按第 3、4 节映射为 `container_busy`、`container_paused`、`container_failed`、`container_offline`、`container_online`、宿主原因。
6. 长期服务端目标方向 `can_enable/can_disable=false`：禁用并透传 `enable_reason`/`disable_reason`。
7. 以上均通过：`enabled=true`、`disabled=false`、`reason=null`。

`readOnly` 门禁覆盖全部 7 个写动作，包括 long-term 和 unpause；其优先级高于 loading/pending。`pending` 与 `loading` 分属两层：前者等待权威快照收敛，后者是本次 HTTP 请求。删除在 `failed` 且无 pending 时 `enabled=true`；在 `starting/stopping/restarting` 或本地 `pausing/unpausing` 时 `enabled=false`。页面依据 `pending` 显示中间态，依据 `loading` 显示按钮转圈，不得把 `pending` 当成终态或成功回执。所有页面共享同一组 reason 文案；服务端稳定原因原样保留，未知原因不吞成泛化错误。

### 6. 页面只保留布局、确认与 API 回调，全部消费同一结果

- Home：卡片 start/stop/restart、解冻、长期使用 `resolveContainerActions`；删除在详情弹窗由同一 `actions.delete` 控制，只有 `visible && enabled` 才打开确认；`handleModalConfirm` 仍是删除 API 回调。移除 `isDiskOverLimit`/旧配额对长期的门禁。
- ManageMachine：容器卡片的 start/stop/restart 与解冻、长期改用共享结果；`ContainerDetailModal` 不再传 `forceSystemAdmin=true` 伪造删除权限，改为真实 `containerRole` 与当前操作员上下文；删除确认仍由页面持有。人员管理能力与动作资格分离：需要以资源通配代管人员时另传显式 `canManagePeople`，不得让 `forceSystemAdmin` 继续影响删除/解冻/长期。
- ManageUser：卡片 start/stop/restart、解冻、长期改用共享结果；无容器删除入口，不新增；只读详情弹窗只展示，不引入长期动作。
- ManageUserInTable：长期列只消费父组件传入的 `longTerm`/共享 action 结果，不再自行读剩余额度、旧配额布尔或磁盘；无删除入口。
- ContainerDetailPage：删除、start/stop/restart、解冻、长期全部改用共享结果；删除不再只看 `building/creating`，解冻仍只在其方法权限可见时渲染；未知角色/权限显示原因而不是伪装可点。
- ContainerDetailModal：不新增长期控件；删除/解冻只渲染父页面传入的 action 状态，不读取 `freeze_state` 推导长期资格，不自行造状态门。解除关联沿用独立既有流程，不纳入共享 action；不得以 `delete.visible === false` 推导 leave 授权，`remove_collaborator` 现有 ROOT 前置不在本变更扩大或缩小。

每页在行数据映射时保留原始 `long_term_eligibility`，不默认成 `{}`、不默认 `can_enable=true`；`is_long_term` 只按严格布尔读取。页面保留现有 API 与 confirm 组件，`runAction` 成功后仍以权威重读为准。

所有写动作（含删除、启停、重启、解冻、长期切换）MUST 在真正调用 API 前，基于提交时最新的容器状态、权限/角色上下文、固定 DTO 与 pending transition 重新调用 `resolveContainerActions`；有最终确认框的，在用户确认提交时重解析；长期勾选等直接提交的，在调用 API 前重解析。不得复用打开弹窗或首次选择时的 action 快照。若重解析结果为不可见、禁用或上下文/只读非法，页面 MUST NOT 发请求，并更新按钮/原因或关闭确认框。util 仍无 IO，页面只负责取当前状态并传参；后端 403/409 仍是最终裁决，不新增 preflight API 或第二套异步校验。

### 7. 失败恢复与权威事实边界沿用前轮规则

解冻受理文案统一为“解冻指令已发送”，不得写“已解冻”。失败、业务拒绝或超时：清除该容器的 pending transition、action/message loading，显示具体错误，重读权威快照；不得在 catch 中 patch `paused` 或 `online`。权威 `online` 结束 pending，真实 `failed` 保留 `failed`；启动受理后的权威 `failed` 不得被受理提示覆盖。列表页保持现有刷新入口，不动 Q69 的页码语义；详情页轮询也把权威状态交给同一派生逻辑。

Node `ready_identity`（Docker ID + StartedAt）只证明就绪身份，Ctrl 可选 `action_ref`/`last_action` 只关联 pause/unpause 动作；Web 不解析它们推断成功、失败或删除代际，也不把 `action_ref` 当 Q70 的全局删除身份。本地 pending 可以被本地超时清理，但清理只能触发权威重读，不能写终态；未确认的 Ctrl runtime transition 仍由服务端资格返回，Web 不清除服务端事实。

### 8. 刷新指纹纳入完整 DTO 与动作上下文

`containerListFingerprint` 按固定顺序加入规范化后的 8 个资格字段（两个布尔、两个原因、`evaluated_at`、两个磁盘字节、`disk_measured_at`），缺 DTO 与合法 DTO 产生不同指纹；不得只比较 `can_enable`。`evaluated_at`/`disk_measured_at` 是 DTO 内的真实业务时间，其值变化 MUST 改变指纹并重算 DTO；单纯的响应接收时间、重发时间或渲染时间不是 DTO 字段，不得混入业务指纹或触发动作重算。容器角色、账号角色、`is_long_term` 等既有字段继续保留，使权限/角色变化能触发动作入口重算。其他页面沿用各自指纹，不新增与 Q69 冲突的分页参数。

**备选方案：** 各页保留旧条件、只把新 DTO 塞进按钮，会留下五套优先级，拒绝。把删除和长期都塞进 `canSetLongTerm` 或统一“非 online 全禁”，会错误禁用 failed 删除并改变产品行为，拒绝。让 Web 按磁盘字节/冻结记录重算资格，会复制服务端规则，拒绝。把 pending 超时做成隐式 `Date.now` 读取，会让纯函数不可测并可能伪造终态，拒绝。

## Risks / Trade-offs

- **前端删除状态表与 Ctrl 守卫漂移** → 在共享模块注明 Ctrl `operation_guard.py` 为来源，测试覆盖完整状态集合；Ctrl 改动时同步测试，后端 409/403 始终是最终安全网。
- **角色/权限上下文缺失导致按钮变少** → 这是 fail closed 的预期结果；页面必须传真实 `entities`/角色，不能以 `undefined` 默认放开，用户可通过权威刷新看到恢复后的入口。
- **`pausing/unpausing` 删除比后端更保守** → 仅在本地未确认过渡期间禁用，权威状态到达后重新计算；这是本地保守态，不声称后端拒绝，也不扩大为所有过渡或所有非 online 状态。
- **长期 DTO 缺字段时长期动作全部禁用** → 仅长期动作按未知禁用，删除/启停不因 DTO 缺失被连带禁用；部署顺序保持 Ctrl/Node 先于 Web。
- **失败后重读也失败** → 保留最后已知状态与错误提示，不猜 `paused`/`online`；用户可手动刷新。
- **把 Q21 写成已修复** → 当前仍是未实施提案；QUESTIONS 索引记录“提案，未实现”，tasks 保持未勾选。实施完成后必须逐项勾选、附实现证据并更新索引，不能把提案阶段状态当作永久验收。
- **恢复政策被 UI 反向修改** → 本设计只读 DTO；不新增超限确认、token 或恢复状态机，`requires_choice` 与既有静默宽限保持。

## Migration Plan

1. Ctrl 先部署 `long_term_eligibility`、删除守卫与稳定 409 原因；Node 部署运行态/action_ref 边界。Web 先合入纯函数策略与测试，再逐页替换。
2. 替换顺序：Home → ManageMachine（含弹窗）→ ManageUser/ManageUserInTable → ContainerDetailPage/ContainerDetailModal；每页替换后删除该页的旧条件，避免两套规则并存。
3. 回滚 Web 即恢复旧 UI 条件；新 DTO 与后端守卫可被旧客户端忽略，无数据迁移。回滚不得删除 Ctrl/Node 新字段。
4. 用定向组件/纯函数测试、全量 `npm test`、`npm run build`、`openspec validate --strict` 与 `git diff --check` 验证；实现前不改源码。

## Open Questions

无。删除状态、角色/方法差异、长期 DTO、pending/恢复与恢复政策边界均已由本轮源码核对和固定提案决定；实现中若发现 Ctrl 状态表变化，按“后端最终裁决 + fail closed”更新测试和契约，不另开竞争规则。
