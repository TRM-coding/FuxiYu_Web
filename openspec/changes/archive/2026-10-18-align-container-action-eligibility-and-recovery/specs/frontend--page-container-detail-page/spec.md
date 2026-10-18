# Spec Delta

## ADDED Requirements

### Requirement: ContainerDetailPage 容器动作使用共享结果

ContainerDetailPage 的 start、stop、restart、unpause、delete、long_term_enable 与 long_term_disable SHALL 使用同一共享纯函数结果，输入当前用户真实方法权限、容器角色、只读上下文与权威状态。删除按 `online/offline/paused/failed` 允许、过渡/主机/未知拒绝；长期使用既有配额、磁盘百分比与状态字段；动作确认使用 `ContainerActionConfirmModal`，该页不渲染 `ContainerDetailModal`，确认弹窗只负责确认呈现，不另建动作资格判据。失败时清除 loading/pending 并重读，不伪造终态。

#### Scenario: 与其他页面同上下文一致

- **WHEN** 同一容器、同一状态和同一权限上下文分别出现在 ContainerDetailPage 与 Home/ManageMachine/ManageUser
- **THEN** 各动作的 visible/enabled/reason 结论一致，不因详情页另写条件而漂移

#### Scenario: 失败容器可删除、过渡态不可删除

- **WHEN** 容器状态为 `failed` 且操作员具备删除权限；或状态为 `building/creating/starting/stopping/restarting`、主机离线/维护、采集未知、本地 `pausing/unpausing`
- **THEN** 前者删除可见可执行；后者删除禁用并显示原因，不发送删除请求

#### Scenario: 长期配额、磁盘与冻结残留

- **WHEN** 非长期容器 `long_term_container_can_enable` 为 false，或磁盘达到既有 100% 展示阈值；或长期容器实际状态为 `paused`；或已恢复 `online`/`offline` 但冻结行仍存在
- **THEN** 前两者分别禁用启用/取消；后者允许取消长期，不因冻结行残留永久禁用

#### Scenario: 提交前重解析

- **WHEN** 用户已打开删除/解冻确认框或已勾选长期，提交前容器状态、权限或 pending 已变化
- **THEN** 页面用最新上下文重新解析；结果禁用/隐藏则不调用 API，并更新原因或关闭确认框

#### Scenario: 解冻或启动失败不覆盖权威终态

- **WHEN** 解冻失败/超时，或解冻后的启动被权威验证为 `failed`
- **THEN** 清除 loading/pending、显示具体错误并重读；权威 `online` 才结束 pending，真实 `failed` 保持 `failed`，不写猜测的 `paused`/`online`

#### Scenario: 动作确认弹窗不另建资格

- **WHEN** ContainerDetailPage 的 `ContainerActionConfirmModal` 收到带长期/冻结字段的容器
- **THEN** 该动作确认弹窗不出现长期控件，不自行用 `freeze_state`、旧配额或本地状态推导长期/删除资格；解除关联仍走独立既有流程
