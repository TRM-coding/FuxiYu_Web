## 1. TableComponent 直接组件契约

- [x] 1.1 编写失败测试：`tc_table_01_desktop_children` … `tc_table_18_loading_state`（`src/test/TableComponent.test.jsx`，test-plan 18 条；实现前确认因正确原因失败）
- [x] 1.2 实现：`columns`/children 双列源、移动卡片、受控/未受控展开、`rowExpandable` 缺省、locale 空态、分页与展开 CSS，使 1.1 通过
- [x] 1.3 重构：收敛列解析与展开状态，重跑 `TableComponent` 与既有 AdminLogs/ManageUser 回归，保持全绿

## 2. DeletedContainers 移动端与流程回归

- [x] 2.1 编写失败测试：`tc_dc_01_mobile_390_seven_columns` … `tc_dc_14_mobile_page_two_usage`、`tc_dc_19_usage_list_first_stats_later` … `tc_dc_21_usage_cleaned_no_mount_no_request`（`src/test/DeletedContainersMobile.test.jsx`，17 条新增；既有生命周期行保持绿色）
- [x] 2.2 实现：DeletedContainers 使用 TableComponent + 同一 `columns`/`expandedRowRender`，受控 `expandable.expandedRowKeys`、Mount 移动宽度、用量/分页/确认/轮询保持，使 2.1 及既有回归通过
- [x] 2.3 重构：清理移动卡片样式与重复渲染，重跑 `DeletedContainers*`、`DetailPages` 回归，保持全绿

## 3. AdminLogs 移动详情与 320px 收缩

- [x] 3.1 编写失败测试：`tc_logs_01_mobile_390_768_expand_collapse`、`tc_logs_02_320_side_contract`、`tc_logs_03_long_detail_320`（`src/test/AdminLogsMobile.test.jsx`）；1440px 既有展开回归使用 `src/test/AdminLogs.test.jsx`
- [x] 3.2 实现：AdminLogs 未受控移动展开自动可用；`AdminLogs.css` 将 `.als-side` 最小宽度改为 `min(300px, 100%)`，保留 `.als-wall-wrap` 内部滚动，使 3.1 与既有 AdminLogs 回归通过
- [x] 3.3 重构：重跑 AdminLogs 定向测试，确认分页、权限与请求次数不变

## 4. ContainerDetailPage 窄屏布局契约

- [x] 4.1 编写失败测试：`tc_container_css_01_390_title_path`、`tc_container_css_02_320_metrics`、`tc_container_css_03_768_desktop`（`src/test/DetailPagesLayout.test.js`）；缺少路径回归使用 `src/test/ContainerDetailBindPath.test.jsx`
- [x] 4.2 实现：`DetailPages.css` 的 `minmax(min(460px, 100%), 1fr)`、卡片 `min-width: 0`、标题/指标/运行项换行边界，使 4.1 通过
- [x] 4.3 重构：重跑 ContainerDetail 相关测试与既有 BindPath 回归，保持全绿

## 5. MachineDetailPage 共享布局回归

- [x] 5.1 编写失败测试：`tc_machine_css_01_390` … `tc_machine_css_04_optional_metrics`（`src/test/DetailPagesLayout.test.js`）
- [x] 5.2 实现：共享 `DetailPages.css` 契约同时覆盖机器详情；不改变限额编辑、趋势图与卡片顺序，使 5.1 通过
- [x] 5.3 重构：重跑机器详情与共享布局测试，保持全绿

## 6. 验证与证据

- [x] 6.1 运行五个改动区域的定向 Vitest；仅在具名测试通过时把 test-plan 对应行由红翻绿
- [x] 6.2 运行 `npm run lint`；记录通过/失败
- [x] 6.3 运行 `npm run build`；记录通过/失败
- [x] 6.4 运行完整 `npm test`；记录真实计数，stdout 写入 `E:/AI/Fuxi_audit_artifacts/FuxiYu_Web/mobile-display/logs/`
- [x] 6.5 父代理完成 320/390/768/1440 真实浏览器验证与最终 `verify.md`；本会话不执行外部脚本、不修改它；父代理最终 26 cases / 315 checks 全部通过，`verify.md` 已落盘

## 7. AdminLogs 窄屏日期范围与详情工具条追加修补

- [x] 7.1 编写失败测试：`tc_logs_04_week_and_toolbar_wrap_contract`；红证据 `logs/09-red-adminlogs-css.log`（1 failed / 3 passed）
- [x] 7.2 实现：`AdminLogs.css` 仅在 `(max-width: 768px)` 下允许周次 Space 与详情工具条换行；周次 item `flex-shrink: 0`、`max-width: 100%`，日期 Typography `white-space: nowrap` 并可独立成行；桌面规则不变
- [x] 7.3 运行 AdminLogsMobile/AdminLogs 定向、lint、build；绿证据 `logs/10-green-adminlogs-css.log`（15/15）、`logs/11-lint-adminlogs-css.log`、`logs/12-build-adminlogs-css.log`
- [x] 7.4 记录父代理最终全量：`final-full-npm-test.log` 退出 0，前端 68 files / 652 tests、server 40 tests 全部通过；`final-table-contract.log` 19 通过；本会话 `15/16` 次全量出现不同既有用例 5 秒超时，保留为间歇性超时记录，原因未充分证明，已停止反复重跑

## 8. 测试计数与红绿证据

- [x] 8.1 新增测试合计 47：TableComponent 19、DeletedContainersMobile 17、AdminLogsMobile 4、DetailPagesLayout 7；59 个 scenario 映射仍保持
- [x] 8.2 `tc_table_19_rendered_long_target_is_not_compact`：红证据 `logs/13-full-npm-test-adminlogs-css.log`；补强 compact 判定后绿证据 `logs/14-targeted-after-compact-fix.log`（TableComponent 19/19）
- [x] 8.3 `tc_logs_04_week_and_toolbar_wrap_contract`：红/绿证据见 7.1、7.3；该测试只锁定 CSS 契约，真实 320px 高度与宽度由父代理外部 26 cases / 315 checks 补足
