# MachineDetailPage

## Purpose

独立宿主机详情、限制编辑、维护及信任修复。本文件是 Web chester-next 6c5f04d2a7f1 在 2026-10-11 的代码逆向基线，按页面或已有页面组件组织路由、权限、API 与状态行为。已知交互和接口差异统一见 [Global QUESTIONS](../../../../FuxiYu_Global/QUESTIONS.md)，此记录不表示对应问题已经修复。

## Requirements

### Requirement: MachineDetailPage 页面入口与身份

页面 SHALL 通过 `/index/machines/:machineId` 装配。现有身份与权限约束为：路径 machineId 为 DB id；读取 machine:view+资源权，修改 machine:manage。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `MachineDetailPage` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: MachineDetailPage 主流程

页面 SHALL 保持以下已实现的交互及数据职责：加载硬件和限制并轮询 machine_status/is_maintenance/runtime_snapshot；编辑基本信息可显式 port=null；维护开关独立于 online/offline。

#### Scenario: 保存未修改端口的基本信息

- **WHEN** 保存未修改端口的基本信息
- **THEN** 当前详情 response_model 漏 port，页面可能发送 null 清空既有端口；该缺陷已 API 复现并记录

### Requirement: MachineDetailPage 构建归属

页面 SHALL 使用现有 ESM 导入及已装配组件参加 Vite 构建；没有页面级 lazy 拆包时，同路由树页面仍进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建；本次主 JS 为 2353.06 kB，requestManager 和 validateCmdArg 的动静混合导入警告不导致退出失败

## Source references

- [src/pages/MachineDetailPage.jsx](../../../src/pages/MachineDetailPage.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../api/machine_api`。
- 页面直接依赖：`../contexts/PermissionContext`。
- 页面直接依赖：`../utils/showErrorModal`。
- 页面直接依赖：`../utils/detailFormat`。
- 页面直接依赖：`../utils/statusDisplay`。
- [src/test/](../../../src/test/)、[vite.config.js](../../../vite.config.js)：本次既有 21 个测试文件、123 个测试通过；页面测试是否直接覆盖见 Global QUESTIONS。

