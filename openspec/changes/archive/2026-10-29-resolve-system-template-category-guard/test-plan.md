# Test Plan

<!-- Mapping only. [X] 表示该 test/check 已存在且其断言已从测试代码或构建配置核实；
     [ ] 表示规划中或尚未确认。本文件不记录 run/pass/fail、时间戳或执行证据。 -->

## frontend--page-template-manager

### Requirement: TemplateManager 主流程

#### Scenario: 删除已经被公告或草稿引用的自定义模板

- Test/check:
  - [X] src/test/TemplateManager.test.jsx::自定义模板可删除：确认后调用删除并回列表
  - [X] src/test/TemplateManager.test.jsx::系统模板不暴露删除入口
- Assertion scope: 自定义模板确认删除后调用 `deleteTemplate(5)` 并重新拉取列表；系统模板卡片不渲染删除图标。既有用例不读取草稿/公告内容，也不证明 Ctrl 解除引用后正文与投递记录不变。
- Coverage note: Web 侧只覆盖删除入口与列表刷新；“旧草稿/公告内容不随删除改变”是 Ctrl 后端解除引用语义，需由后端测试或人工检查证明，不在本 change 的 Web 自动化内。

#### Scenario: 新建模板时类别保持可选

- Test/check:
  - [X] src/test/TemplateManager.test.jsx::test_q51_create_template_keeps_category_selectable
- Assertion scope: 打开新建模板弹窗后，类别 Select 不带 `ant-select-disabled` 且可选择；默认值为 `custom`，选项仍含 `custom`/`system`；选择 `system` 并填写名称、主题、正文后保存，`createTemplate` 收到 `category=system` 及对应内容，成功提示后按既有流程刷新列表。
- Coverage note: 该 locator 覆盖新建模式类别可选与 `custom`/`system` 选项；既有列表、删除、分页和错误调用用例不覆盖该分支。

#### Scenario: 编辑自定义模板可转为系统

- Test/check:
  - [X] src/test/TemplateManager.test.jsx::test_q51_custom_template_can_become_system
- Assertion scope: 编辑 `category=custom` 的模板时类别 Select 可用；改为“系统”并保存后，`updateTemplate` 收到该模板 id、`category=system` 及名称/描述/主题/正文；成功后按既有流程关闭编辑并刷新列表。
- Coverage note: 该 locator 覆盖 `custom → system` 的保存 payload 与成功收尾；既有用例不覆盖该分支。

#### Scenario: 编辑系统模板锁定类别但保留内容编辑

- Test/check:
  - [X] src/test/TemplateManager.test.jsx::test_q51_system_edit_disables_category_but_allows_content_edits
- Assertion scope: 打开 `category=system` 的模板编辑弹窗后，类别 Select 的 `.ant-select` 容器带有 `ant-select-disabled` 类（固定断言）并显示“系统”；名称、描述、主题模板、正文模板输入仍可编辑；修改四项内容后保存，`updateTemplate` 收到修改后的内容且 `category` 仍为 `system`，成功提示后关闭编辑并刷新列表。
- Coverage note: 该 locator 覆盖系统模板编辑的 `.ant-select-disabled`、四项内容可编辑与保存 payload；既有 `系统模板不暴露删除入口` 只覆盖删除图标不渲染。

### Requirement: TemplateManager 模板错误按现有协议映射

#### Scenario: 重名创建显示模板名称已存在

- Test/check:
  - [X] src/test/TemplateManager.test.jsx::test_q37_template_known_reasons
  - [X] src/test/showErrorModalMap.test.js::/announcements/templates → duplicate_entry 显示「模板名称已存在」
  - [X] src/test/showErrorModalMap.test.js::/announcements/templates → duplicate_entry
- Assertion scope: 创建模板以 409 拒绝时，页面以 `{ message: body, status: 409, route: CREATE_ROUTE }` 调用 `showErrorModal`，其中 `body.error_reason=duplicate_entry`；映射表断言该 route/reason 的中文为“模板名称已存在”；真实弹窗用例断言可见弹窗包含该中文且不显示“未收录的错误原因”。
- Coverage note: 页面级 `test_q37_template_known_reasons` 的 body 虽含英文 message，但 mock 了 `showErrorModal`，只证明入参；真实弹窗 fixture `Q37_POPUP_SAMPLES` 仅传 `{ success: 0, error_reason: 'duplicate_entry' }`，未带后端英文 `message`，因此只断言中文出现与无“未收录”；未断言通用“重复项导致失败”或后端英文原文不出现。该两项 THEN 否定断言仍属现有覆盖边界，本 change 不扩展 Q37 的英文隐藏范围。

#### Scenario: 删除系统模板显示不可删除

- Test/check:
  - [X] src/test/TemplateManager.test.jsx::test_q37_template_system_delete_mapping
  - [X] src/test/showErrorModalMap.test.js::/announcements/templates → cannot_delete_system_template 显示「系统模板不可删除」
  - [X] src/test/AnvilContentPages.test.jsx::test_anvil_template_manager_system_delete_and_unknown_error_popups
- Assertion scope: 删除接口以 400 和 `cannot_delete_system_template` 拒绝时，页面以结构化 body/status/route 调用 `showErrorModal`，模板列表仍显示原模板；映射表断言该 route/reason 的中文为“系统模板不可删除”；真实弹窗用例断言可见弹窗包含该中文。
- Coverage note: `TemplateManager.test.jsx` mock 了 `showErrorModal`，只断言调用参数；真实弹窗呈现由同文件 `showErrorModalMap` 与 `AnvilContentPages` 用例补足。

#### Scenario: 系统模板类别被后端拒绝显示中文并保留编辑

- Test/check:
  - [X] src/test/TemplateManagerSystemCategoryRequest.test.jsx::test_q51_real_400_keeps_edit_and_shows_chinese
  - [X] src/test/showErrorModalMap.test.js::test_q51_system_category_reason_maps_to_chinese
  - [X] src/test/showErrorModalMap.test.js::后端 error_reason 全集都有中文映射
- Assertion scope: 真实 `TemplateManager` 通过真实 `announcement_api`（stub `fetch`）提交编辑，先修改 `name`、`description`、`subject_template`、`body_template` 四项内容；`fetch` 的 PUT 请求体保留这四项修改值且 `category=system`。随后 `fetch` 返回 HTTP 400、`body.error_reason=cannot_change_system_template_category`、`body.message` 与模板路由；页面把真实 `err.body`/`status`/`route` 交给真实 `showErrorModal`，可见弹窗必须出现“系统模板类别不可修改”，不出现“未收录的错误原因”或仅通用 400 而无中文；若后端英文 `message` 作为具体信息保留，不得替代中文映射。`message.success` 未调用；点击错误弹窗“好的”关闭后，再断言编辑弹窗恢复可见（`display` 不为 `none` 且标题仍为编辑模板），`name`、`description`、`subject_template`、`body_template` 四项输入值均保留，`category` 仍显示/提交 `system`；列表读取次数不因失败增加。映射表断言 `/announcements/templates` 对该 reason 的中文值；第三条 locator 覆盖扩展后的全集清单并断言该 reason 无缺失。
- Coverage note: 前两条 locator 分别覆盖真实 400 集成与中文映射/真实弹窗；第三条 `后端 error_reason 全集都有中文映射` 覆盖扩展后的全集清单。现有 `TemplateManager.test.jsx` 的 mock 用例只证明调用参数，不证明真实 400 的传输与消费。

#### Scenario: 未登记模板原因保留兜底

- Test/check:
  - [X] src/test/TemplateManager.test.jsx::test_q37_template_unknown_reason
  - [X] src/test/ErrorPresentation.test.jsx::未知 error_reason 有中文兜底并标明未收录，不硬套已知错误
  - [X] src/test/AnvilContentPages.test.jsx::test_anvil_template_manager_system_delete_and_unknown_error_popups
- Assertion scope: 页面把未登记的 `template_locked` body、409 和模板 route 原样交给 `showErrorModal`；通用错误呈现用例断言未知 reason 走“发生未知错误”并标注“未收录的错误原因”；模板 route 的真实弹窗用例断言包含“未收录的错误原因：template_locked”且不包含“模板名称已存在”。

## 回归边界（不属于本 change 新增行为）

- Test/check:
  - [X] src/test/AnvilContentPages.test.jsx::test_anvil_template_manager_route_assembles_under_admin_layout
  - [X] src/test/TemplateManager.test.jsx::test_q52_template_manager_205_pages
  - [X] src/test/TemplateManager.test.jsx::test_q52_template_manager_deep_link_205
  - [X] src/test/TemplateManager.test.jsx::test_q52_template_manager_invalid_id
  - [X] npm run build
- Assertion scope: 保留现有 `/admin/announcements/templates` 路由/权限装配、200/页分页与第二页请求参数、深链 `getTemplate(205)` 定位、无效 ID 的“模板不存在”降级，以及现有 Vite 构建检查。该组只证明既有映射未被本 change 改写，不代表本次规划执行过这些命令。
- Coverage note: 权限门、分页、深链和构建均不在本 change 修改；映射用于提醒 apply 时回归。Q68 将删除的 `announcement`/`template created_by` 当前未被 Web 消费，本 change 不新增所有者门禁，也不为其编造测试。
