# Proposal

## Why

容器详情已有持久化宿主 bind 路径（`containers.bind_mount_path`），但当前详情响应与页面未展示，用户看不到也无法复制完整路径。已删除容器页目前只显示 mount 路径与清理状态，无法判断遗留目录占用；若把未测量、失败或旧接口不可用误当成 0，还会给出错误结论。

Web 需要在既有列表之上异步补充只读统计：完整展示最近记录的路径，按当前页记录查询逻辑大小与真实测量时间，并明确区分 0、测量中、失败和不可用，不新增持久化、不扩大权限、不阻塞原列表与恢复/清理流程。

## What Changes

- **容器详情**：消费既有详情响应新增的可空 `bind_mount_path`，完整展示并提供复制；`null`、空串或旧 Ctrl 缺字段只显示“未记录”，不按容器名、机器名、端口或界面状态拼猜。该值标注为最近记录，不声称实时核对，也不调用 Node 验证。
- **已删除容器用量**：现有列表成功渲染后，Web 才按当前页可测 `deleted_id` 请求 Ctrl 新增的只读统计接口。可测需 `mount_path` 非空、`deleted_id` 为正整数、`mount_cleaned !== true` 且 `cleaned_at` 为空；`mount_cleaned === true` 或 `cleaned_at` 非空均视为已清理，不请求统计并展示“已清理”。单次最多 100 个正整数 ID，不向 Ctrl 传宿主路径，不直接访问 Node；无挂载或已清理的行不请求、不扫描。
- **展示口径**：成功结果是 `du -sb` 的逻辑字节数，不是物理 blocks；显示逻辑大小和真实 `measured_at`。`bytes=0` 只在成功且有真实样本时显示为 0 B；`bytes=null` 表示 pending 或错误，绝不当 0。
- **异步与有界轮询**：列表和分页先出现，统计随后到达；仅当前页的 pending 行每 5 秒查询一次，单页最多 120 次（约 10 分钟）。success/error 即停；离开、翻页、刷新、清理、恢复时取消并丢弃旧响应；预算耗尽提示未完成并允许手动刷新。
- **竞态与清理**：翻页、刷新、清理、恢复都使旧请求/旧计时器失效；清理或恢复成功后不保留旧统计，已清理行直接显示“已清理”，不再扫描。
- **兼容与边界**：旧 Ctrl 详情缺字段按“未记录”，统计接口 404/405 或响应不可用按“统计不可用”，两处都不得影响原列表、恢复与清理。权限沿用既有 `container:manage`，不新增 machine 角色门禁或宿主路径输入。零数据库新列/表/JSON 迁移，不写已删 `disk_*`、恢复快照或清理记录，不改既有冻结/恢复/清理资格，不扩周期 WSS 或 Node→Ctrl 推送，不引入 inode/dev/PID/Docker ID 授权协议，不做全盘扫描或全局总计，不修改 `clean_mount`。
- **配套依赖**：Ctrl 提供详情字段与统计接口，Node 提供路径用量查询；Web 只消费 HTTP 结果，不在本仓实现 Ctrl/Node 任务。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `frontend--page-container-detail-page`：详情展示并复制既有宿主 bind 路径，空值/旧响应降级为“未记录”。
- `frontend--page-deleted-containers`：已删除容器按当前页异步展示逻辑用量与真实测量时间，并处理有界轮询、取消、竞态、清理失效和旧接口兼容。

## Impact

- Web 代码：`src/pages/ContainerDetailPage.jsx`、`src/pages/DeletedContainers.jsx`、`src/api/container_api.jsx`、`src/configs/backend_config.js`，以及必要的展示样式与现有测试目录中的用例。
- 外部契约：复用既有 `container:manage` 权限和既有详情请求；新增 Web→Ctrl 只读统计请求。完整请求/响应与字段语义写在 [design.md](design.md)，本仓无需读取兄弟仓文档即可实现。
- 不修改 Ctrl/Node 实现，不修改正式主规格、archive 或 Global；本阶段只产出 Web 规划文档，不实施、不测试、不提交。
- 兄弟仓同名配套 change（仅作跨仓关联，本仓契约自足）：
  - [Ctrl: show-mount-path-and-deleted-usage](../../../../FuxiYu_CtrKernel/openspec/changes/show-mount-path-and-deleted-usage/proposal.md)
  - [Node: show-mount-path-and-deleted-usage](../../../../FuxiYu_NodeKernel/openspec/changes/show-mount-path-and-deleted-usage/proposal.md)
