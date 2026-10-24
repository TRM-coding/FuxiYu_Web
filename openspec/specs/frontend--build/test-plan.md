# 前端构建与分包 测试覆盖

规格：[spec.md](spec.md)

## 台账状态

- 主 spec SHA256：`9e855660c6cbbf320851299187f9dc6e5a1ef9070c34c8216aa99611b45ade86`
- 本轮映射：已覆盖 8；部分覆盖 0；待复核 16。
- 测试基线：固定版 Web 代码 `a98e51d`；验收文档 HEAD `372fb80`。本轮只同步文档，未重跑业务套件。
- 运行证据：`npm run lint` exit 0，0 errors/0 warnings；`npm run build` exit 0；`npm test` 64 files/605 + 40，0 failed/0 skipped/0 todo；CI 矩阵仅配置核对。
- 定向证据：Q28/Q29 机械检查；`npm run lint` exit 0/0；`npm run build` exit 0（11.40s）；`npm test` 64/605+40。
- 限制：真实浏览器/E2E 未运行；CI Node 20.19.0/22 未实际远程执行；本地实际环境为 Node v26.8.1；本轮未重跑。

## 当前场景映射

| Requirement | Scenario | 覆盖状态 | 测试位置与 nodeid/参数 | 验证范围或缺口 |
| --- | --- | --- | --- | --- |
| 构建告警与压缩保持默认 | 出现超阈值 chunk | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| 构建告警与压缩保持默认 | 以调阈值规避警告 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| 同一模块只采用一种导入方式 | 混合导入被检出 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| 同一模块只采用一种导入方式 | 统一后的生产构建 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| 页面与共同布局按需加载且路由不变 | 异步 chunk 尚未就绪 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| 页面与共同布局按需加载且路由不变 | 路由与守卫逐条不变 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ModelViewer 独立懒加载与局部错误隔离 | 模型未就绪 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ModelViewer 独立懒加载与局部错误隔离 | 导入被拒绝或渲染抛错 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| 分包按实际 manualChunks 配置 | 模块 id 分组 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| 分包按实际 manualChunks 配置 | id 附带查询后缀 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| 依赖方向以产物检验后陈述 | 核对产物依赖 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| 分包原则由规格承载而非配置注释 | 整理配置注释 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| 不宣称依赖减少或首屏加速 | 未做浏览器测量 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| 构建产物不是持续运行入口 | 构建只产出静态产物 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| 构建产物不是持续运行入口 | 构建后的持续运行 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| 构建产物不是持续运行入口 | 不改构建配置补功能 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| 全仓 ESLint 必须零错误零警告 | 全仓 lint 通过 | 已覆盖 | 机械检查：`npm run lint` 的退出码、错误/警告数；父独立 exit 0（`.git/direct-q-parent-final-lint.log`），D 交接 34 文件 324 通过（`.git/lint-q28-tests.log`） | 机械检查：`npm run lint` exit 0，0 errors/0 warnings；`rg eslint-disable` 为空，无新增 `globalIgnores`/`--ignore-pattern`/规则 `off`。 |
| 全仓 ESLint 必须零错误零警告 | 禁用规则或忽略目录被拒 | 已覆盖 | 机械检查：`git diff -- eslint.config.js package.json` 与 `rg` 策略扫描（`eslint-disable`、`globalIgnores`、`--ignore-pattern`、规则 `off`）；无新增抑制、`rg eslint-disable` 为空 | 机械检查：`git diff -- eslint.config.js package.json` 与 rg 扫描确认无新增抑制或忽略。 |
| 所有测试入口自动兼容 Node 26 实验 Web Storage | Node 26 测试入口注入 flag | 已覆盖 | ../../../scripts/tests/test-entry-node26.integration.mjs::test_q29_node26_entry_injects_flag | 断言「Node 26 测试入口注入 flag」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| 所有测试入口自动兼容 Node 26 实验 Web Storage | 不支持 flag 的 Node 不注入 | 已覆盖 | ../../../scripts/tests/test-entry-node26.integration.mjs::test_q29_unsupported_node_no_injection | 断言「不支持 flag 的 Node 不注入」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| 所有测试入口自动兼容 Node 26 实验 Web Storage | 直接运行 test:web 同样注入 | 已覆盖 | ../../../scripts/tests/test-entry-node26.integration.mjs::test_q29_test_web_wrapper_injects_flag | 断言「直接运行 test:web 同样注入」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| 所有测试入口自动兼容 Node 26 实验 Web Storage | Node 26 完整前端套件通过 | 已覆盖 | 机械检查：`node --version`、`npm test` 的真实汇总（`test_q29_node26_full_suite`），不新增递归套件测试 | 机械检查：固定版 `npm test` 64 files/605 + 40，0 failed/0 skipped/0 todo（`.git/direct-q-fixed-commit-suite.log`）。 |
| Node 支持范围明确且覆盖新版本 | 支持范围与 CI 覆盖 | 已覆盖 | 机械检查：Node 命令核对 package/lock 的 engines 与 Vite 一致、CI 包含 20.19.0/22/26 | 机械检查：package/lock 的 `engines.node` 为 `^20.19.0 \|\| >=22.12.0`，CI 矩阵含 20.19.0/22/26；未实际远程运行 CI 20/22。 |
| Node 支持范围明确且覆盖新版本 | 单一旧版本或缺失范围被拒 | 已覆盖 | 机械检查：配置断言对缺失 engines、缺失版本矩阵或限制旧版返回失败，不额外制造配置测试文件 | 机械检查：对缺失 engines、仅允许旧版本或固定单一版本的负例断言失败。 |

## 最近验证

- 时间：2026-10-21 04:01:26 +08:00（固定提交npm test起始时间；本轮归档未重跑）。
- 版本：Web 代码 `a98e51d`；验收文档 `372fb80`。
- 主 spec SHA256：`9e855660c6cbbf320851299187f9dc6e5a1ef9070c34c8216aa99611b45ade86`。
- 命令与环境：固定版 `npm test`（Node v26.8.1）→ 64 files/605 + 40 tests，0 failed/0 skipped/0 todo；本 capability 定向证据：Q28/Q29 机械检查；`npm run lint` exit 0/0；`npm run build` exit 0（11.40s）；`npm test` 64/605+40。
- 结果：新增/修改场景按上表具名测试或机械检查映射；未把 skip/excluded 或未运行项写成通过。
- 限制或尚未运行项：真实浏览器/E2E 未运行；CI Node 20.19.0/22 未实际远程执行；本地实际环境为 Node v26.8.1；本轮未重跑。
