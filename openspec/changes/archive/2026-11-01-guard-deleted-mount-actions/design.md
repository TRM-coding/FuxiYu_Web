# Design

## Context

已删除容器页当前只按列表事实和用量结果派生挂载状态：已清理且成功采集（含 0 B）一律显示“可能存在残留”，不会区分对应原容器是否已恢复。当前页用量项为 `not_found` 时，状态会显示“目录不存在”（未清理）或“已清理”（已清理），但恢复/清理按钮仍只由 `mount_cleanup_id`、`cleaned_at`、`data_recoverable`、`snapshot` 等列表字段决定。审计补充要求：列表事实 `original_container_is_valid === true` 时，即使历史删除记录仍在，也必须禁用清理（保护活挂载）与重复恢复，并提示已恢复。

主规格中有 6 条需求把“统计结果不改变恢复/清理门禁”或“清理/恢复行为保持不变”写成硬约束，与本变更的 `not_found` 门禁及原容器已恢复门禁冲突。Web 只消费列表事实 `original_container_is_valid`，不新增请求或接口。详见 `proposal.md`。

## Goals / Non-Goals

**Goals:**

- 已清理且成功采集时，用 `original_container_is_valid` 的严格三态派生“已恢复/可能存在残留/已清理”。
- 当前页最新用量项稳定为 `not_found` 且 `original_container_is_valid !== true` 时，恢复与清理按钮禁用并提示目录不存在；其他统计结果不改变门禁。
- 列表事实 `original_container_is_valid === true` 时，即使历史删除记录仍在，恢复与清理按钮禁用并提示已恢复，保护活挂载并避免重复恢复；该门禁优先于 `not_found`。
- 修订 6 条冲突的主规格需求，保留原 Requirement 与 Scenario 名称，并补充 `not_found` 与原容器已恢复门禁场景（共 3 个新增场景）。
- 保持桌面表格与移动卡片共用同一状态派生和同一操作门禁。
- 旧 Ctrl 缺少 `original_container_is_valid` 时按 `null` 降级为“已清理”，不新增请求、不报错。

**Non-Goals:**

- 不修改 Ctrl/Node 的字段实现、接口、数据库或权限规则。
- 不新增 Web 接口请求、缓存、轮询周期或 machine 角色门禁。
- 不在本变更中修改 `src/` 或测试，不提交、不归档。
- 不改变 `permission_denied`、pending、Node 不可用、批量不可用等结果的既有门禁。
- 不重新设计已删除容器页的表格列、详情、分页或恢复内容选择流程。

## Decisions

### 1. `original_container_is_valid` 使用严格三态，只在“已清理且成功采集”分支参与

- 严格 `true` → “已恢复”。
- 严格 `false` → “可能存在残留”。
- `null`、未提供、非布尔 → “已清理”。

理由：

- 该字段表达原容器是否仍启用；只有成功采集到用量时，目录才可读，“已恢复”与“残留”的区分才有实际意义。
- 严格比较避免 `"true"`、`1` 等非布尔值被误判为已恢复。
- 缺失按 `null` 处理，旧 Ctrl 或旧记录自然回退为“已清理”，不产生未定义状态。

替代方案：

- 真值判断：会把字符串、数字误判为 `true`，否决。
- 缺失继续显示“可能存在残留”：会让旧 Ctrl 永久保留无法验证的警告，且与用户给定的“null/未提供显示已清理”冲突，否决。
- 新增恢复状态查询接口：列表已经加载原容器行，新增请求会扩大权限/性能面，否决。

优先级保持固定：

1. 无挂载
2. 已清理且成功采集且 `original_container_is_valid === true` → 已恢复
3. 已清理且成功采集且 `original_container_is_valid === false` → 可能存在残留
4. 已清理（含成功采集但字段为 `null`/缺失/非布尔）
5. 目录不存在/无权限
6. 升级清理/mount 保留

`not_found`、`permission_denied` 仍不得覆盖已清理记录的状态标签；它们只按第 2 节影响按钮门禁。

### 2. 原容器仍启用与 `not_found` 是两类门禁例外

- 列表事实 `original_container_is_valid === true` 时，即使历史删除记录仍在：
  - 恢复按钮禁用，提示“已恢复”。
  - 清理按钮禁用，提示“已恢复，无法清理”。
  - Popconfirm 不得打开，且不得发起恢复/清理写请求。
  - 该门禁独立于 `cleaned_at`、`mount_cleaned` 与用量结果，并优先于 `not_found`；即使当前样本是 `not_found`，也提示已恢复而不是目录不存在。
- 当 `original_container_is_valid !== true` 且当前页最新用量项为 `error=not_found` 时：
  - 恢复按钮禁用，提示“挂载目录不存在，无法恢复”。
  - 清理按钮禁用，提示“挂载目录不存在，无需清理”。
  - Popconfirm 不得打开，且不得发起恢复/清理写请求。
- 其他结果（成功、pending、`permission_denied`、`node_*`、`invalid_path`、批量不可用、缺项、形状非法）不改变门禁。
- 门禁跟随最新事实：`original_container_is_valid` 不再是严格 `true` 后，按 `not_found` 与既有列表字段重新计算；该项不再是 `not_found` 后按原列表字段恢复按钮状态。
- 已清理记录遇 `not_found`（且 `original_container_is_valid !== true`）时状态仍显示“已清理”，但恢复/清理按本条禁用；未清理记录状态显示“目录不存在”，同样禁用。

理由：

- `original_container_is_valid=true` 表示原容器仍活着并复用原挂载；清理会删除活容器数据，重复恢复会创建第二份容器。
- 该事实来自列表，不依赖用量成功或 `not_found`；历史删除记录残留不能成为清理/恢复的授权。
- `not_found` 是明确的目录事实；`permission_denied` 只说明读不到目录，不能证明目录不存在。
- 轮询会替换样本；永久禁用会让目录恢复后仍无法操作。

替代方案：

- 只按 `cleaned_at`/`mount_cleaned` 判断清理：历史记录可能已清理但原容器已恢复，仍会误删活挂载，否决。
- 只在 `not_found` 时禁用：原容器已恢复但目录可读时仍允许清理/重复恢复，否决。
- 所有用量错误都禁用：会把临时超时、Node 离线、无权限误判为目录不存在，否决。
- 一旦 `not_found` 永久禁用：后续样本无法恢复门禁，否决。

### 3. 状态标签与按钮门禁分离

- 已清理 + `not_found`：状态列仍显示“已清理”，采集列显示“统计不可用（目录不存在）”，按钮禁用。
- 未清理 + `not_found`：状态列显示“目录不存在”，采集列显示稳定错误文案，按钮禁用。
- 已清理 + 成功 + `original_container_is_valid=true`：状态显示“已恢复”，采集列仍显示成功大小/时间/进度；成功结果不启用按钮。
- `original_container_is_valid=true` 且当前用量非成功时：状态列仍按挂载状态派生（如“已清理”或“目录不存在”），但操作按钮禁用并提示“已恢复”；禁用提示不得写成目录不存在或可能存在残留。

理由：状态表达“记录生命周期 + 采集事实”，按钮表达“当前是否可安全执行动作”；两者不能互相替代。

### 4. Delta 只修订 6 条实际冲突的需求

修订以下主规格需求，完整保留原 Requirement 与 Scenario 名称：

- `DeletedContainers 仅按当前页请求异步用量`
- `DeletedContainers 保持旧接口兼容与原有流程`
- `DeletedContainers 表格信息层级与 Mount 复制样式`
- `DeletedContainers 移动端 Mount 复制与用量状态`
- `DeletedContainers 按用量结果派生挂载实际状态`
- `DeletedContainers 用量派生不改变恢复与清理门禁`

其中最后一条保留原 Requirement 标题以匹配主规格；正文按“默认不变，`not_found` 与原容器已恢复两个例外”解释。新增 3 个场景：`目录不存在禁用恢复与清理并提示`、`历史删除记录残留但原容器已恢复`、`原容器启用状态解除后恢复门禁`，其余原场景名保持不变。

`表格信息层级与 Mount 复制样式` 的 `旧流程` 场景把“清理和恢复行为保持不变”写成全称，并与新增字段的范围表述相邻，因此一并修订：`旧流程` 增加 `not_found` 与原容器已恢复的按钮禁用例外，正文把“本展示变更”限定为“本展示布局变更”；布局、复制和空态场景保持原样。未修改 `主流程`、移动端布局等需求：它们没有把状态列表写成排他集合，也没有把“不得改变门禁”写成全局约束。`original_container_is_valid` 作为列表事实消费，不新增 Web 请求。

### 5. 操作回调需复检当前样本与原容器事实

除按钮 `disabled` 外，恢复/清理的确认与提交路径应在动作发生时读取当前记录与 `usageById`/最新样本：若 `original_container_is_valid === true`，或 `original_container_is_valid !== true` 且当前样本为 `not_found`，则直接返回，不打开确认、不发请求。原因是样本或列表事实可能在用户打开确认框后更新，仅靠 `disabled` 无法覆盖已打开的确认框。

## Risks / Trade-offs

- [旧 Ctrl 缺少 `original_container_is_valid`，已清理成功记录从“可能存在残留”变为“已清理”] → 这是用户明确要求的兼容降级；在 proposal/design/spec 中标注，并覆盖“字段缺失/非布尔”测试，避免发布时被当作回归。
- [`not_found` 是采样结果，可能短暂误报] → 门禁只跟随当前最新样本；60 秒复查，后续非 `not_found` 结果恢复原门禁；测试覆盖样本替换。
- [原容器已恢复但历史删除记录残留] → `original_container_is_valid === true` 独立禁用清理与重复恢复，优先于 `cleaned_at`/`mount_cleaned`/用量结果；测试覆盖成功、pending、`not_found` 与其他结果。
- [`true` 与 `not_found` 同时出现时提示冲突] → 门禁优先级为 `true` > `not_found` > 既有列表字段；`true` 时统一提示已恢复，测试覆盖 `not_found` 场景。
- [`true` 变为 false/null 后仍保留旧禁用] → 门禁跟随最新列表事实重新计算；测试覆盖刷新后恢复 `not_found` 或原字段门禁。
- [确认框已打开后样本或原容器事实变化] → 操作回调复检当前记录与最新样本；测试覆盖确认与提交前复检。
- [状态标签与按钮门禁语义不一致] → 规格和设计明确“状态表达事实、按钮表达可操作性”；已恢复优先于 `not_found`，状态列仍按挂载事实派生，操作提示明确已恢复。
- [非布尔 `original_container_is_valid` 被误判] → 仅严格 `true`/`false` 参与三态，其余按 `null`/未提供处理；测试覆盖字符串、数字、缺项。

## Migration Plan

无数据库/接口迁移。Web 先发布时，旧 Ctrl 缺少字段按 `null` 显示“已清理”；Ctrl 后续提供 `original_container_is_valid` 后，页面自动按 true/false 显示“已恢复/可能存在残留”，并在 `true` 时禁用清理与重复恢复。回滚 Web 即恢复旧状态派生与门禁；不涉及数据回填或清理。

## Open Questions

无。`original_container_is_valid` 的字段来源、`not_found` 门禁范围和原容器已恢复门禁已由用户给定；本变更只定义 Web 消费与展示行为。
