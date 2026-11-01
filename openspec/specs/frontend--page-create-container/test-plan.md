# frontend--page-create-container Test Plan

Spec: [spec.md](spec.md)

## Current Mapping

### Requirement: CreateContainer 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] src/test/CreateContainer.test.jsx::普通用户（无 container:manage）不显示 ROOT 用户选择器
  - [X] src/test/CreateContainer.test.jsx::代建者显示 ROOT 用户选择器；未选机器时禁用，选机器后默认当前用户
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_create_entry_route_mounts_page_and_keeps_identity_snapshot
- Assertion scope: 既有 locator 用真实 `CreateContainer` 与 `PermissionProvider` 断言普通用户无 ROOT 选择器、代建者显示选择器且未选机器时禁用、选机器后默认当前用户；该 locator 在 `/index/create` 路由下断言页面装配、身份快照仍来自 Provider，且路由参数不改变页面身份。
- Coverage note: 既有 locator 直接渲染组件，`/index/create` 路由装配与身份快照由该 locator 覆盖；页面自身不设 `container:create` 门，该正文约束依赖既有入口与 Ctrl，见 design。

### Requirement: CreateContainer 主流程

#### Scenario: 内存 4 GB、共享内存 8 GB

- Test/check:
  - [X] src/test/ResourceLimits.test.jsx::降低内存后重算并收敛已有共享值（32→4 时 shared 16→4）
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_create_shared_memory_converges_and_payload_never_exceeds_memory
- Assertion scope: 既有 locator 断言内存 32→4 后共享值收敛为 4、上限显示 4 GB 且数字输入与滑条同口径；该 locator 以内存 4、共享 8 的用户操作断言共享值收敛到 4，并断言提交 payload 的 `MEMORY=4`、`shared_memory` 不大于 `MEMORY`。
- Coverage note: 既有断言止于页面收敛；提交后 `shared_memory <= MEMORY` 由该 locator 覆盖。

#### Scenario: 内存 32 GB、共享内存 16 GB

- Test/check:
  - [X] src/test/ResourceLimits.test.jsx::共享内存本次可申请上限 = min(max_shared_gb, 本次申请内存)：mem 32 时为 16 GB，不再被 8 GB 限
  - [X] src/test/ResourceLimits.test.jsx::在限额内的组合按同口径取小后提交（mem 32 / shared 16）
  - [X] src/test/CreateContainer.test.jsx::普通用户提交 payload 不带 owner_user_id（后端归一为自己）
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_create_payload_uses_gpu_list_and_detail_limits
- Assertion scope: 既有 locator 断言机器 `max_shared_gb=16` 时共享上限为 16 GB、可提交 `MEMORY=32`/`shared_memory=16`，并断言 payload 使用所选 `image_id`、普通用户不带 `owner_user_id`；该 locator 断言 `GPU_LIST` 与所选 GPU 数一致，`CPU_NUMBER`/`MEMORY`/`shared_memory` 来自同一组控件，`machine_id`/`image_id` 与选择一致。
- Coverage note: 既有 locator 覆盖共享上限、提交取小、`image_id` 与 owner 省略；`GPU_LIST` 的精确形状由该 locator 覆盖。

#### Scenario: 模板不在可用集合内

- Test/check:
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_create_template_ready_filter_and_stale_selection_cleared
- Assertion scope: 该 locator 让列表返回 ready、draft、disabled 三类模板，断言页面只展示并允许选择 ready 项；选中 ready 项后触发一次不再包含该项的刷新，断言选择被清空且创建按钮不发出带旧 `image_id` 的请求。
- Coverage note: 环境模板 ready 过滤与已选项失效清空由该 locator 覆盖。

### Requirement: 创建受理后立即展示一次性 root 密码

#### Scenario: 从主导航创建并立即拿到密码

- Test/check:
  - [X] src/test/CreateContainerPassword.test.jsx::test_create_accepts_credentials_and_navigation shows modal before navigating and reuses one create path
  - [X] src/test/CredentialModal.test.jsx::test_credential_modal_render_copy_close renders exact lines, copies, closes and clears
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_create_accepted_keeps_existing_success_feedback
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_create_accepted_emits_no_extra_write_requests
- Assertion scope: 既有 locator 断言受理后只调用一次创建接口、先打开“重置后root的密码：”受控弹窗，关闭后才导航 `/index` 并携带 `startHeartbeat`；共享弹窗断言精确文案、复制与关闭清空。该 locator 断言受理仍显示既有成功反馈，并且除一次创建请求外没有额外写请求或创建事件上报。
- Coverage note: 弹窗与导航已断言；受理反馈和“无额外写请求”由该 locator 覆盖。

#### Scenario: 机器页带入机器与旧 Apply 重定向复用同一机制

- Test/check:
  - [X] src/test/legacyApplyRedirect.test.jsx::"/index/apply?machine_id=42" 把机器上下文带到新入口
  - [X] src/test/legacyApplyRedirect.test.jsx::兼容 camelCase 的 machineId 查询参数
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_create_machine_entry_preselects_and_uses_credential_modal
- Assertion scope: 既有 locator 断言旧 `/index/apply` 重定向到 `/index/create`，并把 `machine_id`/`machineId` 转成页面 state；该 locator 用真实页面断言 state 中的机器被预选，提交仍走同一处理器并打开同一密码弹窗，不出现第二个创建实现。
- Coverage note: 重定向 locator 用桩页面只断言 URL/state；真实页面预选与提交路径由该 locator 覆盖。

#### Scenario: 旧响应没有凭据

- Test/check:
  - [X] src/test/CreateContainerPassword.test.jsx::test_create_accepts_credentials_and_navigation keeps legacy success without a fake modal
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_create_legacy_success_keeps_existing_success_message
- Assertion scope: 既有 locator 断言旧式 `success: 1`/`message` 响应不打开密码弹窗、不伪造密码并导航首页；该 locator 断言页面仍调用既有成功提示（“容器创建请求已发送”），不因兼容旧响应而丢失成功反馈。
- Coverage note: 旧响应无密码已断言；既有成功提示由该 locator 覆盖。

#### Scenario: 已受理但凭据缺失或非法

- Test/check:
  - [X] src/test/credentialResponse.test.js::test_non_root_credentials_require_exactly_one_complete_item
  - [X] src/test/CreateContainerPassword.test.jsx::test_create_accepts_credentials_and_navigation does not navigate or fake a password on malformed accepted response
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_create_credential_envelope_rejects_missing_or_non_array_credentials
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_create_malformed_accepted_shows_generic_response_error
- Assertion scope: 既有解析器 locator 拒绝空数组、多项、空 `login_name`/`password`；既有页面 locator 断言解析失败时停留在 `/index/create`、不显示密码、不导航成功页、不自动重试。该 locator 分别覆盖 `credentials` 缺失或不是数组的结构拒绝，以及页面显示通用“凭据响应异常”提示且不展示任何密码。
- Coverage note: 既有 locator 覆盖空/多项/空字段与页面拒绝路径；缺失/非数组结构和通用错误文案由两个该 locator 覆盖。

#### Scenario: 创建失败夹带密码

- Test/check:
  - [X] src/test/containerApiCredentials.test.js::test_guard_rejection_and_unknown_result parses accepted credentials, applies no-store and keeps safe errors
  - [X] src/test/credentialResponse.test.js::test_credential_error_sanitization preserves safe message and strips secret/body
  - [X] src/test/CreateContainerPassword.test.jsx::test_create_error_safe_message preserves safe quota message and never shows a password
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_create_error_does_not_log_secret_or_raw_body
- Assertion scope: API/解析器 locator 断言失败响应中的 `credentials`/`root_password` 被剥离、原始 body 不进入错误对象、8GB/4GB 安全 message 保留；页面 locator 断言错误调用参数保留 8GB/4GB，且不含 `pw-` 或密码成功提示。该 locator 对 console 做负断言，确认错误路径不输出密码值或原始响应体。
- Coverage note: 既有 locator 覆盖 API/解析器剥离与页面错误参数；console 无 secret 由该 locator 覆盖。

#### Scenario: 关闭或离开页面后密码不可回看

- Test/check:
  - [X] src/test/CreateContainerPassword.test.jsx::test_create_accepts_credentials_and_navigation shows modal before navigating and reuses one create path
  - [X] src/test/CredentialModal.test.jsx::test_credential_modal_render_copy_close renders exact lines, copies, closes and clears
  - [X] src/test/CredentialModal.test.jsx::test_credential_no_persistence does not store passwords or log them; copy failure is safe
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_create_password_clears_on_escape_or_route_leave
- Assertion scope: 既有 locator 断言关闭弹窗后密码从组件状态与 DOM 清空，`localStorage`/`sessionStorage` 不含密码，页面随后导航首页；该 locator 断言 Esc、切换路由或卸载后同样清空，重新进入不显示旧密码且没有查回请求。
- Coverage note: 关闭按钮与无持久化已断言；Esc/路由离开后的清空由该 locator 覆盖。

### Requirement: CreateContainer 配额上限分层与共享内存联动

#### Scenario: 上限未知

- Test/check:
  - [X] src/test/ResourceLimits.test.jsx::共享内存上限未知（null）时显示未知并禁用控件，不伪装成无限
- Assertion scope: 机器 `max_shared_gb=null` 时显示“本次可申请上限 未知”，数字输入禁用、滑条禁用，不替换为硬件容量或无限。

#### Scenario: 上限为 0

- Test/check:
  - [X] src/test/ResourceLimits.test.jsx::共享内存上限为 0 时显示为已知的 0（不可分配），不显示为未知
- Assertion scope: `max_shared_gb=0` 显示为已知的 0 GB 与“本机该项不可分配”，不显示为未知。

#### Scenario: 降低内存后重算

- Test/check:
  - [X] src/test/ResourceLimits.test.jsx::降低内存后重算并收敛已有共享值（32→4 时 shared 16→4）
- Assertion scope: 内存 32→4 后共享值 16→4，页面显示本次可申请上限 4 GB，数字输入与滑条范围一致。

#### Scenario: 切换机器后重算

- Test/check:
  - [X] src/test/ResourceLimits.test.jsx::切换机器后四项配额按新机器重算（mem 4 / shared 0）
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_create_all_quota_rows_show_current_limit_and_layer_labels
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_create_all_quota_inputs_share_slider_range
- Assertion scope: 既有 locator 断言从 `max_memory_gb=32`/`max_shared_gb=16` 切到 `4`/`0` 后内存 4、共享 0、共享上限 0；该 locator 分别断言 CPU/GPU/内存/共享四行都显示当前申请值、本次可申请上限、硬件容量与机器配置限额且标注非实时空闲量，并断言四行数字输入与滑条共享 min/max/step。
- Coverage note: 既有 locator 覆盖 memory/shared 切换；四行标签与全量同口径由该 locator 覆盖。

### Requirement: CreateContainer 提交前超限阻断

#### Scenario: 期望内存超过已知上限

- Test/check:
  - [X] src/test/ResourceLimits.test.jsx::内存上限为 0 而申请值为 1 GB 时阻止超限 payload 并给出数值说明
- Assertion scope: 机器 `max_memory_gb=0`、申请 1 GB 时 `createContainer` 不被调用，页面显示“内存 当前申请 1 GB，本次可申请上限 0 GB”。

#### Scenario: 共享内存超过本次申请内存

- Test/check:
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_create_shared_memory_clamps_and_never_emits_overlimit_payload
  - [X] 人工代码核对：src/pages/CreateContainer.jsx:281-297、381-425、443-457
- Assertion scope: 该 locator 通过正常 UI 把内存从 32 降到 4，断言共享值 clamp 到 4、提交 payload 的 `shared_memory <= MEMORY`，不制造用户不可达的 `shared_memory > MEMORY` 组合；manual check 核对 `computeQuotaForMachine`/`useEffect` 的 clamp 先于 `collectQuotaViolations`，guard 的 `shared_memory > MEMORY` 分支只作防御，正常 UI 无法形成该组合。
- Coverage note: 正常 UI 已 clamp，guard 提示文案在黑盒用户路径不可达；UI locator 只断言可达 clamp 与不发出超限 payload，manual check 记录防御分支，不改 UI/业务。

### Requirement: CreateContainer 创建失败的错误呈现

#### Scenario: invalid_config 带具体数值

- Test/check:
  - [X] src/test/ErrorPresentation.test.jsx::invalid_config 覆盖不了后端具体 message：申请值与上限数字保留，同时给出中文原因与 400 提示
  - [X] src/test/CreateContainerPassword.test.jsx::test_create_error_safe_message preserves safe quota message and never shows a password
- Assertion scope: 真实错误弹窗保留 `Requested shared_memory 8GB cannot exceed memory 4GB` 与 8GB/4GB，附带“容器配置无效或超出宿主机上限”和 400 提示；页面调用参数保留同一安全 message，且不包含密码。

#### Scenario: 机器离线

- Test/check:
  - [X] src/test/ErrorPresentation.test.jsx::已知原因不被当成超限：机器离线只给机器作用域文案
  - [X] src/test/ErrorPresentation.test.jsx::未知 error_reason 有中文兜底并标明未收录，不硬套已知错误
  - [X] src/test/ErrorPresentation.test.jsx::网络失败（无状态、无 error_reason）给中文兜底，不直接抛英文原文
- Assertion scope: `machine_offline` 显示“所在机器不在线，暂时无法操作其上的容器”，不出现超限字样；未知原因显示中文兜底与“未收录的错误原因”，网络失败显示中文网络提示，不直接暴露英文原文。

#### Scenario: 创建权限不足

- Test/check:
  - [X] src/test/ErrorPresentation.test.jsx::401/403 的中文提示与身份验证原因保持（不改认证流程文案）
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_create_403_keeps_identity_and_shows_denial
- Assertion scope: 既有 locator 断言 403 显示“原因：权限不足”与普通拒绝提示，401 保留身份验证文案；该 locator 让创建请求返回 403，断言页面显示拒绝原因后仍保留当前身份与已填表单，不触发全局登出或跳转。
- Coverage note: 通用 403 弹窗已断言；创建页身份保留与不跳转由该 locator 覆盖。

#### Scenario: 失败响应夹带凭据字段

- Test/check:
  - [X] src/test/credentialResponse.test.js::test_credential_error_sanitization preserves safe message and strips secret/body
  - [X] src/test/containerApiCredentials.test.js::test_guard_rejection_and_unknown_result parses accepted credentials, applies no-store and keeps safe errors
  - [X] src/test/CreateContainerPassword.test.jsx::test_create_error_safe_message preserves safe quota message and never shows a password
- Assertion scope: 失败响应或异常对象含 `credentials`/`root_password` 时，错误对象、message 与 console 均不含密码或原始响应体；页面错误弹窗只显示安全状态与非敏感原因，不打开密码弹窗。
- Coverage note: 页面 locator 只构造安全 message；原始 secret 的剥离由解析器/API locator 覆盖。

### Requirement: CreateContainer 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] npm run build
  - [X] src/test/loginViewerLazy.test.jsx::viewer 模块未完成时：右侧是空占位，左侧登录表单照常可用
- Assertion scope: `npm run build` 以退出码 0 完成并产出页面级与 `ModelViewer` 异步 chunk；viewer locator 断言 three 相关模块未完成时页面仍可使用，说明 `ModelViewer` 独立加载。
- Coverage note: chunk 体积与警告清单属构建观测；不把源码中的 `lazy`/`manualChunks` 字符串当作构建通过。
