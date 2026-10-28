# Proposal

## Why

`frontend--build`、`frontend--production-server` 与 `procedure--repository-workflow` 的主规格已经存在，合计 44 个 Requirement、88 个 Scenario；但 `frontend--build` 的既有侧车仍是历史「待复核」台账，另外两个 capability 没有可审阅的测试映射。原规划尝试 `e6cedd44` 以明确 `quota_exceeded` 终止且没有留下 proposal、specs、design 或 test-plan，无法证明这 88 个 Scenario 已被逐条核对。本 change 由官方 fallback 独占补齐规划，供独立 fresh review 通过后再进入 apply。

## What Changes

- 为 3 个既有 capability 建立中文 canonical 的 `Requirement → Scenario → Test/check → Assertion scope → 可选 Coverage note` 测试映射，共 44 个 Requirement、88 个 Scenario。
- 每个 delta 以 `MODIFIED Requirements` 完整复制主规格 Requirement 块；按行尾归一化（CRLF/LF）后逐行一致，Requirement 名、Scenario 名、WHEN/THEN 与正文约束零变化，本 change 不新增、不删除、不弱化任何业务要求，也不向主规格插入说明性内容。
- 从真实测试代码逐条核对既有断言：只有 locator 存在且断言能支撑该 Scenario THEN 时才标 `[X]`；真实缺口标 `[ ]`，自动化缺口集中到专属新测试文件 `scripts/tests/anvil-delivery.checks.mjs`，本阶段不创建该文件。
- 对没有自动化对象可映射的提交语义、PR 标题、PM2、只装运行依赖、构建失败重启等流程规则，使用可复现的 manual check 并写明范围；不制造机械规则文本测试，不伪造运行证据。
- 真实实现类缺口和规格/文档矛盾只写入 planning 并报告父代理；不改应用、既有测试、共享 fixture、主规格、侧车、依赖、数据库、配置、CI、hooks 或 skills。

## Capabilities

### New Capabilities

<!-- 无新增 capability。 -->

### Modified Capabilities

- `frontend--build`: 12 个 Requirement、24 个 Scenario；仅补齐测试映射，Requirement 语义不变。
- `frontend--production-server`: 14 个 Requirement、28 个 Scenario；仅补齐测试映射，Requirement 语义不变。
- `procedure--repository-workflow`: 18 个 Requirement、36 个 Scenario；仅补齐测试映射，Requirement 语义不变。

## Impact

- 规格：仅新增本 change 下的 `proposal.md`、3 份 delta `specs/**/spec.md`、`design.md` 与 `test-plan.md`；不修改 `openspec/specs/**` 及其侧车。
- 代码与测试：规划阶段零代码改动；后续 apply 只新增 `scripts/tests/anvil-delivery.checks.mjs`，不改既有测试、页面实现、`vite.config.js`、`package.json` 或 CI。
- 运行边界：只使用临时本地目录、临时端口、既有构建产物与外部 Ctrl mock；不运行 PM2、不连接生产 SSH、不升级 Node、不改配置、不读写 secrets。
- 交付边界：作者不写 `review.md`、`tasks.md`、测试或主规格，不执行 apply、sync、archive、commit 或 push；独立 review 与最终 commit 由父代理负责。
