# Tasks

## 1. 测试文件骨架与 AdminLogs 规划测试

- [x] 1.1 新建 `src/test/AnvilTableSettings.test.jsx`，建立外部 API mock、真实 `PermissionProvider`/`MemoryRouter`、`matchMedia`/视口、真实 `showErrorModal` 弹窗清理等辅助；不替换目标页面、`TableComponent` 或路由。验证：文件可由 Vitest 加载，ESLint 无解析错误。
- [x] 1.2 实现 `anvil_ts_admin_logs_route_assembly`，覆盖 `frontend--page-admin-logs / AdminLogs 页面入口与身份 / 装配页面`。验证：真实 `AppRoutes` 访问 `/admin/logs` 后出现 AdminLayout「操作日志」、`.admin-shell`、`.admin-logs` 与日志行。
- [x] 1.3 实现 `anvil_ts_admin_logs_week_filter_stats`，覆盖 `frontend--page-admin-logs / AdminLogs 主流程 / 切换周或过滤条件`。验证：上一周与筛选变化后 `listOperationLogs`、`getOperationLogStats` 均被调用，统计卡渲染。
- [x] 1.4 实现 `anvil_ts_admin_logs_mobile_expand_no_requests`，覆盖 `frontend--page-admin-logs / AdminLogs 移动端日志详情与 320px 收缩 / 390px 与 768px 展开日志详情`，并补 `frontend--table-component / TableComponent 移动端未受控展开 / 未受控的 AdminLogs 移动端展开日志详情`。验证：390/768 展开收起 aria 与请求次数、1440 antd 展开。
- [x] 1.5 实现 `anvil_ts_admin_logs_320_layout_dom`，覆盖 `frontend--page-admin-logs / AdminLogs 移动端日志详情与 320px 收缩 / 320px 统计区收缩且详情不溢出` 的 DOM 可见部分。验证：320 下统计、筛选、卡片、分页、`.als-side`、`.als-wall-wrap` 均在 DOM。
- [x] 1.6 实现 `anvil_ts_admin_logs_desktop_1440_children_expand_page2`，覆盖 `frontend--page-admin-logs / AdminLogs 移动端日志详情与 320px 收缩 / 1440px 桌面保持 antd 展开与分页`，并补 `frontend--table-component / TableComponent 桌面与既有列定义兼容 / AdminLogs 的 children 用法保持桌面表格`。验证：1440 五列、antd 展开、第 2 页请求与新页展开；展开不新增 fetch。
- [x] 1.7 实现 `anvil_ts_admin_logs_320_long_detail_action`，覆盖 `frontend--page-admin-logs / AdminLogs 移动端日志详情与 320px 收缩 / 长日志详情在 320px 内可读` 的可操作部分。验证：320 长详情展开、收起、再次展开，长文本出现/消失。

## 2. Settings 规划测试

- [x] 2.1 实现 `anvil_ts_settings_route_assembly`，覆盖 `frontend--page-settings / Settings 页面入口与身份 / 装配页面`。验证：真实 `AppRoutes` 访问 `/admin/settings` 后出现菜单、`.settings-page`、设置项与路径。
- [x] 2.2 实现 `anvil_ts_settings_save_refresh_success`，覆盖 `frontend--page-settings / Settings 主流程 / 合法设置更新成功`。验证：保存后成功提示可见、输入刷新为新值、「无改动」出现。
- [x] 2.3 实现 `anvil_ts_settings_error_modal_frontend`，覆盖 `frontend--page-settings / Settings 错误保留结构化原因并兼容既有字符串 / invalid_setting 展示中文` 与 `update_failed 展示中文` 的前端范围。验证：模拟 422 响应下真实弹窗显示两条中文，不声明后端拒绝或事务。

## 3. NotFound 规划测试

- [x] 3.1 实现 `anvil_ts_notfound_home_navigation`，覆盖 `frontend--page-not-found / NotFound 主流程 / 访问未匹配路由`。验证：未知路径显示 404，点击「回到主页」后导航到 `/index` 并渲染目标占位内容。

## 4. TableComponent 规划测试

- [x] 4.1 实现 `anvil_ts_table_deleted_columns_desktop`，覆盖 `frontend--table-component / TableComponent 桌面与既有列定义兼容 / 已删除容器页的 columns 数组生成桌面表格`。验证：1440 七列顺序、Mount 省略、210/230 列宽、无移动卡片。
- [x] 4.2 实现 `anvil_ts_table_empty_columns_data_both`，覆盖 `frontend--table-component / TableComponent 桌面与既有列定义兼容 / 列定义为空或数据为空`。验证：1440 与 390 空列空数据空态、分页、无伪造列/空白卡片。
- [x] 4.3 实现 `anvil_ts_table_deleted_mobile_values`，覆盖 `frontend--table-component / TableComponent 移动端卡片列渲染 / 390px 已删除列表按全部列渲染卡片`。验证：390 卡片内七列及容器/机器/Mount/用量/时间/状态/操作值。
- [x] 4.4 实现 `anvil_ts_table_adminlogs_mobile_fields`，覆盖 `frontend--table-component / TableComponent 移动端卡片列渲染 / AdminLogs 在移动端保持既有字段与分页`。验证：390 真实 AdminLogs 五列字段/值、分页，初次 list/stats 各一次。
- [x] 4.5 实现 `anvil_ts_table_controlled_callback`，覆盖 `frontend--table-component / TableComponent 移动端受控展开 / 受控的 DeletedContainers 移动端展开与收起`。验证：`onExpandedRowsChange`/`onExpand` 参数、父级不更新 keys 时详情不显示。
- [x] 4.6 实现 `anvil_ts_table_custom_expand_action`，覆盖 `frontend--table-component / TableComponent 移动端受控展开 / 自定义展开列不重复出现按钮`。验证：`showExpandColumn:false` 无内置按钮，自定义操作按钮可切换详情。
- [x] 4.7 实现 `anvil_ts_table_missing_callback_isolation`，覆盖 `frontend--table-component / TableComponent 移动端受控展开 / 缺少受控更新回调`。验证：无无效展开按钮、无异常、keys 引用仍为空、分页入口保留。
- [x] 4.8 实现 `anvil_ts_table_pagination_320_click`，覆盖 `frontend--table-component / TableComponent 移动端卡片列渲染 / 本地多页数据只切当前本地页` 的总数断言与 `frontend--table-component / TableComponent 移动端分页、空态与加载 / 320px 分页入口不撑宽`。验证：`showTotal`「共 25 条」、第 3 页入口、25/10 与 21/20 两处分页点击。
- [x] 4.9 实现 `anvil_ts_table_loading_transition`，覆盖 `frontend--table-component / TableComponent 移动端分页、空态与加载 / 加载中保持既有加载态`。验证：加载 Spin、加载后有卡片、空数据有空态，`fetch` 未调用。

## 5. 验证与映射复算

- [x] 5.1 运行新文件 `node scripts/tests/run-vitest.mjs run src/test/AnvilTableSettings.test.jsx --maxWorkers=2`，日志写外部 `web-batch-7/apply-newfile-tests.log` 并记录退出码。验证：新文件全部测试通过。
- [x] 5.2 运行相关既有文件（AdminLogs、AdminLogsMobile、Settings、settingsForbiddenHandling、TableComponent、DeletedContainersMobile、DeletedContainersDisplay、routeLoading、showErrorModalMap、ErrorPresentation），`--maxWorkers=2`，日志写外部 `web-batch-7/apply-related-tests.log` 并记录退出码。验证：相关套件无回归。
- [x] 5.3 运行 `npx eslint src/test/AnvilTableSettings.test.jsx`，日志写外部 `web-batch-7/apply-newfile-eslint.log` 并记录退出码。验证：新文件 ESLint 通过。
- [x] 5.4 逐条核对新文件实际断言与 test-plan 的 Assertion scope/Coverage note，只把已实现且已核对的 19 个规划测试 locator 复算为 `[X]`；6 条 `npm run dev` 人工检查保持 `[ ]`。验证：locator/scope/note 零变化，仅 checkbox 变化。
- [x] 5.5 按 `openspec-verify-change` 做简短一致性核验（任务完成、规格覆盖、设计一致性），不创建 Anvil verify.md，不声称 6 条人工浏览器检查完成。验证：报告仅引用真实测试/代码证据，明确人工检查未确认。
- [x] 5.6 检查 `git diff --name-only` 只包含 `src/test/AnvilTableSettings.test.jsx`、本 change 的 `tasks.md` 与 `test-plan.md`；确认未改 app、旧 tests、shared fixture、主 spec、配置、依赖、DB、CI、hooks。验证：工作区边界符合授权。

## Workflow follow-up

- 6 条人工浏览器检查保持未确认：AdminLogs 320 布局/长详情、DeletedContainers 320 长内容/分页、NotFound 1440/390/320；不写成自动化通过。
- 构建证据共用 root 的 `web-final-build.log`（exit 0），本 apply 不重复运行 build。
- 主 spec sync、侧车、归档与 commit 由 root 后续接续；本阶段不修改，不创建 Anvil verify.md。
