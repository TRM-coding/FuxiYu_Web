# 规格变更：镜像页刷新、选中状态与错误映射

覆盖问题：Q22、Q37、Q63、Q64。

## ADDED Requirements

### Requirement: CreateImage 关键词列表只应用当前上下文

关键词变化产生的镜像列表请求 SHALL 使用请求序号或 AbortController；响应应用前 MUST 确认仍对应当前关键词、`mine_only` 与资源范围。旧响应 MUST NOT 覆盖当前列表或当前选中项。

#### Scenario: 当前关键词响应应用

- **GIVEN** 用户停留在当前关键词与筛选
- **WHEN** 当前列表请求返回
- **THEN** 左侧列表按该响应更新，选中项仍与当前列表一致

#### Scenario: 旧关键词响应晚到

- **GIVEN** 用户从关键词 A 切到关键词 B
- **WHEN** 关键词 A 的请求晚于关键词 B 返回
- **THEN** 关键词 A 的结果被丢弃，列表仍显示关键词 B 的结果

### Requirement: CreateImage 新建成功后清空关键词、空词重取、选中新项并保留表单

新建镜像成功后页面 SHALL 清空关键词为 `''`，以空关键词重新请求列表，再选中返回的新 `image_id`，并保留用户刚提交的表单字段；MUST NOT 因新项尚未进入列表而把表单重置为空白。重取失败时 SHALL 保留提交表单并展示错误，MUST NOT 伪造新项已选中。

#### Scenario: 非匹配关键词下新建成功

- **GIVEN** 当前关键词不匹配即将创建的镜像，表单已填写
- **WHEN** 新建成功并返回 `image_id`
- **THEN** 关键词变为空串，列表以 `image_search=''` 重取并包含新镜像，`selectedId` 为新 `image_id`，表单字段保持提交值

#### Scenario: 空词重取失败仍保留表单

- **GIVEN** 新建成功但空关键词列表请求失败
- **WHEN** 页面处理失败
- **THEN** 表单保留刚提交的内容，页面展示可读错误，不把 `selectedId` 指向不存在的列表项

### Requirement: CreateImage 更新成功后重新读取左侧列表

更新镜像成功后页面 SHALL 按当前关键词重新请求左侧列表并展示最新摘要；MUST NOT 只调用 `selectImage` 而让列表停留旧数据。更新失败时 MUST NOT 把列表或表单伪装成已更新。

#### Scenario: 更新成功重取列表

- **GIVEN** 用户修改镜像并保存
- **WHEN** 更新接口成功
- **THEN** 左侧列表按当前关键词重新请求，展示更新后的名称与摘要，选中项仍为该镜像

#### Scenario: 更新失败保留旧列表

- **GIVEN** 用户保存镜像修改
- **WHEN** 更新接口失败
- **THEN** 左侧列表保持更新前内容，页面展示失败原因，不显示“已保存”成功文案

### Requirement: CreateImage 镜像错误原因按现有协议映射

页面调用 `showErrorModal` 时 SHALL 传递包含 `message` 对象、`status` 与 `route` 的调用参数，`route` MUST 为实际请求路径；镜像映射 SHALL 仅使用 Ctrl 当前已存在的 `error_reason`，MUST NOT 新增后端字段、错误码或接口。具体 route/error_reason 与期望中文见首个场景的映射表。

#### Scenario: 已知镜像原因展示中文

- **GIVEN** 镜像接口返回下表中的 `route` 与 `error_reason`
- **WHEN** 页面展示错误
- **THEN** 弹窗显示表中的中文原因，不显示“未收录的错误原因”

| route | error_reason | 期望中文 |
| --- | --- | --- |
| `/images/create_image` | `duplicate_entry` | 镜像名称已存在 |
| `/images/create_image` | `invalid_status` | 镜像状态不合法 |
| `/images/create_image` | `create_failed` | 创建镜像失败 |
| `/images/update_image` | `duplicate_entry` | 镜像名称已存在 |
| `/images/update_image` | `invalid_status` | 镜像状态不合法 |
| `/images/update_image` | `image_not_found` | 镜像不存在 |
| `/images/update_image` | `update_failed` | 更新镜像失败 |
| `/images/delete_image` | `image_not_found` | 镜像不存在 |
| `/images/set_image_valid_range` | `invalid_valid_range` | 镜像可见范围不合法 |
| `/images/set_image_valid_range` | `image_not_found` | 镜像不存在 |
| `/images/set_image_valid_range` | `set_valid_range_failed` | 设置镜像可见范围失败 |
| `/images/set_image_visible_users` | `not_custom_range` | 只有自定义可见范围才能设置用户名单 |
| `/images/set_image_visible_users` | `unknown_user` | 用户名单中存在不存在的用户 |
| `/images/set_image_visible_users` | `image_not_found` | 镜像不存在 |
| `/images/set_image_visible_users` | `set_visible_users_failed` | 保存镜像可见用户失败 |

#### Scenario: 未登记镜像原因保留兜底

- **GIVEN** 镜像接口返回上表之外的 `error_reason`
- **WHEN** 页面展示错误
- **THEN** 仍给出中文兜底并标注未收录原因，不硬套某个已知镜像错误
