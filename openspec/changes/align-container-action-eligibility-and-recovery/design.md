# Design

## Context

Web 目前存在多套并行判据：`src/utils/containerActions.js` 的 `getContainerActionState` 只覆盖启停和旧的长期可用性；`getRoleActionSet` 把删除只给 ADMIN、长期只给 ROOT，与实际接口权限不一致；Home、ManageMachine、ManageUser、ManageUserInTable、ContainerDetailPage 又各自拼旧配额、磁盘百分比、`forceSystemAdmin` 和状态硬编码；ContainerDetailModal 用 `isRoot` 决定删除、用 `effective_status === 'paused'` 决定解冻，没有统一的删除状态门。

Ctrl 侧待执行变更 `guard-long-term-container-transitions` 已把长期资格方案收敛为基于现有数据的静态守卫：启用看 root 配额与已知磁盘硬超限，取消看实际冻结状态；没有新增响应对象、API 或 Node 前置。因此 Web 直接使用既有 `is_long_term`、`long_term_container_can_enable`、`long_term_container_blocked_user_ids`、`long_term_container_remaining_by_user`、磁盘百分比和 `effective_status` 即可，后端 409/403 仍是最终裁决。动机见 [proposal.md](proposal.md)。

## Goals / Non-Goals

**Goals:**

- 一个纯函数统一七个动作的展示与可操作性，页面不再保留第二套条件。
- 保留既有权限/角色/只读矩阵与删除、启停、解冻状态矩阵。
- 长期只用既有字段做静态展示；提交前读最新值；失败清除 loading/pending 并重读权威状态。
- 页面同源展示，后端仍是最终裁决。

**Non-Goals:**

- 不新增资格对象、响应字段、preflight API 或后端状态机。
- 不实现或改写 Ctrl 的长期守卫、恢复宽限、冻结策略。
- 不新增 ContainerDetailModal 的长期控件，不把 `freeze_state` 当长期资格来源。
- 不新增容器删除入口到 ManageUser/ManageUserInTable；解除关联仍走独立既有流程。
- 不修复 Q67/Q70；不改 Q71 的 inode/路径边界，业务只看 `bind_mount_path`。

## Decisions

### 1. 一个纯函数，七个动作

扩展 `src/utils/containerActions.js`，拟定导出：

```js
export const CONTAINER_ACTION_KEYS = [
  'start', 'stop', 'restart', 'unpause',
  'delete', 'long_term_enable', 'long_term_disable',
];

export function normalizeContainerActionContext(raw) {}
export function resolveContainerActions(input) {}
export function getContainerActionReasonText(reason) {}
```

输入契约：

```js
{
  container: {
    is_long_term,                    // 严格 true/false；其它值只让长期方向未知
    effective_status,                // 权威/已派生的当前展示状态
    long_term_container_can_enable,  // 既有配额展示字段
    long_term_container_blocked_user_ids,
    long_term_container_remaining_by_user,
    disk_usage_percent,              // 列表/卡片
    disk_usage,                      // 详情，读 usage_percent
  },
  context: {
    permissions,                     // PermissionContext.entities 原样传入
    containerRole,                   // ROOT / ADMIN / COLLABORATOR / null
    readOnly,                        // 必须原生 boolean
  },
  pendingTransition,                 // createContainerStatusTransition 的结果
  loading: { [actionKey]: boolean },
}
```

输出契约：

```js
{
  status, statusKnown, pending,
  actions: {
    start, stop, restart, unpause, delete,
    long_term_enable, long_term_disable,
  },                                 // 每项 { visible, enabled, disabled, reason, loading, pending }
  longTerm: {
    stateKnown, direction, actionKey, checked,
    visible, enabled, disabled, reason, loading, pending,
  },
}
```

`disabled` 恒等于 `!enabled`；每个动作同时给出 `visible` 与 `reason`，页面不自行补条件。`visible` 表示动作是否出现在当前视图：启停/删除在缺少方法权限、ADMIN 级资源角色或只读视图时为 false；解冻在缺少 `container:manage` 时为 false；长期按当前方向只显示一个入口，缺少 ROOT 级资源角色时仍可见但禁用，便于展示原因。模块无 IO、无副作用，不读 `document`/网络/本地存储，也不隐式调用 `Date.now()`；pending 超时由页面在事件/轮询点取现在时间并显式传给 `deriveContainerEffectiveStatus`。

`is_long_term` 严格区分 `true` 与 `false`：`true` 只启用取消方向，`false` 只启用启用方向；缺失、`null`、字符串或其他非法值使 `longTerm.stateKnown=false`、方向/checked 为 null，两个长期动作都以 `long_term_state_unknown` 禁用。该非法值不影响 delete/start/stop/restart/unpause。

`readOnly` 必须为原生 boolean。`true` 时七个写动作全部不可执行，原因 `read_only`；`false` 正常计算；缺失或非法时 `readOnlyKnown=false`，七个写动作保守禁用并给出 `read_only_unknown`，不把非 `true` 当 `false`。

### 2. 权限矩阵保留

`normalizeContainerActionContext` 只接受调用方提供的真实 `PermissionContext.entities` 或等价只读快照，归一化为：

- `hasOperation`：含 `container:operation`、`container:manage` 或 `bypass_auth_entity`。
- `hasManage`：含 `container:manage` 或 `bypass_auth_entity`。
- `resourceWildcard`：含 `container:manage` 或 `bypass_resource`；`bypass_auth_entity` 不是资源通配。
- `containerRole`：只认 `ROOT/ADMIN/COLLABORATOR`；空/未知 rank 为 0。
- `readOnly`：见上。

缺字段、非数组权限、未知角色、`undefined` 方法权限一律按无权限处理，不默认放行。非只读列表/卡片必须显式传 `readOnly: false`；只有确认只读的弹窗传 `true`。机器访问权仍由 Ctrl 最终校验，前端不把“能取到列表/详情”写成机器权限。

| 动作 | 方法权限 | 资源角色 | 备注 |
| --- | --- | --- | --- |
| start / stop / restart / delete | `container:operation` | `container:admin`（ROOT/ADMIN）或资源通配 | 删除 API 还校验机器访问 |
| long_term_enable / disable | `container:operation` | `container:root`（ROOT）或资源通配 | 另需既有长期字段与状态门 |
| unpause | `container:manage` | 无容器资源角色检查 | API 仍校验机器访问，保持后端差异 |
| 查看详情/轮询 | `container:view` | `container:collaborator` | 页面既有可见性，不在动作层改变 |

`getRoleActionSet` 不再参与资格判断，替换后删除或仅保留无行为兼容壳。

### 3. 删除、启停与解冻状态矩阵保留

删除按 Ctrl 既有 `remove` 状态集：

- 允许：`online`、`offline`、`paused`、`failed`。
- 禁止：`building`、`creating`、`starting`、`stopping`、`restarting`、`host_offline`、`host_maintenance`、`status_unknown`。
- 本地保守：`pausing`、`unpausing`、空字符串、`unknown` 及未识别状态禁用。
- 原因：不稳定用 `container_busy`，过渡用 `container_transition_unconfirmed`，主机用 `container_host_offline`/`container_host_maintenance`，采集未知用 `container_status_unknown`。`failed` 没有删除禁用原因。

`pausing/unpausing` 不是 Ctrl 持久状态，Web 禁用是本地未确认过渡的保守显示，不声称后端拒绝；权威状态更新后重新计算。`failed` 必须保持可删。

普通动作保持既有前端保守行为：start 仅 `offline`；stop/restart 仅 `online`；unpause 仅 `paused` 且具备 `container:manage`。后端允许 `failed` restart，但本变更不扩大现有 UI 行为。

### 4. 长期只用既有字段

方向由严格 `is_long_term` 决定，当前方向只消费对应事实：

- **启用**（`is_long_term === false`）：在基础状态矩阵允许的前提下，若 `long_term_container_can_enable === false`，禁用并显示既有配额原因/剩余信息；若 `isDiskOverLimit(container)` 为 true（`disk_usage_percent` 或 `disk_usage.usage_percent` ≥ 100），禁用并显示既有磁盘超限文案。两者都是静态展示，后端最终拒绝仍以 409 呈现。
- **取消**（`is_long_term === true`）：不检查配额或磁盘。若 `effective_status` 为 `paused`（冻结中），禁用并显示 `container_paused`；若状态为 `online`/`offline`，即使 `freeze_state` 行仍存在也允许取消。`freeze_state` 只用于展示冻结天数/宽限，不作为资格来源。
- 基础状态矩阵沿用现有 `canSetLongTerm` 语义：`building/creating/starting/stopping/restarting/failed`、主机离线/维护、采集未知时长期动作禁用；`online/offline` 允许；`paused` 仅在启用方向允许，取消方向另加冻结拦截。

磁盘数据缺失按既有 `isDiskOverLimit` 语义视为“未超限”，不因此集体禁用；机器上限/硬限制百分比的最终判断在 Ctrl，UI 的 100% 阈值只是既有展示口径，不承诺与服务端配置实时一致。

缺 `long_term_container_can_enable` 时按既有 `!== false` 读取；缺磁盘字段时不禁用。不得用旧字段重算服务端完整资格，也不得把 `freeze_state` 行存在当成永久取消门禁。

### 5. reason、loading、pending 优先级

每个动作按同一顺序短路，前一步不通过时不进入后续：

1. 上下文有效性/只读：非法上下文、`readOnly=true`（`read_only`）或非法（`read_only_unknown`）先禁用。
2. 展示权限/角色：不足时隐藏或禁用。
3. 长期方向有效性：仅长期动作，`is_long_term` 非法给 `long_term_state_unknown`。
4. 动作 `loading[actionKey]`：已授权时禁用并显示 loading，`reason` 为 null。
5. 未确认 pending：`pendingTransition` 未清除或展示状态为 `pausing`/`unpausing`，禁用并给 `container_transition_unconfirmed`，`pending=true`。
6. 状态门：未知/空状态给 `container_status_unknown`；其余按第 3、4 节映射。
7. 长期既有字段/服务端原因：配额、磁盘或冻结原因。

`readOnly` 覆盖全部七个写动作，优先级高于 loading/pending。`pending` 等待权威快照收敛，`loading` 是本次 HTTP 请求；页面分别显示中间态与按钮转圈，不把 pending 当终态。服务端稳定原因原样保留，未知原因不吞成泛化错误。

### 6. 页面只保留布局、确认与回调

- Home：卡片 start/stop/restart、解冻、长期使用 `resolveContainerActions`；删除在详情弹窗由同一 `actions.delete` 控制，只有 `visible && enabled` 才打开确认；移除 `isDiskOverLimit`/旧配额的第二套长期门。
- ManageMachine：卡片与 `ContainerDetailModal` 使用共享结果；不再传 `forceSystemAdmin=true` 伪造删除，改传真实 `containerRole`/权限；人员管理能力另用显式 `canManagePeople`，不影响删除/解冻/长期。
- ManageUser：卡片使用共享结果；不新增容器删除入口；只读详情弹窗只展示，不引入长期控件。
- ManageUserInTable：长期列只消费父组件传入的 `longTerm`/共享结果，不自行读配额、磁盘或冻结字段；无删除、启停、解冻入口。
- ContainerDetailPage：删除、start/stop/restart、解冻、长期全部使用共享结果；删除不再只看 `building/creating`；解冻仍只在 `container:manage` 下渲染。
- ContainerDetailModal：不新增长期控件；删除/解冻只渲染父页面传入的 action 状态，不用 `isRoot`/`forceSystemAdmin`/状态字符串另造判据；解除关联走独立既有流程，不能由 `delete.visible === false` 推导授权。

每页映射行数据时保留原始 `is_long_term`、配额、磁盘和 `freeze_state` 字段；不默认成空对象或默认可启用。

### 7. 提交前重解析与失败恢复

所有写动作（删除、启停、重启、解冻、长期切换）在真正调用 API 前，基于提交时最新的容器状态、权限/角色、长期字段与 pending 重新调用 `resolveContainerActions`；有最终确认框的，在用户确认提交时重解析；长期勾选等直接提交的，在 API 前重解析。不得复用打开弹窗或首次选择时的 action 快照。若重解析为不可见、禁用或上下文/只读非法，页面不发请求，并更新按钮/原因或关闭确认框。util 仍无 IO，页面负责取最新值；后端 403/409 仍是最终裁决，不新增 preflight API。

解冻受理文案统一为“解冻指令已发送”，不写“已解冻”。失败、业务拒绝或超时：清除该容器的 pending transition、action/message loading，显示具体错误，重读权威快照；不在 catch 中 patch `paused` 或 `online`。权威 `online` 结束 pending，真实 `failed` 保持 `failed`。列表页保持既有刷新入口，不改分页语义；详情轮询也把权威状态交给同一派生逻辑。

`containerListFingerprint` 继续使用既有字段（`is_long_term`、配额、磁盘、冻结、角色/账号）；不新增资格字段列表。现有指纹已覆盖这些字段，无需为本次新增响应字段。

### 8. 恢复边界

恢复长期快照沿用既有恢复与 image 内容选择流程；Web 不新增超限确认框、token、恢复宽限倒计时或恢复状态机，也不根据 `freeze_state` 反推恢复宽限是否成功。恢复宽限的后端承载不在 Web 变更内；Web 只展示既有冻结/宽限字段。

### 9. 被否决的替代方案

- **新增服务端资格对象/字段**：Ctrl 待执行变更已收敛为静态守卫方案，既有字段足够做展示；新增对象会把前端展示变成强制契约，已删除。
- **前端按磁盘字节/配额重算完整服务端规则**：会复制后端判断，且无法知道硬限制配置；只做既有字段的静态展示，后端最终裁决。
- **用 `freeze_state` 行存在作为取消门禁**：会永久挡住已确认解冻的容器；改为看实际 `effective_status`。
- **所有非 online 状态一律禁止删除**：会错误禁用 `failed`/`paused` 删除，破坏既有产品行为。
- **把确认、API、轮询搬进 util**：会让纯函数不可测并制造第二套流程；util 只做判断。
- **继续保留 `getRoleActionSet` 作为第二套角色表**：会与真实方法/资源权限漂移；替换后不再参与资格。

## Risks / Trade-offs

- **前端静态数据滞后** → 按钮可能短暂显示可用，后端 409/403 是最终安全网；失败后重读并更新原因。
- **磁盘 100% 展示阈值与 Ctrl 硬限制配置可能不同** → UI 只做既有展示口径，服务端按实际配置拒绝；不新增字段来同步配置。
- **配额/磁盘字段缺失** → 按既有语义不额外禁用启用，后端最终判断；避免采集故障导致所有长期入口变灰。
- **删除状态表与 Ctrl 守卫漂移** → 在共享模块注明 Ctrl `operation_guard.py` 为来源，测试覆盖完整状态集；后端拒绝仍是最终安全网。
- **角色/权限上下文缺失导致按钮变少** → 这是 fail closed 的预期结果；页面必须传真实 `entities`/角色，不能以 `undefined` 默认放开。
- **Q67 配额并发** → 前端无法阻止两个容器同时占用最后一个名额；不由 Web 修复，也不声称已修。
- **恢复宽限表示缺口** → 属于 Ctrl 既有冻结仓储的边界，不在 Web 变更内；Web 不据 UI 推导补偿。

## Rollout / Rollback

1. 先合入共享纯函数与单测，保持旧页面不变；再逐页替换 Home → ManageMachine（含弹窗）→ ManageUser/ManageUserInTable → ContainerDetailPage/ContainerDetailModal。
2. 每页替换后删除该页旧条件，避免两套规则并存；共享层测试覆盖七个 action key、权限矩阵、状态矩阵、长期字段与失败分支。
3. 回滚 Web 即恢复旧 UI 条件；没有后端字段/数据变更，旧客户端可继续使用既有响应。回滚不改 Ctrl/Node 长期政策。
4. 用定向组件/纯函数测试、全量 `npm test`、`npm run build`、`openspec validate --strict` 与 `git diff --check` 验证；实现前不改源码。

## Open Questions

无。删除状态、权限/角色、长期既有字段与 pending/失败恢复均已由本轮源码核对和既有字段决定；实现中若 Ctrl 状态表变化，按“后端最终裁决 + 保守展示”更新测试，不另开竞争规则。

## Source references

- [src/utils/containerActions.js](../../../src/utils/containerActions.js)：现有 `getContainerActionState`、`getRoleActionSet` 与 pending transition 工具。
- [src/utils/diskLimit.js](../../../src/utils/diskLimit.js)：既有 `isDiskOverLimit` 与磁盘超限文案。
- [src/utils/listRefresh.js](../../../src/utils/listRefresh.js)：既有容器列表指纹。
- [src/pages/Home.jsx](../../../src/pages/Home.jsx)、[src/pages/ManageMachine.jsx](../../../src/pages/ManageMachine.jsx)、[src/pages/ManageUser.jsx](../../../src/pages/ManageUser.jsx)、[src/pages/ManageUserInTable.jsx](../../../src/pages/ManageUserInTable.jsx)、[src/pages/ContainerDetailPage.jsx](../../../src/pages/ContainerDetailPage.jsx)、[src/components/ContainerDetailModal.jsx](../../../src/components/ContainerDetailModal.jsx)：现有页面条件。
- Ctrl 只读参考：`FuxiYu_CtrKernel/services/container_module/operation_guard.py`、`services/container_module/long_term.py`；本变更不修改 Ctrl。
