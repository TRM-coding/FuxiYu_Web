## Review Metadata

- **Review round**: 1
- **Prior round**: none
- **Reviewer context**: 独立 DSH `9b194099-7444-408a-89fe-6a68b245f0dc`（外部只读；作者未参与该审查）
- **Tool restrictions**: read-only；未修改仓库文件，未运行 build/test
- **Artifacts reviewed**: `proposal.md`、`design.md`、`specs/frontend--page-docs/spec.md` 的审查基线
- **Review source**: `E:/AI/Fuxi_audit_artifacts/help-markdown-2026-10-24/design-review.md`
- **Boundary**: 下方完整保留独立审查原文；原文之后是作者完成记录，不声称进行了第二次独立审查。

## Findings

### 🔴 Critical (blocking)

None.

### 🟡 Moderate

外部审查给出 R1–R8 必须修改项，已作为实施门禁处理；逐项状态见下方 Required Changes 与作者完成记录。

### 📌 Suggestions

保留独立审查原文的非阻塞建议；表格 fixture、两个 TOC 实例、ID 前缀与浏览器矩阵均已落实。

## Embedded-Instruction / Injection Attempts

none detected.

## External Review (verbatim)

# 独立预实施审查 — `render-markdown-user-guide`

**VERDICT: APPROVE_WITH_CHANGES**

审查范围（同一版本，未重读其它 repo）：
- `openspec/changes/render-markdown-user-guide/proposal.md`
- `openspec/changes/render-markdown-user-guide/design.md`
- `openspec/changes/render-markdown-user-guide/specs/frontend--page-docs/spec.md`

未修改仓库文件，未运行 build/test。本文是独立文档审查，不代表实现已完成。

> 订正说明：本文件仍针对上述 3 个文件的同一版本；本次只订正上一轮 review 的 R3 `-text` 代价表述、R4 侧别强制表述，并补充移动端滑动手势风险。**VERDICT 不变**。

## 总体判断

对 6KB 指南而言，这套架构是合适且克制的：

- 逐字节副本 + `?raw`，构建不依赖相邻 Global 仓库。
- `react-markdown` + `remark-gfm`；不使用 `rehype-raw` / `dangerouslySetInnerHTML`。
- 从 AST 生成 H1–H3 目录、稳定 id、焦点管理与 reduced-motion 处理。
- 不写 HashRouter 的 hash；保留窗口滚动与响应式两栏。
- 代码/表格局部横向滚动；有字节/哈希与清理守护。

结论：不需要迁移 Astro/Nextra/VitePress；以下修改都是局部契约修正，不需要重做架构。

## 必须修改项（apply 前落地）

### R1. 删除“可复制链接”的错误理由；明确目录项的 URL/role 行为

**位置：** `design.md` Decision 5（52–56 行）；`spec.md` Docs 主流程（21–27 行）与布局措辞（125–139 行）。

`<a href="#id">` + `preventDefault()` 对普通左键和 Enter 可用，但**不能覆盖**中键、右键“在新标签打开”、复制链接文本等路径；这些路径仍会暴露 `#id`，在 `HashRouter` 下会被当成路由并可能 404。因此：

- 删除“保留可复制链接”或“复制链接有效”的表述。
- 优先用 `<button type="button">`，天然无 hash，键盘 Enter/Space 默认可用。
- 若外部浏览器检查必须按 `getByRole('link')` 查询，可用 `<a role="link" tabIndex={0}>` **不写 `href`**，自行处理 Enter/Space；不要把 `href="#id"` 作为最终方案。
- 若坚持保留 `href="#id"` + `preventDefault`，必须在 design/spec 明写“不支持复制链接/新标签”，并补中键/新标签浏览器测试；否则“不破坏 HashRouter”的要求并未真正满足。
- 若改为 button，把 spec 的“目录链接”改为“目录项”，并加结构测试：TOC 内不存在 `href^="#"`（或浏览器验证中键/新标签）。

### R2. 对齐复制回退语义

**位置：** `design.md` Decision 7（66 行）；`spec.md` 复制场景（119–123 行）。

spec 目前写成“Clipboard API 拒绝 → 复制失败”，这在 fallback 成功时是错的。要求：

1. 先试 Clipboard API。
2. 拒绝或不可用时，用隐藏 textarea + `execCommand('copy')`，并**检查其布尔返回值**。
3. 任一路径成功 → “已复制”。
4. 只有两者都失败 → “复制失败”；页面不得崩溃。

补三类测试：Clipboard 成功；Clipboard 拒绝 + fallback 成功（必须显示成功）；两者都失败（显示失败）。复制反馈属于 UI，不属于指南正文。

### R3. 将 `-text` 还原为实现选择，并修正代价说明

**位置：** `design.md` Decision 1（尤其 30 行）与风险 82 行。

用户没有指定 `-text`；它是为保留 CRLF/逐字节而做的实现选择。改写为：

> 为满足逐字节/CRLF 保真，本 change 选择 `-text`；这是实现选择，不是用户指定。

同时：

- `-text` 只关闭换行转换；diff 属性/可读性是另一项独立配置，不应写入 design 的代价说明。
- 保留逐字节目标即可；`.gitattributes` 在 `git add` 前落地。
- 校验 **staged blob** 的 SHA-256（工作区校验不够，`core.autocrlf=true` 仍可能在首次 add 时改写）。
- 若团队另行选择 LF 归一化，则改用 LF 哈希并统一测试；两种契约不要混用。

保留 `-text` 可以，但理由只能是“逐字节/CRLF 保真 + staged blob 校验”。

### R4. 目录侧别可选择，右栏只是推荐；补新样式文件路径

**位置：** `design.md` Decision 6（58–60 行）；`proposal.md` Impact（30–32 行）；`spec.md` 布局要求（125–139 行）。

`grid-template-columns: 224px minmax(0, 1fr)` 会把目录放在正文左侧，与现有 232px 全局左栏叠加。此前沟通提到左栏，因此**左栏不是错误，右栏也不是强制项**：

- 右栏是调研推荐：`minmax(0, 1fr) 224px`，正文更靠前；但左栏同样可行。
- 只要 design/spec 清楚选定一侧，不留下“224px 先、却说是右栏”的歧义即可。
- 选定左栏时，补 1201/1440px 下正文宽度与视觉验收；选定右栏时，按右栏实现并测试。
- 不因侧别选择而迁移文档框架。

另外在 Impact/tasks 里写明新样式文件路径（如 `src/pages/DocsGuide.css` 或 `src/components/docs/docs.css`）；清理守护不能针对未指定路径。

### R5. 明确移动端 `<details>` 状态与关闭/滚动顺序

**位置：** `design.md` Decision 5/6（54、60 行）与风险 80 行；`spec.md` 布局场景（129–139 行）。

design 同时出现“移动 `<details>`”“桌面强制展开”“JS 用同一 1024px 阈值维护 open”，需要明确：

- 方案一（推荐）：桌面 aside + 移动 details 两个实例，CSS 控制显隐；details 默认不写 `open`，不需要 JS 断点状态，避免 resize 失步。测试用 `within` 限定，避免同名项重复。
- 方案二：单一响应式 `<details>` + JS 状态；必须测试桌面↔移动双向 resize，而不只是首屏。

若移动端点击后自动收起，先关闭再在下一帧滚动/聚焦，或 v1 不自动收起；关闭导致的高度变化会让目标标题偏移。浏览器验收要断言标题顶部仍满足 56px 顶栏偏移。

### R6. 帮助页局部隔离 MainLayout 的移动左右滑动手势

**位置：** `design.md` 布局/交互决策；`spec.md` 响应式目录与横向滚动要求。

这是实际风险：`MainLayout` 在 `.main-content` 上监听 `touchstart/touchend`，横向位移超过阈值且起手元素不在 `button/input/textarea/select` 时，会切换 `swipePaths`。帮助页里的：

- `<summary>`、无 href 的 `role="link"` 目录项（`<a>` 不在忽略列表）；
- 代码块/表格的横向滑动区域；
- 表格单元格内的横滑；

都可能把“滚动代码/表格/展开目录”误判为页面左右切换。要求：

- 只在帮助页局部处理：在 TOC 容器、`.docs-code-block`、`.docs-table-scroll` 等交互区监听 `touchstart/touchend` 并 `stopPropagation()`；不要修改 `MainLayout` 的全局手势逻辑。
- `stopPropagation` 不 `preventDefault`，保留点击、纵向滚动和代码/表格横向滚动。
- 若目录用 `<button>`，按钮本身已被全局忽略，但 summary/容器/表格/代码区仍需隔离。
- 加必要测试：在 390px 下从 TOC/代码/表格起手横滑，URL/path 不变；在帮助页空白区域正常横滑仍保持既有页面切换行为；纵向滚动不受影响。可先用浏览器测试覆盖，若做单测则需 mock `MainLayout` 的手势并断言 navigate 未被调用。

### R7. 定义“正文”边界，并保护标题 id 命名空间

**位置：** `design.md` id 决策（48 行）与复制 UI（66 行）；`spec.md` 字节/安全/复制要求（81–105、119–123 行）。

- 明确“正文”仅指 Markdown 渲染出的文字；目录、复制按钮、“已复制/复制失败”反馈、标题 id 都是 UI，不得当作原文，也不得覆盖原文。逐字测试限定 `.docs-markdown` 或排除代码工具栏。
- 给生成的 id 加前缀（如 `docs-`/`guide-`），并验证不与页面既有 DOM id 冲突；当前场景只检查标题之间唯一，重复 id 会让 `getElementById` 命中错误元素。
- 如加页面标题，放在 article/Markdown 正文之外，保证正文仍从原稿 H1“快速开始”开始。

### R8. 把旧契约迁移写进任务与验收

**位置：** `proposal.md` 30–32 行；`design.md` 70–74、86–92 行。

design 提到更新 `docs-cleanup.integration.mjs`，但旧测试当前硬性要求：

- `Docs.jsx` 导入 `statusDisplay` / `CONTAINER_STATUS_DISPLAY` / `MACHINE_STATUS_DISPLAY`；
- `DocsJourney.css` 存在且被 `Docs.jsx` 引用。

主 spec 也仍要求 `CONTAINER_ORDER`/状态卡。必须显式列入 tasks/验收：

- 重写清理集成测试：验证新内容/CSS 守护，以及“statusDisplay 仍被其它生产页引用”；
- 更新主 spec delta 与 `test-plan.md` 的映射/哈希，不能保留旧契约；
- 补 Decision 8 列出的 `Docs*.test.jsx`，包括复制 fallback 与“目录不产生 hash 链接”的用例。

## 非阻塞建议

- 两次 parse（TOC + 渲染）对 6KB 可接受；前提是共用 `assignHeadingIds`，并测试重复标题、中文、行内 code、代码围栏假标题。
- 当前原稿没有表格，仍应加一个 GFM 表格 fixture，否则“表格横向滚动”没有验证。
- 优先用两个 TOC DOM 实例，而不是 JS/CSS 双阈值；测试用 `within` 限定。
- 若要做严格正文文本断言，复制反馈可用图标 + `aria-label`；可见“已复制/复制失败”也可接受，但必须排除在正文校验之外。
- 浏览器矩阵记录 1440/1024/768/390/320：无页面级横向溢出、`pre`/表格局部滚动、标题 focus、hash 不变、reduced-motion；jsdom 不能证明滚动几何。

## 验收清单

- [ ] R1 目录 URL/role 理由修正；不再声称复制链接有效。
- [ ] R2 复制 fallback 区分“API 拒绝”和“最终失败”。
- [ ] R3 `-text` 改为实现选择；删除错误的 diff 代价表述；staged blob 已校验。
- [ ] R4 目录左/右明确选定；新 CSS 路径已写入 Impact/tasks。
- [ ] R5 移动 details 状态与关闭/滚动顺序明确。
- [ ] R6 帮助页局部隔离滑动手势；TOC/代码/表格横滑不切路由，且不改 MainLayout。
- [ ] R7 正文边界与 id 前缀/冲突检查已补。
- [ ] R8 旧 docs-cleanup、主 spec、test-plan 迁移排期。
- [ ] 浏览器验收记录 320/390/768/1024/1440；无页面级横向溢出。

## Author Completion Record

以下为作者对必改项的落实记录；这属于作者自检，不替代父级最终独立复核：

- **R1**：TOC 改为原生 `button` + `aria-controls`，无 `href`；测试断言 TOC 内无 link、无 `href^="#"`。
- **R2**：复制先 Clipboard，再 `execCommand` 并检查布尔返回值；三类测试（成功/回退成功/两路失败）均通过。
- **R3**：`-text` 明确定位为实现选择，删除错误 diff 代价表述；工作区字节/哈希/CRLF 已验证，暂存 blob 校验保留给父级提交门禁。
- **R4**：明确选右侧目录，样式路径固定为 `src/components/docs/MarkdownGuide.css`。
- **R5**：桌面 aside + 移动 details 两实例；移动选择先关闭 details，再 RAF 聚焦/滚动。
- **R6**：TOC、`.docs-code-block`、`.docs-table-scroll` 局部 `stopPropagation()`；不 `preventDefault`、不改 `MainLayout`；单测覆盖父级不收到触摸事件、正文空白仍冒泡。
- **R7**：标题 id 加 `docs-` 前缀，测试已有 DOM id 冲突；保真以 Markdown 源文件字节为准，UI chrome 不参与。
- **R8**：重写清理测试、delta spec、test-plan/tasks；`statusDisplay` 仍由容器/机器详情页引用。
- **父级新增缺陷**：Docs 局部统一 `border-box`，外部浏览器 1440/1201/1024/768/390/320 均无页面级横向溢出；正文内部 `#` 锚点已拦截并聚焦/滚动；未使用 `overflow-x: hidden`。

## Verdict

VERDICT: APPROVE_WITH_CHANGES

## Required Changes (if APPROVE WITH CHANGES)

R1–R8 已逐项落实，状态见上方 Author Completion Record；R3 的暂存 blob 校验由父级在提交前完成。

CHANGES_APPLIED: yes

## Rebuttals

无拒绝项。作者只声明“必改项已落实并经本地测试验证”，不声明自己是独立审查者；独立 DSH 审查原文保留在上方，父级仍需做最终复核、主规格同步与归档。
