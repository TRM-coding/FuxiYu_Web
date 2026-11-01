# 规格变更：用户表操作与子容器分页

覆盖问题：Q59、Q60。

## ADDED Requirements

### Requirement: ManageUserInTable 用户表行操作不得改变选中行

用户表操作列的编辑、删除、重置密码和权限组按钮 SHALL 调用 `stopPropagation`，MUST NOT 触发父行 `onRow.onClick` 的 `setSelectedRowKey`。本要求只针对用户表操作列，MUST NOT 改变容器子行既有的动作语义。

#### Scenario: 点击编辑用户不改变选中行

- **GIVEN** 用户表当前选中行为用户 A
- **WHEN** 点击用户 B 行的“编辑用户”
- **THEN** 只展开/执行用户 B 的编辑操作，当前选中行仍为用户 A

#### Scenario: 删除、重置密码与权限组同样不冒泡

- **GIVEN** 用户表存在多行用户
- **WHEN** 分别点击“删除”“重置密码”“权限组”
- **THEN** 各自只触发对应回调一次，不改变当前选中行，也不额外触发展开

### Requirement: 子容器分页按服务端 total 且父页保持 pageSize=4

子容器首次请求 SHALL 保留父页 `pageSize=4`，MUST NOT 为分页一次性拉取全部子容器；子表分页 SHALL 使用服务端返回的 `total_number`（缺失时用 `total_page * pageSize` 计算），页码由父页当前 `page` 控制，页大小固定 4。第二页请求 SHALL 使用 `page_number=1`、`page_size=4` 并只接收第 5/6 条；当服务端 total 不超过 4 时 MUST NOT 渲染分页入口。

#### Scenario: 六个子容器第二页可达第 5/6 个

- **GIVEN** 用户拥有 6 个子容器，服务端 total 为 6，首次请求返回前 4 条
- **WHEN** 用户在子表分页点击第 2 页
- **THEN** 父页以 `page_number=1`、`page_size=4` 重新请求，第二页显示第 5、6 个子容器，分页总数为 6

#### Scenario: 服务端 total 不超过 4 不显示分页

- **GIVEN** 用户只有 4 个或更少子容器
- **WHEN** 首屏请求返回
- **THEN** 子表不显示分页入口，也不额外请求第二页
