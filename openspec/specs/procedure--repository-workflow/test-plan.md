# procedure--repository-workflow Test Plan

Spec: [spec.md](spec.md)

## Current Mapping

### Requirement: 提交信息采用真实变更条目

#### Scenario: 多项变更

- Test/check:
  - [X] scripts/tests/commit-message.integration.mjs::accepts NEW
  - [X] scripts/tests/commit-message.integration.mjs::accepts AMEND
  - [X] scripts/tests/commit-message.integration.mjs::accepts FIX
  - [X] scripts/tests/commit-message.integration.mjs::accepts SPEC
  - [X] scripts/tests/commit-message.integration.mjs::accepts TEST
  - [X] scripts/tests/commit-message.integration.mjs::mixed entries keep comments and attribution rules
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_commit_msg_new_fix_combo_and_attribution
- Assertion scope: 既有 `accepts NEW/AMEND/FIX/SPEC/TEST` 逐个断言五类关键字在 LF、CRLF、无终止换行三种消息下均被真实钩子接受；`mixed entries keep comments and attribution rules` 已断言 SPEC+TEST 两行混合条目并跳过注释；新测试只补一条真实消息文件，含 `- NEW ...` 与 `- FIX ...` 两行，断言退出 0，并在同一临时 Git 仓库/真实 hook 中对 `Generated with` 与生成图标输入断言退出 1。钩子只校验格式/关键字，不判断两条内容是否真实。
- Coverage note: 现有 8 个 commit-message 测试没有 NEW+FIX 组合样例，也没有 `Generated with`/robot 拒绝断言；这两个真实自动边界合并进同一条新测试，不额外增加测试数量；内容真实性由人工评审。

#### Scenario: 错误关键字

- Test/check:
  - [X] scripts/tests/commit-message.integration.mjs::rejects unknown keywords and malformed entries
- Assertion scope: 既有测试用 `DOCS`、`DEBUG`、小写 `spec`、`-SPEC` 缺少空格、`- TEST` 缺少短句和仅注释/空行消息，断言真实钩子退出 1，stderr 列出 `SPEC`/`TEST` 的允许关键字提示。不再重复规划关键字白名单新测试。
- Coverage note: 只断言关键字白名单与格式；中文表达和条目自足不在钩子能力内。

#### Scenario: 脱离上下文不可读

- Test/check:
  - [ ] bash githooks/commit-msg <message-file>
- Assertion scope: 人工在临时消息文件中只写 `- FIX 更新若干文件`，真实钩子应放行（格式合法）；随后由人工评审按“不能脱离上下文独立理解”要求改写。该检查不新增自动语义测试，也不把钩子放行当成内容合格。
- Coverage note: 该 Scenario 的 THEN 是评审拒绝，不是钩子拒绝；现有 8 个测试不判断空泛度，故保留 manual 检查。

### Requirement: 禁止工具署名与空提交信息

#### Scenario: 只有注释或空行

- Test/check:
  - [X] scripts/tests/commit-message.integration.mjs::rejects unknown keywords and malformed entries
- Assertion scope: 既有测试的 `\n# 只有注释\n` 子例让真实钩子退出 1，并断言 stderr 命中「不符合条目格式|至少需要一条实际变更」；空行和注释不计条目。测试使用临时 git 仓库和真实 bash hook，不模拟钩子内部函数。
- Coverage note: 纯空行与注释行走同一 `items=0` 分支；既有测试以注释+空行样例覆盖该分支，不再重复规划新测试。

#### Scenario: 末行没有换行

- Test/check:
  - [X] scripts/tests/commit-message.integration.mjs::rejects unknown keywords and malformed entries
  - [X] scripts/tests/commit-message.integration.mjs::accepts NEW
  - [X] scripts/tests/commit-message.integration.mjs::mixed entries keep comments and attribution rules
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_commit_msg_new_fix_combo_and_attribution
- Assertion scope: `rejects unknown keywords and malformed entries` 中非法关键字和格式样例没有终止换行，断言非法末行仍退出 1；其中仅注释样例带终止换行，不用于证明无终止换行行为。`accepts NEW` 的 `\n`/`\r\n`/无终止换行三种 ending 断言合法条目均可读；`mixed entries keep comments and attribution rules` 断言 SPEC/TEST 条目夹注释仍通过、`Co-authored-by` 被拒；同一新测试 `test_anvil_commit_msg_new_fix_combo_and_attribution` 在真实临时 Git 仓库/真实 hook 中对 `Generated with` 与生成图标输入断言退出 1。
- Coverage note: 现有 8 个测试只覆盖 `Co-authored-by`；`Generated with`/robot 不降为 manual，已纳入上述组合+attribution 新测试的自动拒绝断言，测试数量仍为 19。

### Requirement: 合并提交使用 Git 默认信息

#### Scenario: 真实合并

- Test/check:
  - [X] scripts/tests/commit-message.integration.mjs::real merge state remains exempt
- Assertion scope: 既有测试在临时 git 仓库先写普通 `Merge branch example` 消息，断言真实钩子退出 1；随后写入 `.git/MERGE_HEAD`，同一消息退出 0。断言豁免依据真实 Git 状态而非消息文字，不创建 merge/commit。
- Coverage note: 现有测试已覆盖该 Scenario，删除原先规划的临时 MERGE_HEAD 新测试；不重复实现同一证据。

### Requirement: 钩子随仓库交付并显式启用

#### Scenario: 新克隆启用

- Test/check:
  - [X] git config --local core.hooksPath
  - [X] git ls-files -s -- githooks/pre-commit githooks/commit-msg
- Assertion scope: 当前仓库 `core.hooksPath` 为 `githooks`，两个钩子由仓库跟踪；无需复制到 `.git/hooks`。实际新克隆不在本机执行，故以配置与入库文件核对替代。
- Coverage note: 没有真实新克隆；不声称已验证所有克隆环境。钩子可执行性由下一 Requirement 的 mode 检查与 hook-run 测试覆盖。

#### Scenario: 已有自定义钩子

- Test/check:
  - [ ] Get-ChildItem .git/hooks -File | Where-Object { $_.Name -notlike '*.sample' }
- Assertion scope: 列出 `.git/hooks` 非 sample 钩子；若存在需保留的入口，必须在切换 hooksPath 前确认迁移方式，不能直接用 `githooks` 替换掉。当前仓库的 hooksPath 已指向 `githooks`，该检查用于新克隆/迁移评审。
- Coverage note: 这是人工流程检查，不自动修改 hooksPath，也不覆盖既有自定义钩子。

### Requirement: shell 钩子保持 LF 与 Git 100755

#### Scenario: 核对入库元数据

- Test/check:
  - [X] git ls-files -s -- githooks/pre-commit githooks/commit-msg
  - [X] git check-attr text eol -- githooks/pre-commit githooks/commit-msg
- Assertion scope: 两个钩子的 Git mode 都是 100755；`git check-attr` 显示 `text: set`、`eol: lf`，`.gitattributes` 的 `githooks/* text eol=lf` 生效。
- Coverage note: `.gitattributes` 覆盖无扩展名的 `githooks/` 文件；未额外枚举所有可能新增的钩子名。Windows 上的 `git add --chmod=+x` 是交付步骤，检查只验证最终 mode/LF，不自动执行 chmod。

#### Scenario: 漏补执行位

- Test/check:
  - [ ] git ls-files -s -- githooks/pre-commit githooks/commit-msg
- Assertion scope: 人工审查 mode：任一钩子为 100644 时，他人克隆后可能静默不执行或报 Permission denied，判为交付缺陷；当前两项均为 100755。
- Coverage note: 该负例是交付评审规则，不通过把真实文件改成 100644 来伪造失败；不修改 Git index。

### Requirement: 新 capability 使用门类前缀

#### Scenario: 新增页面规格

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_pre_commit_capability_prefix
  - [ ] Get-ChildItem openspec/specs -Directory | Where-Object { $_.Name -like 'frontend--page-*' }
- Assertion scope: 新测试在临时 index 中新增 `openspec/specs/frontend--page-calendar/spec.md`（A），执行真实 `githooks/pre-commit`，断言放行；该正向样例只证明门类前缀，不证明更细的 `page-` 命名。人工检查用命令列出既有页面 capability，确认采用 `frontend--page-<名称>` 约定。
- Coverage note: `githooks/pre-commit:78-100` 只校验 `standard--`/`frontend--`/`backend--`/`procedure--` 门类前缀；`page-` 是人工命名约定，hook 不会拒绝 `frontend--calendar` 这类页面规格。故该测试不能单独证明页面命名规则，必须保留上述 manual 检查，不改 app/hook。临时 index/GIT_DIR/blob 隔离边界见下一 Requirement 的 Coverage note。

#### Scenario: 叠加前缀

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_pre_commit_capability_prefix
- Assertion scope: 同一测试新增 `openspec/specs/frontend--backend--example/spec.md`（A），断言钩子退出 1，stderr 提示「不得叠加门类前缀」。
- Coverage note: 只断言钩子的前缀拒绝；不把名称分级判断扩展到未新增的存量 capability。

### Requirement: 命名校验只针对暂存区新增标记文件

#### Scenario: 修改既有规格

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_pre_commit_capability_prefix
- Assertion scope: 临时 index 中把既有 `openspec/specs/frontend--build/spec.md` 改为不同 blob（M），执行钩子，断言放行；修改既有主规格不要求改名。另构造 Git 识别的 R 改名（相似 blob）断言放行，改名不按新增 capability 强制迁移。
- Coverage note: A/叠加/archive 子例在独立临时仓库 `git init` 后构造 index；M/R/旧 capability delta 子例读取真实仓库的 `GIT_DIR` 和 HEAD 已有 blob，仅通过 `GIT_INDEX_FILE` 写独立临时 index，不写真实对象库、不 commit/reset/clean、不改工作区。blob 来源只用 HEAD 已有对象或临时仓库内的 `git hash-object`，不修改真实主规格。

#### Scenario: 旧 capability 首次增加 delta

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_pre_commit_capability_prefix
- Assertion scope: 临时 index 新增 `openspec/changes/<change>/specs/frontend--build/spec.md`（A），而 HEAD 已有该主规格；钩子检查 HEAD 后放行，断言「delta 新增不等于 capability 新增」。
- Coverage note: 使用真实 HEAD 的既有 capability；不修改该 change 之外的文件。

#### Scenario: 历史归档

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_pre_commit_capability_prefix
- Assertion scope: 同一测试新增 `openspec/changes/archive/<old>/specs/frontend--legacy/spec.md`（A），断言钩子跳过 archive，不追溯改名；另用含空格/非 ASCII 的路径验证 NUL 分隔读取不截断。
- Coverage note: 只验证 `--diff-filter=A` 与 archive 跳过；不重命名或迁移任何历史规格。

### Requirement: 业务单元边界与规格入口

#### Scenario: 页面规格的归属

- Test/check:
  - [ ] Select-String -Path openspec/specs/frontend--page-*/spec.md -Pattern '业务|规则'
- Assertion scope: 人工抽查页面规格：即使页面规格夹带业务规则，仍归 `frontend--`，判据是落在客户端一端；不因夹带业务内容把页面规格迁到 backend 或拆成跨端 capability。
- Coverage note: 这是命名/归属判断，没有单一可执行对象；命中词需结合规格上下文，不自动判定归属。

#### Scenario: 规格入口

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_openspec_layout
- Assertion scope: 新测试断言仓库根存在 `README.md`，并递归检查 `openspec/` 下不存在 `README.md`；不把 change 的 scaffold README 留在树内。
- Coverage note: 官方 `openspec new change` 会生成 change README，与本规则冲突；本 change 已删除自己的 scaffold README，工具链冲突报告父代理，不改官方工具或主规格。

### Requirement: 规范在各仓库独立执行

#### Scenario: 单独克隆一个仓库

- Test/check:
  - [ ] git clone --no-hardlinks . "$env:TEMP\fuxi-web-clone"
- Assertion scope: 在临时 clone 中启用 `core.hooksPath=githooks`，分别运行 commit-msg 与 `check_pr.py`；断言单独检出 Web 后，提交信息校验与 PR 正文校验都能执行，不需要 Ctrl/Node/Global 的运行时文件。检查不启动另外两个仓库，也不创建真实提交。
- Coverage note: 没有执行真实 clone（需要网络/远端），也未创建真实提交；这是隔离性人工评审，不是运行时集成测试。

#### Scenario: 其他仓库的规范变更

- Test/check:
  - [ ] Select-String -Path githooks/*,scripts/ci/*,.github/workflows/* -Pattern 'FuxiYu_Global|FuxiYu_CtrKernel|FuxiYu_NodeKernel|\.\./Global'
- Assertion scope: 人工审查命中项：本仓库 hooks/checker/workflow 不引用其他仓库的执行期文件；其他仓库调整自己的约定不应改变本仓库校验行为。命中说明文字需区分文档链接与运行时依赖。
- Coverage note: 不修改其他仓库，不跨仓运行；仅做本仓库依赖边界审查。

### Requirement: 已知问题登记与证据分级

#### Scenario: 规格中登记差异

- Test/check:
  - [ ] Get-ChildItem openspec/specs -Recurse -Filter spec.md | Select-String -Pattern 'QUESTIONS|见 QUESTIONS|不表示已修复'
  - [ ] Select-String -Path README.md -Pattern 'QUESTIONS'
- Assertion scope: 人工审阅已知差异的登记：业务问题集中引用 Global `QUESTIONS.md`，规格引用时明确该记录不代表问题已修复；本仓库只保留引用，不复制完整问题台账。
- Coverage note: `QUESTIONS.md` 位于跨仓库 Global，本 change 不读取或修改其内容；只审查本仓库的引用方式。

#### Scenario: 证据状态混用

- Test/check:
  - [ ] Select-String -Path ..\FuxiYu_Global\QUESTIONS.md -Pattern '已复现|源码确认|待验证|已修复'
- Assertion scope: 人工逐条核对命中项：只有源码走查、未在环境复现的问题必须记为「源码确认」，不得写成「已复现」；四种状态按实际证据区分。
- Coverage note: 该文件不在本仓库且本 change 不修改它；这是人工证据分级检查，不制造自动分类器。

### Requirement: 规范不代表业务已完整

#### Scenario: 校验通过但描述不足

- Test/check:
  - [ ] openspec validate --specs --strict
- Assertion scope: 命令退出 0 只证明结构/格式有效；人工抽查某个 capability 是否只写了字段与生命周期概述，若是仍承认其业务逻辑描述需要补写，不把校验通过当作业务完整证明。
- Coverage note: 这是评审判断，没有自动化对象；不新增“描述完整度”关键词测试。

### Requirement: PR 正文使用四类中英双语栏目

#### Scenario: 只有优化

- Test/check:
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_enhancement_only_is_delivery
- Assertion scope: 正文只有 `### 优化工作 | Enhancements & Patches` 且含真实条目时，`validate_body` 返回空错误列表，校验通过。
- Coverage note: 该测试直接调用真实 checker 的 `validate_body`；不经过 GitHub workflow。

#### Scenario: 只有计划

- Test/check:
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_plan_only_is_not_delivery
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_plan_items_do_not_satisfy_empty_delivery
- Assertion scope: 只有 `下一步计划 | Coming Up` 条目时校验失败；`新增内容` 只写 `- 无`、计划栏写真实条目时仍失败；计划条目不满足交付类栏目。
- Coverage note: 计划栏即使有真实内容也不计入交付；测试覆盖新旧标题混用中的计划停用分支。

#### Scenario: 空栏

- Test/check:
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_empty_column_with_wu_is_allowed
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_plan_items_do_not_satisfy_empty_delivery
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_missing_verification_is_valid
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_optional_verification_placeholder_is_not_required
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_pr_body_checker_data_and_title
- Assertion scope: 旧式 `NEW`/`FIX` 中一栏 `- 无`、另一栏有真实条目时通过；新式四类栏目中空交付栏不被计划条目填充；省略验证说明仍通过，验证栏写占位不构成必填失败；新测试另构造新式「一栏 `- 无` + 另一交付栏真实条目」断言通过，并确认验证说明/通过率可省略。
- Coverage note: 既有空栏测试使用旧栏目，新测试补新式四栏的空栏与可选验证组合；不修改既有 checker 测试。审查发现与待办不得写成已修复属于内容真实性，由人工评审，不由结构 checker 判断。

### Requirement: 占位、注释与围栏不计交付

#### Scenario: 只提交模板

- Test/check:
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_template_placeholders_cannot_pass_validation
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_template_contains_required_markers
- Assertion scope: 原样模板被 `validate_body` 判失败；模板含 HTML 注释、标题说明、四类中英双语标记，且不把 `## 验证` 写成必填栏。
- Coverage note: 测试断言模板本身不能通过；占位清单另由 `test_placeholder_items_are_rejected` 覆盖。

#### Scenario: 围栏里伪造条目

- Test/check:
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_fenced_copy_of_a_whole_pr_fails
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_fenced_items_do_not_satisfy_a_column
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_comment_only_body_fails
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_commented_items_do_not_satisfy_a_column
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_placeholder_items_are_rejected
- Assertion scope: 整个 PR 正文放进 fenced block 时无有效内容、校验失败；栏内 fenced/HTML 注释条目不能满足交付；只有注释的正文失败；占位 `-`、`- ...`、`- TODO`、`- 待填写`、`<...>`、`- 无`、`（请填写）` 均不计入。
- Coverage note: 占位只按“整条就是占位”判定，不误伤含这些词的正常条目；测试覆盖该边界。

### Requirement: PR 标题由人工评审

#### Scenario: 标题未带类型前缀

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_pr_body_checker_data_and_title
- Assertion scope: 用真实 event JSON 同时提供自然语言 `pull_request.title` 与合法正文，调用 `check_pr.py --event`，断言退出 0；checker 只读 `pull_request.body`，不要求 `feat(...)` 前缀，也不因标题措辞改变正文校验结果。
- Coverage note: 该测试不验证标题内容是否正确；只验证标题不参与结构校验。

#### Scenario: 标题写错

- Test/check:
  - [ ] git log -1 --stat --pretty=%s
- Assertion scope: 对照最近提交标题、实际改动文件与 PR 描述；标题与实际交付不符时由人工评审提出，checker 不拦标题。测试已证明脚本忽略标题，不能把“脚本通过”当成标题正确。
- Coverage note: 这是人工评审对象，没有自动化语义判断；不新增标题关键词测试。

### Requirement: 旧栏目仅作过渡兼容

#### Scenario: 过渡期旧正文

- Test/check:
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_new_only_is_valid
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_fix_only_is_valid
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_both_columns_are_valid
- Assertion scope: 旧式 `NEW | 新增内容`、`FIX | 修复漏洞` 单栏或双栏且含真实条目时，checker 仍接受；旧栏目只作过渡兼容。
- Coverage note: 兼容接受不等于当前推荐格式；新写正文的断言在下一 Scenario。

#### Scenario: 新写正文

- Test/check:
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_node_pr_four_columns
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_bilingual_case_and_spacing
- Assertion scope: 四类中英双语栏目各有真实条目时通过；大小写与 `|` 两侧空格变体仍识别；新正文应使用四类栏目。
- Coverage note: 测试不扫描仓库里所有 PR 正文，也不把模板文字当新正文；只验证 checker 对新式栏目的接受。

### Requirement: PR 正文由基准分支的检查器校验

#### Scenario: 正文被修改

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_pr_workflow_policy
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_pr_body_checker_data_and_title
- Assertion scope: 读取真实 `.github/workflows/pr-format.yml`，断言 `pull_request.types` 含 `edited`，正文编辑会重新触发工作流；不实际修改 GitHub PR。新测试把含 shell/Python 注入片段的正文放进 event JSON，执行真实 `check_pr.py --event`，断言正文只作为数据，不创建标记文件、不求值表达式、不调用 shell。
- Coverage note: 只验证工作流触发配置；远程 GitHub 事件未执行。

#### Scenario: 首次接入

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_pr_workflow_policy
- Assertion scope: 同一测试断言工作流先 checkout `github.event.pull_request.base.sha` 的 `reviewed` 路径；基准分支无 checker 时再 checkout head 的 `proposed/scripts/ci/check_pr.py`，并以固定 SHA256 校验；不静默跳过。
- Coverage note: 这是工作流配置与脚本路径的真实静态契约，不执行 GitHub Actions checkout。

#### Scenario: 摘要不符

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_pr_workflow_policy
  - [ ] sha256sum --check --status
- Assertion scope: 测试计算当前 `scripts/ci/check_pr.py` 的 SHA256，断言与工作流固定值一致；人工在临时副本准备校验和文件后执行 `sha256sum --check --status`，确认摘要不一致时返回非零且工作流 `set -e` 失败，不执行该脚本。
- Coverage note: 只在临时副本上制造不一致，不改仓库 checker；摘要不匹配的 CI 运行未远程执行。

### Requirement: commit 关键字与 PR 栏目相互独立

#### Scenario: PR 内含 AMEND 提交

- Test/check:
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_enhancement_only_is_delivery
  - [X] scripts/tests/commit-message.integration.mjs::accepts AMEND
- Assertion scope: 既有 commit-message 测试断言真实钩子接受 `- AMEND ...`；既有 PR checker 测试断言正文只保留「优化工作」栏目也能通过。二者各自维护，不把 commit 的 AMEND 改写成 PR 栏目关键字。
- Coverage note: 这是流程独立性规则，没有单一端到端对象；两侧各有真实测试，但“同一次 PR 同时含 AMEND 与四类正文”的人工组合仍需评审确认。

### Requirement: 规范入口不使用代理说明文件

#### Scenario: 生成代理说明文件

- Test/check:
  - [ ] Get-ChildItem -Recurse -File -Include AGENT.md,AGENTS.md | Where-Object { $_.FullName -notmatch '\\node_modules\\' }
- Assertion scope: 检查工作区（排除 `node_modules`）是否存在 `AGENT.md`/`AGENTS.md`；若工具生成，应移除并从暂存区排除，把适用规范整理到本仓库 OpenSpec。规则由维护与评审落实，不声称 hook 会自动拒绝。
- Coverage note: 该规则没有自动拦截器；测试若写成“文件存在即失败”也只是当前布局检查，不能证明 hook 行为。这里保留人工检查。
