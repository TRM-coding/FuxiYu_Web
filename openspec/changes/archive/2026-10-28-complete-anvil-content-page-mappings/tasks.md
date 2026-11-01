# Tasks

## 1. AnnouncementEditor 路由、草稿与模板

- [x] 1.1 创建 `src/test/AnvilContentPages.test.jsx` 的 mock/helper 骨架，并实现 `test_anvil_announcement_editor_route_assembles_under_admin_layout`；覆盖 `frontend--page-announcement-editor` / `AnnouncementEditor 页面入口与身份` / `装配页面`。验证：目标测试通过，且使用真实 `AppRoutes`、`PermissionProvider`、`AdminLayout`，`getUserPermissions` 已 stub。
- [x] 1.2 实现 `test_anvil_announcement_editor_save_new_draft_keeps_id_and_content`、`test_anvil_announcement_editor_clear_template_then_save_keeps_content`、`test_anvil_announcement_editor_draft_ignores_stale_template_reference`；覆盖 `AnnouncementEditor 主流程` 的 `保存草稿成功`、`清空模板选择`、`模板变化后打开草稿`。验证：三个目标测试通过。
- [x] 1.3 实现 `test_anvil_announcement_editor_template_and_draft_preserve_placeholders`；覆盖 `AnnouncementEditor Markdown 正文源码高亮` / `模板与草稿载入后保留原文` 的占位符原样保留。验证：目标测试通过且断言 `{{name}}`/`{{date}}` 未被替换。

## 2. AnnouncementEditor 选择器与编辑器

- [x] 2.1 实现 `test_anvil_announcement_editor_stale_list_keeps_latest_loading`；覆盖 `AnnouncementEditor 机器和容器独立选择并各自保护列表与详情请求` / `同一选择器旧列表响应晚到`。验证：目标测试通过，旧响应不提前结束加载态。
- [x] 2.2 实现 `test_anvil_announcement_editor_stale_detail_keeps_other_selector`、`test_anvil_announcement_editor_container_selection_after_machine_switch`；覆盖同 Requirement 的 `旧机器或容器详情响应晚到`、`机器切换保留独立容器选择`。验证：两个目标测试通过。
- [x] 2.3 实现 `test_anvil_markdown_source_highlight_covers_emphasis_and_ordered_list`；覆盖 `AnnouncementEditor Markdown 正文源码高亮` / `源码标记按类别着色`。验证：真实 CodeMirror 中 `.cm-md-emphasis` 与有序列表标记命中，文档原文不变。

## 3. TemplateManager 路由与错误弹窗

- [x] 3.1 实现 `test_anvil_template_manager_route_assembles_under_admin_layout`；覆盖 `frontend--page-template-manager` / `TemplateManager 页面入口与身份` / `装配页面`。验证：目标测试通过，真实 `AppRoutes`/`PermissionProvider`/`AdminLayout` 下页面可达且无 403。
- [x] 3.2 实现 `test_anvil_template_manager_system_delete_and_unknown_error_popups`；覆盖 `TemplateManager 模板错误按现有协议映射` 的 `删除系统模板显示不可删除`、`未登记模板原因保留兜底`。验证：目标测试通过，真实 `showErrorModal` 弹窗显示中文且未知原因不硬套模板名称已存在。

## 4. Docs 路由与 Markdown 交互

- [x] 4.1 实现 `test_anvil_docs_route_assembles_in_main_layout`；覆盖 `frontend--page-docs` / `Docs 页面入口与身份` / `装配页面`。验证：目标测试通过，真实 `AppRoutes`/`PermissionProvider`/`MainLayout` 下 `/index/docs` 渲染指南。
- [x] 4.2 实现 `test_anvil_docs_gfm_renders_pre_code_structure`、`test_anvil_docs_copy_fallback_uses_full_code_without_clipboard`；覆盖 `Docs Markdown 安全渲染与 GFM 能力` 的 `GFM 表格与代码块`、`复制代码成功与失败`。验证：两个目标测试通过。
- [x] 4.3 实现 `test_anvil_docs_mobile_toc_closes_before_next_frame_scroll`、`test_anvil_docs_touch_isolation_does_not_prevent_default`；覆盖 `Docs 阅读布局与响应式目录` 的 `移动端先折叠再定位`、`帮助页滑动手势隔离`。验证：两个目标测试通过。

## 5. 运行、ESLint 与映射收尾

- [x] 5.1 运行 `src/test/AnvilContentPages.test.jsx` 及合适相关测试（`AnnouncementEditor.test.jsx`、`TemplateManager.test.jsx`、`DocsMarkdown.test.jsx`、`DocsPage.test.jsx`、`MarkdownSourceEditor.test.jsx`），`--maxWorkers=2`，记录真实退出码与失败明细。验证：命令通过，或真实失败按约束回报 root。
- [x] 5.2 对新测试文件运行 ESLint，记录真实退出码。验证：`npx eslint src/test/AnvilContentPages.test.jsx` 退出码 0。
- [x] 5.3 核对 16 个实际测试定位与断言后复算对应 planned 映射在 `test-plan.md` 中由 `[ ]` 改为 `[X]`；不改 locator/Assertion scope/Coverage note。验证：重跑 `openspec instructions apply --change "complete-anvil-content-page-mappings" --json`，进度更新且无 blocked。
- [x] 5.4 按 `openspec-verify-change` 输出简短结论；不创建 Anvil verify artifact，不声称人工浏览器/后端验收。验证：结论只引用真实测试/退出码与未覆盖边界。
