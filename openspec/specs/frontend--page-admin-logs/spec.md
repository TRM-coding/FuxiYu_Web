# AdminLogs

## Purpose

操作审计列表、周视图统计、筛选与详情。本文件是 Web chester-next 6c5f04d2a7f1 在 2026-10-11 的代码逆向基线，按页面或已有页面组件组织路由、权限、API 与状态行为。已知交互和接口差异统一见 [Global QUESTIONS](../../../../FuxiYu_Global/QUESTIONS.md)，此记录不表示对应问题已经修复。

## Requirements

### Requirement: AdminLogs 页面入口与身份

页面 SHALL 通过 `/admin/logs` 装配。现有身份与权限约束为：PermissionContext + 管理布局；页面权限沿用操作员判据。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `AdminLogs` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: AdminLogs 主流程

页面 SHALL 保持以下已实现的交互及数据职责：按 operation/target_type/operator/success 和时段查询；展示服务补齐的目标名，展开结构化 diff 与失败信息。

#### Scenario: 切换周或过滤条件

- **WHEN** 切换周或过滤条件
- **THEN** 请求日志列表及统计，并按响应渲染当前结果；旧请求覆盖的风险登记在 QUESTIONS

### Requirement: AdminLogs 构建归属

页面 SHALL 使用现有 ESM 导入及已装配组件参加 Vite 构建；没有页面级 lazy 拆包时，同路由树页面仍进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建；本次主 JS 为 2353.06 kB，requestManager 和 validateCmdArg 的动静混合导入警告不导致退出失败

## Source references

- [src/pages/AdminLogs.jsx](../../../src/pages/AdminLogs.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../utils/showErrorModal`。
- 页面直接依赖：`../utils/authHelpers`。
- 页面直接依赖：`../api/user_api`。
- 页面直接依赖：`../contexts/PermissionContext`。
- 页面直接依赖：`../api/operation_log_api`。
- 页面直接依赖：`../api/machine_api`。
- 页面直接依赖：`../api/container_api`。
- [src/test/](../../../src/test/)、[vite.config.js](../../../vite.config.js)：本次既有 21 个测试文件、123 个测试通过；页面测试是否直接覆盖见 Global QUESTIONS。

