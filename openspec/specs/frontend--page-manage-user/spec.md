# ManageUser

## Purpose

定义用户管理、权限组替换、容器关联与子列表展示。用户统计和容器角色、限额等业务字段参与静默刷新，轮询保留当前分页上下文，组存在性与自锁规则仍由后端校验。

## Requirements

### Requirement: ManageUser 页面入口与身份

页面 SHALL 通过 `/admin/users` 装配。现有身份与权限约束为：页面检查 bypass_auth_entity；组编辑使用 rbac:manage，容器管理使用 container:manage。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `ManageUser` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: ManageUser 主流程

页面 SHALL 保持以下已实现的交互及数据职责：读取用户 brief 和展开容器；支持重置密码、删除用户、绑定权限组；容器角色变更和解绑经对应服务 API。

#### Scenario: 为用户替换权限组

- **WHEN** 为用户替换权限组
- **THEN** 提交去重的 group_ids，由后端校验组存在与自锁保护；有效权限由服务端重新计算

### Requirement: ManageUser 构建归属

页面 SHALL 通过路由表的按需加载组织参加 Vite 构建：`src/routes/index.jsx` 对页面组件与共同布局（`MainLayout`、`AdminLayout`）使用 `React.lazy` 动态导入，并在 route element 层以既有 `Suspense` 提供页面级加载反馈（仅描述当前实现，不新增加载 UI）；`LoginLayout`、路由骨架与 React 运行时随入口静态加载。`LoginLayout` 内的 `ModelViewer` 亦按需加载，three 相关代码经 `vite.config.js` 的 `manualChunks` 按依赖方向 addons → WebGL → core 分为 `vendor-three-core`、`vendor-three-webgl`、`vendor-three-addons`，均不进入入口 chunk。上述页面与 `ModelViewer` 不再与同路由树代码共同进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`src/utils/requestManager.jsx` 与 `src/utils/validateCmdArg.jsx` 统一为静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属构建验收观测，记入本轮验收报告，不作为本规格固化的历史指标

### Requirement: ManageUser 静默刷新覆盖身份与容器操作字段

用户列表及容器子列表的刷新指纹 SHALL 覆盖实际用于身份展示、用户资源统计、角色权限、磁盘与分配限额和状态操作的字段。单独业务字段变化 SHALL 可触发更新，语义无关的集合顺序变化 SHALL 保持比较稳定；静默轮询 SHALL 维持当前子列表页码与筛选。

#### Scenario: 用户或关联容器业务字段变化
- **WHEN** 用户展示字段、资源统计或关联容器的角色、限额改变，而其他指纹字段不变
- **THEN** 列表接收新状态，权限和资源展示不沿用旧值，静默轮询保留当前页

## Source references

- [src/pages/ManageUser.jsx](../../../src/pages/ManageUser.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../utils/showErrorModal`。
- 页面直接依赖：`../utils/authHelpers`。
- 页面直接依赖：`../api/user_api`。
- 页面直接依赖：`../api/rbac_api`。
- 页面直接依赖：`../contexts/PermissionContext`。
- 页面直接依赖：`../api/container_api`。
- 页面直接依赖：`../utils/heartbeat`。
- 页面直接依赖：`../utils/useAutoHideTopBar`。
- 页面直接依赖：`../utils/diskLimit`。
- 页面直接依赖：`../utils/containerActions`。
- 页面直接依赖：`../utils/timeFormat`。
- 页面直接依赖：`../utils/detailFormat`。
- 页面直接依赖：`../utils/listRefresh`。
- [src/test/](../../../src/test/)、[vite.config.js](../../../vite.config.js)：本次既有 21 个测试文件、123 个测试通过；页面测试是否直接覆盖见 Global QUESTIONS。
