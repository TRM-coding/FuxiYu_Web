## Why

已删除容器页当前把“已清理且成功采集到用量”一律显示为“可能存在残留”，无法区分对应原容器已被恢复的情况；同时逐项 `not_found` 已表示目录不存在，却仍不限制恢复与清理入口。历史删除记录仍可能与已恢复的原容器并存，此时清理会删除活挂载、恢复会重复创建，需要收敛状态派生与操作门禁，并消除主规格中“用量不改变门禁”的冲突。

## What Changes

- 已清理且成功采集时，按列表事实 `original_container_is_valid` 三态派生状态：严格 `true` → “已恢复”；严格 `false` → “可能存在残留”；`null`、未提供或非布尔 → “已清理”。
- 当前页最新用量项稳定为 `not_found` 且 `original_container_is_valid !== true` 时，恢复与清理按钮均禁用并提示目录不存在（恢复提示“挂载目录不存在，无法恢复”，清理提示“挂载目录不存在，无需清理”）；`permission_denied`、pending、Node 不可用、批量不可用等其他结果不改变门禁。
- 列表事实 `original_container_is_valid === true` 时，即使历史删除记录仍在，恢复与清理按钮均禁用并提示已恢复（恢复提示“已恢复”，清理提示“已恢复，无法清理”）：清理保护活容器挂载，恢复避免重复恢复；该门禁独立于清理标记与用量结果，并优先于 `not_found`。
- **BREAKING**（展示语义）：旧 Ctrl 列表未提供 `original_container_is_valid` 时，已清理且成功采集的状态由“可能存在残留”改为“已清理”，作为约定的兼容降级。
- 修订 `frontend--page-deleted-containers` 中 6 条冲突需求，保留原 Requirement 与 Scenario 名称；补充 `not_found` 与原容器已恢复门禁场景（共 3 个新增场景）。

## Capabilities

### New Capabilities

<!-- 无新增能力。 -->

### Modified Capabilities

- `frontend--page-deleted-containers`: 调整已清理成功采集的状态三态、`not_found` 与原容器仍启用的恢复/清理门禁及对应冲突需求。

## Impact

- Web 已删除容器页：`DeletedContainers` 状态派生与操作列门禁；桌面表格与移动卡片共用同一结果，防止清理活容器挂载与重复恢复。
- 列表依赖：消费 Ctrl 列表事实 `original_container_is_valid`（boolean | null）；不新增 Web 请求、接口、数据库字段、Node 请求或权限门禁。字段缺失按 `null` 处理。
- 测试：状态派生单测、桌面/移动页门禁与提示、三态、旧字段缺失回退，以及原容器已恢复时清理/重复恢复禁用与优先级。
- 不在本变更范围：Ctrl/Node 字段实现、接口/数据库变更。
