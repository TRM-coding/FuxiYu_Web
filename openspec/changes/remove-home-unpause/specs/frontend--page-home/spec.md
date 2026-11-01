## MODIFIED Requirements

### Requirement: Home 容器动作使用共享纯函数结果

Home 的 start、stop、restart、delete、long_term_enable 与 long_term_disable SHALL 使用 `containerActions.js` 同一纯函数结果渲染 `visible`、`enabled`、`reason`、`loading`、`pending`；权限、角色、只读或状态缺失时 MUST 保守禁用。长期启用读取既有 `long_term_container_can_enable` 与 `disk_usage_percent`/`disk_usage.usage_percent`；长期取消按实际 `effective_status` 判断冻结，`freeze_state` 行残留不得永久禁用。页面只保留布局、确认和 API 回调，后端仍是最终裁决。

#### Scenario: 卡片与详情弹窗同源

- **WHEN** 同一容器、同一状态、同一权限上下文分别渲染 Home 卡片与详情弹窗
- **THEN** 两个入口共有的删除、启停与长期结论一致；首页卡片和首页详情弹窗均不提供解冻按钮，独立容器详情页仍按权限展示解冻

#### Scenario: 长期超限或冻结残留

- **WHEN** 非长期容器的 `long_term_container_can_enable` 为 false，或磁盘用量达到既有 100% 展示阈值；或长期容器已恢复 `online`/`offline` 但 `freeze_state` 行仍存在
- **THEN** 前者禁用启用并显示既有配额/磁盘原因；后者允许取消长期，不因冻结行残留永久禁用

#### Scenario: 权限或只读上下文缺失

- **WHEN** 调用方缺少 `container:operation`/`container:root`/`container:manage`，或 `readOnly` 缺失、非 boolean、为 true
- **THEN** 对应动作禁用并给出原因；缺失权限不得默认为可操作，删除也不得发出请求

#### Scenario: 提交前重解析

- **WHEN** 用户已打开确认框或已勾选长期，提交前容器状态、权限或 pending 已变化
- **THEN** 页面用最新上下文重新解析；结果禁用/隐藏则不调用 API，并更新原因

#### Scenario: 解冻失败不伪造终态

- **WHEN** 其他入口的解冻请求失败、被拒绝或超时，首页读取权威状态
- **THEN** 首页按权威快照展示状态，不根据首页不存在的解冻请求推测 `paused` 或 `online`
