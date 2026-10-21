# ContainerDetailPage 测试覆盖

规格：[spec.md](spec.md)

## 台账状态

- 主 spec SHA256：`13e305cf7ea8ce156c9316d6483ef83177b603bb03bb4f74b6372664a5fc56e5`
- 本轮映射：已覆盖 10；部分覆盖 0；待复核 9。
- 测试基线：固定版 Web 代码 `a98e51d`；验收文档 HEAD `372fb80`。本轮只同步文档，未重跑业务套件。
- 运行证据：C 组 19/189；Q61 6/58；change1 定向 6/57；固定版 `npm test` 64/605+40。
- 定向证据：C 组 19 files/189 + Q61 6 files/58；change1 定向 6 files/57。
- 限制：jsdom 组件测试；真实浏览器/E2E/视觉验收未运行；CI Node 20.19.0/22 未实际远程运行；本轮未重跑业务套件。

## 当前场景映射

| Requirement | Scenario | 覆盖状态 | 测试位置与 nodeid/参数 | 验证范围或缺口 |
| --- | --- | --- | --- | --- |
| ContainerDetailPage 页面入口与身份 | 装配页面 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ContainerDetailPage 主流程 | 启动已受理 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ContainerDetailPage 构建归属 | 生成生产产物 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ContainerDetailPage 容器动作使用共享结果 | 与其他页面同上下文一致 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ContainerDetailPage 容器动作使用共享结果 | 失败容器可删除、过渡态不可删除 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ContainerDetailPage 容器动作使用共享结果 | 长期配额、磁盘与冻结残留 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ContainerDetailPage 容器动作使用共享结果 | 提交前重解析 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ContainerDetailPage 容器动作使用共享结果 | 解冻或启动失败不覆盖权威终态 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ContainerDetailPage 容器动作使用共享结果 | 动作确认弹窗不另建资格 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| ContainerDetailPage 展示并复制既有宿主 bind 路径 | 有记录时完整展示与复制 | 已覆盖 | ../../../src/test/ContainerDetailDisplay.test.jsx::test_bind_path_and_resources_render_in_runtime_metrics | 断言「有记录时完整展示与复制」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ContainerDetailPage 展示并复制既有宿主 bind 路径 | 空值或旧 Ctrl 缺字段 | 已覆盖 | ../../../src/test/ContainerDetailDisplay.test.jsx::test_missing_bind_path_uses_unrecorded_placeholder_without_request | 断言「空值或旧 Ctrl 缺字段」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ContainerDetailPage 展示并复制既有宿主 bind 路径 | 最近记录与实时核对的区别 | 已覆盖 | ../../../src/test/ContainerDetailDisplay.test.jsx::test_bind_path_is_labeled_as_recent_record | 断言「最近记录与实时核对的区别」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ContainerDetailPage 展示并复制既有宿主 bind 路径 | 复制失败 | 已覆盖 | ../../../src/test/ContainerDetailDisplay.test.jsx::test_bind_path_copy_failure_preserves_value | 断言「复制失败」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ContainerDetailPage 运行指标资源归属 | 资源字段放入运行指标 | 已覆盖 | ../../../src/test/ContainerDetailDisplay.test.jsx::test_gpu_and_shared_memory_are_not_rendered_in_image_card | 断言「资源字段放入运行指标」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ContainerDetailPage 运行指标资源归属 | 资源值缺失或为零 | 已覆盖 | ../../../src/test/ContainerDetailDisplay.test.jsx::test_zero_resource_is_distinct_from_missing_resource | 断言「资源值缺失或为零」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ContainerDetailPage 运行指标资源归属 | 镜像内容缺失 | 已覆盖 | ../../../src/test/ContainerDetailDisplay.test.jsx::test_missing_image_and_dockerfile_use_explicit_placeholders | 断言「镜像内容缺失」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ContainerDetailPage 操作历史随事实刷新 | 点击刷新按钮重取历史 | 已覆盖 | ../../../src/test/ContainerDetailHistory.test.jsx::test_q61_refresh_button_refetches_history | 断言「点击刷新按钮重取历史」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ContainerDetailPage 操作历史随事实刷新 | 操作成功后历史包含最新事实 | 已覆盖 | ../../../src/test/ContainerDetailHistory.test.jsx::test_q61_action_success_refetches_history | 断言「操作成功后历史包含最新事实」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| ContainerDetailPage 操作历史随事实刷新 | 操作失败不追加成功历史 | 已覆盖 | ../../../src/test/ContainerDetailHistory.test.jsx::test_q61_action_failure_no_success_history | 断言「操作失败不追加成功历史」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |

## 最近验证

- 时间：2026-10-21 04:01:26 +08:00（固定提交npm test起始时间；本轮归档未重跑）。
- 版本：Web 代码 `a98e51d`；验收文档 `372fb80`。
- 主 spec SHA256：`13e305cf7ea8ce156c9316d6483ef83177b603bb03bb4f74b6372664a5fc56e5`。
- 命令与环境：固定版 `npm test`（Node v26.8.1）→ 64 files/605 + 40 tests，0 failed/0 skipped/0 todo；本 capability 定向证据：C 组 19 files/189 + Q61 6 files/58；change1 定向 6 files/57。
- 结果：新增/修改场景按上表具名测试或机械检查映射；未把 skip/excluded 或未运行项写成通过。
- 限制或尚未运行项：jsdom 组件测试；真实浏览器/E2E/视觉验收未运行；CI Node 20.19.0/22 未实际远程运行；本轮未重跑业务套件。
