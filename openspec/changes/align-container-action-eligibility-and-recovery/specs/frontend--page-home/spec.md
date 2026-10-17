# Spec Delta

## ADDED Requirements

### Requirement: Home 容器动作统一使用共享策略

Home 的 start、stop、restart、unpause、delete、long_term_enable 与 long_term_disable SHALL 消费同一共享动作策略结果，使用真实方法权限、容器角色、只读上下文和当前状态计算 `visible`、`enabled`、`reason`、`loading`、`pending`；MUST NOT 在各页保留旧配额、磁盘百分比、角色或删除状态的第二套判据。权限、角色缺失或非法 MUST fail closed；页面只保留布局、确认弹窗和 API 回调。

#### Scenario: 同一上下文跨页面一致

- **WHEN** 同一容器、同一状态、同一资格和同一权限角色分别渲染在 Home 与其它容器视图
- **THEN** 每个动作的 visible/enabled/reason 结论一致，不因页面不同而漂移

#### Scenario: 不同角色产生明确差异

- **WHEN** 同一容器分别由容器 ROOT、ADMIN、COLLABORATOR 或缺少 `container:operation` 的调用方查看
- **THEN** 删除、启停、长期与解冻按第 2、3 条所述权限表分别可见/禁用，不以 undefined 权限默认放行

#### Scenario: 权限上下文缺失

- **WHEN** 页面未提供权限数组、容器角色为未知值或上下文非法
- **THEN** 所有需要该上下文验证的动作 fail closed 并返回可读原因，不渲染为可执行

#### Scenario: 请求与过渡同时存在

- **WHEN** 某动作正在请求中，或该容器存在未确认的 pending transition
- **THEN** 对应动作显示 loading/disabled 或 pending 原因，不重复提交，也不展示终态成功

#### Scenario: 只读上下文缺失或非法

- **WHEN** `readOnly` 缺失、非 boolean 或为 true
- **THEN** 所有写动作（含 long-term 与 unpause）保守禁用；`readOnly` 缺失/非法不得按 false 放行，删除也不得发送

#### Scenario: 授权优先于 loading

- **WHEN** 某动作正在 loading，但当前权限/角色已失效、`readOnly` 非法或输入上下文无效
- **THEN** 先按授权/只读/有效性返回禁用原因，loading 不得把该动作覆盖成可执行

#### Scenario: 提交前重新解析

- **WHEN** 用户已打开确认框或已选择待提交动作，但在最终 API 提交前容器状态、权限/角色、DTO 或 pending 已变化
- **THEN** 页面用最新上下文重新调用共享策略；若结果禁用/隐藏则不发请求并更新原因，不复用打开弹窗或首次选择时的快照

### Requirement: Home 删除动作使用真实后端状态集合

Home 的删除入口 SHALL 按 Ctrl 删除守卫的真实状态集合判断：`online`、`offline`、`paused`、`failed` 可用；`building`、`creating`、`starting`、`stopping`、`restarting`、`host_offline`、`host_maintenance`、`status_unknown` 禁用；本地 `pausing`、`unpausing`、`unknown`、空状态按保守态禁用。删除 MUST 独立于长期资格，`failed` 可删，MUST NOT 复用长期守卫或把所有非 online 状态一律禁止。

#### Scenario: 故障态容器仍可删除

- **WHEN** 容器权威状态为 `failed` 且调用方具备删除方法/资源权限
- **THEN** 删除按钮可见且可执行；同一容器若长期资格拒绝 failed，只禁用长期动作，不连带禁用删除

#### Scenario: 后台过渡状态不可删除

- **WHEN** 容器状态为 `building`、`creating`、`starting`、`stopping`、`restarting` 或本地 `pausing`/`unpausing`
- **THEN** 删除禁用并显示状态/过渡原因，不发起删除请求

#### Scenario: 角色与方法权限差异

- **WHEN** 调用方为 ROOT/ADMIN、仅有 `container:manage` 的操作员、COLLABORATOR，或权限上下文缺失
- **THEN** 删除分别按 `container:operation` + `container:admin`（或资源通配）判定；无权限时不伪装可执行，也不把 ADMIN 错标成唯一可删角色

#### Scenario: 删除请求被服务端拒绝或超时

- **WHEN** 删除 POST 返回 403/409、业务失败或超时
- **THEN** 保留原行和错误原因，不提前提示已删除或移除本地行；成功后才按权威结果收敛

#### Scenario: 删除不可见不授予解除关联

- **WHEN** 删除动作因权限、只读或状态不可见
- **THEN** 不得因此自动显示或授权“解除关联”；leave 仍按既有独立流程与 `remove_collaborator` 的后端 ROOT 前置决定

### Requirement: Home 长期动作严格消费固定 DTO

Home 的长期动作 SHALL 读取固定 8 字段 DTO `{can_enable, can_disable, enable_reason, disable_reason, evaluated_at, disk_total_bytes, disk_limit_bytes, disk_measured_at}`，未长期时只消费 `can_enable`/`enable_reason`，已长期时只消费 `can_disable`/`disable_reason`；MUST NOT 用磁盘百分比、旧 `long_term_container_can_enable` 或 `freeze_state` 重算完整资格。缺 DTO、非法类型、字符串/数字布尔或坏时间 MUST 按资格未知禁用真实切换。

#### Scenario: 手工超限不能启用长期

- **WHEN** 未长期容器的 DTO 为 `can_enable=false` 且 `enable_reason` 指向磁盘超限
- **THEN** 勾选框禁用并显示该服务端原因，不发起切换；Web 不以旧磁盘百分比或旧配额字段绕过

#### Scenario: 冻结未解除与已确认解冻

- **WHEN** 容器仍冻结且 `can_disable=false`；或权威状态已恢复、`freeze_state` 仍有记录但 DTO 的 `can_disable=true`
- **THEN** 前者保持禁用；后者不得仅因冻结记录存在而永久禁用取消长期

#### Scenario: 资格未知或 DTO 异常

- **WHEN** DTO 缺失、非对象、缺任一固定字段、布尔为 `"false"`/`0`、时间不可解析或原因方向矛盾
- **THEN** 长期动作禁用并显示“长期资格未知”原因，不把 truthy 值当授权，也不发起切换

#### Scenario: 长期标记缺失或非法只影响长期

- **WHEN** `is_long_term` 缺失、为 `null`、字符串或其他非法值
- **THEN** 长期方向未知，两个长期动作都禁用并给出 `long_term_state_unknown`；删除/启停/重启/解冻不受该字段影响，仍按各自权限与状态计算

#### Scenario: 长期提交遇到 409 或超时

- **WHEN** 页面旧 DTO 允许切换，但服务端返回 409、业务失败或超时
- **THEN** 不提示成功、不保留未确认 checked，刷新权威状态与 DTO 后按服务端事实展示

### Requirement: Home 解冻与启动的受理和恢复

Home SHALL 仅在解冻获受理后提示“解冻指令已发送”，MUST NOT 提示“已解冻”或终态完成。失败、业务拒绝或超时 SHALL 清除该容器的 pending transition 与 loading、显示具体错误并重读权威快照，MUST NOT 在 catch 中假定 `paused` 或 `online`。后续权威 `online` SHALL 结束 pending；真实启动验证为 `failed` 时 MUST 保持 `failed`。

#### Scenario: 解冻受理后权威上线

- **WHEN** 解冻请求获受理，随后权威快照返回 `online`
- **THEN** 结束 `unpausing` pending 并展示 `online`，受理反馈仍只是“解冻指令已发送”

#### Scenario: 解冻失败或超时

- **WHEN** 解冻请求失败、被拒绝或超时
- **THEN** 清除 transition 与 loading，显示具体错误并重读快照；重读前不得写入猜测的 `paused` 或 `online`

#### Scenario: 后续启动验证失败

- **WHEN** 解冻后的启动获受理，后续权威验证返回 `failed`
- **THEN** 页面保持 `failed`，不得以受理提示覆盖真实终态或退回 `online`/`paused`

### Requirement: Home 静默刷新纳入完整资格

Home 的容器刷新指纹 SHALL 按固定顺序覆盖规范化后的 8 个长期资格字段、严格 `is_long_term`、账号角色与当前动作相关字段；缺少 DTO 与完整 DTO MUST 产生不同指纹，不能只比较 `can_enable`。DTO 的 `evaluated_at`/`disk_measured_at` 是真实业务时间，其值变化 MUST 更新 DTO 与动作重算；响应接收、重发或渲染时间不是 DTO 字段，不得混入业务指纹。

#### Scenario: 只改变资格原因或 DTO 时间

- **WHEN** 容器其它字段与响应接收时间不变，仅 `disable_reason`、`evaluated_at` 或 `disk_measured_at` 变化
- **THEN** 刷新仍更新该行，重新计算长期动作与原因

#### Scenario: 仅非 DTO 的接收/重发时间变化

- **WHEN** 仅响应接收时间、重发时间或渲染时间变化，DTO 字段、角色和业务字段均未变化
- **THEN** 不产生无意义的动作入口重算，也不把该时间当作新的资格证据
