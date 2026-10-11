# DeletedContainers

## Purpose

已删除容器保留目录清理与快照复活。本文件是 Web chester-next 6c5f04d2a7f1 在 2026-10-11 的代码逆向基线，按页面或已有页面组件组织路由、权限、API 与状态行为。已知交互和接口差异统一见 [Global QUESTIONS](../../../../FuxiYu_Global/QUESTIONS.md)，此记录不表示对应问题已经修复。

## Requirements

### Requirement: DeletedContainers 页面入口与身份

页面 SHALL 通过 `/admin/deleted-containers` 装配。现有身份与权限约束为：container:manage；记录使用 deleted_id，分页依服务端 total_number。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `DeletedContainers` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: DeletedContainers 主流程

页面 SHALL 保持以下已实现的交互及数据职责：展示 mount 保留/已清理/升级清理；恢复返回 requires_choice 时显示 snapshot/template 两份配方，差异按 sections 分段标注基础镜像/业务片段的有无变化并在前端计算逐行差异，选择 content_source 后重调；容器留痕只随该二选一响应公布，页面不单独请求。

#### Scenario: 恢复需要选择来源

- **WHEN** 恢复需要选择来源
- **THEN** 首次响应只提供两份配方，不表示恢复完成；用户选择后提交 snapshot 或 template

#### Scenario: 差异分段与公布落点

- **WHEN** 恢复返回 requires_choice
- **THEN** 变化分布按 sections 的 name 渲染为基础镜像/业务片段并标有变化/无变化，逐行差异由 dockerfileDiff 就地计算，页面不再发起单独读取容器留痕的请求

### Requirement: DeletedContainers 构建归属

页面 SHALL 通过路由表的按需加载组织参加 Vite 构建：`src/routes/index.jsx` 对页面组件与共同布局（`MainLayout`、`AdminLayout`）使用 `React.lazy` 动态导入，并在 route element 层以既有 `Suspense` 提供页面级加载反馈（仅描述当前实现，不新增加载 UI）；`LoginLayout`、路由骨架与 React 运行时随入口静态加载。`LoginLayout` 内的 `ModelViewer` 亦按需加载，three 相关代码经 `vite.config.js` 的 `manualChunks` 按依赖方向 addons → WebGL → core 分为 `vendor-three-core`、`vendor-three-webgl`、`vendor-three-addons`，均不进入入口 chunk。上述页面与 `ModelViewer` 不再与同路由树代码共同进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`src/utils/requestManager.jsx` 与 `src/utils/validateCmdArg.jsx` 统一为静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属构建验收观测，记入本轮验收报告，不作为本规格固化的历史指标

## Source references

- [src/pages/DeletedContainers.jsx](../../../src/pages/DeletedContainers.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../utils/detailFormat`。
- 页面直接依赖：`../api/container_api`。
- 页面直接依赖：`../contexts/PermissionContext`。
- 页面直接依赖：`../utils/authHelpers`。
- 页面直接依赖：`../utils/dockerfileDiff`。
- 页面直接依赖：`../utils/showErrorModal`。
- [src/test/](../../../src/test/)、[vite.config.js](../../../vite.config.js)：本次既有 21 个测试文件、123 个测试通过；页面测试是否直接覆盖见 Global QUESTIONS。

