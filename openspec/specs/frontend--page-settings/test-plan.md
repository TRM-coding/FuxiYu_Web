# Settings 测试覆盖

规格：[spec.md](spec.md)

## 台账状态

- 主 spec SHA256：`a765088718d385623c1aed4bb856ceb5c4eda2a0064225c00eaa77bc669f955c`
- 本轮映射：已覆盖 9；部分覆盖 0；待复核 3。
- 测试基线：固定版 Web 代码 `a98e51d`；验收文档 HEAD `372fb80`。本轮只同步文档，未重跑业务套件。
- 运行证据：B 组 9/144；`Settings.test.jsx` 的 Q23/Q37 用例通过；固定版 `npm test` 64/605+40。
- 定向证据：B 组 9 files/144（`.git/parent-b-acceptance.log`）。
- 限制：jsdom 组件测试；真实浏览器/E2E/视觉验收未运行；CI Node 20.19.0/22 未实际远程运行；本轮未重跑业务套件。

## 当前场景映射

| Requirement | Scenario | 覆盖状态 | 测试位置与 nodeid/参数 | 验证范围或缺口 |
| --- | --- | --- | --- | --- |
| Settings 页面入口与身份 | 装配页面 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| Settings 主流程 | 合法设置更新成功 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| Settings 构建归属 | 生成生产产物 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| Settings 整数与提醒节点必须完整校验 | 整数合法值可提交 | 已覆盖 | ../../../src/test/Settings.test.jsx::test_q23_settings_integer_valid | 断言「整数合法值可提交」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| Settings 整数与提醒节点必须完整校验 | 整数输入小数被拒 | 已覆盖 | ../../../src/test/Settings.test.jsx::test_q23_settings_integer_decimal_rejected | 断言「整数输入小数被拒」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| Settings 整数与提醒节点必须完整校验 | 合法提醒节点可提交 | 已覆盖 | ../../../src/test/Settings.test.jsx::test_q23_settings_reminder_valid | 断言「合法提醒节点可提交」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| Settings 整数与提醒节点必须完整校验 | 非法提醒节点指出具体字段 | 已覆盖 | ../../../src/test/Settings.test.jsx::test_q23_settings_reminder_invalid_field | 断言「非法提醒节点指出具体字段」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| Settings GROUP_ORDER 与后端实际分组一致 | 分组顺序与后端一致 | 已覆盖 | ../../../src/test/Settings.test.jsx::test_q23_settings_group_order | 断言「分组顺序与后端一致」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| Settings GROUP_ORDER 与后端实际分组一致 | 未知分组排最后 | 已覆盖 | ../../../src/test/Settings.test.jsx::test_q23_settings_unknown_group_last | 断言「未知分组排最后」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| Settings 错误保留结构化原因并兼容既有字符串 | invalid_setting 展示中文 | 已覆盖 | ../../../src/test/Settings.test.jsx::test_q37_settings_invalid_setting_mapping | 断言「invalid_setting 展示中文」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| Settings 错误保留结构化原因并兼容既有字符串 | update_failed 展示中文 | 已覆盖 | ../../../src/test/Settings.test.jsx::test_q37_settings_update_failed_mapping | 断言「update_failed 展示中文」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| Settings 错误保留结构化原因并兼容既有字符串 | 只传字符串时仍可读 | 已覆盖 | ../../../src/test/Settings.test.jsx::test_q37_settings_string_compatibility | 断言「只传字符串时仍可读」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |

## 最近验证

- 时间：2026-10-21 04:01:26 +08:00（固定提交npm test起始时间；本轮归档未重跑）。
- 版本：Web 代码 `a98e51d`；验收文档 `372fb80`。
- 主 spec SHA256：`a765088718d385623c1aed4bb856ceb5c4eda2a0064225c00eaa77bc669f955c`。
- 命令与环境：固定版 `npm test`（Node v26.8.1）→ 64 files/605 + 40 tests，0 failed/0 skipped/0 todo；本 capability 定向证据：B 组 9 files/144（`.git/parent-b-acceptance.log`）。
- 结果：新增/修改场景按上表具名测试或机械检查映射；未把 skip/excluded 或未运行项写成通过。
- 限制或尚未运行项：jsdom 组件测试；真实浏览器/E2E/视觉验收未运行；CI Node 20.19.0/22 未实际远程运行；本轮未重跑业务套件。
