# Proposal

## Why

公告编辑器的“正文”目前以纯文本显示，标题、链接、列表和代码围栏等 Markdown 结构难以辨认，长公告编辑时容易遗漏或写错标记。需要在不改变公告内容、草稿数据和既有编辑流程的前提下，只增强正文编辑区的源码可读性。

## What Changes

- 将 `/admin/announcements/editor` 的“正文”文本域替换为 Markdown 源码编辑器，对标题、粗体/斜体、链接、有序/无序列表标记、行内代码和围栏代码等源码语法着色。
- 保持正文按 Markdown 原文编辑、加载和保存；不渲染 Markdown 预览，不转换 HTML，不添加快捷工具栏、富文本编辑状态机或后端转换接口。
- 保留现有受控编辑、模板复制初值、草稿载入/保存、机器/容器属性插入、失焦选区恢复、撤销/重做、中文 IME 和键盘可访问性。
- 将主规格现有“光标插入保留原选区”要求以 MODIFIED 更新为编辑器主选区/偏移缓存语义，保留原 requirement 与两个 scenario 名称，避免同步后残留失配的 textarea 契约。
- 仅调整公告正文编辑区；模板管理页 `/admin/announcements/templates` 的正文模板输入框、公告列表与已发布公告展示均不改变。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `frontend--page-announcement-editor`: 新增 Markdown 正文源码高亮与编辑器输入/可访问性要求，并把既有光标插入要求更新为真实编辑器选区语义。

## Impact

- 页面与组件：`src/pages/AnnouncementEditor.jsx`、该页样式，以及新增的 Markdown 源码编辑器组件；路由和页面入口不变。
- 依赖：新增 CodeMirror 6 的 Markdown 语言支持、编辑器视图/状态、历史命令与语法高亮相关软件包；不引入 Markdown 预览组件。
- 测试：适配 `src/test/AnnouncementEditor.test.jsx` 中依赖 textarea 的原有用例，保留既有模板、草稿、保存和属性插入用例名及业务断言，并新增编辑器语法高亮、撤销/重做和选区钳制用例。
- 数据与接口：不改动草稿/模板的 API、字段、模板选择语义或后端；不连接或修改任何生产环境。
