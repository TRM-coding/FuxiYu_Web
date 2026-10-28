# Spec Delta

## MODIFIED Requirements

### Requirement: 提交信息采用真实变更条目

提交信息 SHALL 每行采用 `- NEW 中文短句`、`- AMEND 中文短句`、`- FIX 中文短句`、`- SPEC 中文短句` 或 `- TEST 中文短句`；关键字 SHALL 只取 NEW、AMEND、FIX、SPEC、TEST 五者之一，不得自造；SPEC 用于规格与文档，TEST 用于测试。每行 SHALL 说明具体变更，写得能脱离当次对话独立理解；空行与以 `#` 开头的 Git 注释行 SHALL NOT 计入条目。格式化由 `githooks/commit-msg` 检查，中文表达与内容真实性由评审确认。

#### Scenario: 多项变更

- **WHEN** 一次提交既新增脚本又修复一个缺陷
- **THEN** 分别写 NEW 与 FIX 条目，每条自足

#### Scenario: 错误关键字

- **WHEN** 使用 DOCS、DEBUG 或自造关键字
- **THEN** commit-msg 拒绝提交并列出允许的格式与关键字

#### Scenario: 脱离上下文不可读

- **WHEN** 条目只写“更新若干文件”这类空泛描述
- **THEN** 格式校验可能通过，但评审以内容不具体为由要求改写

### Requirement: 禁止工具署名与空提交信息

非合并提交的提交信息 SHALL NOT 包含 `Co-Authored-By`、`Generated with` 或生成图标，SHALL 至少包含一条实际条目。钩子 SHALL 兼容 CRLF 信息文件，并 SHALL 检查没有终止换行的最后一行。

#### Scenario: 只有注释或空行

- **WHEN** 信息文件只包含空行或 `#` 注释
- **THEN** 拒绝提交并说明至少需要一条实际变更

#### Scenario: 末行没有换行

- **WHEN** 文件末尾是非法条目且没有终止换行
- **THEN** 仍按非法条目拒绝

### Requirement: 合并提交使用 Git 默认信息

Git 正处于 merge（Git 目录存在 `MERGE_HEAD`）时，`commit-msg` SHALL 放行自动生成的合并信息。豁免 SHALL 以 Git 状态为判据，MUST NOT 依据消息文字判断，普通提交不能仅凭标题写 Merge 获得豁免。

#### Scenario: 真实合并

- **WHEN** Git 正在 merge
- **THEN** 自动生成的合并信息不被要求改写成变更条目

### Requirement: 钩子随仓库交付并显式启用

约定 SHALL 由仓库内 `githooks/pre-commit` 与 `githooks/commit-msg` 执行，脚本随仓库交付。每个克隆 SHALL 执行一次 `git config --local core.hooksPath githooks`；该配置是**替换**而非叠加，设置后 `.git/hooks/` 不再被读取，因此启用前 SHALL 核对既有的 hooksPath 与非 sample 钩子，不覆盖已有的自定义入口。

#### Scenario: 新克隆启用

- **WHEN** 新克隆执行上述配置
- **THEN** 两个钩子生效，无需手工复制到 `.git/hooks`

#### Scenario: 已有自定义钩子

- **WHEN** 克隆内已存在需要保留的钩子
- **THEN** 先确认如何保留或迁移，再决定是否替换 hooksPath

### Requirement: shell 钩子保持 LF 与 Git 100755

新增或修改的 shell 钩子 SHALL 使用 LF 换行，并以 Git mode 100755 交付；`.gitattributes` SHALL 覆盖没有扩展名的 `githooks/` 文件。Windows 上 SHALL 用 `git add --chmod=+x -- githooks/pre-commit githooks/commit-msg` 明确执行位；改动后 SHALL 用 `git ls-files -s` 核对 mode 为 100755。

#### Scenario: 核对入库元数据

- **WHEN** 执行 `git ls-files -s -- githooks/pre-commit githooks/commit-msg`
- **THEN** 两项 mode 均为 100755，检出换行规则为 LF

#### Scenario: 漏补执行位

- **WHEN** 钩子以 100644 交付
- **THEN** 他人克隆后钩子静默不执行（或报 Permission denied），视为交付缺陷

### Requirement: 新 capability 使用门类前缀

新增 capability 名称 SHALL 使用 `standard--`、`frontend--`、`backend--` 或 `procedure--` 之一作为门类前缀，名称使用小写与连字符；一个名称 SHALL NOT 叠加门类前缀。落点判据按职责所在的一端选取：跨端或仓库公共约定归 standard，客户端归 frontend，服务端归 backend，人做事的流程归 procedure。该规则 SHALL 只约束新增，既有 capability SHALL 保留原名，不因本规则改名。

#### Scenario: 新增页面规格

- **WHEN** 新增一个 Web 页面 capability
- **THEN** 目录名采用 `frontend--page-<名称>`

#### Scenario: 叠加前缀

- **WHEN** 新增 `frontend--backend--example`
- **THEN** pre-commit 拒绝并提示只能使用一个门类

### Requirement: 命名校验只针对暂存区新增标记文件

`githooks/pre-commit` SHALL 只从 Git 暂存区读取**新增**（`--diff-filter=A`）的 `spec.md` 标记文件做前缀校验，SHALL 使用 NUL 分隔读取以保留含空格或非 ASCII 的路径。既有主规格的 delta、既有规格的修改、Git 识别的改名（`R`）与 `openspec/changes/archive/` 内容 SHALL NOT 被强制迁移或改名。

#### Scenario: 修改既有规格

- **WHEN** 暂存区只修改既有 `openspec/specs/<cap>/spec.md`
- **THEN** 放行，不要求改名

#### Scenario: 旧 capability 首次增加 delta

- **WHEN** HEAD 已存在该 capability 的主规格，本次只新增其 delta
- **THEN** 放行——delta 文件新增不等于 capability 新增

#### Scenario: 历史归档

- **WHEN** 暂存区新增 `openspec/changes/archive/` 下的文件
- **THEN** 不参与前缀校验，历史不追改

### Requirement: 业务单元边界与规格入口

规格 SHALL 保持已确认的业务组织边界：Ctrl 按表、Node 按已确认的 8 个业务能力单元（在文件内保留完整类型契约，不虚构数据库表）、Web 按页面或已确认的页面组件。根目录 SHALL 保留 README，`openspec/` 内 SHALL NOT 放置 README。命名前缀 SHALL NOT 成为合并业务单元或删减细节的理由。

#### Scenario: 页面规格的归属

- **WHEN** 一个页面规格中夹带业务规则
- **THEN** 仍归 `frontend--`，判定看它落在哪一端

#### Scenario: 规格入口

- **WHEN** 检查仓库文档布局
- **THEN** 根目录有 README，`openspec/` 内没有 README

### Requirement: 规范在各仓库独立执行

上述规则 SHALL 由各仓库自己交付的钩子、脚本与工作流执行，SHALL NOT 依赖其他仓库的 SPEC 文件或其他仓库的运行时文件。跨仓库只共享问题登记入口，不共享执行期依赖。

#### Scenario: 单独克隆一个仓库

- **WHEN** 只检出本仓库并启用 hooksPath
- **THEN** 提交信息校验与 PR 正文校验都可执行，不需要任何其他仓库的文件

#### Scenario: 其他仓库的规范变更

- **WHEN** 别的仓库调整了自己的约定
- **THEN** 本仓库的校验行为不变

### Requirement: 已知问题登记与证据分级

已知业务问题 SHALL 集中在 Global 的 `QUESTIONS.md`，并 SHALL 区分“已复现 / 源码确认 / 待验证 / 已修复”四种证据状态。规格文件引用问题清单时 SHALL 明确该记录不代表问题已修复。

#### Scenario: 规格中登记差异

- **WHEN** 某个已实现的页面行为存在待修复差异
- **THEN** 在规格中以“见 QUESTIONS”方式登记，并注明不表示已修复

#### Scenario: 证据状态混用

- **WHEN** 一条问题只有源码走查、尚未在环境复现
- **THEN** 记为“源码确认”，不得写成“已复现”

### Requirement: 规范不代表业务已完整

格式校验 SHALL 只被视为结构与格式检查，MUST NOT 作为业务逻辑、状态转换与失败边界描述完整的证明。未写入规格的既有行为 SHALL NOT 因此被视为不存在。

#### Scenario: 校验通过但描述不足

- **WHEN** 格式校验通过，但某个能力只写了字段与生命周期概述
- **THEN** 仍承认其逻辑描述需要补写

### Requirement: PR 正文使用四类中英双语栏目

PR 正文 SHALL 使用以下栏目名，按需要保留：`### 新增内容 | WHAT'S NEW`、`### 漏洞修复 | Bug Fixes`、`### 优化工作 | Enhancements & Patches`、`### 下一步计划 | Coming Up`。前三栏 SHALL 视为交付类栏目，至少一栏 SHALL 含一项真实条目；`下一步计划 | Coming Up` SHALL 为可选栏，其条目 SHALL NOT 计入交付，也不 SHALL 用来满足交付类栏目。没有内容的栏目 SHALL 可以整栏删除，或只写一条 `- 无`；验证说明与通过率 SHALL 为可选内容，省略不导致校验失败。栏目只写本次交付，审查发现与待办 MUST NOT 写成已修复。

#### Scenario: 只有优化

- **WHEN** 正文只保留 `优化工作 | Enhancements & Patches` 且含真实条目
- **THEN** 校验通过

#### Scenario: 只有计划

- **WHEN** 正文只有 `下一步计划 | Coming Up` 的条目
- **THEN** 校验失败，计划不算已交付

#### Scenario: 空栏

- **WHEN** 某交付类栏目只写 `- 无`
- **THEN** 该栏不计入有效交付；其余交付类栏目有真实条目时整体仍通过

### Requirement: 占位、注释与围栏不计交付

检查器 SHALL 忽略 HTML 注释与 fenced 代码块中的内容；空白、`-`、省略号、`无`、`TODO`、`待填写` 等占位 SHALL NOT 算作有效条目。原样保留模板 SHALL 校验失败。

#### Scenario: 只提交模板

- **WHEN** 提交者未替换模板占位文字
- **THEN** 校验失败并说明需要真实条目

#### Scenario: 围栏里伪造条目

- **WHEN** 把整个 PR 正文放进 fenced 代码块
- **THEN** 视为没有可校验内容，校验失败

### Requirement: PR 标题由人工评审

PR 标题 SHALL 自然描述本次主要变更，MUST NOT 被要求使用 `feat(...)` 之类的类型前缀。正文检查器 SHALL NOT 校验标题；标题措辞由人工评审确认。

#### Scenario: 标题未带类型前缀

- **WHEN** 标题以自然语言概括变更
- **THEN** 不影响正文结构校验结果

#### Scenario: 标题写错

- **WHEN** 标题与实际交付不符
- **THEN** 由评审提出，不由脚本拦下

### Requirement: 旧栏目仅作过渡兼容

历史正文使用的 `NEW | 新增内容`、`FIX | 修复漏洞` 栏目 SHALL 只在接入过渡期被检查器兼容接受；新写的正文 SHALL 统一使用四类中英双语栏目。该兼容 SHALL NOT 被表述为当前推荐格式。

#### Scenario: 过渡期旧正文

- **WHEN** 一个尚未改写的 PR 正文使用旧栏目且含真实条目
- **THEN** 校验通过

#### Scenario: 新写正文

- **WHEN** 新建 PR 正文
- **THEN** 使用四类中英双语栏目

### Requirement: PR 正文由基准分支的检查器校验

PR 正文校验 SHALL 由工作流读取 GitHub event JSON 的 `pull_request.body` 完成；正文 SHALL 一律当作数据，MUST NOT 求值其中的表达式或调用 shell。工作流 SHALL 优先使用 PR 基准分支（`base.sha`）上的已评审检查器；基准分支尚无检查器时 SHALL 只允许与工作流内固定 SHA256 一致的引导检查器，摘要不符 SHALL 直接失败，MUST NOT 静默跳过校验。

#### Scenario: 正文被修改

- **WHEN** PR 正文被编辑
- **THEN** 工作流重新校验

#### Scenario: 首次接入

- **WHEN** 基准分支没有 `scripts/ci/check_pr.py`
- **THEN** 先校验固定摘要，再用引导检查器读取 event JSON

#### Scenario: 摘要不符

- **WHEN** 引导检查器与固定摘要不一致
- **THEN** 工作流失败，不执行该脚本

### Requirement: commit 关键字与 PR 栏目相互独立

提交信息的 NEW/AMEND/FIX/SPEC/TEST SHALL 与 PR 正文栏目各自维护。PR 说明本次交付，MUST NOT 把 commit 的 AMEND 改写成 PR 的栏目关键字，也 MUST NOT 用 PR 栏目名改写历史提交关键字。

#### Scenario: PR 内含 AMEND 提交

- **WHEN** 本次 PR 中存在 AMEND 提交
- **THEN** 保留该提交关键字，PR 正文按实际交付内容填写


### Requirement: 规范入口不使用代理说明文件

本仓库的流程规范 SHALL 维护在 OpenSpec 中，SHALL NOT 生成、保留或提交 AGENT.md、AGENTS.md。此规则由维护与评审落实，MUST NOT 声称现有 hook 会自动拒绝这些文件。

#### Scenario: 生成代理说明文件

- **WHEN** 工具在仓库中生成 AGENT.md 或 AGENTS.md
- **THEN** 移除该文件并从暂存区排除，适用规范整理到本仓库 OpenSpec
