# frontend--page-announcement-editor Test Plan

Spec: [spec.md](spec.md)

## Current Mapping

### Requirement: AnnouncementEditor 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] `src/test/AnvilContentPages.test.jsx::test_anvil_announcement_editor_route_assembles_under_admin_layout`
- Assertion scope: 规划测试用真实 `AppRoutes`、`PermissionProvider`、`MemoryRouter` 和真实 `AdminLayout` 渲染 `/admin/announcements/editor`；mock `../api/user_api` 的 `getUserPermissions` 为 `vi.fn().mockResolvedValue({ entities: ['announcement:manage'], userId: 1, userName: 'audit' })`，使权限快照 loaded=true 并通过管理布局守卫；断言 `location.pathname` 保持该路径，页面出现「新建公告」与「保存草稿」，未被 403 拦截。只 mock 公告/机器/容器 API、上述权限 API 与 `antd.message`，不读取路由源码字符串，也不发真实权限请求。
- Coverage note: 现有 `AnnouncementEditor.test.jsx` 直接渲染页面组件，不断言路由入口、管理布局或权限快照；本条为 apply 阶段新增。页面自身不消费后端资源主键，草稿/模板 ID 只来自查询参数或页面状态。

### Requirement: AnnouncementEditor 主流程

#### Scenario: 保存草稿成功

- Test/check:
  - [X] `src/test/AnnouncementEditor.test.jsx::保存草稿不带 template_id，内容是用户编辑后的独立快照`
  - [X] `src/test/announcementDraftContract.test.js::剥离 template_id，保留 draft_id 与内容字段`
  - [X] `src/test/AnvilContentPages.test.jsx::test_anvil_announcement_editor_save_new_draft_keeps_id_and_content`
- Assertion scope: 既有页面用例在选模板后改写正文并点击保存，断言 `saveDraft` payload 不含 `template_id`，`content` 与 `raw_content` 都等于用户编辑后的原文；API 契约用例断言即使调用方带 `template_id` 也会被剥离，且 `draft_id`/`title`/`content` 保留。规划测试让 `saveDraft` 返回 `{ draft_id: 9 }`，断言保存后 URL 变为 `?draft_id=9`、正文仍在且可继续编辑，第二次保存 payload 带 `draft_id: 9`；「返回门户」仍指向 `/admin/announcements`。
- Coverage note: 既有页面用例不返回也不断言 draft_id 延续；规划测试补该分支。创建者私有边界由后端校验，前端无独立所有权断言。

#### Scenario: 清空模板选择

- Test/check:
  - [X] `src/test/AnnouncementEditor.test.jsx::清空模板选择不清空已编辑内容`
  - [X] `src/test/AnvilContentPages.test.jsx::test_anvil_announcement_editor_clear_template_then_save_keeps_content`
- Assertion scope: 既有用例选模板后点击清空，断言编辑器文档仍为模板正文、未因清空选择丢弃内容。规划测试在清空后点击保存，断言 payload 的 `content`/`raw_content` 仍为当前正文、不含 `template_id`，模板下拉保持未选中。
- Coverage note: 既有用例停在清空后的 DOM 内容，不断言保存结果；规划测试补保存分支。

#### Scenario: 模板变化后打开草稿

- Test/check:
  - [X] `src/test/AnnouncementEditor.test.jsx::重开草稿：内容只来自草稿快照，不恢复也不重放模板选择`
  - [X] `src/test/AnvilContentPages.test.jsx::test_anvil_announcement_editor_draft_ignores_stale_template_reference`
- Assertion scope: 既有用例带 `?draft_id=9` 打开草稿，断言 `getDraft(9)`、标题与正文来自草稿快照、编辑器重新命中 Markdown 高亮、模板下拉无已选项。规划测试让草稿响应额外携带历史 `template_id: 5`，并让模板列表中的模板正文与草稿正文不同，断言编辑器仍只显示草稿正文、不选中历史模板、模板列表只发首批选项请求，历史模板 id 不触发第二次内容覆盖。
- Coverage note: 既有用例的草稿没有历史模板 id；规划测试补“模板已修改或删除”条件下的恢复路径。模板变量替换不在前端执行。

### Requirement: AnnouncementEditor 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] `npm run build`
- Assertion scope: `npm run build` 退出码 0；本 check 只证明构建命令成功。页面级异步 chunk 的存在/命名、是否与入口隔离、体积和 Rollup 警告未由该命令自动断言。
- Coverage note: 该 check 只对构建命令负责；`React.lazy`/`Suspense` 组织、`vite.config.js` 的 `manualChunks` 配置、`requestManager.jsx`/`validateCmdArg.jsx` 的静态导入现状属人工核对事实。chunk 产出、体积与警告清单未由该命令证明，也不在本计划声称已观测。

### Requirement: AnnouncementEditor 机器和容器独立选择并各自保护列表与详情请求

#### Scenario: 首屏请求第 0 页

- Test/check:
  - [X] `src/test/AnnouncementEditor.test.jsx::test_q24_announcement_first_page_zero`
  - [X] `src/test/AnnouncementEditor.test.jsx::test_q22_announcement_independent_selectors`
- Assertion scope: 首次展开机器/容器选择器时，`test_q24` 断言机器列表以 `{ page_number: 0, page_size: 500 }` 调用，容器列表以 `{ machine_id: '', page_number: 0, page_size: 500 }` 调用；`test_q22_announcement_independent_selectors` 用同一组列表响应断言机器/容器选项实际渲染并可选择。两条合起来覆盖参数与结果写入。

#### Scenario: 机器切换保留独立容器选择

- Test/check:
  - [X] `src/test/AnnouncementEditor.test.jsx::test_q22_announcement_independent_selectors`
  - [X] `src/test/AnvilContentPages.test.jsx::test_anvil_announcement_editor_container_selection_after_machine_switch`
- Assertion scope: 既有用例先独立选中容器 A，再切换到机器 B；断言容器列表调用次数不增加、已选容器 A 和容器选项仍保留，打开容器下拉后容器 B 选项仍出现（未实际点击），机器 B 详情正常显示。规划测试在机器 B 已选后点击容器 B，断言容器 B 成为已选、机器 B 及其详情仍保留。
- Coverage note: 既有用例只证明容器 B 选项仍出现，未证明点击选择后机器选择仍保留；规划测试补实际选择分支。

#### Scenario: 同一选择器旧列表响应晚到

- Test/check:
  - [X] `src/test/AnnouncementEditor.test.jsx::test_q22_announcement_stale_machine_list`
  - [X] `src/test/AnnouncementEditor.test.jsx::test_q22_announcement_stale_container`
  - [X] `src/test/AnvilContentPages.test.jsx::test_anvil_announcement_editor_stale_list_keeps_latest_loading`
- Assertion scope: 机器和容器各产生两次列表请求时，后一次响应先回、前一次响应后回，最终只渲染后一次的选项，前一次选项不出现。规划测试让后一次请求保持未决、前一次响应先回，断言加载态仍保持到后一次请求结束，旧响应不提前结束当前加载。
- Coverage note: 既有两条用例证明旧响应不覆盖后一次选项，但不直接断言加载态；规划测试补“不提前结束当前加载状态”。

#### Scenario: 旧机器或容器详情响应晚到

- Test/check:
  - [X] `src/test/AnnouncementEditor.test.jsx::test_q22_announcement_stale_detail`
  - [X] `src/test/AnvilContentPages.test.jsx::test_anvil_announcement_editor_stale_detail_keeps_other_selector`
- Assertion scope: 既有用例分别把机器 A→B、容器 A→B 的详情请求乱序回包，断言旧详情不渲染、当前详情仍对应当前选择。规划测试先选中容器 B，再让旧机器详情晚到，断言容器 B 及其详情不被清空；反向再让旧容器详情晚到，断言机器 B 仍保留。
- Coverage note: 既有用例分别断言机器/容器各自的旧详情不覆盖当前选择，但不直接断言“不清空另一独立选择”；规划测试补交叉分支。

#### Scenario: 卸载后旧列表或详情响应不应用

- Test/check:
  - [X] `src/test/AnnouncementEditor.test.jsx::test_q22_announcement_unmount_no_apply`
- Assertion scope: 机器/容器列表或详情请求在途时卸载，随后旧响应 reject/resolve；`console.error` 中未出现匹配 `load (machines|containers)|not wrapped in act|unmounted component` 的页面级错误；重新挂载后新实例只显示自己的新列表/详情，旧机器、旧容器数据不出现。
- Coverage note: 既有测试只证明上述过滤模式未出现，不证明广义“无页面级错误”；它也未断言卸载前选中一个选择器后另一个选择仍保留，重挂载后是独立新状态，不把该点扩写成已覆盖。

### Requirement: AnnouncementEditor 模板下拉分页与编辑深链

#### Scenario: 205 个模板可加载到第 205 个

- Test/check:
  - [X] `src/test/AnnouncementEditor.test.jsx::test_q52_announcement_template_205`
  - [X] `src/test/AnnouncementEditorTemplateApiPaging.test.js::test_q52_announcement_api_paging_passthrough`
- Assertion scope: 页面首批以 `{ limit: 200, offset: 0 }` 请求，加载更多以 `{ limit: 200, offset: 200 }` 请求，第 205 个模板可选择并写入编辑器；API 用例断言请求 URL 的 `limit=200`、`offset=0/200`，单次 limit 不超过 200。既有页面用例未逐项计数首批/第二批的 DOM 项数。
- Coverage note: 未逐项断言“显示 200 个/5 个”；本行只证明请求参数、第 205 项可选择与 API 参数透传。

#### Scenario: 编辑此模板携带模板 ID

- Test/check:
  - [X] `src/test/AnnouncementEditor.test.jsx::test_q52_announcement_edit_template_link`
- Assertion scope: 选中模板后点击「编辑此模板」，路由跳转目标的 query 包含 `template_id=5`，不丢失模板标识。
- Coverage note: 目标模板管理页按 ID 打开编辑内容由 `frontend--page-template-manager` 的深链 Scenario 覆盖，本行只断言携带 ID。

#### Scenario: 加载更多失败保留已加载项

- Test/check:
  - [X] `src/test/AnnouncementEditor.test.jsx::test_q52_announcement_load_more_failure`
  - [X] `src/test/AnnouncementEditor.test.jsx::test_q52_announcement_template_205`
- Assertion scope: `test_q52_announcement_load_more_failure` 断言点击「加载更多」后 `listTemplates` 第二次调用发生、`message.error` 收到匹配「加载更多模板失败」的可读错误、模板 1 仍可选择并写入编辑器。`test_q52_announcement_template_205` 断言页面成功加载更多时第二次请求为 `{ limit: 200, offset: 200 }` 且第 205 项可选择。失败用例本身未断言第二次调用参数，也未逐项计数 200 项全部保留。
- Coverage note: 只声明“加载更多失败后模板 1 仍可选/列表未清空”，不声称 200 项全部保留；`offset=200` 的请求契约由 `test_q52_announcement_template_205` 提供，不把它冒充成失败分支的直接断言。

### Requirement: AnnouncementEditor 光标插入保留原选区

#### Scenario: 保持焦点时替换选区

- Test/check:
  - [X] `src/test/AnnouncementEditor.test.jsx::test_q55_announcement_insert_selection`
- Assertion scope: 通过真实 `EditorView` 设置主选区并保持焦点，点击插入按钮后文档替换目标选区，主选区折叠到插入内容末尾且为空选区，焦点回到编辑器。

#### Scenario: 按钮夺焦后仍插入原选区

- Test/check:
  - [X] `src/test/AnnouncementEditor.test.jsx::test_q55_announcement_insert_after_blur`
  - [X] `src/test/AnnouncementEditor.test.jsx::test_q55_announcement_insert_clamped_after_short_template`
- Assertion scope: 按钮获得焦点后再点击，内容仍写入失焦前缓存的选区而不是追加到文末；另一用例先缓存超出随后短模板长度的偏移，选择短模板后插入，断言偏移被钳制到当前正文长度、正文不越界、主选区折叠到插入末尾。

### Requirement: AnnouncementEditor Markdown 正文源码高亮

#### Scenario: 源码标记按类别着色

- Test/check:
  - [X] `src/test/MarkdownSourceEditor.test.jsx::源码标记按类别着色且保持原文`
  - [X] `src/test/AnvilContentPages.test.jsx::test_anvil_markdown_source_highlight_covers_emphasis_and_ordered_list`
- Assertion scope: 既有用例把标题、粗体、链接、无序列表、行内代码和围栏代码送入真实 CodeMirror，断言文档字符串与输入原文相等、原字符仍显示，并分别命中 `.cm-md-heading`、`.cm-md-strong`、`.cm-md-link`、`.cm-md-mark`、`.cm-md-code`。规划测试补斜体与有序列表标记，断言 `.cm-md-emphasis` 及对应标记类命中，文档仍为原文。
- Coverage note: 既有用例未分别断言斜体和有序列表标记的类别，只证明通用标记/代码类；规划测试补这两类。围栏代码的内容由既有 `.cm-md-code` 覆盖，信息串类别不在本 Scenario 的必需 THEN 内。

#### Scenario: 原始 HTML 与 Markdown 不做渲染转换

- Test/check:
  - [X] `src/test/MarkdownSourceEditor.test.jsx::HTML 与 Markdown 只显示源码不生成预览节点`
  - [X] `src/test/AnnouncementEditor.test.jsx::保存草稿不带 template_id，内容是用户编辑后的独立快照`
- Assertion scope: 带 `<b>`、`&amp;`、标题和链接的正文在编辑器中按原字符显示，HTML 实体不被解码，不出现 `h1`/`a`/`b`/`pre`/`p` 等预览节点；保存时 `content` 与 `raw_content` 都等于原文，不插入 HTML 转换结果。

#### Scenario: 模板与草稿载入后保留原文

- Test/check:
  - [X] `src/test/AnnouncementEditor.test.jsx::选模板把主题/正文复制进编辑器`
  - [X] `src/test/AnnouncementEditor.test.jsx::重开草稿：内容只来自草稿快照，不恢复也不重放模板选择`
  - [X] `src/test/AnvilContentPages.test.jsx::test_anvil_announcement_editor_template_and_draft_preserve_placeholders`
- Assertion scope: 既有用例选模板后编辑器文档等于 `body_template`，重开草稿后等于草稿 `content`，两种来源都重新命中 Markdown 高亮。规划测试使用含 `{{name}}`/`{{date}}` 占位符的模板主题与正文、以及含 `{{name}}` 的草稿内容，断言编辑器文档和标题逐字保留占位符，保存 payload 的 `content`/`raw_content` 也未发生变量替换。
- Coverage note: 既有 fixtures 的模板/草稿正文不含模板变量占位符，等于固定字符串只能证明该字符串未被改写；规划测试补“未执行模板变量替换引擎”的直接断言。

### Requirement: AnnouncementEditor Markdown 编辑器输入与可访问性

#### Scenario: 用户编辑可撤销和重做

- Test/check:
  - [X] `src/test/MarkdownSourceEditor.test.jsx::键盘撤销与重做同步受控正文`
- Assertion scope: 在真实编辑器产生一次用户输入后，按 Ctrl+Z 恢复上一状态、按 Ctrl+Y 恢复被撤销修改；两次变化后的编辑器文档与父组件收到的受控值一致。

#### Scenario: 键盘可访问性与中文 IME

- Test/check:
  - [X] `src/test/MarkdownSourceEditor.test.jsx::正文编辑器可通过键盘聚焦并允许 Tab 离开`
- Assertion scope: 正文编辑器暴露可访问名称「公告正文」、`contenteditable=true` 和 `aria-multiline=true`；可用键盘聚焦，Tab 移到下一个焦点目标而不是向正文插入缩进。
- Coverage note: 中文 IME 组合输入无法由 jsdom 可靠自动化，按下列可复现人工检查覆盖：Chrome/Edge 中用拼音输入法在正文编辑区组合输入「测试公告」，确认不丢字、不重复提交组合中间态，失焦后保存的正文与输入原文一致。该检查不声称已自动化或已执行。
