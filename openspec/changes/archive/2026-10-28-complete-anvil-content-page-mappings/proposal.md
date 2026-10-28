# Proposal

## Why

Web 的三个内容页 capability（公告编辑、模板管理、Markdown 使用指南）已有主规格和部分回归测试，但主规格 Scenario 与真实测试断言之间的对账仍不完整：入口装配、保存草稿后的 draft_id 延续、清空模板后保存、模板变化后的草稿恢复、含占位符的模板变量替换、机器切换后的实际容器选择、错误弹窗的真实中文呈现、Docs 路由装配，以及分页计数、CSS 媒体块/像素和构建产物的证据范围都缺少可核对的断言。本 change 只补齐测试映射和缺口测试计划，不改业务行为。

## What Changes

- 对 `frontend--page-announcement-editor` 的 8 个 Requirement / 20 个 Scenario 逐条建立现有测试或缺口映射。
- 对 `frontend--page-template-manager` 的 5 个 Requirement / 9 个 Scenario 逐条建立映射。
- 对 `frontend--page-docs` 的 7 个 Requirement / 22 个 Scenario 逐条建立映射。
- 缺口统一规划到 `src/test/AnvilContentPages.test.jsx`；本阶段不创建该文件，不修改既有测试。
- 对既有 `[X]` 只保留测试代码真实断言到的范围；分页数量、卸载错误过滤、CSS 媒体块/像素、dist 正文消费等未覆盖部分写入 Coverage note 或新 planned 测试，不以旧 fixture 或源码读取冒充运行时覆盖。
- Delta 以原完整 Requirement 逐字 MODIFIED 重述（no-op），不新增、删除或改写 Requirement/Scenario，也不把测试说明写进主规格。

## Capabilities

### New Capabilities

<!-- 无新增 capability。 -->

### Modified Capabilities

- `frontend--page-announcement-editor`: 仅补测试对账，Requirement 语义不变。
- `frontend--page-template-manager`: 仅补测试对账，Requirement 语义不变。
- `frontend--page-docs`: 仅补测试对账，Requirement 语义不变。

## Impact

- 变更范围仅限 `openspec/changes/complete-anvil-content-page-mappings/` 下的 proposal、design、delta specs 和 test-plan。
- 计划测试落在 `src/test/AnvilContentPages.test.jsx`，由后续 apply 阶段创建；本阶段不触碰 `src/**`、既有测试、共享 fixture、主规格、sidecar、配置、依赖、数据库、CI、skills 或 secrets。
- 不改变默认 schema、生产代码、后端契约和部署行为。
