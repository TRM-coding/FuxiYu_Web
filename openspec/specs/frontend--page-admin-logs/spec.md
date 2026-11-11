# AdminLogs

## Purpose

操作审计列表、周视图统计、筛选与详情。本文件是 Web chester-next 6c5f04d2a7f1 在 2026-10-11 的代码逆向基线，按页面或已有页面组件组织路由、权限、API 与状态行为。已知交互和接口差异统一见 [Global QUESTIONS](../../../../FuxiYu_Global/QUESTIONS.md)，此记录不表示对应问题已经修复。

## Requirements

### Requirement: AdminLogs 页面入口与身份

页面 SHALL 通过 `/admin/logs` 装配。现有身份与权限约束为：PermissionContext + 管理布局；页面权限沿用操作员判据。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `AdminLogs` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: AdminLogs 主流程

页面 SHALL 保持以下已实现的交互及数据职责：按 operation/target_type/operator/success 和时段查询；展示服务补齐的目标名，展开结构化 diff 与失败信息。

#### Scenario: 切换周或过滤条件

- **WHEN** 切换周或过滤条件
- **THEN** 请求日志列表及统计，并按响应渲染当前结果；旧请求覆盖的风险登记在 QUESTIONS

### Requirement: AdminLogs 构建归属

页面 SHALL 通过路由表的按需加载组织参加 Vite 构建：`src/routes/index.jsx` 对页面组件与共同布局（`MainLayout`、`AdminLayout`）使用 `React.lazy` 动态导入，并在 route element 层以既有 `Suspense` 提供页面级加载反馈（仅描述当前实现，不新增加载 UI）；`LoginLayout`、路由骨架与 React 运行时随入口静态加载。`LoginLayout` 内的 `ModelViewer` 亦按需加载，three 相关代码经 `vite.config.js` 的 `manualChunks` 按依赖方向 addons → WebGL → core 分为 `vendor-three-core`、`vendor-three-webgl`、`vendor-three-addons`，均不进入入口 chunk。上述页面与 `ModelViewer` 不再与同路由树代码共同进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`src/utils/requestManager.jsx` 与 `src/utils/validateCmdArg.jsx` 统一为静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属构建验收观测，记入本轮验收报告，不作为本规格固化的历史指标

### Requirement: AdminLogs 查询结果必须匹配当前周次、筛选与分页

页面 SHALL 为周次、筛选和分页请求使用请求序号或 AbortController；响应应用前 MUST 确认该请求仍属于当前查询上下文。旧响应 SHALL 只释放自身资源，MUST NOT 覆盖当前日志列表、总数或分页状态。

#### Scenario: 当前上下文响应应用

- **GIVEN** 用户停留在当前周次与筛选
- **WHEN** 当前查询返回
- **THEN** 日志列表、总数和分页状态按该响应更新

#### Scenario: 旧周次响应晚到

- **GIVEN** 用户从本周切到上一周
- **WHEN** 本周请求晚于上一周请求返回
- **THEN** 本周响应被丢弃，列表仍显示上一周结果，旧请求的控制器或序号资源被释放

#### Scenario: 旧筛选或旧页响应晚到

- **GIVEN** 用户快速切换筛选或翻页
- **WHEN** 旧筛选或旧页请求晚于新请求返回
- **THEN** 旧响应不得改写当前列表、当前页或总数，分页入口仍对应当前查询

### Requirement: AdminLogs 移动端日志详情与 320px 收缩

AdminLogs SHALL 在视口宽度不超过 768px 时继续通过共享 `TableComponent` 渲染日志卡片，并为每张可展开卡片提供可操作的“展开详情/收起详情”入口。AdminLogs 不传 `expandable.expandedRowKeys`，由 `TableComponent` 的内部展开状态驱动；展开只影响本地展示，MUST NOT 改变既有日志查询字段、分页参数、权限或请求次数。桌面大于 768px 时 SHALL 继续由 antd 表格展开图标管理详情。`AdminLogs.css` SHALL 让 `.als-side` 在窄屏可收缩（`min-width: min(300px, 100%)` 或等价规则），并保留 `.als-wall-wrap` 的内部横向滚动；MUST NOT 通过整页横向滚动、隐藏统计区或重做日志页规避。320px、390px、768px 下 MUST NOT 出现整页横向溢出，统计区、筛选、日志卡片、展开详情与分页 SHALL 保持可见。

#### Scenario: 390px 与 768px 展开日志详情

- **GIVEN** 当前页日志包含结构化 diff、失败原因或原始 JSON，AdminLogs 未传 `expandable.expandedRowKeys`
- **WHEN** 用户在 390px 或 768px 卡片中点击“展开详情”，随后点击“收起详情”
- **THEN** 展开后卡片内显示日志详情，按钮变为“收起详情”且 `aria-expanded=true`；收起后详情隐藏、`aria-expanded=false`；两次操作都不额外请求日志列表或统计

#### Scenario: 320px 统计区收缩且详情不溢出

- **GIVEN** 当前视口为 320px，日志列表和统计区已渲染
- **WHEN** 页面显示统计卡、筛选栏、日志卡片与分页，并展开一条日志详情
- **THEN** `document.documentElement.scrollWidth` 不超过 322px，`.als-side` 不再把内容撑到 300px 固定宽度；统计区、筛选、日志卡片与分页仍可见，`.als-wall-wrap` 保留自身内部横向滚动，展开详情后页面仍不横向溢出

#### Scenario: 1440px 桌面保持 antd 展开与分页

- **GIVEN** 同一份日志在 1440px 桌面视口打开
- **WHEN** 用户点击 antd 表格行的展开图标并翻到第二页
- **THEN** 桌面仍显示 antd 表格、展开图标与日志详情，不出现移动卡片内置按钮；分页仍按既有服务端参数请求第二页，统计区、详情与请求次数不变

#### Scenario: 长日志详情在 320px 内可读

- **GIVEN** 日志详情包含无空格长 JSON、长 URL 或较长 diff 行，视口为 320px
- **WHEN** 用户展开该日志详情
- **THEN** 详情文本在卡片内换行或按既有滚动容器展示，不撑破卡片；页面仍无横向溢出，“收起详情”按钮可见且可操作

### Requirement: 目标类别复选多选按 OR 组合

管理员操作日志的目标类别选择 SHALL 使用复选框，支持同时选择多个类别，类别之间按 OR 组合。页面 SHALL 提供“全选”按钮；MUST NOT 提供“清空”按钮。零个类别被勾选时 SHALL 视为“全部类别”，不得视为无结果。

#### Scenario: 勾选多个类别

- **GIVEN** 目标类别初始未勾选
- **WHEN** 用户勾选“机器”和“容器”
- **THEN** 列表请求只按机器或容器目标过滤，其他筛选条件仍以 AND 组合

#### Scenario: 全选

- **GIVEN** 目标类别仅勾选了部分类别
- **WHEN** 用户点击“全选”
- **THEN** 所有目标类别均被勾选，请求不携带 `target_type`、查询包含全部类别（包括未知历史类型），页面不出现“清空”按钮

#### Scenario: 零项视为全部

- **GIVEN** 用户逐项取消所有目标类别复选框
- **WHEN** 列表查询发起
- **THEN** 请求不携带 `target_type`，列表按全部目标类别查询，而不是返回空结果

### Requirement: 日志 GET 使用重复 target_type 参数

日志列表请求 SHALL 将多个目标类别以重复 `target_type` 查询参数传给 Ctrl；空选择 MUST NOT 传 `target_type`。仅有一个目标类别时 SHALL 继续发送单值参数，保持现有单值调用兼容。

#### Scenario: 多值请求

- **GIVEN** 已勾选“机器”“容器”“用户”三个类别
- **WHEN** 页面请求日志列表
- **THEN** 查询串包含三个重复的 `target_type` 参数，值分别为 `machine`、`container`、`user`

#### Scenario: 单值兼容

- **GIVEN** 仅勾选“镜像”
- **WHEN** 页面请求日志列表
- **THEN** 查询串只包含一个 `target_type=image`，与既有单值调用等价

#### Scenario: 空选择不传参数

- **GIVEN** 目标类别零项被勾选
- **WHEN** 页面请求日志列表
- **THEN** 查询串不包含 `target_type`，其他筛选参数照常发送

### Requirement: 其他筛选、统计与分页语义保持

目标类别多选 SHALL NOT 改变操作类型、操作人、仅失败、时间范围与目标类别之间的 AND 组合。统计接口参数与最近 52 周窗口 SHALL 保持现有语义；分页 SHALL 继续使用当前页码和每页数量，并以响应 `total_pages` 更新分页入口。

#### Scenario: 多选目标与其他筛选并存

- **GIVEN** 用户同时选择操作类型、操作人、仅失败、时间范围和多个目标类别
- **WHEN** 发起日志查询
- **THEN** 请求同时包含这些 AND 条件，目标类别内部仍为 OR

#### Scenario: 分页与统计不受目标多选影响

- **GIVEN** 当前位于第 2 页且已勾选多个目标类别
- **WHEN** 查询返回新的 `total_pages`
- **THEN** 列表按当前页请求并更新分页入口，统计请求仍使用既有时间窗口和参数

## Source references

- [src/pages/AdminLogs.jsx](../../../src/pages/AdminLogs.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../utils/showErrorModal`。
- 页面直接依赖：`../utils/authHelpers`。
- 页面直接依赖：`../api/user_api`。
- 页面直接依赖：`../contexts/PermissionContext`。
- 页面直接依赖：`../api/operation_log_api`。
- 页面直接依赖：`../api/machine_api`。
- 页面直接依赖：`../api/container_api`。
- [src/test/](../../../src/test/)、[vite.config.js](../../../vite.config.js)：本次既有 21 个测试文件、123 个测试通过；页面测试是否直接覆盖见 Global QUESTIONS。

