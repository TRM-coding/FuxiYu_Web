# AnnouncementEditor 测试覆盖

规格：[spec.md](spec.md)

## 台账状态

- 主 spec SHA256：`10bbf61041aeb63761a4a2383fdd477d98dec6caa768c569de5917909bc2feb5`
- 本轮映射：已覆盖 9；部分覆盖 1；待复核 5。
- 测试基线：固定版 Web 代码 `a98e51d`；验收文档 HEAD `372fb80`。本轮只同步文档，未重跑业务套件。
- 运行证据：A 组 9 files/78；`AnnouncementEditor.test.jsx` 的 Q22/Q24/Q52/Q55 用例通过；固定版 `npm test` 64/605+40。
- 定向证据：A 组 9 files/78（`.git/q28-handoff-a9-78-tests.log`）。
- 限制：jsdom 组件测试；真实浏览器/E2E/视觉验收未运行；CI Node 20.19.0/22 未实际远程运行；本轮未重跑业务套件。

## 当前场景映射

| Requirement | Scenario | 覆盖状态 | 测试位置与 nodeid/参数 | 验证范围或缺口 |
| --- | --- | --- | --- | --- |
| AnnouncementEditor 页面入口与身份 | 装配页面 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| AnnouncementEditor 主流程 | 保存草稿成功 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| AnnouncementEditor 主流程 | 清空模板选择 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| AnnouncementEditor 主流程 | 模板变化后打开草稿 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| AnnouncementEditor 构建归属 | 生成生产产物 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| AnnouncementEditor 机器和容器独立选择并各自保护列表与详情请求 | 首屏请求第 0 页 | 已覆盖 | ../../../src/test/AnnouncementEditor.test.jsx::test_q24_announcement_first_page_zero | 断言「首屏请求第 0 页」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| AnnouncementEditor 机器和容器独立选择并各自保护列表与详情请求 | 机器切换保留独立容器选择 | 已覆盖 | ../../../src/test/AnnouncementEditor.test.jsx::test_q22_announcement_independent_selectors | 断言「机器切换保留独立容器选择」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| AnnouncementEditor 机器和容器独立选择并各自保护列表与详情请求 | 同一选择器旧列表响应晚到 | 已覆盖 | ../../../src/test/AnnouncementEditor.test.jsx::test_q22_announcement_stale_container | 断言「同一选择器旧列表响应晚到」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| AnnouncementEditor 机器和容器独立选择并各自保护列表与详情请求 | 旧机器或容器详情响应晚到 | 已覆盖 | ../../../src/test/AnnouncementEditor.test.jsx::test_q22_announcement_stale_detail | 断言「旧机器或容器详情响应晚到」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| AnnouncementEditor 机器和容器独立选择并各自保护列表与详情请求 | 卸载后旧列表或详情响应不应用 | 部分覆盖 | ../../../src/test/AnnouncementEditor.test.jsx::test_q22_announcement_unmount_no_apply | 部分覆盖：测试验证无页面级错误/act 副作用、重挂后无旧数据泄漏、新实例数据可应用；源码审计 `mountedRef`/`cancelled`，不夸称直接观测 React no-op setState。 |
| AnnouncementEditor 模板下拉分页与编辑深链 | 205 个模板可加载到第 205 个 | 已覆盖 | ../../../src/test/AnnouncementEditor.test.jsx::test_q52_announcement_template_205 | 断言「205 个模板可加载到第 205 个」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| AnnouncementEditor 模板下拉分页与编辑深链 | 编辑此模板携带模板 ID | 已覆盖 | ../../../src/test/AnnouncementEditor.test.jsx::test_q52_announcement_edit_template_link | 断言「编辑此模板携带模板 ID」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| AnnouncementEditor 模板下拉分页与编辑深链 | 加载更多失败保留已加载项 | 已覆盖 | ../../../src/test/AnnouncementEditor.test.jsx::test_q52_announcement_load_more_failure | 断言「加载更多失败保留已加载项」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| AnnouncementEditor 光标插入保留原选区 | 保持焦点时替换选区 | 已覆盖 | ../../../src/test/AnnouncementEditor.test.jsx::test_q55_announcement_insert_selection | 断言「保持焦点时替换选区」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| AnnouncementEditor 光标插入保留原选区 | 按钮夺焦后仍插入原选区 | 已覆盖 | ../../../src/test/AnnouncementEditor.test.jsx::test_q55_announcement_insert_after_blur | 断言「按钮夺焦后仍插入原选区」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |

## 最近验证

- 时间：2026-10-21 04:01:26 +08:00（固定提交npm test起始时间；本轮归档未重跑）。
- 版本：Web 代码 `a98e51d`；验收文档 `372fb80`。
- 主 spec SHA256：`10bbf61041aeb63761a4a2383fdd477d98dec6caa768c569de5917909bc2feb5`。
- 命令与环境：固定版 `npm test`（Node v26.8.1）→ 64 files/605 + 40 tests，0 failed/0 skipped/0 todo；本 capability 定向证据：A 组 9 files/78（`.git/q28-handoff-a9-78-tests.log`）。
- 结果：新增/修改场景按上表具名测试或机械检查映射；未把 skip/excluded 或未运行项写成通过。
- 限制或尚未运行项：jsdom 组件测试；真实浏览器/E2E/视觉验收未运行；CI Node 20.19.0/22 未实际远程运行；本轮未重跑业务套件。
