# CreateContainer 测试覆盖

规格：[spec.md](spec.md)

## 当前场景映射

| Requirement | Scenario | 覆盖状态 | 测试位置与 nodeid/参数 | 验证范围或缺口 |
| --- | --- | --- | --- | --- |
| CreateContainer 页面入口与身份 | 装配页面 | 待复核 | — | 既有路由装配未在本轮重新审计；保留旧契约缺口。 |
| CreateContainer 主流程 | 内存 4 GB、共享内存 8 GB | 待复核 | — | 既有资源限额交互未在本轮重新断言。 |
| CreateContainer 主流程 | 内存 32 GB、共享内存 16 GB | 待复核 | — | 既有资源限额交互未在本轮重新断言。 |
| CreateContainer 主流程 | 模板不在可用集合内 | 待复核 | — | 既有模板过滤未在本轮重新断言。 |
| 创建受理后立即展示一次性 root 密码 | 从主导航创建并立即拿到密码 | 已覆盖 | ../../../src/test/CreateContainerPassword.test.jsx::test_create_accepts_credentials_and_navigation | 断言接收 accepted + root 凭据后先弹窗、关闭后才导航并携带 startHeartbeat。 |
| 创建受理后立即展示一次性 root 密码 | 机器页带入机器与旧 Apply 重定向复用同一机制 | 待复核 | — | 新用例覆盖主导航提交处理器；机器页预选与旧 Apply 重定向未单独断言。 |
| 创建受理后立即展示一次性 root 密码 | 旧响应没有凭据 | 已覆盖 | ../../../src/test/CreateContainerPassword.test.jsx::test_create_accepts_credentials_and_navigation | 断言旧式 success/message 不带凭据时保持原导航、不伪造密码。 |
| 创建受理后立即展示一次性 root 密码 | 已受理但凭据缺失或非法 | 已覆盖 | ../../../src/test/CreateContainerPassword.test.jsx::test_create_accepts_credentials_and_navigation | 断言 parser rejection 下不导航、不显示密码。 |
| 创建受理后立即展示一次性 root 密码 | 创建失败夹带密码 | 已覆盖 | ../../../src/test/CreateContainerPassword.test.jsx::test_create_error_safe_message | 断言只显示脱敏状态/原因，不出现密码或原始 body。 |
| 创建受理后立即展示一次性 root 密码 | 关闭或离开页面后密码不可回看 | 部分覆盖 | ../../../src/test/CredentialModal.test.jsx::test_credential_modal_render_copy_close | 共享弹窗关闭清空已断言；创建页路由卸载后的不落盘未单独断言。 |
| CreateContainer 配额上限分层与共享内存联动 | 上限未知 | 待复核 | — | 既有配额 UI 未在本轮重新断言。 |
| CreateContainer 配额上限分层与共享内存联动 | 上限为 0 | 待复核 | — | 既有配额 UI 未在本轮重新断言。 |
| CreateContainer 配额上限分层与共享内存联动 | 降低内存后重算 | 待复核 | — | 既有配额 UI 未在本轮重新断言。 |
| CreateContainer 配额上限分层与共享内存联动 | 切换机器后重算 | 待复核 | — | 既有配额 UI 未在本轮重新断言。 |
| CreateContainer 提交前超限阻断 | 期望内存超过已知上限 | 待复核 | — | 既有提交前阻断未在本轮重新断言。 |
| CreateContainer 提交前超限阻断 | 共享内存超过本次申请内存 | 待复核 | — | 既有提交前阻断未在本轮重新断言。 |
| CreateContainer 创建失败的错误呈现 | invalid_config 带具体数值 | 已覆盖 | ../../../src/test/CreateContainerPassword.test.jsx::test_create_error_safe_message | 断言安全 message 的 8GB/4GB 保留，无密码泄露。 |
| CreateContainer 创建失败的错误呈现 | 机器离线 | 待复核 | — | 既有错误映射未在本轮重新断言。 |
| CreateContainer 创建失败的错误呈现 | 创建权限不足 | 待复核 | — | 既有 403 处理未在本轮重新断言。 |
| CreateContainer 创建失败的错误呈现 | 失败响应夹带凭据字段 | 已覆盖 | ../../../src/test/containerApiCredentials.test.js::test_guard_rejection_and_unknown_result | 断言失败响应含 credentials 时错误对象无 secret/body，安全原因保留。 |
| CreateContainer 构建归属 | 生成生产产物 | 已覆盖 | npm run build | 实现阶段 `npm run build` 成功（17.73s）；不是组件测试。 |

## 最近验证

- 时间：2026-10-24 +08:00（实现阶段验收；本轮归档仅同步文档，未重跑套件）。
- 版本：Web 实现提交 `f14a16f`；归档文档同步于 `2026-10-24-generate-container-passwords-once`。
- 主 spec SHA256：`cd0daf57c0af35b43a0562daf9f7fa4732dce76c8b836a0bc63b8a21d77a3d33`。
- 命令与环境：`npm test`（Node v26）→ Web 77 files/686 tests + 生产入口 40 tests，0 failed/0 skipped/0 todo；`npm run build` 成功（17.73s）。
- 结果：本 change 新增 6 个创建凭据场景和失败夹带凭据场景映射为具名用例；旧配额/模板/错误场景保留待复核，不伪造已覆盖。
- 限制：jsdom 组件测试；机器页预选/旧 Apply 重定向与真实浏览器未单独复跑；Ctrl/Node 真实链路由外部仓库验收。
