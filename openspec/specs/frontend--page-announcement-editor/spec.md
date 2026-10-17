# AnnouncementEditor

## Purpose

公告正文与模板编辑、属性占位插入、草稿保存。本规格记录当前页面入口、权限、API 与交互边界。未完成问题见 [Global QUESTIONS](../../../../FuxiYu_Global/QUESTIONS.md)。

## Requirements

### Requirement: AnnouncementEditor 页面入口与身份

页面 SHALL 通过 `/admin/announcements/editor` 装配。现有身份与权限约束为：管理布局和公告 API；草稿/模板通过查询参数或页面状态加载。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `AnnouncementEditor` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: AnnouncementEditor 主流程

编辑器 SHALL 选模板填充主题正文并保留属性插入功能，保存 title、content、raw_content 等独立草稿内容，MUST NOT 保存有效 template_id 关联。模板仅提供编辑初值，不执行模板变量替换引擎；加载已有草稿 SHALL 优先恢复已保存内容，不重新套用模板。草稿操作 SHALL 遵循创建者私有边界。

#### Scenario: 保存草稿成功
- **WHEN** 创建者保存草稿成功
- **THEN** 保留 draft_id 和编辑内容，可继续编辑或进入发送列表；下拉分页与插入光标问题仍单独登记

#### Scenario: 清空模板选择
- **WHEN** 用户选模板后编辑正文再清空模板选择并保存
- **THEN** 保存当前编辑内容，不保留模板关联，不因清空选择丢弃正文

#### Scenario: 模板变化后打开草稿
- **WHEN** 原模板已修改或删除，用户打开之前保存的草稿
- **THEN** 恢复草稿自身的内容，不因历史模板 id 再次请求或覆盖正文

### Requirement: AnnouncementEditor 构建归属

页面 SHALL 通过路由表的按需加载组织参加 Vite 构建：`src/routes/index.jsx` 对页面组件与共同布局（`MainLayout`、`AdminLayout`）使用 `React.lazy` 动态导入，并在 route element 层以既有 `Suspense` 提供页面级加载反馈（仅描述当前实现，不新增加载 UI）；`LoginLayout`、路由骨架与 React 运行时随入口静态加载。`LoginLayout` 内的 `ModelViewer` 亦按需加载，three 相关代码经 `vite.config.js` 的 `manualChunks` 按依赖方向 addons → WebGL → core 分为 `vendor-three-core`、`vendor-three-webgl`、`vendor-three-addons`，均不进入入口 chunk。上述页面与 `ModelViewer` 不再与同路由树代码共同进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`src/utils/requestManager.jsx` 与 `src/utils/validateCmdArg.jsx` 统一为静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属构建验收观测，记入本轮验收报告，不作为本规格固化的历史指标

## Source references

- [src/pages/AnnouncementEditor.jsx](../../../src/pages/AnnouncementEditor.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../api/announcement_api`。
- 页面直接依赖：`../api/machine_api`。
- 页面直接依赖：`../api/container_api`。
- 页面直接依赖：`../utils/showErrorModal`。
- 回归验证：[src/test/](../../../src/test/)；实际范围和结果以当前组件及生产入口测试为准。
