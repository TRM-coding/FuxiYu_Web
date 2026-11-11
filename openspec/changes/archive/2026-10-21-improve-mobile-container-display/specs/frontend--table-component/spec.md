# Spec Delta

## ADDED Requirements

### Requirement: TableComponent 桌面与既有列定义兼容

`TableComponent` SHALL 在视口宽度大于 768px 时继续渲染 antd `Table`。调用方 SHALL 可以继续使用 `children`/`Table.Column`，也可以直接传入 `columns` 数组；两种列定义在桌面 MUST 产生等价的可读列。既有 `rowKey`、`loading`、`pagination`、`expandable`、`onRow`、`rowClassName` 等属性 SHALL 原样传递，调用方 `className` SHALL 继续与组件既有类名合并；桌面列上的 `width`、`ellipsis`、`fixed`、`align` 等既有配置 MUST NOT 被组件改写。组件 MUST NOT 因列定义或断点切换发起新的数据请求。

#### Scenario: AdminLogs 的 children 用法保持桌面表格

- **GIVEN** AdminLogs 以 `children`/`Table.Column` 提供时间、操作人、操作、目标、结果五列，并传入未受控的 `expandable.expandedRowRender`
- **WHEN** 在 1440px 视口渲染
- **THEN** 页面仍出现 antd 表格和五个列头，行数据按原 render 输出，展开图标仍由 antd 提供，不出现移动卡片容器

#### Scenario: 已删除容器页的 columns 数组生成桌面表格

- **GIVEN** 已删除容器页以 `columns` 数组提供容器、机器、Mount、逻辑用量、删除时间、状态、操作七列，并保留 Mount 列的 `ellipsis` 与固定宽度列
- **WHEN** 在 1440px 视口渲染
- **THEN** 表格列头与顺序与数组一致，固定宽度和省略配置仍由 antd 表格生效，不出现重复列或把列数组渲染成空表

#### Scenario: 列定义为空或数据为空

- **GIVEN** 调用方没有提供任何 `Table.Column`，或 `columns` 为空数组，且 `dataSource` 为空
- **WHEN** 分别渲染桌面和移动视口
- **THEN** 组件不抛异常，显示既有空态；传入的 `pagination` 仍可渲染，桌面不出现伪造列，移动端不出现空白卡片

### Requirement: TableComponent 移动端卡片列渲染

`TableComponent` SHALL 在视口宽度不超过 768px 时以卡片列表替代表格。每条 `dataSource` 记录 SHALL 生成一张卡片；列 SHALL 同时支持 `columns` 数组和 `children`/`Table.Column` 派生列，标签使用列 `title`，值使用列 `render(value, record, index)` 或原始值。既有操作列、统计列、紧凑两列和行点击行为 SHALL 保持；列的 `width`、`ellipsis`、`fixed` MUST NOT 把卡片或页面撑宽。卡片 MUST NOT 新增服务端分页之外的切片；既有 `dataSource.length > currentPageSize` 时的本地切片行为保持现状，且任何切片都 MUST NOT 发起请求。

#### Scenario: 390px 已删除列表按全部列渲染卡片

- **GIVEN** 已删除记录包含容器、机器、Mount、逻辑用量、删除时间、状态和操作字段
- **WHEN** 在 390px 视口渲染
- **THEN** 每条记录显示为一张卡片，七个列标题与对应值均可见，Mount 复制控件与恢复/清理按钮位于卡片内，页面不出现 antd 表格

#### Scenario: 320px 长路径和长名称不撑破页面

- **GIVEN** 容器名、Mount 路径或详情文本包含无空格的长串，当前视口为 320px
- **WHEN** 卡片渲染并显示完整值
- **THEN** 卡片内容在自身宽度内换行或截断，`document.documentElement.scrollWidth` 不超过视口宽度加 2px，复制控件和操作按钮仍可点击

#### Scenario: 本地多页数据只切当前本地页

- **GIVEN** 调用方一次传入 25 条本地记录，`pagination.current=2`、`pagination.pageSize=10`，没有服务端分页请求
- **WHEN** 在 390px 视口渲染并切换到第一页
- **THEN** 第二页只显示第 11～20 条，第一页只显示第 1～10 条；分页总数为 25，组件不发起数据请求，也不把 25 条全部放进当前卡片列表

#### Scenario: AdminLogs 在移动端保持既有字段与分页

- **GIVEN** AdminLogs 以 children 提供五列，当前视口为 390px
- **WHEN** 列表数据返回
- **THEN** 五列以卡片字段呈现，时间、操作人、操作、目标、结果文案不变，分页入口仍按原分页配置显示，不新增额外数据请求；展开按钮行为由“未受控的 AdminLogs 移动端展开日志详情”场景覆盖

#### Scenario: 空数据保留空态与分页

- **GIVEN** 当前页 `dataSource` 为空，但分页参数仍有总数和有效页码
- **WHEN** 在 320px 或 390px 渲染
- **THEN** 显示空态占位和分页入口，不渲染空白卡片，不触发自动翻页或重复请求

### Requirement: TableComponent 移动端受控展开

当 `expandable.expandedRowKeys` 是数组时，`TableComponent` SHALL 进入受控模式并以该数组为唯一状态源。存在 `expandable.expandedRowRender`、`expandable.showExpandColumn !== false`、`expandable.rowExpandable` 未提供或返回非 false，且 `expandable.onExpandedRowsChange` 是函数时，移动卡片 SHALL 显示带 `aria-expanded` 的“展开详情/收起详情”按钮，并按 `rowKey` 增删 key 后调用受控回调。缺少 callback 时 MUST NOT 显示无效按钮；受控模式 MUST NOT 写内部展开状态；`showExpandColumn:false` 不渲染内置按钮。

#### Scenario: 受控的 DeletedContainers 移动端展开与收起

- **GIVEN** 已删除容器行包含 `deleted_id`，父级传入 `expandable.expandedRowKeys=[]`、`expandable.onExpandedRowsChange` 和 `expandable.onExpand`
- **WHEN** 用户在 390px 卡片中点击“展开详情”，随后点击“收起详情”
- **THEN** 第一次点击把该 `deleted_id` 加入受控 keys、调用 `onExpandedRowsChange([deleted_id])` 与 `onExpand(true, record)`，按钮变为“收起详情”且 `aria-expanded=true`，卡片内显示镜像/资源/端口等详情；第二次点击移除 key、调用 `onExpandedRowsChange([])` 与 `onExpand(false, record)`、详情隐藏且 `aria-expanded=false`，列表和用量请求次数不变，组件不写内部展开状态

#### Scenario: 自定义展开列不重复出现按钮

- **GIVEN** ManageUserInTable 传入 `expandable.expandedRowKeys`、`expandable.onExpandedRowsChange`、`showExpandColumn: false`，并在操作列自行提供展开按钮
- **WHEN** 在 390px 视口渲染
- **THEN** 组件不渲染第二个内置展开按钮；受控 keys 命中时仍渲染 `expandedRowRender` 内容，原有操作按钮仍可切换

#### Scenario: 缺少受控更新回调

- **GIVEN** `expandable.expandedRowKeys` 是数组，但没有 `expandable.onExpandedRowsChange`
- **WHEN** 移动卡片渲染
- **THEN** 不显示无法生效的展开按钮，不抛异常，受控 keys 不被组件改写，其他行与分页不受影响

### Requirement: TableComponent 移动端未受控展开

当 `expandable.expandedRowKeys` 不是数组时，`TableComponent` SHALL 进入未受控模式并维护内部展开 key 集合。存在 `expandable.expandedRowRender` 且 `expandable.showExpandColumn !== false` 时，每张移动卡片 SHALL 显示同一“展开详情/收起详情”按钮；按钮 SHALL 设置 `aria-expanded`，按 `rowKey` 增删内部 key，并在提供 `expandable.onExpand` 时调用 `onExpand(expanded, record)`。若提供 `expandable.onExpandedRowsChange`，组件 SHALL 以内部 nextKeys 通知，但 MUST NOT 把它当作受控源或覆盖调用方 keys。`expandable.rowExpandable` 未提供时视为可展开，只有显式返回 false 才不显示该行按钮。

#### Scenario: 未受控的 AdminLogs 移动端展开日志详情

- **GIVEN** AdminLogs 只传 `expandable.expandedRowRender`，没有 `expandable.expandedRowKeys`
- **WHEN** 在 390px 和 768px 视口点击日志卡片中的“展开详情”
- **THEN** 组件用内部状态显示“收起详情”和日志详情，`aria-expanded=true`；再次点击收起，`aria-expanded=false`，列表字段、分页和日志请求次数不变；1440px 仍由 antd 展开图标管理详情

#### Scenario: rowExpandable 未提供视为可展开

- **GIVEN** 调用方没有提供 `expandable.rowExpandable`
- **WHEN** 移动卡片渲染
- **THEN** 组件按可展开处理并显示可生效的“展开详情/收起详情”按钮，点击后按内部或受控模式更新详情，不抛 `rowExpandable is not a function` 异常

#### Scenario: rowExpandable 显式 false 禁用该行

- **GIVEN** 调用方提供 `expandable.rowExpandable(record)` 且对某条记录显式返回 false
- **WHEN** 移动卡片渲染
- **THEN** 该行不显示展开按钮，不抛异常，其他行仍按各自可展开状态显示，分页不受影响

### Requirement: TableComponent 移动端分页、空态与加载

`TableComponent` 的移动端分页 SHALL 使用调用方传入的 `pagination.current`、`pageSize`、`total`、`showSizeChanger` 和 `onChange`；翻页或改变页大小 SHALL 只把事件交给调用方，组件 MUST NOT 自行请求或改写服务端分页总数。320px 下分页入口 SHALL 保持可见且不得导致整页横向溢出。加载态、空态和分页入口 SHALL 各自保留；空态存在时 MUST NOT 被分页入口替代。调用方提供 `locale.emptyText` 时，移动端空态 SHALL 保留该描述文案，而不是只显示无描述的空图标。

#### Scenario: 已删除列表在手机翻到第二页

- **GIVEN** 当前页为第一页、总数为 21、页大小为 20，分页回调由 DeletedContainers 提供
- **WHEN** 用户在 390px 卡片列表点击第二页
- **THEN** 组件调用 `onChange(2, 20)`，已删除页按第二页重新请求并只渲染第二页返回的记录，组件不自行请求第一页之外的数据

#### Scenario: 空页仍保留描述与翻页入口

- **GIVEN** 当前页记录为空，但 `total` 表明仍有有效页，调用方传入 `locale.emptyText`
- **WHEN** 在 390px 渲染
- **THEN** 显示既有“暂无已删除容器”描述和分页入口，不显示空白卡片，不自动跳到第一页或反复请求

#### Scenario: 320px 分页入口不撑宽

- **GIVEN** 总数为 21、页大小为 20，当前视口为 320px
- **WHEN** 分页入口与卡片一起渲染
- **THEN** 分页页码和翻页按钮仍可见，`document.documentElement.scrollWidth` 不超过 322px，点击第二页仍调用 `onChange(2, 20)`

#### Scenario: 加载中保持既有加载态

- **GIVEN** `loading=true` 且当前数据尚未返回
- **WHEN** 在 320px 或 390px 渲染
- **THEN** 组件继续显示既有 `Spin` 加载态，加载结束后按结果显示卡片或空态；期间不发起额外请求，也不因扩展列定义改变原有加载行为
