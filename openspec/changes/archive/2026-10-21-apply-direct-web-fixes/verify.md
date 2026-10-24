# 验证报告：apply-direct-web-fixes

## 验证结果

### 任务完成

- [x] `tasks.md` 全部 52 项已勾选，包括 9.4 的固定版源码提交与 8.6/9.1 最终套件证据。
- 未完成任务：无。

### 测试完整性

- [x] `test-plan.md` 86 行全部有具名测试或明确的机械检查；81 项可执行场景均有具名测试，5 项非可执行机械检查均实际运行通过。
- [x] 86/86 行均为 🟢 green 或 🟢 机械检查通过，无 🔴 red、无待执行行。
- [x] 固定提交 `a98e51df55339b2706b31c49c9033364baee0037` 的完整 `npm test` 通过：前端 64 文件 605 通过、server 40 通过，0 failed / 0 skipped / 0 todo。
- [x] 仍生效的业务断言未被削弱；旧弹窗契约按已审查的 MODIFIED 要求替换为共享动作契约。C 的 DetailPages 增强单一定时器断言；A 后续临时移除守卫的复核属于“变异验证”，不冒充实现前的失败基线。
- [x] 公告卸载用例的可观测边界为“无页面级错误/act 副作用 + 重挂后无旧数据泄漏 + 新实例数据可应用”；源码 `mountedRef`/`cancelled` 已审计，未夸称测试直接观测 React no-op setState（详见 `.git/apply-direct-web-fixes-web-pages-agent-report.md` §1.2）。
- [x] 5 项非可执行检查：Q28 全仓 lint、Q28 规则/忽略策略、Q29 Node 支持范围、Q29 负例配置检查、Q29 完整套件汇总；均以真实命令/配置证据通过，不用测试文件冒充。

### 验证证据

- 固定版 Web 代码提交：`a98e51df55339b2706b31c49c9033364baee0037`（`FIX 修正前端请求状态与分页并清理全仓检查`）；规划提交为 `9b7facc`。
- 最终完整套件命令：`npm test`（Node v26.8.1，固定提交 `a98e51d`）。
- 结果汇总：前端 `64 files / 605 tests passed`；入口集成 `40 tests passed`；`0 failed`、`0 skipped`、`0 todo`。原始输出：`.git/direct-q-fixed-commit-suite.log`。
- 全仓 `npm run lint`：退出 0，0 errors / 0 warnings。原始输出：`.git/direct-q-parent-final-lint.log`。
- 构建：`npm run build` 退出 0，`✓ built in 11.40s`。原始输出：`.git/direct-q-parent-final-build.log`。
- 稳定性：195 个 `src/`、`scripts/`、config、workflow 文件运行前后 SHA256 全部相同；证据：`.git/direct-q-fixed-commit-stability.json` 与 manifest。
- 规则/ignore 策略：`rg` 核对仅保留既有 `globalIgnores(['dist'])`，无新增 suppression、无规则 `off`；`rg eslint-disable` 为空。
- A 定向：9 文件 78/78（`.git/q28-handoff-a9-78-tests.log`）。
- B 定向：9 文件 144/144（`.git/parent-b-acceptance.log`），红绿证据见 `.git/apply-direct-web-fixes-web-owned-final.log`。
- C 定向：19 文件 189/189（`.git/apply-worker-final3-web.log`）；docs 3/3（`.git/apply-worker-green-docs2.log`）；server 40/40（`.git/apply-worker-final2-server.log`）。
- Q61 竞态：红灯 `.git/apply-worker-q61-race-red2.log`；修复后 6 文件 58/58（`.git/apply-worker-q61-race-verification.log`）。
- C 的 Q28 lint 交接：6 文件 58/58（`.git/apply-worker-q28-handoff-verification.log`），DetailPages 仅增强稳定单 timer 断言。
- D 交接：34 文件 324/324（`.git/lint-q28-tests.log`），并完成 encoding/CJK 审计。

#### 初始红灯与变异验证

- A 初始红灯：`.git/adminlogs-red.log`、`.git/announcementeditor-red.log`、`.git/templatemanager-red.log`、`.git/announcement-api-red.log`。后续变异验证：`.git/announcementeditor-independent-red.log`、`.git/announcementeditor-stale-lists-red.log`。
- B 初始红灯：`.git/apply-direct-web-fixes-web-owned-final.log` §1（CreateImage 5 failed / 22 passed；Settings 10 failed；Register 14 failed；permissionControllerRelease 3 failed 等）。
- C 初始红灯：`.git/apply-worker-red-web.log`（9 文件，20 failed / 45 passed）、`.git/apply-worker-red-docs.log`（docs 1 failed）、`.git/apply-worker-q61-race-red2.log`（Q61 2 failed / 3 passed）。
- D 初始基线：修订时 `npm run lint` 329 errors / 20 warnings；最终 34 文件 324/324 与父独立 lint 0/0。
- A 后续临时恢复错误联动/移除列表序号检查属于“变异验证”，用于证明 guard 有效；不冒充实现前 TDD 红灯。

#### 18 Q 证据索引

| Q | 证据 | 结果 |
| --- | --- | --- |
| Q22 | A 9/78（AdminLogs/AnnouncementEditor）；B 9/144（CreateImage） | 旧周次/筛选/页码/关键词/独立选择/详情/卸载场景通过 |
| Q23 | B 9/144（Settings） | 整数、提醒节点、分组顺序通过 |
| Q24 | A 9/78（AnnouncementEditor） | `page_number=0` 通过 |
| Q27 | B 9/144（permissionControllerRelease） | 成功/异常/连续查询释放通过 |
| Q28 | `.git/lint-q28-tests.log` 34/324；`.git/direct-q-parent-final-lint.log` 0/0 | 全仓 lint 与规则/ignore 机械检查通过 |
| Q29 | `.git/apply-worker-final2-server.log` 40/40；`.git/direct-q-fixed-commit-suite.log` 64/605+40 | 入口注入、支持范围、完整套件通过 |
| Q35 | C 19/189 + Q61 6/58 | ManageMachine/ManageUser 详情、MODIFIED 契约、权限/资格通过 |
| Q36 | C 19/189、docs 3/3；B 9/144 的 Register 死校验 | Docs、Login、ManageUser、Register 清理通过 |
| Q37 | B 9/144（注册/设置/镜像）；A 9/78（模板） | route/error_reason 表与真实弹窗通过 |
| Q52 | A 9/78（公告下拉、模板页、API paging） | 205 项、offset、深链通过 |
| Q55 | A 9/78（AnnouncementEditor） | 选区缓存/夺焦插入通过 |
| Q59 | C 19/189 + `.git/apply-worker-q59-integration2.log` 15/15 | 父页 4 条、第二页 5/6 通过 |
| Q60 | C 19/189（ManageUserInTable） | 行操作不冒泡通过 |
| Q61 | `.git/apply-worker-q61-race-verification.log` 6/58 | 刷新/动作历史与竞态通过 |
| Q63 | B 9/144（CreateImage） | 清关键词、空词重取、选中新项、保留表单通过 |
| Q64 | B 9/144（CreateImage） | 更新后重取列表通过 |
| Q66 | C 19/189（NotFound） | 100vh/100dvh 通过 |
| Q69 | C 19/189（ManageMachine） | 仅解冻保页、切页竞态、失败保页通过 |

Q35/Q36 的旧 `ContainerDetailModal` 断言已按已审 `MODIFIED Requirements` 替换，不声明为 `REMOVED`；真实 permission/eligibility、删除资格纯计算与解冻失败语义保留。

### 审查完整性

- [x] `review.md` 为 `VERDICT: APPROVE_WITH_CHANGES`、`CHANGES_APPLIED: yes`（第 3 轮）。
- [x] 结论未过期：proposal/design/公告 spec 的 SHA256 与第 3 轮 review 对照全部匹配；tasks/test-plan 仅发生实施状态变化。
- [x] 全部 Critical/Moderate 已修复或有已接受的结论；无未处理 rebuttal。旧 Modal 断言按 MODIFIED 替换，A 的 guard 复核如实记为变异验证。

### 交付状态

- 源码提交：`a98e51df55339b2706b31c49c9033364baee0037`。
- 验收文档：`tasks.md`、`test-plan.md`、`verify.md` 与本记录一并提交；该文档提交不包含主规格、归档、Global、`review.md` 或源码。
- 本验证未归档、未部署，未宣称真实浏览器、生产部署或 CI 20/22 跨版本已验证。

## 总体验收结论

结论：**⚠️ PASS WITH WARNINGS**。无 Critical 问题；以下限制保留为警告：

1. 未做真实浏览器/E2E/视觉验收；公告光标、分页、卸载等以 jsdom 组件测试和可观测边界为准。
2. CI 的 Node 20.19.0/22/26 矩阵未在本轮实际远程执行；本地实际运行环境为 Node v26.8.1。
3. 测试 stderr 仍有既有 Antd 弃用/act 噪音，但 `npm run lint` 为 0 errors / 0 warnings，套件 0 failed/0 skipped/0 todo；不把测试噪音误报为 lint 错误。

DECISION: PASS_WITH_WARNINGS
