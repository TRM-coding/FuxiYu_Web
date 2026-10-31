# frontend--page-announcements Test Plan

Spec: [spec.md](spec.md)

## Current Mapping

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
