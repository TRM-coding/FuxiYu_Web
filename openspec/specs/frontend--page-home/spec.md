# Home

## Purpose

当前用户容器卡片、运行操作及详情。本文件是 Web chester-next 6c5f04d2a7f1 在 2026-10-11 的代码逆向基线，按页面或已有页面组件组织路由、权限、API 与状态行为。已知交互和接口差异统一见 [Global QUESTIONS](../../../../FuxiYu_Global/QUESTIONS.md)，此记录不表示对应问题已经修复。

## Requirements

### Requirement: Home 页面入口与身份

页面 SHALL 通过 `/index` 装配。现有身份与权限约束为：PermissionContext 提供身份；角色和 containerActions 决定操作入口。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `Home` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: Home 主流程

页面 SHALL 保持以下已实现的交互及数据职责：读取容器 brief 并定时静默刷新；使用 listRefresh 指纹判断更新；启停重启采用 pending transition 和心跳；删除使用独立确认组件。

#### Scenario: 已受理停止或重启

- **WHEN** 已受理停止或重启
- **THEN** 跟踪过渡态到终态；当前内层失败后外层仍提示请求成功的缺陷见 QUESTIONS

### Requirement: Home 构建归属

页面 SHALL 使用现有 ESM 导入及已装配组件参加 Vite 构建；没有页面级 lazy 拆包时，同路由树页面仍进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建；本次主 JS 为 2353.06 kB，requestManager 和 validateCmdArg 的动静混合导入警告不导致退出失败

## Source references

- [src/pages/Home.jsx](../../../src/pages/Home.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../utils/showErrorModal`。
- 页面直接依赖：`../utils/authHelpers`。
- 页面直接依赖：`../api/container_api`。
- 页面直接依赖：`../utils/timeFormat`。
- 页面直接依赖：`../utils/diskLimit`。
- 页面直接依赖：`../utils/containerActions`。
- 页面直接依赖：`../utils/heartbeat`。
- 页面直接依赖：`../utils/listRefresh`。
- 页面直接依赖：`../api/user_api`。
- 页面直接依赖：`../utils/requestManager`。
- 页面直接依赖：`../utils/detailFormat`。
- 页面直接依赖：`../utils/useAutoHideTopBar`。
- 页面直接依赖：`../contexts/PermissionContext`。
- [src/test/](../../../src/test/)、[vite.config.js](../../../vite.config.js)：本次既有 21 个测试文件、123 个测试通过；页面测试是否直接覆盖见 Global QUESTIONS。

