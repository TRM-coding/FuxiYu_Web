# frontend--container-credentials 测试覆盖

规格：[spec.md](spec.md)

## 当前场景映射

| Requirement | Scenario | 覆盖状态 | 测试位置与 nodeid/参数 | 验证范围或缺口 |
| --- | --- | --- | --- | --- |
| 一次性凭据响应的结构校验 | 创建受理返回一项 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_credential_shape_and_counts | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 一次性凭据响应的结构校验 | 新增协作者受理返回一项 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_credential_shape_and_counts | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 一次性凭据响应的结构校验 | 详情页 ROOT 提升只返回 root | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_credential_shape_and_counts | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 一次性凭据响应的结构校验 | Home 交接常规两项 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_credential_shape_and_counts | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 一次性凭据响应的结构校验 | 历史多 ROOT 全部保留 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_credential_shape_and_counts | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 一次性凭据响应的结构校验 | 恢复成功返回 root 凭据 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_credential_shape_and_counts | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 一次性凭据响应的结构校验 | 凭据项只带 login_name | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_credential_shape_and_counts | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 一次性凭据响应的结构校验 | 登录名以响应为准 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_credential_shape_and_counts | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 旧响应与无凭据兼容 | 旧创建响应无凭据 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_credential_legacy_and_empty | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 旧响应与无凭据兼容 | 普通角色互换无凭据 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_credential_legacy_and_empty | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 旧响应与无凭据兼容 | 新流程缺少受理标志 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_credential_legacy_and_empty | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 凭据响应异常的脱敏 | 普通失败保留安全信息 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_credential_error_sanitization | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 凭据响应异常的脱敏 | 失败响应夹带密码 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_credential_error_sanitization | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 凭据响应异常的脱敏 | 安全 message 与密码同体 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_credential_error_sanitization | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 凭据响应异常的脱敏 | transfer_root:false 凭据不是恰好一项 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_credential_error_sanitization | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 凭据响应异常的脱敏 | transfer_root:true 凭据少于两项 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_credential_error_sanitization | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 受理前守卫与后台复核 | 前置守卫失败 | 已覆盖 | ../../../src/test/containerApiCredentials.test.js::test_guard_rejection_and_unknown_result | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 受理前守卫与后台复核 | 受理后最小复核 | 已覆盖 | ../../../src/test/containerApiCredentials.test.js::test_guard_rejection_and_unknown_result | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 受理前守卫与后台复核 | 后台结果未知 | 已覆盖 | ../../../src/test/containerApiCredentials.test.js::test_guard_rejection_and_unknown_result | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 审计复用且不重复记录 | 创建与新增协作者只留既有审计 | 已覆盖 | ../../../src/test/containerCredentialContract.test.js::test_audit_reuse_no_duplicate_logs | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 审计复用且不重复记录 | 重置使用固定操作码 | 已覆盖 | ../../../src/test/containerCredentialContract.test.js::test_audit_reuse_no_duplicate_logs | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 审计复用且不重复记录 | ROOT 各步沿用既有角色审计 | 已覆盖 | ../../../src/test/containerCredentialContract.test.js::test_audit_reuse_no_duplicate_logs | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 受控一次性密码弹窗 | 单凭据展示与复制 | 已覆盖 | ../../../src/test/CredentialModal.test.jsx::test_credential_modal_render_copy_close | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 受控一次性密码弹窗 | ROOT 交接两项展示 | 已覆盖 | ../../../src/test/CredentialModal.test.jsx::test_credential_modal_render_copy_close | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 受控一次性密码弹窗 | 关闭或卸载后不可再查看 | 已覆盖 | ../../../src/test/CredentialModal.test.jsx::test_credential_modal_render_copy_close | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 受控一次性密码弹窗 | 复制失败 | 已覆盖 | ../../../src/test/CredentialModal.test.jsx::test_credential_modal_render_copy_close | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 密码不进入持久化、日志与回查通道 | 打开与关闭弹窗无持久化 | 已覆盖 | ../../../src/test/CredentialModal.test.jsx::test_credential_no_persistence | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 密码不进入持久化、日志与回查通道 | 顶层 root_password 不进入 Web | 已覆盖 | ../../../src/test/CredentialModal.test.jsx::test_credential_no_persistence | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 密码不进入持久化、日志与回查通道 | 卸载不取消已受理任务 | 已覆盖 | ../../../src/test/CredentialModal.test.jsx::test_credential_no_persistence | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 密码不进入持久化、日志与回查通道 | 超时或断连不重复提交 | 已覆盖 | ../../../src/test/CredentialModal.test.jsx::test_credential_no_persistence | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 凭据入口统一且错误通道隔离 | 四个容器入口使用同一展示组件 | 已覆盖 | ../../../src/test/containerCredentialContract.test.js::test_credential_unified_entrances | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |
| 凭据入口统一且错误通道隔离 | 错误路径不显示密码 | 已覆盖 | ../../../src/test/containerCredentialContract.test.js::test_credential_unified_entrances | 实现阶段测试全绿；对应 change 的 77 files/686 tests + 40 入口测试，0 failed/0 skipped。 |

## 最近验证

- 时间：2026-10-24 +08:00（实现阶段验收；本轮归档仅同步文档，未重跑套件）。
- 版本：Web 实现提交 `f14a16f`；归档文档同步于 `2026-10-24-generate-container-passwords-once`。
- 主 spec SHA256：`e6cb07b85b7e1010b02dba61d55f3c675d5c24093a0012abd9e270ad6d9a767f`。
- 命令与环境：`npm test`（Node v26）→ Web 77 files/686 tests + 生产入口 40 tests，0 failed/0 skipped/0 todo；`npm run build` 成功（17.73s）。
- 结果：32/32 场景映射为具名 vitest 用例；本台账只覆盖 container-credentials 自身场景，不复制整个 change 的 83 行。
- 限制：jsdom 组件/契约测试；Ctrl/Node 真实跨仓 wire 由父代理与外部仓库验收，本仓不宣称真实生产验证。
