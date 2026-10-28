# frontend--table-component Test Plan

Spec: [spec.md](spec.md)

## Current Mapping

### Requirement: TableComponent 桌面与既有列定义兼容

#### Scenario: AdminLogs 的 children 用法保持桌面表格

- Test/check:
  - [X] `src/test/TableComponent.test.jsx::tc_table_01_desktop_children`
  - [X] `src/test/AdminLogs.test.jsx::展开行显示前→后对比（状态值翻译）`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_admin_logs_desktop_1440_children_expand_page2`
- Assertion scope: 既有组件测试在 1440 断言 antd `table`、children 渲染、`.app-table` 存在且无移动卡片；AdminLogs 测试断言 antd `Expand row` 与展开详情。规划测试在 1440 渲染真实 `AdminLogs`，断言五列头「时间/操作人/操作/目标/结果」、行数据按 render 输出、antd 展开图标、无 `.app-table-mobile-card` 与移动详情按钮。
- Coverage note: 规划测试，未创建；既有组件测试只用 3 列且未传 expandable，AdminLogs 测试未断言表头与无移动卡片。

#### Scenario: 已删除容器页的 columns 数组生成桌面表格

- Test/check:
  - [X] `src/test/DeletedContainersDisplay.test.jsx::test_image_moves_to_expanded_detail_and_mount_uses_compact_copy_chip`
  - [X] `src/test/DeletedContainersMobile.test.jsx::tc_dc_06_desktop_expand_shared_state`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_table_deleted_columns_desktop`
- Assertion scope: 既有 Display 测试断言 7 个列头（`arrayContaining`）、Mount 复制 chip、恢复/清理按钮、展开详情显示镜像；`tc_dc_06` 在 1440 断言 antd 展开图标、详情与无移动卡片。规划测试断言精确 7 列顺序、Mount 单元格 `ant-table-cell-ellipsis`、逻辑用量/操作列宽 210/230 在 `colgroup` 或表头样式中的体现，且无重复列或空表。
- Coverage note: 规划测试，未创建；既有测试未断言省略与列宽配置。

#### Scenario: 列定义为空或数据为空

- Test/check:
  - [X] `src/test/TableComponent.test.jsx::tc_table_03_empty_columns_data`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_table_empty_columns_data_both`
- Assertion scope: 既有测试断言桌面 `columns=[]`/`dataSource=[]` 仍渲染 table、无移动卡片、保留分页。规划测试在 1440 与 390 分别用无列定义且空数据渲染，断言桌面无伪造列且显示既有空态（`.ant-empty` 或「暂无数据」）、移动端 `.app-table-mobile-empty` 与分页入口存在、无 `.app-table-mobile-card`。
- Coverage note: 规划测试，未创建；既有测试只覆盖桌面 `columns=[]` 且未断言桌面空态文案。

### Requirement: TableComponent 移动端卡片列渲染

#### Scenario: 390px 已删除列表按全部列渲染卡片

- Test/check:
  - [X] `src/test/DeletedContainersMobile.test.jsx::tc_dc_01_mobile_390_seven_columns`
  - [X] `src/test/DeletedContainersMobile.test.jsx::tc_dc_03_mobile_320_long_actions`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_table_deleted_mobile_values`
- Assertion scope: 既有测试在 390 断言 1 张卡片、无 table、7 个列标题；320 测试断言长名称下复制、恢复、清理 mount 按钮位于卡片内。规划测试在 390 断言同一卡片包含容器名、机器名/IP、Mount 路径、逻辑用量值、删除时间、状态与恢复/清理按钮。
- Coverage note: 规划测试，未创建；既有测试覆盖标题与操作控件，未逐项断言对应值。

#### Scenario: 320px 长路径和长名称不撑破页面

- Test/check:
  - [X] `src/test/TableComponent.test.jsx::tc_table_05_mobile_320_long_content`
  - [X] `src/test/DeletedContainersMobile.test.jsx::tc_dc_03_mobile_320_long_actions`
  - [X] `src/test/DeletedContainersMobile.test.jsx::tc_dc_09_mobile_320_mount_copy`
  - [ ] `npm run dev`
- Assertion scope: 既有测试在 320 断言卡片与长名称/长路径文本、复制/恢复/清理按钮存在，且 `tc_dc_09` 点击复制写入剪贴板。人工浏览器检查在 Chromium 320px 打开 `https://localhost:5173/#/admin/deleted-containers`（路径 `/admin/deleted-containers`），使用现有 Dev/测试数据中一条含长名称/长路径的已删除记录；测量 `document.documentElement.scrollWidth` 与 `window.innerWidth`，断言 `scrollWidth <= 322`，卡片右边界不超过视口，复制控件与恢复/清理按钮仍可点击。
- Coverage note: `tc_table_05` 只断言 CSS `overflow-wrap` 源字符串，按本轮规则不作为布局证据；jsdom 不计算 `scrollWidth`，像素结论只来自人工浏览器。复制点击由 `tc_dc_09` 覆盖；恢复/清理按钮在 320 仅断言存在，点击可操作性由人工浏览器检查。

#### Scenario: 本地多页数据只切当前本地页

- Test/check:
  - [X] `src/test/TableComponent.test.jsx::tc_table_06_mobile_local_slice`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_table_pagination_320_click`
- Assertion scope: `tc_table_06` 传入 25 条记录、`current=2/pageSize=10/total=25`，断言只显示第 11～20 条，`name-1`/`name-25` 不存在；点击第 1 页调用 `onChange(1,10)`；rerender 到第 1 页后只显示 1～10 条。它没有断言总数或第 3 页入口。规划测试在同一 25 条数据、`current=1/pageSize=10/total=25` 下通过 `showTotal` 断言「共 25 条」与第 3 页入口存在，再点击第 2 页调用 `onChange(2,10)`。
- Coverage note: `tc_table_06` 传入 `total=25` 但未断言总数/第 3 页入口；规划测试用 `showTotal` 真实断言总数 25 并检查第 3 页入口；未显式 `fetch` spy，组件本身不发起数据请求。

#### Scenario: AdminLogs 在移动端保持既有字段与分页

- Test/check:
  - [X] `src/test/TableComponent.test.jsx::tc_table_07_mobile_admin_fields_pagination`
  - [X] `src/test/AdminLogsMobile.test.jsx::tc_logs_01_mobile_390_768_expand_collapse`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_table_adminlogs_mobile_fields`
- Assertion scope: 既有组件测试断言 1 张卡片、操作人 `root`、分页第 2 页入口；AdminLogsMobile 断言真实日志「更新机器」与展开。规划测试在 390 渲染真实 `AdminLogs`，断言五列标题「时间/操作人/操作/目标/结果」及对应值（系统、更新机器、目标、结果），分页入口存在；初次加载后 `listOperationLogs` 与 `getOperationLogStats` 各只调用 1 次。
- Coverage note: 规划测试，未创建；既有组件测试不使用 AdminLogs 字段，AdminLogsMobile 未断言五列与请求次数。

#### Scenario: 空数据保留空态与分页

- Test/check:
  - [X] `src/test/TableComponent.test.jsx::tc_table_08_mobile_empty_pagination`
- Assertion scope: 390 空数据 + `pagination.total=21` 时 `.app-table-mobile-empty` 存在、分页第 2 页入口存在、零张 `.app-table-mobile-card`。
- Coverage note: 320 未单独渲染；同一空态分支，未声称 320 像素结果。

### Requirement: TableComponent 移动端受控展开

#### Scenario: 受控的 DeletedContainers 移动端展开与收起

- Test/check:
  - [X] `src/test/TableComponent.test.jsx::tc_table_09_controlled_expand_collapse`
  - [X] `src/test/DeletedContainersMobile.test.jsx::tc_dc_05_mobile_390_expand_collapse`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_table_controlled_callback`
- Assertion scope: `tc_table_09` 用父级 `useState` 作为受控 keys，断言点击后「收起详情」`aria-expanded=true`、详情出现、`onExpand(true, record)`，再点击后详情消失、`onExpand(false, record)`；`tc_dc_05` 在真实 DeletedContainers 390 断言 aria true、镜像/账号详情、用量请求次数不变。规划测试直接 spy `onExpandedRowsChange` 与 `onExpand`，断言 key 加入/移除参数 `[deleted_id]`/`[]`；父级不更新 keys 时详情保持隐藏，证明受控模式不写内部状态。
- Coverage note: 规划测试，未创建；既有测试对 `onExpandedRowsChange` 参数与“不写内部状态”只有间接证明；`tc_dc_05` 断言用量请求次数不变，列表请求次数未在该测试中记录，展开路径不发起列表请求。

#### Scenario: 自定义展开列不重复出现按钮

- Test/check:
  - [X] `src/test/TableComponent.test.jsx::tc_table_10_custom_expand_no_duplicate`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_table_custom_expand_action`
- Assertion scope: 既有测试断言 `showExpandColumn:false` + 受控 keys `[1]` 时不出现内置「展开详情」，`详情-alpha` 仍渲染。规划测试在操作列提供自定义展开按钮并绑定 keys 切换，断言点击后详情显示/隐藏，且始终只有一个自定义按钮、无第二个内置按钮。
- Coverage note: 规划测试，未创建；既有测试未断言原操作按钮仍可切换。

#### Scenario: 缺少受控更新回调

- Test/check:
  - [X] `src/test/TableComponent.test.jsx::tc_table_11_missing_controlled_callback`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_table_missing_callback_isolation`
- Assertion scope: 既有测试断言 `expandedRowKeys` 为数组但没有 `onExpandedRowsChange` 时不显示「展开详情」。规划测试用两条记录 + 分页 + 空受控 keys 重复，断言无展开按钮、无异常、详情不出现、分页第 2 页入口仍在；点击后测试持有的 `expandedRowKeys` 引用仍为 `[]`，组件未改写父级 keys。
- Coverage note: 规划测试，未创建；既有测试未断言 keys 不被改写与其他行/分页不受影响；规划测试补 keys 引用与分页隔离断言。

### Requirement: TableComponent 移动端未受控展开

#### Scenario: 未受控的 AdminLogs 移动端展开日志详情

- Test/check:
  - [X] `src/test/TableComponent.test.jsx::tc_table_12_uncontrolled_admin_expand`
  - [X] `src/test/AdminLogsMobile.test.jsx::tc_logs_01_mobile_390_768_expand_collapse`
  - [X] `src/test/AdminLogs.test.jsx::展开行显示前→后对比（状态值翻译）`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_admin_logs_mobile_expand_no_requests`
- Assertion scope: 既有组件测试点击展开/收起，断言详情出现/消失；AdminLogsMobile 在 390/768 断言 `aria-expanded=true`、详情与收起按钮；AdminLogs 桌面测试断言 antd 展开行内容。规划测试在 390/768 补断言收起后 `aria-expanded=false`、列表/统计调用次数不变、列表字段与分页入口保持；在 1440 断言 antd 展开图标、无移动详情按钮。
- Coverage note: 规划测试，未创建；既有测试未断言收起后的 aria 与请求次数，也未在同一测试内对照 1440。

#### Scenario: rowExpandable 未提供视为可展开

- Test/check:
  - [X] `src/test/TableComponent.test.jsx::tc_table_13_row_expandable_default`
  - [X] `src/test/TableComponent.test.jsx::tc_table_12_uncontrolled_admin_expand`
- Assertion scope: `tc_table_13` 在未提供 `rowExpandable` 时断言「展开详情」按钮出现；`tc_table_12` 点击该按钮后详情渲染，未出现 `rowExpandable is not a function` 异常。
- Coverage note: 未单独断言异常类型；成功渲染与点击证明未抛该异常。

#### Scenario: rowExpandable 显式 false 禁用该行

- Test/check:
  - [X] `src/test/TableComponent.test.jsx::tc_table_14_row_expandable_false`
- Assertion scope: 两条记录、`rowExpandable` 对 id=2 返回 false 时，只有 1 个「展开详情」按钮；点击后只显示 `详情-alpha`，`详情-beta` 不存在。
- Coverage note: 该测试 `pagination=false`，未单独断言分页不受影响；`rowExpandable` 只控制该行按钮显示，不触碰分页状态。

### Requirement: TableComponent 移动端分页、空态与加载

#### Scenario: 已删除列表在手机翻到第二页

- Test/check:
  - [X] `src/test/TableComponent.test.jsx::tc_table_15_pagination_page_two`
  - [X] `src/test/DeletedContainersMobile.test.jsx::tc_dc_14_mobile_page_two_usage`
  - [X] `src/test/DeletedContainersMobile.test.jsx::tc_dc_08_mobile_stale_key_page_change`
- Assertion scope: `tc_table_15` 在 390 断言点击第 2 页调用 `onChange(2,20)`；`tc_dc_14` 用真实 DeletedContainers 断言第 2 页记录渲染，且用量请求只针对第 2 页 `[22]`；`tc_dc_08` 的列表替身按 `page_number=2` 返回第二页记录，点击第 2 页后断言 `page-two` 出现、`page-one` 消失、`.app-table-mobile-expanded` 被清空。
- Coverage note: `tc_dc_14` 本身未断言第一页记录消失；`tc_dc_08` 补此断言并证明列表请求走到第 2 页。组件本身不请求数据；页面级用量请求证明只处理当前页。

#### Scenario: 空页仍保留描述与翻页入口

- Test/check:
  - [X] `src/test/TableComponent.test.jsx::tc_table_17_empty_locale_description`
  - [X] `src/test/TableComponent.test.jsx::tc_table_08_mobile_empty_pagination`
- Assertion scope: `tc_table_17` 断言 `locale.emptyText`「暂无已删除容器」可见；`tc_table_08` 断言空态占位、分页第 2 页入口、零张卡片。合并覆盖描述与分页入口同时保留。
- Coverage note: 未单独断言“不自动跳第一页/不重复请求”；组件无数据请求逻辑。

#### Scenario: 320px 分页入口不撑宽

- Test/check:
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_table_pagination_320_click`
  - [ ] `npm run dev`
- Assertion scope: 规划测试在 320 先以 25 条记录、`current=1/pageSize=10/total=25` 渲染 `TableComponent`，通过 `showTotal` 断言「共 25 条」与第 3 页入口存在；再以 `total=21/pageSize=20` 渲染，断言页码与前后按钮可见、点击第 2 页调用 `onChange(2,20)`。人工浏览器在 Chromium 320px 打开 `https://localhost:5173/#/admin/deleted-containers`（路径 `/admin/deleted-containers`），使用现有 21 条已删除记录、pageSize 20 的分页，测量 `document.documentElement.scrollWidth` 与 `window.innerWidth` 并断言 `scrollWidth <= 322`。现有 `tc_table_16` 只读 CSS `flex-wrap` 源字符串，不作为真实宽度证据。
- Coverage note: 规划测试，未创建；像素宽度只来自人工浏览器。该规划测试同时补 `tc_table_06` 的“总数 25/第 3 页入口”真实断言，不新增独立测试。

#### Scenario: 加载中保持既有加载态

- Test/check:
  - [X] `src/test/TableComponent.test.jsx::tc_table_18_loading_state`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_table_loading_transition`
- Assertion scope: 既有测试在 `loading=true` 时断言 `.ant-spin-spinning` 存在。规划测试从 `loading=true` + 空数据开始，断言 Spin 且无卡片；rerender 为 `loading=false` + 有数据后显示卡片，再切空数据显示空态；`fetch` 未被调用。
- Coverage note: 规划测试，未创建；既有测试未断言加载结束后的卡片/空态切换。
