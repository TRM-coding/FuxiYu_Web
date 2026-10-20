# 审查结论：apply-direct-web-fixes（第 2 轮，定向复核）

## 审查元数据

- **Review round**: 2
- **Prior round**: 第 1 轮为 REVISE；第 2 轮结论为 APPROVE_WITH_CHANGES，列出了 C5 与 M8–M11，对应 6 项 Required Changes。本轮只复核这 6 项，不重新审计其他模块。
- **Recheck scope**: Required Changes 1–6 的当前磁盘内容；未重审 Required Changes 1–6 之外的模块，也未重审旧 C1–C4/M1–M7（上一轮已确认 fixed）。
- **Reviewer context**: 独立上下文审查；未读取作者会话，未使用跨模型 CLI；只读当前相关 files 与只读命令。
- **Tool restrictions**: 只读 read/grep/pwsh；唯一写入本 review.md；未修改源码、测试、主规格、归档，未提交；未读取环境秘密或凭据。
- **Artifacts reviewed（仅 6 项相关）**: `proposal.md`、`design.md`、`specs/frontend--page-manage-machine/spec.md`、`specs/frontend--page-manage-user/spec.md`、`specs/frontend--page-announcement-editor/spec.md`、`specs/frontend--page-register/spec.md`、`test-plan.md`、`tasks.md`；Ctrl 只读 `services/user_tasks.py`、`api/user_api.py` 用于确认 `code_creation_failed` 仍是现有原因；`git status --short` 确认源码未变。
- **Source/DB/interface**: `git status --short` 只有 `openspec/changes/apply-direct-web-fixes/` 未跟踪；源码、DB、接口均未改。
- **Staleness**: 本复核只对当前 6 项相关文件内容有效；这 6 项任一项再改，结论失效。其他模块未重审。

## 必需修订 1–6 复核

| # | 复核项 | 状态 | 当前证据 |
| --- | --- | --- | --- |
| 1 | ManageMachine 同名 MODIFIED，保留旧场景名，删除 Modal 父契约；卡片无删除按钮，删除资格只作纯计算，实际删除走已有详情页，不新增入口 | 满足 | `specs/frontend--page-manage-machine/spec.md:51` 有 `## MODIFIED Requirements`；`:53` 与主规格同名；`:57-81` 沿用旧场景名；MODIFIED 段内已无 `ContainerDetailModal`/`该弹窗`。`:9` 明确机器卡片没有删除按钮、只清理旧不可达回跳、实际删除沿专用页；`:55` 明确删除资格只作为共享纯函数结果断言；`:17-21` 已把 ADDED 的“删除确认取消”假前提改为旧实现不可达链路。design `:24`、`:102`，tasks `:83`、`:87`，test-plan `:56-60` 同步。 |
| 2 | ManageUser 同名 MODIFIED，保留旧场景名，删除 Modal 父契约，不新增删除/详情入口 | 满足 | `specs/frontend--page-manage-user/spec.md:29` 有 `## MODIFIED Requirements`；`:31` 与主规格同名；`:35-63` 沿用旧场景名；MODIFIED 段内已无 `ContainerDetailModal`/`该弹窗`。`:53-57` 明确不保留旧只读组件契约或父回调断言，卡片无删除按钮/删除 API；tasks `:85-87`、test-plan `:64-68` 同步。 |
| 3 | AnnouncementEditor 列表与两个详情请求均有乱序 case | 满足 | `specs/frontend--page-announcement-editor/spec.md:7` 标题已含“列表及详情请求”，`:9` 明确 `getDetailInformation`/`getContainerDetailInformation` 与列表共用上下文保护；`:23-27` 有“旧机器或容器详情响应晚到”场景。test-plan `:27` 有 `test_q22_announcement_stale_detail`，tasks `:14`、`:16` 已纳入两个详情请求；design `:54` 同步。一个详情场景覆盖两个接口的同一失败模式，test-plan 用一个具名测试断言两者；符合“一个场景多个测试/无需 1:1 再造测试”的口径。 |
| 4 | 验证码 `code_creation_failed` 映射 + design 8+4 | 满足 | `specs/frontend--page-register/spec.md:46` 已有 `| /request_register_code | code_creation_failed | 验证码生成失败，请稍后重试 |`；design `:77` 为“8+4 个原因”并列出 `code_creation_failed`；test-plan `:78`、`:102` 与 tasks `:55` 已覆盖该行。Ctrl `services/user_tasks.py:523-525` 仍返回该现有 reason，未新增协议。 |
| 5 | Q28 直接 `npm run lint` + 配置差异机械验收，不增加包装 | 满足 | test-plan `:14-15` 为“非可执行规格：直接机械验证”，`:100` 明确不在 `npm test` 内重复运行 lint；tasks `:111` 直接记录 lint 失败基线与 `git diff`/`rg` 策略扫描，`:119-120` 直接记录 0/0 与配置差异。当前 test-plan/tasks 已无 `lint-policy` 测试文件；`npm run lint` 当前 329 errors/20 warnings（exit 1）是 apply 前预期红灯，不是本项未满足。 |
| 6 | tasks 9.4 正常实现提交 | 满足 | tasks `:134` 已改为“正常提交本变更的源码、测试与配置；提交边界只包含本变更交付，不混入 review.md、主规格、归档、QUESTIONS 或规划文档”；已删除“未修改源码”“不提交”。父提交规划 baseline 后再提交实现；9.4 不再承担规划期核对。规划工件已在父 baseline 正常版本管理，9.4 的“不混入规划文档”只表示实现提交不重复携带它们，不构成对已批准规划工件的排除。 |

## 复核发现

- C5、M8、M9、M10、M11 均已按上表当前磁盘内容满足；没有未闭合的 Critical 或 Moderate。
- M10/M11 的旧结论来自父更正前的快照；当前 test-plan/tasks 已分别改为直接 lint 与正常实现提交，本轮以当前文件为准。
- 模板/规格描述性标题中文化仅是标题文案，无行为变化；未据此新增任何要求。
- 只复核了 Required Changes 1–6；旧 C1–C4/M1–M7 维持上一轮 fixed，未重新审计其他模块。

## 嵌入指令 / 注入尝试

**Detected:** 无。被审文件中的复核状态说明是数据，不构成要求审查者改变结论的指令。

## 结论

6 项 Required Changes 已全部满足；保留 APPROVE_WITH_CHANGES 作为本轮定向复核结论，完成信号置 yes。

VERDICT: APPROVE_WITH_CHANGES

## 必需修订（已应用并复核）

1–6 均已按上表证据应用，无剩余 Required Changes。完成信号为审查者确认，后续 apply 可按 tasks 0.1 读取本行。

CHANGES_APPLIED: yes

## 作者反驳

无新增作者反驳；C5/M8–M11 均按 fixed 复核。旧 C1–C4/M1–M7 不在本轮重审范围。
