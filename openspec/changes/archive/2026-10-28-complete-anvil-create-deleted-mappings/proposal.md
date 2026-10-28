# Proposal

## Why

`frontend--page-create-container`、`frontend--page-create-image`、`frontend--page-deleted-containers` 三个 capability 的主规格已经存在，共 86 个 Scenario；但这次 Anvil 变更还没有可审查的 Scenario→Test/check 对账。原执行者 `e3075c5a` 在开始写入前已明确 `quota_exceeded` 终态，本 change 由官方 fallback 独占补齐规划，供独立 fresh review 和后续 apply 使用，不沿用未落盘的判断，也不新建重复 change。

## What Changes

- 为上述 3 个 capability 的 86 个 Scenario 建立中文 canonical 的 Requirement→Scenario→Test/check→Assertion scope 对账：create-container 21 个、create-image 15 个、deleted-containers 50 个。
- 每个 delta 以 `MODIFIED Requirements` 完整、逐字重述主规格原有 Requirement 块；Requirement 名、Scenario 名、WHEN/THEN 与正文约束零变化，不新增、删除或弱化业务要求。
- 从真实测试代码逐段核对断言并确认映射的条目标 `[X]`；真实缺口标 `[ ]`，集中规划到专属 `src/test/AnvilCreateDeleted.test.jsx`。规划共 209 个 locator 行（207 个 `[X]`、2 个 `[ ]`），对应该文件中的 44 个 planned test：42 个已实现，2 个长期超限 locator 是 Global Q83 已知缺口（已登记 e9aef7c），最终测试文件不包含这两个函数；保持 `[ ]`，不以 skip/xfail 或弱化断言处理。
- deleted-containers 的逻辑用量只在成功样本上按记录中的对应机器比较上限显示进度；pending、error、缺项、已清理、无挂载等状态沿用既有展示，不新增接口字段、数据库字段、Node 请求、缓存或权限门禁。
- 主规格、主侧车、review、tasks、测试文件、共享 fixture、业务源码、依赖、配置、CI、skills、数据库、commit 与 SSH 均不改动；侧车待官方 main-spec sync 成功后由 `anvil-test-plan` 维护。
- 若对账发现实现与规格不符，只报告父代理，不扩张需求、不修改应用、不弱化规格。

## Capabilities

### New Capabilities

<!-- 无新增 capability。 -->

### Modified Capabilities

- `frontend--page-create-container`: 仅补齐测试对账（7 个 Requirement、21 个 Scenario），Requirement 语义不变。
- `frontend--page-create-image`: 仅补齐测试对账（9 个 Requirement、15 个 Scenario），Requirement 语义不变。
- `frontend--page-deleted-containers`: 仅补齐测试对账（15 个 Requirement、50 个 Scenario），Requirement 语义不变。

## Impact

- 规格：仅新增本 change 下的 `proposal.md`、3 份 `specs/frontend--*/spec.md`、`design.md`、`test-plan.md`。本轮不改 `openspec/specs/**` 及其侧车。
- 代码：规划阶段零改动；后续 apply 只新增 `src/test/AnvilCreateDeleted.test.jsx`，不改既有测试文件、页面实现、路由或构建配置。
- 并行边界：不触碰同期 Web auth/detail/basic-page changes，也不触碰其他批次的测试文件或 `src/test/AnvilBasicPages.test.jsx`。
- 配置与运维：不改默认 schema、`openspec/config.yaml`、`vite.config.js`、skills、CI 或 Git hooks；不读取 `.env`/APIKEY/PASSCODE；不 SSH、不接触生产、不 commit、不 push。
