## Context

当前 `TableComponent` 只从 `children`/`Table.Column` 派生移动端卡片列；桌面分支把 `props` 原样交给 antd `Table`。AdminLogs 与 ManageUserInTable 使用 children，AdminLogs 传入未受控的 `expandable.expandedRowRender`，ManageUserInTable 使用 `expandable.expandedRowKeys`/`expandable.onExpandedRowsChange` 并设置 `showExpandColumn: false`，在操作列自行放展开按钮。DeletedContainers 目前直接使用 antd `Table` + `columns` 数组，移动端没有卡片布局；列宽 210/230 与固定单元格在 390px 下把页面撑到 508px，Mount 复制按钮被相邻 `td` 遮挡。`DetailPages.css` 的 `.machine-detail-layout, .container-detail-layout` 使用 `repeat(auto-fit, minmax(460px, 1fr))`，390px 下容器详情与机器详情页面宽度为 468px。AdminLogs 的 `.als-side` 固定 `min-width: 300px` 在 320px 下把整页撑到 353px；同一组基线还确认 AdminLogs 在 320/390/768px 没有可用的移动端日志详情按钮。

修改前真实浏览器证据见 此前的 390px 渲染审计（390px R1、R2）与 `E:/AI/Fuxi_audit_artifacts/FuxiYu_Web/mobile-display/baseline/results.json`（SHA256 `30a607c017fb97edec40ae3967b13e6c52c85e5506aa3e54ecbc7cabbcee5d3d`，320/390/768/1440 基线）。外置 `mobile-render.mjs` 由父代理独占维护，本 change 不修改它，也不把它写成仓库内可执行测试依赖；规格只记录需要核验的外部证据。现有 `src/test/setup.js` 把 `matchMedia` 默认 mock 为桌面；组件测试需要显式模拟移动视口。`openspec/specs/frontend--page-*-/test-plan.md` 中三份未提交变动是既有浏览器审计记录，本变更不重写它们。

本变更只处理 Web 展示和共享组件契约；不触碰 Ctrl/Node、数据库、业务权限、统计协议或分页协议。

## Goals / Non-Goals

**Goals:**

- 让 DeletedContainers 桌面表格保持现有 antd 行为，移动端复用 `TableComponent` 卡片列表，且两者共用同一 `columns`、`expandedRowRender` 和分页回调。
- 让 DeletedContainers 移动端详情可主动展开/收起，桌面展开状态与移动端共享同一受控 keys；不改变详情字段与请求。
- 让 Mount 复制在 320px/390px 下通过真实点击写入完整路径；所有用量状态和既有确认/轮询语义不变。
- 让 `TableComponent` 向后兼容 `columns` 数组与 children/`Table.Column`，并同时支持受控与未受控移动端展开；AdminLogs 不传 keys 也能展开日志详情，ManageUserInTable 的 `showExpandColumn:false` 自定义展开不变。
- 用共享 `DetailPages.css` 的最小列宽修正同时修复容器详情和机器详情，320/390/768px 无整页横向溢出，长内容可读。
- 让 AdminLogs 在 320px 通过 `.als-side` 收缩消除 353px 整页溢出，同时保留 `.als-wall-wrap` 内部横向滚动、日志卡片/详情与分页。
- 用真实 Chromium 验证 DeletedContainers、ContainerDetailPage、MachineDetailPage 与 AdminLogs，并覆盖 320/390/768/1440 视口。

**Non-Goals:**

- 不修改后端、数据库、业务权限、统计字段、分页协议或 Node 调用。
- 不处理 ManageMachine 缺测被显示为 0% 的独立问题。
- 不重做 AdminLogs 日志页、统计协议或筛选逻辑；只补共享展开能力和 `.als-side` 的最小宽度收缩。
- 不采纳 S3 的“DeletedContainers 改回未受控桌面展开”可选重设计；继续保留页面级受控 `expandable.expandedRowKeys`，避免额外状态迁移和旧 key 清理改动。
- 不做全站响应式重构，不替换 antd，不新增表格滚动条作为窄屏方案。
- 不创建 `docs/audits`，不 commit/push/archive，不修改三份既有 test-plan 审计记录，不修改父代理独占的外置 `mobile-render.mjs`。

## Decisions

### 1. `TableComponent` 同时接受 `columns` 与 children，桌面分支保持透传

移动端列来源按以下顺序解析：`columns` 数组非空时直接使用；否则从 children/`Table.Column` 派生既有最小列对象（`key`、`title`、`dataIndex`、`render`）。桌面分支不重新构造列：有 `columns` 时以 `columns` 渲染 antd `Table`，否则保留 children 渲染。这样 DeletedContainers 的 `width`、`ellipsis`、`className` 等桌面配置不会丢失，AdminLogs 的 children 列解析也不变。

替代方案是把 DeletedContainers 改成 `Table.Column` children。该方案要搬移七个 render、失去列数组的 `width`/`ellipsis` 原位配置，并让页面与共享组件的耦合更深，因此不采用。另一个方案是为移动端单独写一张卡片列表，会复制列定义、状态渲染和操作按钮，违背复用目标，也不采用。

### 2. 移动端展开支持受控与未受控双模式

展开契约统一放在 `expandable` 内：`expandable.expandedRowKeys` 为受控 keys，`expandable.onExpandedRowsChange` 为更新回调，`expandable.onExpand` 为行展开回调；不引入顶层同名 props。

- 受控模式：`expandable.expandedRowKeys` 是数组时，以它为唯一状态源。存在 `expandable.expandedRowRender`、`expandable.showExpandColumn !== false`、`expandable.rowExpandable(record) !== false` 且 `expandable.onExpandedRowsChange` 是函数时，卡片显示“展开详情/收起详情”按钮；按钮设置 `aria-expanded`，按 `rowKey` 增删 key，调用 `expandable.onExpandedRowsChange(nextKeys)`，并在提供 `expandable.onExpand` 时调用 `expandable.onExpand(expanded, record)`。缺少 callback 时不显示无效按钮，受控模式不写内部状态。
- 未受控模式：没有 `expandable.expandedRowKeys` 数组时，组件用内部展开 key 集合；显示同一按钮，按 `rowKey` 增删 key，并在提供 `expandable.onExpand` 时调用。若调用方同时提供 `expandable.onExpandedRowsChange`，以内部 nextKeys 通知，但不把它当作受控源。内部模式不覆盖调用方传入的受控 keys。
- `expandable.rowExpandable` 未提供时视为可展开，只有显式返回 false 才不显示按钮；`expandable.showExpandColumn: false` 不渲染内置按钮，ManageUserInTable 继续使用自己的操作列按钮，受控 keys 命中时仍渲染详情。
- DeletedContainers 继续保留页面级受控 `expandable.expandedRowKeys`（不采纳 S3 的可选重设计）：桌面 antd 展开图标与移动按钮读写同一份 keys，跨断点状态一致，改动范围保持稳定。
- AdminLogs 不传 keys，因此自动走内部模式，390px/768px 移动端可以展开日志详情；桌面仍由 antd 展开图标管理，请求次数和分页不变。

替代方案是只支持受控展开（原方案），但会让 AdminLogs 的移动端详情继续不可达，已由审查 C1 否定；另一条路是把 AdminLogs 改为页面级受控，会新增页面状态并扩大改动。双模式把状态差异收口在组件内，同时保留 DeletedContainers 的受控设计，因此采用。

### 3. 移动端卡片复用既有结构与断点，不引入第二套渲染语义

移动端仍以 `(max-width: 768px)` 为界，768px 属于卡片，769px 起属于桌面表格。卡片继续使用 `app-table-mobile-*`、`is-action`、`is-stats`、`is-compact` 等既有类，不新增列元数据；DeletedContainers 的七列在移动端以全宽字段呈现，操作列仍按 `is-action` 获得整行操作区。列的桌面 `width`/`ellipsis` 不参与卡片尺寸计算。

移动端空态优先渲染调用方传入的 `locale.emptyText`（DeletedContainers 的“暂无已删除容器”），没有时回退到既有简单空图标；分页入口独立于空态保留。分页切片保留现有 `shouldSliceClient` 行为：只有 `dataSource.length > currentPageSize` 时才切本地页；本变更不新增服务端分页之外的切片，也不因切片发起请求。加载态保留：DeletedContainers 继续用页面外层 `Spin`，其他调用方继续使用 `TableComponent` 自己的 `loading`。

替代方案是保留 antd 表格并加 `scroll={{ x: ... }}`。它会把 508px 问题变成表格内横向滚动，Mount 仍需在窄表格里点击，且与 AdminLogs 的卡片成功案例不一致，因此不采用。

### 4. Mount 复制直接复用 `CopyChip`，只补移动端宽度约束

Mount 继续使用 `CopyChip` 的 `size="meta"`、`tone="soft"`，不修改剪贴板实现。移动卡片内给 `.deleted-mount-chip` 增加 `max-width: 100%`/可点击的整行宽度约束，长路径由组件自身的 `title` 与复制值保留完整内容；复制失败继续走组件既有“复制失败”反馈。卡片没有相邻 `td`，因此不会重现 508px 表格中的遮挡。

替代方案是把 Mount 改成普通文本 + 独立按钮，或缩短显示值后单独存全路径。前者增加一套复制逻辑，后者容易出现显示值与复制值不一致，均不采用。

### 5. 详情页使用连续的 `min()` 收缩，而不是只加一个手机断点

将共享规则改为 `repeat(auto-fit, minmax(min(460px, 100%), 1fr))`。视口足够宽时列宽仍以 460px 为下限，桌面布局不变；视口小于 460px 时列宽退化为 100%，不再把页面撑到 468px。再补三组收缩边界：`.detail-card` 设 `min-width: 0`，`.detail-title h1` 允许 `overflow-wrap: anywhere`，`.detail-metric`/`.detail-metric-value`/`.detail-metric-extra`/`.detail-runtime-item` 允许换行。这样 320px 下长标题、运行指标和 bind 路径都在卡片内收敛。

替代方案是只在 `@media (max-width: 560px)` 写 `grid-template-columns: 1fr`。它只能覆盖一个断点，且 560～768px 之间仍可能被 460px 最小列宽影响；`min()` 连续生效，改动更小且桌面无回归，因此采用。共享规则同时服务 MachineDetailPage，机器详情的长标题与指标换行复用同一组边界。

### 6. AdminLogs `.als-side` 使用连续最小宽度收缩

AdminLogs 320px 的 353px 来自 `AdminLogs.css` 的 `.als-side { min-width: 300px; }`，不是卡片或分页造成。最小修复是在 `AdminLogs.css` 将 `.als-side` 的固定最小宽度改为 `min-width: min(300px, 100%)`；桌面仍保持 300px 下限，320px 时退化为 `.als-layout` 内容宽度的 100%，允许 `flex-wrap` 正常换行。`.als-wall-wrap` 继续保留自己的 `overflow-x: auto` 内部横向滚动，不用整页横向滚动、`overflow: hidden` 或重做日志页规避；日志筛选、统计、请求次数和分页协议都不变。

替代方案是在 `@media (max-width: 360px)` 将 `min-width` 设为 0。它只覆盖一个断点，且与 390px 的既有 300px 行为不连续；`min()` 连续收缩、桌面无回归，因此采用。

### 7. 真实浏览器验证按页面选择表格/卡片选择器

外置 `mobile-render.mjs` 由父代理独占维护，本 change 不修改它，也不把它写成仓库内可执行测试依赖；验证使用本地 `dist` + 浏览器请求拦截，不连接后端，结果与外置脚本的哈希记录在 `E:/AI/Fuxi_audit_artifacts/FuxiYu_Web/mobile-display/`。验收按父代理维护的脚本执行，其移动端选择器以 `.app-table-mobile-card` 与“展开详情/收起详情”按钮为准，桌面仍用表格选择器。

DeletedContainers 与 ContainerDetailPage 覆盖 320/390/768/1440，MachineDetailPage 覆盖 320/390/768/1440，AdminLogs 覆盖 320/390/768/1440：其中 AdminLogs 需要确认 320px `scrollWidth <= 322`、统计区/筛选/卡片/分页可见、展开详情后仍不溢出，1440px 保持 antd 表格展开、分页与详情不变。每个视口记录 `document.documentElement.scrollWidth`、越界元素、真实点击后的剪贴板内容、展开/收起状态、用量状态和分页结果。旧的 390px 与 320px 基线证据只作为缺陷基线，不作为修改后通过证据；jsdom 的 `scrollWidth` 不作为宽度通过证据。`TableComponent` 的直接组件测试负责覆盖 `columns`/children、空列/空数据、受控/未受控、`showExpandColumn:false`、`rowExpandable` 缺省/false 与分页回调；页面测试只做集成回归，不替代宽度浏览器证据。

## Risks / Trade-offs

- [共享组件改动影响 AdminLogs 或 ManageUserInTable] → 受控和未受控分支分别约束：AdminLogs 使用内部状态获得详情按钮，ManageUser 的 `showExpandColumn:false` 不渲染内置按钮；用 AdminLogs 390/768、320 与 1440 回归，以及 ManageUser 受控场景覆盖。
- [未受控内部状态与受控 keys 混淆] → 只有 `expandable.expandedRowKeys` 是数组时才进入受控模式；内部模式不覆盖 `expandable.expandedRowKeys`，受控模式不写内部状态；缺少 `expandable.onExpandedRowsChange` 时不渲染无效按钮。
- [DeletedContainers 从非受控展开改为受控状态，可能改变桌面展开行为] → 同步传 `expandable.expandedRowKeys` 与 `expandable.onExpandedRowsChange`；现有 `.ant-table-row-expand-icon` 测试继续覆盖；展开不发起请求、不重置轮询。
- [AdminLogs 320px 仍被统计侧栏撑宽] → 在 `AdminLogs.css` 使用 `.als-side { min-width: min(300px, 100%); }`，保留 `.als-wall-wrap` 内部滚动；浏览器断言 320px `scrollWidth <= 322`，展开详情后复测。
- [七列卡片在手机上很长] → 保留全部字段，不隐藏低优先级列；卡片纵向滚动由页面承担；不通过删列换取宽度。
- [移动端分页器在 320px 可能换行或挤压] → 复用现有分页配置，仅补分页容器可换行/居中 CSS；以 320px 实测为准，不改变页码和总数语义。
- [长路径视觉上仍被截断] → `CopyChip` 的 `title` 与复制值保存完整路径；320px 真实点击断言剪贴板内容，不把可视截断当作复制值截断。
- [320px 机器限额编辑区可能过于紧凑] → 先以共享网格与换行修正验证；若实测仍越界，只在 `DetailPages.css` 内追加窄屏换行规则，保持桌面和 390px 现有布局；这是已授权的最小实现选择，不作为产品决策。
- [`min()` 在旧浏览器不支持] → 项目基线为现代 Chromium/Vite 构建，现有 CSS 已使用 Grid、`auto-fit`、`clamp` 等现代特性；不引入新浏览器矩阵，也不为旧浏览器写降级分支。
- [外置审计脚本由父代理独占，不能在本 change 修改] → 不修改 `mobile-render.mjs`；按父代理维护的脚本与结果记录外部证据，临时证据只放 `E:/AI/Fuxi_audit_artifacts/FuxiYu_Web/mobile-display/`，不进入仓库测试依赖。
- [既有三份 test-plan 未提交审计记录被误改] → 本变更不编辑那三份文件；实现阶段只改本 change 的 test-plan 与相关组件测试。

## Migration Plan

1. 先扩展 `TableComponent` 的列解析、受控/未受控移动端展开、空态与分页边界，保持 children 列源和桌面行为不变。
2. 再把 DeletedContainers 切换到共享组件，继续使用页面级受控 `expandable.expandedRowKeys`，保留 `columns`、分页、确认和用量 hook。
3. 补 `AdminLogs.css` 的 `.als-side` 窄屏最小宽度收缩，回归 AdminLogs 移动详情、分页与桌面 antd 展开。
4. 最后改 `DetailPages.css` 的共享网格与换行边界，回归 ContainerDetailPage 和 MachineDetailPage。
5. 运行受影响的 Vitest、全量 `npm test`、`npm run lint` 与 `npm run build`；由父代理维护的外置脚本在 320/390/768/1440 真实 Chromium 中重跑，不修改脚本，只记录结果与外置证据。
6. 回滚只涉及上述前端文件与测试；无数据迁移、无服务端回滚、无归档或远程操作。

## Open Questions

- 无阻塞性开放问题。S3 的“DeletedContainers 改回未受控桌面展开”不采纳，保持现有页面级受控设计；外置 `mobile-render.mjs` 由父代理独占，本 change 不修改。320px 机器限额编辑区如实测仍越界，按 Risks 中已授权的 `DetailPages.css` 最小规则处理，无需额外产品决策。
