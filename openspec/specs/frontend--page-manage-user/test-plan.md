# ManageUser 测试覆盖

规格：[spec.md](spec.md)

## 台账状态

- 主 spec SHA256：`cc606a3143a8daf7dd28efa3096471fa68f754ee17a8a309b40c58acd7b33d1b`
- 本轮映射：已覆盖 8；部分覆盖 0；待复核 4。
- 测试基线：固定版 Web 代码 `a98e51d`；验收文档 HEAD `372fb80`。本轮只同步文档，未重跑业务套件。
- 运行证据：C 组 19/189；`ManageUserDetailLink.test.jsx` 与 `ManageUserEligibility.test.jsx` 的 Q35/Q36 用例通过；固定版 `npm test` 64/605+40。
- 定向证据：C 组 19 files/189（`.git/apply-worker-final3-web.log`）。
- 限制：jsdom 组件测试；真实浏览器/E2E/视觉验收未运行；CI Node 20.19.0/22 未实际远程运行；本轮未重跑业务套件。

## 当前场景映射

| Requirement | Scenario | 覆盖状态 | 测试位置与 nodeid/参数 | 验证范围或缺口 |
| --- | --- | --- | --- | --- |
| ManageUser 页面入口与身份 | 装配页面 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ManageUser 主流程 | 为用户替换权限组 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ManageUser 构建归属 | 生成生产产物 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ManageUser 静默刷新覆盖身份与容器操作字段 | 用户或关联容器业务字段变化 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ManageUser 容器动作使用共享结果且不新增删除入口 | 与其他页面同上下文一致 | 已覆盖 | ../../../src/test/ManageUserEligibility.test.jsx::test_q35_manage_user_shared_action_consistency | 断言「与其他页面同上下文一致」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ManageUser 容器动作使用共享结果且不新增删除入口 | 操作员与容器角色差异 | 已覆盖 | ../../../src/test/ManageUserEligibility.test.jsx::test_q35_manage_user_role_matrix | 断言「操作员与容器角色差异」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ManageUser 容器动作使用共享结果且不新增删除入口 | 长期使用既有字段 | 已覆盖 | ../../../src/test/ManageUserEligibility.test.jsx::test_q35_manage_user_long_term_fields | 断言「长期使用既有字段」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ManageUser 容器动作使用共享结果且不新增删除入口 | 卡片无删除入口与既有只读组件契约 | 已覆盖 | ../../../src/test/ManageUserEligibility.test.jsx::test_q35_manage_user_no_delete_or_modal_contract | 断言「卡片无删除入口与既有只读组件契约」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ManageUser 容器动作使用共享结果且不新增删除入口 | 解冻失败恢复 | 已覆盖 | ../../../src/test/ManageUserEligibility.test.jsx::test_q35_manage_user_unpause_failure_recovery | 断言「解冻失败恢复」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ManageUser 容器行只走专用详情路由并删除不可达弹窗 | 点击容器行进入专用详情页 | 已覆盖 | ../../../src/test/ManageUserDetailLink.test.jsx::test_q35_manage_user_container_row_navigates_detail | 断言「点击容器行进入专用详情页」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ManageUser 容器行只走专用详情路由并删除不可达弹窗 | 源码不再包含旧详情弹窗链 | 已覆盖 | ../../../src/test/ManageUserDetailLink.test.jsx::test_q36_manage_user_no_dead_detail_modal | 断言「源码不再包含旧详情弹窗链」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ManageUser 容器行只走专用详情路由并删除不可达弹窗 | 不新增用户管理页详情入口 | 已覆盖 | ../../../src/test/ManageUserDetailLink.test.jsx::test_q35_manage_user_no_new_detail_entry | 断言「不新增用户管理页详情入口」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |

## 最近验证

- 时间：2026-10-21 04:01:26 +08:00（固定提交npm test起始时间；本轮归档未重跑）。
- 版本：Web 代码 `a98e51d`；验收文档 `372fb80`。
- 主 spec SHA256：`cc606a3143a8daf7dd28efa3096471fa68f754ee17a8a309b40c58acd7b33d1b`。
- 命令与环境：固定版 `npm test`（Node v26.8.1）→ 64 files/605 + 40 tests，0 failed/0 skipped/0 todo；本 capability 定向证据：C 组 19 files/189（`.git/apply-worker-final3-web.log`）。
- 结果：新增/修改场景按上表具名测试或机械检查映射；未把 skip/excluded 或未运行项写成通过。
- 限制或尚未运行项：jsdom 组件测试；真实浏览器/E2E/视觉验收未运行；CI Node 20.19.0/22 未实际远程运行；本轮未重跑业务套件。
