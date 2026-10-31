# Tasks

## 1. 依赖与编辑器基础

- [x] 1.1 安装 CodeMirror 6 的 state/view/commands/language/lang-markdown 与 `@lezer/highlight` 依赖并更新 lockfile；验证 `npm ls @codemirror/state @codemirror/view @codemirror/commands @codemirror/language @codemirror/lang-markdown @lezer/highlight` 无缺失。
- [x] 1.2 新增 `src/components/MarkdownSourceEditor.jsx` 与对应 CSS：单一 CodeMirror 编辑面、官方 Markdown 解析、稳定高亮类、占位提示、可访问多行语义、行换行与 14–35 行滚动区域，不含工具栏/预览/行号；验证 `npm run build` 可解析新增模块。
- [x] 1.3 在 `AnnouncementEditor` 中以 `MarkdownSourceEditor` 替换“正文”TextArea，保持受控 `content/rawContent`、模板复制、草稿载入/保存和所有属性插入入口；验证 `frontend--page-announcement-editor / AnnouncementEditor Markdown 正文源码高亮 / 模板与草稿载入后保留原文` 的既有业务断言。
- [x] 1.4 在编辑器适配层实现当前/失焦选区缓存、插入替换、光标折叠、焦点恢复和长度钳制；验证 `frontend--page-announcement-editor / AnnouncementEditor 光标插入保留原选区 / 保持焦点时替换选区` 与 `按钮夺焦后仍插入原选区`。

## 2. 编辑历史、IME 与可访问性

- [x] 2.1 接入 CodeMirror history 与键盘映射，保留 undo/redo、纯换行 Enter，不绑定 Tab 缩进，不拦截 IME；验证 `frontend--page-announcement-editor / AnnouncementEditor Markdown 编辑器输入与可访问性 / 用户编辑可撤销和重做` 与 `键盘可访问性与中文 IME` 的可自动断言部分。
- [x] 2.2 确认源码编辑不生成 Markdown/HTML 预览节点，原始 HTML、实体和 Markdown 字符按原文保存；验证 `frontend--page-announcement-editor / AnnouncementEditor Markdown 正文源码高亮 / 源码标记按类别着色` 与 `原始 HTML 与 Markdown 不做渲染转换`。

## 3. 测试迁移与新增

- [x] 3.1 在测试支撑中补最小 Range 布局矩形垫片与真实 `EditorView` 定位辅助，不 mock 编辑器状态、选区或按键；验证新增编辑器测试可挂载且无未处理 Range 异常。
- [x] 3.2 迁移 `src/test/AnnouncementEditor.test.jsx` 的正文交互到真实编辑器语义，保留现有业务用例名，并补齐保存 `raw_content`、HTML 原文和 `test_q55_announcement_insert_clamped_after_short_template`；运行定向测试并通过。
- [x] 3.3 新增 `src/test/MarkdownSourceEditor.test.jsx`，覆盖稳定高亮类、无预览节点、撤销/重做、可访问名称与 Tab 离开；运行定向测试并通过。
- [x] 3.4 按实际存在的测试与断言核对 `test-plan.md` 的 `[ ]` 映射，仅将已确认的映射改为 `[X]`；不得把运行结果写进测试计划。

## 4. 验证与收尾

- [x] 4.1 运行 `npm run lint` 与 `npm run build`，将日志写入 `E:/AI/Fuxi_audit_artifacts/announcement-markdown-2026-10-26`，并修复本 change 引起的问题。
- [x] 4.2 运行 `npm run test:web` 定向 AnnouncementEditor/MarkdownSourceEditor/TemplateManager 并运行一次完整 `npm test`，记录准确退出码与日志路径。
- [x] 4.3 复核 tasks 全部完成、test-plan 映射状态与实际断言一致、未修改 review/主规格或创建额外 verify 产物。
