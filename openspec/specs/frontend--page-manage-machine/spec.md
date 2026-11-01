# ManageMachine

## Purpose

定义机器卡片、权限名单、容器子列表及管理操作。机器实时利用率和容器权限、限额等业务变化参与静默刷新比较，已有轮询保留当前子列表页码与筛选，不将资源范围和方法权限混合。

## Requirements

### Requirement: ManageMachine 页面入口与身份

页面 SHALL 通过 `/admin/machines` 装配。现有身份与权限约束为：页面检查 bypass_auth_entity；解冻和部分高风险按钮另用细分权限。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `ManageMachine` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: ManageMachine 主流程

页面 SHALL 保持以下已实现的交互及数据职责：注册只发送最小信任锚 machine_name/machine_ip/description/可选 port；机器检索防抖；容器卡片、心跳及删除确认由当前页面协调。

#### Scenario: 机器上仍有容器时尝试删除机器

- **WHEN** 机器上仍有容器时尝试删除机器
- **THEN** 确认面板展示计数并禁用删除；最终由后端阻止删除带容器机器

### Requirement: ManageMachine 构建归属

页面 SHALL 通过路由表的按需加载组织参加 Vite 构建：`src/routes/index.jsx` 对页面组件与共同布局（`MainLayout`、`AdminLayout`）使用 `React.lazy` 动态导入，并在 route element 层以既有 `Suspense` 提供页面级加载反馈（仅描述当前实现，不新增加载 UI）；`LoginLayout`、路由骨架与 React 运行时随入口静态加载。`LoginLayout` 内的 `ModelViewer` 亦按需加载，three 相关代码经 `vite.config.js` 的 `manualChunks` 按依赖方向 addons → WebGL → core 分为 `vendor-three-core`、`vendor-three-webgl`、`vendor-three-addons`，均不进入入口 chunk。上述页面与 `ModelViewer` 不再与同路由树代码共同进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`src/utils/requestManager.jsx` 与 `src/utils/validateCmdArg.jsx` 统一为静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属构建验收观测，记入本轮验收报告，不作为本规格固化的历史指标

### Requirement: ManageMachine 静默刷新覆盖展示与权限字段

机器刷新指纹 SHALL 覆盖名称、地址、类型、状态、维护标记及实时 CPU、内存、GPU 利用率，不能只依赖采集时间。容器子列表指纹 SHALL 覆盖当前参与展示和操作判断的账号角色、绑定、长期配额及磁盘限额等业务字段。比较 SHALL 区分业务变化与语义无关的集合顺序变化；已有静默轮询 SHALL 保留当前子列表页码与筛选。

#### Scenario: 机器展示或容器权限单独变化
- **WHEN** 机器展示字段、实时利用率或容器角色改变，采集时间与其余状态未改变
- **THEN** 刷新提交新状态，显示与操作入口按新值判断，静默轮询不重置当前页

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

## Source references

## Source references

- [src/pages/ManageMachine.jsx](../../../src/pages/ManageMachine.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../api/machine_api`。
- 页面直接依赖：`../api/container_api`。
- 页面直接依赖：`../utils/showErrorModal`。
- 页面直接依赖：`../utils/authHelpers`。
- 页面直接依赖：`../api/user_api`。
- 页面直接依赖：`../contexts/PermissionContext`。
- 页面直接依赖：`../utils/requestManager`。
- 页面直接依赖：`../utils/useAutoHideTopBar`。
- 页面直接依赖：`../utils/containerActions`。
- 页面直接依赖：`../utils/listRefresh`。
- 页面直接依赖：`../utils/heartbeat`。
- 页面直接依赖：`../utils/timeFormat`。
- [src/test/](../../../src/test/)、[vite.config.js](../../../vite.config.js)：当前测试记录见 `openspec/changes/archive/2026-10-18-align-container-action-eligibility-and-recovery/` 与仓库验证日志；本规格不固化测试文件/用例数字；页面测试是否直接覆盖见 Global QUESTIONS。
