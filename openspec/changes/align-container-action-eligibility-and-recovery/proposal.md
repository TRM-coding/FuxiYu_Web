# Proposal

## Why

同一容器的动作展示仍分散在各页：删除按钮在 ContainerDetailPage 硬编码为仅 `building`/`creating` 禁用，在 ContainerDetailModal/Home/ManageMachine 又分别按 ROOT 或 `forceSystemAdmin` 推导；长期勾选混用旧配额、磁盘百分比和本地状态；start/stop/restart/unpause 也由各页各写一套判断。同一容器在不同视图、不同角色下可能得出相反结论。Ctrl 侧的待执行变更已决定长期资格改为基于既有数据的静态守卫，Web 因此只需消费既有字段，不需要新的资格响应对象或预检接口。

## What Changes

- 把 `src/utils/containerActions.js` 收敛为唯一的纯函数动作策略层，覆盖 `start`、`stop`、`restart`、`unpause`、`delete`、`long_term_enable`、`long_term_disable` 七个动作，统一产出 `visible`、`enabled`/`disabled`、`reason`、`loading`、`pending`。页面只保留布局、确认弹窗和 API 回调。
- 保留既有权限/角色矩阵：start/stop/restart/delete 使用 `container:operation` 加 ADMIN 级资源角色或资源通配；长期使用 `container:operation` 加 ROOT 级资源角色或资源通配；unpause 使用 `container:manage`；`readOnly` 为 true 或缺省/非法时禁用全部写动作。缺失权限、未知角色、`undefined` 一律 fail closed。
- 保留既有状态矩阵：删除允许 `online/offline/paused/failed`，拒绝 `building/creating/starting/stopping/restarting`、主机离线/维护、采集未知；本地 `pausing/unpausing` 和空状态按保守态禁用。start 只在 `offline`；stop/restart 只在 `online`；unpause 只在 `paused`。删除不复用长期资格，`failed` 仍可删。
- 长期动作只使用既有响应字段：严格布尔 `is_long_term`、`long_term_container_can_enable`（配额）、`long_term_container_blocked_user_ids`/`long_term_container_remaining_by_user`（展示）、`disk_usage_percent` 或 `disk_usage.usage_percent`（磁盘展示）、`effective_status`。启用长期在配额已满或磁盘达到既有 100% 展示阈值时禁用；取消长期在实际状态为 `paused`（冻结）时禁用，`freeze_state` 行残留但状态已 `online`/`offline` 时不得永久禁用。不新增资格对象、API 字段或 preflight 请求，后端 409/403 仍是最终裁决。
- 所有页面使用同一策略结果：Home、ManageMachine、ManageUser、ContainerDetailPage；ManageUserInTable 只消费父组件传入的长期结果；ContainerDetailModal 不新增长期控件，也不自行推导长期/删除资格。
- 所有写动作在真正提交 API 前用最新容器、权限/角色、长期字段和 pending 重新解析；有确认框的，在最终确认时重解析。结果禁用/隐藏则不发请求并更新原因，不复用打开弹窗时的快照。
- 解冻受理只提示“解冻指令已发送”；失败、拒绝或超时清除该容器的 loading/pending，显示具体错误并重读权威快照，不以 catch 伪造 `paused`/`online`。权威 `online` 结束 pending，真实 `failed` 保持 `failed`。
- 恢复长期快照沿用既有恢复与 image 内容选择流程；不新增超限确认框、token、恢复宽限倒计时或前端状态机。恢复宽限的后端承载不在 Web 变更内，Web 不据此派生新资格。
- 不修改 Ctrl/Node 实现，不声称修复 Q67/Q70；Q71 边界保持为 inode 仅由 Node 校正路径，业务只看 `bind_mount_path`。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `frontend--page-home`：卡片、详情弹窗和删除/解冻/长期动作统一消费共享纯函数结果。
- `frontend--page-manage-machine`：机器卡片与详情弹窗统一消费共享结果，删除不再靠 `forceSystemAdmin` 伪造权限。
- `frontend--page-manage-user`：用户容器卡片消费共享结果，不新增容器删除入口，只读弹窗不出现长期控件。
- `frontend--page-manage-user-in-table`：长期列只消费父组件共享结果，不自行重算配额/磁盘/冻结。
- `frontend--page-container-detail-page`：详情页七个动作与弹窗边界统一到同一策略。

## Impact

涉及 `src/utils/containerActions.js`、`src/pages/Home.jsx`、`src/pages/ManageMachine.jsx`、`src/pages/ManageUser.jsx`、`src/pages/ManageUserInTable.jsx`、`src/pages/ContainerDetailPage.jsx`、`src/components/ContainerDetailModal.jsx` 及相关测试。

不修改 Ctrl/Node、正式 `openspec/specs/`、archive 或应用后端；不新增响应字段、接口、库表变更或持久化结构。旧响应缺少长期字段时长期动作安全禁用，删除/启停不因长期字段缺失被连带禁用。
