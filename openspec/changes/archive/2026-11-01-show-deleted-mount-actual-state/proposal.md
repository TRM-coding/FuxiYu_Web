# Proposal

## Why

已删除容器页当前只按列表中的清理标记展示“已清理”或“mount 保留”，没有把已有的按路径用量结果用于判断目录的实际状态。用户因此看不到清理后目录是否仍存在、是否因权限无法读取；同时已清理记录被排除在用量请求之外，即使历史路径仍在也无法发现潜在残留。

## What Changes

- 已删除容器页 SHALL 复用现有按路径用量结果派生挂载实际状态，而不是新增接口、Node 请求或持久化字段。
- `not_found` 显示“目录不存在”，`permission_denied` 显示“无权限”。
- 已清理记录保留历史 `mount_path` 时 SHALL 继续参与当前页用量请求；路径成功采集到用量时显示“可能存在残留”。
- `pending`、其他失败原因（包括 Node 不可用）MUST NOT 被误称为“目录不存在”或“可能存在残留”，继续按列表事实显示“已清理”或“mount 保留”。
- 无 `mount_path` 的记录仍显示“无挂载”，且不进入用量请求。
- 恢复、清理的权限判断与按钮门禁保持不变；桌面表格与移动卡片继续复用同一列定义和异步用量逻辑。
- 更新与新状态语义冲突的过时测试。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `frontend--page-deleted-containers`：调整用量可选记录范围与挂载实际状态展示；保持分页、轮询取消、恢复/清理门禁和移动端布局不变。

## Impact

- 代码：`src/pages/DeletedContainers.jsx`、`src/utils/mountUsage.js`；必要时仅补充样式。
- 测试：`src/test/mountUsage.test.js`、`src/test/DeletedContainersMountUsage.test.jsx`、`src/test/DeletedContainersDisplay.test.jsx`、`src/test/DeletedContainersMobile.test.jsx`、`src/test/AnvilCreateDeleted.test.jsx` 中与已清理记录不采样或旧错误文案相关的断言。
- 接口与数据：不新增或修改 Ctrl/Node API、数据库字段、权限、缓存或 WSS；请求体仍只包含当前页的 `deleted_ids`。
- 交付：只写 Web 仓库，不归档、不提交，不触碰其他未提交工作。
