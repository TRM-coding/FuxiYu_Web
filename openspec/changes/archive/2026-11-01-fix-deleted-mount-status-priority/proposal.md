# Proposal

## Why

已删除容器页当前把已清理记录的采集错误排在“已清理”之前：历史挂载路径返回 `not_found` 或 `permission_denied` 时，状态列显示“目录不存在/无权限”，覆盖了列表已确认的“已清理”生命周期事实，容易让用户误以为清理状态没有被记录。需要固定挂载状态的优先级，并明确采集列仍独立显示采集错误。

## What Changes

- 固定挂载状态派生优先级（首个命中）：无挂载 > 已清理且成功采集（含 0 B）=“可能存在残留” > 已清理 > 目录不存在/无权限 > 升级清理/mount 保留。
- 已清理记录采集到 `not_found`/`permission_denied` 时，状态列 SHALL 保持“已清理”，不再改为“目录不存在/无权限”；采集列 SHALL 继续显示既有稳定错误文案。
- 已清理且成功采集 `bytes=0` 时 SHALL 显示“可能存在残留”，采集列显示 0 B 与测量时间，不回退“已清理”。
- 无 `mount_path` 始终显示“无挂载”，不进入用量请求。
- 桌面表格与移动卡片共用同一派生结果；不改变分页、轮询、取消、恢复/清理门禁、确认流程、接口字段或权限。
- 仅调整与旧优先级冲突的规格场景和测试断言，其他行为保持不变。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `frontend--page-deleted-containers`: 修改“按用量结果派生挂载实际状态”和“移动端 Mount 复制与用量状态”中的优先级与冲突场景；采集列错误展示、无挂载不采样、用量轮询、分页与恢复/清理门禁保持不变。

## Impact

- 代码：`src/utils/mountUsage.js`（派生顺序）、`src/pages/DeletedContainers.jsx`（复用派生结果）；不新增页面或组件。
- 测试：`src/test/mountUsage.test.js`、`src/test/DeletedContainersDisplay.test.jsx`、`src/test/DeletedContainersMountUsage.test.jsx`、`src/test/DeletedContainersMobile.test.jsx` 中与已清理错误状态相关的断言。
- 接口/数据：不修改 Ctrl/Node API、数据库字段、权限、缓存、WSS 或请求体。
- 交付：本次仅产出 OpenSpec 规划产物；不修改主规格、代码，不归档、不提交。
