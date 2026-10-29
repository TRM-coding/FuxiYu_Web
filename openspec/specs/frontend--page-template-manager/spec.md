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

页面 SHALL 维护 name/category/description/subject_template/body_template，保留 SYSTEM 模板删除保护及转模板来源追溯。自定义模板 SHALL 可删除，旧草稿或公告的模板引用由后端解除，已有正文和投递记录不随模板删除改变。编辑当前 `category=system` 的模板时，类别 Select SHALL 禁用并保持 `system`，名称、描述、主题模板、正文模板 SHALL 仍可编辑；新建模板或编辑当前 `category=custom` 的模板时，类别 Select SHALL 保持现有可选行为，并允许 `custom → system`。上述前端约束 MUST NOT 替代 Ctrl 的最终裁决；Ctrl 对系统模板类别变更返回 HTTP 400 `error_reason=cannot_change_system_template_category`。

#### Scenario: 删除已经被公告或草稿引用的自定义模板
- **WHEN** 删除已经被公告或草稿引用的自定义模板
- **THEN** 删除成功后刷新模板列表，相关草稿及公告仍使用各自保存的内容，不要求先删除草稿

#### Scenario: 新建模板时类别保持可选

- **GIVEN** 用户打开新建模板弹窗
- **WHEN** 查看并操作类别 Select
- **THEN** 类别 Select 可用，默认“自定义”，仍可选择“系统”；选择“系统”后保存请求的 `category` 为 `system`

#### Scenario: 编辑自定义模板可转为系统

- **GIVEN** 编辑目标当前 `category=custom`
- **WHEN** 用户把类别改为“系统”并保存
- **THEN** 类别 Select 可用，`updateTemplate` 收到 `category=system`；保存成功后按既有流程关闭编辑并刷新列表

#### Scenario: 编辑系统模板锁定类别但保留内容编辑

- **GIVEN** 编辑目标当前 `category=system`
- **WHEN** 打开编辑弹窗并修改名称、描述、主题模板或正文模板
- **THEN** 类别 Select 禁用且显示“系统”，名称、描述、主题模板、正文模板仍可修改；保存请求的 `category` 仍为 `system`，不改写为其他值

### Requirement: TemplateManager 构建归属

页面 SHALL 通过路由表的按需加载组织参加 Vite 构建：`src/routes/index.jsx` 对页面组件与共同布局（`MainLayout`、`AdminLayout`）使用 `React.lazy` 动态导入，并在 route element 层以既有 `Suspense` 提供页面级加载反馈（仅描述当前实现，不新增加载 UI）；`LoginLayout`、路由骨架与 React 运行时随入口静态加载。`LoginLayout` 内的 `ModelViewer` 亦按需加载，three 相关代码经 `vite.config.js` 的 `manualChunks` 按依赖方向 addons → WebGL → core 分为 `vendor-three-core`、`vendor-three-webgl`、`vendor-three-addons`，均不进入入口 chunk。上述页面与 `ModelViewer` 不再与同路由树代码共同进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`src/utils/requestManager.jsx` 与 `src/utils/validateCmdArg.jsx` 统一为静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属构建验收观测，记入本轮验收报告，不作为本规格固化的历史指标

### Requirement: TemplateManager 列表分页与深链定位

模板管理页 SHALL 使用现有 `listTemplates` 的 `limit/offset` 分页：首批 `limit=200&offset=0`，下一页 `offset=200`，以服务端 `total` 决定总页数，使 205 个模板中的第 201–205 个可达；MUST NOT 新增接口或把单次 `limit` 提高到 200 以上。页面 SHALL 读取 `?template_id=<id>`：目标不在当前页时使用现有 `getTemplate(id)` 取回并打开编辑；无效 ID SHALL 显示“模板不存在”，不得崩溃或空白。

#### Scenario: 205 个模板分两页

- **GIVEN** 后端返回 `total=205`
- **WHEN** 用户查看模板列表
- **THEN** 第一页请求 `limit=200&offset=0` 并显示 200 个，第二页请求 `limit=200&offset=200` 并显示 5 个，第 205 个可打开

#### Scenario: 深链定位第 205 个模板

- **GIVEN** 用户从公告编辑器跳转到 `?template_id=205`
- **WHEN** 模板管理页加载
- **THEN** 目标不在当前页时通过现有 `getTemplate(205)` 取回并打开编辑内容，路由保留模板 ID

#### Scenario: 无效模板 ID 不崩溃

- **GIVEN** 地址携带不存在的 `template_id`
- **WHEN** 页面尝试定位
- **THEN** 显示“模板不存在”，列表仍可用，不出现未捕获异常

### Requirement: TemplateManager 模板错误按现有协议映射

模板创建、更新、删除失败 SHALL 以包含 `message` 对象、`status`、`route` 的参数调用 `showErrorModal`，MUST NOT 只传字符串且不传路由。映射 SHALL 使用 Ctrl Q51 契约确认的 `error_reason`：保留既有原因并新增 `cannot_change_system_template_category`，按下表展示中文；MUST NOT 新增该原因之外的字段、错误码或接口。

| route | error_reason | 期望中文 |
| --- | --- | --- |
| `/announcements/templates` | `duplicate_entry` | 模板名称已存在 |
| `/announcements/templates` | `missing_field` | 缺少模板必填字段 |
| `/announcements/templates` | `not_found` | 模板不存在 |
| `/announcements/templates` | `cannot_delete_system_template` | 系统模板不可删除 |
| `/announcements/templates` | `cannot_change_system_template_category` | 系统模板类别不可修改 |

#### Scenario: 重名创建显示模板名称已存在

- **GIVEN** 创建模板返回 `duplicate_entry`
- **WHEN** 页面展示错误
- **THEN** 弹窗显示“模板名称已存在”，不显示通用“重复项导致失败”或后端英文

#### Scenario: 删除系统模板显示不可删除

- **GIVEN** 删除系统模板返回 `cannot_delete_system_template`
- **WHEN** 页面展示错误
- **THEN** 弹窗显示“系统模板不可删除”，模板列表保持原状

#### Scenario: 系统模板类别被后端拒绝显示中文并保留编辑

- **GIVEN** 模板更新被 Ctrl 以 HTTP 400 与 `error_reason=cannot_change_system_template_category` 拒绝
- **WHEN** 页面展示错误
- **THEN** 弹窗必须出现“系统模板类别不可修改”，不得只显示通用 400 或“未收录的错误原因”；编辑弹窗保持打开，已填字段不改，不提示保存成功，列表不按成功路径刷新

#### Scenario: 未登记模板原因保留兜底

- **GIVEN** 模板接口返回上表之外的 `error_reason`
- **WHEN** 页面展示错误
- **THEN** 仍给出中文兜底并标注未收录原因，不硬套“模板名称已存在”

## Source references

- [src/pages/TemplateManager.jsx](../../../src/pages/TemplateManager.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../api/announcement_api`。
- 页面直接依赖：`../utils/showErrorModal`。
- 回归验证：[src/test/](../../../src/test/)；实际范围和结果以当前组件及生产入口测试为准。
