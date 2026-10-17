# Spec Delta

## ADDED Requirements

### Requirement: ManageMachine 容器动作统一使用共享策略

ManageMachine 容器卡片与详情弹窗的 start、stop、restart、unpause、delete、long_term_enable 与 long_term_disable SHALL 消费同一共享动作策略结果，使用操作员真实方法权限、容器角色与状态计算 `visible`、`enabled`、`reason`、`loading`、`pending`；MUST NOT 在卡片和弹窗分别硬编码状态、旧配额或角色。权限/角色缺失 MUST fail closed；页面保留确认弹窗和 API 回调。

#### Scenario: 卡片与弹窗结论一致

- **WHEN** 同一机器容器同时渲染在卡片与详情弹窗中
- **THEN** 相同上下文下两个入口的删除、启停、解冻和长期结论一致，不出现弹窗可点而卡片禁用或相反

#### Scenario: 与其它页面同上下文一致

- **WHEN** 同一容器、同一资格与同一权限上下文分别出现在 ManageMachine 与 Home/ContainerDetailPage
- **THEN** 共享策略给出相同的 visible/enabled/reason；页面差异只来自布局和回调

#### Scenario: 权限上下文缺失

- **WHEN** 页面未提供权限数组、容器角色未知或上下文非法
- **THEN** 需要权限的动作 fail closed 并显示可读原因，不因操作员页面入口而默认放行

#### Scenario: 只读上下文缺失或非法

- **WHEN** `readOnly` 缺失、非 boolean 或为 true
- **THEN** 所有写动作（含 long-term 与 unpause）保守禁用；`readOnly` 缺失/非法不得按 false 放行

#### Scenario: 授权优先于 loading

- **WHEN** 某动作正在 loading，但权限/角色失效、`readOnly` 非法或输入上下文无效
- **THEN** 先按授权/只读/有效性返回禁用原因，loading 不得覆盖授权结论

#### Scenario: 提交前重新解析

- **WHEN** 用户已打开确认框或已选择待提交动作，但在最终 API 提交前容器状态、权限/角色、DTO 或 pending 已变化
- **THEN** 页面用最新上下文重新调用共享策略；若结果禁用/隐藏则不发请求并更新原因，不复用打开确认框或首次选择时的快照

### Requirement: ManageMachine 删除使用真实后端守卫且不伪造角色

ManageMachine 的删除 SHALL 使用共享 `delete` 结果：仅 `online`、`offline`、`paused`、`failed` 可用；`building`、`creating`、`starting`、`stopping`、`restarting`、宿主/未知状态及本地 `pausing`/`unpausing` 禁用。详情弹窗 MUST NOT 用 `forceSystemAdmin=true` 或 `isRoot` 替代真实 `container:operation` + `container:admin`/资源通配判定；失败态删除必须保持可用，不得复用长期资格守卫。

#### Scenario: 故障态容器可删

- **WHEN** 容器状态为 `failed` 且当前上下文具备删除权限
- **THEN** 弹窗删除可见且可执行；同一容器被长期资格拒绝时只禁用长期动作

#### Scenario: 过渡或宿主机异常不可删

- **WHEN** 容器状态为 `building`/`creating`/`starting`/`stopping`/`restarting`，或 `host_offline`/`host_maintenance`/`status_unknown`/未知
- **THEN** 删除禁用并显示对应原因，不发送删除请求

#### Scenario: 无删除角色

- **WHEN** 当前操作员缺少 `container:operation`、ADMIN 级容器资源角色或资源通配
- **THEN** 删除不可见/不可执行，弹窗不因页面门禁而把所有操作员都当作 ROOT；后端 403 仍按真实错误展示

#### Scenario: 删除失败或超时

- **WHEN** 删除返回 403/409、业务失败或超时
- **THEN** 保留原容器与弹窗状态，不提示已删除；成功后才重读列表并收敛

### Requirement: ManageMachine 长期动作严格消费固定 DTO

ManageMachine 卡片与弹窗涉及的长期动作 SHALL 读取固定 8 字段 DTO，未长期只消费 `can_enable`/`enable_reason`，已长期只消费 `can_disable`/`disable_reason`；MUST NOT 用磁盘百分比、旧配额布尔或 `freeze_state` 重算资格。缺 DTO、非法类型、非布尔真假值或坏时间 MUST 按未知禁用。

#### Scenario: 超限、冻结与已确认解冻

- **WHEN** 手工超限容器 `can_enable=false`；或冻结未解除 `can_disable=false`；或已确认解冻后 `freeze_state` 仍存在但 `can_disable=true`
- **THEN** 前两者禁用并显示服务端原因，后者允许取消长期，不因记录残留永久禁用

#### Scenario: DTO 异常

- **WHEN** DTO 缺失、半对象、布尔为字符串/数字、方向 reason 矛盾或 UTC 时间非法
- **THEN** 长期动作禁用并显示“长期资格未知”，不发起真实切换

#### Scenario: 长期标记缺失或非法只影响长期

- **WHEN** `is_long_term` 缺失、为 `null`、字符串或其他非法值
- **THEN** 长期方向未知，两个长期动作都禁用并给出 `long_term_state_unknown`；删除/启停/重启/解冻不受影响

#### Scenario: 服务端拒绝或超时

- **WHEN** 长期切换返回 409、业务失败或超时
- **THEN** 不提示成功、不保留未确认值；重读权威卡片/弹窗数据后按实际 `is_long_term` 与 DTO 展示

### Requirement: ManageMachine 解冻与恢复

ManageMachine SHALL 仅在解冻获受理后提示“解冻指令已发送”，MUST NOT 写“容器已解冻”。失败、拒绝或超时 SHALL 清除本地 transition 与 loading、显示具体错误并重读权威快照，MUST NOT 在 catch 中假定 `paused` 或 `online`。权威 `online` SHALL 结束 pending；真实 `failed` MUST 保持 `failed`。

#### Scenario: 解冻受理后真实上线

- **WHEN** 解冻获受理，随后权威状态为 `online`
- **THEN** 结束 `unpausing` pending，受理反馈仍为“解冻指令已发送”，终态由权威快照给出

#### Scenario: 解冻失败或超时

- **WHEN** 解冻失败、被拒绝或超时
- **THEN** 清除本地过渡与 loading，展示具体错误并重读快照；重读前不写猜测的 `paused`/`online`

#### Scenario: 解冻后启动验证失败

- **WHEN** 后续启动动作获受理，权威验证最终为 `failed`
- **THEN** 容器保持 `failed`，不被受理提示覆盖，也不回退成 `online`/`paused`

### Requirement: ContainerDetailModal 不建立第二套长期或删除资格

ManageMachine 使用的 ContainerDetailModal SHALL NOT 新增长期控件，也不得根据 `freeze_state`、旧配额或本地状态推导长期资格；删除与解冻 MUST 消费父页面传入的共享 action 结果，不得用 `forceSystemAdmin`/`isRoot` 另造角色门。解除关联不在共享策略内，沿用既有独立流程与后端 ROOT 前置，不能由删除不可见推导授权。

#### Scenario: 弹窗收到冻结记录

- **WHEN** 弹窗收到带 `freeze_state` 的容器
- **THEN** 不出现长期勾选框，不自行判断 `can_enable`/`can_disable`，长期状态由父页面展示

#### Scenario: 弹窗删除权限来自真实上下文

- **WHEN** 父页面传入只读或无删除权限的共享结果
- **THEN** 弹窗不显示可执行删除，也不以系统管理员标志强制显示；解冻仍由父页面统一执行与恢复

#### Scenario: 人员管理能力不被动作资格复用

- **WHEN** 操作员通过资源通配具备人员管理能力，但删除/解冻资格另有结论
- **THEN** 人员管理入口可用，删除/解冻仍严格按共享 action 结果，不因 `forceSystemAdmin` 或人员能力被放行

#### Scenario: 删除不可见不授予解除关联

- **WHEN** 当前用户没有删除权限或删除动作被隐藏
- **THEN** 不得因此显示或授权“解除关联”；leave 仍按既有独立流程与 `remove_collaborator` 的后端 ROOT 前置决定
