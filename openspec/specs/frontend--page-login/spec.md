# Login

## Purpose

账号登录和记住登录状态。本文件是 Web chester-next 6c5f04d2a7f1 在 2026-10-11 的代码逆向基线，按页面或已有页面组件组织路由、权限、API 与状态行为。已知交互和接口差异统一见 [Global QUESTIONS](../../../../FuxiYu_Global/QUESTIONS.md)，此记录不表示对应问题已经修复。

## Requirements

### Requirement: Login 页面入口与身份

页面 SHALL 通过 `/` 装配。现有身份与权限约束为：匿名可进入；loaded 且 userId 已存在时 replace 到 /index。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `Login` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: Login 主流程

页面 SHALL 保持以下已实现的交互及数据职责：提交 loginUser，后端设置 HttpOnly cookie，随后 refresh 权限快照；身份不写 localStorage；remember 交给后端决定 cookie 生命周期。

#### Scenario: 权限快照刷新失败

- **WHEN** 权限快照刷新失败
- **THEN** 当前登录页会吞掉刷新错误并进入 /index，可能权限空白；该行为作为待修复差异登记

### Requirement: Login 构建归属

页面 SHALL 通过路由表的按需加载组织参加 Vite 构建：`src/routes/index.jsx` 对页面组件与共同布局（`MainLayout`、`AdminLayout`）使用 `React.lazy` 动态导入，并在 route element 层以既有 `Suspense` 提供页面级加载反馈（仅描述当前实现，不新增加载 UI）；`LoginLayout`、路由骨架与 React 运行时随入口静态加载。`LoginLayout` 内的 `ModelViewer` 亦按需加载，three 相关代码经 `vite.config.js` 的 `manualChunks` 按依赖方向 addons → WebGL → core 分为 `vendor-three-core`、`vendor-three-webgl`、`vendor-three-addons`，均不进入入口 chunk。上述页面与 `ModelViewer` 不再与同路由树代码共同进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`src/utils/requestManager.jsx` 与 `src/utils/validateCmdArg.jsx` 统一为静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属构建验收观测，记入本轮验收报告，不作为本规格固化的历史指标

### Requirement: Login 登录布局与 3D 预览的独立加载

`/` 的左侧登录表单与右侧 `ModelViewer` SHALL 相互独立加载并允许并行完成，MUST NOT 约定强制先后顺序；`ModelViewer` 未就绪 SHALL NOT 阻塞已可用的登录表单。`ModelViewer` 的动态导入被拒绝或组件渲染抛错时，仅右侧舞台 SHALL 降级为保持原布局尺寸的空占位（`data-testid="model-stage-unavailable"`），MUST NOT 传播到左侧表单或路由；加载中同样只渲染空占位（`data-testid="model-stage-loading"`）。加载中与加载失败两种状态 MUST NOT 新增可见的「3D 预览…」文案，MUST NOT 新增 `role="status"`/`aria-live` 播报。该约束只针对本轮新增的懒加载边界与局部兜底，MUST NOT 解释为禁止或改写 `ModelViewer` 自身既有的 `renderDisabled` 降级文案。匿名访问与既有权限策略保持原状。

#### Scenario: 模型仍未就绪

- **WHEN** 进入 `/` 时 `ModelViewer` 的动态导入尚未完成
- **THEN** 右侧为无文案、无播报的空占位，左侧登录表单已可交互（输入与提交入口可用），两侧加载无强制先后顺序

#### Scenario: 模型正常就绪

- **WHEN** `ModelViewer` 的动态导入完成
- **THEN** 右侧渲染正常 3D 预览并移除空占位，左侧登录表单保持可用，不出现额外加载或失败文案

#### Scenario: 模型导入被拒绝

- **WHEN** `ModelViewer` 的动态导入被拒绝，或其组件渲染抛错
- **THEN** 仅右侧降级为空占位；`/` 登录表单保持可用，`/register` 匿名注册仍可达，不出现可见失败文案或播报；`ModelViewer` 自身 `renderDisabled` 降级语义不变

## Source references

- [src/pages/Login.jsx](../../../src/pages/Login.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../api/user_api`。
- 页面直接依赖：`../utils/showErrorModal`。
- 页面直接依赖：`../contexts/PermissionContext`。
- [src/test/](../../../src/test/)、[vite.config.js](../../../vite.config.js)：本次既有 21 个测试文件、123 个测试通过；页面测试是否直接覆盖见 Global QUESTIONS。

