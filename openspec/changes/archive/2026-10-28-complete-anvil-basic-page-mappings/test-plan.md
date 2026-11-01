# Test Plan

<!-- Mapping only. 本文件是 scenario→test 对账计划，不是执行结果台账：
     不记录 run/pass/fail/时间戳/覆盖数字。`[X]` 仅表示该映射所引用的既有测试/检查存在，
     且其断言已从测试代码或构建配置确认；`[ ]` 仅表示映射或断言尚未确认。 -->

## frontend--page-admin-profile

### Requirement: AdminProfile 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] `src/test/AnvilBasicPages.test.jsx::test_anvil_adminprofile_route_assembles_from_permission_snapshot`
  - [X] `src/test/AnvilBasicPages.test.jsx::test_anvil_adminprofile_denies_without_bypass_and_navigates`
- Assertion scope: 真实 `AppRoutes` + `PermissionProvider` + `MemoryRouter` 渲染 `/admin/profile`（mock `../api/user_api` 的权限快照提供任一 manage 实体以通过 `AdminLayout` 守卫）：`location.pathname` 为 `/admin/profile`，页面标题「管理员信息」出现（`React.lazy` 装配 + 既有 `Suspense`，不新增加载 UI）；查询用户的 userId 取自 `PermissionContext` 快照（当 `localStorage` 里放另一 id 时仍按快照 id 查询 `getUserDetailInformation`），页面身份与后端资源主键分别处理；权限快照就绪后无 `bypass_auth_entity` 时 `showErrorModal` 收到 403 提示且 `handleAuthError` 导航到 `/index`。
- Coverage note: 「装配页面」THEN 的布局断言只到页面落位与标题可见，不做视觉/样式断言。拒入分支虽出自同一 Requirement 的权限约束，因该 Requirement 下无独立 Scenario，随本 Scenario 一并断言。

### Requirement: AdminProfile 主流程

#### Scenario: 资料查询成功

- Test/check:
  - [X] `src/test/AnvilBasicPages.test.jsx::test_anvil_adminprofile_maps_user_info_fields_and_placeholders`
- Assertion scope: mock `../api/user_api` 的 `getUserDetailInformation` 返回 `{ user_info: { username, email, graduation_year, amount_of_container } }` 后，`username`/`email`/`graduation_year`/「拥有容器」数量按 user_info 映射渲染；空 `email`、空 `graduation_year` 渲染现有占位「未知」，空 `amount_of_container` 沿用当前空串占位；查询失败（非 401）不弹框、不误报。
- Coverage note: 「空字段沿用当前占位行为」要求断言到具体占位文案（`未知` 与空串），不得只断言"渲染成功"。

### Requirement: AdminProfile 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] `npm run build`
- Assertion scope: 既有 `vite build` 检查（`npm run build`）：退出码 0；构建输出为页面级异步 chunk 结构，`AdminProfile` 以独立异步 chunk 产出、不与入口 chunk 合并。
- Coverage note: 该 check 只对构建命令与其可观测产物负责。`React.lazy`/`Suspense` 组织、`vite.config.js` 的 `manualChunks` 配置、`requestManager.jsx`/`validateCmdArg.jsx` 的静态导入现状属人工核对事实，不由本 check 断言，也不新增静态机械测试；chunk 体积与警告清单规格已写明属验收观测，非历史指标。

## frontend--page-apply

### Requirement: Apply 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] `src/test/legacyApplyRedirect.test.jsx::"/index/apply" 重定向到 "/index/create"，不再渲染旧表单`
  - [X] `src/test/legacyApplyRedirect.test.jsx::"/index/apply?machine_id=42" 把机器上下文带到新入口`
  - [X] `src/test/legacyApplyRedirect.test.jsx::兼容 camelCase 的 machineId 查询参数`
  - [X] `src/test/legacyApplyRedirect.test.jsx::无机器上下文的旧链接仍回到新入口，不退化成 404`
- Assertion scope: 访问 `/index/apply` 后 `location.pathname` 为 `/index/create` 且不再是 `/index/apply`；CreateContainer 落位（`create:no-machine` / `create:42` / `create:9`）；旧 Apply 表单的确认标题「添加容器」不出现；`?page=3` 等无效上下文仍回新入口、不落 404（「页面走丢了」不出现）。
- Coverage note: 该文件按既有设计桩化 `CreateContainer`（`vi.mock('../pages/CreateContainer')`），只验证「旧 URL 落到新入口 + 机器上下文保留」；「不提交缺少 image_id 的旧请求」以旧表单不渲染间接体现，旧表单请求体本身无独立断言。创建入口的身份/权限与资源契约由 CreateContainer 承载，不在本 capability 断言。

### Requirement: Apply 主流程

#### Scenario: 通过旧表单提交创建

- Test/check:
  - [X] `src/test/legacyApplyRedirect.test.jsx::"/index/apply" 重定向到 "/index/create"，不再渲染旧表单`
  - [X] `src/test/CreateContainer.test.jsx::普通用户提交 payload 不带 owner_user_id（后端归一为自己）`
  - [X] `src/test/ResourceLimits.test.jsx::在限额内的组合按同口径取小后提交（mem 32 / shared 16）`
  - [X] `src/test/ResourceLimits.test.jsx::内存上限为 0 而申请值为 1 GB 时阻止超限 payload 并给出数值说明`
- Assertion scope: 历史创建链接进入系统后不再渲染旧表单（「添加容器」不出现），只能落到达标的新创建页；创建提交的 payload 取自新创建页所选镜像（`payload.image_id` 为所选 `image_id`），走现有创建流程的单一提交路径；限额内组合按与页面配额区同口径取小后提交（`payload.container.MEMORY` 为 32、`shared_memory` 为 16、无 `.cc-quota-error`），超限时 `createContainer` 不被调用并给出「内存 当前申请 1 GB，本次可申请上限 0 GB」的数值说明。
- Coverage note: 「选 `image_id`」与「按本次可申请上限提交」两侧均已有页面级断言（`CreateContainer.test.jsx`、`ResourceLimits.test.jsx` 直接渲染真实 `CreateContainer`）；前端上限数值来源与后端配额错误文案的对应关系不在本 capability 内，故不另记缺口。旧表单请求体本身无独立断言，仅以旧表单不渲染间接体现。

### Requirement: Apply 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] `npm run build`
- Assertion scope: 既有 `vite build` 检查（`npm run build`）：退出码 0；构建输出为页面级异步 chunk 结构，且不包含独立的旧 Apply 表单页面 chunk；兼容跳转后的创建入口以现有 CreateContainer 的异步页面 chunk 产出。
- Coverage note: 该 check 只对构建命令与其可观测产物负责。`src/pages/Apply.jsx` 已从源码清退、`React.lazy`/`manualChunks` 组织属人工核对事实，不由本 check 断言；「其他页面使用的资源仍可正常加载」以构建成功与产物完整体现，未逐 chunk 断言资源引用，也不新增静态文案类机械测试。

## frontend--page-user

### Requirement: User 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] `src/test/AnvilBasicPages.test.jsx::test_anvil_user_route_assembles_from_permission_snapshot`
- Assertion scope: 真实 `AppRoutes` + `PermissionProvider` + `MemoryRouter` 渲染 `/index/user`：`location.pathname` 为 `/index/user`，页面卡片标题「用户信息管理」出现；资料查询使用 `PermissionContext` 的 `userId` 快照（`localStorage` 中放置另一 id 时仍按快照 id 调用 `getUserDetailInformation`），不从 `localStorage` 推断授权。
- Coverage note: 仅断言后端资源主键来自快照而非本地存储，不重测布局样式。

### Requirement: User 主流程

#### Scenario: 退出登录成功

- Test/check:
  - [X] `src/test/AnvilBasicPages.test.jsx::test_anvil_user_logout_calls_backend_then_clears_auth_and_permission_and_replaces_root`
  - [X] `src/test/authHelpers.test.js::clearAuth 只清历史遗留的本地缓存，不碰 cookie`
- Assertion scope: 点击 `aria-label` 为「登出」的按钮后，先 `await logoutUser(...)` 调后端登出（后端失败也继续收尾、不误报成功），随后调用 `clearAuth()` 与 `PermissionContext` 的 `clear()`，最后以 `navigate('/', { replace: true })` 回登录页；`clearAuth` 只清历史遗留的 localStorage 身份缓存、不清 cookie（`auth_token` 为 HttpOnly）。
- Coverage note: 既有 `authHelpers.test.js` 覆盖 `clearAuth` 自身语义；本 Scenario 的 logout → clearAuth 顺序、权限快照清空与回落到 '/'（含后端失败仍收尾）由 `src/test/AnvilBasicPages.test.jsx` 用例断言。

### Requirement: User 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] `npm run build`
- Assertion scope: 既有 `vite build` 检查（`npm run build`）：退出码 0；构建输出为页面级异步 chunk 结构，`User` 以独立异步 chunk 产出、不与入口 chunk 合并。
- Coverage note: 该 check 只对构建命令与其可观测产物负责。`React.lazy`/`Suspense` 组织、`vite.config.js` 的 `manualChunks` 配置与 `requestManager.jsx`/`validateCmdArg.jsx` 的静态导入现状属人工核对事实，不由本 check 断言，也不新增静态机械测试；chunk 体积与警告清单不作为规格指标。

## frontend--page-announcements

### Requirement: Announcements 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] `src/test/AnvilBasicPages.test.jsx::test_anvil_announcements_route_assembles_and_queries_lists_separately`
- Assertion scope: 真实 `AppRoutes` + `PermissionProvider` + `MemoryRouter` 渲染 `/admin/announcements`：`location.pathname` 为 `/admin/announcements`，页面关键区域（「待发送区」与其草稿计数）出现；在权限快照驱动的 `AdminLayout` 守卫下完成装配（mock 权限快照提供任一 manage 实体以通过守卫，无 manage 时被 403 拦截）；挂载后分别调用公告列表与当前用户私有草稿列表两个独立接口（mock 后两个 api 各被调用，互不替代、不共用一个响应）。
- Coverage note: 页面自身不消费身份快照（`src/pages/Announcements.jsx` 未使用 `usePermission`），身份快照只作用于 `AdminLayout` 守卫，故本行只断言「守卫下装配 + 两路查询分离」。「后端公告操作当前 require_operator」属后端契约，不在前端断言。

### Requirement: Announcements 主流程

#### Scenario: 后台尚未完成发送

- Test/check:
  - [X] `src/test/announcementSend.test.js::全部离开 sending 才收尾，并汇总成功/失败数`
  - [X] `src/test/announcementSend.test.js::列表里暂时看不到这批公告时，不当成"已完成"`
  - [X] `src/test/announcementSend.test.js::单次轮询失败不中断，下一拍继续`
  - [X] `src/test/AnvilBasicPages.test.jsx::test_anvil_announcements_shows_sending_progress_not_delivered`
- Assertion scope: 发起 batch-send 后首个进度拍点为 `{ total: 2, done: 0 }`（以 SENDING 与计数呈现进度），只要仍有公告处于 `sending` 就不回调 `onDone`；最后一拍才汇总 `done/success/fail`；列表中暂时查不到这批公告或单次轮询失败都不当成"已完成"。页面级：受理请求未完成期间发送按钮处于 loading；受理响应后进度行显示「发送中 x/N 条」，不展示「已完成 … · 成功 …」终态或送达结论，即不把受理响应当作全部邮件已投递。
- Coverage note: `src/utils/announcementSend` 的三条工具层映射已确证；页面 DOM 断言由 `src/test/AnvilBasicPages.test.jsx` 用例覆盖：受理请求未完成期间按钮 loading，受理后进度行显示 SENDING 计数。宽泛的「不把受理当已投递」在工具层仅体现为 `onDone` 不被提前调用。

#### Scenario: 草稿无模板

- Test/check:
  - [X] `src/test/announcementDraftContract.test.js::剥离 template_id，保留 draft_id 与内容字段`
  - [X] `src/test/AnvilBasicPages.test.jsx::test_anvil_announcements_sends_saved_draft_content_without_template`
  - [X] `src/test/AnvilBasicPages.test.jsx::test_anvil_announcements_rejected_draft_shows_refusal_without_success_state`
- Assertion scope: 草稿保存请求体不含 `template_id`、保留 `draft_id` 与 `title`/`content` 等内容字段（草稿是独立内容快照）；页面发送这批草稿时 `batchSendDrafts` 请求体只含 `draft_ids` 与 `targets`（无 `template_id`），受理后进入状态轮询，不要求重新选择模板。拒绝分支：mock `batchSendDrafts` 以 403/404（他人草稿、草稿不存在）拒绝时，`showErrorModal` 收到该状态与后端拒绝文案（无后端 message 时用缺省「批量发送失败」），`message.success`（「已受理 … 正在后台发送…」）不被调用，页面不进入「发送中」进度行也不出现「已完成 … 成功 …」终态，勾选草稿与已选收件人保持不清空，发送按钮从 loading 恢复。
- Coverage note: 「原模板已删除」的端到端链路需要 Ctrl 后端配合，前端只断言发送不依赖 `template_id`。同一 Requirement 中「后端拒绝他人的草稿操作时 SHALL 显示拒绝而不展示成功」这一分支没有独立 Scenario，但它属于已有规格约束的测试对账范围，按本 Scenario（草稿批量发送路径）挂载一条页面级拒绝分支映射；真实后端所有权校验本身不在 Web 测试内。

### Requirement: Announcements 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] `npm run build`
- Assertion scope: 既有 `vite build` 检查（`npm run build`）：退出码 0；构建输出为页面级异步 chunk 结构，`Announcements` 以独立异步 chunk 产出、不与入口 chunk 合并。
- Coverage note: 该 check 只对构建命令与其可观测产物负责。`React.lazy`/`Suspense` 组织、`vite.config.js` 的 `manualChunks` 配置与 `requestManager.jsx`/`validateCmdArg.jsx` 的静态导入现状属人工核对事实，不由本 check 断言，也不新增静态机械测试；公告功能的实现缺陷（如已登记的转模板去重问题）不属于本构建 Scenario 的断言范围。
