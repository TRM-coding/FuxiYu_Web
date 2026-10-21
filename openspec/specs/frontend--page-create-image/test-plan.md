# CreateImage 测试覆盖

规格：[spec.md](spec.md)

## 台账状态

- 主 spec SHA256：`0e2cc9b142ff5ad03af5f8f0e8ce8c5a106026aae1e24cf03982e022e25e0216`
- 本轮映射：已覆盖 8；部分覆盖 0；待复核 7。
- 测试基线：固定版 Web 代码 `a98e51d`；验收文档 HEAD `372fb80`。本轮只同步文档，未重跑业务套件。
- 运行证据：B 组 9/144；`CreateImage.test.jsx` 的 Q22/Q37/Q63/Q64 用例通过；固定版 `npm test` 64/605+40。
- 定向证据：B 组 9 files/144（`.git/parent-b-acceptance.log`）。
- 限制：jsdom 组件测试；真实浏览器/E2E/视觉验收未运行；CI Node 20.19.0/22 未实际远程运行；本轮未重跑业务套件。

## 当前场景映射

| Requirement | Scenario | 覆盖状态 | 测试位置与 nodeid/参数 | 验证范围或缺口 |
| --- | --- | --- | --- | --- |
| CreateImage 页面入口与身份 | 装配页面 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| CreateImage 主流程 | 清空启动命令并保存 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| CreateImage 构建归属 | 生成生产产物 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| 镜像资源通配管理范围 | 默认操作员跨所有者编辑 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| 镜像资源通配管理范围 | 方法通配不扩展资源 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| 仅看我的按创建者过滤 | 通配者切换筛选 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| 仅看我的按创建者过滤 | 被授权查看的他人模板 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| CreateImage 关键词列表只应用当前上下文 | 当前关键词响应应用 | 已覆盖 | ../../../src/test/CreateImage.test.jsx::test_q22_create_image_current_keyword | 断言「当前关键词响应应用」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| CreateImage 关键词列表只应用当前上下文 | 旧关键词响应晚到 | 已覆盖 | ../../../src/test/CreateImage.test.jsx::test_q22_create_image_stale_keyword | 断言「旧关键词响应晚到」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| CreateImage 新建成功后清空关键词、空词重取、选中新项并保留表单 | 非匹配关键词下新建成功 | 已覆盖 | ../../../src/test/CreateImage.test.jsx::test_q63_create_image_clear_keyword_select_new | 断言「非匹配关键词下新建成功」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| CreateImage 新建成功后清空关键词、空词重取、选中新项并保留表单 | 空词重取失败仍保留表单 | 已覆盖 | ../../../src/test/CreateImage.test.jsx::test_q63_create_image_reload_failure_preserves_form | 断言「空词重取失败仍保留表单」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| CreateImage 更新成功后重新读取左侧列表 | 更新成功重取列表 | 已覆盖 | ../../../src/test/CreateImage.test.jsx::test_q64_create_image_update_refetches_list | 断言「更新成功重取列表」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| CreateImage 更新成功后重新读取左侧列表 | 更新失败保留旧列表 | 已覆盖 | ../../../src/test/CreateImage.test.jsx::test_q64_create_image_update_failure_keeps_list | 断言「更新失败保留旧列表」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| CreateImage 镜像错误原因按现有协议映射 | 已知镜像原因展示中文 | 已覆盖 | ../../../src/test/CreateImage.test.jsx::test_q37_create_image_known_reasons | 断言「已知镜像原因展示中文」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| CreateImage 镜像错误原因按现有协议映射 | 未登记镜像原因保留兜底 | 已覆盖 | ../../../src/test/CreateImage.test.jsx::test_q37_create_image_unknown_reason | 断言「未登记镜像原因保留兜底」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |

## 最近验证

- 时间：2026-10-21 04:01:26 +08:00（固定提交npm test起始时间；本轮归档未重跑）。
- 版本：Web 代码 `a98e51d`；验收文档 `372fb80`。
- 主 spec SHA256：`0e2cc9b142ff5ad03af5f8f0e8ce8c5a106026aae1e24cf03982e022e25e0216`。
- 命令与环境：固定版 `npm test`（Node v26.8.1）→ 64 files/605 + 40 tests，0 failed/0 skipped/0 todo；本 capability 定向证据：B 组 9 files/144（`.git/parent-b-acceptance.log`）。
- 结果：新增/修改场景按上表具名测试或机械检查映射；未把 skip/excluded 或未运行项写成通过。
- 限制或尚未运行项：jsdom 组件测试；真实浏览器/E2E/视觉验收未运行；CI Node 20.19.0/22 未实际远程运行；本轮未重跑业务套件。
