# 规格变更：公告编辑器的列表、模板与光标行为

覆盖问题：Q22、Q24、Q52、Q55。

## ADDED Requirements

### Requirement: AnnouncementEditor 机器和容器独立选择并各自保护列表与详情请求

机器和容器是独立的公告属性选择器。机器/容器列表 SHALL 使用 `page_number=0` 与现有 `page_size=500`；容器列表请求 SHALL 使用 `machine_id:''`，MUST NOT 跟随当前机器选择过滤。机器选择变化 MUST NOT 清空或重载容器选择/列表；容器选择变化 MUST NOT 清空机器选择/详情。机器和容器各自的列表请求及 `getDetailInformation`/`getContainerDetailInformation` 详情请求 SHALL 使用各自上下文的取消或递增序号；旧响应 MUST NOT 覆盖对应选择，组件卸载后 MUST NOT 再应用任何列表或详情响应。用户列表分页口径不在本要求内，MUST NOT 一并替换。

#### Scenario: 首屏请求第 0 页

- **GIVEN** 公告编辑器首次展开机器或容器选择器
- **WHEN** 页面请求列表
- **THEN** 机器/容器列表均携带 `page_number=0`、`page_size=500`，容器列表携带 `machine_id=''`，结果按各自选择写入

#### Scenario: 机器切换保留独立容器选择

- **GIVEN** 用户已独立选择机器 A 与容器 B
- **WHEN** 用户切换到机器 C
- **THEN** 容器选择仍为 B，容器列表不按机器重载或过滤；选择器仍可独立选择其他容器，不清空机器选择

#### Scenario: 同一选择器旧列表响应晚到

- **GIVEN** 同一选择器在列表尚未加载完成时再次展开，产生后一次列表请求
- **WHEN** 前一次请求晚于后一次返回
- **THEN** 仅应用后一次列表，旧响应不覆盖选项，也不提前结束当前加载状态；机器与容器选择器各自判断请求序号

#### Scenario: 旧机器或容器详情响应晚到

- **GIVEN** 机器和容器已分别切换到当前选择，旧详情请求仍在途
- **WHEN** 旧 `getDetailInformation` 或 `getContainerDetailInformation` 响应晚于当前请求返回
- **THEN** 旧 `machineDetail`/`containerDetail` 被丢弃，各自详情仍对应当前选择，且不清空另一独立选择

#### Scenario: 卸载后旧列表或详情响应不应用

- **GIVEN** 机器或容器的列表/详情请求仍在途
- **WHEN** 公告编辑器卸载后这些响应返回
- **THEN** 不更新已卸载页面的机器/容器列表或详情，也不清空另一独立选择

### Requirement: AnnouncementEditor 模板下拉分页与编辑深链

模板下拉 SHALL 使用现有 `listTemplates` 的 `limit/offset`：首批 `limit=200&offset=0`，加载更多使用 `offset=200`，使 205 个模板中的第 205 个可选；MUST NOT 新增接口或提高单次 `limit` 超过 200。点击“编辑此模板”SHALL 跳转到 `/admin/announcements/templates?template_id=<id>`，由模板管理页按 ID 打开编辑内容。

#### Scenario: 205 个模板可加载到第 205 个

- **GIVEN** 后端返回 205 个模板
- **WHEN** 用户在下拉中加载更多
- **THEN** 首批显示 200 个，第二批以 `offset=200` 取回 5 个，第 205 个模板可选择

#### Scenario: 编辑此模板携带模板 ID

- **GIVEN** 用户选中一个模板并点击“编辑此模板”
- **WHEN** 路由跳转
- **THEN** 目标地址包含 `template_id=<该模板 ID>`，不丢失模板标识

#### Scenario: 加载更多失败保留已加载项

- **GIVEN** 首批 200 个模板已加载
- **WHEN** `offset=200` 的加载更多请求失败
- **THEN** 已加载的 200 个选项保留，页面显示可读错误，不把列表清空

### Requirement: AnnouncementEditor 光标插入保留原选区

插入操作 SHALL 在文本域选区变化时缓存 `selectionStart/selectionEnd`，点击插入按钮导致文本域失焦时仍使用缓存选区；MUST NOT 因按钮获得焦点而追加到文本末尾。插入完成后 SHALL 将光标移动到插入内容末尾。

#### Scenario: 保持焦点时替换选区

- **GIVEN** 文本域保持焦点且用户选中一段文本
- **WHEN** 点击插入按钮
- **THEN** 插入内容替换该选区，光标位于插入内容末尾

#### Scenario: 按钮夺焦后仍插入原选区

- **GIVEN** 文本域有选区，随后焦点移动到插入按钮
- **WHEN** 点击插入按钮
- **THEN** 内容仍写入失焦前缓存的原选区，不追加到文本末尾
