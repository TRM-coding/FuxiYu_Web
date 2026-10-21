# ManageMachine 测试覆盖

规格：[spec.md](spec.md)

## 台账状态

- 主 spec SHA256：`5fc442954f0af2e8c2a1a34444b50244c15732f35d80fb7bbfb5e2737819ee77`
- 本轮映射：已覆盖 11；部分覆盖 0；待复核 4。
- 测试基线：固定版 Web 代码 `a98e51d`；验收文档 HEAD `372fb80`。本轮只同步文档，未重跑业务套件。
- 运行证据：C 组 19/189；`ManageMachineDetailRefresh.test.jsx` 与 `ManageMachineEligibility.test.jsx` 的 Q35/Q69 用例通过；固定版 `npm test` 64/605+40。
- 定向证据：C 组 19 files/189（`.git/apply-worker-final3-web.log`）。
- 限制：jsdom 组件测试；真实浏览器/E2E/视觉验收未运行；CI Node 20.19.0/22 未实际远程运行；本轮未重跑业务套件。

## 当前场景映射

| Requirement | Scenario | 覆盖状态 | 测试位置与 nodeid/参数 | 验证范围或缺口 |
| --- | --- | --- | --- | --- |
| ManageMachine 页面入口与身份 | 装配页面 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ManageMachine 主流程 | 机器上仍有容器时尝试删除机器 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ManageMachine 构建归属 | 生成生产产物 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ManageMachine 静默刷新覆盖展示与权限字段 | 机器展示或容器权限单独变化 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ManageMachine 使用真实权限与共享动作结果 | 卡片与既有组件契约结论一致 | 已覆盖 | ../../../src/test/ManageMachineEligibility.test.jsx::test_q35_manage_machine_shared_action_contract | 断言「卡片与既有组件契约结论一致」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ManageMachine 使用真实权限与共享动作结果 | 失败容器仍可删除 | 已覆盖 | ../../../src/test/ManageMachineEligibility.test.jsx::test_q35_manage_machine_failed_delete_eligibility | 断言「失败容器仍可删除」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ManageMachine 使用真实权限与共享动作结果 | 过渡或主机异常不可删除 | 已覆盖 | ../../../src/test/ManageMachineEligibility.test.jsx::test_q35_manage_machine_transition_delete_denied | 断言「过渡或主机异常不可删除」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ManageMachine 使用真实权限与共享动作结果 | 不用系统管理员标志伪造删除 | 已覆盖 | ../../../src/test/ManageMachineEligibility.test.jsx::test_q35_manage_machine_no_sysadmin_delete_bypass | 断言「不用系统管理员标志伪造删除」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ManageMachine 使用真实权限与共享动作结果 | 长期与解冻使用既有字段 | 已覆盖 | ../../../src/test/ManageMachineEligibility.test.jsx::test_q35_manage_machine_long_term_unpause_fields | 断言「长期与解冻使用既有字段」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ManageMachine 容器详情统一使用专用详情页 | 点击容器标题进入专用详情页 | 已覆盖 | ../../../src/test/ManageMachineDetailRefresh.test.jsx::test_q35_manage_machine_card_navigates_detail | 断言「点击容器标题进入专用详情页」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ManageMachine 容器详情统一使用专用详情页 | 删除确认取消不打开旧详情弹窗 | 已覆盖 | ../../../src/test/ManageMachineDetailRefresh.test.jsx::test_q35_manage_machine_cancel_delete_no_modal | 断言「删除确认取消不打开旧详情弹窗」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ManageMachine 容器详情统一使用专用详情页 | 源码不再引用旧弹窗链 | 已覆盖 | ../../../src/test/ManageMachineDetailRefresh.test.jsx::test_q35_manage_machine_no_legacy_modal | 断言「源码不再引用旧弹窗链」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ManageMachine 解冻后保留当前页与筛选并防止旧结果回拉 | 第二页解冻后仍在第二页 | 已覆盖 | ../../../src/test/ManageMachineDetailRefresh.test.jsx::test_q69_manage_machine_unpause_keeps_second_page | 断言「第二页解冻后仍在第二页」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ManageMachine 解冻后保留当前页与筛选并防止旧结果回拉 | 操作期间切页后旧刷新不回拉 | 已覆盖 | ../../../src/test/ManageMachineDetailRefresh.test.jsx::test_q69_manage_machine_unpause_switch_page_race | 断言「操作期间切页后旧刷新不回拉」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ManageMachine 解冻后保留当前页与筛选并防止旧结果回拉 | 解冻失败保留当前页 | 已覆盖 | ../../../src/test/ManageMachineDetailRefresh.test.jsx::test_q69_manage_machine_unpause_failure_keeps_page | 断言「解冻失败保留当前页」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |

## 最近验证

- 时间：2026-10-21 04:01:26 +08:00（固定提交npm test起始时间；本轮归档未重跑）。
- 版本：Web 代码 `a98e51d`；验收文档 `372fb80`。
- 主 spec SHA256：`5fc442954f0af2e8c2a1a34444b50244c15732f35d80fb7bbfb5e2737819ee77`。
- 命令与环境：固定版 `npm test`（Node v26.8.1）→ 64 files/605 + 40 tests，0 failed/0 skipped/0 todo；本 capability 定向证据：C 组 19 files/189（`.git/apply-worker-final3-web.log`）。
- 结果：新增/修改场景按上表具名测试或机械检查映射；未把 skip/excluded 或未运行项写成通过。
- 限制或尚未运行项：jsdom 组件测试；真实浏览器/E2E/视觉验收未运行；CI Node 20.19.0/22 未实际远程运行；本轮未重跑业务套件。
