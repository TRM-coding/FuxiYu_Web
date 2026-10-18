# Spec Delta

## ADDED Requirements

### Requirement: ManageMachine 使用真实权限与共享动作结果

ManageMachine 卡片与容器详情弹窗的 start、stop、restart、unpause、delete、long_term_enable 与 long_term_disable SHALL 消费同一共享纯函数结果。删除按 `online/offline/paused/failed` 允许、`building/creating/starting/stopping/restarting` 与主机/采集未知拒绝；弹窗 MUST NOT 用 `forceSystemAdmin`/`isRoot` 替代真实 `container:operation` 加 ADMIN 级资源角色。长期使用既有字段，弹窗不新增长期控件；解冻失败清除 loading/pending 并重读权威快照。

#### Scenario: 卡片与弹窗结论一致

- **WHEN** 同一机器容器同时显示在卡片与详情弹窗
- **THEN** 删除、启停、解冻和长期结论由同一策略给出，不出现弹窗可点而卡片禁用或相反

#### Scenario: 失败容器仍可删除

- **WHEN** 容器状态为 `failed`，当前操作员具备 `container:operation` 与 ADMIN 级资源角色
- **THEN** 删除可见且可执行；长期资格拒绝 `failed` 只影响长期动作，不连带禁用删除

#### Scenario: 过渡或主机异常不可删除

- **WHEN** 容器状态为 `building/creating/starting/stopping/restarting`，或主机离线/维护、采集未知、本地 `pausing/unpausing`
- **THEN** 删除禁用并显示对应原因，不发送删除请求

#### Scenario: 不用系统管理员标志伪造删除

- **WHEN** 当前操作员缺少删除方法权限或 ADMIN 级资源角色，但页面具有“系统管理员”相关标志
- **THEN** 弹窗仍不显示可执行删除，后端 403 按真实错误展示；人员管理能力不得与删除资格复用

#### Scenario: 长期与解冻使用既有字段

- **WHEN** 非长期容器配额已满或磁盘达到现有 100% 展示阈值；或长期容器已恢复 `online`/`offline` 但冻结行仍存在；或解冻失败/超时
- **THEN** 前两者分别禁用启用/允许取消；解冻失败清除 loading/pending、显示错误并重读，不伪造终态
