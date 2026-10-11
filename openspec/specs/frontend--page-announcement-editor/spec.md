# AnnouncementEditor

## Purpose

公告正文与模板编辑、属性占位插入、草稿保存。本文件是 Web chester-next 6c5f04d2a7f1 在 2026-10-11 的代码逆向基线，按页面或已有页面组件组织路由、权限、API 与状态行为。已知交互和接口差异统一见 [Global QUESTIONS](../../../../FuxiYu_Global/QUESTIONS.md)，此记录不表示对应问题已经修复。

## Requirements

### Requirement: AnnouncementEditor 页面入口与身份

页面 SHALL 通过 `/admin/announcements/editor` 装配。现有身份与权限约束为：管理布局和公告 API；草稿/模板通过查询参数或页面状态加载。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `AnnouncementEditor` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: AnnouncementEditor 主流程

页面 SHALL 保持以下已实现的交互及数据职责：选模板获取主题正文；加载机器/容器属性；保存 title/content/raw_content/template_id；编辑器不执行模板变量替换引擎。

#### Scenario: 保存草稿成功

- **WHEN** 保存草稿成功
- **THEN** 保留 draft_id 和编辑内容，可继续编辑或进入发送列表；下拉分页与插入光标问题见 QUESTIONS

### Requirement: AnnouncementEditor 构建归属

页面 SHALL 使用现有 ESM 导入及已装配组件参加 Vite 构建；没有页面级 lazy 拆包时，同路由树页面仍进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建；本次主 JS 为 2353.06 kB，requestManager 和 validateCmdArg 的动静混合导入警告不导致退出失败

## Source references

- [src/pages/AnnouncementEditor.jsx](../../../src/pages/AnnouncementEditor.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../api/announcement_api`。
- 页面直接依赖：`../api/machine_api`。
- 页面直接依赖：`../api/container_api`。
- 页面直接依赖：`../utils/showErrorModal`。
- [src/test/](../../../src/test/)、[vite.config.js](../../../vite.config.js)：本次既有 21 个测试文件、123 个测试通过；页面测试是否直接覆盖见 Global QUESTIONS。

