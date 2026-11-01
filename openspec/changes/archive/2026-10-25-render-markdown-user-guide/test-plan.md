# Test Plan

<!-- [X] 仅表示 test/check 映射已确认，不表示实际运行、通过或整个 Scenario 已覆盖。既有运行结果见 E:/AI/Fuxi_audit_artifacts/help-markdown-2026-10-24/ 的原始日志；本文件不复制结果。 -->

## frontend--page-docs

### Requirement: Docs 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] `src/test/DocsPage.test.jsx::从已复制指南渲染正文与 15 项目录，不渲染旧硬编码章节`
- Assertion scope: H1「快速开始」与「多人共用容器」、指南正文句、H2「防止容器被删除」、15 个目录 button、TOC 无 link、旧「概念卡 · 状态标签」与 `script` 不出现。
- Coverage note: 该测试直接渲染 `<Docs />`，未在 `/index/docs` 路由与 `MainLayout` 下断言页面装配。

#### Scenario: 旧正文残留被拒绝

- Test/check:
  - [X] `scripts/tests/docs-cleanup.integration.mjs::test_q36_docs_old_hardcoded_body_removed`
- Assertion scope: `Docs.jsx` 与 `src/components/docs` 不含 `TOC_ITEMS`、`JOURNEYS`、`FAQ_ROWS`、`概念卡 · 状态标签`、`jd-journey`、`DocsJourney.css`；`Docs` 导出存在，`MarkdownGuide.jsx` 存在。

### Requirement: Docs 主流程

#### Scenario: 点击目录项

- Test/check:
  - [X] `src/test/DocsMarkdown.test.jsx::点击目录按钮时聚焦标题、平滑滚动且不改 URL hash`
  - [X] `src/test/DocsMarkdown.test.jsx::渲染真实目录按钮、唯一 docs- id，并跳过代码块假标题`
- Assertion scope: 目标标题获得焦点；`scrollIntoView` 收到 `{ behavior: 'smooth', block: 'start' }`；`window.location.hash` 不变且不等于 `#<id>`；TOC 内无 link、无 `href`。

#### Scenario: 减少动态效果

- Test/check:
  - [X] `src/test/DocsMarkdown.test.jsx::reduced-motion 时使用 auto 滚动`
- Assertion scope: `matchMedia('(prefers-reduced-motion: reduce)')` 命中时，`scrollIntoView` 的 `behavior` 为 `auto` 且 `block` 为 `start`。

#### Scenario: 标题 id 的唯一性与 AST 来源

- Test/check:
  - [X] `src/test/DocsMarkdown.test.jsx::按 H1-H3 建立层级、唯一中文 id，并忽略代码块假标题`
  - [X] `src/test/DocsMarkdown.test.jsx::渲染真实目录按钮、唯一 docs- id，并跳过代码块假标题`
  - [X] `src/test/DocsMarkdown.test.jsx::标题 id 使用 docs- 前缀，不与页面已有 DOM id 冲突`
- Assertion scope: TOC 层级、中文与重复标题 id、`docs-` 前缀、`-2` 去重、代码围栏假标题排除、行内 code 进入 id/标签、H4 有 id 但不进入 TOC、页面已有 `id="快速开始"` 保留且存在 `docs-快速开始`。
- Coverage note: 测试只预置无前缀 `id="快速开始"`；`usedIds` 仅覆盖当前 Markdown 树，未证明页面已有任意 `docs-*` id 时无冲突。

### Requirement: Docs 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] `npm run build`
  - [X] `node E:/AI/Fuxi/FuxiYu_Global/.local/web-docs-normalize-2026-10-25/dist-check.cjs`
- Assertion scope: 构建命令存在；dist-check 读取现有 Docs chunk，确认 H1 与完整正文句存在，且 dist JS assets 不含已删除 basename。
- Coverage note: 未在本次归一化重跑 build；dist-check 只读现有产物，不证明当前构建运行。

#### Scenario: 外部路径依赖被拒绝

- Test/check:
  - [X] `scripts/tests/docs-cleanup.integration.mjs::test_q36_docs_no_global_repository_dependency`
- Assertion scope: `src`、`public`、`index.html`、`vite.config.js`、`package.json` 不出现 `FuxiYu_Global`、`../Global` 或 `E:/AI/Fuxi/FuxiYu_Global`；`Docs.jsx` 通过 `../content/USER_GUIDE_v1.md?raw` 导入并装配 `components/docs/MarkdownGuide`。

### Requirement: Docs 页面只保留生产可达资源

#### Scenario: 零引用资源删除且构建通过

- Test/check:
  - [X] `scripts/tests/docs-cleanup.integration.mjs::test_q36_docs_zero_ref_removed`
- Assertion scope: `Docs.css`、`DocsJourney.css`、`Guides.jsx`、`docs-apply.svg`、`docs-apply-mobile.svg`、`docs-home.svg`、`docs-home-mobile.svg` 不存在，basename 在扫描范围内无引用。
- Coverage note: 构建通过与 dist basename 检查由「生成生产产物」场景的 `npm run build` 与 dist-check 共享覆盖。

#### Scenario: 仍被引用的 statusDisplay 保留

- Test/check:
  - [X] `scripts/tests/docs-cleanup.integration.mjs::test_q36_docs_keeps_shared_status_display`
- Assertion scope: `src/utils/statusDisplay.js` 存在；`ContainerDetailPage.jsx` 与 `MachineDetailPage.jsx` 仍引用 `utils/statusDisplay`。
- Coverage note: 只验证文件与 import，未执行两个页面的状态渲染，未证明其它页面状态展示行为不变。

#### Scenario: 有引用的资源不得删除

- Test/check:
  - [X] `scripts/tests/docs-cleanup.integration.mjs::test_q36_docs_referenced_file_guard`
- Assertion scope: `MarkdownGuide.jsx`、`MarkdownGuide.css`、`markdownToc.js` 存在；对 `MarkdownGuide.css` 执行零引用删除守护时抛出匹配 `/仍被引用/` 的错误。

### Requirement: Docs Markdown 正文字节保真

#### Scenario: 字节与哈希一致

- Test/check:
  - [X] `scripts/tests/docs-cleanup.integration.mjs::test_q36_docs_guide_bytes_are_source_faithful`
- Assertion scope: 副本为 6052 字节、SHA256 `4C2DEA...BF34`、CRLF 数等于 LF 数且大于 0。
- Coverage note: Global 原稿当前缺失；历史 `source-copy-hash.txt` 记录源与副本字节相等，当前测试只校验副本记录值，未做新的跨仓库比较。

#### Scenario: 换行被 Git 改写

- Test/check:
  - [X] `scripts/tests/docs-cleanup.integration.mjs::test_q36_docs_gitattributes_preserve_guide_bytes`
- Assertion scope: `.gitattributes` 的目标路径行声明 `-text`；测试内的 `git check-attr` 输出 `text: unset`。
- Coverage note: 测试只匹配目标路径行；当前 `.gitattributes` 只有该条 `-text`，未机械断言不存在其它 `-text` 行。

#### Scenario: 副本内容偏离

- Test/check:
  - [X] `scripts/tests/docs-cleanup.integration.mjs::test_q36_docs_guide_bytes_are_source_faithful`
- Assertion scope: 当前副本的长度、SHA256 常量与 CRLF 条件由 `assert.equal` 比较，任一不匹配会失败；未执行字节篡改运行。

### Requirement: Docs Markdown 安全渲染与 GFM 能力

#### Scenario: 安全链接与原始 HTML

- Test/check:
  - [X] `src/test/DocsMarkdown.test.jsx::外链补 rel、危险协议被默认安全转换拦下、原始 HTML 不可执行`
- Assertion scope: HTTPS 外链保留 href、`target="_blank"`、`rel="noopener noreferrer"`；`javascript:` 链接不保留该协议；原始 `<script>` 不生成 script 元素。

#### Scenario: 正文内部锚点保持 HashRouter

- Test/check:
  - [X] `src/test/DocsMarkdown.test.jsx::正文内部锚点聚焦目标并滚动，不改变 HashRouter 的 hash`
- Assertion scope: `#docs-安装` 使目标获得焦点并调用 `scrollIntoView({ behavior: 'smooth', block: 'start' })`；hash 不变；`#docs-missing` 不写 hash，页面不崩溃。

#### Scenario: GFM 表格与代码块

- Test/check:
  - [X] `src/test/DocsMarkdown.test.jsx::GFM 表格包在局部滚动容器，代码块有可复制结构`
- Assertion scope: 表格位于 `.docs-table-scroll`；代码 `pre` 带 `.docs-code-pre` 且位于 `.docs-code-block`；复制按钮存在。
- Coverage note: 未断言 `pre` 下的 `code` 子元素；表格/代码局部横向滚动只有 CSS 契约，无运行时几何验证。

#### Scenario: 复制代码成功与失败

- Test/check:
  - [X] `src/test/DocsMarkdown.test.jsx::Clipboard 成功时复制完整代码并显示“已复制”`
  - [X] `src/test/DocsMarkdown.test.jsx::Clipboard 拒绝但 execCommand 回退成功时仍显示“已复制”`
  - [X] `src/test/DocsMarkdown.test.jsx::Clipboard 与 execCommand 都失败时显示“复制失败”且不崩溃`
- Assertion scope: Clipboard 成功写入完整代码并显示「已复制」；Clipboard 拒绝后调用 `execCommand('copy')`、返回 true 时显示「已复制」并移除 textarea；两路失败显示「复制失败」且不崩溃。
- Coverage note: 回退分支未断言 textarea 完整值或选中文本；未覆盖 Clipboard 不可用（仅拒绝）分支。

### Requirement: Docs 阅读布局与响应式目录

#### Scenario: 桌面两栏与移动折叠

- Test/check:
  - [X] `src/test/DocsMarkdown.test.jsx::同时提供桌面目录和默认折叠的移动目录`
  - [X] `scripts/tests/docs-cleanup.integration.mjs::test_q36_docs_responsive_local_scroll_contract`
- Assertion scope: 桌面 `.docs-toc-desktop` 存在；移动 `details.docs-toc-mobile` 默认无 `open`；CSS 使用右侧 224px 目录、`.docs-toc-desktop` sticky、`.docs-toc-mobile` 桌面 display none，并存在 `@media (max-width: 1024px)` 文本。
- Coverage note: 1024px media 内的单栏、桌面隐藏/移动显示规则未被机械断言；桌面 TOC 可见性、白色卡片背景与右侧粘性位置没有程序化视觉断言。

#### Scenario: 窄屏横向溢出防护

- Test/check:
  - [X] `scripts/tests/docs-cleanup.integration.mjs::test_q36_docs_responsive_local_scroll_contract`
  - [X] `E:/AI/Fuxi_audit_artifacts/help-markdown-2026-10-24/browser-help-local.mjs`
- Assertion scope: CSS 无 `overflow-x: hidden`，表格/代码声明 `overflow-x: auto`；浏览器脚本检查 1440/1201/1024/768/390/320 的页面宽度与 `border-box`。
- Coverage note: 浏览器脚本只证明页面级宽度，未证明表格/代码局部容器的实际横向滚动。

#### Scenario: 移动端标题定位

- Test/check:
  - [X] `scripts/tests/docs-cleanup.integration.mjs::test_q36_docs_responsive_local_scroll_contract`
  - [X] `E:/AI/Fuxi_audit_artifacts/help-markdown-2026-10-24/browser-help-local.mjs`
- Assertion scope: CSS `scroll-margin-top: 72px`；浏览器脚本在 320/390/768 记录 `targetTop >= 56`。

#### Scenario: 移动端先折叠再定位

- Test/check:
  - [X] `src/test/DocsMarkdown.test.jsx::移动端选择目录项时先折叠，再在下一帧滚动`
- Assertion scope: 点击后最终 `details.open === false`，目标标题获得焦点并调用 `scrollIntoView({ behavior: 'smooth', block: 'start' })`。
- Coverage note: 目标 id 的 `docs-` 前缀由「标题 id 的唯一性与 AST 来源」场景的共享测试覆盖；本测试的 RAF shim 同步执行，只断言最终状态，未记录关闭、聚焦、滚动的执行顺序。

#### Scenario: 帮助页滑动手势隔离

- Test/check:
  - [X] `src/test/DocsMarkdown.test.jsx::TOC、代码块与表格拦截触摸冒泡，正文空白仍可冒泡`
  - [X] `Select-String -Path src/components/docs/MarkdownGuide.jsx -Pattern 'onTouchStart|onTouchEnd|stopTouchPropagation|preventDefault'`
- Assertion scope: 四个局部容器的父级 touchstart/touchend 不被调用；正文空白 touchstart 冒泡一次；源码触摸处理器只调用 `stopPropagation()`，不调用 `preventDefault()`。
- Coverage note: 未断言 `defaultPrevented`、正文空白 touchend 或真实 `MainLayout` 导航；源码检查不等于端到端运行。
