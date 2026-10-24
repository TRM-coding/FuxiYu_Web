# frontend--authentication 测试覆盖

规格：[spec.md](spec.md)

## 台账状态

- 主 spec SHA256：`1b66f2a9bd1bb6ec66bc61537eb87fb70d1ee6aa2c5b7a7fae5828fa0dda0318`
- 本轮映射：已覆盖 8；部分覆盖 0；待复核 5。
- 测试基线：固定版 Web 代码 `a98e51d`；验收文档 HEAD `372fb80`。本轮只同步文档，未重跑业务套件。
- 运行证据：`npm test`（Node v26.8.1，a98e51d）→ 64 files/605 + 40，0 failed/0 skipped；本 capability 的 Q27 用例在 B 组 9/144 中通过。
- 定向证据：B 组 9 files/144（`.git/parent-b-acceptance.log`）。
- 限制：jsdom 组件测试；真实浏览器/E2E/视觉验收未运行；CI Node 20.19.0/22 未实际远程运行；本轮未重跑业务套件。

## 当前场景映射

| Requirement | Scenario | 覆盖状态 | 测试位置与 nodeid/参数 | 验证范围或缺口 |
| --- | --- | --- | --- | --- |
| 仅认证失效触发全局身份清理 | 有效身份遇到业务拒绝 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| 仅认证失效触发全局身份清理 | 认证失效 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| 仅认证失效触发全局身份清理 | 公开页静默身份探测 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| 镜像资源能力独立于方法权限展开 | 相同方法列表但资源能力不同 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| 镜像资源能力独立于方法权限展开 | 换账号或清空身份 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| 容器资源能力独立于方法权限展开 | 相同方法列表但容器资源能力不同 | 已覆盖 | ../../../src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability | 断言资源位 true/false 随权限快照刷新；直持 manage 与仅方法通配不等同。 |
| 容器资源能力独立于方法权限展开 | 直持资源通配 | 已覆盖 | ../../../src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability | 断言资源通配下 reset 资格可见；不要求 ROOT 绑定。 |
| 容器资源能力独立于方法权限展开 | 字段缺失或旧后端 | 已覆盖 | ../../../src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability | 断言缺字段规范化为 false，不从 entities 反推。 |
| 容器资源能力独立于方法权限展开 | 换账号或清空身份 | 已覆盖 | ../../../src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability | 断言 refresh 换用户与 clear 后 False，不残留旧账号资源位。 |
| 容器资源能力独立于方法权限展开 | 方法通配不得单独放行 | 已覆盖 | ../../../src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability | 断言缺少方法权限时 reset 谓词 visible=false；bypass_auth_entity 不单独放行。 |
| 权限查询必须在 finally 注销控制器 | 成功返回后释放控制器 | 已覆盖 | ../../../src/test/permissionControllerRelease.test.js::test_q27_success_unregisters_controller | 断言「成功返回后释放控制器」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| 权限查询必须在 finally 注销控制器 | 401 或异常返回后释放控制器 | 已覆盖 | ../../../src/test/permissionControllerRelease.test.js::test_q27_error_unregisters_controller | 断言「401 或异常返回后释放控制器」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |
| 权限查询必须在 finally 注销控制器 | 连续查询不积累控制器 | 已覆盖 | ../../../src/test/permissionControllerRelease.test.js::test_q27_repeated_queries_no_accumulation | 断言「连续查询不积累控制器」的 WHEN/THEN；固定版 a98e51d 全套件 64/605+40 通过（0 skip）。 |

## 最近验证

- 时间：2026-10-21 04:01:26 +08:00（固定提交npm test起始时间；本轮归档未重跑）。
- 版本：Web 代码 `a98e51d`；验收文档 `372fb80`。
- 主 spec SHA256：`7a548b793dcf85c49d97c7268a85af1f049e5304c37f35d11463d64fd9c1107d`。
- 命令与环境：固定版 `npm test`（Node v26.8.1）→ 64 files/605 + 40 tests，0 failed/0 skipped/0 todo；本 capability 定向证据：B 组 9 files/144（`.git/parent-b-acceptance.log`）。
- 结果：新增/修改场景按上表具名测试或机械检查映射；未把 skip/excluded 或未运行项写成通过。
- 限制或尚未运行项：jsdom 组件测试；真实浏览器/E2E/视觉验收未运行；CI Node 20.19.0/22 未实际远程运行；本轮未重跑业务套件。

## 2026-10-24 增量验证

- 主 spec SHA256：`1b66f2a9bd1bb6ec66bc61537eb87fb70d1ee6aa2c5b7a7fae5828fa0dda0318`。
- 版本：Web 实现提交 `f14a16f`（实现阶段提交；本轮仅文档同步，未重跑套件）。
- 命令与环境：全量证据沿用 `npm test`（Node v26）→ Web 77 files/686 tests + server 40 tests，0 failed/0 skipped；关联定向 `ContainerResourcePermission.test.jsx`。
- 结果：新增 5 个容器资源位场景映射为 3 个具名 vitest 用例的真实断言；旧 5 个待复核项与 a98e51d 历史证据保留。
- 限制：未运行真实浏览器/E2E；本轮不重复全量，引用实现阶段同版本证据。
