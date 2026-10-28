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
