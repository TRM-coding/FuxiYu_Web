# Spec Delta

<!-- 测试对账：以下 Requirement 块与 openspec/specs/frontend--page-announcements/spec.md 完全一致。
     Scenario 名称与 THEN 业务语义零变化；本轮不改主规格、不改代码，只补 scenario→test 对账。
     公告转模板去重缺陷不在本轮范围。 -->

## MODIFIED Requirements

### Requirement: Announcements 页面入口与身份

页面 SHALL 通过 `/admin/announcements` 装配。现有身份与权限约束为：页面管理入口，后端公告操作当前 require_operator。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `Announcements` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: Announcements 主流程

页面 SHALL 分别查询公告和当前用户私有草稿，解析用户、机器、容器或全员目标人数；POST batch-send 立即返回 announcement_ids，后台状态轮询反馈成功失败。发送 SHALL 使用草稿独立内容，无需原模板存在；后端拒绝他人的草稿操作时 SHALL 显示拒绝而不展示成功。

#### Scenario: 后台尚未完成发送
- **WHEN** 后台尚未完成发送
- **THEN** 以 SENDING 和计数呈现进度，不把受理响应作为全部邮件已投递

#### Scenario: 草稿无模板
- **WHEN** 用户发送由模板填充后独立保存、且原模板已删除的草稿
- **THEN** 按已保存内容和目标发送，不要求重新选择模板

### Requirement: Announcements 构建归属

页面 SHALL 通过路由表的按需加载组织参加 Vite 构建：`src/routes/index.jsx` 对页面组件与共同布局（`MainLayout`、`AdminLayout`）使用 `React.lazy` 动态导入，并在 route element 层以既有 `Suspense` 提供页面级加载反馈（仅描述当前实现，不新增加载 UI）；`LoginLayout`、路由骨架与 React 运行时随入口静态加载。`LoginLayout` 内的 `ModelViewer` 亦按需加载，three 相关代码经 `vite.config.js` 的 `manualChunks` 按依赖方向 addons → WebGL → core 分为 `vendor-three-core`、`vendor-three-webgl`、`vendor-three-addons`，均不进入入口 chunk。上述页面与 `ModelViewer` 不再与同路由树代码共同进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`src/utils/requestManager.jsx` 与 `src/utils/validateCmdArg.jsx` 统一为静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属构建验收观测，记入本轮验收报告，不作为本规格固化的历史指标
