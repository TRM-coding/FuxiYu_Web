# Proposal

## Why

`frontend--authentication`、`frontend--page-login`、`frontend--page-register`、`frontend--page-rbac-matrix` 四个 capability 的主规格已经存在，共 40 个 Scenario；但这次 Anvil 变更还没有可审查的 Scenario→Test/check 对账，`frontend--page-rbac-matrix` 的主侧车也缺失。原执行者在开始写入前因执行额度终止，本变更沿用原 change 目录补齐规划，供独立 review 和后续 apply 使用，不新建重复 change。

## What Changes

- 为上述 4 个 capability 的 40 个 Scenario 建立 Requirement→Scenario→Test/check→Assertion scope 对账，共 40 个 Scenario 条目。
- 每个 delta 以 `MODIFIED Requirements` 完整、逐字重述主规格原有 Requirement 块；Requirement 名、Scenario 名与 WHEN/THEN 业务语义零变化，不新增、删除或弱化业务要求。
- 已从测试代码核对断言并确认映射的条目标 `[X]`；未覆盖的 15 个测试（16 条 `[ ]` 映射）规划到专属 `src/test/AnvilAuthPages.test.jsx` 与隔离的 `src/test/AnvilAuthContainerDetail.test.jsx`（仅真实详情页组合），本阶段不创建这些文件。
- 构建归属类 Scenario 复用既有 `npm run build`，只声明退出码与 `dist` 生成；页面/`ModelViewer` 独立 chunk 与入口未包含其源码作为 `dist/assets` 人工核对，不新增静态文案或配置机械测试。
- 主规格、主侧车、review、tasks、测试文件、业务源码、构建配置、CI、skills、数据库、commit 与 SSH 均不改动；侧车待官方 main-spec sync 成功后由 `anvil-test-plan` 维护。
- 不处理与本轮测试对账无关的功能缺陷；若对账发现实现与规格不符，只报告，不扩张需求。

## Capabilities

### New Capabilities

<!-- 无新增 capability。 -->

### Modified Capabilities

- `frontend--authentication`: 仅补齐测试对账（4 个 Requirement、13 个 Scenario），Requirement 语义不变。
- `frontend--page-login`: 仅补齐测试对账（5 个 Requirement、9 个 Scenario），Requirement 语义不变。
- `frontend--page-register`: 仅补齐测试对账（6 个 Requirement、11 个 Scenario），Requirement 语义不变。
- `frontend--page-rbac-matrix`: 仅补齐测试对账（3 个 Requirement、7 个 Scenario），Requirement 语义不变。

## Impact

- 规格：仅新增本 change 下的 `proposal.md`、4 份 `specs/frontend--*/spec.md`、`design.md`、`test-plan.md`。本轮不改 `openspec/specs/**` 及其侧车。
- 代码：规划阶段零改动；后续 apply 只新增 `src/test/AnvilAuthPages.test.jsx` 与 `src/test/AnvilAuthContainerDetail.test.jsx`，不改既有测试文件、页面实现、路由或构建配置。
- 并行边界：不触碰同期 Web basic-page change 与其 `src/test/AnvilBasicPages.test.jsx`，也不触碰 detail-credential 批次的测试与组件；认证详情页组合使用独立新文件。
- 配置与运维：不改默认 schema、`openspec/config.yaml`、`vite.config.js`、skills、CI 或 Git hooks；不读取 `.env`/APIKEY/PASSCODE；不 SSH、不接触生产、不 commit、不 push。
