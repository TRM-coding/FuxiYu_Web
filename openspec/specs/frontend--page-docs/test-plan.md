# Docs 测试覆盖

规格：[spec.md](spec.md)

## 台账状态

- 主 spec SHA256：`73a7a45956ed88cd0433e15da99de0127b28879a55254bb5abf037d7d173194b`
- 本轮映射：已覆盖 3；部分覆盖 0；待复核 3。
- 测试基线：固定版 Web 代码 `a98e51d`；验收文档 HEAD `372fb80`。本轮只同步文档，未重跑业务套件。
- 运行证据：docs 集成 3/3（`.git/apply-worker-green-docs2.log`）；C 组 19/189；固定版 `npm test` 64/605+40；`npm run build` 成功。
- 定向证据：docs 集成 3/3 + C 组 19/189。
- 限制：Docs 清理为机械检查与构建验证；真实浏览器/E2E 未运行；CI Node 20.19.0/22 未实际远程运行；本轮未重跑业务套件。

## 当前场景映射

| Requirement | Scenario | 覆盖状态 | 测试位置与 nodeid/参数 | 验证范围或缺口 |
| --- | --- | --- | --- | --- |
| Docs 页面入口与身份 | 装配页面 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| Docs 主流程 | 点击目录项 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| Docs 构建归属 | 生成生产产物 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| Docs 页面只保留生产可达资源 | 零引用资源删除且构建通过 | 已覆盖 | ../../../scripts/tests/docs-cleanup.integration.mjs::test_q36_docs_zero_ref_removed | 断言零引用文件删除且 `npm run build` 通过；docs 集成 3/3。 |
| Docs 页面只保留生产可达资源 | 仍被引用的 statusDisplay 保留 | 已覆盖 | ../../../scripts/tests/docs-cleanup.integration.mjs::test_q36_docs_keeps_referenced_status_display | 断言 `statusDisplay` 保留且引用扫描通过。 |
| Docs 页面只保留生产可达资源 | 有引用的资源不得删除 | 已覆盖 | ../../../scripts/tests/docs-cleanup.integration.mjs::test_q36_docs_referenced_file_guard | 断言有引用时守护检查失败，不能删除。 |

## 最近验证

- 时间：2026-10-21 04:01:26 +08:00（固定提交npm test起始时间；本轮归档未重跑）。
- 版本：Web 代码 `a98e51d`；验收文档 `372fb80`。
- 主 spec SHA256：`73a7a45956ed88cd0433e15da99de0127b28879a55254bb5abf037d7d173194b`。
- 命令与环境：固定版 `npm test`（Node v26.8.1）→ 64 files/605 + 40 tests，0 failed/0 skipped/0 todo；本 capability 定向证据：docs 集成 3/3 + C 组 19/189。
- 结果：新增/修改场景按上表具名测试或机械检查映射；未把 skip/excluded 或未运行项写成通过。
- 限制或尚未运行项：Docs 清理为机械检查与构建验证；真实浏览器/E2E 未运行；CI Node 20.19.0/22 未实际远程运行；本轮未重跑业务套件。
