# frontend--page-template-manager Test Plan

Spec: [spec.md](spec.md)

## Current Mapping

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

#### Scenario: 新建模板时类别保持可选

- Test/check:
  - [X] `src/test/TemplateManager.test.jsx::test_q51_create_template_keeps_category_selectable`
- Assertion scope: 打开新建模板弹窗后，类别 Select 不带 `ant-select-disabled` 且可选择；默认值为 `custom`，选项仍含 `custom`/`system`；选择 `system` 并填写名称、主题、正文后保存，`createTemplate` 收到 `category=system` 及对应内容，成功提示后按既有流程刷新列表。
- Coverage note: 该 locator 覆盖新建模式类别可选与 `custom`/`system` 选项；既有列表、删除、分页和错误调用用例不覆盖该分支。

#### Scenario: 编辑自定义模板可转为系统

- Test/check:
  - [X] `src/test/TemplateManager.test.jsx::test_q51_custom_template_can_become_system`
- Assertion scope: 编辑 `category=custom` 的模板时类别 Select 可用；改为“系统”并保存后，`updateTemplate` 收到该模板 id、`category=system` 及名称/描述/主题/正文；成功后按既有流程关闭编辑并刷新列表。
- Coverage note: 该 locator 覆盖 `custom → system` 的保存 payload 与成功收尾；既有用例不覆盖该分支。

#### Scenario: 编辑系统模板锁定类别但保留内容编辑

- Test/check:
  - [X] `src/test/TemplateManager.test.jsx::test_q51_system_edit_disables_category_but_allows_content_edits`
- Assertion scope: 打开 `category=system` 的模板编辑弹窗后，类别 Select 的 `.ant-select` 容器带有 `ant-select-disabled` 类（固定断言）并显示“系统”；名称、描述、主题模板、正文模板输入仍可编辑；修改四项内容后保存，`updateTemplate` 收到修改后的内容且 `category` 仍为 `system`，成功提示后关闭编辑并刷新列表。
- Coverage note: 该 locator 覆盖系统模板编辑的 `.ant-select-disabled`、四项内容可编辑与保存 payload；既有 `系统模板不暴露删除入口` 只覆盖删除图标不渲染。

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
- Coverage note: 页面级 `test_q37_template_known_reasons` 的 body 虽含英文 message，但 mock 了 `showErrorModal`，只证明入参；真实弹窗 fixture `Q37_POPUP_SAMPLES` 仅传 `{ success: 0, error_reason: 'duplicate_entry' }`，未带后端英文 `message`，因此只断言中文出现与无“未收录”；未断言通用“重复项导致失败”或后端英文原文不出现。该两项 THEN 否定断言仍属现有覆盖边界，Q37 的英文隐藏范围不在本 change 的覆盖内。

#### Scenario: 删除系统模板显示不可删除

- Test/check:
  - [X] `src/test/TemplateManager.test.jsx::test_q37_template_system_delete_mapping`
  - [X] `src/test/showErrorModalMap.test.js::/announcements/templates → cannot_delete_system_template 显示「系统模板不可删除」`
  - [X] `src/test/AnvilContentPages.test.jsx::test_anvil_template_manager_system_delete_and_unknown_error_popups`
- Assertion scope: 删除接口以 400 和 `cannot_delete_system_template` 拒绝时，页面以结构化 body/status/route 调用 `showErrorModal`，模板列表仍显示原模板；映射表断言该 route/reason 的中文为「系统模板不可删除」。规划测试让页面使用真实 `showErrorModal` 触发同一失败，断言真实弹窗包含「系统模板不可删除」。
- Coverage note: 既有页面用例 mock 了 `showErrorModal`，只断言调用参数；映射表只断言 route/reason 值。规划测试补真实弹窗呈现。

#### Scenario: 系统模板类别被后端拒绝显示中文并保留编辑

- Test/check:
  - [X] `src/test/TemplateManagerSystemCategoryRequest.test.jsx::test_q51_real_400_keeps_edit_and_shows_chinese`
  - [X] `src/test/showErrorModalMap.test.js::test_q51_system_category_reason_maps_to_chinese`
  - [X] `src/test/showErrorModalMap.test.js::后端 error_reason 全集都有中文映射`
- Assertion scope: 真实 `TemplateManager` 通过真实 `announcement_api`（stub `fetch`）提交编辑，先修改 `name`、`description`、`subject_template`、`body_template` 四项内容；`fetch` 的 PUT 请求体保留这四项修改值且 `category=system`。随后 `fetch` 返回 HTTP 400、`body.error_reason=cannot_change_system_template_category`、`body.message` 与模板路由；页面把真实 `err.body`/`status`/`route` 交给真实 `showErrorModal`，可见弹窗必须出现“系统模板类别不可修改”，不出现“未收录的错误原因”或仅通用 400 而无中文；若后端英文 `message` 作为具体信息保留，不得替代中文映射。`message.success` 未调用；点击错误弹窗“好的”关闭后，再断言编辑弹窗恢复可见（`display` 不为 `none` 且标题仍为编辑模板），`name`、`description`、`subject_template`、`body_template` 四项输入值均保留，`category` 仍显示/提交 `system`；列表读取次数不因失败增加。映射表断言 `/announcements/templates` 对该 reason 的中文值；第三条 locator 覆盖扩展后的全集清单并断言该 reason 无缺失。
- Coverage note: 前两条 locator 分别覆盖真实 400 集成与中文映射/真实弹窗；第三条 `后端 error_reason 全集都有中文映射` 覆盖扩展后的全集清单。现有 `TemplateManager.test.jsx` 的 mock 用例只证明调用参数，不证明真实 400 的传输与消费。

#### Scenario: 未登记模板原因保留兜底

- Test/check:
  - [X] `src/test/TemplateManager.test.jsx::test_q37_template_unknown_reason`
  - [X] `src/test/ErrorPresentation.test.jsx::未知 error_reason 有中文兜底并标明未收录，不硬套已知错误`
  - [X] `src/test/AnvilContentPages.test.jsx::test_anvil_template_manager_system_delete_and_unknown_error_popups`
- Assertion scope: 页面把未登记的 `template_locked` body、409 和 route 原样交给 `showErrorModal`，不改成已知原因；通用错误呈现用例证明未知 reason 走「发生未知错误」并标注「未收录的错误原因」。规划测试在模板 route 上触发该原因，断言真实弹窗包含「未收录的错误原因：template_locked」且不包含「模板名称已存在」。
- Coverage note: 通用兜底用例使用 machine route，不能证明模板 route 不硬套模板文案；规划测试补 route-specific 分支。
