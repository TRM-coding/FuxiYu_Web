# Spec Delta

## ADDED Requirements

### Requirement: 目标类别复选多选按 OR 组合

管理员操作日志的目标类别选择 SHALL 使用复选框，支持同时选择多个类别，类别之间按 OR 组合。页面 SHALL 提供“全选”按钮；MUST NOT 提供“清空”按钮。零个类别被勾选时 SHALL 视为“全部类别”，不得视为无结果。

#### Scenario: 勾选多个类别

- **GIVEN** 目标类别初始未勾选
- **WHEN** 用户勾选“机器”和“容器”
- **THEN** 列表请求只按机器或容器目标过滤，其他筛选条件仍以 AND 组合

#### Scenario: 全选

- **GIVEN** 目标类别仅勾选了部分类别
- **WHEN** 用户点击“全选”
- **THEN** 所有目标类别均被勾选，请求不携带 `target_type`、查询包含全部类别（包括未知历史类型），页面不出现“清空”按钮

#### Scenario: 零项视为全部

- **GIVEN** 用户逐项取消所有目标类别复选框
- **WHEN** 列表查询发起
- **THEN** 请求不携带 `target_type`，列表按全部目标类别查询，而不是返回空结果

### Requirement: 日志 GET 使用重复 target_type 参数

日志列表请求 SHALL 将多个目标类别以重复 `target_type` 查询参数传给 Ctrl；空选择 MUST NOT 传 `target_type`。仅有一个目标类别时 SHALL 继续发送单值参数，保持现有单值调用兼容。

#### Scenario: 多值请求

- **GIVEN** 已勾选“机器”“容器”“用户”三个类别
- **WHEN** 页面请求日志列表
- **THEN** 查询串包含三个重复的 `target_type` 参数，值分别为 `machine`、`container`、`user`

#### Scenario: 单值兼容

- **GIVEN** 仅勾选“镜像”
- **WHEN** 页面请求日志列表
- **THEN** 查询串只包含一个 `target_type=image`，与既有单值调用等价

#### Scenario: 空选择不传参数

- **GIVEN** 目标类别零项被勾选
- **WHEN** 页面请求日志列表
- **THEN** 查询串不包含 `target_type`，其他筛选参数照常发送

### Requirement: 其他筛选、统计与分页语义保持

目标类别多选 SHALL NOT 改变操作类型、操作人、仅失败、时间范围与目标类别之间的 AND 组合。统计接口参数与最近 52 周窗口 SHALL 保持现有语义；分页 SHALL 继续使用当前页码和每页数量，并以响应 `total_pages` 更新分页入口。

#### Scenario: 多选目标与其他筛选并存

- **GIVEN** 用户同时选择操作类型、操作人、仅失败、时间范围和多个目标类别
- **WHEN** 发起日志查询
- **THEN** 请求同时包含这些 AND 条件，目标类别内部仍为 OR

#### Scenario: 分页与统计不受目标多选影响

- **GIVEN** 当前位于第 2 页且已勾选多个目标类别
- **WHEN** 查询返回新的 `total_pages`
- **THEN** 列表按当前页请求并更新分页入口，统计请求仍使用既有时间窗口和参数
