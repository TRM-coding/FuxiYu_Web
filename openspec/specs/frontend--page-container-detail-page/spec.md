# ContainerDetailPage

## Purpose

独立容器详情、运行状态和协作账号操作。本文件是 Web chester-next 6c5f04d2a7f1 在 2026-10-11 的代码逆向基线，按页面或已有页面组件组织路由、权限、API 与状态行为。已知交互和接口差异统一见 [Global QUESTIONS](../../../../FuxiYu_Global/QUESTIONS.md)，此记录不表示对应问题已经修复。

## Requirements

### Requirement: ContainerDetailPage 页面入口与身份

页面 SHALL 通过 `/index/containers/:containerId` 装配。现有身份与权限约束为：路径参数为 Ctrl DB id；后端以方法权限及容器资源角色判定操作。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `ContainerDetailPage` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: ContainerDetailPage 主流程

页面 SHALL 保持以下已实现的交互及数据职责：加载详情、日志并每 5 秒轮询状态；支持启停重启删除、长期标记、解冻、协作者增删改；受理动作等待运行状态收敛；镜像信息卡在该容器详情下发 image_dockerfile 时原样展示它（容器自身记录），页面不按当前模板另行渲染。

#### Scenario: 启动已受理

- **WHEN** 启动已受理
- **THEN** 展示过渡状态并继续读取快照，最终 online/failed 由服务端事实决定

### Requirement: ContainerDetailPage 构建归属

页面 SHALL 使用现有 ESM 导入及已装配组件参加 Vite 构建；没有页面级 lazy 拆包时，同路由树页面仍进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建；本次主 JS 为 2353.06 kB，requestManager 和 validateCmdArg 的动静混合导入警告不导致退出失败

## Source references

- [src/pages/ContainerDetailPage.jsx](../../../src/pages/ContainerDetailPage.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../api/container_api`。
- 页面直接依赖：`../api/user_api`。
- 页面直接依赖：`../utils/showErrorModal`。
- 页面直接依赖：`../utils/detailFormat`。
- 页面直接依赖：`../utils/timeFormat`。
- 页面直接依赖：`../utils/diskLimit`。
- 页面直接依赖：`../utils/statusDisplay`。
- 页面直接依赖：`../contexts/PermissionContext`。
- 页面直接依赖：`../utils/containerActions`。
- [src/test/](../../../src/test/)、[vite.config.js](../../../vite.config.js)：本次既有 21 个测试文件、123 个测试通过；页面测试是否直接覆盖见 Global QUESTIONS。

