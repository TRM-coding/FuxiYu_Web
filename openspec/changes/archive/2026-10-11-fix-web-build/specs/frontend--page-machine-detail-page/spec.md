# Spec Delta

## MODIFIED Requirements

### Requirement: MachineDetailPage 构建归属

页面 SHALL 通过路由表按需加载参加 Vite 构建：`src/routes/index.jsx` 以 `React.lazy` 动态导入页面与共同布局（`MainLayout`、`AdminLayout`），route element 用 `Suspense` 给页面级加载反馈；`LoginLayout`、路由骨架与 React 运行时随入口静态加载，`LoginLayout` 内 `ModelViewer` 亦按需加载，three 经 `vite.config.js` `manualChunks` 分入 `vendor-three-core`/`vendor-three-webgl`/`vendor-three-addons`，均不入入口 chunk。分包原则与边界见 `frontend--build`，实际 chunk 依赖以产物核对为准。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`requestManager` 与 `validateCmdArg` 统一静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属验收观测，记入本轮验收报告，不作为本规格固化的历史指标