# Spec Delta

## MODIFIED Requirements

### Requirement: NotFound 页面入口与身份

页面 SHALL 通过 `*` 装配。现有身份与权限约束为：无 API 请求或额外页面权限。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `NotFound` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: NotFound 主流程

页面 SHALL 保持以下已实现的交互及数据职责：显示 404 文案和回到主页按钮，按钮通过 react-router navigate('/index') 返回站内。

#### Scenario: 访问未匹配路由

- **WHEN** 访问未匹配路由
- **THEN** 显示 NotFound；点击回到主页导航至 /index

### Requirement: NotFound 构建归属

页面 SHALL 通过路由表的按需加载组织参加 Vite 构建：`src/routes/index.jsx` 对页面组件与共同布局（`MainLayout`、`AdminLayout`）使用 `React.lazy` 动态导入，并在 route element 层以既有 `Suspense` 提供页面级加载反馈（仅描述当前实现，不新增加载 UI）；`LoginLayout`、路由骨架与 React 运行时随入口静态加载。`LoginLayout` 内的 `ModelViewer` 亦按需加载，three 相关代码经 `vite.config.js` 的 `manualChunks` 按依赖方向 addons → WebGL → core 分为 `vendor-three-core`、`vendor-three-webgl`、`vendor-three-addons`，均不进入入口 chunk。上述页面与 `ModelViewer` 不再与同路由树代码共同进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`src/utils/requestManager.jsx` 与 `src/utils/validateCmdArg.jsx` 统一为静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属构建验收观测，记入本轮验收报告，不作为本规格固化的历史指标

### Requirement: NotFound 页面使用完整视口高度

独立 404 路由是顶层路由的兄弟，没有 `MainLayout`/导航栏祖先；`.notfound-page` SHALL 使用 `min-height: 100vh`，并可用 `100dvh` 覆盖移动端动态视口。MUST NOT 再使用 `calc(100vh - 64px)` 或 `calc(100vh - 56px)`，MUST NOT 为不存在的导航栏预留固定底部空间。

#### Scenario: 顶层未知路由无底部空隙

- **GIVEN** 用户访问不存在的顶层路由
- **WHEN** 404 页面渲染
- **THEN** 页面高度占满视口，底部没有 64px 的额外空隙

#### Scenario: 移动端视口无 56px 空隙

- **GIVEN** 移动端视口命中既有响应式断点
- **WHEN** 404 页面渲染
- **THEN** 页面使用 `100vh` 或 `100dvh`，底部没有 56px 的额外空隙
