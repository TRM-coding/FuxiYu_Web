# ManageUser

## Purpose

定义用户管理、权限组替换、容器关联与子列表展示。用户统计和容器角色、限额等业务字段参与静默刷新，轮询保留当前分页上下文，组存在性与自锁规则仍由后端校验。

## Requirements

### Requirement: ManageUser 页面入口与身份

页面 SHALL 通过 `/admin/users` 装配。现有身份与权限约束为：页面检查 bypass_auth_entity；组编辑使用 rbac:manage，容器管理使用 container:manage。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `ManageUser` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: ManageUser 主流程

页面 SHALL 保持以下已实现的交互及数据职责：读取用户 brief 和展开容器；支持重置密码、删除用户、绑定权限组；容器角色变更和解绑经对应服务 API。

#### Scenario: 为用户替换权限组

- **WHEN** 为用户替换权限组
- **THEN** 提交去重的 group_ids，由后端校验组存在与自锁保护；有效权限由服务端重新计算

### Requirement: 移除容器关联失败保留守卫原因

ManageUser 解除用户与容器关联失败 SHALL 保留 Ctrl 返回的 `status`、`route`、`error_reason` 与安全 `message`，按容器成员路由显示中文守卫原因。离线、冻结、异常、处理中、状态未知及宿主机不可用 MUST NOT 被本地拼接 message 吞掉，也不得只剩通用 400/409/503 提示；页面 MUST NOT 放宽成员权限或绕过 Ctrl 状态守卫。

#### Scenario: 离线移除关联

- **GIVEN** `remove_collaborator` 返回 HTTP 400、`error_reason=container_offline` 与英文守卫 message
- **WHEN** 用户确认解除关联
- **THEN** 弹窗显示“容器未在线，无法移除协作者”；不显示英文守卫原文、`未收录的错误原因`，也不只剩“请求无效”的 400 提示

### Requirement: ManageUser 构建归属

页面 SHALL 通过路由表的按需加载组织参加 Vite 构建：`src/routes/index.jsx` 对页面组件与共同布局（`MainLayout`、`AdminLayout`）使用 `React.lazy` 动态导入，并在 route element 层以既有 `Suspense` 提供页面级加载反馈（仅描述当前实现，不新增加载 UI）；`LoginLayout`、路由骨架与 React 运行时随入口静态加载。`LoginLayout` 内的 `ModelViewer` 亦按需加载，three 相关代码经 `vite.config.js` 的 `manualChunks` 按依赖方向 addons → WebGL → core 分为 `vendor-three-core`、`vendor-three-webgl`、`vendor-three-addons`，均不进入入口 chunk。上述页面与 `ModelViewer` 不再与同路由树代码共同进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`src/utils/requestManager.jsx` 与 `src/utils/validateCmdArg.jsx` 统一为静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属构建验收观测，记入本轮验收报告，不作为本规格固化的历史指标

### Requirement: ManageUser 静默刷新覆盖身份与容器操作字段

用户列表及容器子列表的刷新指纹 SHALL 覆盖实际用于身份展示、用户资源统计、角色权限、磁盘与分配限额和状态操作的字段。单独业务字段变化 SHALL 可触发更新，语义无关的集合顺序变化 SHALL 保持比较稳定；静默轮询 SHALL 维持当前子列表页码与筛选。

#### Scenario: 用户或关联容器业务字段变化
- **WHEN** 用户展示字段、资源统计或关联容器的角色、限额改变，而其他指纹字段不变
- **THEN** 列表接收新状态，权限和资源展示不沿用旧值，静默轮询保留当前页

### Requirement: ManageUser 容器动作使用共享结果且不新增删除入口

ManageUser 展开卡片（生产用户路径）上的 start、stop、restart、unpause、long_term_enable 与 long_term_disable SHALL 消费同一共享纯函数结果，使用当前操作员真实权限、容器角色、只读上下文和既有状态/配额/磁盘字段。页面 SHALL NOT 新增容器删除入口，也不因“删除用户”流程复用容器删除资格；本变更不新增入口。解冻失败清除 loading/pending 并重读。

#### Scenario: 与其他页面同上下文一致

- **GIVEN** 同一容器、同一状态和同一权限上下文分别出现在 ManageUser 与 Home/ManageMachine/ContainerDetailPage
- **WHEN** 各页面解析启停、解冻与长期动作
- **THEN** 启停、解冻与长期的 visible/enabled/reason 结论一致，不因用户页另写条件而漂移

#### Scenario: 操作员与容器角色差异

- **GIVEN** 当前操作员仅持 `container:manage`，或为容器 ROOT/ADMIN/COLLABORATOR，或权限上下文缺失
- **WHEN** 页面解析动作资格
- **THEN** 各动作按既有方法/资源矩阵可见或禁用；缺失角色不得当作 ROOT，页面不得因属于管理页就放行长期

#### Scenario: 长期使用既有字段

- **GIVEN** 非长期容器 `long_term_container_can_enable` 为 false 或磁盘达到既有 100% 展示阈值；或长期容器实际状态为 `paused`；或已恢复 `online`/`offline` 但冻结行仍存在
- **WHEN** 页面解析长期动作
- **THEN** 前两者分别禁用启用/取消；后者允许取消长期，不因冻结行残留永久禁用

#### Scenario: 卡片无删除入口与既有只读组件契约

- **GIVEN** 查看 ManageUser 用户容器卡片
- **WHEN** 检查卡片操作区与旧组件引用
- **THEN** 卡片不出现容器删除按钮或删除 API 调用；“删除用户”仍只删除用户；页面不保留旧只读组件契约或父回调断言

#### Scenario: 解冻失败恢复

- **GIVEN** 解冻请求失败、被拒绝或超时
- **WHEN** 页面处理失败
- **THEN** 清除该容器的 pending、操作 loading 与消息 loading，显示具体错误并重读权威状态；不写入猜测的 `paused`/`online`

### Requirement: ManageUser 容器行只走专用详情路由并删除不可达弹窗

用户管理页的容器行标题 SHALL 保留现有按钮语义，阻止行选择冒泡后导航到 `/index/containers/:containerId`；MUST NOT 新增用户管理页的详情入口。不可达的旧详情弹窗链 SHALL 删除，包括 `ContainerDetailModal` 的导入与渲染、`openContainerDetail`、`detailModalVisible`/`setDetailModalVisible` 及只服务于该链的状态；仍被其他操作使用的用户/容器数据保留。

#### Scenario: 点击容器行进入专用详情页

- **GIVEN** 用户管理页展开某个用户并展示其容器行
- **WHEN** 点击容器标题
- **THEN** 路由进入 `/index/containers/<containerId>`，用户行不会被选中，旧详情弹窗不渲染

#### Scenario: 源码不再包含旧详情弹窗链

- **GIVEN** 检查 `src/pages/ManageUser.jsx`
- **WHEN** 搜索旧弹窗导入、渲染和回调符号
- **THEN** 不再存在 `ContainerDetailModal`、`openContainerDetail` 或 `detailModalVisible` 的引用

#### Scenario: 不新增用户管理页详情入口

- **GIVEN** 完成清理后的用户管理页
- **WHEN** 检查容器行操作区与卡片按钮
- **THEN** 只有现有容器标题导航入口，没有新增“详情”按钮或弹窗入口

### Requirement: 用户管理编辑毕业年份不可清空

用户管理页的展开行编辑器和卡片编辑入口 SHALL 保持毕业年份不允许清空。清空已有年份时 MUST 给出明确中文反馈并阻止保存，MUST NOT 向更新接口提交 `graduation_year: null`、空串或缺失字段；同时修改其他字段也不得绕过该阻止。

#### Scenario: 展开行清空年份后保存

- **GIVEN** 管理员展开一个已有毕业年份的用户并清空年份输入
- **WHEN** 尝试保存
- **THEN** 页面显示明确提示且不打开确认或提交更新，用户年份不变

#### Scenario: 卡片编辑同时改用户名并清空年份

- **GIVEN** 管理员在卡片编辑中修改用户名，同时把已有毕业年份清空
- **WHEN** 尝试保存
- **THEN** 整个保存被阻止并显示年份反馈，不提交只含用户名的部分更新

#### Scenario: 有效年份修改

- **GIVEN** 管理员把毕业年份改为 1900 到 2100 之间的整数
- **WHEN** 确认保存且请求成功
- **THEN** 更新请求携带数值年份，列表按服务端结果显示新值

## Source references

## Source references

- [src/pages/ManageUser.jsx](../../../src/pages/ManageUser.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../utils/showErrorModal`。
- 页面直接依赖：`../utils/authHelpers`。
- 页面直接依赖：`../api/user_api`。
- 页面直接依赖：`../api/rbac_api`。
- 页面直接依赖：`../contexts/PermissionContext`。
- 页面直接依赖：`../api/container_api`。
- 页面直接依赖：`../utils/heartbeat`。
- 页面直接依赖：`../utils/useAutoHideTopBar`。
- 页面直接依赖：`../utils/containerActions`。
- 页面直接依赖：`../utils/timeFormat`。
- 页面直接依赖：`../utils/detailFormat`。
- 页面直接依赖：`../utils/listRefresh`。
- [src/test/](../../../src/test/)、[vite.config.js](../../../vite.config.js)：当前测试记录见 `openspec/changes/archive/2026-10-18-align-container-action-eligibility-and-recovery/` 与仓库验证日志；本规格不固化测试文件/用例数字；页面测试是否直接覆盖见 Global QUESTIONS。
