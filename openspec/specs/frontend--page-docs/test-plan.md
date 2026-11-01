# frontend--page-docs Test Plan

Spec: [spec.md](spec.md)

## Current Mapping

### Requirement: Docs 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] `src/test/DocsPage.test.jsx::从已复制指南渲染正文与 15 项目录，不渲染旧硬编码章节`
  - [X] `src/test/AnvilContentPages.test.jsx::test_anvil_docs_route_assembles_in_main_layout`
- Assertion scope: 既有用例直接渲染 `<Docs />`，断言 H1「快速开始」「多人共用容器」、指南正文句、H2「防止容器被删除」、15 个目录 button、TOC 无 link，且不出现旧「概念卡 · 状态标签」与 `script`。规划测试用真实 `AppRoutes`、`PermissionProvider`、`MemoryRouter` 访问 `/index/docs`；mock `../api/user_api` 的 `getUserPermissions` 为 `vi.fn().mockResolvedValue({ entities: [], userId: 1, userName: 'audit' })`，使权限快照 loaded=true 且空权限；断言路径保持、`MainLayout` 落位、H1 与正文出现、不落 404。只 mock 权限/其它外部 API 与 `antd.message`，不发真实权限请求。
- Coverage note: 既有用例没有在 `/index/docs` 路由和 `MainLayout` 下断言页面装配；规划测试补该层。

#### Scenario: 旧正文残留被拒绝

- Test/check:
  - [X] `scripts/tests/docs-cleanup.integration.mjs::test_q36_docs_old_hardcoded_body_removed`
- Assertion scope: `Docs.jsx` 与 `src/components/docs` 的 `.jsx/.js/.css` 文本不包含 `TOC_ITEMS`、`JOURNEYS`、`FAQ_ROWS`、`概念卡 · 状态标签`、`jd-journey`、`DocsJourney.css`；`Docs.jsx` 仍导出页面组件，`MarkdownGuide.jsx` 存在。该检查对应规格明确要求的源码残留清理，不作为运行时渲染证明。

### Requirement: Docs 主流程

#### Scenario: 点击目录项

- Test/check:
  - [X] `src/test/DocsMarkdown.test.jsx::点击目录按钮时聚焦标题、平滑滚动且不改 URL hash`
  - [X] `src/test/DocsMarkdown.test.jsx::渲染真实目录按钮、唯一 docs- id，并跳过代码块假标题`
- Assertion scope: 点击目录 button 后目标标题获得焦点、`scrollIntoView` 收到 `{ behavior: 'smooth', block: 'start' }`，`window.location.hash` 保持不变；目录内没有 `a`/link，因此不存在 `href^="#"` 锚点。

#### Scenario: 减少动态效果

- Test/check:
  - [X] `src/test/DocsMarkdown.test.jsx::reduced-motion 时使用 auto 滚动`
- Assertion scope: `matchMedia('(prefers-reduced-motion: reduce)')` 命中时，点击目录按钮使 `scrollIntoView` 收到 `{ behavior: 'auto', block: 'start' }`，不使用 `smooth`。

#### Scenario: 标题 id 的唯一性与 AST 来源

- Test/check:
  - [X] `src/test/DocsMarkdown.test.jsx::按 H1-H3 建立层级、唯一中文 id，并忽略代码块假标题`
  - [X] `src/test/DocsMarkdown.test.jsx::渲染真实目录按钮、唯一 docs- id，并跳过代码块假标题`
  - [X] `src/test/DocsMarkdown.test.jsx::标题 id 使用 docs- 前缀，不与页面已有 DOM id 冲突`
- Assertion scope: TOC 按 H1–H3 建立层级；中文标题、重复标题、行内 code 进入 id/标签，重复标题得到 `-2` 后缀；所有标题 id 带 `docs-` 前缀且在 Markdown 树内唯一；代码围栏内的 `# 代码块假标题` 不生成标题也不进目录；H4 有 id 但不进目录；页面预先存在的无前缀 `id="快速开始"` 保留，同时生成 `docs-快速开始`。
- Coverage note: 冲突用例预置的是无前缀 `id="快速开始"`，`docs-` 命名空间是避让机制；测试未预置页面已有的 `docs-*` id。该边界不扩大成“任意既有 DOM id 已被证明无冲突”。

### Requirement: Docs 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] `npm run build`
  - [X] `scripts/tests/docs-cleanup.integration.mjs::test_q36_docs_no_global_repository_dependency`
- Assertion scope: `npm run build` 退出码 0；本 check 只证明构建命令成功。集成检查断言 `Docs.jsx` 通过 `../content/USER_GUIDE_v1.md?raw` 导入已提交副本并装配 `components/docs/MarkdownGuide`。该集成检查只读源码，不读 `dist`，不能证明构建产物已包含指南正文，也不能证明 Docs 异步 chunk 的实际存在/命名。
- Coverage note: 源码导入/组件装配已由集成检查断言；dist 是否包含指南正文、Docs chunk 是否存在及命名，均未由这些 check 证明。本计划不新增真实构建产物检查，也不声称已观测 dist；`React.lazy`/`Suspense`/`manualChunks` 组织属人工核对事实。

#### Scenario: 外部路径依赖被拒绝

- Test/check:
  - [X] `scripts/tests/docs-cleanup.integration.mjs::test_q36_docs_no_global_repository_dependency`
- Assertion scope: `src`、`public`、`index.html`、`vite.config.js`、`package.json` 不出现 `FuxiYu_Global`、`../Global` 或 `E:/AI/Fuxi/FuxiYu_Global`；`Docs.jsx` 使用 Web 内 `?raw` 副本和本地 Markdown 组件。

### Requirement: Docs 页面只保留生产可达资源

#### Scenario: 零引用资源删除且构建通过

- Test/check:
  - [X] `scripts/tests/docs-cleanup.integration.mjs::test_q36_docs_zero_ref_removed`
  - [X] `npm run build`
- Assertion scope: `Docs.css`、`DocsJourney.css`、`Guides.jsx`、四张历史 Docs SVG 不存在，basename 在 `src`/`public`/`index.html`/`vite.config.js`/`package.json` 扫描范围内无引用；生产构建退出码 0。
- Coverage note: 构建产物中不引用已删除 basename 由“源码无引用 + 构建成功”体现，未单独扫描 dist；构建 check 只声明命令成功，不对 chunk 命名/隔离、dist 引用或体积作自动断言。

#### Scenario: 仍被引用的 statusDisplay 保留

- Test/check:
  - [X] `scripts/tests/docs-cleanup.integration.mjs::test_q36_docs_keeps_shared_status_display`
- Assertion scope: `src/utils/statusDisplay.js` 存在；`ContainerDetailPage.jsx` 与 `MachineDetailPage.jsx` 仍引用 `utils/statusDisplay`。
- Coverage note: 只验证文件存在与 import，不重测两个详情页的状态渲染；详情页行为属于其它 capability。人工检查（可复现）：打开容器详情/机器详情，确认状态标签仍按 `statusDisplay` 显示；该检查不在本 capability 的自动化内，也不声称已执行。

#### Scenario: 有引用的资源不得删除

- Test/check:
  - [X] `scripts/tests/docs-cleanup.integration.mjs::test_q36_docs_referenced_file_guard`
- Assertion scope: `MarkdownGuide.jsx`、`MarkdownGuide.css`、`markdownToc.js` 存在；对仍被 Docs 引用的 `MarkdownGuide.css` 执行零引用删除守护时抛出匹配 `/仍被引用/` 的错误。

### Requirement: Docs Markdown 正文字节保真

#### Scenario: 字节与哈希一致

- Test/check:
  - [X] `scripts/tests/docs-cleanup.integration.mjs::test_q36_docs_guide_bytes_are_source_faithful`
- Assertion scope: Web 内指南为 6055 字节、SHA256 `B0F3730F6A288B0DC54B332A35C033603CBD2370D56C3A5225BDB98855BD4839`，并满足 CRLF 一致且大于 0。
- Coverage note: 测试校验 Web 指南相对已确认版本的字节保真，不执行跨仓库比较；后续有意修改指南时须同步更新该基线。

#### Scenario: 换行被 Git 改写

- Test/check:
  - [X] `scripts/tests/docs-cleanup.integration.mjs::test_q36_docs_gitattributes_preserve_guide_bytes`
- Assertion scope: `.gitattributes` 对 `src/content/USER_GUIDE_v1.md` 声明 `-text`，`git check-attr text -- src/content/USER_GUIDE_v1.md` 输出 `text: unset`。
- Coverage note: 测试用目标路径行匹配和 `git check-attr` 证明该文件不被换行转换；未机械断言“不存在其它 `-text` 行”。当前实际文件中只有该条 `-text`，但该事实来自读取文件，不是测试的独立断言。

#### Scenario: 副本内容偏离

- Test/check:
  - [X] `scripts/tests/docs-cleanup.integration.mjs::test_q36_docs_guide_bytes_are_source_faithful`
- Assertion scope: 当前副本的长度、SHA256 常量和 CRLF 条件都由 `assert.equal` 比较，任一字节变化使哈希或长度断言失败；测试未执行实际字节篡改。

### Requirement: Docs Markdown 安全渲染与 GFM 能力

#### Scenario: 安全链接与原始 HTML

- Test/check:
  - [X] `src/test/DocsMarkdown.test.jsx::外链补 rel、危险协议被默认安全转换拦下、原始 HTML 不可执行`
- Assertion scope: HTTPS 外链保留 `href`，带 `target="_blank"` 和 `rel="noopener noreferrer"`；`javascript:` 链接不保留该协议；原始 `<script>` 不生成 script 元素。

#### Scenario: 正文内部锚点保持 HashRouter

- Test/check:
  - [X] `src/test/DocsMarkdown.test.jsx::正文内部锚点聚焦目标并滚动，不改变 HashRouter 的 hash`
- Assertion scope: `#docs-安装` 使目标标题获得焦点并调用 `scrollIntoView({ behavior: 'smooth', block: 'start' })`，`window.location.hash` 不变；`#docs-missing` 也不写 hash，页面不崩溃。

#### Scenario: GFM 表格与代码块

- Test/check:
  - [X] `src/test/DocsMarkdown.test.jsx::GFM 表格包在局部滚动容器，代码块有可复制结构`
  - [X] `src/test/AnvilContentPages.test.jsx::test_anvil_docs_gfm_renders_pre_code_structure`
- Assertion scope: 既有用例断言 GFM 表格位于 `.docs-table-scroll`，代码 `pre` 带 `.docs-code-pre` 且位于 `.docs-code-block`，复制按钮存在。规划测试断言代码块实际生成 `pre > code` 结构，语言标记不丢失。
- Coverage note: 表格/代码的局部横向滚动只有 CSS 契约和人工几何检查，jsdom 不证明实际滚动宽度；人工检查范围见“窄屏横向溢出防护”。

#### Scenario: 复制代码成功与失败

- Test/check:
  - [X] `src/test/DocsMarkdown.test.jsx::Clipboard 成功时复制完整代码并显示“已复制”`
  - [X] `src/test/DocsMarkdown.test.jsx::Clipboard 拒绝但 execCommand 回退成功时仍显示“已复制”`
  - [X] `src/test/DocsMarkdown.test.jsx::Clipboard 与 execCommand 都失败时显示“复制失败”且不崩溃`
  - [X] `src/test/AnvilContentPages.test.jsx::test_anvil_docs_copy_fallback_uses_full_code_without_clipboard`
- Assertion scope: Clipboard 成功时 `writeText` 收到完整代码并显示「已复制」；Clipboard 拒绝后调用 `execCommand('copy')`，返回 true 时显示「已复制」并移除隐藏 textarea；两路都失败时显示「复制失败」且不崩溃。规划测试移除 `navigator.clipboard`，断言回退 textarea 的值为完整代码、选区覆盖全文，`execCommand` 返回 true 后显示「已复制」。
- Coverage note: 既有回退用例覆盖“Clipboard 拒绝”，不覆盖“Clipboard API 不可用”，也未断言 textarea 的完整值与选区；规划测试补这两点。

### Requirement: Docs 阅读布局与响应式目录

#### Scenario: 桌面两栏与移动折叠

- Test/check:
  - [X] `src/test/DocsMarkdown.test.jsx::同时提供桌面目录和默认折叠的移动目录`
  - [X] `scripts/tests/docs-cleanup.integration.mjs::test_q36_docs_responsive_local_scroll_contract`
- Assertion scope: DOM 存在 `.docs-toc-desktop`，移动端 `details.docs-toc-mobile` 默认无 `open`；CSS 文本断言正文在左、224px 目录在右的 grid，`.docs-toc-desktop` 为 sticky，`.docs-toc-mobile` 为 `display: none`，并存在 `@media (max-width: 1024px)` token。该检查未机械断言 1024px 媒体块内部为单栏规则。
- Coverage note: 真实 1440px 右侧粘性侧栏、390px 默认折叠和限宽白底卡片是视觉/几何结果，按以下人工检查覆盖：Chrome/Edge 在 1440px 打开 `/index/docs` 确认目录在正文右侧且非折叠、正文为白底限宽卡片；在 390px 确认目录为默认折叠的 `details`。CSS 正则 token 不等于媒体块结构或像素结果；不声称该视觉检查已自动化或已执行。

#### Scenario: 窄屏横向溢出防护

- Test/check:
  - [X] `scripts/tests/docs-cleanup.integration.mjs::test_q36_docs_responsive_local_scroll_contract`
- Assertion scope: CSS 在 `.docs-page` 局部使用 `border-box`，不使用 `overflow-x: hidden`，`.docs-table-scroll` 与 `.docs-code-pre` 声明 `overflow-x: auto`，并存在 1024px 媒体查询 token。该检查未断言媒体块内部为单栏规则。
- Coverage note: 实际 320/390/768/1440 宽度下的正文级横向溢出与局部滚动是浏览器几何结果，按以下人工检查覆盖：Chrome/Edge 分别设置 320/390/768/1440 视口，确认 `document.documentElement.scrollWidth <= innerWidth + 1`，宽表格/长代码只在 `.docs-table-scroll`/`.docs-code-pre` 内部横向滚动，且计算样式没有 `overflow-x: hidden`。CSS token 不等于像素几何；该检查不声称已自动化或已执行。

#### Scenario: 移动端标题定位

- Test/check:
  - [X] `scripts/tests/docs-cleanup.integration.mjs::test_q36_docs_responsive_local_scroll_contract`
- Assertion scope: CSS 文本存在 `scroll-margin-top: 72px` 声明。该检查未机械断言该声明位于 `max-width: 768px` 媒体块，也未断言它作用于 H1–H6。
- Coverage note: 实际遮挡是浏览器几何结果，按以下人工检查覆盖：Chrome/Edge 在 320/390/768 视口点击目录跳转到「容器转让」，确认目标标题 `getBoundingClientRect().top >= 56`，且 URL hash 保持 `#/index/docs`。72px token 本身不等于 768px 媒体块/H1–H6 关联或 56px 实际遮挡；该检查不声称已自动化或已执行。

#### Scenario: 移动端先折叠再定位

- Test/check:
  - [X] `src/test/DocsMarkdown.test.jsx::移动端选择目录项时先折叠，再在下一帧滚动`
  - [X] `src/test/AnvilContentPages.test.jsx::test_anvil_docs_mobile_toc_closes_before_next_frame_scroll`
- Assertion scope: 既有用例把 RAF 桩成同步执行，只断言最终 `details.open === false`、目标标题获得焦点并调用 `scrollIntoView({ behavior: 'smooth', block: 'start' })`。规划测试使用可挂起的 RAF，断言点击后目录先关闭、焦点和滚动在回调执行前尚未发生，放行下一帧后才发生，目标 id 仍带 `docs-` 前缀。
- Coverage note: 既有测试的同步 RAF 不能证明“先折叠、下一帧再定位”的顺序；规划测试补顺序。

#### Scenario: 帮助页滑动手势隔离

- Test/check:
  - [X] `src/test/DocsMarkdown.test.jsx::TOC、代码块与表格拦截触摸冒泡，正文空白仍可冒泡`
  - [X] `src/test/AnvilContentPages.test.jsx::test_anvil_docs_touch_isolation_does_not_prevent_default`
- Assertion scope: 既有用例对 `.docs-toc-desktop`、`.docs-toc-mobile`、`.docs-code-block`、`.docs-table-scroll` 触发 touchstart/touchend，断言父级处理函数未被调用，正文空白处 touchstart 正常冒泡。规划测试断言这些局部容器的 `defaultPrevented` 仍为 false，且正文空白处 touchend 也正常冒泡。
- Coverage note: 既有用例未断言 `preventDefault` 的否定分支，也未断言正文空白处的 touchend；规划测试补这两点。`MainLayout` 的全局手势代码不修改，也不以源码字符串断言代替运行时事件。
