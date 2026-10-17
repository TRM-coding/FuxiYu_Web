# Spec Delta

## ADDED Requirements

### Requirement: ContainerDetailPage 全部容器动作使用共享策略

ContainerDetailPage 的 start、stop、restart、unpause、delete、long_term_enable 与 long_term_disable SHALL 消费同一共享动作策略结果，使用当前用户真实方法权限、容器角色与权威状态计算 `visible`、`enabled`、`reason`、`loading`、`pending`；MUST NOT 在按钮旁另写状态/角色/旧配额条件。权限或角色缺失 MUST fail closed；页面保留确认弹窗、轮询与 API 回调。

#### Scenario: 与其它页面同上下文一致

- **WHEN** 同一容器、同一状态和同一权限上下文分别出现在 ContainerDetailPage 与 Home/ManageMachine/ManageUser
- **THEN** 各动作的 visible/enabled/reason 结论一致，不因详情页或列表页而漂移

#### Scenario: 不同角色可见性不同

- **WHEN** 当前用户为 ROOT/ADMIN、COLLABORATOR、仅持 `container:manage` 的操作员或权限上下文缺失
- **THEN** 删除/启停/长期/解冻按后端方法/资源表分别可见或禁用，COLLABORATOR 不会看到可执行删除或长期切换

#### Scenario: 请求中或未确认过渡

- **WHEN** 某动作请求中，或容器存在 pending transition
- **THEN** 对应按钮显示 loading/disabled 或 pending 原因，不重复提交、不伪造终态

#### Scenario: 只读上下文缺失或非法

- **WHEN** `readOnly` 缺失、非 boolean 或为 true
- **THEN** 所有写动作（含 long-term 与 unpause）保守禁用；`readOnly` 缺失/非法不得按 false 放行

#### Scenario: 授权优先于 loading

- **WHEN** 某动作正在 loading，但权限/角色失效、`readOnly` 非法或输入上下文无效
- **THEN** 先按授权/只读/有效性返回禁用原因，loading 不得覆盖授权结论

#### Scenario: 提交前重新解析

- **WHEN** 用户已打开确认框或已选择待提交动作，但在最终 API 提交前容器状态、权限/角色、DTO 或 pending 已变化
- **THEN** 页面用最新上下文重新调用共享策略；若结果禁用/隐藏则不发请求并更新原因，不复用打开确认框或首次选择时的快照

### Requirement: ContainerDetailPage 删除使用真实后端状态集合

ContainerDetailPage 的删除 SHALL 使用共享 `delete` 结果，移除仅 `['building','creating']` 的硬编码：`online`、`offline`、`paused`、`failed` 可用；`building`、`creating`、`starting`、`stopping`、`restarting`、宿主/未知状态及本地 `pausing`/`unpausing` 禁用。删除 MUST NOT 复用长期资格门或把所有过渡态/非 online 状态一律禁止；`failed` 仍可删。

#### Scenario: 故障态删除

- **WHEN** 容器状态为 `failed` 且调用方有 `container:operation` + ADMIN 级资源角色/通配
- **THEN** 删除可见且可执行；长期资格拒绝 failed 只影响长期勾选，不影响删除

#### Scenario: 过渡态删除

- **WHEN** 状态为 `building`/`creating`/`starting`/`stopping`/`restarting`，或本地 `pausing`/`unpausing`
- **THEN** 删除禁用并显示状态/过渡原因，不发送删除请求

#### Scenario: 删除被拒绝或超时

- **WHEN** 删除 POST 返回 403/409、业务失败或超时
- **THEN** 保留详情和当前路由，展示具体错误，不提前提示已删除或跳转成功；成功后才按权威结果收敛

### Requirement: ContainerDetailPage 长期动作严格消费固定 DTO

ContainerDetailPage 的长期勾选 SHALL 读取固定 8 字段 DTO，未长期只消费 `can_enable`/`enable_reason`，已长期只消费 `can_disable`/`disable_reason`；MUST NOT 用 `disk_usage.usage_percent`、旧配额布尔或 `freeze_state` 重算完整资格。缺 DTO、非法类型、非布尔真假值或坏时间 MUST 按资格未知禁用真实切换。

#### Scenario: 两个方向分别判断

- **WHEN** 容器未长期且 `can_enable=false`，或容器已长期且 `can_disable=false`
- **THEN** 勾选分别禁用并显示对应服务端原因，不发起切换

#### Scenario: 手工超限与已确认解冻

- **WHEN** 手工超限容器 `can_enable=false`；或权威已恢复、`freeze_state` 仍存在但 `can_disable=true`
- **THEN** 前者禁用并显示服务端磁盘原因，后者允许取消长期，不因冻结记录残留而持续禁用

#### Scenario: DTO 异常

- **WHEN** DTO 缺失、非对象、半对象、布尔为字符串/数字、UTC 时间非法或方向 reason 矛盾
- **THEN** 长期勾选禁用并显示“长期资格未知”，不把 truthy 值当授权

#### Scenario: 长期标记缺失或非法只影响长期

- **WHEN** `is_long_term` 缺失、为 `null`、字符串或其他非法值
- **THEN** 长期方向未知，两个长期动作都禁用并给出 `long_term_state_unknown`；删除/启停/重启/解冻不受该字段影响

#### Scenario: 409 或超时

- **WHEN** 长期切换返回 409、业务失败或超时
- **THEN** 不提示成功、不固定 checked，重读权威详情与 DTO 后按实际结果展示

### Requirement: ContainerDetailPage 解冻、启动与权威轮询恢复

ContainerDetailPage SHALL 仅在解冻获受理后提示“解冻指令已发送”，MUST NOT 提示“解冻成功/已解冻”。失败、拒绝或超时 SHALL 清除 action loading 与该容器 pending、提示具体错误并重读权威详情，MUST NOT 无条件假定 `paused` 或 `online`。后续权威 `online` SHALL 结束 pending；真实启动验证为 `failed` 时 MUST 显示 `failed`。

#### Scenario: 解冻受理后权威上线

- **WHEN** 解冻获受理，随后轮询返回 `online`
- **THEN** 结束 `unpausing` pending 并显示 `online`，受理反馈仍为“解冻指令已发送”

#### Scenario: 解冻失败或超时

- **WHEN** 解冻失败、被拒绝或超时
- **THEN** 清除 loading 与 pending，显示具体错误并重新读取详情；重读前不得写猜测的 `paused`/`online`

#### Scenario: 启动验证失败

- **WHEN** 启动获受理，权威轮询最终返回 `failed`
- **THEN** 页面持续显示 `failed`，MUST NOT 以受理成功覆盖该验证结果

### Requirement: ContainerDetailModal 不建立第二套长期或删除资格

ContainerDetailPage 使用的 ContainerDetailModal SHALL NOT 新增长期切换控件，也不得使用 `freeze_state`、旧配额或本地 pending 推导长期资格；删除与解冻 MUST 消费父页面传入的共享 action 结果，不得用 `isRoot`/`forceSystemAdmin` 或状态字符串另造判据。解除关联不在共享策略内，沿用独立既有流程与后端 ROOT 前置，不能由删除不可见推导授权。

#### Scenario: 弹窗展示冻结容器

- **WHEN** 弹窗收到带冻结记录或长期标记的容器
- **THEN** 不出现长期勾选框，不自行判断 `can_enable`/`can_disable`，长期状态由详情页展示

#### Scenario: 弹窗动作权限来自父级

- **WHEN** 父页面传入的删除/解冻结果为不可用，或当前详情为只读
- **THEN** 弹窗不显示可执行删除/解冻，也不以系统管理员标志强制显示；恢复仍由父页面统一处理

#### Scenario: 删除不可见不授予解除关联

- **WHEN** 删除动作因权限、只读或状态不可见
- **THEN** 不得因此显示或授权解除关联；leave 仍按既有独立流程与 `remove_collaborator` 的后端 ROOT 前置决定
