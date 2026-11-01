# Proposal

## Why

`frontend--page-container-detail-page` 与 `frontend--container-credentials` 的 103 个既有 Scenario 还缺一份可独立复核的 Anvil 场景到测试映射；旧尝试 `1be2f7ba` 以 `quota_exceeded` 终止且未留下规划产物。本 change 只补齐映射规划，不改业务行为，避免把测试说明写进主规格。

## What Changes

- 以 MODIFIED no-op delta 逐字保留两个既有 capability 的全部 15 + 10 个 Requirement 与 67 + 36 个 Scenario，不改变任何 SHALL/MUST 或已定业务决策。
- 新建 change 级 `test-plan.md`，按 capability / Requirement / Scenario 映射真实既有测试断言；对确无断言的缺口，在 `src/test/AnvilDetailCredentials.test.jsx` 规划 `[ ]` 回归。
- 缺少有效 `user_id`、确认前状态变化两项已有规格要求“显示原因/警告、无请求、无密码”，当前实现静默。用户已决定“先记录缺陷，继续其他测试”：本轮仅记录，暂缓两项业务修复及依赖回归，两个定位保持 `[ ]`；其余 21 个独立测试在复审通过后实施。本计划共 23 个唯一定位：21 个独立测试 + 2 个暂缓 reset 定位（Global QUESTIONS.md Q76）。
- 不修改主规格、sidecar、review、tasks、业务源码、共享 fixture、配置或任何其他 active change。
- 明确区分 Web 可验证行为与 Ctrl/Node 跨仓职责；静态源码字符串或反射不作为行为证据。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- `frontend--page-container-detail-page`: 逐字保留现有 15 个 Requirement / 67 个 Scenario，仅补测试映射依据（no-op delta）。
- `frontend--container-credentials`: 逐字保留现有 10 个 Requirement / 36 个 Scenario，仅补测试映射依据（no-op delta）。

## Impact

- 规划产物：`proposal.md`、`design.md`、两份 delta spec、`test-plan.md`。
- 后续缺测落点：`src/test/AnvilDetailCredentials.test.jsx`；不改 API、UI、数据库、配置或 CI。
- 两项 reset 原因缺失仍是未解决缺陷（Global QUESTIONS.md Q76），不应用外部修正草案，不以 skip/xfail、改规格或勾选映射掩盖；本批其他测试完成也不代表这两项已覆盖。
- 现有测试框架为 Vitest + Testing Library；新增测试只 mock 外部边界，使用真实页面与真实 `container_api`。
