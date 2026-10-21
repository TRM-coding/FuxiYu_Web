# ManageUserInTable 测试覆盖

规格：[spec.md](spec.md)

## 台账状态

- 主 spec SHA256：`2daadc1483728715e7ac4e98b85609225b599a4743a6febbea930cece6b91d16`
- 本轮映射：已覆盖 4；部分覆盖 0；待复核 8。
- 测试基线：固定版 Web 代码 `a98e51d`；验收文档 HEAD `372fb80`。本轮只同步文档，未重跑业务套件。
- 运行证据：C 组 19/189；`ManageUserInTable.test.jsx` 的 Q59/Q60 用例通过；固定版 `npm test` 64/605+40。
- 定向证据：C 组 19 files/189（`.git/apply-worker-final3-web.log`）。
- 限制：jsdom 组件测试；真实浏览器/E2E/视觉验收未运行；CI Node 20.19.0/22 未实际远程运行；本轮未重跑业务套件。

## 当前场景映射

| Requirement | Scenario | 覆盖状态 | 测试位置与 nodeid/参数 | 验证范围或缺口 |
| --- | --- | --- | --- | --- |
| ManageUserInTable 页面入口与身份 | 装配页面 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ManageUserInTable 主流程 | 展开一名用户 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ManageUserInTable 构建归属 | 生成生产产物 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ManageUserInTable 长期列只消费父级共享结果 | 父级结果优先 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ManageUserInTable 长期列只消费父级共享结果 | 资格未知或方向拒绝 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ManageUserInTable 长期列只消费父级共享结果 | 长期标记缺失或非法 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ManageUserInTable 长期列只消费父级共享结果 | 保存中与失败回滚 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ManageUserInTable 长期列只消费父级共享结果 | 无容器命令入口 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ManageUserInTable 用户表行操作不得改变选中行 | 点击编辑用户不改变选中行 | 已覆盖 | ../../../src/test/ManageUserInTable.test.jsx::test_q60_edit_action_does_not_select_row | 断言「点击编辑用户不改变选中行」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ManageUserInTable 用户表行操作不得改变选中行 | 删除、重置密码与权限组同样不冒泡 | 已覆盖 | ../../../src/test/ManageUserInTable.test.jsx::test_q60_other_actions_do_not_bubble | 断言「删除、重置密码与权限组同样不冒泡」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| 子容器分页按服务端 total 且父页保持 pageSize=4 | 六个子容器第二页可达第 5/6 个 | 已覆盖 | ../../../src/test/ManageUserInTable.test.jsx::test_q59_six_containers_second_page_reachable | 断言「六个子容器第二页可达第 5/6 个」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| 子容器分页按服务端 total 且父页保持 pageSize=4 | 服务端 total 不超过 4 不显示分页 | 已覆盖 | ../../../src/test/ManageUserInTable.test.jsx::test_q59_total_at_most_four_no_pagination | 断言「服务端 total 不超过 4 不显示分页」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |

## 最近验证

- 时间：2026-10-21 04:01:26 +08:00（固定提交npm test起始时间；本轮归档未重跑）。
- 版本：Web 代码 `a98e51d`；验收文档 `372fb80`。
- 主 spec SHA256：`2daadc1483728715e7ac4e98b85609225b599a4743a6febbea930cece6b91d16`。
- 命令与环境：固定版 `npm test`（Node v26.8.1）→ 64 files/605 + 40 tests，0 failed/0 skipped/0 todo；本 capability 定向证据：C 组 19 files/189（`.git/apply-worker-final3-web.log`）。
- 结果：新增/修改场景按上表具名测试或机械检查映射；未把 skip/excluded 或未运行项写成通过。
- 限制或尚未运行项：jsdom 组件测试；真实浏览器/E2E/视觉验收未运行；CI Node 20.19.0/22 未实际远程运行；本轮未重跑业务套件。
