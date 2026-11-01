# Proposal

## Why

管理员操作日志的目标类别目前只能单选，无法一次查看多个类别的审计记录；Q49 中，发送中的公告被删除后前端会因查不到该批 id 而无限轮询并长期停在“发送中”；Q54 中，毕业年份可被清空并提交 `null`，后端却丢弃空值，导致 400 或静默不生效。本变更按已确定的用户决策收敛这三处 Web 行为。

## What Changes

- 操作日志的“目标类型”由单选下拉改为复选框多选，类别之间按 OR 组合；提供“全选”按钮，不提供“清空”按钮；零项选择等同于“全部”，不向请求传 `target_type`。
- 日志列表 GET 请求对 `target_type` 使用重复查询参数传递多值；仅传一个值时保持现有单值调用兼容；统计、分页、周次和其他筛选的 AND 语义及请求参数保持不变。
- Q54：毕业年份保持不允许清空。个人资料页与用户管理页的编辑入口对空年份给出明确反馈并阻止提交，不发送 `null`、空串或空 payload；未修改年份时也不因空值产生更新。
- Q49：发送中删除公告不取消投递。前端进度轮询在追踪的公告持续查不到时停止，并如实显示“状态不可确认”，MUST NOT 显示成功、已完成或已取消。
- 补齐多选、全选、全不选、重复查询参数、毕业年份空值阻止、删除后进度未知的回归测试，并记录测试结果。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `frontend--page-admin-logs`：目标类别多选 OR、全选、零项即全部、GET 重复参数、统计与分页语义不变。
- `frontend--page-user`：当前用户个人资料中毕业年份不可清空，空值有明确反馈且不提交。
- `frontend--page-manage-user`：管理员编辑用户资料时毕业年份不可清空，空值有明确反馈且不提交。
- `frontend--page-announcements`：删除发送中公告后停止无限轮询，显示不可确认状态，不伪报成功或取消。

## Impact

- 代码：`src/pages/AdminLogs.jsx`、`src/api/operation_log_api.jsx`、`src/pages/User.jsx`、`src/pages/ManageUser.jsx`、`src/pages/Announcements.jsx`、`src/utils/announcementSend.js`；必要时补充样式。
- 测试：`src/test/AdminLogs.test.jsx` 及新增/调整的日志参数、毕业年份、公告进度测试。
- 接口：仅调整 Web 发出的 GET 查询串形式，不修改 Ctrl 接口、数据库、权限或投递语义。
- 交付：只改 Web 仓库，不提交、不归档，不触碰生产。
