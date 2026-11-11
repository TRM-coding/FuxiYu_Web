# Proposal

## Why

已删除容器的 mount 清理仍由 Web 同步等待 Node 删除完成。目录较大、Node 响应慢或连接中断时，请求会长时间未决，页面无法展示可追踪的清理中状态，也无法在刷新后从 Ctrl 读取当前进度。同步返回的成功/失败还可能被误读，导致用户在目录未删净时恢复或重复清理。

## What Changes

- Web 对“清理 mount”只提交现有请求并等待 Ctrl 返回 `accepted: true`；受理后显示“清理中”，MUST NOT 把 2xx、旧响应或本地计时当作删除完成。
- Ctrl 在已有 `list_deleted_containers` 的每条记录上增加进程内 `mount_cleanup_state`（`null`/`cleaning`/`failed`/`unknown`）与 `mount_cleanup_error_reason`；Web 复用该列表按需刷新当前页状态，**不新增状态查询 API**。
- 页面打开、刷新和受理后都从列表读取状态；清理中每 3 秒单飞刷新当前页，翻页、刷新或离开时取消旧计时器与在途请求，迟到响应不得覆盖新页。
- 清理中的记录禁用“清理 mount”和“恢复”，确认框不得打开，也不得发写请求；若清理中与实时 `not_found` 同时存在，先以“清理中”优先并继续禁用，直到 Ctrl 任务结束，再按既有 `not_found` 正常显示目录不存在，全程不伪造成功。其他记录、分页、用量、复制、详情、恢复二选一、凭据弹窗和移动卡片保持既有功能。
- 成功仍由既有 `cleaned_at`/`mount_cleaned` 表达并显示“已清理”；**不要求存在新的 `succeeded` 状态**。受理、`cleaning`、`failed`、`unknown`、`null`、旧响应或 Ctrl 重启后丢失状态均不得冒充成功。
- `failed`/`unknown` 后只按既有列表字段与路径/用量门禁重新计算恢复与清理；Node 重启导致部分删除时，用户接受再次开放恢复按钮并可恢复部分删除目录。目录不存在继续沿用既有 `mount_path`/用量门禁正常显示。
- Ctrl 的清理进度和结果只在进程内，不新增或修改数据库表/列；Ctrl 重启可丢失状态，Web 必须回退到既有列表事实而不是永久停留在“清理中”。

## Capabilities

### New Capabilities

无新增 capability。

### Modified Capabilities

- `frontend--page-deleted-containers`: 清理 mount 改为受理后复用列表读取进程内状态，增加清理中、失败/未知门禁与展示，并用既有 `cleaned_at`/`mount_cleaned` 表示清理成功；保留其他删除页功能。

## Impact

- Web：`src/pages/DeletedContainers.jsx`、`src/api/container_api.jsx`、列表状态合并/轮询工具及对应测试；不新增路由、状态接口、权限或数据库访问层。
- 接口：`POST /api/containers/clean_deleted_container_mount` 成功时返回 `accepted: true`，不等待 Node；`POST /api/containers/list_deleted_containers` 的记录增加上述两个进程内字段。Web 不新增或调用其他状态接口，不直接访问 Node。
- 跨仓库：Ctrl 负责受理、后台轮询 Node 异步任务并维护进程内状态；Node 负责异步删除任务。两者不在本 Web 变更中实现，且不得为此新增数据库结构。
- 兼容性：历史 `cleaned_at`/`mount_cleaned` 继续显示已清理；缺少新字段、旧式成功响应或 Ctrl 重启丢失状态时，Web 只回退既有列表事实，不显示清理成功。恢复接口、二选一流程、凭据弹窗、分页和移动布局不变。
- 限制：Ctrl 重启可丢失轮询与结果；Node 重启可能导致部分删除，失败/未知后恢复按钮重新开放是用户明确接受的风险。
