# Plan Review

## Review Record

- Change: complete-anvil-manage-page-mappings
- Reviewer: fresh-context reviewer（同一独立复审，未继承作者上下文）
- Access: read-only; this file is the only write
- Reviewed plan: proposal.md, specs/**/spec.md, design.md, test-plan.md
- Context checked read-only: 五份主规格、相关既有测试、`src/test/AnvilManagePages.test.jsx`、页面/组件源码；未运行 `npm test` 或 `npm run build`，未执行 Git 操作
- Checked inventory: 35 Requirement/75 Scenario；175 个 locator（173 个 `[X]`、2 个 `[ ]`）；37 个独立 planned test = 35 个已创建 + Q84/Q85 两个未创建；实际测试文件仍为 35 个函数，Q84/Q85 locator 均不存在，无 skip/xfail
- Current red status: 当前 35 个已创建测试为 34 pass / 1 fail，失败来自 `test_home_card_and_detail_modal_share_action_resolution` 中尚未拆出的 Q85 paused 详情片段；该片段保留原严格期望，复审批准后再移出为独立未来 locator
- Q85: Home 未向 `ContainerDetailModal` 传 `onUnpause`，导致卡片可解冻而详情无「解冻容器」按钮；Global Q85 已登记（de66765）。计划保留 `test_home_paused_detail_exposes_same_unpause_action_as_card` 为 `[ ]`、未创建，要求 paused + root/manage 下卡片与详情均可解冻；不改成“按钮缺失通过”、不 skip/xfail、不修 app
- Q84: `test_manage_user_replace_rbac_groups_submits_deduped_ids` 继续 `[ ]`、未创建；重复输入实际 `[2,2,5]`，期望 `[2,5]`；不修 app、不弱化、不宣称全部完成
- 原 35 created 保留全部原断言与 online 增强，不缩为 34；原 36 计划不删减，增加 Q85 后总 37 unique；35 created 的 online 同源行 `[X]` 只声明 online 子范围，不宣称 paused 或整个 Scenario 全覆盖
- 6 项真补已核实：Home 磁盘新值、ROOT N+1/普通角色/关闭日志、维护轮询、MM CPU/内存/GPU、MU 限额/page_size、三页 online/ROOT/paused 动作矩阵；当前 source 红仅来自待拆 Q85 片段
- Invalidation scope: any semantic change to a requirement, scenario, design decision, scenario mapping, test/check locator, Assertion scope, or Coverage note. Recomputing a checkbox after checking unchanged assertions, or external run/log changes alone, does not invalidate this review.
- Scope limit: planning only. Implementation, task completion, test execution, and archive readiness are out of scope. 不直接 archive，不自行修改计划；当前 source 不因本 review 改动。

## Findings

### Blocking

- None.

### Non-blocking

- None.

## 父级边界（保持既定裁定）

- Home ADD：显式关闭人员弹窗后凭据保持；不要求新增成功后自动关闭。
- MachineDetail：仅“修复连接”有无权限隐藏的 Scenario 断言；编辑/删除/view 不作额外前端装配门，后端/Ctrl 为最终裁决。
- ManageUser：缺失的容器角色入口保持既有 Global Q38；不另造入口通过测试。
- Global Q84/Q85：均按用户决定延期并保持 `[ ]`、未创建；不 skip/xfail、不弱化、不修 app；不宣称 37 完成，不把 35 created 降为 34。

## Verdict

VERDICT: APPROVE
