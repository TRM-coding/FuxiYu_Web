# Register 测试覆盖

规格：[spec.md](spec.md)

## 台账状态

- 主 spec SHA256：`ae763cd8d747b70d44ad55d8923d2b730489de56a82088e802d5b9a31a57516f`
- 本轮映射：已覆盖 5；部分覆盖 0；待复核 6。
- 测试基线：固定版 Web 代码 `a98e51d`；验收文档 HEAD `372fb80`。本轮只同步文档，未重跑业务套件。
- 运行证据：B 组 9/144；`Register.test.jsx` 的 Q36/Q37 用例通过；固定版 `npm test` 64/605+40。
- 定向证据：B 组 9 files/144（`.git/parent-b-acceptance.log`）。
- 限制：jsdom 组件测试；真实浏览器/E2E/视觉验收未运行；CI Node 20.19.0/22 未实际远程运行；本轮未重跑业务套件。

## 当前场景映射

| Requirement | Scenario | 覆盖状态 | 测试位置与 nodeid/参数 | 验证范围或缺口 |
| --- | --- | --- | --- | --- |
| Register 页面入口与身份 | 装配页面 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| Register 主流程 | 验证码验证失败或注册冲突 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| Register 构建归属 | 生成生产产物 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| Register 登录布局与 3D 预览的独立加载 | 模型仍未就绪 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| Register 登录布局与 3D 预览的独立加载 | 模型正常就绪 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| Register 登录布局与 3D 预览的独立加载 | 模型导入被拒绝 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| Register 删除无效 validateMessages 配置并保留字段规则 | 非法用户名仍显示字段规则消息 | 已覆盖 | ../../../src/test/Register.test.jsx::test_q36_register_field_rule_message | 断言「非法用户名仍显示字段规则消息」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| Register 删除无效 validateMessages 配置并保留字段规则 | 源码不再配置 validateMessages | 已覆盖 | ../../../src/test/Register.test.jsx::test_q36_register_no_validate_messages | 断言「源码不再配置 validateMessages」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| Register 注册与验证码错误按现有协议映射 | 请求验证码域名被拒展示中文 | 已覆盖 | ../../../src/test/Register.test.jsx::test_q37_register_request_code_domain_mapping | 断言「请求验证码域名被拒展示中文」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| Register 注册与验证码错误按现有协议映射 | 注册验证码必填或失效展示中文 | 已覆盖 | ../../../src/test/Register.test.jsx::test_q37_register_code_mapping | 断言「注册验证码必填或失效展示中文」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| Register 注册与验证码错误按现有协议映射 | 注册调用点传递结构化对象 | 已覆盖 | ../../../src/test/Register.test.jsx::test_q37_register_structured_call | 断言「注册调用点传递结构化对象」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |

## 最近验证

- 时间：2026-10-21 04:01:26 +08:00（固定提交npm test起始时间；本轮归档未重跑）。
- 版本：Web 代码 `a98e51d`；验收文档 `372fb80`。
- 主 spec SHA256：`ae763cd8d747b70d44ad55d8923d2b730489de56a82088e802d5b9a31a57516f`。
- 命令与环境：固定版 `npm test`（Node v26.8.1）→ 64 files/605 + 40 tests，0 failed/0 skipped/0 todo；本 capability 定向证据：B 组 9 files/144（`.git/parent-b-acceptance.log`）。
- 结果：新增/修改场景按上表具名测试或机械检查映射；未把 skip/excluded 或未运行项写成通过。
- 限制或尚未运行项：jsdom 组件测试；真实浏览器/E2E/视觉验收未运行；CI Node 20.19.0/22 未实际远程运行；本轮未重跑业务套件。
