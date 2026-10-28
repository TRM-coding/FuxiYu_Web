# Test Plan

## frontend--page-create-container

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

## frontend--page-create-image

### Requirement: CreateImage 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] src/test/CreateImage.test.jsx::loads user_images scope by default for image editors
  - [X] src/test/CreateImage.test.jsx::资源通配：出现「仅看我创建的」，默认只看我的、可关掉看全部，并能编辑他人模板
  - [X] src/test/CreateImage.test.jsx::删除键按方法级 image:manage：无该权限时不渲染
  - [X] src/test/CreateImage.test.jsx::删除键按方法级 image:manage：生效集含 manage 时渲染
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_image_entry_route_and_identity_snapshot
- Assertion scope: 既有 locator 用真实 `CreateImage` 与 `PermissionProvider` 断言权限快照加载后默认请求 `user_images`、资源通配决定“仅看我创建的”与跨所有者编辑、删除按钮仅由方法级 `image:manage` 放行；该 locator 在 `/index/images` 路由下断言页面装配、身份快照来自 Provider，且资源范围与每项方法门同时保留。
- Coverage note: 既有 locator 直接渲染组件；`/index/images` 路由装配由该 locator 覆盖。列表 API 的 `image:view` 与整页编辑入口的 `image:edit` 是不同层次，本行不宣称存在只具备 view 即可进入管理页的能力。

### Requirement: CreateImage 主流程

#### Scenario: 清空启动命令并保存

- Test/check:
  - [X] src/test/CreateImage.test.jsx::把详情里的 entrypoint 读进表单，并在保存时发出去
  - [X] src/test/CreateImage.test.jsx::清空时发空串而不是 null（null 会被后端 exclude_none 丢掉，等于没清）
  - [X] src/test/CreateImage.test.jsx::切到「所有人可见」只调三态接口，不碰名单接口
  - [X] src/test/CreateImage.test.jsx::custom 态保存时先定态、再发名单（顺序是硬约束）
  - [X] src/test/CreateImage.test.jsx::非 custom 态不提供名单入口，并说明名单会保留
  - [X] src/test/CreateImage.test.jsx::把详情里回显的 custom 名单读进选择器
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_image_create_payload_includes_actual_create_fields
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_image_delete_calls_delete_and_reloads_list
- Assertion scope: 既有 locator 断言 entrypoint 读入与空串保存、private/everyone/custom 三态、custom 才管理名单且先定态后发名单、非 custom 保留名单说明、custom 名单回显；该 locator 断言新建分支实际发送 `name`、`description`、`status`、`base_image`、`dockerfile_body`、`entrypoint`，并断言删除动作在确认后调用 `deleteImage(image_id)` 并重取当前列表（后端停用语义不在 Web 断言）。
- Coverage note: 既有 locator 覆盖 entrypoint 与三态；新建分支实际字段与删除动作由该 locator 覆盖。父已明确新建不设置 `valid_range`/`visible_user_ids`；范围/名单属既有编辑分支与独立 share/audit 接口（`src/pages/CreateImage.jsx:331-340`、`:575-578`），非新建需求；本 locator 只断言六个新建字段，不新增分享流程或字段。该 Scenario 的 Ctrl 渲染最终 Dockerfile 默认命令、Node 不覆写 command 属跨仓行为，不在 Web 断言范围。

### Requirement: CreateImage 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] npm run build
  - [X] src/test/loginViewerLazy.test.jsx::viewer 模块未完成时：右侧是空占位，左侧登录表单照常可用
- Assertion scope: `npm run build` 以退出码 0 完成；viewer locator 断言 three 相关模块独立加载；构建输出提供页面级与 `ModelViewer` chunk 的观测，不逐页断言 chunk 名称。
- Coverage note: chunk 体积与警告清单属构建观测；不把源码字符串当作构建通过。

### Requirement: 镜像资源通配管理范围

#### Scenario: 默认操作员跨所有者编辑

- Test/check:
  - [X] src/test/CreateImage.test.jsx::资源位为 true 者可编辑他人模板（与后端资源门放行一致）
  - [X] src/test/CreateImage.test.jsx::资源通配：出现「仅看我创建的」，默认只看我的、可关掉看全部，并能编辑他人模板
- Assertion scope: 资源位为 true 时加载他人镜像完整详情并允许编辑，不因 `created_by_user_id` 不同被禁用；默认“仅看我创建的”开启，关闭后可看全部资源范围。

#### Scenario: 方法通配不扩展资源

- Test/check:
  - [X] src/test/CreateImage.test.jsx::仅 bypass_auth_entity：生效集里有 image:manage，但资源位为 false → 不开资源范围
  - [X] src/test/CreateImage.test.jsx::旧响应缺资源位：保守 false，即便 entities 含 image:manage 也不开资源范围
  - [X] src/test/imagePermissions.test.js::删除等管理端点要直持 image:manage
- Assertion scope: 仅 `bypass_auth_entity` 展开出 `image:manage` 而资源位为 false 时，不显示“仅看我创建的”、他人模板只读；旧响应缺资源位按 false；方法级 `image:manage` 不被资源通配替代。

### Requirement: 仅看我的按创建者过滤

#### Scenario: 通配者切换筛选

- Test/check:
  - [X] src/test/CreateImage.test.jsx::资源通配：出现「仅看我创建的」，默认只看我的、可关掉看全部，并能编辑他人模板
  - [X] src/test/CreateImage.test.jsx::loads user_images scope by default for image editors
- Assertion scope: 资源通配者默认以 `mine_only: true` 请求，切到全部后以 `mine_only: false` 请求；返回列表由服务端资源范围决定，本行只断言请求参数与页面切换。

#### Scenario: 被授权查看的他人模板

- Test/check:
  - [X] src/test/CreateImage.test.jsx::他人创建的模板：编辑区与可见范围都标灰，并说明原因
  - [X] src/test/CreateImage.test.jsx::自己创建的模板照旧可编辑（别把归属闸做成谁都改不了）
  - [X] src/test/CreateImage.test.jsx::资源通配：出现「仅看我创建的」，默认只看我的、可关掉看全部，并能编辑他人模板
- Assertion scope: 既有 locator 断言 `mine_only` 请求参数、非所有者且无资源通配时编辑区与可见范围只读、自己创建的模板仍可编辑；查看授权不改变所有权编辑门，页面不从 CUSTOM 名单推断资源所有权。
- Coverage note: `mine_only=true` 的他人模板/查看授权过滤由 Ctrl 语义执行；Web 侧只断言请求参数与所有权编辑门，不伪造服务端过滤结果。

### Requirement: CreateImage 关键词列表只应用当前上下文

#### Scenario: 当前关键词响应应用

- Test/check:
  - [X] src/test/CreateImage.test.jsx::test_q22_create_image_current_keyword
- Assertion scope: 当前关键词请求返回后列表更新，选中项仍与当前关键词列表一致，请求参数包含当前 `image_search` 与 `mine_only`。

#### Scenario: 旧关键词响应晚到

- Test/check:
  - [X] src/test/CreateImage.test.jsx::test_q22_create_image_stale_keyword
- Assertion scope: 关键词 A 的响应晚于关键词 B 返回时被丢弃，列表与选中项保持 B 的结果，旧响应不触发详情请求。

### Requirement: CreateImage 新建成功后清空关键词、空词重取、选中新项并保留表单

#### Scenario: 非匹配关键词下新建成功

- Test/check:
  - [X] src/test/CreateImage.test.jsx::test_q63_create_image_clear_keyword_select_new
- Assertion scope: 新建成功后关键词清空为 `''`，以空关键词重取列表，`selectedId` 指向新 `image_id`，表单字段保持刚提交的值，不被服务端新名称覆盖。

#### Scenario: 空词重取失败仍保留表单

- Test/check:
  - [X] src/test/CreateImage.test.jsx::test_q63_create_image_reload_failure_preserves_form
- Assertion scope: 空关键词重取失败时表单保留提交内容，页面展示可读错误，`selectedId` 不指向不存在的列表项，不伪造新项已选中。

### Requirement: CreateImage 更新成功后重新读取左侧列表

#### Scenario: 更新成功重取列表

- Test/check:
  - [X] src/test/CreateImage.test.jsx::test_q64_create_image_update_refetches_list
- Assertion scope: 更新成功按当前关键词重取列表，展示更新后的名称/摘要，选中项仍为该镜像。

#### Scenario: 更新失败保留旧列表

- Test/check:
  - [X] src/test/CreateImage.test.jsx::test_q64_create_image_update_failure_keeps_list
- Assertion scope: 更新失败时左侧列表保持更新前内容，错误弹窗收到 `message` 对象、状态与 route，不显示“模板已保存”。

### Requirement: CreateImage 镜像错误原因按现有协议映射

#### Scenario: 已知镜像原因展示中文

- Test/check:
  - [X] src/test/CreateImage.test.jsx::test_q37_create_image_known_reasons
  - [X] src/test/showErrorModalMap.test.js::/images/create_image → duplicate_entry
- Assertion scope: 15 行 `route/error_reason` 表逐行映射为期望中文；真实弹窗样例 `/images/create_image` + `duplicate_entry` 显示“镜像名称已存在”，不出现“未收录的错误原因”。
- Coverage note: 全表由 routeErrorMap 逐行断言；真实弹窗抽样覆盖一个镜像路由，其余行未逐个渲染。

#### Scenario: 未登记镜像原因保留兜底

- Test/check:
  - [X] src/test/CreateImage.test.jsx::test_q37_create_image_unknown_reason
- Assertion scope: 未登记 `error_reason` 时真实弹窗显示中文兜底与“未收录的错误原因：…”，不硬套“镜像名称已存在”。

## frontend--page-deleted-containers

### Requirement: DeletedContainers 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] src/test/DeletedContainers.test.jsx::calls resurrect API for recoverable deleted container after confirmation
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_entry_route_identity_and_row_key
- Assertion scope: 既有 locator 用真实页面和 `container:manage` 断言列表、恢复确认与刷新；该 locator 在 `/admin/deleted-containers` 路由下断言页面装配、`deleted_id` 作为行键、无 `container:manage` 时显示 403 且不请求列表。
- Coverage note: 既有 locator 直接渲染组件；管理路由与 `deleted_id` 行身份由该 locator 覆盖。

### Requirement: DeletedContainers 主流程

#### Scenario: 恢复需要选择来源

- Test/check:
  - [X] src/test/DeletedContainers.test.jsx::asks which content to use when the restore response says a choice is needed
  - [X] src/test/containerApiCredentials.test.js::test_deleted_restore_root_credential bypasses requires_choice and parses accepted root credential
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_mount_status_preserved_escalated_and_cleaned
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_requires_choice_template_resubmits_with_template
- Assertion scope: 首次恢复只调用一次且不带 `contentSource`，响应 `requires_choice` 时显示两份配方而非成功；现有页面 locator 覆盖默认 snapshot 分支的重新提交，该 locator 覆盖 template 分支并断言以 `template` 再调；API locator 断言 `requires_choice` 响应不含凭据且绕过密码解析。另一该 locator 用当前页记录断言 Mount 状态分别显示“mount 保留”“升级清理”“已清理”“无挂载”。
- Coverage note: 既有 locator 覆盖二选一与 snapshot 分支；template 分支、Mount 保留/升级清理状态由该 locator 覆盖。

#### Scenario: 差异分段与公布落点

- Test/check:
  - [X] src/test/DeletedContainers.test.jsx::asks which content to use when the restore response says a choice is needed
  - [X] src/test/dockerfileDiff.test.js::标出两侧各自独有的行
- Assertion scope: `sections` 的 `base_image`/`dockerfile_body`/`entrypoint` 渲染为“基础镜像/业务片段/启动命令”并显示有/无变化；两份 Dockerfile 由前端就地计算逐行差异，add/del 行标记正确，差异窗格只消费 `requires_choice` 响应中的两份文本。
- Coverage note: 页面没有单独的容器留痕请求；既有测试只 mock list/resurrect/usage 通道，未单独监听其他端点。

### Requirement: DeletedContainers 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] npm run build
  - [X] src/test/loginViewerLazy.test.jsx::viewer 模块未完成时：右侧是空占位，左侧登录表单照常可用
- Assertion scope: `npm run build` 以退出码 0 完成；viewer locator 断言 three 相关模块独立加载；构建输出提供页面级与 `ModelViewer` chunk 的观测，不逐页断言 chunk 名称。
- Coverage note: chunk 体积与警告清单属构建观测；不把源码字符串当作构建通过。

### Requirement: 长期恢复超限保留明确失败反馈

#### Scenario: 数量达到上限

- Test/check:
  - [X] src/test/DeletedContainers.test.jsx::keeps the safe restore message without passing the raw error body
  - [X] src/test/showErrorModalMap.test.js::长期配额 / 快照不可恢复 / 机器作用域都在本路由上映射
  - [ ] src/test/AnvilCreateDeleted.test.jsx::test_deleted_long_term_limit_shows_chinese_reason_and_counts
  - [ ] src/test/AnvilCreateDeleted.test.jsx::test_deleted_restore_retry_after_long_term_limit_uses_same_record
- Assertion scope: 既有 locator 断言 `long_term_limit_reached` 保留后端 1/1 数量与 409、不显示恢复成功、不刷新列表、不把原始 body 交给错误弹窗；两个保留 locator（当前函数不存在）保持原规格断言：真实错误弹窗显示中文长期上限原因且不出现“未收录”，并在释放配额后对同一 `deleted_id` 重试成功。
- Coverage note: 两个保留 locator 对应函数不存在，不使用 skip/xfail 或弱化断言。Global Q83 已登记（e9aef7c）：恢复 `long_term_limit_reached` 时页面遗漏 `error_reason`，未消费“长期容器上限”的既有中文映射；这部分仍未覆盖，按用户决定暂缓修复，保留原规格断言。运行证据保存在外部审计产物，不属于本映射。

### Requirement: 恢复成功后的 root 凭据展示

#### Scenario: 恢复成功展示 root 密码

- Test/check:
  - [X] src/test/DeletedContainersRestorePassword.test.jsx::test_deleted_restore_root_credential shows root password, bypasses requires_choice, and keeps errors sanitized
  - [X] src/test/CredentialModal.test.jsx::test_credential_modal_render_copy_close renders exact lines, copies, closes and clears
  - [X] src/test/containerApiCredentials.test.js::test_deleted_restore_root_credential bypasses requires_choice and parses accepted root credential
- Assertion scope: 恢复实际成功并返回 `accepted: true` 与一项 root 凭据时，页面复用受控密码弹窗显示“重置后root的密码：”；共享弹窗精确展示并复制该项；API locator 断言该项被解析且 `requires_choice` 不进入凭据解析。

#### Scenario: requires_choice 不展示密码

- Test/check:
  - [X] src/test/DeletedContainersRestorePassword.test.jsx::test_deleted_restore_root_credential shows root password, bypasses requires_choice, and keeps errors sanitized
  - [X] src/test/DeletedContainers.test.jsx::asks which content to use when the restore response says a choice is needed
  - [X] src/test/containerApiCredentials.test.js::test_deleted_restore_root_credential bypasses requires_choice and parses accepted root credential
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_requires_choice_template_resubmits_with_template
- Assertion scope: `requires_choice: true` 响应不打开密码弹窗、不展示任何密码；真实页面同时显示“恢复内容与删除前不同”、两份配方与分段差异，现有 locator 覆盖默认 snapshot 分支的重新提交；该 locator 选择“按当前模板恢复”后断言以 `template` 重新提交且仍不展示密码。API 层不返回凭据。
- Coverage note: 现有页面 locator 覆盖 snapshot 分支与二选一 UI；template 分支由该 locator 覆盖。

#### Scenario: 恢复失败或凭据非法

- Test/check:
  - [X] src/test/DeletedContainersRestorePassword.test.jsx::test_deleted_restore_root_credential shows root password, bypasses requires_choice, and keeps errors sanitized
  - [X] src/test/credentialResponse.test.js::test_non_root_credentials_require_exactly_one_complete_item
  - [X] src/test/containerApiCredentials.test.js::test_guard_rejection_and_unknown_result parses accepted credentials, applies no-store and keeps safe errors
- Assertion scope: 失败响应即使夹带 `credentials` 也不打开密码弹窗，错误参数不含 secret 且 `body` 为空；解析器 locator 拒绝空数组、多项、空 `login_name`/`password`，页面只接收安全错误，不展示部分密码。

### Requirement: 已删除容器保留分页与当前操作上下文

#### Scenario: 同页刷新保持当前位置

- Test/check:
  - [X] src/test/DeletedContainers.test.jsx::动作在途时切换页码：动作完成后跟随当前页刷新
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_same_page_refresh_keeps_page_and_size
- Assertion scope: 既有 locator 断言动作完成后的刷新跟随操作完成时的当前页；该 locator 停留在第二页，动作成功后总数仍包含第二页，断言重取使用 `page_number=2` 与原 `page_size=20`，列表与分页仍显示第二页，不跳回第一页。
- Coverage note: 既有 locator 覆盖“跟随当前页”的切换场景；同页刷新与页大小保持由该 locator 覆盖。

#### Scenario: 空页仍可翻页

- Test/check:
  - [X] src/test/DeletedContainers.test.jsx::当前页为空但 total>0 时仍保留分页入口
  - [X] src/test/DeletedContainers.test.jsx::第二页为空但仍在有效页范围内时保留分页入口，可回翻
  - [X] src/test/DeletedContainers.test.jsx::total_page 缺失/0 但 total_number 仍支持当前页时保留当前页
- Assertion scope: 当前页返回空列表但 `total_number>0` 时仍保留 Table/分页；第二页在有效范围内为空时可回翻；`total_page` 缺失/0 但总数仍支持当前页时不误退第一页。

#### Scenario: 操作期间切换分页

- Test/check:
  - [X] src/test/DeletedContainers.test.jsx::动作在途时切换页码：动作完成后跟随当前页刷新
  - [X] src/test/DeletedContainers.test.jsx::迟到响应不覆盖新页
- Assertion scope: 动作在途时切到第二页，动作完成后只刷新第二页；第二页迟到响应不覆盖第三页，旧页回调不再驱动当前分页。

#### Scenario: 最后一页减少

- Test/check:
  - [X] src/test/DeletedContainers.test.jsx::清空当前页最后一条后按新 total 回到有效页，而不是一律回第一页
  - [X] src/test/DeletedContainers.test.jsx::第 3 页缩到第 2 页时回到第 2 页，而不是一律回第一页
  - [X] src/test/DeletedContainers.test.jsx::total_page 缺失/0 但 total_number 仍支持当前页时保留当前页
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_last_page_fallback_is_bounded_and_not_duplicated
- Assertion scope: 既有 locator 断言当前最后一条被处理且权威总数减少时回退到最新有效末页、未越界时保留当前页；该 locator 断言回退只补取一次有效末页（列表调用次数有界）、不重复请求同一页、不形成循环，并最终显示新末页记录。
- Coverage note: 既有 locator 覆盖最终页码与“不跳首页”；重取次数上界与去重由该 locator 覆盖。

### Requirement: DeletedContainers 仅按当前页请求异步用量

#### Scenario: 列表先出现、统计后到达

- Test/check:
  - [X] src/test/DeletedContainersMountUsage.test.jsx::列表与分页先出现，异步只请求当前页可测 ID；mount_cleaned=true 即使 cleaned_at 空也不请求
  - [X] src/test/DeletedContainersDisplay.test.jsx::test_loading_and_pending_keep_existing_text_without_progress
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_19_usage_list_first_stats_later
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_actions_do_not_wait_for_pending_usage
- Assertion scope: 列表与分页先按列表响应显示，用量行显示“读取统计中/测量中”；列表不被统计请求阻塞，也不提前写入统计值，移动卡片同样先出现。该 locator 在统计 promise 未决时打开恢复/清理确认并提交，断言写接口不被统计阻塞，列表/分页仍可操作。
- Coverage note: 既有 locator 覆盖列表先出现与统计失败时按钮可用；统计 pending 期间恢复/清理不被阻塞由该 locator 覆盖。

#### Scenario: 仅请求当前页可测记录

- Test/check:
  - [X] src/test/DeletedContainersMountUsage.test.jsx::列表与分页先出现，异步只请求当前页可测 ID；mount_cleaned=true 即使 cleaned_at 空也不请求
  - [X] src/test/mountUsage.test.js::只派生当前页可测 ID，去重且不携带路径
  - [X] src/test/containerMountUsageApi.test.js::POST 固定路由，只发送去重正整数 deleted_ids，带 credentials
  - [X] src/test/containerMountUsageApi.test.js::去重后恰好 100 个允许发送；空数组不发请求
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_20_usage_only_current_page_ids
- Assertion scope: 只发送当前页中 `mount_path` 非空、`mount_cleaned !== true`、`cleaned_at` 为空且 `deleted_id` 为正整数的 ID；请求体只有去重 `deleted_ids`，单次不超过 100，不含宿主路径、`machine_id` 或其他字段。

#### Scenario: 无挂载、mount_cleaned=true 或 cleaned_at 非空不扫描

- Test/check:
  - [X] src/test/mountUsage.test.js::mount_cleaned=true 即使 cleaned_at 为空也算已清理
  - [X] src/test/mountUsage.test.js::cleaned_at 非空、无 mount、非法 ID 均不请求
  - [X] src/test/DeletedContainersDisplay.test.jsx::test_empty_mount_has_no_copy_control_and_empty_image_is_unknown
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_13_mobile_cleaned_no_mount_no_sample
- Assertion scope: 无挂载显示“无挂载”，`mount_cleaned=true`（即使 `cleaned_at` 空）或 `cleaned_at` 非空显示“已清理”；这些记录的 ID 不进入统计请求，不触发目录扫描。

### Requirement: DeletedContainers 如实展示逻辑大小与测量时间

#### Scenario: 成功且确实为零

- Test/check:
  - [X] src/test/DeletedContainersDisplay.test.jsx::test_zero_byte_success_renders_success_progress_not_unknown
  - [X] src/test/DeletedContainersMountUsage.test.jsx::列表与分页先出现，异步只请求当前页可测 ID；mount_cleaned=true 即使 cleaned_at 空也不请求
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_11_mobile_390_usage_states
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_mobile_390_usage_success_values_and_non_success_reverse
- Assertion scope: 既有 locator 断言桌面零字节行显示“0 B”、成功进度条与无比例轨道，不显示“统计不可用”；移动端 `tc_dc_11` 只断言零字节行显示“0 B”。该 locator 在 390px 断言零字节成功行的无比例成功轨道/`aria-valuetext`，并反向断言非成功行不显示 0 B 或进度条。
- Coverage note: 该该 locator 同时服务“成功且确实为零”与“390px 展示全部用量状态”；移动端轨道与反向断言由该缺口补齐。

#### Scenario: 成功样本与旧测量时间

- Test/check:
  - [X] src/test/DeletedContainersDisplay.test.jsx::test_success_usage_renders_progress_and_short_measurement_label
  - [X] src/test/DeletedContainersMountUsage.test.jsx::成功非零/成功 0/旧测量时间/pending/错误/缺项/畸形项按行呈现且绝不把 null 当 0
- Assertion scope: 成功样本显示逻辑大小、`测量 {MM-DD HH:mm}` 与完整时间 `title`；进度条具有成功语义，不声称实时或物理块占用；旧测量时间仍按浏览器本地化格式显示。

#### Scenario: 成功样本有上限或没有上限

- Test/check:
  - [X] src/test/DeletedContainersDisplay.test.jsx::test_positive_limit_is_determinate_and_missing_limit_is_indeterminate
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_11_mobile_390_usage_states
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_usage_limit_success_keeps_size_and_measurement_time
- Assertion scope: 既有 locator 断言正数 `mount_usage_limit_bytes` 按逻辑字节与该上限计算、超限封顶 100%，无上限/非正上限显示无比例成功轨道与“已测量，未提供可比上限”的 `aria-valuetext`，并断言有上限行显示实际逻辑大小；该 locator 断言有上限成功行同时显示该样本的 `测量 {MM-DD HH:mm}` 与完整时间 `title`。
- Coverage note: 既有 locator 覆盖确定/无比例轨道与有上限行大小；有上限行的测量时间由该 locator 覆盖。

#### Scenario: 测量中

- Test/check:
  - [X] src/test/DeletedContainersDisplay.test.jsx::test_loading_and_pending_keep_existing_text_without_progress
  - [X] src/test/DeletedContainersMountUsage.test.jsx::成功非零/成功 0/旧测量时间/pending/错误/缺项/畸形项按行呈现且绝不把 null 当 0
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_12_mobile_usage_loading
- Assertion scope: 列表加载中显示“读取统计中”，`pending=true`/`bytes=null` 显示“测量中”；不渲染成功进度条、不显示 0 B 或伪造测量时间。

#### Scenario: 失败、缺项或形状非法

- Test/check:
  - [X] src/test/DeletedContainersDisplay.test.jsx::test_error_missing_and_cleaned_rows_keep_existing_states
  - [X] src/test/DeletedContainersMountUsage.test.jsx::缺字段、非 UTC 时间、HTML/未知 error 只降级对应行，合法行照常显示，不回显原文
  - [X] src/test/DeletedContainersMountUsage.test.jsx::成功非零/成功 0/旧测量时间/pending/错误/缺项/畸形项按行呈现且绝不把 null 当 0
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_stale_usage_response_does_not_overwrite_success
- Assertion scope: 既有 locator 断言 `error` 非空、缺项、响应形状非法、无挂载或已清理时沿用既有不可用/无挂载/已清理状态，不渲染成功进度条、不显示伪造时间、不把 null 当 0；该 locator 在成功结果已写入后解析旧一轮 deferred usage 响应，断言旧值不覆盖当前成功大小/时间/进度。
- Coverage note: 既有 locator 覆盖缺项/畸形/失败降级；过期 usage 响应丢弃由该 locator 覆盖。

### Requirement: DeletedContainers 有界轮询、取消与旧响应失效

#### Scenario: pending 收敛即停止

- Test/check:
  - [X] src/test/DeletedContainersMountUsage.test.jsx::上一批未返回不叠请求；返回后只轮询仍 pending 的行，收敛即停止
- Assertion scope: pending 行后续变为 success 或 error 后停止轮询并显示最终结果；仍 pending 的行按 5 秒间隔继续，已收敛行不再出现在后续请求。

#### Scenario: 离开、翻页、刷新取消

- Test/check:
  - [X] src/test/DeletedContainersMountUsage.test.jsx::翻页 abort 旧请求并丢弃迟到响应，不覆盖新页
  - [X] src/test/DeletedContainersMountUsage.test.jsx::手动刷新 abort 旧请求，迟到响应不覆盖新一轮结果
  - [X] src/test/DeletedContainersMountUsage.test.jsx::卸载时 abort 在途统计，迟到响应不产生后续请求
- Assertion scope: 翻页、手动刷新、卸载都会 abort 旧统计请求并丢弃迟到响应；旧页/旧轮次不覆盖新页或新一轮结果，卸载后不产生后续请求。

#### Scenario: 清理或恢复后不保留旧用量

- Test/check:
  - [X] src/test/DeletedContainersMountUsage.test.jsx::清理开始时旧统计失效；成功后重载只显示已清理，迟到响应不贴回旧值且不再扫描
  - [X] src/test/DeletedContainersMountUsage.test.jsx::恢复开始时旧统计失效；成功后迟到响应不贴回旧值且不再扫描
  - [X] src/test/DeletedContainersMountUsage.test.jsx::清理失败不把旧 bytes 贴回；该行保持统计不可用且无后续请求
- Assertion scope: 清理/恢复开始即失效旧统计与计时器；成功后重载只显示已清理，迟到响应不贴回旧 bytes；清理失败也不贴回旧值，保持不可用且无后续轮询。

#### Scenario: 单页预算耗尽

- Test/check:
  - [X] src/test/DeletedContainersMountUsage.test.jsx::pending 单计时器精确轮询 120 次后停止，提示测量未完成且不再请求
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_poll_budget_exhausted_manual_refresh
- Assertion scope: 既有 locator 断言初始请求后每 5 秒重查、累计 120 次后停止，显示“测量未完成”且不再后台请求；该 locator 在预算耗尽后点击刷新，断言重新发起列表与统计请求并允许继续观察，不无限轮询或改用 WSS。
- Coverage note: 既有 locator 覆盖预算停止；手动刷新恢复由该 locator 覆盖。

### Requirement: DeletedContainers 保持旧接口兼容与原有流程

#### Scenario: 旧 Ctrl 没有统计接口

- Test/check:
  - [X] src/test/DeletedContainersMountUsage.test.jsx::旧 Ctrl 统计 404/405、success=0 或非法响应只降级为不可用，不填 0、不阻断恢复/清理
  - [X] src/test/containerMountUsageApi.test.js::HTTP 404/405 原样抛出状态交给页面降级
- Assertion scope: 404/405、`success=0` 或非法响应只把用量降级为“统计不可用”，不填 0、不弹阻断错误；恢复/清理按钮仍可用，原列表与权限流程不受影响。

#### Scenario: 单机失败不拖累其他机器

- Test/check:
  - [X] src/test/DeletedContainersMountUsage.test.jsx::逐项 Node 失败只影响对应行，部分成功仍展示真实大小
  - [X] src/test/DeletedContainersMountUsage.test.jsx::上一批未返回不叠请求；返回后只轮询仍 pending 的行，收敛即停止
  - [X] src/test/mountUsage.test.js::区分成功 0、pending、错误、缺项；未知 ID 被忽略
- Assertion scope: 部分记录返回 `node_unavailable`/`node_timeout` 时失败行只显示对应原因，成功行显示真实大小，整页结果不被清空或改成 0；pending 行保留为 pending 并按既有 5 秒节奏继续轮询，收敛后停止。

#### Scenario: 旧 Node 不支持或响应异常

- Test/check:
  - [X] src/test/DeletedContainersMountUsage.test.jsx::逐项 Node 失败只影响对应行，部分成功仍展示真实大小
  - [X] src/test/mountUsage.test.js::错误项只接受契约稳定 code，且不携带 bytes/时间
- Assertion scope: `node_unsupported`、`node_timeout`、`node_unavailable`、`node_bad_response` 按不可用处理并显示可理解中文；不当作成功空结果、不填 0。Web 不直接调用 Node 属请求边界，未在本行单独断言。

#### Scenario: 不扩张权限与持久化

- Test/check:
  - [X] src/test/containerMountUsageApi.test.js::POST 固定路由，只发送去重正整数 deleted_ids，带 credentials
  - [X] src/test/DeletedContainersMountUsage.test.jsx::权限被收回时停止 pending 计时器，不再发起轮询
  - [X] src/test/DeletedContainersMountUsage.test.jsx::权限被收回时 abort 在途统计并丢弃迟到响应
- Assertion scope: 用量请求体只有 `deleted_ids`，权限沿用 `container:manage`；权限收回后停止轮询并 abort 在途请求；本行只证明 Web 请求体、权限门与取消行为，不单独断言写操作或 WSS。
- Coverage note: DB 与 WSS 的跨仓约束不在 Web 断言范围；写操作未被本行单独断言。

### Requirement: DeletedContainers 表格信息层级与 Mount 复制样式

#### Scenario: 删除列表显示详情与可复制 Mount

- Test/check:
  - [X] src/test/DeletedContainersDisplay.test.jsx::test_image_moves_to_expanded_detail_and_mount_uses_compact_copy_chip
- Assertion scope: 桌面主表无单独镜像列，列头保留容器/机器/Mount/逻辑用量/删除时间/状态/操作；镜像移入展开详情；Mount 使用 `meta`/`soft` 小号复制控件，`title` 与复制值均为完整路径。

#### Scenario: 空 Mount 或空镜像

- Test/check:
  - [X] src/test/DeletedContainersDisplay.test.jsx::test_empty_mount_has_no_copy_control_and_empty_image_is_unknown
- Assertion scope: 空 Mount 显示“无挂载”且不渲染复制控件；空镜像详情显示“未知”；两者都不生成无效复制按钮或猜测值，也不发起统计请求。

#### Scenario: 复制失败

- Test/check:
  - [X] src/test/DeletedContainersDisplay.test.jsx::test_mount_copy_failure_preserves_path
- Assertion scope: 剪贴板写入失败时显示“复制失败”，路径、`title` 与复制值不变，不发起接口或 Node 请求。

#### Scenario: 旧流程

- Test/check:
  - [X] src/test/DeletedContainersDisplay.test.jsx::test_pagination_usage_polling_cleanup_and_restore_are_unchanged
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_old_flow_late_response_does_not_overwrite_current_page
- Assertion scope: 既有 locator 断言翻页、刷新、清理 Mount、恢复沿用既有生命周期；用量只请求当前页可测 ID，清理后重载显示已清理，恢复调用既有接口。该 locator 让旧页列表响应晚于当前页返回，断言当前页记录不被旧响应覆盖。
- Coverage note: 既有 locator 覆盖旧流程生命周期；旧页迟到列表响应不覆盖当前页由该 locator 覆盖。

### Requirement: DeletedContainers 移动端复用共享卡片布局

#### Scenario: 390px 以卡片展示七列

- Test/check:
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_01_mobile_390_seven_columns
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_mobile_390_card_values
- Assertion scope: 既有 locator 断言 390px 下不出现 antd 表格、每条记录为一张共享卡片、七个列标题存在；该 locator 断言同一张 390px 卡片显示容器名与 ID、机器名与 IP、Mount 路径、逻辑用量、格式化删除时间、状态标签与恢复/清理操作按钮的实际值。
- Coverage note: 既有 locator 只覆盖卡片结构与列标题；各字段值由该 locator 覆盖。jsdom 不计算真实 `scrollWidth`，横向溢出属浏览器验收边界。

#### Scenario: 768px 使用卡片而桌面保留表格

- Test/check:
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_02_mobile_768_desktop_769
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_table_and_card_share_fields_at_768_769_1440
- Assertion scope: 既有 locator 断言 768px 使用卡片、769px 出现 `table` 且不出现移动卡片；该 locator 补 1440px，并断言 768/769/1440 三档的列头/字段值、分页总数与操作一致。
- Coverage note: 既有 locator 覆盖 768/769；1440 与三档一致性由该 locator 覆盖。

#### Scenario: 320px 长路径与长名称不遮挡操作

- Test/check:
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_03_mobile_320_long_actions
- Assertion scope: 320px 长容器名与长 Mount 下，复制控件与恢复/清理按钮仍渲染且可查询为可点击控件；文本换行/截断与真实遮挡属浏览器布局边界，本行不伪造 `scrollWidth`。

#### Scenario: 列定义或数据为空

- Test/check:
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_04_mobile_empty_page_pagination
  - [X] src/test/DeletedContainersDisplay.test.jsx::test_empty_mount_has_no_copy_control_and_empty_image_is_unknown
- Assertion scope: 当前页无记录时显示空态与分页入口，不生成空白卡片；缺可选字段按既有占位显示，不伪造字段。

### Requirement: DeletedContainers 移动端详情主动展开与收起

#### Scenario: 390px 展开并收起一行详情

- Test/check:
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_05_mobile_390_expand_collapse
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_mobile_390_expand_resource_port_and_deletion_source
- Assertion scope: 既有 locator 断言 390px 卡片展开后显示镜像名与账号，按钮变“收起详情”且 `aria-expanded=true`；收起后详情消失、`aria-expanded=false`，用量请求次数不变。该 locator 断言资源摘要（CPU/内存/GPU/共享）、端口与删除来源的实际值。
- Coverage note: 既有 locator 覆盖镜像/账号与展开状态；资源、端口、删除来源由该 locator 覆盖。

#### Scenario: 桌面展开图标与移动按钮共享状态

- Test/check:
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_06_desktop_expand_shared_state
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_desktop_expand_toggles_without_duplicate_detail
- Assertion scope: 既有 locator 断言桌面展开图标可打开同一行详情且不出现移动卡片；该 locator 再次点击关闭，断言详情消失、无第二份详情/重复行，并与移动端使用同一份 `expandedRowRender` 字段。
- Coverage note: 既有 locator 只覆盖桌面打开一次；关闭/重复详情与移动字段一致性由该 locator 覆盖。

#### Scenario: 详情文本很长

- Test/check:
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_07_mobile_320_long_detail
- Assertion scope: 320px 展开含无空格长账号的详情时文本仍显示；真实换行、横向溢出与收起按钮遮挡属浏览器布局边界，本行不伪造像素断言。

#### Scenario: 旧展开 key 不属于当前页

- Test/check:
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_08_mobile_stale_key_page_change
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_mobile_stale_expand_key_discards_late_page_response
- Assertion scope: 既有 locator 断言第一页展开后翻到第二页，旧 `deleted_id` 不渲染空白详情或错误卡片；该 locator 让第一页列表响应晚于第二页返回，断言当前页仍为第二页、旧详情不恢复、迟到响应不覆盖当前页。
- Coverage note: 既有 locator 覆盖页码切换后的旧 key 清理；迟到响应不恢复旧详情由该 locator 覆盖。

### Requirement: DeletedContainers 移动端 Mount 复制与用量状态

#### Scenario: 320px 真实点击复制完整 Mount

- Test/check:
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_09_mobile_320_mount_copy
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_mobile_390_mount_copy_writes_clipboard
- Assertion scope: 既有 locator 断言 320px 点击 Mount 复制控件后 `navigator.clipboard.writeText` 收到完整路径，控件 `title` 与路径逐字一致，不发起接口或 Node 请求；该 locator 在 390px 走同一真实点击，断言剪贴板写入完整路径、控件 `title` 不变且操作按钮仍可用。
- Coverage note: 既有 locator 覆盖 320px 成功写入；390px 的真实写入由该 locator 覆盖。

#### Scenario: 复制失败保留路径

- Test/check:
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_10_mobile_copy_failure
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_mobile_copy_failure_keeps_restore_clean_and_usage
- Assertion scope: 既有 locator 断言 390px 剪贴板拒绝时显示“复制失败”，路径、`title` 与复制值不变；该 locator 断言失败后恢复/清理按钮仍可用、用量展示仍按成功/失败状态显示，不因复制失败阻断其他操作。
- Coverage note: 既有 locator 覆盖复制失败文案与路径；复制失败后的恢复/清理与用量可用性由该 locator 覆盖。

#### Scenario: 390px 展示全部用量状态

- Test/check:
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_11_mobile_390_usage_states
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_mobile_390_usage_success_values_and_non_success_reverse
- Assertion scope: 既有 locator 断言 390px 下成功有上限行 `aria-valuenow=50`、成功 0 B 行显示“0 B”，并断言 pending/error/缺项/已清理/无挂载的既有文案；该 locator 断言成功行显示实际大小与“测量 {MM-DD HH:mm}”/`title`，无上限成功行显示无比例轨道与 `aria-valuetext`，并反向断言所有非成功行不出现进度条或 0 B。
- Coverage note: 既有 locator 覆盖部分成功/非成功文案；成功大小/时间、无上限轨道与非成功反向断言由该 locator 覆盖。

#### Scenario: 390px 统计未返回时显示读取统计中

- Test/check:
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_12_mobile_usage_loading
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_mobile_390_loading_has_no_zero_measurement_or_cleaned_state
- Assertion scope: 既有 locator 断言列表已返回而统计请求未返回时可测记录显示“读取统计中”、无 `progressbar`，随后解析为 pending 时显示“测量中”。该 locator 在 390px 同时放可测、已清理、无挂载记录，断言等待与 pending 阶段可测行无 0 B、无测量时间、无“已清理”状态，已清理/无挂载仍显示原状态。
- Coverage note: 既有 locator 只覆盖“读取统计中/测量中”与无进度条；0 B/测量时间/已清理状态的负向条件由该 locator 覆盖。

#### Scenario: 已清理与无挂载不采样

- Test/check:
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_13_mobile_cleaned_no_mount_no_sample
  - [X] src/test/DeletedContainersMountUsage.test.jsx::列表与分页先出现，异步只请求当前页可测 ID；mount_cleaned=true 即使 cleaned_at 空也不请求
- Assertion scope: `mount_cleaned=true`、`cleaned_at` 非空或 `mount_path` 为空时，这些 `deleted_id` 不出现在采样请求中；卡片分别显示“已清理”或“无挂载”，不扫描目录、不请求统计。

### Requirement: DeletedContainers 移动端分页、确认流程与轮询语义不变

#### Scenario: 手机翻页并按当前页采样

- Test/check:
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_14_mobile_page_two_usage
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_mobile_page_two_removes_page_one
- Assertion scope: 既有 locator 断言 390px 点击第二页后显示 `page-two`、用量采样只包含 `[22]`；分页总数文本未在本行断言。该 locator 反向断言 `page-one` 不再出现，当前页只保留第二页记录。
- Coverage note: 既有 locator 覆盖第二页显示与采样；第一页记录移除的反向断言由该 locator 覆盖。

#### Scenario: 手机确认清理与恢复

- Test/check:
  - [X] src/test/DeletedContainers.test.jsx::calls resurrect API for recoverable deleted container after confirmation
  - [X] src/test/DeletedContainersDisplay.test.jsx::test_pagination_usage_polling_cleanup_and_restore_are_unchanged
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_mobile_confirm_clean_and_restore
- Assertion scope: 既有 locator 断言桌面确认后恢复接口收到 `deleted_id`、清理接口收到 `mount_cleanup_id`，成功后刷新当前页；该 locator 在 390px 卡片上分别验证取消确认不调用写接口、确认后才调用，成功后保留当前分页上下文。
- Coverage note: 既有 locator 驱动桌面表格；移动卡片的确认/取消与当前页刷新由该 locator 覆盖。

#### Scenario: pending 时切换分页

- Test/check:
  - [X] src/test/DeletedContainersMountUsage.test.jsx::翻页 abort 旧请求并丢弃迟到响应，不覆盖新页
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_mobile_pending_page_switch_aborts_and_discards
- Assertion scope: 既有 locator 断言桌面翻页 abort 旧统计并丢弃迟到响应；该 locator 在 390px 卡片上从第一页 pending 切到第二页，断言第一页计时器/在途请求取消，迟到响应不写入第二页，第二页只采样自己的可测 ID。
- Coverage note: 既有 locator 覆盖桌面分页；移动卡片的 pending 切换由该 locator 覆盖。

#### Scenario: 移动端最后一页减少

- Test/check:
  - [X] src/test/DeletedContainers.test.jsx::第 3 页缩到第 2 页时回到第 2 页，而不是一律回第一页
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_mobile_last_page_reduction_falls_back_to_valid_page
- Assertion scope: 既有 locator 断言桌面动作后末页减少时回退到新的有效末页；该 locator 在 390px 卡片上执行同一流程，断言只回退到权威末页、有限次重取、不跳第一页、不形成重复请求循环。
- Coverage note: 既有 locator 驱动桌面表格；移动端分页状态机复用同一页面，但移动视口的回退请求由该 locator 覆盖。

#### Scenario: 轮询预算耗尽

- Test/check:
  - [X] src/test/DeletedContainersMountUsage.test.jsx::pending 单计时器精确轮询 120 次后停止，提示测量未完成且不再请求
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_poll_budget_exhausted_manual_refresh
- Assertion scope: 既有 locator 断言单页 120 次预算耗尽后停止自动轮询、显示“测量未完成”；该 locator 在 390px 卡片上点击手动刷新，断言重新采样并继续遵守有界轮询，不无限轮询或改用周期 WSS。
- Coverage note: 该该 locator 与“单页预算耗尽”共享同一测试；既有 locator 覆盖桌面提示，移动端手动刷新由该 locator 覆盖。
