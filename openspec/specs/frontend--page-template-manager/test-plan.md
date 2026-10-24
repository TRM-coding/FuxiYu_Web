# TemplateManager 测试覆盖

规格：[spec.md](spec.md)

## 台账状态

- 主 spec SHA256：`b8b1b660917b3124d2f327fe5f0d45c1e17766a2a0d87c815fcae602540f601e`
- 本轮映射：已覆盖 6；部分覆盖 0；待复核 3。
- 测试基线：固定版 Web 代码 `a98e51d`；验收文档 HEAD `372fb80`。本轮只同步文档，未重跑业务套件。
- 运行证据：A 组 9/78；`TemplateManager.test.jsx` 的 Q37/Q52 用例通过；固定版 `npm test` 64/605+40。
- 定向证据：A 组 9 files/78（`.git/q28-handoff-a9-78-tests.log`）。
- 限制：jsdom 组件测试；真实浏览器/E2E/视觉验收未运行；CI Node 20.19.0/22 未实际远程运行；本轮未重跑业务套件。

## 当前场景映射

| Requirement | Scenario | 覆盖状态 | 测试位置与 nodeid/参数 | 验证范围或缺口 |
| --- | --- | --- | --- | --- |
| TemplateManager 页面入口与身份 | 装配页面 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| TemplateManager 主流程 | 删除已经被公告或草稿引用的自定义模板 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| TemplateManager 构建归属 | 生成生产产物 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| TemplateManager 列表分页与深链定位 | 205 个模板分两页 | 已覆盖 | ../../../src/test/TemplateManager.test.jsx::test_q52_template_manager_205_pages | 断言「205 个模板分两页」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| TemplateManager 列表分页与深链定位 | 深链定位第 205 个模板 | 已覆盖 | ../../../src/test/TemplateManager.test.jsx::test_q52_template_manager_deep_link_205 | 断言「深链定位第 205 个模板」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| TemplateManager 列表分页与深链定位 | 无效模板 ID 不崩溃 | 已覆盖 | ../../../src/test/TemplateManager.test.jsx::test_q52_template_manager_invalid_id | 断言「无效模板 ID 不崩溃」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| TemplateManager 模板错误按现有协议映射 | 重名创建显示模板名称已存在 | 已覆盖 | ../../../src/test/TemplateManager.test.jsx::test_q37_template_known_reasons | 断言「重名创建显示模板名称已存在」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| TemplateManager 模板错误按现有协议映射 | 删除系统模板显示不可删除 | 已覆盖 | ../../../src/test/TemplateManager.test.jsx::test_q37_template_system_delete_mapping | 断言「删除系统模板显示不可删除」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| TemplateManager 模板错误按现有协议映射 | 未登记模板原因保留兜底 | 已覆盖 | ../../../src/test/TemplateManager.test.jsx::test_q37_template_unknown_reason | 断言「未登记模板原因保留兜底」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |

## 最近验证

- 时间：2026-10-21 04:01:26 +08:00（固定提交npm test起始时间；本轮归档未重跑）。
- 版本：Web 代码 `a98e51d`；验收文档 `372fb80`。
- 主 spec SHA256：`b8b1b660917b3124d2f327fe5f0d45c1e17766a2a0d87c815fcae602540f601e`。
- 命令与环境：固定版 `npm test`（Node v26.8.1）→ 64 files/605 + 40 tests，0 failed/0 skipped/0 todo；本 capability 定向证据：A 组 9 files/78（`.git/q28-handoff-a9-78-tests.log`）。
- 结果：新增/修改场景按上表具名测试或机械检查映射；未把 skip/excluded 或未运行项写成通过。
- 限制或尚未运行项：jsdom 组件测试；真实浏览器/E2E/视觉验收未运行；CI Node 20.19.0/22 未实际远程运行；本轮未重跑业务套件。
