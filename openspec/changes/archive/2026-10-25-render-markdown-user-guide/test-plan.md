## Test Plan

每个场景映射到可执行测试或真实命令；状态以 2026-10-24 本轮最终运行结果为准。

| Requirement | Scenario | Test File | Test Name | Initial State |
|-------------|----------|-----------|-----------|---------------|
| specs/frontend--page-docs/spec.md → Docs 页面入口与身份 | 装配页面 | `src/test/DocsPage.test.jsx` | `从已复制指南渲染正文与 15 项目录，不渲染旧硬编码章节` | 🟢 green（红态：`red-web-docs-markdown.log`） |
| specs/frontend--page-docs/spec.md → Docs 页面入口与身份 | 旧正文残留被拒绝 | `scripts/tests/docs-cleanup.integration.mjs` | `test_q36_docs_old_hardcoded_body_removed` | 🟢 green（红态：`red-docs-cleanup-integration.log`） |
| specs/frontend--page-docs/spec.md → Docs 主流程 | 点击目录项 | `src/test/DocsMarkdown.test.jsx` | `点击目录按钮时聚焦标题、平滑滚动且不改 URL hash` | 🟢 green（红态：同上） |
| specs/frontend--page-docs/spec.md → Docs 主流程 | 减少动态效果 | `src/test/DocsMarkdown.test.jsx` | `reduced-motion 时使用 auto 滚动` | 🟢 green（红态：同上） |
| specs/frontend--page-docs/spec.md → Docs 主流程 | 标题 id 的唯一性与 AST 来源 | `src/test/DocsMarkdown.test.jsx` | `按 H1-H3 建立层级、唯一中文 id，并忽略代码块假标题`；`渲染真实目录按钮、唯一 docs- id，并跳过代码块假标题`；`标题 id 使用 docs- 前缀，不与页面已有 DOM id 冲突` | 🟢 green（红态：同上） |
| specs/frontend--page-docs/spec.md → Docs 构建归属 | 生成生产产物 | `npm run build` | `vite-build` | 🟢 green（构建命令，无单测红态；`build-after-fixes.log`） |
| specs/frontend--page-docs/spec.md → Docs 构建归属 | 外部路径依赖被拒绝 | `scripts/tests/docs-cleanup.integration.mjs` | `test_q36_docs_no_global_repository_dependency` | 🟢 green（红态：`red-docs-cleanup-integration.log`） |
| specs/frontend--page-docs/spec.md → Docs 页面只保留生产可达资源 | 零引用资源删除且构建通过 | `scripts/tests/docs-cleanup.integration.mjs`；`npm run build` | `test_q36_docs_zero_ref_removed`；`vite-build` | 🟢 green（`red-docs-cleanup-integration.log` → `build-after-fixes.log`） |
| specs/frontend--page-docs/spec.md → Docs 页面只保留生产可达资源 | 仍被引用的 statusDisplay 保留 | `scripts/tests/docs-cleanup.integration.mjs` | `test_q36_docs_keeps_shared_status_display` | 🟢 green（红态：`red-docs-cleanup-integration.log`） |
| specs/frontend--page-docs/spec.md → Docs 页面只保留生产可达资源 | 有引用的资源不得删除 | `scripts/tests/docs-cleanup.integration.mjs` | `test_q36_docs_referenced_file_guard` | 🟢 green（红态：`red-docs-cleanup-integration.log`） |
| specs/frontend--page-docs/spec.md → Docs Markdown 正文字节保真 | 字节与哈希一致 | `scripts/tests/docs-cleanup.integration.mjs` | `test_q36_docs_guide_bytes_are_source_faithful` | 🟢 green（红态：`red-docs-cleanup-integration.log`） |
| specs/frontend--page-docs/spec.md → Docs Markdown 正文字节保真 | 换行被 Git 改写 | `scripts/tests/docs-cleanup.integration.mjs`；`git check-attr text -- src/content/USER_GUIDE_v1.md` | `test_q36_docs_gitattributes_preserve_guide_bytes`；`git check-attr` | 🟢 green（`text: unset`） |
| specs/frontend--page-docs/spec.md → Docs Markdown 正文字节保真 | 副本内容偏离 | `scripts/tests/docs-cleanup.integration.mjs` | `test_q36_docs_guide_bytes_are_source_faithful` | 🟢 green（长度 6052、SHA256 匹配） |
| specs/frontend--page-docs/spec.md → Docs Markdown 安全渲染与 GFM 能力 | 安全链接与原始 HTML | `src/test/DocsMarkdown.test.jsx` | `外链补 rel、危险协议被默认安全转换拦下、原始 HTML 不可执行` | 🟢 green（红态：`red-web-docs-markdown.log`） |
| specs/frontend--page-docs/spec.md → Docs Markdown 安全渲染与 GFM 能力 | 正文内部锚点保持 HashRouter | `src/test/DocsMarkdown.test.jsx` | `正文内部锚点聚焦目标并滚动，不改变 HashRouter 的 hash` | 🟢 green（父级 review 后新增的缺陷回归；测试随修复加入，未伪造红态） |
| specs/frontend--page-docs/spec.md → Docs Markdown 安全渲染与 GFM 能力 | GFM 表格与代码块 | `src/test/DocsMarkdown.test.jsx` | `GFM 表格包在局部滚动容器，代码块有可复制结构` | 🟢 green（红态：`red-web-docs-markdown.log`） |
| specs/frontend--page-docs/spec.md → Docs Markdown 安全渲染与 GFM 能力 | 复制代码成功与失败 | `src/test/DocsMarkdown.test.jsx` | `Clipboard 成功时复制完整代码并显示“已复制”`；`Clipboard 拒绝但 execCommand 回退成功时仍显示“已复制”`；`Clipboard 与 execCommand 都失败时显示“复制失败”且不崩溃` | 🟢 green（红态：`red-web-docs-markdown.log`） |
| specs/frontend--page-docs/spec.md → Docs 阅读布局与响应式目录 | 桌面两栏与移动折叠 | `src/test/DocsMarkdown.test.jsx`；`E:/AI/Fuxi_audit_artifacts/help-markdown-2026-10-24/browser-help-local.mjs` | `同时提供桌面目录和默认折叠的移动目录`；`browser-matrix` | 🟢 green（1440 两栏、390/320 折叠；`browser-help-local.json`） |
| specs/frontend--page-docs/spec.md → Docs 阅读布局与响应式目录 | 窄屏横向溢出防护 | `E:/AI/Fuxi_audit_artifacts/help-markdown-2026-10-24/browser-help-local.mjs`；`scripts/tests/docs-cleanup.integration.mjs` | `browser-matrix`；`test_q36_docs_responsive_local_scroll_contract` | 🟢 green（320/390/768/1440/1201/1024 均 `documentWidth <= viewport`） |
| specs/frontend--page-docs/spec.md → Docs 阅读布局与响应式目录 | 移动端标题定位 | `E:/AI/Fuxi_audit_artifacts/help-markdown-2026-10-24/browser-help-local.mjs` | `browser-matrix`（targetTop >= 56） | 🟢 green（320/390/768） |
| specs/frontend--page-docs/spec.md → Docs 阅读布局与响应式目录 | 移动端先折叠再定位 | `src/test/DocsMarkdown.test.jsx` | `移动端选择目录项时先折叠，再在下一帧滚动` | 🟢 green（红态：`red-web-docs-markdown.log`） |
| specs/frontend--page-docs/spec.md → Docs 阅读布局与响应式目录 | 帮助页滑动手势隔离 | `src/test/DocsMarkdown.test.jsx` | `TOC、代码块与表格拦截触摸冒泡，正文空白仍可冒泡` | 🟢 green（外部 review R6 后新增的缺陷回归；测试随修复加入，未伪造红态） |

## Coverage Notes

- 红态证据：`E:/AI/Fuxi_audit_artifacts/help-markdown-2026-10-24/red-web-docs-markdown.log`（新 Docs 测试在旧页面上失败）与 `red-docs-cleanup-integration.log`（新清理/字节守护在旧实现上失败）。
- 未伪造红态：正文内部锚点、触摸冒泡隔离及复制 fallback 分支是父级 review/浏览器缺陷修复后新增的回归覆盖；它们在修复时加入，未声称先运行过红灯。build 与 browser matrix 为后置机械/浏览器验收，不是单测红绿流程。
- 绿态命令与结果：`npm run test:web -- src/test/DocsMarkdown.test.jsx src/test/DocsPage.test.jsx` → 2 files / 16 tests passed；`node --test scripts/tests/docs-cleanup.integration.mjs` → 8/8 passed；`npm run lint` → 0 problems；`npm run build` → Vite build passed（Docs chunk 输出）。
- 浏览器证据：`browser-help-local.mjs` 在 1440/1201/1024/768/390/320 六个宽度通过，输出 `browser-help-local.json`，6 张截图在外部 artifact 目录；使用 reduced-motion、真实目录 button、复制、焦点与 hash 断言。父级 `browser-help.mjs` 当前版本在 390 的 TOC/代码横滑断言已通过，但其手工注入 React 表格 fixture 的 `createRoot` 导入失败；本地副本使用同一浏览器环境完成矩阵，表格/代码局部滚动另由组件 fixture 与 CSS 守护测试覆盖，未改父级脚本。
- 字节证据：Global 源与 Web 副本读取同一字节数组，`source_bytes=6052`、`copy_bytes=6052`、SHA256 均为 `4C2DEA950538717E5608A654692B6CC8A0B61DA18F84578A6EA9735893D2BF34`；`git check-attr text` 为 `unset`。
- 全量 `npm test`：`full-npm-test.log` 在 2026-10-24 23:42:55 被外部 harness 中断，停在 RbacMatrix 的通过用例，未写入 Test Files/Tests 总结；按用户指示未重启/重复整套。该日志保留原样，不作为全量通过证据；本 change 使用上述定向 Web/集成测试、lint、build 和真实浏览器矩阵验收。
- 暂存 blob 校验、主规格同步、archive 与 commit 均为父级门禁；本实现未执行这些动作。父级提交前仍需按 R3 核验暂存 blob。
