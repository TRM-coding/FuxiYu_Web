# ContainerDetailPage 测试覆盖

规格：[spec.md](spec.md)

## 台账状态

- 主 spec SHA256：`2f0fe32c4f66c24d316e3952cfbd8f15c6435676ed45fc911af80f526200feb2`
- 历史映射：已覆盖 10；部分覆盖 4；待复核 9；2026-10-24 增量 25 行见文末。
- 测试基线：当前工作区最终实现；本轮同步新增窄屏布局场景，并保留 a98e51d 的历史测试记录。
- 运行证据：父代理最终 `npm test` 68 files / 652 tests + server 40 tests，0 failed；本 capability 既有定向证据 C 组 19 files/189、Q61 6 files/58、change1 6 files/57。
- 真实浏览器：父代理 26 cases / 315 checks 全部通过，`verified-complete/results.json` 的 sourceHashes 与当前实现一致；旧 468px 失败保留为历史。
- 限制：jsdom 组件测试和 CSS 契约测试不计算真实 `scrollWidth`；真实 320/390/768/1440 宽度由外部浏览器结果补足；CI Node 20.19.0/22 未在本轮实际远程运行。

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

| ContainerDetailPage 窄屏布局不横向溢出且长内容可读 | 390px 长标题与长 bind 路径 | 部分覆盖 | ../../../src/test/DetailPagesLayout.test.js::tc_container_css_01_390_title_path | 断言共享网格/标题/复制块 CSS 契约；真实 390px `scrollWidth` 与复制由父代理外部 26/315 补足。 |
| ContainerDetailPage 窄屏布局不横向溢出且长内容可读 | 320px 长运行指标文案 | 部分覆盖 | ../../../src/test/DetailPagesLayout.test.js::tc_container_css_02_320_metrics | 断言指标换行/收缩 CSS 契约；真实 320px 宽度由外部 26/315 补足。 |
| ContainerDetailPage 窄屏布局不横向溢出且长内容可读 | 768px 与桌面的共享布局 | 部分覆盖 | ../../../src/test/DetailPagesLayout.test.js::tc_container_css_03_768_desktop | 断言共享 `minmax(min(460px, 100%), 1fr)` 与换行边界；真实 768/1440 布局由外部 26/315 补足。 |
| ContainerDetailPage 窄屏布局不横向溢出且长内容可读 | 缺少 bind 路径或存在无空格长串 | 部分覆盖 | ../../../src/test/ContainerDetailBindPath.test.jsx::it.each(%s 显示未记录且没有复制候选)；../../../src/test/DetailPagesLayout.test.js::tc_container_css_01_390_title_path | 缺失路径由组件测试覆盖；长串与 320px 无溢出由 CSS 契约和外部 26/315 补足。 |

## 最近验证

- 时间：2026-10-21 15:38 +08:00（父代理最终全量）；历史记录保留 2026-10-21 04:01:26 的 a98e51d 基线。
- 版本：当前工作区最终实现；历史基线 `a98e51d`。
- 主 spec SHA256：`14c4ad545eb63165805bf7ddf8c7732f0f57b69543af0d5798ffa05dc8adb54b`。
- 命令与环境：父代理 `npm test` → 前端 68 files/652 tests、server 40 tests，0 failed；`final-table-contract.log` 19 通过；本 capability 历史定向证据 C 组 19 files/189、Q61 6 files/58、change1 6 files/57 保留。
- 结果：新增/修改场景按上表具名测试或机械检查映射；新布局场景标“部分覆盖”，不把 CSS 契约测试写成真实像素通过。
- 稳定性：本会话第 15/16 次全量遇到既有用例 5 秒超时，单 worker 28 项通过，父代理最终全量通过；原因未充分证明，保留 warning。
- 本段限制：jsdom/CSS 契约测试；真实浏览器补充见下；CI Node 20.19.0/22 未实际远程运行。

## 真实浏览器渲染审计（历史与当前）

### 历史基线（2026-10-21）

- 基线：`e659c22`，页面源码未改。临时审计脚本与产物已移至仓库外，不作为仓库内测试依赖。
- 用例：`detail-desktop`、`detail-mobile`、`detail-missing-path`；真实 Chromium 153，1440px/390px，固定 API 夹具。
- 增量证据：运行指标的 GPU/共享内存归属、镜像卡去重、长中文空格路径完整复制到真实剪贴板、缺路径无复制控件、刷新及在线启动禁用已直接检查。
- 历史运行结果：桌面通过；两个窄屏用例均因页面宽度 `468px > 390px` 失败。复制与字段归属断言通过，当时不能据此写成窄屏布局通过。
- 历史缺陷：共享详情网格的最小列宽超过窄屏宽度；该缺陷是本 change 的修复对象，以下当前证据显示已收敛，不再作为当前未修复状态。

### 当前补验（父代理，2026-10-21 15:38 之后）

- 真实 Chromium 26 cases / 315 checks 全部通过，覆盖 320/390/768/1440px；`verified-complete/results.json` 的 sourceHashes 与当前实现一致。
- 当前 `detail` 用例覆盖 390/320 长标题、长 bind 路径真实复制、320 长指标、768/1440 共享布局、缺路径无复制控件，均通过。
- 父代理最终 `npm test` 68 files/652 tests + server 40 tests 全部通过；本会话第 15/16 次全量遇到既有 `HomeEligibility`/`DeletedContainersMountUsage` 5 秒超时，单 worker 28 项通过，父代理最终全量通过；原因未充分证明，保留 warning。
- 未覆盖：真实后端、真实设备、其他浏览器、全部历史场景；当前通过证据只对应上述 26 cases/315 checks 与当前源码 hash。

## 2026-10-24 容器凭据增量映射

| Requirement | Scenario | 覆盖状态 | 测试位置与 nodeid/参数 | 验证范围或缺口 |
| --- | --- | --- | --- | --- |
| 新增协作者凭据与不乐观加入 | 新增 ADMIN 协作者 | 部分覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_add_collaborator_credentials | 当前用例走 COLLABORATOR 新增路径；ADMIN 仅由同一处理器推断，未单独断言。 |
| 新增协作者凭据与不乐观加入 | 新增 COLLABORATOR 协作者 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_add_collaborator_credentials | 断言返回一项凭据、弹窗文案、无“用户已添加”提示且不乐观插入。 |
| 新增协作者凭据与不乐观加入 | 新增受理失败或凭据异常 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_add_collaborator_credentials | 追加 422 rejection：不展示凭据、不显示成功提示、只调用 showErrorModal。 |
| 账号卡密码重置入口与权限 | ROOT 本人可见 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_permission_guards | 断言 ROOT 本人渲染两个账号的重置按钮。 |
| 账号卡密码重置入口与权限 | 资源管理通配者可见 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_permission_guards | 断言资源通配、非 ROOT 时仍显示按钮。 |
| 账号卡密码重置入口与权限 | ADMIN、COLLABORATOR 与方法通配不得放行 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_permission_guards | 断言普通管理员/协作者/无资源位时不显示按钮。 |
| 账号卡密码重置入口与权限 | 缺少 container:operation 方法层守卫 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_permission_guards | 断言 entities 无 container:operation 时按钮不出现。 |
| 账号卡密码重置入口与权限 | 容器不在线或主机不可用 | 已覆盖 | ../../../src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability | helper 断言 offline 时 visible=true、enabled=false；详情页沿用同一谓词。 |
| 账号卡密码重置入口与权限 | 目标绑定缺少 user_id 或提交前变化 | 待复核 | — | 当前 UI 用例未构造缺 user_id 或确认前状态变化；保留缺口。 |
| 账号卡密码重置入口与权限 | 不得回退到默认密码 | 已覆盖 | ../../../src/test/containerApiCredentials.test.js::test_audit_reuse_no_duplicate_logs | 断言 reset 请求体只含 container_id/user_id，无 password/login_name。 |
| 账号卡密码重置请求与受理 | 只提交绑定身份 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_request_and_result | 断言 resetContainerPassword 收到绑定 user_id=2、container_id=12。 |
| 账号卡密码重置请求与受理 | 登录名以前端展示名伪装 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_request_and_result | 断言弹窗使用响应 login_name=alice，而非卡片展示名。 |
| 账号卡密码重置请求与受理 | 受理后立即展示 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_request_and_result | 断言响应后立即出现一项凭据弹窗，不等待轮询。 |
| 账号卡密码重置请求与受理 | 后续结果只看 oplog | 待复核 | — | 未在 UI 用例中断言刷新 oplog 的 reset_container_password 记录；保留缺口。 |
| 账号卡密码重置请求与受理 | 重置失败不泄露密码 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_request_and_result | 失败响应夹带 secret，断言错误参数不含 secret。 |
| 账号卡密码重置请求与受理 | 受理凭据数量或字段非法 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_credential_shape_and_counts | 断言 reset/ROOT 非预期项数与空字段被拒。 |
| 详情页 ROOT 提升默认单目标 | 只提升目标 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_root_transfer_single_target | 断言只发一次 updateRole，transfer_root=false，且无旧 ROOT 降级调用。 |
| 详情页 ROOT 提升默认单目标 | 普通 ADMIN/COLLABORATOR 互换不生成密码 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_main_flow_password_integration | 断言普通角色切换无凭据弹窗、沿用“角色已更新”。 |
| 详情页 ROOT 提升只展示 root 单凭据 | 只展示 root 一项 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_root_transfer_one_credential | 断言只显示 root 一项，不要求第二项。 |
| 详情页 ROOT 提升只展示 root 单凭据 | 凭据不是恰好一项 | 已覆盖 | ../../../src/test/credentialResponse.test.js::test_credential_shape_and_counts | parser 断言 transfer_root=false 的 0/2 项非法。 |
| 详情页 ROOT 提升只展示 root 单凭据 | 提升失败或结果未知 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_main_flow_password_integration | 断言 rejection 无成功提示、显示脱敏错误。 |
| ContainerDetailPage 主流程 | 启动已受理 | 待复核 | — | 历史主流程场景未在本 change 重跑或重新断言；保留旧台账缺口。 |
| ContainerDetailPage 主流程 | 新增协作者先拿密码再加入 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_add_collaborator_credentials | 断言先展示密码、不乐观插入账号。 |
| ContainerDetailPage 主流程 | 普通角色切换保持原响应 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_main_flow_password_integration | 断言普通角色沿用原成功提示、无密码弹窗。 |
| ContainerDetailPage 主流程 | 详情页 ROOT 提升受理后不等待后台 | 已覆盖 | ../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_root_transfer_one_credential | 断言立即展示一项凭据，不阻塞 Node，不提前改角色。 |

- 2026-10-24 增量验证：主 spec SHA256 `2f0fe32c4f66c24d316e3952cfbd8f15c6435676ed45fc911af80f526200feb2`；实现提交 `f14a16f`；全量证据 `npm test` Web 77/686 + server 40，0 failed/0 skipped；定向 `ContainerDetailPasswords.test.jsx` 6/6、`ContainerResourcePermission.test.jsx` 3/3。
- 未覆盖/待复核保留：ADMIN 新增单独断言、缺 user_id/提交前状态变化、oplog 刷新、旧“启动已受理”。这些不写成已覆盖。
