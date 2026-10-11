# CreateContainer

## Purpose

选择镜像和宿主机，提交容器资源及 SSH 公钥。本文件是 Web chester-next 6c5f04d2a7f1 在 2026-10-11 的代码逆向基线，按页面或已有页面组件组织路由、权限、API 与状态行为。已知交互和接口差异统一见 [Global QUESTIONS](../../../../FuxiYu_Global/QUESTIONS.md)，此记录不表示对应问题已经修复。

## Requirements

### Requirement: CreateContainer 页面入口与身份

页面 SHALL 通过 `/index/create` 装配。现有身份与权限约束为：container:create；container:manage 用户显示代建 ROOT 选择；身份来自 PermissionContext。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `CreateContainer` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: CreateContainer 主流程

页面 SHALL 保持以下已实现的交互及数据职责：镜像使用 image_id；详情读取 max_cpu_core_number/max_memory_gb/max_gpu_number/max_shared_gb 设定滑条；payload 传 CPU_NUMBER/MEMORY/GPU_LIST/shared_memory；环境模板列表只保留 status 为 ready 的模板，已选中项不再是 ready 时清空选择。

#### Scenario: 内存 4 GB、共享内存 8 GB 且单项机器上限允许

- **WHEN** 内存 4 GB、共享内存 8 GB 且单项机器上限允许
- **THEN** 当前页面会提交组合；Ctrl 因共享内存超过请求内存拒绝，该交叉约束缺口见 QUESTIONS

#### Scenario: 模板不在可用集合内

- **WHEN** 模板 brief 列表包含 draft 或 disabled 模板
- **THEN** 页面不展示也不允许选中它们；已选中的模板变为非 ready 时选择被清空

### Requirement: CreateContainer 构建归属

页面 SHALL 使用现有 ESM 导入及已装配组件参加 Vite 构建；没有页面级 lazy 拆包时，同路由树页面仍进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建；本次主 JS 为 2353.06 kB，requestManager 和 validateCmdArg 的动静混合导入警告不导致退出失败

## Source references

- [src/pages/CreateContainer.jsx](../../../src/pages/CreateContainer.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../utils/showErrorModal`。
- 页面直接依赖：`../contexts/PermissionContext`。
- 页面直接依赖：`../api/machine_api`。
- 页面直接依赖：`../api/user_api`。
- 页面直接依赖：`../api/container_api`。
- 页面直接依赖：`../api/image_api`。
- [src/test/](../../../src/test/)、[vite.config.js](../../../vite.config.js)：本次既有 21 个测试文件、123 个测试通过；页面测试是否直接覆盖见 Global QUESTIONS。

