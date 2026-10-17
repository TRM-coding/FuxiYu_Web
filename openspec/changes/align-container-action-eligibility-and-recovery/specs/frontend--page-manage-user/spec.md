# Spec Delta

## ADDED Requirements

### Requirement: ManageUser 容器动作统一使用共享策略

ManageUser 展开容器卡片上的 start、stop、restart、unpause 与 long_term_enable/disable SHALL 消费同一共享动作策略结果，使用当前操作员真实方法权限、容器角色、状态与资格计算 `visible`、`enabled`、`reason`、`loading`、`pending`；MUST NOT 在用户页另写状态字符串、旧配额或磁盘条件。权限/角色缺失 MUST fail closed；页面保留确认弹窗和 API 回调。

#### Scenario: 与其它页面同上下文一致

- **WHEN** 同一容器、同一状态和同一权限上下文分别出现在 ManageUser 与 Home/ManageMachine/ContainerDetailPage
- **THEN** 启停、解冻与长期的 visible/enabled/reason 结论一致

#### Scenario: 操作员与容器角色差异

- **WHEN** 当前操作员仅持 `container:manage`、或为容器 ROOT/ADMIN/COLLABORATOR、或权限上下文缺失
- **THEN** 各动作按后端方法/资源表分别可见或禁用；没有容器角色时不得把 `undefined` 当作 ROOT，也不得仅凭页面是管理页就放行长期

#### Scenario: 请求或过渡中

- **WHEN** 某动作请求中或容器存在未确认 pending
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

### Requirement: ManageUser 不新增容器删除入口

ManageUser 的容器卡片和用户表格 SHALL NOT 因本变更新增容器删除动作；现有“删除用户”仍只删除用户，不得与容器删除复用同一确认或资格结论。若未来增加该入口，必须接入同一 `delete` 策略并重新补规格，不能在本变更中顺手实现。

#### Scenario: 查看用户容器

- **WHEN** 用户展开某个用户的容器列表
- **THEN** 卡片只显示既有的启停、解冻、长期等入口，不出现容器删除按钮或删除 API 调用；解除关联沿用独立既有流程，不由本策略的删除/长期结果授权

#### Scenario: 删除用户

- **WHEN** 操作员在用户表点击“删除”
- **THEN** 仍走用户删除流程，不被解释为容器删除，也不套用容器删除状态门

### Requirement: ManageUser 长期动作严格消费固定 DTO

ManageUser 的长期动作 SHALL 读取固定 8 字段 DTO，未长期只消费 `can_enable`/`enable_reason`，已长期只消费 `can_disable`/`disable_reason`；MUST NOT 用 `long_term_container_remaining`、`long_term_container_can_enable`、磁盘百分比或 `freeze_state` 重算资格。缺 DTO、非法类型、非布尔真假值或坏时间 MUST 按未知禁用。

#### Scenario: 旧配额与完整 DTO 冲突

- **WHEN** 旧 `long_term_container_can_enable` 为假但 DTO 的 `can_enable` 为布尔真
- **THEN** 长期动作按 DTO 允许目标切换，不以旧配额字段单独否决

#### Scenario: 超限、冻结与已确认解冻

- **WHEN** 手工超限容器 `can_enable=false`；或冻结未解除 `can_disable=false`；或权威已恢复且 `freeze_state` 残留但 `can_disable=true`
- **THEN** 前两者禁用并显示服务端原因，后者允许取消长期，不因冻结记录残留而永久禁用

#### Scenario: DTO 异常或保存中

- **WHEN** DTO 缺失/坏型或该行正在保存
- **THEN** 真实切换禁用并显示未知/进行中原因；保存中不提前更新 checked，也不提示成功

#### Scenario: 长期标记缺失或非法只影响长期

- **WHEN** `is_long_term` 缺失、为 `null`、字符串或其他非法值
- **THEN** 长期方向未知，长期动作禁用并给出 `long_term_state_unknown`；删除/启停/重启/解冻不受该字段影响

#### Scenario: 409、失败或超时

- **WHEN** 长期切换返回 409、业务失败或超时
- **THEN** 不提示成功、不保留未确认值或计数变化；重读权威状态与 DTO 后按服务端事实展示

### Requirement: ManageUser 解冻受理与失败恢复

ManageUser SHALL 仅在解冻获受理后提示“解冻指令已发送”，MUST NOT 声称已解冻。失败、拒绝或超时 SHALL 清除该容器的本地 transition、操作 loading 与消息 loading，提示具体错误并重读权威快照；MUST NOT 无条件把状态写成 `paused` 或 `online`。后续权威 `online` SHALL 结束 pending，真实启动验证为 `failed` 时 MUST 显示 `failed`。

#### Scenario: 解冻失败后不残留进行中

- **WHEN** 解冻请求失败、被拒绝或超时
- **THEN** 清除 `unpausing` transition 与 loading，显示具体错误，重读该容器权威状态和资格后再渲染

#### Scenario: 受理后真实上线

- **WHEN** 解冻受理，随后权威快照返回 `online`
- **THEN** 结束 pending 并显示 `online`，不把受理提示改写成解冻完成

#### Scenario: 启动验证失败

- **WHEN** 解冻后的启动被受理，后续权威验证为 `failed`
- **THEN** 容器保持 `failed`，不得退回 `online` 或 `paused`

### Requirement: ManageUser 只读详情弹窗不建立第二套判据

ManageUser 打开的 ContainerDetailModal SHALL 保持只读，不出现长期切换、删除容器或其它写动作；弹窗只消费父页面规范化后的权威状态，不读取旧配额/`freeze_state` 自行推导长期资格或动作可用性。

#### Scenario: 从用户页打开详情

- **WHEN** 用户点击容器卡片进入详情弹窗
- **THEN** 弹窗不显示长期勾选或删除按钮，启停/解冻状态也不得由弹窗另算一套
