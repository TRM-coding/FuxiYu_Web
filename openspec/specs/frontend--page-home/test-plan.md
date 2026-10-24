# Home 测试覆盖

规格：[spec.md](spec.md)

- 主 spec SHA256：`806cd31e12fd7126787ebc366e966e8c8e33c6c72be18e9680f5c9e4d706b4a3`（2026-10-24 ROOT 交接统一后）。

## 当前场景映射

| Requirement | Scenario | 覆盖状态 | 测试位置与 nodeid/参数 | 验证范围或缺口 |
| --- | --- | --- | --- | --- |
| Home 页面入口与身份 | 装配页面 | 待复核 | — | 既有路由装配未在本轮重新审计。 |
| Home 主流程 | 已受理停止或重启 | 待复核 | — | 既有动作/心跳场景未在本轮重新断言。 |
| Home 主流程 | 操作失败 | 待复核 | — | 既有错误路径未在本轮重新断言。 |
| Home 新增协作者凭据 | 新增 ADMIN 或 COLLABORATOR 后展示密码 | 部分覆盖 | ../../../src/test/EditUserModalPasswords.test.jsx::test_home_add_collaborator_credentials | 用例走默认 COLLABORATOR 新增；ADMIN 仅由同一处理器推断，未单独断言。 |
| Home 新增协作者凭据 | 新增失败或凭据异常 | 已覆盖 | ../../../src/test/EditUserModalPasswords.test.jsx::test_home_add_collaborator_credentials | 断言 rejection 不回调凭据、不显示“用户已添加”，只显示脱敏错误。 |
| Home ROOT 交接统一提交一次 | 只发一次无分支交接请求 | 已覆盖 | ../../../src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_sends_one_request_without_flag_and_receives_two_credentials | 断言只发一次 updateRole，请求体无 `transfer_root`，无旧 ROOT 降级调用。 |
| Home ROOT 交接双凭据且不伪装完成 | 人员弹窗关闭后展示全部凭据 | 已覆盖 | ../../../src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_preserves_n_plus_one_and_normal_role_swaps_password_free；../../../src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_modal_shows_owner_and_root_then_close_clears_passwords | 断言两项/N+1 凭据全部传入同一弹窗，不截断，不乐观改角色。 |
| Home ROOT 交接双凭据且不伪装完成 | 部分完成不伪报成功 | 待复核 | — | 未构造“旧 ROOT 已降、目标未升”的后台部分完成；保留缺口。 |
| Home ROOT 交接双凭据且不伪装完成 | 受理凭据少于两项、重复或字段非法 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_root_handover_rejects_short_duplicate_or_incomplete_credentials | 断言少于两项、空字段、重复 login_name/password 被拒，不弹密码。 |
| Home ROOT 交接双凭据且不伪装完成 | 交接失败 | 已覆盖 | ../../../src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_failure_reports_without_pretending_success | 断言 rejection 不回调凭据、不提示成功。 |
| Home ROOT 交接双凭据且不伪装完成 | 普通 ADMIN/COLLABORATOR 互换不生成密码 | 已覆盖 | ../../../src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_preserves_n_plus_one_and_normal_role_swaps_password_free | 断言普通角色 updateRole 无凭据、沿用“角色已更新”。 |
| Home ROOT 交接双凭据且不伪装完成 | 关闭弹窗清空全部密码 | 已覆盖 | ../../../src/test/EditUserModalPasswords.test.jsx::test_home_root_handover_modal_shows_owner_and_root_then_close_clears_passwords | 断言关闭后两项密码从 DOM 消失，localStorage/sessionStorage 为空。 |
| Home 构建归属 | 生成生产产物 | 已覆盖 | npm run build | 实现阶段 `npm run build` 成功（17.73s）。 |
| Home 静默刷新覆盖权限与展示变化 | 只改变角色或磁盘限额 | 待复核 | — | 既有 listRefresh 场景未在本轮重新断言。 |
| Home 容器动作使用共享纯函数结果 | 卡片与详情弹窗同源 | 待复核 | — | 既有动作资格场景未在本轮重新断言。 |
| Home 容器动作使用共享纯函数结果 | 长期超限或冻结残留 | 待复核 | — | 既有长期资格场景未在本轮重新断言。 |
| Home 容器动作使用共享纯函数结果 | 权限或只读上下文缺失 | 待复核 | — | 既有权限保守禁用场景未在本轮重新断言。 |
| Home 容器动作使用共享纯函数结果 | 提交前重解析 | 待复核 | — | 既有提交前资格重算场景未在本轮重新断言。 |
| Home 容器动作使用共享纯函数结果 | 解冻失败不伪造终态 | 待复核 | — | 既有失败不伪造终态场景未在本轮重新断言。 |

## 最近验证（2026-10-24 实现阶段历史）

- 时间：2026-10-24 +08:00（实现阶段验收；本轮归档仅同步文档，未重跑套件）。
- 版本：Web 实现提交 `f14a16f`；归档文档同步于 `2026-10-24-generate-container-passwords-once`。
- 主 spec SHA256：`14eb975298b7686859f25fad9acf0336e2b988bca525bdbc19f3a48d1a3c6ef1`。
- 命令与环境：`npm test`（Node v26）→ Web 77 files/686 tests + 生产入口 40 tests，0 failed/0 skipped/0 todo；`npm run build` 成功（17.73s）。
- 结果：本 change 新增 Home 人员凭据场景按实际用例映射；未覆盖的旧动作/部分完成场景保留待复核，不伪造通过。
- 限制：jsdom 组件测试；没有真实浏览器/真实 Ctrl/Node 链路的独立验证。

## 2026-10-24 ROOT 交接统一验证

- 时间：2026-10-24 +08:00。
- 版本：当前工作区未提交改动；Home 与详情页使用同一无 flag ROOT 交接。
- 主 spec SHA256：`806cd31e12fd7126787ebc366e966e8c8e33c6c72be18e9680f5c9e4d706b4a3`。
- RED：焦点 6 files / 30 tests 中 11 failed / 19 passed；Home 失败为请求仍带 `transfer_root:true`，以及 ROOT 两项凭据/关闭清密用例未通过。
- GREEN：Home 焦点用例通过；断言只发一次 `update_role`、请求体无 `transfer_root`、两项/N+1 凭据全部进入同一弹窗、受理后本地角色不乐观改写、关闭后 DOM/localStorage/sessionStorage 无密码。
- 全量：`npm test` 通过 Web 78 files/708 tests + server 40 tests（0 failed/0 skipped）；`npm run build` 15.17s 通过；`npm run lint` 通过；`openspec validate --specs --strict` 28/28 通过。
- 限制：jsdom 测试；未验证真实 Ctrl 后台部分完成/失败时序；未操作真实 DB。
- 日志：`E:/AI/Fuxi_audit_artifacts/root-handover-2026-10-24/`。
