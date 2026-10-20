# 规格变更：公告编辑器的列表、模板与光标行为

覆盖问题：Q22、Q24、Q52、Q55。

## ADDED Requirements

### Requirement: AnnouncementEditor 机器和容器列表及详情请求使用零基分页并保护乱序

机器和容器列表 SHALL 使用 `page_number=0` 与现有 `page_size=500`，MUST NOT 再把 1 当作首页；用户列表的分页口径不在本要求内，MUST NOT 一并替换。机器/容器选择变化产生的列表请求，以及 `getDetailInformation`、`getContainerDetailInformation` 详情请求，SHALL 使用同一上下文保护（取消或递增序号）；旧列表或旧详情响应 MUST NOT 覆盖当前选择。

#### Scenario: 首屏请求第 0 页

- **GIVEN** 公告编辑器首次展开机器或容器选择器
- **WHEN** 页面请求列表
- **THEN** 请求携带 `page_number=0`、`page_size=500`，返回结果按当前选择写入

#### Scenario: 切换机器后旧容器响应晚到

- **GIVEN** 用户先选择机器 A，再切换到机器 B
- **WHEN** 机器 A 的容器请求晚于机器 B 的请求返回
- **THEN** 机器 A 的旧列表被丢弃，容器选择仍显示机器 B 的结果

#### Scenario: 旧机器或容器详情响应晚到

- **GIVEN** 用户已从机器 A/容器 A 切换到机器 B/容器 B
- **WHEN** A 的 `getDetailInformation` 或 `getContainerDetailInformation` 响应晚于 B 返回
- **THEN** 旧 `machineDetail`/`containerDetail` 被丢弃，编辑器属性仍对应当前选择

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
