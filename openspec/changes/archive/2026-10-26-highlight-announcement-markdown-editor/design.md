# Design

## Context

公告编辑页 `/admin/announcements/editor` 的左侧“正文”目前是 Ant Design `TextArea`（`AnnouncementEditor.jsx` 中标题为“正文”的 Card），由 `content`/`rawContent` 受控，模板选择复制 `body_template`，草稿通过现有 API 读取和保存。属性按钮依赖 `textarea` 的 `selectionStart/selectionEnd` 缓存实现失焦后仍按原选区插入，测试 `AnnouncementEditor.test.jsx` 也直接依赖 textarea 的 `.value`、`setSelectionRange` 等 DOM 语义。

主规格仍以 textarea 的 `selectionStart/selectionEnd` 描述光标插入要求；本变更必须用 MODIFIED 完整替换该 requirement 块，保留原 requirement 与两个 scenario 名称，只把文本域语义改为编辑器主选区/偏移缓存、失焦缓存与长度钳制，避免同步后同时存在旧 textarea 契约和新编辑器契约。

同一仓库的 `/admin/announcements/templates` 管理页也有“正文模板”输入框，但它编辑的是模板库数据，不是本次要增强的公告正文编辑区；本次保持该页原样。现有路由已对 `AnnouncementEditor` 使用懒加载，新增编辑器依赖不应进入应用入口 chunk。

约束是只增加源码高亮：不渲染 Markdown 预览、不把 Markdown/HTML 转成展示 DOM、不添加工具栏或富文本状态，也不改草稿/模板字段、后端接口、属性插入值和光标缓存规则。新编辑器必须继续支持受控编辑、模板切换、草稿载入/保存、中文 IME、键盘可访问与撤销/重做。

## Goals / Non-Goals

**Goals:**

- 在公告正文编辑区提供 Markdown 源码语法高亮，覆盖标题、粗体/斜体、链接、有序/无序列表标记、行内代码和围栏代码。
- 用真实可编辑的单一文本表面显示源码，避免 textarea 与高亮层叠加造成字号、行高、滚动或光标错位。
- 保留现有公告编辑业务契约，并把依赖 textarea 内部结构的测试迁移为真实编辑器语义测试。
- 依赖数量与职责尽量小，不引入预览、工具栏或自维护 Markdown 解析器。

**Non-Goals:**

- 不实现 Markdown 预览、HTML 渲染、富文本或 WYSIWYG 编辑，不改变公告的实际投递格式。
- 不添加格式化工具栏、快捷键套件、模板变量替换、自动列表续写、行号栏、折叠栏或搜索面板。
- 不修改 `TemplateManager` 的正文模板输入框、公告列表/已发送公告展示、草稿/模板 API 或权限。
- 不进行与本功能无关的打包重构、全局主题改造或生产环境部署/联调。

## Decisions

### 采用 CodeMirror 6 基础编辑器与官方 Markdown 语言包

新增以下直接依赖：`@codemirror/state`、`@codemirror/view`、`@codemirror/commands`、`@codemirror/language`、`@codemirror/lang-markdown`、`@lezer/highlight`。编辑器使用 CodeMirror 6 原生的 contenteditable 表面和官方 `@codemirror/lang-markdown` / Lezer Markdown 语法树做着色，不写正则或自定义 Markdown 解析器。

不采用以下方案：

- 自写 textarea + 高亮 overlay：需要同步字号、行高、换行和滚动，正是本次要避免的双层错位风险。
- `@uiw/react-codemirror` 等 React 包装层：会再增加一层受控与命令接口，直接使用核心包即可满足选区插入与受控同步。
- `codemirror` 的 `basicSetup`：会带入行号、折叠、搜索、自动补全等本次不需要的 UI 和交互。
- 自定义 Markdown 解析：规则易碎，且会偏离 CodeMirror 官方语法维护。

### 单一编辑表面与尺寸样式

`MarkdownSourceEditor` 只渲染一个 CodeMirror 编辑面；语法高亮是同一 DOM 上的装饰，不另设 textarea 或镜像层。使用 `EditorView.lineWrapping` 保留正文换行习惯，不添加行号、gutter、活动行或工具栏。CSS 将编辑区限制在现有正文区域约 14–35 行高度内，超出后由 CodeMirror 自身滚动；等宽字体、字号和行高统一由编辑器主题定义，避免旧 textarea 与新编辑器两套排版。

沿用原占位提示的文案，使用 `placeholder` 扩展显示；空正文时仍提示“在此编写公告正文”和右侧元素按钮用法。编辑器内容可编辑节点增加可访问的 `aria-label="公告正文"`、多行文本框语义和清晰的聚焦环。

### 语法高亮映射使用稳定类名

Markdown 扩展使用 `markdown({ addKeymap: false, completeHTMLTags: false })`：保留解析和高亮，关闭 Markdown 的自动列表续写和无障碍无关的 HTML 标签补全。`HighlightStyle.define` 将高亮标签映射到稳定类名，再由组件 CSS 着色：

- 标题 1–6 映射到标题类；粗体、斜体、链接/URL、引用分别使用独立类。
- 行内代码和围栏代码内容使用代码类；标题井号、粗体星号、列表符号、链接方括号、代码反引号等标记使用统一的 Markdown 标记类，确保列表项和围栏边界也可见着色。
- 颜色需与现有 Ant Design 浅色界面协调并保持可读对比；不引入第二套主题包，也不改变全局 CSS。

不把 `react-markdown` 或现有文档渲染组件接入公告编辑器；编辑区不会生成 `<h1>`、`<a>`、`<pre>` 等预览节点。

### React 适配层负责受控同步、选区与命令

新增 `src/components/MarkdownSourceEditor.jsx`，以 `forwardRef`/`useImperativeHandle` 暴露 `insertText(text)`，由 `AnnouncementEditor` 通过 ref 调用。组件接收 `value` 与 `onChange`，只在挂载时创建 `EditorView`，卸载时销毁；更新回调保存在 ref 中，避免每次渲染重建编辑器或重配扩展。

- 用户输入、粘贴或撤销产生文档变化时，通过 update listener 把 `state.doc.toString()` 回传给父组件的 `setContent/setRawContent`；父组件值未变化时不再向编辑器派发。
- 外部值变化（模板切换、草稿载入）且与当前文档不同时，用同一组扩展和多行可编辑属性重建 `EditorState` 并设置到现有 `EditorView`。这是新的文档基线，重置编辑器历史；用户编辑和属性插入仍使用 CodeMirror 的 `history()`，可正常撤销/重做。
- 重建外部文档时只钳制已有的选区缓存，不凭空制造缓存。若缓存偏移超过模板/草稿回填后的正文长度，插入时钳制到当前文末；没有用户选区缓存时，插入同样回退到正文末尾，与旧 textarea 的 `content.length` 回退一致。
- 选区缓存由组件在编辑区获得焦点、选区变化和失焦时维护。`insertText` 在编辑区仍有焦点时使用当前主选区，失焦时使用缓存；将 `from/to` 钳制到当前文档长度后替换，设置光标到插入内容末尾，再把焦点还给编辑器。
- 快捷键使用 `historyKeymap` 和标准编辑键位，不绑定 `indentWithTab`；Enter 覆盖为纯换行，Tab 保持浏览器默认的焦点移动，避免改变纯文本编辑习惯和键盘可访问性。编辑器不拦截中文 IME 组合事件，依赖 CodeMirror 原生组合输入处理。

### 页面集成只替换正文控件

`AnnouncementEditor` 保留标题、模板下拉、机器/容器选择、时间选择、问候语/结束语、草稿保存和所有 API 调用；只把标题为“正文”的 `TextArea` 换成 `MarkdownSourceEditor`。原有的 `textareaRef`、`resizableTextArea` 访问、`rememberSelection` 和父级选区缓存移入编辑器组件；所有插入按钮仍调用统一的插入入口。`TemplateManager` 不改。

### 测试以真实编辑器语义为准

`src/test/AnnouncementEditor.test.jsx` 不再用 `.value`、`setSelectionRange` 或 `.resizableTextArea textarea` 作为正文断言入口；改为通过可访问角色定位“公告正文”编辑区，并用 CodeMirror 公开的 `EditorView.findFromDOM` 获取状态、设置选区和检查光标。已有业务用例名保持不变，至少包括 `选模板把主题/正文复制进编辑器`、`保存草稿不带 template_id，内容是用户编辑后的独立快照`、`重开草稿：内容只来自草稿快照，不恢复也不重放模板选择`、`test_q55_announcement_insert_selection` 与 `test_q55_announcement_insert_after_blur`；只迁移内部正文交互，不新增编辑器替身或大范围 mock。

新增 `src/test/MarkdownSourceEditor.test.jsx`，对真实 CodeMirror DOM 与状态断言：稳定的高亮类名、源码字符保留、无 HTML 预览节点、撤销/重做、可访问名称与 Tab 离开。另新增 `test_q55_announcement_insert_clamped_after_short_template`，覆盖旧缓存偏移大于更短模板回填后正文长度的钳制分支。jsdom 对 Range 布局矩形不完整，只在测试支撑处补充 `Range.prototype.getClientRects/getBoundingClientRect` 的空矩形垫片，避免 CodeMirror 异步测量抛出未处理异常；不替代编辑器状态、选择、按键或 API。中文 IME、真实浏览器高亮颜色和滚动对齐无法由 jsdom 可靠证明，保留真实浏览器手工验收并在测试计划中记录。

## Risks / Trade-offs

- **jsdom 与 CodeMirror 布局差异**：真实编辑器依赖布局测量。以最小 Range 垫片保证测试可运行，但像素级高亮、字体和滚动仍靠浏览器手工检查；不在测试中伪造这些结果。
- **中文 IME 自动化缺口**：IME 组合输入难以在 jsdom 中真实复现，只能验证不拦截组合事件与受控同步的设计，并在 Chrome/Edge 手工验证不丢字、不重复提交中间态；测试计划会明确标为部分覆盖。
- **受控同步与历史边界**：模板/草稿载入重建状态会重置历史，用户编辑与插入保留 undo/redo。这样不同文档基线不会互相撤销，但用户不能跨模板载入撤销。若后续要求跨载入撤销，需另立变更调整。
- **包体积增加**：CodeMirror 包会增大公告编辑器页面 chunk，但页面已懒加载且不改入口 chunk 或 `manualChunks`；实现后用生产构建确认没有静态/动态导入警告或构建失败。
- **测试迁移破坏既有意图**：旧断言绑定 textarea 内部实现，若只换选择器容易漏测业务。因此迁移时逐条保留原断言含义（模板复制、草稿快照、保存字段、选区与失焦插入），不以 mock 编辑器换取绿色。
- **范围蔓延**：模板管理页也有正文模板输入框，容易被误纳入。设计明确只改公告编辑页“正文”，`TemplateManager` 及其测试保持不变。
