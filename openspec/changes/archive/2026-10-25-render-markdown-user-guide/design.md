# Design

## Context

`/index/docs` 原由 `src/pages/Docs.jsx` 的常量数组、Ant Design 组件和 `DocsJourney.css` 组成，正文与 Global 的 `USER_GUIDE_v1.md` 是两份内容。Global 原稿为 6052 字节、CRLF 换行，SHA256 为 `4C2DEA950538717E5608A654692B6CC8A0B61DA18F84578A6EA9735893D2BF34`。

Web 使用 Vite 7、React 19 与 HashRouter。`MainLayout` 使用页面窗口滚动，桌面左侧已有 232px 导航，宽度不大于 768px 时顶部有 56px fixed 导航；路由已对 `Docs` 做 `React.lazy`。本次只替换 Docs 的正文来源、渲染与页面内导航，不修改路由、全局布局、权限或后端接口。

该 change 已于 2026-10-25 归档：实现提交为 `c567a00`，归档提交为 `de3f43e`；主规格已同步，Global 未修改。以下内容记录当时实际采用的设计决策；本次文档归一化不回写代码，也不把计划审查当作实现验证。全量 `npm test` 于 2026-10-24 被 harness 中断，原始日志在 `E:/AI/Fuxi_audit_artifacts/help-markdown-2026-10-24/full-npm-test.log`，不视为通过。

## Goals / Non-Goals

**Goals:**

- 把 Global 指南按字节复制到 Web，并让 Vite `?raw` 成为唯一正文入口。
- 用成熟的 Markdown 渲染链输出 GFM，同时从真实 remark AST 生成唯一 id 与 H1-H3 层级目录。
- 在 HashRouter 下不写 URL hash，保持焦点、减少动态效果和移动端可用性。
- 桌面采用右侧粘性目录与限宽白底正文的两栏布局；窄屏折叠目录；代码和表格仅局部滚动。
- 删除旧 JSX 正文和 `DocsJourney.css`，保留共享 `statusDisplay`，更新机械清理守护。

**Non-Goals:**

- 不编辑指南原文、不修正原稿错别字、不把 Markdown 拆回 JSX 正文。
- 不修改 Global、路由表、`MainLayout`、权限或 API、生产环境。
- 不把主规格同步、归档、提交和父级独立浏览器评审计为作者实现工作。
- 不引入 Astro、Nextra、`rehype-raw`、`dangerouslySetInnerHTML` 或语法高亮器。

## Decisions

### 1. 内容文件按字节复制，选择 `-text` 锁住换行

`src/content/USER_GUIDE_v1.md` 由 Global 原稿直接复制字节，不做 UTF-8 重写或换行转换。为满足字节保真，本 change 选择在 `.gitattributes` 中仅对该路径设置 `-text`；该属性只关闭 Git 换行转换，是实现选择，不是原稿或用户指定的格式要求。`.gitattributes` 必须在首次暂存内容文件之前落地，避免 `core.autocrlf` 归一化首个 blob；副本由常量式检查守护长度和哈希，父级提交前还应核验暂存 blob。

替代方案：`text eol=crlf` 仍声明文本属性，Git 仍可能做归一化，不能保证字节；构建时从 Global 引用会让构建依赖相邻仓库；接受 LF 归一化会改变原稿哈希。三者均与字节保真冲突，拒绝。

### 2. 正文通过 Vite `?raw` 进入 Docs chunk

`Docs.jsx` 只导入 `../content/USER_GUIDE_v1.md?raw` 并渲染通用 `MarkdownGuide`，不再保留任何正文常量。正文约 6KB，进入懒加载 Docs chunk 可接受，构建无需网络或相邻仓库。

替代方案：`?url` 加运行时 `fetch` 会增加加载态、失败态、路径与缓存问题，对静态帮助页无收益；`import.meta.glob` 在单文件场景增加间接性。两者均拒绝。

### 3. 渲染使用 `react-markdown` 与 `remark-gfm`，目录使用同一 remark AST 链

正文渲染使用 `react-markdown` 默认安全 URL 转换，不传 `rehype-raw`，不使用 `dangerouslySetInnerHTML`。`remark-gfm` 提供 GFM 表格与其它扩展。目录提取使用 `unified` 与 `remark-parse` 解析出 mdast；两者是 `react-markdown` 本身使用的同一解析链，作为直接依赖显式声明，不是第二套正则解析器。

渲染时附加自定义 remark 插件遍历真实标题节点，调用与目录提取相同的 `assignHeadingIds`，把 id 写入 `hProperties`。目录与渲染各解析一次同一份字符串，但共享标题文本提取、slug 与去重函数，保证结果一致。

替代方案：在 React 组件 render 时收集标题再用 state 更新目录，首屏会缺目录或需要二次渲染；手写正则无法正确跳过代码围栏、行内 code 与嵌套 AST。两者均拒绝。

### 4. 标题 id 使用 Unicode 友好、稳定、带命名空间前缀的规则

标题纯文本由 AST 的 `text`、`inlineCode`、`image.alt` 等节点递归提取；代码围栏是 `code` 节点，不参与。slug 使用 `NFKC`、小写、空白转 `-`，保留 Unicode 字母、数字、标记、连接符与 `-`，去除其它标点；空 slug 回退为 `section`。所有生成 id 统一加 `docs-` 前缀；重复标题按出现顺序追加 `-2`、`-3`，并与当前 Markdown 树内已有后缀冲突时继续递增。所有 H1-H6 标题都分配 id，目录只取 H1-H3。`usedIds` 只覆盖当前 Markdown 树，`docs-` 前缀避免与已知的无前缀页面 id 冲突；页面若已有任意 `docs-*` id，本设计不查询也不证明其安全，这是命名空间的边界。TOC 仍是 AST 层级而非正则菜单。

替代方案：直接使用标题文本作 id 会产生无效或重复 id，并可能与页面已有 id 冲突；只给 H1-H3 分配 id 会让 H4-H6 的文档内锚点失配。两者均拒绝。

### 5. HashRouter 页内导航使用按钮，不触碰 URL hash

目录项使用原生 `<button type="button">`，不生成 `href`，因此中键、右键“在新标签页打开”、复制链接文本等路径都不会把 `#id` 暴露给 HashRouter。点击后通过 `document.getElementById`、`focus({ preventScroll: true })` 与 `scrollIntoView({ block: 'start', behavior })` 完成导航；按钮以 `aria-controls` 指向目标标题。`behavior` 由 `matchMedia('(prefers-reduced-motion: reduce)')` 决定：reduce 时为 `auto`，否则为 `smooth`。目标标题带 `tabIndex=-1`，CSS 提供 `:focus-visible` 样式。移动端选择时先关闭 `details`，再在下一帧聚焦和滚动，避免折叠引起的高度变化导致目标偏移。

替代方案：设置 `window.location.hash` 会把 hash 当路由地址；`<a href="#id">` 加 `preventDefault()` 在中键或复制链接时仍会暴露 `#id`；无 href 的 `role="link"` 会重复原生按钮的键盘语义。三者均不采用。

### 6. 布局采用右侧 224px 粘性目录与限宽阅读栏

页面使用 `max-width: 1120px` 的 CSS Grid：`minmax(0, 1fr) 224px`，正文在左、目录在右，避免在全局 232px 左导航之外再叠一条左栏。目录 `position: sticky; top: 24px`，正文为白色卡片且 `max-width: 860px`。Docs 根节点及子元素统一 `box-sizing: border-box`，让 `max-width` 包含 padding 与 border；不使用 `overflow-x: hidden` 掩盖溢出。宽度不大于 1024px 时改为单栏，桌面 TOC 由 CSS 隐藏，移动端使用独立的 `<details class="docs-toc-mobile">`，默认关闭，不使用 JS/CSS 双断点状态。移动端标题 `scroll-margin-top` 为 72px，覆盖 56px fixed 顶栏与间距。样式文件固定为 `src/components/docs/MarkdownGuide.css`。

替代方案：TOC 放左侧会在全局左导航旁再叠一条侧栏，压缩 1201px 附近的阅读宽度；单个 `details` 由 JS 维护 open 会有 resize 不同步和关闭/滚动时序问题。两者均拒绝。

### 7. 帮助页局部隔离 MainLayout 的滑动手势

`MainLayout` 在 `.main-content` 上监听 `touchstart` 与 `touchend`，横滑可能被误判成页面切换。帮助页只在 TOC 容器、`.docs-code-block` 和 `.docs-table-scroll` 上监听这两个事件并 `stopPropagation()`；不 `preventDefault()`，因此纵向滚动、点击和代码/表格自身横向滚动保持原生行为，`MainLayout` 本身不改。正文空白区域的触摸仍冒泡，保留既有横滑切页行为。

替代方案：修改 `MainLayout` 忽略 Docs 会改变全局手势并影响其它页面；对所有触摸 `preventDefault` 会破坏点击、纵向滚动和局部横滑。两者均拒绝。

### 8. Markdown 元素适配：安全链接、局部滚动、可复制代码

`a` 组件只对 `http(s)` 或协议相对外链加 `target="_blank"` 与 `rel="noopener noreferrer"`；URL 仍由 `react-markdown` 默认转换过滤。正文内部 `#` 锚点会 `preventDefault`，把 id 解码后交给同一 `focusAndScrollToHeading`，目标不存在也不写 hash。`table` 外包 `.docs-table-scroll`（`overflow-x: auto`），`pre` 外包 `.docs-code-block` 并内置复制按钮；`pre` 自身 `overflow-x: auto`，长代码不撑破正文。复制顺序：Clipboard API 成功则显示「已复制」；Clipboard 拒绝或缺失时使用隐藏 textarea 加 `execCommand('copy')` 并检查布尔返回值，成功仍显示「已复制」；两路都失败才显示「复制失败」，成功后 1.8 秒恢复。目录、复制按钮与状态反馈是 UI chrome，不属于原稿正文；原始 HTML 不进入可执行 DOM。

替代方案：Ant Design `Typography` 的复制组件会把 Markdown 渲染与旧 UI 体系重新耦合；引入语法高亮对当前少量 bash 内容没有必要。两者不采用。

### 9. 清理与测试职责

删除 `DocsJourney.css` 与旧 JSX 正文；保留 `statusDisplay.js`，由其它详情页继续引用。`scripts/tests/docs-cleanup.integration.mjs` 负责检查内容文件字节长度和哈希、`.gitattributes` 与 `git check-attr`、无 Global 引用、旧文件与旧正文零残留、`statusDisplay` 仍被其它页面引用、有引用资源守护仍会失败、新 CSS 的盒模型/局部滚动/两栏/1024px/72px 规则存在。`Docs*.test.jsx` 覆盖 AST 目录、重复/中文/行内 code/代码围栏假标题、按钮无 href、点击/焦点/hash、reduced motion、安全链接、内部锚点、GFM 表格、复制 API 成功/回退成功/两路失败、TOC/代码/表格触摸冒泡隔离、DOM id 命名空间、移动折叠与真实指南装配。真实浏览器矩阵单独记录，不用结构测试冒充视觉通过。

替代方案：保留旧正文让旧测试通过会直接违反单一正文源；不采用。

## Risks / Trade-offs

- 目录解析与正文渲染使用两次 parse，理论上 slug 序列可能分叉。两者调用同一 `assignHeadingIds`/slugger，并用重复标题、代码围栏假标题、行内 code 的测试约束。
- `?raw` 会让正文进入 JS bundle，增加 Docs chunk 体积。内容仅约 6KB 且路由懒加载；构建产物检查确认，不以运行时 fetch 换取复杂度。
- 桌面与移动两个目录实例可能造成重复标签或测试歧义。桌面 `nav` 与移动 `details` 使用不同可访问名称，CSS 只显示一个；测试用 `within` 限定容器，并验证移动 details 默认关闭。
- 帮助页内部横滑可能触发 `MainLayout` 页面切换。只在 TOC、代码块、表格局部 `stopPropagation()`，不改全局、不 `preventDefault`；单测断言父级不收到触摸事件、正文空白仍冒泡，源码检查确认触摸处理器不调用 `preventDefault`。浏览器矩阵未覆盖 MainLayout 横滑切页，保留为缺口。
- `max-width` 与 padding 在 content-box 下会超宽。Docs 根节点及子元素统一 `border-box`，外部浏览器检查 1440/1201/1024/768/390/320 的 `scrollWidth <= innerWidth`，并禁止 `overflow-x: hidden`。
- 移动端折叠后立即滚动可能因高度变化落点偏移。实现先关闭 details，再在 `requestAnimationFrame` 中聚焦和滚动；测试固定 RAF，但当前只断言点击后的最终关闭、焦点与滚动状态，先关闭再在下一帧定位的执行顺序仍是缺口。真实浏览器只记录标题顶部偏移，不替代该顺序断言。
- `focus({ preventScroll: true })` 或 Clipboard API 在旧浏览器或非安全上下文可能不可用。focus 使用特性兼容的可选参数；复制有 `execCommand` 回退并检查布尔返回值，只有两路失败才显示失败。
- `-text` 只关闭该文件的 Git 换行转换，不决定 diff 呈现，也不保证后续编辑器保留 CRLF。当前 `git check-attr` 为 `text: unset`、`diff: unspecified`，历史提交为文本 diff；字节保真依赖工作区副本的长度、哈希和 CRLF 检查，以及提交前暂存 blob 字节校验，若副本或暂存流程改变字节，检查会失败。
- 标题 id 的 `docs-` 前缀只避免已知无前缀页面 id 冲突；`usedIds` 仅覆盖当前 Markdown 树，页面已有任意 `docs-*` id 未被查询或证明安全。保持现有算法，不把该边界写成已覆盖。
- 应用内没有真实浏览器 E2E；页面级横向溢出与标题顶部偏移由外部浏览器矩阵补充，jsdom 只能证明结构与事件契约。该矩阵不程序化断言桌面 TOC 可见性、白色卡片背景、宽表格或长代码的局部滚动，也不测试 MainLayout 横滑；2026-10-24 矩阵依赖 Global 原稿生成期望标题，当前原稿缺失，复跑需要先恢复该输入；不得把结构测试冒充视觉通过。
- 原稿有错别字或语句问题。不修正，保持逐字节一致。
