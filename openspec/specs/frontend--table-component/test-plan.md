# TableComponent 测试覆盖

规格：[spec.md](spec.md)

## 台账状态

- 主 spec SHA256：`1a0b0aa44ebed91266d00ef1bc8167fd3e3c5040d13f015e199a7d7bbea7a343`
- 本轮映射：已覆盖 15；部分覆盖 3；待复核 0。
- 新增契约测试：`tc_table_19_rendered_long_target_is_not_compact` 不属于 18 个 scenario，作为额外回归记录在下方；TableComponent 文件共 19 个测试。
- 测试基线：最终实现 15:38 的全量证据；本变更新增 19 个 TableComponent 测试，全部通过。
- 限制：jsdom 组件测试不能单独证明真实 `scrollWidth`；标注“部分覆盖”的场景由父代理外置 Chromium 26 cases / 315 checks 补足。

## 当前场景映射

| Requirement | Scenario | 覆盖状态 | 测试位置与 nodeid/参数 | 验证范围或缺口 |
| --- | --- | --- | --- | --- |
| TableComponent 桌面与既有列定义兼容 | AdminLogs 的 children 用法保持桌面表格 | 已覆盖 | ../../../src/test/TableComponent.test.jsx::tc_table_01_desktop_children | 断言桌面 antd 表格、五列、展开图标与无移动卡片；当前文件 19/19 通过。 |
| TableComponent 桌面与既有列定义兼容 | 已删除容器页的 columns 数组生成桌面表格 | 已覆盖 | ../../../src/test/TableComponent.test.jsx::tc_table_02_desktop_columns | 断言 columns 数组列头顺序与桌面表格；当前文件 19/19 通过。 |
| TableComponent 桌面与既有列定义兼容 | 列定义为空或数据为空 | 已覆盖 | ../../../src/test/TableComponent.test.jsx::tc_table_03_empty_columns_data | 断言空列/空数据桌面空态、分页保留与无移动卡片。 |
| TableComponent 移动端卡片列渲染 | 390px 已删除列表按全部列渲染卡片 | 部分覆盖 | ../../../src/test/TableComponent.test.jsx::tc_table_04_mobile_columns_cards | 断言卡片、字段与操作；jsdom 不计算 `scrollWidth`，真实 390px 宽度由外部 26/315 补足。 |
| TableComponent 移动端卡片列渲染 | 320px 长路径和长名称不撑破页面 | 部分覆盖 | ../../../src/test/TableComponent.test.jsx::tc_table_05_mobile_320_long_content | 断言卡片渲染与 `overflow-wrap` 契约；真实 320px 宽度/遮挡由外部 26/315 补足。 |
| TableComponent 移动端卡片列渲染 | 本地多页数据只切当前本地页 | 已覆盖 | ../../../src/test/TableComponent.test.jsx::tc_table_06_mobile_local_slice | 断言 25 条、current=2/pageSize=10 只切 11–20，且不发请求。 |
| TableComponent 移动端卡片列渲染 | AdminLogs 在移动端保持既有字段与分页 | 已覆盖 | ../../../src/test/TableComponent.test.jsx::tc_table_07_mobile_admin_fields_pagination | 断言五列字段与分页入口；未受控展开由 `tc_table_12` 覆盖。 |
| TableComponent 移动端卡片列渲染 | 空数据保留空态与分页 | 已覆盖 | ../../../src/test/TableComponent.test.jsx::tc_table_08_mobile_empty_pagination | 断言移动空态、分页入口与无空白卡片。 |
| TableComponent 移动端受控展开 | 受控的 DeletedContainers 移动端展开与收起 | 已覆盖 | ../../../src/test/TableComponent.test.jsx::tc_table_09_controlled_expand_collapse | 断言受控 keys、`aria-expanded`、按钮与 `onExpand` 调用；不写内部状态。 |
| TableComponent 移动端受控展开 | 自定义展开列不重复出现按钮 | 已覆盖 | ../../../src/test/TableComponent.test.jsx::tc_table_10_custom_expand_no_duplicate | 断言 `showExpandColumn:false` 不渲染内置按钮，受控 keys 命中仍渲染详情。 |
| TableComponent 移动端受控展开 | 缺少受控更新回调 | 已覆盖 | ../../../src/test/TableComponent.test.jsx::tc_table_11_missing_controlled_callback | 断言无 `onExpandedRowsChange` 时不渲染无效按钮，不抛异常。 |
| TableComponent 移动端未受控展开 | 未受控的 AdminLogs 移动端展开日志详情 | 已覆盖 | ../../../src/test/TableComponent.test.jsx::tc_table_12_uncontrolled_admin_expand | 断言内部状态展开/收起、`aria-expanded` 与无额外请求；桌面 antd 行为保持。 |
| TableComponent 移动端未受控展开 | rowExpandable 未提供视为可展开 | 已覆盖 | ../../../src/test/TableComponent.test.jsx::tc_table_13_row_expandable_default | 断言缺省时显示可生效按钮，不抛 `rowExpandable is not a function`。 |
| TableComponent 移动端未受控展开 | rowExpandable 显式 false 禁用该行 | 已覆盖 | ../../../src/test/TableComponent.test.jsx::tc_table_14_row_expandable_false | 断言仅可展开行显示按钮，false 行不显示且不影响其他行。 |
| TableComponent 移动端分页、空态与加载 | 已删除列表在手机翻到第二页 | 已覆盖 | ../../../src/test/TableComponent.test.jsx::tc_table_15_pagination_page_two | 断言翻页调用 `onChange(2, 20)`，组件不自取数据。 |
| TableComponent 移动端分页、空态与加载 | 320px 分页入口不撑宽 | 部分覆盖 | ../../../src/test/TableComponent.test.jsx::tc_table_16_pagination_320_fit | 仅断言分页容器 `flex-wrap` CSS 契约；真实 320px 宽度由外部 26/315 补足。 |
| TableComponent 移动端分页、空态与加载 | 空页仍保留描述与翻页入口 | 已覆盖 | ../../../src/test/TableComponent.test.jsx::tc_table_17_empty_locale_description | 断言 `locale.emptyText` 中文描述与分页入口保留。 |
| TableComponent 移动端分页、空态与加载 | 加载中保持既有加载态 | 已覆盖 | ../../../src/test/TableComponent.test.jsx::tc_table_18_loading_state | 断言既有 `Spin` 加载态与无额外请求。 |

## 额外回归测试

- `tc_table_19_rendered_long_target_is_not_compact`：防止原始 target_id 较短时，把 render 返回的长 React 目标文本误判为紧凑两列；已覆盖。红证据 `13-full-npm-test-adminlogs-css.log`，绿证据 `14-targeted-after-compact-fix.log`（TableComponent 19/19）。该测试不属于 18 个 scenario，但随 TableComponent 文件计入 19 个测试。

## 最近验证

- 时间：2026-10-21 15:38 +08:00（父代理最终全量）。
- 版本：Web 当前工作区实现；主 spec SHA256 见上。
- 命令与环境：父代理 `npm test` 退出码 0 → 前端 68 files / 652 tests、server 40 tests，0 failed；`node scripts/tests/run-vitest.mjs run src/test/TableComponent.test.jsx --maxWorkers=2` → 19/19 通过。
- 真实浏览器：父代理外置 Chromium 26 cases / 315 checks 全部通过；`verified-complete/results.json` 的 sourceHashes 与当前实现一致。CSS 场景的真实宽度/日期高度由该外部结果补足，本台账不把 jsdom 契约测试写成像素通过。
- 稳定性限制：本会话第 15/16 次全量分别遇到既有 `DeletedContainersMountUsage`、`HomeEligibility` 的 5 秒超时；定向单 worker 28 项通过，父代理最终全量通过。间歇性超时原因尚未充分证明，保留为 warning，未据此修改测试或放宽超时。
- 限制或尚未运行项：未在本会话重跑真实浏览器；未验证真实后端、真实设备或 Safari。
