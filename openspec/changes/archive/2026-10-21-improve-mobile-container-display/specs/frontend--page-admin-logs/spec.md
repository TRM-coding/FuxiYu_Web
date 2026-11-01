# Spec Delta

## ADDED Requirements

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
