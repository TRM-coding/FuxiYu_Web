# ManageUser

## Purpose

用户检索、资料及权限组、容器归属管理。本文件是 Web chester-next 6c5f04d2a7f1 在 2026-10-11 的代码逆向基线，按页面或已有页面组件组织路由、权限、API 与状态行为。已知交互和接口差异统一见 [Global QUESTIONS](../../../../FuxiYu_Global/QUESTIONS.md)，此记录不表示对应问题已经修复。

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

页面 SHALL 使用现有 ESM 导入及已装配组件参加 Vite 构建；没有页面级 lazy 拆包时，同路由树页面仍进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建；本次主 JS 为 2353.06 kB，requestManager 和 validateCmdArg 的动静混合导入警告不导致退出失败

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

