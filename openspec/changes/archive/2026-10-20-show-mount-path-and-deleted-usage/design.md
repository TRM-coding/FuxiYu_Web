# Design

## Context

动机见 [proposal.md](proposal.md)，行为约束见两份 delta：
[ContainerDetailPage](specs/frontend--page-container-detail-page/spec.md)、
[DeletedContainers](specs/frontend--page-deleted-containers/spec.md)。

当前 Web 事实：

- `ContainerDetailPage` 通过 `getContainerDetailInformation` 取 `container_info`，已有 `CopyChip`、`detail-field-grid` 和既有详情权限；页面没有宿主 bind 路径字段，也不请求 Node。
- `DeletedContainers` 通过 `listDeletedContainers` 按服务端分页取 `mount_path`、`mount_cleaned`、`cleaned_at`、`mount_cleanup_id`，已有页面请求序号、当前页 ref 和清理/恢复流程。页面当前没有用量概念。
- `container_api.jsx` 的请求均走同源 `API_ROUTES`、`credentials: 'include'` 和 `ensureOk`（HTTP 非 2xx 及 `success=0` 均作为失败抛出）；`API_ROUTES` 尚无统计路由。
- 已删除页使用既有 `container:manage`；详情页沿用原详情/动作权限，不新增 machine 角色门禁。
- Ctrl/Node 只提供契约依赖，不在本仓实现；完整 HTTP 契约见文末附录，阅读本 design 无需跳转兄弟仓。

## Goals / Non-Goals

**Goals:**

- 用既有 `bind_mount_path` 完整展示/复制宿主路径，空值不拼猜。
- 列表先渲染，当前页统计异步到达；成功、pending、失败和真实 0 可区分。
- pending 轮询有明确 5 秒/120 次上界，所有导航与动作都能取消和丢弃旧响应。
- 旧 Ctrl、旧 Node、部分机器失败和无接口时不阻塞既有的列表、恢复与清理。
- 完整自足的 Web→Ctrl 契约；Ctrl/Node 依赖只用于解释字段来源。

**Non-Goals:**

- 不实现 Ctrl 字段、Ctrl 统计端点或 Node 用量端点；不写其 tasks。
- 不新增数据库列/表/JSON 迁移，不写 `disk_*`、恢复快照或清理记录，不新增统计持久化。
- 不扩周期 WSS（包括 Node→Ctrl 推送、live 容器身份协议），不引入 inode/dev/PID/Docker ID。
- 不新增权限、machine 角色门禁、宿主路径输入或 Node 直连；不修改冻结/恢复/清理资格。
- 不做全盘或跨页孤儿扫描、全局总计、清理门禁或自动冻结，不改 `clean_mount`。
- 不把 `du -sb` 逻辑字节称为物理 blocks，不声称 TTL 样本是瞬时值。
- 本阶段不修改代码、不运行业务测试、不提交/推送/部署。

## Decisions

### 1. 数据所有权：Web 只消费 HTTP 结果

- 详情路径只读既有详情响应中的 `bind_mount_path`，来源是 Ctrl 最近记录；Web 不调用 Node 核实，不根据容器名、机器名、端口或其它字段合成候选路径。
- 已删除页只持有页面列表行和 `deleted_id → usage` 的进程内展示状态；不持有或提交宿主路径。`mount_path` 仍只来自既有列表响应，用于展示，不进入统计请求。
- 统计结果只影响当前渲染，不写回删除记录、快照、`disk_*` 或任何数据库/本地持久化。
- 权限仍使用页面已有的 `hasPermission('container:manage')`（已删除页）；不新增按钮级 machine 角色判断。服务器是否允许统计仍以既有 `container:manage` 和记录解析为准。

### 2. 详情字段的展示与空值降级

- `ContainerDetailPage` 从标准化后的 detail 对象读 `bind_mount_path`，放在既有“镜像信息”卡的字段区，增加“宿主 bind 路径”标签。长路径使用 `CopyChip` 的 block 展示并允许横向断行，保留完整字符串。
- 非空字符串完整展示；复制内容严格等于响应值，不 trim、不截断、不转成相对路径。
- `null`、`undefined`、空字符串、非字符串或旧 Ctrl 缺字段：直接渲染“未记录”文本，不渲染可点击的复制候选。
- 在路径旁显示“最近记录，非实时核对”；页面不发起额外请求，也不改变既有状态轮询、动作或权限。
- 详情刷新仍走既有 `loadDetail`/状态轮询；新字段只是随详情快照更新，不建立独立轮询。

**Why：** 既有字段已是用户可理解的事实，额外 Node 查询会扩大协议与权限面，且空值无法可靠推导。

### 3. 已删除页的展示状态模型

页面为每个当前行维护独立、可丢弃的展示状态，以 `deleted_id` 为键：

| 状态 | 触发 | 展示 |
| --- | --- | --- |
| `loading` | 列表已完成、统计首批未返回 | “读取统计中” |
| `pending` | Ctrl 返回 `pending=true` | “测量中”，无 0、无时间 |
| `success` | `pending=false,error=null,bytes>=0` 且有真实 `measured_at` | 逻辑大小 + 测量时间 |
| `error` | `pending=false,error` 非空或结果不合法 | 稳定原因/“统计不可用”，无 0 |
| `unavailable` | 接口不支持、整批失败、缺项或响应形状非法 | “统计不可用”，无 0 |
| 不请求 | 行无 `mount_path`；或 `mount_cleaned === true`；或 `cleaned_at` 非空 | 沿用“无挂载”/“已清理”（后两者满足其一即“已清理”） |

状态不写入列表记录对象，避免清理/翻页后把旧统计错挂到新行。只有当前页仍存在且 ID 相同的行才应用结果。

格式化：

- 新增纯展示 helper（放在既有 `detailFormat.js` 或页面内既有格式化边界）把非负整数格式化为“0 B / KiB / MiB / GiB”。标签必须写“逻辑大小”，不得写“磁盘占用/块占用”。
- `measured_at` 走既有 `parseServerTime`/时间格式化入口；显示真实的样本时间（例如“测量于 …”）。即使样本落在 900 秒 TTL 内且早于删除时间，也只显示该时间，不改成当前时间。
- `pending` 和 `error` 均不显示时间；`bytes=null` 不能因格式化回退显示成 0。
- 错误映射至少包括 `node_unsupported`、`node_timeout`、`node_unavailable`、`node_bad_response`，分别显示“统计不可用（旧 Node）”“统计超时”“机器离线/不可用”“统计响应异常”。未知原因保留原文或归为“统计不可用”，绝不伪造成功。

### 4. 请求编排与请求边界

- 列表成功并写入当前页记录后，才发起首批统计；不等待统计，也不让统计失败改变分页、加载态或列表内容。
- 可测 ID 从“刚返回的当前页 records”派生：正整数 `deleted_id`、`mount_path` 非空、`mount_cleaned !== true` 且 `cleaned_at` 为空。`mount_cleaned === true` 或 `cleaned_at` 非空均视为已清理，不请求统计并展示“已清理”。去重后一次请求；当前分页尺寸最大 100，故不跨页、也不扫描后续页。若 helper 收到空数组则不发送请求。
- API helper 在发送前去重并拒绝非数组、非正整数和超过 100 的请求；Web 永不发送 `path`、`machine_id` 或 `disk_*`。
- 首批请求只发可测 ID；轮询只发当前仍为 pending、且仍满足 `mount_cleaned !== true` 与 `cleaned_at` 为空条件的当前页 ID，去重后组成集合。
- 请求使用既有同源 API 方式（`credentials: 'include'`，经 `ensureOk`）和短轮询超时，避免慢接口堆叠；不复用详情 45 秒同步超时，也不新增 Node 调用。
- 若当前页没有可测 ID（全部无挂载/已清理），不请求，直接显示既有状态；无挂载/已清理行永不触发扫描。

### 5. 轮询生命周期与预算

- 每个“列表页版本”只有一个统计计时器和一个在途请求；采用单次 `setTimeout` 链，不建立多个并行 interval。pending 存在时约每 5 秒触发一次；上一轮未结束时不得再发一轮，避免请求堆叠。
- 每页统计生命周期最多 120 个轮询 tick，约 10 分钟（首批请求不计入预算）。每个 tick 对当前页仍 pending 的 ID 发一个批量请求。
- 返回后逐项更新：success/error 项停止参与后续轮询；没有 pending 时立即清计时器。若仍有 pending 且预算未到，安排下一 tick。
- 达到 120 个 tick 仍有 pending：停止自动轮询，保留“测量未完成”提示，允许用户手动刷新。手动刷新重新执行列表请求并开启新的统计生命周期，不继承旧预算或旧结果。
- 离开页面（effect cleanup）、翻页、刷新、清理、恢复时：清除计时器、abort 统计请求、增加 UI 统计代次，并丢弃迟到结果。清理/恢复开始即让目标行旧统计失效；成功后按既有流程重载当前列表，已清理行不再请求。
- 清理/恢复失败不得把旧 bytes 重新贴回；页面显示失败原因，统计保持不可用，用户可手动刷新。此选择牺牲一次自动重试，换取“不展示清理前旧值”的硬边界。

### 6. 竞态、取消和请求代次

- 复用现有列表的当前页/请求序号语义，为统计增加独立代次（`usageGeneration`）和当前行集合校验。只有同时满足以下条件才应用响应：代次未变、`pageRef/pageSizeRef` 对应同一页、响应中的 `deleted_id` 仍在该页且仍可测。
- 列表请求开始即让旧统计失效；列表成功后用新 records 重新派生 ID。翻页/刷新不把上一页 usage 复制到新页。
- 每次统计调用绑定 AbortController；取消时 abort。`AbortError` 和过期响应静默丢弃，不弹错误、不改成 0、不触发额外重试。
- 清理/恢复的完成回调仍遵循现有当前页刷新逻辑；统计失效不改变列表动作回调的页码语义。
- 页面卸载后不再 setState，也不保留计时器或请求。

### 7. 响应校验与失败落点

- 首批/轮询调用结束后只接受 `success === 1` 且 `usages` 为数组的响应；否则整批请求对应的可测行进入“统计不可用”，保留原列表与可操作性。
- 响应项必须满足附录中的三态之一，并以请求中的 `deleted_id` 映射。缺项、重复/未知 ID、非法 `deleted_id`、`pending` 非布尔、`bytes` 非“非负整数/null”、成功项缺合法 UTC `measured_at`、错误项缺稳定 reason 等均视为该项（或整批形状错误时的全部相关项）不可用；不得回落为 0。
- Ctrl 对无挂载/已清理的合法省略不解释为 0。由于 Web 只请求列表上可测的行，缺失的已请求项显示“统计不可用/记录已变化”，不伪造无挂载。
- 旧 Ctrl 统计接口 404/405 或明确不支持：一次性把当前可测行标为“统计不可用”，不自动重试，不弹阻断模态框；列表、恢复、清理仍按原字段工作。旧详情缺字段已在第 2 节降级。
- 401 交给现有全局认证失效处理；统计错误不新增登录/权限流程。403 只显示该页统计不可用，不推导新的 machine 角色门禁。
- Node 的 `node_unsupported/timeout/unavailable/bad_response` 只作为 Ctrl 返回的逐项原因消费，Web 不自行重试 Node。

### 8. API 组织与兼容面

- 在 `src/configs/backend_config.js` 增加 `CONTAINERS_GET_DELETED_MOUNT_USAGE` 路由常量，值固定为 `/api/containers/get_deleted_container_mount_usage`。
- 在 `src/api/container_api.jsx` 增加一个只负责 POST ID 批量、返回 `usages` 的函数；不在此模块做路径扫描、去重缓存或 Node 访问。取消能力通过可选 `AbortSignal`（或等价可控请求句柄）暴露给页面。
- 详情无需新 API：现有 `getContainerDetailInformation` 的响应新增字段由页面消费；旧 Ctrl 无字段即“未记录”。
- 错误处理沿用 `ensureOk` 与既有 `handleAuthError/showErrorModal` 边界。统计是辅助信息，404/405/网络失败优先内联降级，不覆盖列表的全局错误提示。
- `DeletedContainers` 保留 `canManageContainers` 门禁；未加载或无权限时不发统计。无新权限、无新页面、无新路由。

### 9. 契约附录（自足）

以下为 Web 实现所需的最小 HTTP 契约；Web 只调用 A1/A，B 是 Ctrl/Node 配套依赖，本仓不实现、不直连。

#### A1. 既有详情接口：追加可空路径

请求保持不变：

```http
POST /api/containers/get_container_detail_information
Content-Type: application/json
Cookie: <现有会话>

{"container_id":12}
```

成功响应沿用既有 envelope；改动仅是详情对象新增可空字段：

```json
{
  "success": 1,
  "container_info": {
    "container_id": 12,
    "bind_mount_path": "/home/alice/containers/train-a"
  }
}
```

- `bind_mount_path` 只来自既有 `containers.bind_mount_path`；成功可为字符串或 `null`。其余字段和旧 envelope 不变。
- 旧 Ctrl 缺少该字段、值为 `null`/空串时，Web 显示“未记录”；不改用 Node 查询或从其它字段推导。

#### A. Web → Ctrl：读取已删除容器的挂载用量

请求：

```http
POST /api/containers/get_deleted_container_mount_usage
Content-Type: application/json
Cookie: <现有会话>

{"deleted_ids":[12,13,14]}
```

约束：

- `deleted_ids` 必填、非空、去重、正整数；单次最多 100。仅来自当前页可测行。
- 不发送 `path`、`mount_path`、`machine_id`、任何字节统计或任意宿主路径。
- 权限沿用既有 `container:manage`；不新增 machine 角色门禁。

成功响应（HTTP 2xx）：

```json
{
  "success": 1,
  "usages": [
    {
      "deleted_id": 12,
      "bytes": 123456,
      "measured_at": "2026-10-18T03:04:05Z",
      "pending": false,
      "error": null
    },
    {
      "deleted_id": 13,
      "bytes": null,
      "measured_at": null,
      "pending": true,
      "error": null
    },
    {
      "deleted_id": 14,
      "bytes": null,
      "measured_at": null,
      "pending": false,
      "error": "node_unavailable"
    }
  ]
}
```

字段/状态：

| 字段 | 类型 | 成功 | 测量中 | 错误 |
| --- | --- | --- | --- | --- |
| `deleted_id` | 正整数 | 对应请求 ID | 对应请求 ID | 对应请求 ID |
| `bytes` | 非负整数或 null | `>= 0` | `null` | `null` |
| `measured_at` | UTC 时间串或 null | 真实完成时间 | `null` | `null` |
| `pending` | boolean | `false` | `true` | `false` |
| `error` | 稳定原因串或 null | `null` | `null` | 非空稳定原因 |

- 响应不含 `path`；Web 用既有列表 `mount_path` 展示，ID 只用于行映射。
- `bytes=0` 是合法成功值；`null` 不是 0，任何失败/缺项/形状非法都不得转成 0。
- 无挂载或已清理记录可被 Ctrl 合法省略且不扫描；已清理的条件是 `mount_cleaned === true` 或 `cleaned_at` 非空（满足其一即可），Web 不为其补值。
- HTTP 404/405、`success !== 1`、非数组、整体形状异常：Web 视为该批“统计不可用”，不伪造空成功。

#### B. Ctrl → Node：只读路径用量（配套依赖）

请求：

```http
POST /api/check_mount_usage
Content-Type: application/json

{"config":{"mount_paths":["/abs/containers/a","/abs/containers/b"]}}
```

响应：

```json
{
  "success": 1,
  "mounts": [
    {"path":"/abs/containers/a","bytes":123,"measured_at":"2026-10-18T03:04:05Z","pending":false,"error":null},
    {"path":"/abs/containers/b","bytes":null,"measured_at":null,"pending":true,"error":null}
  ]
}
```

依赖边界（由 Ctrl/Node change 实现，不在本仓编码）：

- 单次最多 100 条绝对路径；`path` 按请求回显供 Ctrl 映射；Node 复用 `get_bind` 的按规范化路径内存缓存与后台 `du`，默认 900 秒 TTL，返回真实 UTC `measured_at`。同路径 single-flight、有限小并发、失败冷却，不建通用队列；慢 `du` 最多 600 秒，不阻塞 HTTP，只返回 pending。
- 成功 `bytes>=0`、`measured_at` 为真实 UTC、`pending=false`、`error=null`；pending 为 `bytes=null/measured_at=null/pending=true/error=null`；错误为 `bytes=null/measured_at=null/pending=false/error=<稳定原因>`。
- 路径必须绝对、allowlist/realpath 在 `NODE_CONTAINERS_BASE` 内且含 `containers`、为目录且非 symlink；`not_found`/`invalid_path` 不测量、不返回旧缓存。Node 重启会丢缓存，TTL 内可能复用删除前样本，因此展示 `measured_at` 而不称瞬时。
- Ctrl 按 `machine_id + path` 去重，从既有已删记录只读解析 machine/path，不调用 `resolve_mount_cleanup_request` 等会 ensure/adopt/写库的路径；一机失败不挡其它机器。旧 Node 404/405 → `node_unsupported`，超时 → `node_timeout`，离线 → `node_unavailable`，缺路径/形状错 → `node_bad_response`；所有错误 `bytes=null`，不填 0。
- Web 不调用 B，也不接受浏览器任意路径；B 只保证 A 的字段来源和错误码可解释。

## Risks / Trade-offs

- **TTL 内样本可能早于删除** → 显示原始 `measured_at`，不称实时；不伪造当前时间。
- **路径在列表与统计之间被清理** → Ctrl 省略或返回 `not_found`，Web 显示不可用/已清理，不写 0。
- **统计接口慢或机器离线** → 独立请求、短超时、逐项错误、单机失败不拖累其他机器；列表仍可操作。
- **轮询放大请求** → 单页单计时器、5 秒、120 次、在途守卫和单飞（Ctrl/Node 侧）；离开/翻页/动作取消。
- **旧 Ctrl/旧 Node** → 统计不可用；详情缺字段未记录；不影响原列表、恢复、清理。牺牲自动重试，保留手动刷新。
- **每页上限 100** → 现有分页最大 100，统计不跨页；若未来页大小扩大，应先在页面层面分批或限制，不能超发 ID。
- **长宿主路径破坏布局** → 既有 `CopyChip` block + `overflow-wrap` 展示完整值，不用省略号隐藏复制源。

## Rollout / Rollback

- 无数据库迁移、无 WSS 协议变化。Web 可先于 Ctrl 上线：详情字段缺失显示“未记录”，统计 404/405 显示“统计不可用”。
- Ctrl 上线但 Node 未升级时，错误按 `node_unsupported` 展示；Node 升级后无需 Web 变更。
- 回滚 Web 即移除两个展示面与统计请求；不遗留数据或服务端状态。Ctrl/Node 接口可独立保留，且不被 Web 以外的数据迁移依赖。
- 实现后按现有 Web 测试目录做定向组件/格式化测试、`npm run build`、`openspec validate ... --strict`、`git diff --check`；本设计阶段不执行业务测试。

## Open Questions

无。权限、字段、错误码、轮询预算和兼容降级均已由上表确定；实现中若 Ctrl 契约变化，应按本附录的“未知即不可用、绝不填 0”原则更新，不引入 Web 侧新判据。

## Source references

- [src/pages/ContainerDetailPage.jsx](../../../../src/pages/ContainerDetailPage.jsx)、[src/pages/DeletedContainers.jsx](../../../../src/pages/DeletedContainers.jsx)
- [src/api/container_api.jsx](../../../../src/api/container_api.jsx)、[src/configs/backend_config.js](../../../../src/configs/backend_config.js)
- [src/components/CopyChip.jsx](../../../../src/components/CopyChip.jsx)、[src/utils/detailFormat.js](../../../../src/utils/detailFormat.js)
- [src/test/DeletedContainers.test.jsx](../../../../src/test/DeletedContainers.test.jsx)、[src/test/ContainerDetailEligibility.test.jsx](../../../../src/test/ContainerDetailEligibility.test.jsx)
- 兄弟仓同名 change（只读关联）：[Ctrl](../../../../../FuxiYu_CtrKernel/openspec/changes/archive/2026-10-20-show-mount-path-and-deleted-usage/proposal.md)、[Node](../../../../../FuxiYu_NodeKernel/openspec/changes/archive/2026-10-20-show-mount-path-and-deleted-usage/proposal.md)
