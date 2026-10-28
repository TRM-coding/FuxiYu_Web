# Design

## Context

本 change 位于 `E:\AI\Fuxi\FuxiYu_Web`，OpenSpec root 由 CLI 解析为仓库本地 `E:\AI\Fuxi\FuxiYu_Web`，change schema 为 `anvil`。三个目标 capability 的基线是 `275611d`，主规格规模为 `frontend--build` 12 个 Requirement / 24 个 Scenario、`frontend--production-server` 14 / 28、`procedure--repository-workflow` 18 / 36，合计 44 / 88。现有测试分布在 Vitest（`src/test/**`）、Node 内置 test runner（`scripts/tests/*.integration.mjs`）、Python unittest（`scripts/ci/tests/test_check_pr.py`）与 bash hooks（`githooks/**`）；`frontend--build` 的既有侧车是历史台账，不能作为本轮断言依据，另外两个 capability 没有侧车。

这是一次 mapping-only 规划：原尝试 `e6cedd44` 明确以 `quota_exceeded` 终止且无产物，本轮官方 fallback 只补齐 proposal、specs、design、test-plan。apply、tasks、review、主规格 sync、侧车和 commit 都不在本阶段。

## Goals / Non-Goals

**Goals:**

- 对 88 个 Scenario 建立逐条可审阅的测试映射，并覆盖各 Requirement 正文中未被 Scenario THEN 完全表达的限制。
- 只把从真实测试代码读出的断言标为 `[X]`；把真实缺口标为 `[ ]`，并在专属新测试文件中给出具名 locator。
- 对流程规则使用真实、可复现、范围明确的 manual check，不用机械文本测试冒充业务断言。
- 保持 delta 为按行尾归一化后逐行一致的 no-op，确保后续 sync 不会污染主规格。
- 将所有真实矛盾、不可自动化项和残余风险显式留给 fresh review 与父代理。

**Non-Goals:**

- 不创建或修改测试代码、页面代码、共享 fixture、`package.json`、CI、hooks、配置、数据库或依赖。
- 不写 `review.md`、`tasks.md`，不执行 apply、verify、sync、archive、commit 或 push。
- 不运行 PM2、不连接生产 SSH、不升级 Node、不读取 secrets、不修改默认 schema。
- 不修复本规划发现的 README 或 OpenSpec 工具链矛盾，不擅自决定业务待决项。

## Decisions

### D1. Delta 按行尾归一化保持 `MODIFIED` no-op

每份 delta 仅包含 `## MODIFIED Requirements` 与主规格完整的 `### Requirement:` 到全部 Scenario 块，不添加 Purpose、背景说明、测试字段或任何新 Scenario。这样既满足 anvil 对 delta 结构的要求，也避免把「本轮只做映射」之类说明写进主规格。

验证方式不依赖人工目测：从主规格按 Requirement 边界抽取 block，先归一化行尾（CRLF/LF）再逐行比较；当前 procedure delta 与主规格的原始 EOL 不同，但内容逐行一致，不把行尾差异当作业务差异。再运行 `openspec validate --strict` 检查结构。比较只在规划阶段执行，不写入运行台账。

### D2. `[X]` 与 `[ ]` 的证据语义

- `[X]` 只用于已存在的测试或精确命令，并且 locator 的测试代码确实包含能在 Assertion scope 中复述的断言。
- `[ ]` 用于尚未创建的具名测试、尚未确认的映射或必须人工执行的检查；不把 `[ ]` 写成 pass/fail 状态。
- 一个 Scenario 可以由多行共同覆盖；Assertion scope 只写这些行真正断言的内容，THEN 中仍有缺口时在 Coverage note 明说，不缩小 THEN、不把「测试名包含关键词」当成覆盖。
- 不添加 Execution Evidence、时间戳、通过数、失败数或「已通过」之类的运行台账。

### D3. 新测试文件与真实行为边界

自动化缺口集中到 `scripts/tests/anvil-delivery.checks.mjs`，本阶段只登记 locator，不创建文件。计划中的测试使用 Node 内置 `node:test`，复用 `scripts/tests/support/harness.mjs` 的临时目录、证书、mock Ctrl 与 loopback 请求工具；对生产入口、构建产物、Git hooks 与 Python PR checker 都执行真实子进程或真实模块，不用反射、源码字符串匹配或 mock 调用次数伪造行为。Ctrl 是唯一的外部服务替身；文件系统、HTTP、TLS、构建、hooks 与 checker 都走真实实现。渲染抛错测试只注入一个会抛错的子组件作为故障源，不替换 `ModelStageBoundary` 的隔离逻辑，也不伪造成功路径。

具体覆盖方式：

- 构建族：使用 Vite 的 `resolveConfig` / `build` 真实解析仓库 `vite.config.js`，从 `generateBundle` 读取实际 chunk 的 module id；合成超大模块只用于触发默认体积告警。chunk 归属以产物 module id 为准，不以「build 退出 0」代替。
- 生产入口族：日志、readDist、代理失败/abort/stream 使用 `main({ root: tempRoot, readEnvFile: false })` 或既有 `startEntry` 夹具的真实模块，临时证书使用 `ensureCert` 的 temp root；只有外部 cwd/CLI 行为用 spawn（经 `run-cli` 壳省略 root，让 `main` 使用默认 `PROJECT_ROOT`，只传安全 env，不读取仓库 `.env`）。所有服务使用临时端口与临时 `dist`/`certs`，不碰 PM2 与生产。
- 流程族：在独立临时 `GIT_DIR`/`GIT_INDEX_FILE` 或临时空仓库上执行真实 `githooks/pre-commit`、`githooks/commit-msg`，用已有 HEAD blob 或临时 `git hash-object` 构造 A/M/R/archive 场景；不写真实对象库、不 commit/reset/clean。PR 正文用真实 Python CLI 读取 event JSON，并用带 shell 注入载荷的正文验证其只当数据处理。
- 工作流族：读取 `.github/workflows/pr-format.yml` 与 `web-tests.yml` 的真实配置，核对 `edited` 触发、基准分支 checker、bootstrap 摘要与 Node 矩阵；不声称已远程运行 GitHub Actions。

### D4. 流程规则用 manual check，不造规则文本测试

以下对象没有稳定的自动化断言，或自动化会变成对规则文本的自证：提交条目是否自足、PR 标题是否准确、PM2 托管、只安装运行依赖、构建失败后的重启决策、跨仓库独立执行、QUESTIONS 证据分级、规范完整性、AGENT 文件清理。这些条目在 test-plan 中使用精确命令或明确步骤的 manual check，Assertion scope 写清人工判据与范围；不新增一个只匹配关键词的测试文件。`Generated with`/生成图标不属于此 manual 列表，已并入 `test_anvil_commit_msg_new_fix_combo_and_attribution` 的真实 hook 自动拒绝断言。

### D5. 既定矛盾与不修项

- `README.md` 第 62-73 行仍指导用户手工设置 `NODE_OPTIONS=--no-experimental-webstorage`，而 `frontend--build` 的 Requirement 要求所有测试入口自动注入且 `MUST NOT` 要求用户手工设置。实现 helper 已存在，但 README 与规格冲突；本 change 只报告，不改 README，也不弱化规格。
- `openspec new change` 默认为新 change 生成 `README.md`，而 `procedure--repository-workflow` 的「规格入口」要求 `openspec/` 内没有 README。该工具链冲突报告父代理；本 change 删除自己的 scaffold README，避免把冲突带进评审，不修改官方工具或主规格。
- 现有 `test_check_pr.py` 中有一条通过扫描 checker 源码字符串证明「不求值/不调用 shell」的测试。本计划不把该测试当作行为证据，改用真实 event JSON 注入载荷验证无副作用；也不修改既有测试。
- `frontend--build` 的「依赖方向」只要求以产物为据陈述，不要求一个固定的无环图。本计划只验证 chunk import 边来自产物，不把「单向无环」写成事实。

### D6. 新测试文件的接入边界

`package.json` 与 CI 在本 change 中冻结，因此 `scripts/tests/anvil-delivery.checks.mjs` 不加入 `npm test` / `test:server` 的自动收集（`run-integration.mjs` 只收 `*.integration.mjs`）。文件刻意使用 `.checks.mjs` 后缀，既不匹配 Vitest 默认的 `*.test.mjs` 收集，也不匹配 `test:server` 的 `*.integration.mjs`。test-plan 顶部已写明手动执行命令 `node --test scripts/tests/anvil-delivery.checks.mjs`，并注明不接入 npm/CI、不作为门禁；该文件尚未创建，locator 保持 `[ ]`，不声称已运行或已通过。是否改文件名或接入统一入口属于父代理决策，不在本阶段擅自修改配置。这个限制会作为风险保留。

## Risks / Trade-offs

- [新测试未接入统一入口] → 直接执行命令已写进 test-plan；父代理可在 apply 后决定是否调整命名或入口，但不属于本 change 的授权范围。
- [manual check 依赖评审纪律] → Assertion scope 写明命令、判据与范围；不把 manual check 伪装成自动化测试。
- [既有测试只覆盖 THEN 的一部分] → 在 Coverage note 明确缺失部分，并用 `[ ]` 新测试或 manual check 补充；不因标题相近就标 `[X]`。
- [构建告警/体积是观测值] → 测试只断言默认阈值与告警机制，不把当前 chunk 体积或警告清单固化成规格指标。
- [生产测试可能受端口/时序影响] → 使用临时目录、端口 0、loopback、显式等待与清理；不依赖生产 PM2 或外部网络。
- [README 与 OpenSpec scaffold 的矛盾] → 只报告，不在本 change 修改应用文档或工具链；删除本 change 自己的 scaffold README，避免污染评审范围。
- [部分真实行为缺口可能无法用单一新测试完全覆盖] → 在 Coverage note 明说，例如渲染抛错故障注入、PM2 实际托管、只装运行依赖、构建失败重启；不用伪造测试或弱化规格来消除缺口。
