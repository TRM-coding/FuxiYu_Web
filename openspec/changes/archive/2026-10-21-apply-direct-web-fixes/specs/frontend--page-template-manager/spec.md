# 规格变更：模板管理分页、深链与错误映射

覆盖问题：Q37、Q52。

## ADDED Requirements

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

模板创建、更新、删除失败 SHALL 以包含 `message` 对象、`status`、`route` 的参数调用 `showErrorModal`，MUST NOT 只传字符串且不传路由。映射 SHALL 仅使用 Ctrl 当前已存在的 `error_reason`，按下表展示中文；MUST NOT 新增后端字段、错误码或接口。

| route | error_reason | 期望中文 |
| --- | --- | --- |
| `/announcements/templates` | `duplicate_entry` | 模板名称已存在 |
| `/announcements/templates` | `missing_field` | 缺少模板必填字段 |
| `/announcements/templates` | `not_found` | 模板不存在 |
| `/announcements/templates` | `cannot_delete_system_template` | 系统模板不可删除 |

#### Scenario: 重名创建显示模板名称已存在

- **GIVEN** 创建模板返回 `duplicate_entry`
- **WHEN** 页面展示错误
- **THEN** 弹窗显示“模板名称已存在”，不显示通用“重复项导致失败”或后端英文

#### Scenario: 删除系统模板显示不可删除

- **GIVEN** 删除系统模板返回 `cannot_delete_system_template`
- **WHEN** 页面展示错误
- **THEN** 弹窗显示“系统模板不可删除”，模板列表保持原状

#### Scenario: 未登记模板原因保留兜底

- **GIVEN** 模板接口返回上表之外的 `error_reason`
- **WHEN** 页面展示错误
- **THEN** 仍给出中文兜底并标注未收录原因，不硬套“模板名称已存在”
