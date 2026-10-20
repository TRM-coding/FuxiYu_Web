# 规格变更：机器管理页详情入口与解冻刷新

覆盖问题：Q28、Q35、Q69。

## ADDED Requirements

### Requirement: ManageMachine 容器详情统一使用专用详情页

机器页的容器标题及任何详情入口 SHALL 导航到现有 `/index/containers/:containerId` 专用页；MUST NOT 再打开旧 `ContainerDetailModal`。旧详情弹窗链 SHALL 删除，包括 `ContainerDetailModal` 的导入与渲染、`openContainerDetail`、`returnToDetail`、`detailModalVisible`/`setDetailModalVisible` 及只服务于该链的回调与状态。机器卡片没有删除按钮，本变更 MUST NOT 新增卡片删除入口；只清理旧详情弹窗来源的不可达删除确认回跳链，实际删除 SHALL 沿现有容器详情页的既有入口执行。

#### Scenario: 点击容器标题进入专用详情页

- **GIVEN** 机器页展示一个容器卡片
- **WHEN** 用户点击容器标题
- **THEN** 路由进入 `/index/containers/<containerId>`，页面不渲染 `ContainerDetailModal`

#### Scenario: 删除确认取消不打开旧详情弹窗

- **GIVEN** 旧实现中删除确认只由不可达的旧详情弹窗打开，机器卡片没有删除按钮
- **WHEN** 清理旧详情弹窗链
- **THEN** 不新增卡片删除入口，旧弹窗来源的删除确认回跳不再存在，实际删除仍沿既有容器详情页

#### Scenario: 源码不再引用旧弹窗链

- **GIVEN** 检查 `src/pages/ManageMachine.jsx`
- **WHEN** 搜索旧弹窗导入、渲染和回调符号
- **THEN** 不再存在 `ContainerDetailModal`、`openContainerDetail`、`returnToDetail` 或 `detailModalVisible` 的引用

### Requirement: ManageMachine 解冻后保留当前页与筛选并防止旧结果回拉

仅解冻操作成功后，页面 SHALL 使用操作开始时的页码、搜索词和机器筛选重新加载同一容器子列表；仅当响应总数证明当前页越界时才回退到有效页。操作途中用户切换页码或筛选时，旧解冻触发的刷新结果 MUST NOT 覆盖或拉回当前页。解冻失败 SHALL 保留当前页与筛选并展示失败原因。

#### Scenario: 第二页解冻后仍在第二页

- **GIVEN** 用户在机器容器子列表第二页解冻一个容器
- **WHEN** 解冻受理成功并触发刷新
- **THEN** 刷新请求仍使用第二页对应的 `page_number` 与当前搜索词，列表保持第二页

#### Scenario: 操作期间切页后旧刷新不回拉

- **GIVEN** 解冻请求仍在途，用户已切到另一页或修改筛选
- **WHEN** 解冻成功后的旧刷新返回
- **THEN** 旧刷新结果被丢弃，列表保持用户切换后的页码与筛选，不回到第一页

#### Scenario: 解冻失败保留当前页

- **GIVEN** 用户在后续页发起解冻
- **WHEN** 解冻接口失败
- **THEN** 页面展示失败原因，仍停留在原页码与筛选，不把列表重置为第一页

## MODIFIED Requirements

### Requirement: ManageMachine 使用真实权限与共享动作结果

ManageMachine 现有卡片（生产用户路径）的 start、stop、restart、unpause、delete、long_term_enable 与 long_term_disable SHALL 消费同一共享纯函数结果。机器卡片没有删除按钮，本变更 MUST NOT 新增卡片删除入口；删除资格 SHALL 只作为共享动作工具的纯计算结果断言，实际删除 SHALL 沿现有容器详情页的既有入口执行。删除按 `online/offline/paused/failed` 允许、`building/creating/starting/stopping/restarting` 与主机/采集未知拒绝；MUST NOT 用 `forceSystemAdmin`/`isRoot` 替代真实 `container:operation` 加 ADMIN 级资源角色。长期使用既有字段，不新增长期控件；解冻失败清除 loading/pending 并重读权威快照。

#### Scenario: 卡片与既有组件契约结论一致

- **GIVEN** 同一机器容器由卡片渲染，共享动作工具给出删除、启停、解冻和长期结论
- **WHEN** 卡片读取共享结果
- **THEN** 删除、启停、解冻和长期结论由同一策略给出，不出现卡片与共享策略结论漂移

#### Scenario: 失败容器仍可删除

- **GIVEN** 容器状态为 `failed`，当前操作员具备 `container:operation` 与 ADMIN 级资源角色
- **WHEN** 共享动作工具计算删除资格
- **THEN** 删除资格为可见且可执行；实际删除从现有容器详情页入口执行，机器卡片不新增删除按钮；长期资格拒绝 `failed` 只影响长期动作，不连带禁用删除资格

#### Scenario: 过渡或主机异常不可删除

- **GIVEN** 容器状态为 `building/creating/starting/stopping/restarting`，或主机离线/维护、采集未知、本地 `pausing/unpausing`
- **WHEN** 共享动作工具计算删除资格
- **THEN** 删除资格为禁用并显示对应原因，不发送删除请求

#### Scenario: 不用系统管理员标志伪造删除

- **GIVEN** 当前操作员缺少删除方法权限或 ADMIN 级资源角色，但页面具有“系统管理员”相关标志
- **WHEN** 共享动作工具计算删除资格
- **THEN** 删除资格为不可执行，后端 403 按真实错误展示；人员管理能力不得与删除资格复用

#### Scenario: 长期与解冻使用既有字段

- **GIVEN** 非长期容器配额已满或磁盘达到现有 100% 展示阈值；或长期容器已恢复 `online`/`offline` 但冻结行仍存在；或解冻失败/超时
- **WHEN** 页面解析长期与解冻动作
- **THEN** 前两者分别禁用启用/允许取消；解冻失败清除 loading/pending、显示错误并重读，不伪造终态
