# Spec Delta

## MODIFIED Requirements

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
