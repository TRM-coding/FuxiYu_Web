# Test Plan

<!-- Mapping only. 本文件是 Scenario→Test/check 对账计划，不是执行结果台账：
     不记录 run/pass/fail/时间戳/覆盖数字。`[X]` 仅表示 locator 存在且其断言已从测试代码逐段核对，
     不表示本轮运行、通过或整个 Scenario 已覆盖；`[ ]` 表示规划测试或断言尚待 apply 阶段创建/确认。
     参数化 Vitest 用例按实际展开的 route/reason/text 命名。
     Coverage note 中的人工检查是明确范围的 check，不是已执行结果。 -->

## frontend--page-announcement-editor

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

## frontend--page-template-manager

### Requirement: TemplateManager 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] `src/test/AnvilContentPages.test.jsx::test_anvil_template_manager_route_assembles_under_admin_layout`
- Assertion scope: 规划测试用真实 `AppRoutes`、`PermissionProvider`、`MemoryRouter` 和真实 `AdminLayout` 渲染 `/admin/announcements/templates`；mock `../api/user_api` 的 `getUserPermissions` 为 `vi.fn().mockResolvedValue({ entities: ['announcement:manage'], userId: 1, userName: 'audit' })`，使权限快照 loaded=true；断言路径保持、页面出现「模板管理」与「新建模板」、未被 403 拦截。只 mock 公告 API、上述权限 API 与 `antd.message`，不发真实权限请求。
- Coverage note: 现有 `TemplateManager.test.jsx` 直接渲染页面组件，不断言路由入口、管理布局或权限快照；本条为 apply 阶段新增。

### Requirement: TemplateManager 主流程

#### Scenario: 删除已经被公告或草稿引用的自定义模板

- Test/check:
  - [X] `src/test/TemplateManager.test.jsx::自定义模板可删除：确认后调用删除并回列表`
  - [X] `src/test/TemplateManager.test.jsx::系统模板不暴露删除入口`
- Assertion scope: 列表中的自定义模板显示删除入口，确认后调用 `deleteTemplate(5)` 并重新拉取列表；系统模板不显示删除入口，页面不要求先删除草稿或公告。
- Coverage note: “旧草稿/公告的模板引用由后端解除、已有正文和投递记录不变”是后端解除引用语义；Web 侧只能断言前端不阻止删除、删除后刷新列表，不能证明后端保存的草稿/公告内容不变。人工检查（需 Ctrl 后端）：让一份草稿和一条公告引用该自定义模板，删除后分别读取草稿与公告，确认正文与投递记录不变且无需先删除引用；该检查不在 Web 自动化内，也不声称已执行。

### Requirement: TemplateManager 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] `npm run build`
- Assertion scope: `npm run build` 退出码 0；本 check 只证明构建命令成功。页面级异步 chunk 的存在/命名、是否与入口隔离、体积和 Rollup 警告未由该命令自动断言。
- Coverage note: 该 check 只对构建命令负责；`React.lazy`/`Suspense` 组织、`manualChunks` 配置、静态导入现状属人工核对事实。chunk 产出、体积与警告清单未由该命令证明，也不在本计划声称已观测。

### Requirement: TemplateManager 列表分页与深链定位

#### Scenario: 205 个模板分两页

- Test/check:
  - [X] `src/test/TemplateManager.test.jsx::test_q52_template_manager_205_pages`
- Assertion scope: 首批以 `{ limit: 200, offset: 0 }` 请求，第二页以 `{ limit: 200, offset: 200 }` 请求；页面显示「模板200」与「模板205」，第 205 个可打开编辑，编辑内容与模板正文一致。既有用例未逐项计数每页 DOM 卡片数量。
- Coverage note: 未逐项断言“显示 200 个/5 个”；本行只证明请求参数、首/末项可见与第 205 个可打开编辑。

#### Scenario: 深链定位第 205 个模板

- Test/check:
  - [X] `src/test/TemplateManager.test.jsx::test_q52_template_manager_deep_link_205`
- Assertion scope: 目标不在当前页时调用 `getTemplate(205)`，打开「编辑模板 — 模板205」并显示正文；`location.search` 仍包含 `template_id=205`。

#### Scenario: 无效模板 ID 不崩溃

- Test/check:
  - [X] `src/test/TemplateManager.test.jsx::test_q52_template_manager_invalid_id`
- Assertion scope: `getTemplate(999)` 以 404 拒绝后显示「模板不存在」，列表仍渲染模板 1，首批列表仍以 `{ limit: 200, offset: 0 }` 加载。
- Coverage note: 用例未直接断言“无未捕获异常/无空白”，只证明上述可见结果；不把测试未报错推导成完整错误边界。

### Requirement: TemplateManager 模板错误按现有协议映射

#### Scenario: 重名创建显示模板名称已存在

- Test/check:
  - [X] `src/test/TemplateManager.test.jsx::test_q37_template_known_reasons`
  - [X] `src/test/showErrorModalMap.test.js::/announcements/templates → duplicate_entry 显示「模板名称已存在」`
  - [X] `src/test/showErrorModalMap.test.js::/announcements/templates → duplicate_entry`
- Assertion scope: 创建模板以 409 拒绝时，页面以 `{ message: body, status: 409, route: CREATE_ROUTE }` 调用 `showErrorModal`，其中 `body.error_reason` 为 `duplicate_entry`；映射表断言该 route/reason 的中文为「模板名称已存在」；真实弹窗用例用同一 route/reason 调用 `showErrorModal`，断言可见弹窗包含该中文且不显示未收录原因。

#### Scenario: 删除系统模板显示不可删除

- Test/check:
  - [X] `src/test/TemplateManager.test.jsx::test_q37_template_system_delete_mapping`
  - [X] `src/test/showErrorModalMap.test.js::/announcements/templates → cannot_delete_system_template 显示「系统模板不可删除」`
  - [X] `src/test/AnvilContentPages.test.jsx::test_anvil_template_manager_system_delete_and_unknown_error_popups`
- Assertion scope: 删除接口以 400 和 `cannot_delete_system_template` 拒绝时，页面以结构化 body/status/route 调用 `showErrorModal`，模板列表仍显示原模板；映射表断言该 route/reason 的中文为「系统模板不可删除」。规划测试让页面使用真实 `showErrorModal` 触发同一失败，断言真实弹窗包含「系统模板不可删除」。
- Coverage note: 既有页面用例 mock 了 `showErrorModal`，只断言调用参数；映射表只断言 route/reason 值。规划测试补真实弹窗呈现。

#### Scenario: 未登记模板原因保留兜底

- Test/check:
  - [X] `src/test/TemplateManager.test.jsx::test_q37_template_unknown_reason`
  - [X] `src/test/ErrorPresentation.test.jsx::未知 error_reason 有中文兜底并标明未收录，不硬套已知错误`
  - [X] `src/test/AnvilContentPages.test.jsx::test_anvil_template_manager_system_delete_and_unknown_error_popups`
- Assertion scope: 页面把未登记的 `template_locked` body、409 和 route 原样交给 `showErrorModal`，不改成已知原因；通用错误呈现用例证明未知 reason 走「发生未知错误」并标注「未收录的错误原因」。规划测试在模板 route 上触发该原因，断言真实弹窗包含「未收录的错误原因：template_locked」且不包含「模板名称已存在」。
- Coverage note: 通用兜底用例使用 machine route，不能证明模板 route 不硬套模板文案；规划测试补 route-specific 分支。

## frontend--page-docs

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
- Assertion scope: Web 内副本为 6052 字节、SHA256 `4C2DEA950538717E5608A654692B6CC8A0B61DA18F84578A6EA9735893D2BF34`，并满足 CRLF 一致且大于 0。
- Coverage note: 当前 Global 工作副本中未找到该原稿文件，测试校验的是 Web 副本对规格记录值的保真，不是本次跨仓库逐字节比较；不在计划里伪造 Global 对比结果。若 Global 原稿恢复，跨仓库人工检查按“长度 6052、SHA256 相同、逐字节相等”三项执行；该检查当前不可复现，不写成已覆盖。

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
