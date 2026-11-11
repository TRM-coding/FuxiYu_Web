# Design

## Context

`DeletedContainers` 当前在确认后同步调用 `POST /api/containers/clean_deleted_container_mount`，请求挂到 Ctrl 完成 Node 的 `clean_mount` 才结束；成功提示和列表刷新都发生在同一次 Promise 内。Ctrl 也在同一条同步链路里写 `cleaned_at`/`mount_cleaned`，没有可查询的中间状态。

本变更把 Web 边界移到“受理”：Ctrl 在内存中维护异步任务状态，并把逐行 `mount_cleanup_state`/`mount_cleanup_error_reason` 附加到既有 `list_deleted_containers` 返回。Web 复用该列表按需刷新当前页，不新增状态 API，不直连 Node。历史 `cleaned_at`/`mount_cleaned` 继续作为唯一清理成功事实，不新增 `succeeded` 状态。

Ctrl 的列表接口当前会在 Python 侧组装整页记录，按需刷新只在存在清理中记录或刚受理时发生，并只合并当前页清理字段；不会常驻轮询整页。数据库结构不变。

## Goals / Non-Goals

**Goals:**

- 清理请求只等待 `accepted: true`，受理后立即进入可追踪的“清理中”。
- 复用既有列表读取逐行状态，页面打开、刷新和受理后都不依赖本地持久化。
- 清理中阻止该行清理与恢复；失败/未知/丢失后回退既有字段与路径门禁。
- 继续用 `cleaned_at`/`mount_cleaned` 显示“已清理”，兼容历史记录。
- 保留分页、用量、复制、详情、恢复二选一、凭据、权限、错误处理和移动布局。
- 不新增数据库结构、状态接口或权限门禁。

**Non-Goals:**

- 不实现 Ctrl 的异步任务调度、Node 的异步删除任务或两者协议。
- 不把清理状态持久化，不承诺 Ctrl 重启后恢复轮询或结果。
- 不自动重试、自动恢复、批量清理或全局清理队列。
- 不改变 Node 路径安全、恢复快照语义、删除资格或长期容器规则。
- 不改变桌面/移动布局、恢复内容选择或凭据展示。

## Decisions

### D1. 复用清理端点，受理只认 `accepted: true`

“清理 mount”仍调用 `POST /api/containers/clean_deleted_container_mount`，请求体保持 `{ mount_cleanup_id }`。Ctrl 完成既有权限、活容器、路径和冲突校验后立即返回：

```json
{ "success": 1, "accepted": true }
```

Web 只在 `accepted === true` 时进入受理路径。HTTP 2xx、`success: 1`、旧式空响应或只有 `message` 的响应都不是受理完成；旧式成功响应按未知处理，不显示成功。Ctrl MUST 在返回 `accepted: true` 前把该记录写入进程内 `cleaning` 状态，供页面立即刷新列表时读取；否则本次立即刷新会把 `null` 当作无状态并回退。清理请求失败时保留既有错误弹窗，不启动轮询。

不要求 202 或新的任务 ID。保留现有 200 与 `accepted` 字段可减少对状态码、错误映射和其他客户端的破坏；代价是 Web 必须严格检查 body。

### D2. 逐行状态由既有列表返回

`list_deleted_containers` 的每条记录增加：

```json
{
  "mount_cleanup_state": null,
  "mount_cleanup_error_reason": null
}
```

字段语义：

- `null` 或缺失：Ctrl 当前没有该记录的清理状态，不代表成功。
- `cleaning`：已受理且 Ctrl 仍在轮询 Node，未清理记录应显示“清理中”。
- `failed`：Node 清理失败或 Ctrl 无法完成，未清理记录显示“清理失败”。
- `unknown`：Node 任务丢失、Node 重启或 Ctrl 无法确认结果，未清理记录显示“清理状态未知”。
- `mount_cleanup_error_reason` 只用于稳定诊断；Web 不回显 Node stderr、HTML 或原始响应。
- 不新增 `succeeded`/`not_found` 清理状态。成功仍由既有 `cleaned_at` 非空或 `mount_cleaned === true` 表达；目录不存在仍由既有路径/用量 `not_found` 门禁表达。
- 字段值非法时按未知处理，不按成功处理。历史记录缺少新字段时沿用既有展示。

不新增独立状态查询接口；刷新页面本身就是重新调用列表。

### D3. 页面状态与门禁

页面按 `deleted_id` 合并清理字段，展示优先级如下：

1. `cleaned_at` 非空或 `mount_cleaned === true`：既有“已清理”，不要求新状态。
2. 未清理且 `mount_cleanup_state === "cleaning"`：显示“清理中”，两项操作禁用；即使当前页用量同时为 `not_found` 也先显示“清理中”，直到 Ctrl 任务结束。
3. 未清理、无 `cleaning` 且当前页用量为稳定 `not_found`：显示“目录不存在”，按既有路径门禁禁用两项；失败/未知状态不得覆盖该路径事实。
4. 未清理、无 `cleaning`、无 `not_found` 且 `failed`：显示“清理失败”，按既有列表/用量门禁重算。
5. 未清理、无 `cleaning`、无 `not_found` 且 `unknown`/非法值：显示“清理状态未知”，按既有列表/用量门禁重算。
6. `null`/缺失：回退既有列表事实与门禁，不显示成功。

- 清理中的原因固定为“清理进行中，无法恢复”/“清理进行中”；确认框不得打开，提交时再次从 ref 复检最新状态。
- `failed`/`unknown`/`null` 不新增权限；恢复仍按 `data_recoverable`、`snapshot`、`cleaned_at`、`mount_cleanup_id` 与用量 `not_found` 计算。`data_recoverable` 且用量未指明目录不存在时，恢复与清理按钮均重新开放。
- `original_container_is_valid === true` 仍优先禁用两项；没有 `cleaning` 时，稳定用量 `not_found` 仍按目录不存在禁用两项。`cleaning` 与 `not_found` 并存时以清理中优先，任务结束后再落到目录不存在。
- 受理后在列表刷新返回前使用本地 `cleaning` 占位，并不改写 `cleaned_at`/`mount_cleaned`；列表返回后以服务端字段为准。
- 清理状态查询失败时保留最后已知的“清理中”，显示刷新失败并继续重试；不把网络失败当终态或成功。

替代方案是在 Web 内保存定时器并本地推导完成，刷新后会丢失，且无法满足“刷新页面读取进程内状态”，拒绝。

### D4. 按需刷新列表

- 受理成功后立即刷新一次当前页列表；存在 `cleaning` 时每 3000ms 刷新一次。
- 单飞：上一响应结算后才安排下一拍；同一时刻最多一个列表刷新请求。
- 刷新仍使用当前 `page`/`pageSize`，只合并当前页记录的 `mount_cleanup_state`、`mount_cleanup_error_reason` 和既有清理字段；不重置分页、展开行、用量轮询、复制或详情状态。
- 页面打开/刷新的首次列表直接携带状态，不需要额外状态请求。
- 翻页、手动刷新、重新加载、离开页面时推进代次、清除计时器并 abort 在途请求；迟到响应按代次、页面 key 和当前行集合校验后丢弃。
- 401 走既有身份失效流程；403 停止并显示不可用。网络错误、超时、5xx 或畸形响应保留最后已知状态并重试，不升级成功。没有 `cleaning` 后停止轮询。
- 手动刷新保持可用；它重新拉取列表并同步状态，不重置其他交互。

### D5. 结果与兼容

- 成功：列表返回 `cleaned_at` 非空或 `mount_cleaned === true` 时按既有字段显示“已清理”。只有本次受理后的列表首次出现该事实时才提示清理成功；历史清理记录正常显示，不要求新状态。
- 失败：`failed` 显示“清理失败”，不显示成功，不回显原始错误；不自动重试；门禁按既有字段/用量重算。若 Ctrl 任务已结束且用量为 `not_found`，按路径门禁显示“目录不存在”而非“清理失败”。
- 未知：`unknown`、非法状态或当前会话已受理但列表无状态时显示“清理状态未知”或回退列表事实；不显示成功，不永久停留在“清理中”，不自动写操作。若无 `cleaning` 且用量为 `not_found`，按目录不存在显示。
- Ctrl 重启：列表字段可能回到 `null`；此时没有证据证明清理完成，按既有 `cleaned_at`/`mount_cleaned` 与列表事实展示，恢复/清理按原门禁重算。
- 目录不存在：未清理且 Ctrl 状态不是 `cleaning` 时，继续由既有 `mount_path`/用量 `not_found` 显示“目录不存在”，不新增清理状态。若 `cleaning` 与实时 `not_found` 并存，先显示“清理中”并禁用两项；任务结束后才显示“目录不存在”，全程不伪造成功。
- Node 重启：可能部分删除，Ctrl 可返回 `failed`/`unknown`。此时只要记录仍 `data_recoverable` 且用量未指明目录不存在，恢复与清理按钮均开放；用户确认后走既有恢复流程，页面不声称目录完整。
- 开始新的清理会生成新的刷新代次；旧响应不得覆盖新的“清理中”或后续结果。

### D6. 与既有页面功能的组合

- 清理状态按行处理，一行清理不阻塞其他行、分页、恢复、用量采样、复制或详情。
- 受理时沿用现有行为使该页旧用量失效；失败/未知后恢复既有用量采样。成功由列表既有字段驱动，按当前页刷新，不回到第一页。
- 恢复仍只发 `{ deleted_id, content_source }`；清理仍只发 `{ mount_cleanup_id }`。列表刷新只发当前页分页参数，不携带路径或清理状态。
- 桌面表格和移动卡片共用同一 `columns`、状态派生和门禁；移动端只增加状态文案，不新增第二套数据请求。
- 既有权限、401/403 处理、错误弹窗、分页越界回退、展开 key 清理和凭据弹窗保持原实现，只在其上叠加清理状态。

### D7. 无数据库结构变动

清理进度和结果只存在于 Ctrl 进程内；Web 不写入持久化存储，不新增状态接口。Ctrl 可以在成功时更新既有 `cleaned_at`/`mount_cleaned`，但本变更 MUST NOT 新增表、列、迁移、索引或约束。Ctrl 重启丢失状态是设计内行为。

## Risks / Trade-offs

- **进程内状态易失**：Ctrl 重启会丢轮询和结果；Web 回退既有列表，用户可重新清理或恢复。无法区分“从未开始”和“已丢失”是接受的限制。
- **部分删除后的恢复风险**：Node 重启可能留下不完整目录，失败/未知后恢复按钮会重新开放。用户已明确接受；页面不伪造完整性，也不自动恢复。
- **列表刷新放大**：仅在有 `cleaning` 或刚受理时每 3 秒刷新当前页，并只合并清理字段；若 Ctrl 列表本身变慢，会延长状态收敛时间。保留手动刷新作为退路。
- **刷新竞态**：受理后到列表返回前使用本地占位；提交时复检状态，避免在服务端已清理时重复写。
- **历史字段与新状态不一致**：以 `cleaned_at`/`mount_cleaned` 为成功事实；若新状态与既有字段冲突，历史清理事实优先展示，避免把已清理记录误写成失败/未知。
- **跨仓库契约**：Web 依赖 Ctrl 返回 `accepted: true` 和上述列表字段。Web 测试只能验证请求、列表合并与展示，不能证明 Ctrl 实际轮询或 Node 删除。
