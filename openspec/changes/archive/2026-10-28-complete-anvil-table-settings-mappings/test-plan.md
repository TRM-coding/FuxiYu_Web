# Test Plan

<!-- Mapping only. 本文件是 Scenario→Test/check 对账计划，不是执行结果台账：
     不记录 run/pass/fail/时间戳/覆盖数字。`[X]` 仅表示该映射所引用的既有测试/检查存在，
     且其断言已从测试代码或构建配置确认；`[ ]` 表示测试或断言未创建/未确认。
     所有 `[ ]` 的 `src/test/AnvilTableSettings.test.jsx` 行均为规划测试，本阶段未创建。
     `[ ]` 的 `npm run dev` 行是人工浏览器检查，不是自动化测试；视口、路由与测量对象见
     对应 Assertion scope。 -->

## frontend--page-admin-logs

### Requirement: AdminLogs 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_admin_logs_route_assembly`
- Assertion scope: 真实 `AppRoutes` + `PermissionProvider` + `MemoryRouter` 访问 `/admin/logs`，`getUserPermissions` 返回 `operation_log:manage` 与 `bypass_auth_entity`；断言 AdminLayout 菜单「操作日志」出现、`.admin-shell` 与 `.admin-logs` 同时存在、日志行「更新机器」渲染；页面身份来自权限快照，不读 localStorage 副本。
- Coverage note: 规划测试，未创建；现有 `AdminLogs.test.jsx` 只直渲页面，不能证明路由、懒加载与布局装配。

### Requirement: AdminLogs 主流程

#### Scenario: 切换周或过滤条件

- Test/check:
  - [X] `src/test/AdminLogs.test.jsx::点击「上一周」以新的时间范围重新查询`
  - [X] `src/test/AdminLogs.test.jsx::test_q22_admin_logs_stale_filter_page`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_admin_logs_week_filter_stats`
- Assertion scope: 上一周点击后第二次 `listOperationLogs` 调用带 `start`/`end`；筛选下拉切换会触发新列表请求，迟到旧筛选响应不覆盖新结果与分页。规划测试在同一交互后断言 `getOperationLogStats` 被调用，且统计三卡按响应渲染。
- Coverage note: 规划测试，未创建；既有断言只覆盖列表请求与渲染，未断言统计调用。当前实现的列表与统计在同一 effect 中重跑，规划测试按此可观察行为编写，不新增伪造请求。THEN 末尾“旧请求覆盖的风险登记在 QUESTIONS”属 Global QUESTIONS 文档职责，不在本仓自动化测试范围。

### Requirement: AdminLogs 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] `npm run build`
- Assertion scope: `vite build` 退出码 0，构建完成并生成 `dist`。
- Coverage note: 只证明构建成功与产物生成；不自动断言 `AdminLogs`/`ModelViewer` 独立 chunk、`vendor-three-*` 分组或 Rollup 警告清单，这些是产物人工核对/验收观测，不由命令退出码证明。

### Requirement: AdminLogs 查询结果必须匹配当前周次、筛选与分页

#### Scenario: 当前上下文响应应用

- Test/check:
  - [X] `src/test/AdminLogs.test.jsx::test_q22_admin_logs_current_response`
- Assertion scope: 当前请求返回后日志「当前周日志」渲染、`listOperationLogs` 恰好 1 次、`total_pages=4` 显示 4 页且第 1 页为 active。

#### Scenario: 旧周次响应晚到

- Test/check:
  - [X] `src/test/AdminLogs.test.jsx::test_q22_admin_logs_stale_week`
- Assertion scope: 上一周结果先返回并渲染、分页 3 页；本周迟到响应后不出现「本周迟到日志」，列表仍显示上一周结果，分页仍为 3 页。
- Coverage note: 断言旧响应不覆盖当前结果；请求序号/控制器资源释放是代码层事实，测试未直接观测释放动作。

#### Scenario: 旧筛选或旧页响应晚到

- Test/check:
  - [X] `src/test/AdminLogs.test.jsx::test_q22_admin_logs_stale_filter_page`
  - [X] `src/test/AdminLogs.test.jsx::test_q22_admin_logs_stale_page`
- Assertion scope: 旧筛选迟到响应不改写新筛选结果，旧 `total_pages=5` 不出现；旧页 2 迟到响应不改写第 1 页结果，第 1 页仍为 active。
- Coverage note: 两个测试分别覆盖旧筛选与旧页；正文的「旧请求只释放自身资源」未由测试直接观测。

### Requirement: AdminLogs 移动端日志详情与 320px 收缩

#### Scenario: 390px 与 768px 展开日志详情

- Test/check:
  - [X] `src/test/AdminLogsMobile.test.jsx::tc_logs_01_mobile_390_768_expand_collapse`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_admin_logs_mobile_expand_no_requests`
- Assertion scope: 既有测试在 390/768 点击「展开详情」后断言按钮变「收起详情」且 `aria-expanded=true`、显示「结构化」「复制详情」，再收起后详情消失；规划测试补断言收起后 `aria-expanded=false`，展开/收起前后 `listOperationLogs` 与 `getOperationLogStats` 调用次数均不变。
- Coverage note: 规划测试，未创建；既有测试未断言收起后的 aria 与请求次数。

#### Scenario: 320px 统计区收缩且详情不溢出

- Test/check:
  - [X] `src/test/AdminLogsMobile.test.jsx::tc_logs_02_320_side_contract`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_admin_logs_320_layout_dom`
  - [ ] `npm run dev`
- Assertion scope: 既有测试在 320 渲染并断言移动卡片、`.als-side`、`.als-wall-wrap` 存在；规划测试补断言统计三卡、筛选栏、日志卡片、分页入口均在 DOM 中。人工浏览器检查在 Chromium 320px 打开 HashRouter 实际地址 `https://localhost:5173/#/admin/logs`（路径 `/admin/logs`），使用现有 Dev/测试数据中一条含已知长 JSON/URL 的日志并展开详情；测量 `document.documentElement.scrollWidth` 与 `window.innerWidth`，断言 `scrollWidth <= 322`，`.als-side` 不再固定 300px、`.als-wall-wrap` 保留内部横向滚动，统计区、筛选、卡片与分页仍可见。
- Coverage note: 规划测试，未创建；既有 `tc_logs_02` 读取 CSS 源字符串断言 `min(300px, 100%)`，按本轮规则不作为真实布局证据；jsdom 不计算 `scrollWidth`，像素结论只来自人工浏览器。

#### Scenario: 1440px 桌面保持 antd 展开与分页

- Test/check:
  - [X] `src/test/AdminLogs.test.jsx::展开行显示前→后对比（状态值翻译）`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_admin_logs_desktop_1440_children_expand_page2`
- Assertion scope: 既有测试在桌面默认 `matchMedia` 下点击 antd `Expand row`，断言「机器状态」「运行中」「维护中」；规划测试在 1440 渲染真实 `AdminLogs`，断言 antd `table`、五列头、展开图标、无移动详情按钮。展开当前行前后 `listOperationLogs` 与 `getOperationLogStats` 调用次数不变（展开不新增 fetch）；点击第 2 页后 `listOperationLogs` 收到 `page=2,page_size=20`，统计三卡按响应渲染，第 2 页仍可用 antd 展开图标打开详情。
- Coverage note: 规划测试，未创建；既有测试未设置 1440、未断言表头、无移动卡片或分页请求。本场景“请求次数不变”按上下文解释为：响应式调整（桌面 antd/移动卡片切换与展开）不引入额外请求，不禁止既有换页查询；换页沿现有 effect 可重取列表与统计。新页仍有详情功能，但不保留旧页行的展开 DOM。计划据此只断言展开不新增请求、换页列表参数、统计三卡渲染与新页展开能力，不引入新后端或 no-stats 策略。

#### Scenario: 长日志详情在 320px 内可读

- Test/check:
  - [X] `src/test/AdminLogsMobile.test.jsx::tc_logs_03_long_detail_320`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_admin_logs_320_long_detail_action`
  - [ ] `npm run dev`
- Assertion scope: 既有测试在 320 展开含长 URL 的详情，断言 `.admin-logs-kv`、长路径文本、「收起详情」按钮存在；规划测试点击「收起详情」，断言详情消失、按钮恢复「展开详情」，再次展开后长文本重新出现。人工浏览器检查在 Chromium 320px 打开 `https://localhost:5173/#/admin/logs`（路径 `/admin/logs`），使用现有 Dev/测试数据中一条含无空格长 JSON、长 URL 或长 diff 行的日志；展开后测量 `document.documentElement.scrollWidth` 与 `window.innerWidth`，断言 `scrollWidth <= 322`，详情在卡片内换行或按既有滚动容器展示，“收起详情”按钮可见且可点击。
- Coverage note: 规划测试，未创建；真实换行/溢出只能人工浏览器，jsdom 不断言像素。

## frontend--page-settings

### Requirement: Settings 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_settings_route_assembly`
- Assertion scope: 真实 `AppRoutes` + `PermissionProvider` + `MemoryRouter` 访问 `/admin/settings`，权限含 `settings:manage`，`listSystemSettings` 返回设置项；断言 AdminLayout 菜单「系统设置」出现、`.settings-page` 与设置项「自动清理天数」渲染、路由路径保持 `/admin/settings`。
- Coverage note: 规划测试，未创建；现有 `Settings.test.jsx` 与 `settingsForbiddenHandling.test.jsx` 只直渲页面。

### Requirement: Settings 主流程

#### Scenario: 合法设置更新成功

- Test/check:
  - [X] `src/test/Settings.test.jsx::test_q23_settings_integer_valid`
  - [X] `src/test/Settings.test.jsx::test_q23_settings_reminder_valid`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_settings_save_refresh_success`
- Assertion scope: 既有测试断言整数 9 与提醒节点 `48,24,12` 以期望对象调用 `updateSystemSettings`；规划测试让更新响应返回新值，断言 `message.success('设置已保存')` 可见、输入框刷新为服务端新值、「无改动」状态出现。
- Coverage note: 规划测试，未创建；既有测试未断言矩阵刷新与保存成功提示。后端未知键/越界校验与事务写入不在本前端测试计划范围，错误场景只覆盖前端对模拟 `invalid_setting`/`update_failed` 响应的展示。

### Requirement: Settings 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] `npm run build`
- Assertion scope: `vite build` 退出码 0，构建完成并生成 `dist`。
- Coverage note: 只证明构建成功与产物生成；不自动断言 `Settings`/`ModelViewer` 独立 chunk、`vendor-three-*` 分组或 Rollup 警告清单，这些是产物人工核对/验收观测，不由命令退出码证明。

### Requirement: Settings 整数与提醒节点必须完整校验

#### Scenario: 整数合法值可提交

- Test/check:
  - [X] `src/test/Settings.test.jsx::test_q23_settings_integer_valid`
- Assertion scope: 输入 9 后保存，`updateSystemSettings` 收到包含 `container.cleanup_after_days: 9` 的对象；字段未被校验错误阻止。

#### Scenario: 整数输入小数被拒

- Test/check:
  - [X] `src/test/Settings.test.jsx::test_q23_settings_integer_decimal_rejected`
- Assertion scope: 输入 `1.5` 保存后字段文本含「必须为整数」，`updateSystemSettings` 未被调用，因此未把 `1.5` 截断为 `1` 发送。

#### Scenario: 合法提醒节点可提交

- Test/check:
  - [X] `src/test/Settings.test.jsx::test_q23_settings_reminder_valid`
- Assertion scope: 输入 `48,24,12` 保存后，`updateSystemSettings` 收到原字符串 `container.cleanup_reminder_hours: '48,24,12'`。

#### Scenario: 非法提醒节点指出具体字段

- Test/check:
  - [X] `src/test/Settings.test.jsx::test_q23_settings_reminder_invalid_field`
- Assertion scope: 四个非法值分别保存后，「清理提醒节点」字段文本包含对应非法项（`abc`、空项、`0`、`-1`），`updateSystemSettings` 未调用，未静默丢弃后发送其他值。

### Requirement: Settings GROUP_ORDER 与后端实际分组一致

#### Scenario: 分组顺序与后端一致

- Test/check:
  - [X] `src/test/Settings.test.jsx::test_q23_settings_group_order`
- Assertion scope: 后端分组乱序输入后，`.settings-section-head h4` 文本严格等于 `['容器清理','磁盘策略','已删除容器','公告','镜像']`。

#### Scenario: 未知分组排最后

- Test/check:
  - [X] `src/test/Settings.test.jsx::test_q23_settings_unknown_group_last`
- Assertion scope: 含「未知分组」的输入渲染顺序严格等于五个已知分组后接「未知分组」，已知分组顺序不变。

### Requirement: Settings 错误保留结构化原因并兼容既有字符串

#### Scenario: invalid_setting 展示中文

- Test/check:
  - [X] `src/test/Settings.test.jsx::test_q37_settings_invalid_setting_mapping`
  - [X] `src/test/showErrorModalMap.test.js::Q37 真实弹窗按 route/reason 显示中文 > /settings → invalid_setting`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_settings_error_modal_frontend`
- Assertion scope: 页面测试只证明前端把模拟的 `error.body`、`status=422`、`route` 交给 `showErrorModal`，且映射表值为「设置项不合法」；工具测试只证明前端弹窗显示「设置项不合法」且不含「未收录的错误原因」。规划测试不 mock `showErrorModal`，mock `listSystemSettings` 返回 422 且 `body.error_reason='invalid_setting'` 的模拟响应，让 Settings 页面走真实前端错误展示链路；不证明 Ctrl 真实拒绝未知键/越界值，也不证明事务写入。
- Coverage note: 规划测试，未创建；既有两条分别覆盖前端页面参数契约与前端工具文案，未在单测内串起。后端 `invalid_setting` 的校验与事务行为不在本前端测试计划范围。

#### Scenario: update_failed 展示中文

- Test/check:
  - [X] `src/test/Settings.test.jsx::test_q37_settings_update_failed_mapping`
  - [X] `src/test/showErrorModalMap.test.js::Q37 规格 route/error_reason 全表 > /settings → update_failed 显示「保存设置失败」`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_settings_error_modal_frontend`
- Assertion scope: 页面测试只证明前端在更新失败时把模拟的 body、status、route 交给 `showErrorModal`，且映射表值为「保存设置失败」；全表测试只证明该前端映射值存在。规划测试 mock `updateSystemSettings` 返回 422 且 `body.error_reason='update_failed'` 的模拟响应，真实渲染 `/settings` 前端弹窗并断言文本「保存设置失败」，不落回英文或通用未知错误；不证明后端校验或事务写入。
- Coverage note: 规划测试，未创建；现有前端工具真实弹窗样例只含 invalid_setting，update_failed 只有映射值断言。后端行为不在本前端测试计划范围。

#### Scenario: 只传字符串时仍可读

- Test/check:
  - [X] `src/test/Settings.test.jsx::test_q37_settings_string_compatibility`
- Assertion scope: 真实弹窗对对象消息「历史字符串消息」、直接字符串「直接传入的字符串消息」、以及含 JSON 的字符串消息分别显示可读文案；不抛解析异常，JSON 中的 `invalid_setting` 仍映射为「原因：设置项不合法」。

## frontend--page-not-found

### Requirement: NotFound 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] `src/test/routeLoading.test.jsx::未匹配路径仍落到 404 路由`
- Assertion scope: 真实 `AppRoutes` + `PermissionProvider` 访问 `/definitely-missing`，懒加载后渲染「页面走丢了」与「404」，证明 `*` 路由装配 NotFound。
- Coverage note: 未断言「无 API 请求或额外页面权限」；页面实现无数据请求，测试未显式断言。

### Requirement: NotFound 主流程

#### Scenario: 访问未匹配路由

- Test/check:
  - [X] `src/test/routeLoading.test.jsx::未匹配路径仍落到 404 路由`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_notfound_home_navigation`
- Assertion scope: 既有测试断言未知路径显示「页面走丢了」与「404」；规划测试点击「回到主页」，断言导航到 `/index` 并渲染目标占位内容。
- Coverage note: 规划测试，未创建；既有测试未点击返回按钮。

### Requirement: NotFound 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] `npm run build`
- Assertion scope: `vite build` 退出码 0，构建完成并生成 `dist`。
- Coverage note: 只证明构建成功与产物生成；不自动断言 `NotFound`/`ModelViewer` 独立 chunk、`vendor-three-*` 分组或 Rollup 警告清单，这些是产物人工核对/验收观测，不由命令退出码证明。

### Requirement: NotFound 页面使用完整视口高度

#### Scenario: 顶层未知路由无底部空隙

- Test/check:
  - [ ] `npm run dev`
- Assertion scope: 人工在 Chromium 1440×900 打开 HashRouter 实际地址 `https://localhost:5173/#/definitely-missing`（路径 `/definitely-missing`），等待 `NotFound` 渲染。读取 `document.querySelector('.notfound-page')`，断言 `page.getBoundingClientRect().height >= window.innerHeight`、`page.getBoundingClientRect().bottom >= window.innerHeight - 1`（页面底边不高于视口底边，即无 64px 底部空隙）、`parseFloat(getComputedStyle(page).minHeight) >= window.innerHeight`（computed 值为 px，不比较 `100vh`/`100dvh` 字符串）、`document.documentElement.scrollHeight >= window.innerHeight`（页面覆盖视口）。`scrollHeight` 可因内容/盒模型略大于视口，不用“必须等于视口”误判底部空隙。
- Coverage note: 现有 `notFoundLayout.test.js::test_q66_notfound_full_viewport` 只读 CSS 源字符串，按本轮规则不能作为真实视口证据；jsdom 无布局，故只规划人工浏览器检查，不新建机械 CSS 文本测试。

#### Scenario: 移动端视口无 56px 空隙

- Test/check:
  - [ ] `npm run dev`
- Assertion scope: 人工在 Chromium 390×844 与 320×568 打开 `https://localhost:5173/#/definitely-missing`（路径 `/definitely-missing`），重复上述 px 测量：`page.getBoundingClientRect().height >= window.innerHeight`、`page.getBoundingClientRect().bottom >= window.innerHeight - 1`、`parseFloat(getComputedStyle(page).minHeight) >= window.innerHeight`、`document.documentElement.scrollHeight >= window.innerHeight`；断言无 56px/64px 底部空隙，404 文案与「回到主页」按钮可见。
- Coverage note: 现有 `notFoundLayout.test.js::test_q66_notfound_mobile_no_gap` 只读 CSS 源字符串，不作为真实视口证据；jsdom 无布局，故只规划人工浏览器检查。

## frontend--table-component

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
