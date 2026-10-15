# RbacMatrix

## Purpose

定义权限组矩阵、直接赋予、方法通配与同域管理覆盖的展示和编辑。资源通配与方法覆盖分别表达，直接管理权限仍可独立配置，并保留锁定项、组名校验及后端整组保存约束。

## Requirements

### Requirement: RbacMatrix 页面入口与身份

页面 SHALL 通过 `/admin/rbac` 装配。现有身份与权限约束为：loaded 后以 rbac:manage 控制管理功能；权限目录来自 getRbacMatrix。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `RbacMatrix` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: RbacMatrix 主流程

页面 SHALL 按后端 entity_code 与目录匹配权限点，区分直接赋予、方法实体通配覆盖、同域 manage 派生和未启用。bypass_auth_entity SHALL 覆盖包括各域 manage 在内的方法点，MUST NOT 派生 bypass_resource 或被显示为资源通配；bypass_resource 本身不赋予方法权限。同域 manage SHALL 只派生实际存在的同域非 manage 方法。operator 的 locked_entity_codes SHALL 保留直接修改限制。组创建与整组实体保存 SHALL 沿用后端契约，组名校验 SHALL 与后端标识符正则一致。

#### Scenario: 保存有效权限组配置
- **WHEN** 保存有效权限组配置
- **THEN** 通过 updateRbacGroupEntities 提交 code 集合并刷新矩阵，不把矩阵 id 当作持久化实体 id

#### Scenario: 方法通配覆盖管理方法
- **WHEN** 组只直接赋予 bypass_auth_entity
- **THEN** 各域 manage 显示方法层实体通配覆盖，bypass_resource 不显示被派生，也不承诺全部资源范围；非锁定 manage 仍允许直接配置，不能因方法已覆盖而阻止赋予其资源管理能力

#### Scenario: 直接配置管理权限不被方法覆盖阻断
- **WHEN** 方法通配组直接赋予某域 manage，再撤销该直接赋予
- **THEN** 保存集合分别包含和不包含该 manage；撤销后方法仍显示被通配覆盖，但不再把派生 manage 视为该域资源通配，锁定项限制始终保留

#### Scenario: 直接赋予与域内派生
- **WHEN** 某方法直接赋予，或仅由同域 manage 派生
- **THEN** 前者保持直接启用，后者显示管理覆盖；其他域不被该 manage 扩大

#### Scenario: 组名不符合后端格式
- **WHEN** 组名不匹配后端要求的首字母及长度、字符范围
- **THEN** 保存前显示原因且不提交无效创建请求，合法名称仍由后端进行唯一性校验

### Requirement: RbacMatrix 构建归属

页面 SHALL 通过路由表的按需加载组织参加 Vite 构建：`src/routes/index.jsx` 对页面组件与共同布局（`MainLayout`、`AdminLayout`）使用 `React.lazy` 动态导入，并在 route element 层以既有 `Suspense` 提供页面级加载反馈（仅描述当前实现，不新增加载 UI）；`LoginLayout`、路由骨架与 React 运行时随入口静态加载。`LoginLayout` 内的 `ModelViewer` 亦按需加载，three 相关代码经 `vite.config.js` 的 `manualChunks` 按依赖方向 addons → WebGL → core 分为 `vendor-three-core`、`vendor-three-webgl`、`vendor-three-addons`，均不进入入口 chunk。上述页面与 `ModelViewer` 不再与同路由树代码共同进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`src/utils/requestManager.jsx` 与 `src/utils/validateCmdArg.jsx` 统一为静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属构建验收观测，记入本轮验收报告，不作为本规格固化的历史指标

## Source references

- [src/pages/RbacMatrix.jsx](../../../src/pages/RbacMatrix.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../api/rbac_api`。
- 页面直接依赖：`../contexts/PermissionContext`。
- 页面直接依赖：`../utils/authHelpers`。
- 页面直接依赖：`../utils/showErrorModal`。
- [src/test/](../../../src/test/)、[vite.config.js](../../../vite.config.js)：本次既有 21 个测试文件、123 个测试通过；页面测试是否直接覆盖见 Global QUESTIONS。
