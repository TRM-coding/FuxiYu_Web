# Docs

## Purpose

用户操作指引、状态说明、机器与镜像说明和 FAQ。本文件是 Web chester-next 6c5f04d2a7f1 在 2026-10-11 的代码逆向基线，按页面或已有页面组件组织路由、权限、API 与状态行为。已知交互和接口差异统一见 [Global QUESTIONS](../../../../FuxiYu_Global/QUESTIONS.md)，此记录不表示对应问题已经修复。

## Requirements

### Requirement: Docs 页面入口与身份

页面 SHALL 通过 `/index/docs` 装配。现有身份与权限约束为：MainLayout 内的静态帮助页；状态卡使用 statusDisplay。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `Docs` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: Docs 主流程

页面 SHALL 保持以下已实现的交互及数据职责：按目录平滑滚动，页面不通过 URL hash 跳出 SPA；展现当前文案和 CONTAINER_ORDER 状态集合。

#### Scenario: 点击目录项

- **WHEN** 点击目录项
- **THEN** 对对应章节 scrollIntoView；未覆盖 pausing/unpausing 的状态文案问题见 QUESTIONS

### Requirement: Docs 构建归属

页面 SHALL 通过路由表的按需加载组织参加 Vite 构建：`src/routes/index.jsx` 对页面组件与共同布局（`MainLayout`、`AdminLayout`）使用 `React.lazy` 动态导入，并在 route element 层以既有 `Suspense` 提供页面级加载反馈（仅描述当前实现，不新增加载 UI）；`LoginLayout`、路由骨架与 React 运行时随入口静态加载。`LoginLayout` 内的 `ModelViewer` 亦按需加载，three 相关代码经 `vite.config.js` 的 `manualChunks` 按依赖方向 addons → WebGL → core 分为 `vendor-three-core`、`vendor-three-webgl`、`vendor-three-addons`，均不进入入口 chunk。上述页面与 `ModelViewer` 不再与同路由树代码共同进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`src/utils/requestManager.jsx` 与 `src/utils/validateCmdArg.jsx` 统一为静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属构建验收观测，记入本轮验收报告，不作为本规格固化的历史指标

## Source references

- [src/pages/Docs.jsx](../../../src/pages/Docs.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../utils/statusDisplay`。
- [src/test/](../../../src/test/)、[vite.config.js](../../../vite.config.js)：本次既有 21 个测试文件、123 个测试通过；页面测试是否直接覆盖见 Global QUESTIONS。

