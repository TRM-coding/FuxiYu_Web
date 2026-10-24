## Test Plan

> 初始状态来自 `E:/AI/Fuxi_audit_artifacts/FuxiYu_Web/mobile-display/logs/02-red-targeted.log`：首批新增 45 个测试中 33 个失败、12 个在实现前已通过；后续补入 `tc_table_19` 与 `tc_logs_04`，红绿证据见 Coverage Notes。实现与补强后新增测试合计 47 个（19+17+4+7）全部通过，59 行 scenario 映射保持不变。

| Requirement | Scenario | Test File | Test Name | Initial State |
|-------------|----------|-----------|-----------|---------------|
| specs/frontend--table-component/spec.md → TableComponent 桌面与既有列定义兼容 | AdminLogs 的 children 用法保持桌面表格 | src/test/TableComponent.test.jsx | tc_table_01_desktop_children | 🟢 green |
| specs/frontend--table-component/spec.md → TableComponent 桌面与既有列定义兼容 | 已删除容器页的 columns 数组生成桌面表格 | src/test/TableComponent.test.jsx | tc_table_02_desktop_columns | 🟢 green |
| specs/frontend--table-component/spec.md → TableComponent 桌面与既有列定义兼容 | 列定义为空或数据为空 | src/test/TableComponent.test.jsx | tc_table_03_empty_columns_data | 🟢 green |
| specs/frontend--table-component/spec.md → TableComponent 移动端卡片列渲染 | 390px 已删除列表按全部列渲染卡片 | src/test/TableComponent.test.jsx | tc_table_04_mobile_columns_cards | 🟢 green |
| specs/frontend--table-component/spec.md → TableComponent 移动端卡片列渲染 | 320px 长路径和长名称不撑破页面 | src/test/TableComponent.test.jsx | tc_table_05_mobile_320_long_content | 🟢 green |
| specs/frontend--table-component/spec.md → TableComponent 移动端卡片列渲染 | 本地多页数据只切当前本地页 | src/test/TableComponent.test.jsx | tc_table_06_mobile_local_slice | 🟢 green |
| specs/frontend--table-component/spec.md → TableComponent 移动端卡片列渲染 | AdminLogs 在移动端保持既有字段与分页 | src/test/TableComponent.test.jsx | tc_table_07_mobile_admin_fields_pagination | 🟢 green |
| specs/frontend--table-component/spec.md → TableComponent 移动端卡片列渲染 | 空数据保留空态与分页 | src/test/TableComponent.test.jsx | tc_table_08_mobile_empty_pagination | 🟢 green |
| specs/frontend--table-component/spec.md → TableComponent 移动端受控展开 | 受控的 DeletedContainers 移动端展开与收起 | src/test/TableComponent.test.jsx | tc_table_09_controlled_expand_collapse | 🟢 green |
| specs/frontend--table-component/spec.md → TableComponent 移动端受控展开 | 自定义展开列不重复出现按钮 | src/test/TableComponent.test.jsx | tc_table_10_custom_expand_no_duplicate | 🟢 green |
| specs/frontend--table-component/spec.md → TableComponent 移动端受控展开 | 缺少受控更新回调 | src/test/TableComponent.test.jsx | tc_table_11_missing_controlled_callback | 🟢 green |
| specs/frontend--table-component/spec.md → TableComponent 移动端未受控展开 | 未受控的 AdminLogs 移动端展开日志详情 | src/test/TableComponent.test.jsx | tc_table_12_uncontrolled_admin_expand | 🟢 green |
| specs/frontend--table-component/spec.md → TableComponent 移动端未受控展开 | rowExpandable 未提供视为可展开 | src/test/TableComponent.test.jsx | tc_table_13_row_expandable_default | 🟢 green |
| specs/frontend--table-component/spec.md → TableComponent 移动端未受控展开 | rowExpandable 显式 false 禁用该行 | src/test/TableComponent.test.jsx | tc_table_14_row_expandable_false | 🟢 green |
| specs/frontend--table-component/spec.md → TableComponent 移动端分页、空态与加载 | 已删除列表在手机翻到第二页 | src/test/TableComponent.test.jsx | tc_table_15_pagination_page_two | 🟢 green |
| specs/frontend--table-component/spec.md → TableComponent 移动端分页、空态与加载 | 320px 分页入口不撑宽 | src/test/TableComponent.test.jsx | tc_table_16_pagination_320_fit | 🟢 green |
| specs/frontend--table-component/spec.md → TableComponent 移动端分页、空态与加载 | 空页仍保留描述与翻页入口 | src/test/TableComponent.test.jsx | tc_table_17_empty_locale_description | 🟢 green |
| specs/frontend--table-component/spec.md → TableComponent 移动端分页、空态与加载 | 加载中保持既有加载态 | src/test/TableComponent.test.jsx | tc_table_18_loading_state | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 移动端复用共享卡片布局 | 390px 以卡片展示七列 | src/test/DeletedContainersMobile.test.jsx | tc_dc_01_mobile_390_seven_columns | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 移动端复用共享卡片布局 | 768px 使用卡片而桌面保留表格 | src/test/DeletedContainersMobile.test.jsx | tc_dc_02_mobile_768_desktop_769 | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 移动端复用共享卡片布局 | 320px 长路径与长名称不遮挡操作 | src/test/DeletedContainersMobile.test.jsx | tc_dc_03_mobile_320_long_actions | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 移动端复用共享卡片布局 | 列定义或数据为空 | src/test/DeletedContainersMobile.test.jsx | tc_dc_04_mobile_empty_page_pagination | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 移动端详情主动展开与收起 | 390px 展开并收起一行详情 | src/test/DeletedContainersMobile.test.jsx | tc_dc_05_mobile_390_expand_collapse | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 移动端详情主动展开与收起 | 桌面展开图标与移动按钮共享状态 | src/test/DeletedContainersMobile.test.jsx | tc_dc_06_desktop_expand_shared_state | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 移动端详情主动展开与收起 | 详情文本很长 | src/test/DeletedContainersMobile.test.jsx | tc_dc_07_mobile_320_long_detail | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 移动端详情主动展开与收起 | 旧展开 key 不属于当前页 | src/test/DeletedContainersMobile.test.jsx | tc_dc_08_mobile_stale_key_page_change | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 移动端 Mount 复制与用量状态 | 320px 真实点击复制完整 Mount | src/test/DeletedContainersMobile.test.jsx | tc_dc_09_mobile_320_mount_copy | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 移动端 Mount 复制与用量状态 | 复制失败保留路径 | src/test/DeletedContainersMobile.test.jsx | tc_dc_10_mobile_copy_failure | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 移动端 Mount 复制与用量状态 | 390px 展示全部用量状态 | src/test/DeletedContainersMobile.test.jsx | tc_dc_11_mobile_390_usage_states | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 移动端 Mount 复制与用量状态 | 390px 统计未返回时显示读取统计中 | src/test/DeletedContainersMobile.test.jsx | tc_dc_12_mobile_usage_loading | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 移动端 Mount 复制与用量状态 | 已清理与无挂载不采样 | src/test/DeletedContainersMobile.test.jsx | tc_dc_13_mobile_cleaned_no_mount_no_sample | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 移动端分页、确认流程与轮询语义不变 | 手机翻页并按当前页采样 | src/test/DeletedContainersMobile.test.jsx | tc_dc_14_mobile_page_two_usage | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 移动端分页、确认流程与轮询语义不变 | 手机确认清理与恢复 | src/test/DeletedContainersDisplay.test.jsx | test_pagination_usage_polling_cleanup_and_restore_are_unchanged | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 移动端分页、确认流程与轮询语义不变 | pending 时切换分页 | src/test/DeletedContainersMountUsage.test.jsx | 翻页 abort 旧请求并丢弃迟到响应，不覆盖新页 | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 移动端分页、确认流程与轮询语义不变 | 移动端最后一页减少 | src/test/DeletedContainers.test.jsx | 清空当前页最后一条后按新 total 回到有效页，而不是一律回第一页 | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 移动端分页、确认流程与轮询语义不变 | 轮询预算耗尽 | src/test/DeletedContainersMountUsage.test.jsx | pending 单计时器精确轮询 120 次后停止，提示测量未完成且不再请求 | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 仅按当前页请求异步用量 | 列表先出现、统计后到达 | src/test/DeletedContainersMobile.test.jsx | tc_dc_19_usage_list_first_stats_later | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 仅按当前页请求异步用量 | 仅请求当前页可测记录 | src/test/DeletedContainersMobile.test.jsx | tc_dc_20_usage_only_current_page_ids | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 仅按当前页请求异步用量 | 无挂载、mount_cleaned=true 或 cleaned_at 非空不扫描 | src/test/DeletedContainersMobile.test.jsx | tc_dc_21_usage_cleaned_no_mount_no_request | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 表格信息层级与 Mount 复制样式 | 删除列表显示详情与可复制 Mount | src/test/DeletedContainersDisplay.test.jsx | test_image_moves_to_expanded_detail_and_mount_uses_compact_copy_chip | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 表格信息层级与 Mount 复制样式 | 空 Mount 或空镜像 | src/test/DeletedContainersDisplay.test.jsx | test_empty_mount_has_no_copy_control_and_empty_image_is_unknown | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 表格信息层级与 Mount 复制样式 | 复制失败 | src/test/DeletedContainersDisplay.test.jsx | test_mount_copy_failure_preserves_path | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 表格信息层级与 Mount 复制样式 | 旧流程 | src/test/DeletedContainersDisplay.test.jsx | test_pagination_usage_polling_cleanup_and_restore_are_unchanged | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → 已删除容器保留分页与当前操作上下文 | 同页刷新保持当前位置 | src/test/DeletedContainersDisplay.test.jsx | test_pagination_usage_polling_cleanup_and_restore_are_unchanged | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → 已删除容器保留分页与当前操作上下文 | 空页仍可翻页 | src/test/DeletedContainers.test.jsx | 当前页为空但 total>0 时仍保留分页入口 | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → 已删除容器保留分页与当前操作上下文 | 操作期间切换分页 | src/test/DeletedContainers.test.jsx | 动作在途时切换页码：动作完成后跟随当前页刷新 | 🟢 green |
| specs/frontend--page-deleted-containers/spec.md → 已删除容器保留分页与当前操作上下文 | 最后一页减少 | src/test/DeletedContainers.test.jsx | 清空当前页最后一条后按新 total 回到有效页，而不是一律回第一页 | 🟢 green |
| specs/frontend--page-admin-logs/spec.md → AdminLogs 移动端日志详情与 320px 收缩 | 390px 与 768px 展开日志详情 | src/test/AdminLogsMobile.test.jsx | tc_logs_01_mobile_390_768_expand_collapse | 🟢 green |
| specs/frontend--page-admin-logs/spec.md → AdminLogs 移动端日志详情与 320px 收缩 | 320px 统计区收缩且详情不溢出 | src/test/AdminLogsMobile.test.jsx | tc_logs_02_320_side_contract | 🟢 green |
| specs/frontend--page-admin-logs/spec.md → AdminLogs 移动端日志详情与 320px 收缩 | 1440px 桌面保持 antd 展开与分页 | src/test/AdminLogs.test.jsx | 展开行显示前→后对比（状态值翻译） | 🟢 green |
| specs/frontend--page-admin-logs/spec.md → AdminLogs 移动端日志详情与 320px 收缩 | 长日志详情在 320px 内可读 | src/test/AdminLogsMobile.test.jsx | tc_logs_03_long_detail_320 | 🟢 green |
| specs/frontend--page-container-detail-page/spec.md → ContainerDetailPage 窄屏布局不横向溢出且长内容可读 | 390px 长标题与长 bind 路径 | src/test/DetailPagesLayout.test.js | tc_container_css_01_390_title_path | 🟢 green |
| specs/frontend--page-container-detail-page/spec.md → ContainerDetailPage 窄屏布局不横向溢出且长内容可读 | 320px 长运行指标文案 | src/test/DetailPagesLayout.test.js | tc_container_css_02_320_metrics | 🟢 green |
| specs/frontend--page-container-detail-page/spec.md → ContainerDetailPage 窄屏布局不横向溢出且长内容可读 | 768px 与桌面的共享布局 | src/test/DetailPagesLayout.test.js | tc_container_css_03_768_desktop | 🟢 green |
| specs/frontend--page-container-detail-page/spec.md → ContainerDetailPage 窄屏布局不横向溢出且长内容可读 | 缺少 bind 路径或存在无空格长串 | src/test/ContainerDetailBindPath.test.jsx | it.each(%s 显示未记录且没有复制候选) | 🟢 green |
| specs/frontend--page-machine-detail-page/spec.md → MachineDetailPage 窄屏共享布局不横向溢出 | 390px 长机器名与长指标文案 | src/test/DetailPagesLayout.test.js | tc_machine_css_01_390 | 🟢 green |
| specs/frontend--page-machine-detail-page/spec.md → MachineDetailPage 窄屏共享布局不横向溢出 | 320px 长 GPU 名称与限制说明 | src/test/DetailPagesLayout.test.js | tc_machine_css_02_320 | 🟢 green |
| specs/frontend--page-machine-detail-page/spec.md → MachineDetailPage 窄屏共享布局不横向溢出 | 768px 与桌面的共享布局 | src/test/DetailPagesLayout.test.js | tc_machine_css_03_768_desktop | 🟢 green |
| specs/frontend--page-machine-detail-page/spec.md → MachineDetailPage 窄屏共享布局不横向溢出 | 可选指标缺失时仍保持布局 | src/test/DetailPagesLayout.test.js | tc_machine_css_04_optional_metrics | 🟢 green |

## Coverage Notes

- 每个 `#### Scenario:` 均映射到至少一个具名测试；59 个场景对应 59 行，映射未被新增契约测试替换或删减。
- 新增直接组件测试 `src/test/TableComponent.test.jsx` 共 19 个：18 个映射场景，另加 `tc_table_19_rendered_long_target_is_not_compact` 防止 React 长目标文本被 `[object Object]` 长度误判为紧凑两列；覆盖 columns/children、空列/空数据、受控/未受控、`showExpandColumn:false`、`rowExpandable` 缺省/false、分页与空态。
- 新增移动页面交互测试 `src/test/DeletedContainersMobile.test.jsx` 17 个、`src/test/AdminLogsMobile.test.jsx` 4 个：AdminLogs 除 3 个场景外，另加 `tc_logs_04_week_and_toolbar_wrap_contract` 锁定 320px 周次 Space/详情工具条换行与日期 nowrap；保留 `DeletedContainers.test.jsx`、`DeletedContainersDisplay.test.jsx`、`DeletedContainersMountUsage.test.jsx`、`AdminLogs.test.jsx`、`ContainerDetailBindPath.test.jsx` 等既有流程回归，不重构测试目录。
- `src/test/DetailPagesLayout.test.js` 的 7 个测试只是 CSS 契约测试：jsdom 不计算真实 `scrollWidth`/`getBoundingClientRect`，因此它们只锁定共享 `min(460px, 100%)`、`min-width: 0`、换行与 `min(300px, 100%)` 规则，不宣称真实宽度或日期范围高度通过。真实 320/390/768/1440 布局与交互由父代理独占的外置浏览器脚本补足：26 cases / 315 checks 全部通过，`verified-complete/results.json` 的 sourceHashes 与当前一致；本会话不修改该脚本。
- 红绿证据：`02-red-targeted.log` 为首批 45 个测试的初始红（33 failed / 12 passed）；`09-red-adminlogs-css.log` 为 `tc_logs_04` 红（1 failed / 3 passed），`10-green-adminlogs-css.log` 为 AdminLogsMobile/AdminLogs 绿（15/15）；`13-full-npm-test-adminlogs-css.log` 为 `tc_table_19` 红，compact 判定补强后 `14-targeted-after-compact-fix.log` 为 TableComponent 19/19 绿；`04-green-targeted.log` 为首批 45/45 绿，`05-green-regression.log` 为既有定向回归 81/81 绿。
- 最终计数以父代理 `final-full-npm-test.log` 为准：15:38 退出 0，前端 68 files / 652 tests、server 40 tests 全部通过；`final-table-contract.log` 19 通过。本会话 `15`、`16` 次全量运行出现不同既有用例 5 秒超时（`HomeEligibility`、`DeletedContainersMountUsage`），对应用例此前曾在定向回归中通过，父代理完整全量亦通过；随后两文件并行定向复核出现 3 项 5 秒超时，记录在 timeout-investigation.log；该间歇性超时原因尚未充分证明，只保留日志记录，不再反复全量重跑，`17` 次运行由父代理停止。
- `tasks.md` 6.5 已勾：真实浏览器与最终 `verify.md` 由父代理完成，本会话只记录外部证据，不宣称本会话跑过浏览器。

- 超时复核补充：`node scripts/tests/run-vitest.mjs run src/test/HomeEligibility.test.jsx src/test/DeletedContainersMountUsage.test.jsx --maxWorkers=1` 为 2 文件 / 28 项全部通过，未改断言或 5 秒默认配置；记录在仓库外 serial-timeout-investigation.log。并行运行稳定性仍作为警告保留，不推断唯一根因。
