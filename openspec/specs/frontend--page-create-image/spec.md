# CreateImage

## Purpose

镜像模板编辑、构建内容、启动命令和可见名单。本文件是 Web chester-next 6c5f04d2a7f1 在 2026-10-11 的代码逆向基线，按页面或已有页面组件组织路由、权限、API 与状态行为。已知交互和接口差异统一见 [Global QUESTIONS](../../../../FuxiYu_Global/QUESTIONS.md)，此记录不表示对应问题已经修复。

## Requirements

### Requirement: CreateImage 页面入口与身份

页面 SHALL 通过 `/index/images` 装配。现有身份与权限约束为：页面 image:edit；实际列表 image:view，编辑与名单还受 image:owner 资源控制。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `CreateImage` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: CreateImage 主流程

页面 SHALL 保持以下已实现的交互及数据职责：维护 name/base_image/dockerfile_body/entrypoint/status/valid_range；private/everyone/custom 三态，custom 才管理 visible_user_ids；删除为停用。

#### Scenario: 清空启动命令并保存

- **WHEN** 清空启动命令并保存
- **THEN** 传空串使后端清除 entrypoint，Ctrl 渲染最终 Dockerfile 时采用平台默认命令；Node 运行该镜像，不另行覆写 command。前端注入预览与真实设置差异见 QUESTIONS

### Requirement: CreateImage 构建归属

页面 SHALL 使用现有 ESM 导入及已装配组件参加 Vite 构建；没有页面级 lazy 拆包时，同路由树页面仍进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建；本次主 JS 为 2353.06 kB，requestManager 和 validateCmdArg 的动静混合导入警告不导致退出失败

## Source references

- [src/pages/CreateImage.jsx](../../../src/pages/CreateImage.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../utils/showErrorModal`。
- 页面直接依赖：`../contexts/PermissionContext`。
- 页面直接依赖：`../api/image_api`。
- 页面直接依赖：`../api/user_api`。
- [src/test/](../../../src/test/)、[vite.config.js](../../../vite.config.js)：本次既有 21 个测试文件、123 个测试通过；页面测试是否直接覆盖见 Global QUESTIONS。

