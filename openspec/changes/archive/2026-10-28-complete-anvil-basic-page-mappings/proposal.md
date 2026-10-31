# Proposal

## Why

`frontend--page-admin-profile`、`frontend--page-apply`、`frontend--page-user`、`frontend--page-announcements` 四个 capability 的主规格已经存在，但 `openspec/specs/<capability>/test-plan.md` 侧车缺失，Anvil 测试对账无法闭合：既有 Requirement/Scenario 与仓库内真实测试之间没有可审查的映射台账。本轮为 Web 第 1 批，只补测试对账与缺口规划。

## What Changes

- 为上述 4 个 capability 补齐 scenario→test 对账规划，共 13 个 Scenario。
- 每个 delta 以 `MODIFIED Requirements` 形式完整重述主规格中原有的 Requirement 块，Scenario 名称与 THEN 业务语义保持零变化；本轮不新增、不删除、不弱化任何业务要求。
- 明确这是「已有规格的测试对账」，不是功能改造：主规格 `openspec/specs/` 与 `src/` 代码本轮都不动。
- 对已确证的既有断言标注 `[X]`；新规划或未确认的映射标注 `[ ]`，并规划到专属新测试文件 `src/test/AnvilBasicPages.test.jsx`，避免改动既有测试文件造成与他批次的交错。
- 构建归属类 Scenario 复用既有精确构建检查（`npm run build`），不新增静态文案类机械测试。
- 不处理先前登记的「公告转模板去重」缺陷，也不顺手实现；若对账中发现实现与规格不符，只报告，不扩张需求。

## Capabilities

### New Capabilities

<!-- 无新增 capability。 -->

### Modified Capabilities

- `frontend--page-admin-profile`: 仅补齐测试对账（3 个既有 Scenario 映射到既有/新规划测试），Requirement 语义不变。
- `frontend--page-apply`: 仅补齐测试对账（3 个既有 Scenario 映射到既有/新规划测试），Requirement 语义不变。
- `frontend--page-user`: 仅补齐测试对账（3 个既有 Scenario 映射到既有/新规划测试），Requirement 语义不变。
- `frontend--page-announcements`: 仅补齐测试对账（4 个既有 Scenario 映射到既有/新规划测试），Requirement 语义不变。

## Impact

- 规格：仅新增 `openspec/changes/complete-anvil-basic-page-mappings/` 下的 proposal、4 个 delta spec、design、test-plan；主规格与侧车在本轮均不写入（侧车待官方 sync 成功后由 `anvil-test-plan` 维护）。
- 代码：规划阶段零改动；后续 apply 仅新增 `src/test/AnvilBasicPages.test.jsx`，不改既有测试文件与页面实现。
- 构建/依赖/配置：不改默认 schema、`openspec/config.yaml`、`vite.config.js`、skills、CI 或 Git hooks。
- 未触碰：`.env`、任何 APIKEY/PASSCODE 文件、SSH 与生产环境；本轮不 commit、不 push。
