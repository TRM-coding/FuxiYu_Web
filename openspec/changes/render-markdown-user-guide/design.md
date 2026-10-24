## Context

`/index/docs` 目前由 `src/pages/Docs.jsx` 的常量数组、Ant Design 组件和 `DocsJourney.css` 组成；正文与 Global 的 `USER_GUIDE_v1.md` 是两份内容。Global 原稿 6052 字节、CRLF 换行，SHA256 为 `4C2DEA950538717E5608A654692B6CC8A0B61DA18F84578A6EA9735893D2BF34`。

Web 使用 Vite 7 + React 19 + HashRouter；`MainLayout` 使用页面窗口滚动，桌面左侧已有 232px 导航，`<=768px` 时顶部有 56px fixed 导航。路由已对 `Docs` 做 `React.lazy`，本次不修改路由与布局。用户要求正文只维护 Markdown，并保持 Global 原稿逐字节不变。

## Goals / Non-Goals

**Goals:**

- 把 Global 指南按字节复制到 Web，并让 Vite `?raw` 成为唯一正文入口。
- 用成熟 Markdown 渲染链输出 GFM，同时从真实 remark AST 生成唯一 id 与 H1–H3 层级目录。
- 在 HashRouter 下不写 URL hash，保持焦点、减少动态效果和移动端可用性。
- 桌面两栏右侧粘性目录 + 限宽白底正文；窄屏折叠目录；代码/表格仅局部滚动。
- 删除旧 JSX 正文和 `DocsJourney.css`，保留共享 `statusDisplay`，更新机械清理守护。

**Non-Goals:**

- 不编辑指南原文、不修正原稿错别字、不把 Markdown 拆成 JSX 正文。
- 不修改 Global、路由表、MainLayout、权限/API、生产环境。
- 不自行同步主规格、不归档、不提交；这些动作由父级在独立复审通过后执行。
- 不引入 Astro/Nextra 框架、`rehype-raw`、`dangerouslySetInnerHTML` 或语法高亮器。
- 不在本 change 内完成父级独立浏览器评审与提交。

## Decisions

### 1. 内容文件按字节复制，选择 `-text` 锁住换行

`src/content/USER_GUIDE_v1.md` 由原稿直接复制字节，不做 UTF-8 重写或换行转换。为满足字节保真，本 change 选择在 `.gitattributes` 中仅对该路径设置 `-text`；这是实现选择，不是原稿或用户指定的格式要求。`.gitattributes` 必须在首次暂存内容文件之前落地，避免 `core.autocrlf` 归一化首个 blob；副本由常量式测试守护长度/哈希，父级提交前还应核验暂存 blob 的字节。

替代方案：用 `text eol=crlf`。该写法仍声明文本属性，Git 仍可能做归一化，不能保证字节；拒绝。替代方案：构建时从 Global 引用。会导致构建依赖相邻仓库，拒绝。替代方案：接受 LF 归一化。会改变原稿哈希（CRLF 为 `4C2D…BF34`，LF 为 `CDDD…9765`），与字节保真冲突，拒绝。

### 2. 正文通过 Vite `?raw` 进入 Docs chunk

`Docs.jsx` 只导入 `../content/USER_GUIDE_v1.md?raw` 并渲染通用 `MarkdownGuide`；不再保留任何正文常量。正文约 6KB，进入懒加载 Docs chunk 可接受，构建无需网络或相邻仓库。

替代方案：`?url` + 运行时 `fetch`。会增加加载态、失败态、路径与缓存问题，且对静态帮助页无收益，拒绝。替代方案：用 `import.meta.glob` 扫描。单文件场景增加间接性，拒绝。

### 3. 渲染使用 `react-markdown` + `remark-gfm`，目录使用同一 remark AST 链

正文渲染使用 `react-markdown` 默认安全 URL 转换，不传 `rehype-raw`，不使用 `dangerouslySetInnerHTML`。`remark-gfm` 提供 GFM 表格与其它扩展。目录提取使用 `unified` + `remark-parse` 解析出 mdast；`unified` 与 `remark-parse` 是 `react-markdown` 本身使用的同一解析链，作为直接依赖显式声明，不是第二套正则解析器。

渲染时附加自定义 remark 插件遍历真实标题节点，调用与目录提取相同的 `assignHeadingIds`，把 id 写入 `hProperties`。目录与渲染各解析一次同一份字符串，但共享标题文本提取、slug 与去重函数，保证结果一致。

替代方案：在 React 组件 render 时收集标题再用 state 更新目录。首屏会缺目录或需要二次渲染，且目录与内容顺序耦合，拒绝。替代方案：手写正则提取标题。无法正确跳过代码围栏、行内 code 与嵌套 AST，明确拒绝。

### 4. 标题 id：Unicode 友好、稳定、带命名空间前缀

标题纯文本由 AST 的 `text`、`inlineCode`、`image.alt` 等节点递归提取；代码围栏是 `code` 节点，不参与。slug 使用 `NFKC`、小写、空白转 `-`，保留 Unicode 字母/数字/标记/连接符与 `-`，去除其它标点；空 slug 回退为 `section`。所有生成 id 统一加 `docs-` 前缀；重复标题按出现顺序追加 `-2`、`-3`，并与已有后缀冲突时继续递增。所有 H1–H6 都分配 id，目录只取 H1–H3；这保证任意标题锚点唯一、与页面其它 DOM id 隔离，且 TOC 是 AST 层级而非正则菜单。

替代方案：直接使用标题文本作为 id。中文与标点/重复标题会产生无效或重复 id，且可能与页面已有 id 冲突，拒绝。替代方案：只给 H1–H3 分配 id。H4–H6 的文档内锚点会失配，且重复计数策略会在目录层级切换时变化，拒绝。

### 5. HashRouter 页内导航使用按钮，不触碰 URL hash

目录项使用原生 `<button type="button">`，不生成 `href`，因此中键、右键“新标签页”、复制链接文本等路径都不会把 `#id` 暴露给 HashRouter。点击后通过 `document.getElementById`、`focus({ preventScroll: true })` 与 `scrollIntoView({ block: 'start', behavior })` 完成导航；按钮以 `aria-controls` 指向目标标题。`behavior` 由 `matchMedia('(prefers-reduced-motion: reduce)')` 决定：reduce 时为 `auto`，否则为 `smooth`。目标标题带 `tabIndex=-1`，CSS 提供 `:focus-visible` 样式。移动端选择时先关闭 `details`，再在下一帧聚焦/滚动，避免折叠引起的高度变化导致目标偏移。

替代方案：设置 `window.location.hash`。HashRouter 把 hash 当路由地址，会破坏 SPA 路由，明确拒绝。替代方案：`<a href="#id">` + `preventDefault()`。普通点击安全，但中键/复制链接仍会暴露 `#id`，不采用。替代方案：`<a role="link">` 无 href + 手写 Enter/Space。会重复原生按钮键盘语义，不采用。

### 6. 布局：右侧 224px 粘性目录 + 限宽阅读栏，1024px 以下折叠

页面使用 `max-width: 1120px` 的 CSS Grid：`minmax(0, 1fr) 224px`，正文在左、目录在右，避免在全局 232px 左导航之外再叠一条左栏；目录 `position: sticky; top: 24px`，正文白色卡片 `max-width: 860px`。Docs 根节点及子元素统一 `box-sizing: border-box`，让 `max-width` 包含 padding/border；不使用 `overflow-x: hidden` 掩盖溢出。`@media (max-width: 1024px)` 改为单栏，桌面 TOC 由 CSS 隐藏，移动端使用独立的 `<details class="docs-toc-mobile">`，默认 `closed`；不使用 JS/CSS 双断点状态。移动端选择后先关闭 details，再在下一帧聚焦/滚动。移动端标题 `scroll-margin-top` 至少 72px，覆盖 56px fixed 顶栏与间距。样式文件固定为 `src/components/docs/MarkdownGuide.css`。

不改变 `MainLayout` 的窗口滚动和现有侧栏。替代方案：TOC 放左侧。会在全局左导航旁再叠一条侧栏，压缩 1201px 附近的阅读宽度，拒绝。替代方案：单个 `details` 由 JS 维护 open。存在 resize 不同步和关闭/滚动时序问题，拒绝。

### 7. 帮助页局部隔离 MainLayout 的滑动手势

`MainLayout` 在 `.main-content` 上监听 `touchstart`/`touchend`，横滑可能被误判成页面切换。帮助页只在 TOC 容器、`.docs-code-block` 和 `.docs-table-scroll` 上监听这两个事件并 `stopPropagation()`；不 `preventDefault()`，因此纵向滚动、点击和代码/表格自身横向滚动保持原生行为，`MainLayout` 本身不改。正文空白区域的触摸仍冒泡，保留既有横滑切页行为。

替代方案：修改 `MainLayout` 忽略 Docs。会改变全局手势并影响其它页面，拒绝。替代方案：`preventDefault` 所有触摸。会破坏点击、纵向滚动和局部横滑，拒绝。

### 8. Markdown 元素适配：安全链接、局部滚动、可复制代码

`a` 组件只对 `http(s)`/协议相对外链加 `target="_blank"` 与 `rel="noopener noreferrer"`；URL 仍由 `react-markdown` 默认转换过滤。正文内部 `#` 锚点会 `preventDefault`，把 id 解码后交给同一 `focusAndScrollToHeading`，目标不存在也不写 hash。`table` 外包 `.docs-table-scroll`（`overflow-x: auto`），`pre` 外包 `.docs-code-block` 并内置复制按钮；`pre` 自身 `overflow-x: auto`，长代码不撑破正文。复制顺序：Clipboard API 成功 → 已复制；Clipboard 拒绝/缺失 → 隐藏 textarea + `execCommand('copy')` 并检查布尔返回值，成功仍显示「已复制」；两路都失败才显示「复制失败」。成功后 1.8 秒恢复。目录、复制按钮与「已复制/复制失败」是 UI chrome，不属于原稿正文；字节保真以内容文件为准。原始 HTML 不进入可执行 DOM。

替代方案：Ant Design `Typography` 的复制组件。会把 Markdown 渲染与旧 UI 体系重新耦合，且自定义表格/代码滚动不自然，拒绝。替代方案：引入语法高亮。当前原稿只有少量 bash，新增体积与依赖无必要，不采用。

### 9. 清理与测试职责

删除 `DocsJourney.css` 与旧 JSX 正文；保留 `statusDisplay.js`，由其它详情页继续引用。`scripts/tests/docs-cleanup.integration.mjs` 改为检查：内容文件字节长度/哈希、`.gitattributes`/`git check-attr`、无 Global 引用、旧文件与旧正文零残留、`statusDisplay` 仍被其它页面引用、有引用资源守护仍会失败、新 CSS 的 `border-box`/无 `overflow-x: hidden`/局部滚动/右侧两栏/1024px/72px 规则存在。新增 `Docs*.test.jsx` 覆盖 AST 目录、重复/中文/行内 code/代码围栏假标题、按钮无 href、点击/焦点/hash、reduced motion、安全链接、内部锚点、GFM 表格、复制 API 成功/回退成功/两路失败、TOC/代码/表格触摸冒泡隔离、DOM id 命名空间、移动折叠与真实指南装配；真实浏览器再覆盖 1440/1024/768/390/320 的盒宽、溢出与焦点。

主规格的旧 Docs 契约（statusDisplay 表、CONTAINER_ORDER 等）由 delta spec 取代；主规格同步、测试台账合并与归档由父级在独立复审后执行，本实现不触碰主规格。

替代方案：保留旧正文以让旧测试通过。直接违反单一正文源，拒绝。

## Risks / Trade-offs

- [风险] 目录解析与正文渲染使用两次 parse，理论上 slug 序列可能分叉。→ 两者调用同一 `assignHeadingIds`/slugger，并增加重复标题、代码围栏假标题、行内 code 的测试。
- [风险] `?raw` 会使正文进入 JS bundle，增加 Docs chunk 体积。→ 内容仅约 6KB 且路由懒加载，构建产物检查确认；不以运行时 fetch 换取复杂度。
- [风险] 桌面与移动两个目录实例可能造成重复标签/测试歧义。→ 桌面 `nav` 与移动 `details` 使用不同可访问名称，CSS 只显示一个；测试用 `within` 限定容器，并验证移动 details 默认关闭。
- [风险] 帮助页内部横滑可能触发 `MainLayout` 页面切换。→ 仅 TOC/代码/表格局部 `stopPropagation`，不改全局、不 `preventDefault`；单测断言父级不收到触摸事件、正文空白仍冒泡，浏览器再验证纵向滚动与局部横滑。
- [风险] `max-width` 与 padding 在 content-box 下会超宽。→ Docs 根节点及子元素统一 `border-box`，外部浏览器检查 1440/768/390/320 的 `scrollWidth <= innerWidth`，并禁止 `overflow-x: hidden`。
- [风险] 移动端折叠后立即滚动可能因高度变化落点偏移。→ 先关闭 details，再在 `requestAnimationFrame` 中聚焦/滚动；测试固定 RAF 并检查时序，真实浏览器再验收顶栏偏移。
- [风险] `focus({ preventScroll: true })` 或 Clipboard API 在旧浏览器/非安全上下文不可用。→ focus 使用特性兼容的可选参数；复制有 `execCommand` 回退，并检查其布尔返回值，只有两路失败才显示失败。
- [风险] `-text` 会让该文件成为二进制 diff，且 CRLF 永久保留。→ 这是字节保真的实现取舍；测试比较字节与哈希，父级提交前核验暂存 blob，不以文本 diff 可读性换取换行改写。
- [风险] 无真实浏览器 E2E，320/390/768/1024/1440 的视觉横向溢出只能做 CSS/结构检查。→ 提交前由父级按用户要求在真实浏览器验收；本 change 记录该限制，不将结构测试冒充视觉通过。
- [风险] 原稿有错别字/语句问题。→ 不修正，保持逐字节一致。

## Migration Plan

1. 先落失败测试（目录、安全、布局结构、清理守卫），确认红灯原因正确。
2. 复制内容字节；在首次暂存前落地 `.gitattributes` `-text`，安装渲染依赖。
3. 实现 AST 工具、Markdown 组件与 Docs shell，删除旧正文和 CSS。
4. 更新清理集成测试与依赖，跑定向测试、全量 Web/集成测试、lint、构建。
5. 记录真实日志与哈希，更新 tasks/test-plan，生成 verify；父级独立复审、浏览器验收后同步主规格并归档。
6. 提交前核验 `git check-attr text` 为 unset，并比较暂存 blob 与工作区副本字节；回滚只需还原本 change 涉及的 Web 文件；Global 从未修改。

## Open Questions

- 无内容或交互决策待定。真实浏览器视觉验收由父级执行；父级还需对 R1–R7 的落实情况做独立复核，再同步主规格/归档。本实现不归档、不提交。
