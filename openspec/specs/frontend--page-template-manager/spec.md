# TemplateManager

## Purpose

公告模板列表、新建、编辑和删除。本规格记录当前页面入口、权限、API 与交互边界。未完成问题见 [Global QUESTIONS](../../../../FuxiYu_Global/QUESTIONS.md)。

## Requirements

### Requirement: TemplateManager 页面入口与身份

页面 SHALL 通过 `/admin/announcements/templates` 装配。现有身份与权限约束为：管理布局与公告 operator API。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `TemplateManager` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: TemplateManager 主流程

页面 SHALL 维护 name/category/description/subject_template/body_template，保留 SYSTEM 模板删除保护及转模板来源追溯。自定义模板 SHALL 可删除，旧草稿或公告的模板引用由后端解除，已有正文和投递记录不随模板删除改变。

#### Scenario: 删除已经被公告或草稿引用的自定义模板
- **WHEN** 删除已经被公告或草稿引用的自定义模板
- **THEN** 删除成功后刷新模板列表，相关草稿及公告仍使用各自保存的内容，不要求先删除草稿

### Requirement: TemplateManager 构建归属

页面 SHALL 通过路由表的按需加载组织参加 Vite 构建：`src/routes/index.jsx` 对页面组件与共同布局（`MainLayout`、`AdminLayout`）使用 `React.lazy` 动态导入，并在 route element 层以既有 `Suspense` 提供页面级加载反馈（仅描述当前实现，不新增加载 UI）；`LoginLayout`、路由骨架与 React 运行时随入口静态加载。`LoginLayout` 内的 `ModelViewer` 亦按需加载，three 相关代码经 `vite.config.js` 的 `manualChunks` 按依赖方向 addons → WebGL → core 分为 `vendor-three-core`、`vendor-three-webgl`、`vendor-three-addons`，均不进入入口 chunk。上述页面与 `ModelViewer` 不再与同路由树代码共同进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`src/utils/requestManager.jsx` 与 `src/utils/validateCmdArg.jsx` 统一为静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属构建验收观测，记入本轮验收报告，不作为本规格固化的历史指标

## Source references

- [src/pages/TemplateManager.jsx](../../../src/pages/TemplateManager.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../api/announcement_api`。
- 页面直接依赖：`../utils/showErrorModal`。
- 回归验证：[src/test/](../../../src/test/)；实际范围和结果以当前组件及生产入口测试为准。
