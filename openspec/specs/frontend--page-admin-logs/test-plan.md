# AdminLogs 测试覆盖

规格：[spec.md](spec.md)

## 台账状态

- 主 spec SHA256：`1ce0b3834c2f228a929e06c1b4f4c8cd3bff1a11c3b6fc42bcf19ef16dbaa54b`
- 本轮映射：已覆盖 3；部分覆盖 0；待复核 3。
- 测试基线：固定版 Web 代码 `a98e51d`；验收文档 HEAD `372fb80`。本轮只同步文档，未重跑业务套件。
- 运行证据：A 组 9 files/78；`AdminLogs.test.jsx` 的 Q22 用例通过；固定版 `npm test` 64/605+40。
- 定向证据：A 组 9 files/78（`.git/q28-handoff-a9-78-tests.log`）。
- 限制：jsdom 组件测试；真实浏览器/E2E/视觉验收未运行；CI Node 20.19.0/22 未实际远程运行；本轮未重跑业务套件。

## 当前场景映射

| Requirement | Scenario | 覆盖状态 | 测试位置与 nodeid/参数 | 验证范围或缺口 |
| --- | --- | --- | --- | --- |
| AdminLogs 页面入口与身份 | 装配页面 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| AdminLogs 主流程 | 切换周或过滤条件 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| AdminLogs 构建归属 | 生成生产产物 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| AdminLogs 查询结果必须匹配当前周次、筛选与分页 | 当前上下文响应应用 | 已覆盖 | ../../../src/test/AdminLogs.test.jsx::test_q22_admin_logs_current_response | 断言「当前上下文响应应用」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| AdminLogs 查询结果必须匹配当前周次、筛选与分页 | 旧周次响应晚到 | 已覆盖 | ../../../src/test/AdminLogs.test.jsx::test_q22_admin_logs_stale_week | 断言「旧周次响应晚到」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| AdminLogs 查询结果必须匹配当前周次、筛选与分页 | 旧筛选或旧页响应晚到 | 已覆盖 | ../../../src/test/AdminLogs.test.jsx::test_q22_admin_logs_stale_filter_page | 断言「旧筛选或旧页响应晚到」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |

## 最近验证

- 时间：2026-10-21 04:01:26 +08:00（固定提交npm test起始时间；本轮归档未重跑）。
- 版本：Web 代码 `a98e51d`；验收文档 `372fb80`。
- 主 spec SHA256：`1ce0b3834c2f228a929e06c1b4f4c8cd3bff1a11c3b6fc42bcf19ef16dbaa54b`。
- 命令与环境：固定版 `npm test`（Node v26.8.1）→ 64 files/605 + 40 tests，0 failed/0 skipped/0 todo；本 capability 定向证据：A 组 9 files/78（`.git/q28-handoff-a9-78-tests.log`）。
- 结果：新增/修改场景按上表具名测试或机械检查映射；未把 skip/excluded 或未运行项写成通过。
- 限制或尚未运行项：jsdom 组件测试；真实浏览器/E2E/视觉验收未运行；CI Node 20.19.0/22 未实际远程运行；本轮未重跑业务套件。
