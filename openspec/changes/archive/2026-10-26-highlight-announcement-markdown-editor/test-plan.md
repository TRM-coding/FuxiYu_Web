# Test Plan

## frontend--page-announcement-editor

### Requirement: AnnouncementEditor Markdown 正文源码高亮

#### Scenario: 源码标记按类别着色

- Test/check:
  - [X] src/test/MarkdownSourceEditor.test.jsx::源码标记按类别着色且保持原文
- Assertion scope: 用 `getByRole('textbox', { name: '公告正文' })` 与 `EditorView.findFromDOM` 读取真实编辑器状态；正文同时包含标题、粗体、链接、列表、行内代码和围栏代码时，文档字符串与输入原文完全一致，源码字符仍显示，且分别命中标题、粗体、链接、Markdown 标记和代码的稳定高亮类；不使用预览节点替代断言。

#### Scenario: 原始 HTML 与 Markdown 不做渲染转换

- Test/check:
  - [X] src/test/MarkdownSourceEditor.test.jsx::HTML 与 Markdown 只显示源码不生成预览节点
  - [X] src/test/AnnouncementEditor.test.jsx::保存草稿不带 template_id，内容是用户编辑后的独立快照
- Assertion scope: 带 HTML 标签、HTML 实体和 Markdown 语法的正文在编辑器中按原字符显示，HTML 实体仍以原字符串（如 `&amp;`）保留，编辑区不出现由正文生成的 `h1`、`a`、`b`、`pre` 等预览节点；保存时 `content` 与 `raw_content` 均等于原文，不插入 HTML 转换结果。
- Coverage note: 保存行沿用现有用例名，仅扩展 `raw_content` 与 HTML/Markdown 原文断言；现有 locator 不变。

#### Scenario: 模板与草稿载入后保留原文

- Test/check:
  - [X] src/test/AnnouncementEditor.test.jsx::选模板把主题/正文复制进编辑器
  - [X] src/test/AnnouncementEditor.test.jsx::重开草稿：内容只来自草稿快照，不恢复也不重放模板选择
- Assertion scope: 选择模板后编辑器文档等于 `body_template`，打开草稿后等于草稿 `content`；两种来源都不发生模板变量替换或字符串改写，并重新命中 Markdown 高亮类；模板选择仍只是复制初值。

### Requirement: AnnouncementEditor Markdown 编辑器输入与可访问性

#### Scenario: 用户编辑可撤销和重做

- Test/check:
  - [X] src/test/MarkdownSourceEditor.test.jsx::键盘撤销与重做同步受控正文
- Assertion scope: 在真实编辑器上产生一次用户输入后，按撤销快捷键正文恢复到上一状态，按重做快捷键恢复该修改；两次变化后的文档与父组件收到的值一致。
- Coverage note: 本场景只覆盖用户编辑历史；模板切换与草稿载入重置历史，不承诺跨载入撤销，属性插入历史也不在本行断言内。

#### Scenario: 键盘可访问性与中文 IME

- Test/check:
  - [X] src/test/MarkdownSourceEditor.test.jsx::正文编辑器可通过键盘聚焦并允许 Tab 离开
- Assertion scope: 正文编辑器暴露可访问名称“公告正文”和多行文本框语义；键盘可聚焦，Tab 移到下一个焦点目标而不是向正文插入缩进字符。
- Coverage note: 中文 IME 组合输入无法由 jsdom 可靠自动化，需在 Chrome/Edge 中手工用拼音输入中文，检查不丢字、不重复提交组合中间态且保存原文一致；真实浏览器中的高亮颜色、字体和滚动对齐也需手工验收，本计划不声称这些项目已自动化覆盖。

### Requirement: AnnouncementEditor 光标插入保留原选区

#### Scenario: 保持焦点时替换选区

- Test/check:
  - [X] src/test/AnnouncementEditor.test.jsx::test_q55_announcement_insert_selection
- Assertion scope: 通过真实 `EditorView` 设置编辑区主选区并保持焦点，点击插入按钮后编辑器文档替换原文选区、主选区折叠到插入内容末尾且焦点仍在编辑器；现有业务结果断言不变。
- Coverage note: 现有 Q55 用例名保留，仅把 textarea 内部选择器与 `selectionStart/selectionEnd` 断言换成编辑器主选区断言。

#### Scenario: 按钮夺焦后仍插入原选区

- Test/check:
  - [X] src/test/AnnouncementEditor.test.jsx::test_q55_announcement_insert_after_blur
  - [X] src/test/AnnouncementEditor.test.jsx::test_q55_announcement_insert_clamped_after_short_template
- Assertion scope: 现有用例验证按钮夺焦后仍按缓存选区插入、不追加到末尾；新增用例先缓存一个大于模板回填后正文长度的偏移，再选择更短模板并插入，断言目标位置被钳制到当前文末、正文与主选区有效且不产生越界异常。
- Coverage note: 现有 blur 用例名保留；新增 locator `test_q55_announcement_insert_clamped_after_short_template` 是新增映射，主 sidecar 同步时只新增该条，不涉及既有用例改名。钳制路径由模板缩短回填覆盖，草稿回填复用同一重建/钳制入口。
