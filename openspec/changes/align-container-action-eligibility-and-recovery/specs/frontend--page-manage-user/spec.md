# Spec Delta

## ADDED Requirements

### Requirement: ManageUser 容器动作使用共享结果且不新增删除入口

ManageUser 展开卡片上的 start、stop、restart、unpause、long_term_enable 与 long_term_disable SHALL 消费同一共享纯函数结果，使用当前操作员真实权限、容器角色、只读上下文和既有状态/配额/磁盘字段。页面 SHALL NOT 新增容器删除入口，也不因“删除用户”流程复用容器删除资格。只读详情弹窗不出现长期控件；解冻失败清除 loading/pending 并重读。

#### Scenario: 与其他页面同上下文一致

- **WHEN** 同一容器、同一状态和同一权限上下文分别出现在 ManageUser 与 Home/ManageMachine/ContainerDetailPage
- **THEN** 启停、解冻与长期的 visible/enabled/reason 结论一致，不因用户页另写条件而漂移

#### Scenario: 操作员与容器角色差异

- **WHEN** 当前操作员仅持 `container:manage`，或为容器 ROOT/ADMIN/COLLABORATOR，或权限上下文缺失
- **THEN** 各动作按既有方法/资源矩阵可见或禁用；缺失角色不得当作 ROOT，页面不得因属于管理页就放行长期

#### Scenario: 长期使用既有字段

- **WHEN** 非长期容器 `long_term_container_can_enable` 为 false 或磁盘达到既有 100% 展示阈值；或长期容器实际状态为 `paused`；或已恢复 `online`/`offline` 但冻结行仍存在
- **THEN** 前两者分别禁用启用/取消；后者允许取消长期，不因冻结行残留永久禁用

#### Scenario: 只读弹窗与无删除入口

- **WHEN** 用户从 ManageUser 打开容器详情，或查看用户容器卡片
- **THEN** 弹窗保持只读且无长期控件；卡片不出现容器删除按钮或删除 API 调用；“删除用户”仍只删除用户

#### Scenario: 解冻失败恢复

- **WHEN** 解冻失败、被拒绝或超时
- **THEN** 清除该容器的 pending、操作 loading 与消息 loading，显示具体错误并重读权威状态；不写入猜测的 `paused`/`online`
