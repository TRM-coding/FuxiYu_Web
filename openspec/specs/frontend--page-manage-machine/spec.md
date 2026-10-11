# ManageMachine

## Purpose

机器注册、分页检索及每机容器管理。本文件是 Web chester-next 6c5f04d2a7f1 在 2026-10-11 的代码逆向基线，按页面或已有页面组件组织路由、权限、API 与状态行为。已知交互和接口差异统一见 [Global QUESTIONS](../../../../FuxiYu_Global/QUESTIONS.md)，此记录不表示对应问题已经修复。

## Requirements

### Requirement: ManageMachine 页面入口与身份

页面 SHALL 通过 `/admin/machines` 装配。现有身份与权限约束为：页面检查 bypass_auth_entity；解冻和部分高风险按钮另用细分权限。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `ManageMachine` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: ManageMachine 主流程

页面 SHALL 保持以下已实现的交互及数据职责：注册只发送最小信任锚 machine_name/machine_ip/description/可选 port；机器检索防抖；容器卡片、心跳及删除确认由当前页面协调。

#### Scenario: 机器上仍有容器时尝试删除机器

- **WHEN** 机器上仍有容器时尝试删除机器
- **THEN** 确认面板展示计数并禁用删除；最终由后端阻止删除带容器机器

### Requirement: ManageMachine 构建归属

页面 SHALL 通过路由表的按需加载组织参加 Vite 构建：`src/routes/index.jsx` 对页面组件与共同布局（`MainLayout`、`AdminLayout`）使用 `React.lazy` 动态导入，并在 route element 层以既有 `Suspense` 提供页面级加载反馈（仅描述当前实现，不新增加载 UI）；`LoginLayout`、路由骨架与 React 运行时随入口静态加载。`LoginLayout` 内的 `ModelViewer` 亦按需加载，three 相关代码经 `vite.config.js` 的 `manualChunks` 按依赖方向 addons → WebGL → core 分为 `vendor-three-core`、`vendor-three-webgl`、`vendor-three-addons`，均不进入入口 chunk。上述页面与 `ModelViewer` 不再与同路由树代码共同进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`src/utils/requestManager.jsx` 与 `src/utils/validateCmdArg.jsx` 统一为静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属构建验收观测，记入本轮验收报告，不作为本规格固化的历史指标

## Source references

- [src/pages/ManageMachine.jsx](../../../src/pages/ManageMachine.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../api/machine_api`。
- 页面直接依赖：`../api/container_api`。
- 页面直接依赖：`../utils/showErrorModal`。
- 页面直接依赖：`../utils/authHelpers`。
- 页面直接依赖：`../api/user_api`。
- 页面直接依赖：`../contexts/PermissionContext`。
- 页面直接依赖：`../utils/requestManager`。
- 页面直接依赖：`../utils/diskLimit`。
- 页面直接依赖：`../utils/useAutoHideTopBar`。
- 页面直接依赖：`../utils/containerActions`。
- 页面直接依赖：`../utils/listRefresh`。
- 页面直接依赖：`../utils/heartbeat`。
- 页面直接依赖：`../utils/timeFormat`。
- [src/test/](../../../src/test/)、[vite.config.js](../../../vite.config.js)：本次既有 21 个测试文件、123 个测试通过；页面测试是否直接覆盖见 Global QUESTIONS。

