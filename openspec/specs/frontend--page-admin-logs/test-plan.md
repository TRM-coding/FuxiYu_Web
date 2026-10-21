# AdminLogs 测试覆盖

规格：[spec.md](spec.md)

## 台账状态

- 主 spec SHA256：`4a8dc705b6a9b95fe5fdbe9b4ae0ba4411d680745645cedfcaa521f6afc382f0`
- 本轮映射：已覆盖 5；部分覆盖 2；待复核 3。
- 测试基线：当前工作区最终实现；保留 a98e51d 的 A 组历史记录。
- 运行证据：父代理最终 `npm test` 68 files/652 tests + server 40 tests，0 failed；`AdminLogsMobile.test.jsx` 当前 4/4，`AdminLogs.test.jsx` 11/11。
- 真实浏览器：父代理 26 cases / 315 checks 全部通过，`verified-complete/results.json` 的 sourceHashes 与当前实现一致；旧 353px 无详情入口为历史基线。
- 限制：jsdom/CSS 契约测试不计算真实 `scrollWidth`/日期范围高度；真实 320/390/768/1440 由外部浏览器补足；CI Node 20.19.0/22 未在本轮实际远程运行。

## 当前场景映射

| Requirement | Scenario | 覆盖状态 | 测试位置与 nodeid/参数 | 验证范围或缺口 |
| --- | --- | --- | --- | --- |
| AdminLogs 页面入口与身份 | 装配页面 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| AdminLogs 主流程 | 切换周或过滤条件 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| AdminLogs 构建归属 | 生成生产产物 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| AdminLogs 查询结果必须匹配当前周次、筛选与分页 | 当前上下文响应应用 | 已覆盖 | ../../../src/test/AdminLogs.test.jsx::test_q22_admin_logs_current_response | 断言「当前上下文响应应用」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| AdminLogs 查询结果必须匹配当前周次、筛选与分页 | 旧周次响应晚到 | 已覆盖 | ../../../src/test/AdminLogs.test.jsx::test_q22_admin_logs_stale_week | 断言「旧周次响应晚到」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| AdminLogs 查询结果必须匹配当前周次、筛选与分页 | 旧筛选或旧页响应晚到 | 已覆盖 | ../../../src/test/AdminLogs.test.jsx::test_q22_admin_logs_stale_filter_page | 断言「旧筛选或旧页响应晚到」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |

| AdminLogs 移动端日志详情与 320px 收缩 | 390px 与 768px 展开日志详情 | 已覆盖 | ../../../src/test/AdminLogsMobile.test.jsx::tc_logs_01_mobile_390_768_expand_collapse | 断言内部状态展开/收起、`aria-expanded`、详情内容与无额外请求；当前文件 4/4 通过。 |
| AdminLogs 移动端日志详情与 320px 收缩 | 320px 统计区收缩且详情不溢出 | 部分覆盖 | ../../../src/test/AdminLogsMobile.test.jsx::tc_logs_02_320_side_contract | 断言 `.als-side` 的 `min(300px, 100%)` CSS 契约与移动卡片；真实 320px `scrollWidth`、日期高度由外部 26/315 补足。 |
| AdminLogs 移动端日志详情与 320px 收缩 | 1440px 桌面保持 antd 展开与分页 | 已覆盖 | ../../../src/test/AdminLogs.test.jsx::展开行显示前→后对比（状态值翻译） | 断言桌面 antd 表格展开与详情；当前 `AdminLogs.test.jsx` 11/11 通过。 |
| AdminLogs 移动端日志详情与 320px 收缩 | 长日志详情在 320px 内可读 | 部分覆盖 | ../../../src/test/AdminLogsMobile.test.jsx::tc_logs_03_long_detail_320 | 断言长详情结构、换行类与收起按钮；真实 320px 宽度/高度由外部 26/315 补足；额外 `tc_logs_04` 锁定周次/工具条 wrap 契约。 |

## 最近验证

- 时间：2026-10-21 15:38 +08:00（父代理最终全量）；历史记录保留 2026-10-21 04:01:26 的 a98e51d 基线。
- 版本：当前工作区最终实现；历史基线 `a98e51d`。
- 主 spec SHA256：`4a8dc705b6a9b95fe5fdbe9b4ae0ba4411d680745645cedfcaa521f6afc382f0`。
- 命令与环境：父代理 `npm test` → 前端 68 files/652 tests、server 40 tests，0 failed；`AdminLogsMobile.test.jsx` 4/4、`AdminLogs.test.jsx` 11/11；历史 A 组 9 files/78 记录保留。
- 结果：新增/修改场景按上表具名测试或机械检查映射；CSS 契约场景标“部分覆盖”，不写成真实像素通过。
- 稳定性：本会话第 15/16 次全量遇到既有 `HomeEligibility`/`DeletedContainersMountUsage` 5 秒超时，单 worker 28 项通过，父代理最终全量通过；原因未充分证明，保留 warning。
- 限制或尚未运行项：jsdom 组件测试；真实浏览器补充见下；CI Node 20.19.0/22 未实际远程运行。

## 真实浏览器审计（历史与当前）

- 历史基线：320px 下 `.als-side` 固定 300px 最小宽度导致整页 353px；320/390/768px 无可用移动日志详情按钮。旧结果已不再代表当前实现。
- 当前补验：父代理 26 cases / 315 checks 全部通过，覆盖 320/390/768/1440px；`.als-side` 收缩、周次日期范围高度、移动详情展开、桌面 antd 展开与分页均通过；`verified-complete/results.json` 的 sourceHashes 与当前实现一致。
- 当前 `npm test` 68 files/652 tests + server 40 tests 通过；本会话 15/16 次全量的既有 5 秒超时已在上一段记录，单 worker 28 项通过，父代理最终全量通过。
- 未覆盖：真实后端、真实设备、其他浏览器、全部历史场景；本台账不把 CSS 契约测试当作真实宽度/高度证据。
