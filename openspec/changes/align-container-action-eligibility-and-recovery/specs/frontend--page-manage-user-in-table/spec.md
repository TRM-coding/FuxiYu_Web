# Spec Delta

## ADDED Requirements

### Requirement: ManageUserInTable 长期列消费父级共享策略结果

ManageUserInTable 的长期列 SHALL 使用父组件传入的共享 `longTerm`/动作结果决定 checked、visible、enabled、reason、loading 与 pending；MUST NOT 在组件内读取 `long_term_container_remaining`、`long_term_container_can_enable`、磁盘百分比或 `freeze_state` 自行推导长期资格。未长期时只接受 `can_enable` 方向，已长期时只接受 `can_disable` 方向。

#### Scenario: 旧配额与完整 DTO 冲突

- **WHEN** 父组件传入的旧 `long_term_container_can_enable` 为假，但共享结果按 DTO 的 `can_enable` 为真
- **THEN** 长期列按共享结果允许目标切换，不再用旧配额字段单独否决

#### Scenario: 资格未知或方向拒绝

- **WHEN** 父组件传入的长期结果为资格未知，或目标方向 `can_enable`/`can_disable` 为布尔假
- **THEN** 长期列禁用并显示父级提供的状态/原因，不自行拼 fallback 文案

#### Scenario: 长期标记缺失或非法

- **WHEN** 父级传入的 `is_long_term` 缺失、为 `null`、字符串或其他非法值
- **THEN** 长期列按未知禁用，不默认按 enable 方向解析，也不把非法值当 false 后放行

#### Scenario: 保存前父级重新解析

- **WHEN** 用户已勾选/取消长期，但父级在最终 API 提交前发现最新权限、DTO、状态或 pending 已使动作禁用/隐藏
- **THEN** 父级不发送请求并按最新原因回填；本组件不复用首次打开时的长期动作快照

#### Scenario: 保存中与失败回滚

- **WHEN** 该行长期切换正在保存，或父组件收到 409/失败/超时并重读权威值
- **THEN** 保存中显示 loading 并禁用重复操作，失败时 checked 回到父组件权威值，本组件不提示成功或保留未确认目标

#### Scenario: 父级未提供共享结果

- **WHEN** 父组件没有传入该行的长期动作结果
- **THEN** 列按不可操作处理并显示可读状态，不退回旧字段自行计算

### Requirement: ManageUserInTable 不新增删除或其它容器命令入口

ManageUserInTable 的容器展开区 SHALL 保持既有长期列与解绑等父级回调，MUST NOT 新增容器删除、启停、重启或解冻按钮；不得把 Home/ContainerDetailPage 的删除状态门或长期策略复制到本组件。

#### Scenario: 展开容器行

- **WHEN** 用户展开某个用户并查看其容器
- **THEN** 只渲染父组件提供的长期状态/动作，不出现删除容器入口或删除 API 调用；解除关联沿用独立既有流程，不纳入本组件长期策略

#### Scenario: 删除用户按钮

- **WHEN** 点击用户表操作列的“删除”
- **THEN** 仍走既有删除用户回调，不触发容器动作策略，也不被容器删除状态门影响
