# Spec Delta

<!-- 测试对账：以下 Requirement 块与 openspec/specs/frontend--page-user/spec.md 完全一致。
     Scenario 名称与 THEN 业务语义零变化；本轮不改主规格、不改代码，只补 scenario→test 对账。 -->

## MODIFIED Requirements

### Requirement: User 页面入口与身份

页面 SHALL 通过 `/index/user` 装配。现有身份与权限约束为：PermissionContext 身份是查询依据，不从 localStorage 推断授权。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `User` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: User 主流程

页面 SHALL 保持以下已实现的交互及数据职责：读取 user_info，按当前表单更新资料；改密走独立接口；logout 后清权限快照和前端认证状态并回登录。

#### Scenario: 退出登录成功

- **WHEN** 退出登录成功
- **THEN** 调用后端 logout 清会话，再 clearAuth/clearPermission 并 replace('/')

### Requirement: User 构建归属

页面 SHALL 通过路由表的按需加载组织参加 Vite 构建：`src/routes/index.jsx` 对页面组件与共同布局（`MainLayout`、`AdminLayout`）使用 `React.lazy` 动态导入，并在 route element 层以既有 `Suspense` 提供页面级加载反馈（仅描述当前实现，不新增加载 UI）；`LoginLayout`、路由骨架与 React 运行时随入口静态加载。`LoginLayout` 内的 `ModelViewer` 亦按需加载，three 相关代码经 `vite.config.js` 的 `manualChunks` 按依赖方向 addons → WebGL → core 分为 `vendor-three-core`、`vendor-three-webgl`、`vendor-three-addons`，均不进入入口 chunk。上述页面与 `ModelViewer` 不再与同路由树代码共同进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`src/utils/requestManager.jsx` 与 `src/utils/validateCmdArg.jsx` 统一为静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属构建验收观测，记入本轮验收报告，不作为本规格固化的历史指标
