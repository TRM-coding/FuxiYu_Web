# Spec Delta

## ADDED Requirements

### Requirement: ManageUserInTable 长期列只消费父级共享结果

ManageUserInTable 的长期列 SHALL 使用父组件传入的 `longTerm`/共享动作结果决定 checked、visible、enabled、reason、loading 与 pending；未长期时只接受启用方向，已长期时只接受取消方向。组件 MUST NOT 自行读取 `long_term_container_remaining`、`long_term_container_can_enable`、磁盘百分比或 `freeze_state` 重算长期资格，也不新增容器删除、启停或解冻入口。

#### Scenario: 父级结果优先

- **WHEN** 父组件传入的长期结果与行上的旧配额字段冲突
- **THEN** 长期列按父级共享结果显示，不再用旧配额字段单独否决

#### Scenario: 资格未知或方向拒绝

- **WHEN** 父级长期结果为未知，或目标方向为禁用
- **THEN** 长期列禁用并显示父级提供的原因，不自行拼 fallback 文案

#### Scenario: 长期标记缺失或非法

- **WHEN** 父级传入的 `is_long_term` 缺失、为 null、字符串或其他非布尔值
- **THEN** 长期列按未知禁用，不默认按启用方向解析，也不把非法值当 false 放行

#### Scenario: 保存中与失败回滚

- **WHEN** 该行长期切换正在保存，或父组件收到 409/失败/超时并重读权威值
- **THEN** 保存中显示 loading 并禁用重复操作；失败时 checked 回到父组件权威值，不提示成功或保留未确认目标

#### Scenario: 无容器命令入口

- **WHEN** 用户展开用户表格中的容器
- **THEN** 只渲染父组件提供的长期状态/动作，不出现删除、启停或解冻按钮；解除关联仍走独立既有回调
