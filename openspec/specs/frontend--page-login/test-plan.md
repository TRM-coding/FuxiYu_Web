# Login 测试覆盖

规格：[spec.md](spec.md)

## 台账状态

- 主 spec SHA256：`f4f3c72cf77974247ab00d6c614dd026afa4ee8fa4ad6a0a3dd9ba1054903c38`
- 本轮映射：已覆盖 3；部分覆盖 0；待复核 6。
- 测试基线：固定版 Web 代码 `a98e51d`；验收文档 HEAD `372fb80`。本轮只同步文档，未重跑业务套件。
- 运行证据：C 组 19/189；`Login.test.jsx` 的 Q36 用例通过；固定版 `npm test` 64/605+40。
- 定向证据：C 组 19 files/189（`.git/apply-worker-final3-web.log`）。
- 限制：jsdom 组件测试；真实浏览器/E2E/视觉验收未运行；CI Node 20.19.0/22 未实际远程运行；本轮未重跑业务套件。

## 当前场景映射

| Requirement | Scenario | 覆盖状态 | 测试位置与 nodeid/参数 | 验证范围或缺口 |
| --- | --- | --- | --- | --- |
| Login 页面入口与身份 | 装配页面 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| Login 主流程 | 权限快照刷新失败 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| Login 构建归属 | 生成生产产物 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| Login 登录布局与 3D 预览的独立加载 | 模型仍未就绪 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| Login 登录布局与 3D 预览的独立加载 | 模型正常就绪 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| Login 登录布局与 3D 预览的独立加载 | 模型导入被拒绝 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| Login 删除 userMsg 死分支与调试 console 并保留结构化错误 | 登录失败展示后端结构化错误 | 已覆盖 | ../../../src/test/Login.test.jsx::test_q36_login_structured_error | 断言「登录失败展示后端结构化错误」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| Login 删除 userMsg 死分支与调试 console 并保留结构化错误 | 网络失败仍显示中文兜底 | 已覆盖 | ../../../src/test/Login.test.jsx::test_q36_login_network_fallback | 断言「网络失败仍显示中文兜底」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| Login 删除 userMsg 死分支与调试 console 并保留结构化错误 | 源码不再包含 userMsg 与调试 console | 已覆盖 | ../../../src/test/Login.test.jsx::test_q36_login_no_dead_branch_or_debug_console | 断言「源码不再包含 userMsg 与调试 console」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |

## 最近验证

- 时间：2026-10-21 04:01:26 +08:00（固定提交npm test起始时间；本轮归档未重跑）。
- 版本：Web 代码 `a98e51d`；验收文档 `372fb80`。
- 主 spec SHA256：`f4f3c72cf77974247ab00d6c614dd026afa4ee8fa4ad6a0a3dd9ba1054903c38`。
- 命令与环境：固定版 `npm test`（Node v26.8.1）→ 64 files/605 + 40 tests，0 failed/0 skipped/0 todo；本 capability 定向证据：C 组 19 files/189（`.git/apply-worker-final3-web.log`）。
- 结果：新增/修改场景按上表具名测试或机械检查映射；未把 skip/excluded 或未运行项写成通过。
- 限制或尚未运行项：jsdom 组件测试；真实浏览器/E2E/视觉验收未运行；CI Node 20.19.0/22 未实际远程运行；本轮未重跑业务套件。
