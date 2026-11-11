## Why

真实 Chromium 基线审计显示：390px 下已删除容器页被表格列宽撑到 508px，Mount 复制控件被相邻单元格遮挡，普通点击无法复制；容器详情与机器详情共享的 `minmax(460px, 1fr)` 在窄屏把页面撑到 468px，运行指标右侧超出视口；AdminLogs 在 320px 因 `.als-side` 的 300px 固定最小宽度被撑到 353px，且 320/390/768px 的移动端日志详情没有可操作入口。操作日志页的移动卡片列表已经证明 `TableComponent` 可以在窄屏稳定呈现列表信息，本变更复用该路径，并让共享组件同时支持受控与未受控展开、让 AdminLogs 的统计侧栏在窄屏收缩。

## What Changes

- 已删除容器页改用共享 `TableComponent`：桌面继续渲染现有 antd 表格与 `columns` 数组，移动端（≤768px）渲染卡片列表；同一 `columns` 定义、同一 `expandedRowRender` 详情。
- 已删除容器页改为受控展开（`expandable.expandedRowKeys` + `expandable.onExpandedRowsChange`），移动端由共享组件提供明确的“展开详情/收起详情”按钮；桌面仍使用 antd 展开图标，展开内容不变。
- `TableComponent` 向后兼容地支持 `columns` 数组，同时保留现有 `children`/`Table.Column` 用法；移动端展开同时支持受控与未受控：`expandable.expandedRowKeys` 数组为受控状态源，缺少 `expandable.onExpandedRowsChange` 时不显示无效按钮；未提供 keys 时使用组件内部状态并显示同一“展开详情/收起详情”按钮；`expandable.rowExpandable` 未提供视为可展开，`expandable.showExpandColumn: false` 不渲染内置按钮。DeletedContainers 继续保留受控展开，AdminLogs 的未受控用法在移动端自动获得详情入口。
- AdminLogs 不传 `expandable.expandedRowKeys`，由共享组件内部状态驱动 390px/768px 日志详情展开/收起；`AdminLogs.css` 让 `.als-side` 在窄屏可收缩（`min-width: min(300px, 100%)` 或等价规则），保留 `.als-wall-wrap` 的内部横向滚动，320px 不再被固定的 300px 最小宽度撑到 353px。
- 移动端卡片沿用现有 Mount `CopyChip`（`meta`/`soft`），完整路径同时保留在 `title` 与复制值中；320px 下真实点击可完整复制。
- 所有逻辑用量状态（加载、测量中、成功 0 B、有/无上限、失败、缺项、已清理、无挂载）继续按原状态机展示；分页、恢复/清理确认、当前页刷新和 120 次轮询取消语义不变。
- `DetailPages.css` 将共享网格最小列宽改为窄屏可收缩的 `minmax(min(460px, 100%), 1fr)`，并补齐长标题、运行指标与卡片内容的换行/收缩边界；桌面列宽与信息层级不变。
- 使用至少 320px、390px、768px 和 1440px 桌面真实浏览器验证已删除列表、容器详情、机器详情与 AdminLogs，并回归共享 `TableComponent` 的受控/未受控展开、分页与详情。

## Capabilities

### New Capabilities

- `frontend--table-component`: 共享表格组件在桌面表格与移动卡片之间的列定义、children 兼容、受控与未受控展开、分页与空态契约，以及移动端不产生整页横向溢出的交互边界。

### Modified Capabilities

- `frontend--page-deleted-containers`: 移动端列表改用共享卡片布局，增加详情主动展开/收起与可真实点击的 Mount 复制；保留桌面表格、用量状态、分页、确认流程与轮询语义。
- `frontend--page-container-detail-page`: 窄屏共享网格可收缩，长标题、bind 路径与运行指标在 320/390/768px 可读且不横向溢出；桌面展示不变。
- `frontend--page-machine-detail-page`: 共享 `DetailPages.css` 的窄屏最小列宽修正适用于机器详情，长标题与指标可读且不横向溢出；桌面展示不变。
- `frontend--page-admin-logs`: 移动端日志卡片可主动展开/收起日志详情；320px 通过 `.als-side` 最小宽度收缩消除整页横向溢出，保留统计区内部滚动、分页与桌面 antd 展开行为。

## Impact

- 前端文件：`src/components/TableComponent.jsx`、`src/components/TableComponent.css`、`src/pages/DeletedContainers.jsx`、`src/pages/DeletedContainers.css`、`src/pages/AdminLogs.css`、`src/pages/DetailPages.css`，以及对应组件测试。
- 回归范围：`AdminLogs` 的 children/`Table.Column` 列表、移动端详情、320px 统计区收缩与分页；`ManageUserInTable` 的 `showExpandColumn:false` 自定义展开；`ContainerDetailPage`/`MachineDetailPage` 的桌面布局。
- 不修改 Ctrl/Node 接口、数据库、业务权限、统计协议或分页协议；不新增请求字段。
- 不处理 ManageMachine 缺测被显示为 0% 的独立问题，也不修改后端/数据库/权限。
- 修改前基线证据：旧报告 此前的 390px 渲染审计（390px R1/R2）与 `E:/AI/Fuxi_audit_artifacts/FuxiYu_Web/mobile-display/baseline/results.json`（SHA256 `30a607c017fb97edec40ae3967b13e6c52c85e5506aa3e54ecbc7cabbcee5d3d`，记录 508/468/353px 与日志详情不可达）。这些是外置基线证据，不进入仓库测试依赖；修改后的临时证据统一放 `E:/AI/Fuxi_audit_artifacts/FuxiYu_Web/mobile-display/`。
