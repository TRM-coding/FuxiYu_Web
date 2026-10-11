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

页面 SHALL 使用现有 ESM 导入及已装配组件参加 Vite 构建；没有页面级 lazy 拆包时，同路由树页面仍进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建；本次主 JS 为 2353.06 kB，requestManager 和 validateCmdArg 的动静混合导入警告不导致退出失败

## Source references

- [src/pages/Login.jsx](../../../src/pages/Login.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../api/user_api`。
- 页面直接依赖：`../utils/showErrorModal`。
- 页面直接依赖：`../contexts/PermissionContext`。
- [src/test/](../../../src/test/)、[vite.config.js](../../../vite.config.js)：本次既有 21 个测试文件、123 个测试通过；页面测试是否直接覆盖见 Global QUESTIONS。

