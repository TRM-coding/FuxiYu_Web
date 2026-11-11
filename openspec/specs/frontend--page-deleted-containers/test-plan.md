# frontend--page-deleted-containers Test Plan

Spec: [spec.md](spec.md)

## Current Mapping

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
  - [X] src/test/DeletedContainersMountUsage.test.jsx::列表与分页先出现，异步只请求当前页有路径的正整数 ID；已清理但保留路径也请求
  - [X] src/test/DeletedContainersDisplay.test.jsx::test_loading_and_pending_keep_existing_text_without_progress
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_19_usage_list_first_stats_later
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_actions_do_not_wait_for_pending_usage
- Assertion scope: 列表与分页先按列表响应显示，用量行显示“读取统计中/测量中”；列表不被统计请求阻塞，也不提前写入统计值，移动卡片同样先出现。该 locator 在统计 promise 未决时打开恢复/清理确认并提交，断言写接口不被统计阻塞，列表/分页仍可操作。
- Coverage note: 既有 locator 覆盖列表先出现与统计失败时按钮可用；统计 pending 期间恢复/清理不被阻塞由该 locator 覆盖。

#### Scenario: 仅请求当前页可测记录

- Test/check:
  - [X] src/test/DeletedContainersMountUsage.test.jsx::列表与分页先出现，异步只请求当前页有路径的正整数 ID；已清理但保留路径也请求
  - [X] src/test/mountUsage.test.js::只派生当前页可测 ID，去重且不携带路径；已清理但有路径也包含
  - [X] src/test/containerMountUsageApi.test.js::POST 固定路由，只发送去重正整数 deleted_ids，带 credentials
  - [X] src/test/containerMountUsageApi.test.js::去重后恰好 100 个允许发送；空数组不发请求
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_20_usage_only_current_page_ids
- Assertion scope: 只发送当前页中 `mount_path` 非空且 `deleted_id` 为正整数的 ID，已清理但有历史路径的记录也参与采样；请求体只有去重 `deleted_ids`，单次不超过 100，不含宿主路径、`machine_id` 或其他字段。

#### Scenario: 无挂载、mount_cleaned=true 或 cleaned_at 非空不扫描

- Test/check:
  - [X] src/test/mountUsage.test.js::mount_cleaned=true 即使 cleaned_at 为空仍算已清理，但保留路径时仍可采样
  - [X] src/test/mountUsage.test.js::无 mount、非法 ID 不请求
  - [X] src/test/DeletedContainersDisplay.test.jsx::test_empty_mount_has_no_copy_control_and_empty_image_is_unknown
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_13_mobile_cleaned_with_path_samples_and_no_mount_does_not
- Assertion scope: 无挂载或没有有效 ID 的记录不进入统计请求；已清理但保留历史路径的记录仍进入采样。

#### Scenario: 已清理但保留历史路径仍可采样

- Test/check:
  - [X] src/test/DeletedContainersMountUsage.test.jsx::列表与分页先出现，异步只请求当前页有路径的正整数 ID；已清理但保留路径也请求
  - [X] src/test/mountUsage.test.js::只派生当前页可测 ID，去重且不携带路径；已清理但有路径也包含
- Assertion scope: 已清理但保留 `mount_path` 的记录仍进入当前页用量请求；按钮门禁由“用量派生不改变恢复与清理门禁”场景覆盖，本行不把采样结果当成授权。

### Requirement: DeletedContainers 如实展示逻辑大小与测量时间

#### Scenario: 成功且确实为零

- Test/check:
  - [X] src/test/DeletedContainersDisplay.test.jsx::test_zero_byte_success_renders_success_progress_not_unknown
  - [X] src/test/DeletedContainersMountUsage.test.jsx::列表与分页先出现，异步只请求当前页有路径的正整数 ID；已清理但保留路径也请求
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
  - [X] src/test/DeletedContainersMountUsage.test.jsx::清理开始时旧统计失效；成功后重载按历史路径重采样，迟到响应不贴回旧值
  - [X] src/test/DeletedContainersMountUsage.test.jsx::恢复开始时旧统计失效；成功后迟到响应不贴回旧值且不再扫描
  - [X] src/test/DeletedContainersMountUsage.test.jsx::清理失败不把旧 bytes 贴回；该行保持统计不可用且无后续请求
- Assertion scope: 清理/恢复开始即失效旧统计与计时器；成功后按历史路径重采样，迟到响应不贴回旧 bytes；清理失败也不贴回旧值。

#### Scenario: 单页预算耗尽

- Test/check:
  - [X] src/test/DeletedContainersMountUsage.test.jsx::pending 单计时器精确轮询 120 次后停止，提示测量未完成且不再请求
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_poll_budget_exhausted_manual_refresh
- Assertion scope: 既有 locator 断言初始请求后每 5 秒重查、累计 120 次后停止，显示“测量未完成”且不再后台请求；该 locator 在预算耗尽后点击刷新，断言重新发起列表与统计请求并允许继续观察，不无限轮询或改用 WSS。
- Coverage note: 既有 locator 覆盖预算停止；手动刷新恢复由该 locator 覆盖。

#### Scenario: 暂时超时后恢复

- Test/check:
  - [X] src/test/DeletedContainersMountUsage.test.jsx::Node 查询超时后低频重试，并展示后续成功用量
- Assertion scope: 当前页查询返回 `node_timeout` 时显示稳定超时原因，页面按低频复查；后续成功样本到达后展示真实用量并停止该行快速轮询，不把超时改写成 0 B 或目录不存在。

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
- Assertion scope: 既有 locator 断言翻页、刷新、清理 Mount、恢复沿用既有生命周期；用量只请求当前页可测 ID，清理后重载显示已清理，恢复调用既有接口。该 locator 让旧页列表响应晚于当前页返回，断言当前页记录不被旧响应覆盖。稳定 `not_found` 与原容器已恢复的按钮禁用由门禁场景覆盖，不改变本行的生命周期断言。
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
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_13c_mobile_original_validity_states_and_not_found_action_gate
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_mobile_390_usage_success_values_and_non_success_reverse
- Assertion scope: 既有 locator 断言 390px 下成功有上限行 `aria-valuenow=50`、成功 0 B 行显示“0 B”，并断言 pending/error/缺项/已清理/无挂载的既有文案；该 locator 断言成功行显示实际大小与“测量 {MM-DD HH:mm}”/`title`，无上限成功行显示无比例轨道与 `aria-valuetext`，并反向断言所有非成功行不出现进度条或 0 B。`tc_dc_13c` 另断言已清理成功行按原容器有效性显示“已恢复/可能存在残留/已清理”，`not_found` 行按钮禁用。
- Coverage note: 既有 locator 覆盖部分成功/非成功文案；成功大小/时间、无上限轨道与非成功反向断言由该 locator 覆盖；三态由 `tc_dc_13c` 覆盖。

#### Scenario: 390px 统计未返回时显示读取统计中

- Test/check:
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_12_mobile_usage_loading
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_deleted_mobile_390_loading_has_no_zero_measurement_or_cleaned_state
- Assertion scope: 既有 locator 断言列表已返回而统计请求未返回时可测记录显示“读取统计中”、无 `progressbar`，随后解析为 pending 时显示“测量中”。该 locator 在 390px 同时放可测、已清理、无挂载记录，断言等待与 pending 阶段可测行无 0 B、无测量时间、无“已清理”状态，已清理/无挂载仍显示原状态。
- Coverage note: 既有 locator 只覆盖“读取统计中/测量中”与无进度条；0 B/测量时间/已清理状态的负向条件由该 locator 覆盖。

#### Scenario: 已清理与无挂载不采样

- Test/check:
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_13_mobile_cleaned_with_path_samples_and_no_mount_does_not
  - [X] src/test/DeletedContainersMountUsage.test.jsx::列表与分页先出现，异步只请求当前页有路径的正整数 ID；已清理但保留路径也请求
- Assertion scope: 已清理但保留路径的记录参与采样，成功结果显示“可能存在残留”；无挂载记录不进入请求并显示“无挂载”。

#### Scenario: 已清理状态优先于采集错误

- Test/check:
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_13b_mobile_actual_state_does_not_mislabel_pending_or_node_failures
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_13c_mobile_original_validity_states_and_not_found_action_gate
- Assertion scope: 移动端已清理记录遇目录不存在或无权限时状态仍显示已清理，用量列分别显示采集错误；等待和节点不可用不误报残留。`tc_dc_13c` 进一步断言已清理成功按 `original_container_is_valid` 三态显示，`not_found` 且原容器非有效时恢复/清理禁用并提示目录不存在。

### Requirement: DeletedContainers 按用量结果派生挂载实际状态

#### Scenario: 无挂载仍显示无挂载

- Test/check:
  - [X] src/test/mountUsage.test.js::无挂载优先级最高：即使已清理且有成功（含 0 B）/错误用量也不改写
  - [X] src/test/DeletedContainersMountUsage.test.jsx::状态优先级：无挂载 > 已清理成功（含 0）残留 > 已清理 > not_found/permission_denied
- Assertion scope: 无路径时状态为无挂载，不被成功或错误样本覆盖；页面不请求该记录。

#### Scenario: 已清理且路径成功采集到用量

- Test/check:
  - [X] src/test/DeletedContainersDisplay.test.jsx::test_cleaned_priority_precedes_usage_errors_while_unclean_rows_keep_explicit_states
  - [X] src/test/DeletedContainersMountUsage.test.jsx::已清理且成功采集按原容器有效性显示已恢复/可能存在残留/已清理
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_13c_mobile_original_validity_states_and_not_found_action_gate
  - [X] src/test/mountUsage.test.js::已清理且成功采集时，原容器有效显示已恢复
  - [X] src/test/mountUsage.test.js::已清理且成功采集时，原容器仍无效才显示可能存在残留
  - [X] src/test/mountUsage.test.js::已清理且成功采集但原容器有效性未知时保持已清理，不误判
- Assertion scope: 已清理且成功采集时，严格 `original_container_is_valid=true` 显示“已恢复”，严格 `false` 显示“可能存在残留”，`null`/缺失/非布尔显示“已清理”；采集列仍显示实际大小、时间与成功进度；`true` 时恢复/清理禁用并提示“已恢复”/“已恢复，无法清理”，成功结果本身不解除既有门禁。

#### Scenario: 已清理且成功采集为 0 B

- Test/check:
  - [X] src/test/DeletedContainersDisplay.test.jsx::test_cleaned_zero_byte_sample_is_residual_not_cleaned
  - [X] src/test/mountUsage.test.js::已清理且成功采集时，原容器有效显示已恢复
  - [X] src/test/mountUsage.test.js::已清理且成功采集时，原容器仍无效才显示可能存在残留
  - [X] src/test/mountUsage.test.js::已清理且成功采集但原容器有效性未知时保持已清理，不误判
- Assertion scope: 0 B 成功样本仍按原容器有效性三态显示“已恢复/可能存在残留/已清理”；采集列显示 0 B、真实时间与成功进度，不把 0 B 解释为无残留或已占用；`true` 时按钮按已恢复门禁禁用。

#### Scenario: 已清理且采集目录不存在

- Test/check:
  - [X] src/test/DeletedContainersDisplay.test.jsx::test_cleaned_priority_precedes_usage_errors_while_unclean_rows_keep_explicit_states
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_13b_mobile_actual_state_does_not_mislabel_pending_or_node_failures
  - [X] src/test/mountUsage.test.js::用量明确目录不存在时同时禁用恢复与清理，并给出稳定原因
- Assertion scope: 已清理且 `original_container_is_valid !== true` 时状态仍显示“已清理”，采集列显示“统计不可用（目录不存在）”；恢复/清理禁用并提示目录不存在；`true` 时按已恢复门禁优先，提示已恢复。

#### Scenario: 已清理且采集无权限

- Test/check:
  - [X] src/test/DeletedContainersDisplay.test.jsx::test_cleaned_priority_precedes_usage_errors_while_unclean_rows_keep_explicit_states
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_13b_mobile_actual_state_does_not_mislabel_pending_or_node_failures
  - [X] src/test/mountUsage.test.js::pending、成功、缺项与其他错误都不改变恢复与清理门禁
- Assertion scope: 已清理优先于无权限，采集列保留错误说明，桌面及移动端一致；`permission_denied` 不改变恢复/清理门禁，`original_container_is_valid=true` 时已恢复门禁仍独立生效。

#### Scenario: 未完成、其他失败或 Node 不可用

- Test/check:
  - [X] src/test/mountUsage.test.js::已清理优先于 not_found、permission_denied、pending 与其他失败
  - [X] src/test/mountUsage.test.js::pending、成功、缺项与其他错误都不改变恢复与清理门禁
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_13b_mobile_actual_state_does_not_mislabel_pending_or_node_failures
- Assertion scope: 已清理记录遇等待或节点不可用仍显示已清理，不伪称残留或不存在；这些结果不改变恢复/清理门禁，`original_container_is_valid=true` 时已恢复门禁仍独立生效。

#### Scenario: 目录不存在

- Test/check:
  - [X] src/test/DeletedContainersDisplay.test.jsx::test_cleaned_priority_precedes_usage_errors_while_unclean_rows_keep_explicit_states
  - [X] src/test/mountUsage.test.js::用量明确目录不存在时同时禁用恢复与清理，并给出稳定原因
  - [X] src/test/DeletedContainersMountUsage.test.jsx::只有用量目录不存在时额外禁用恢复与清理并给原因，其他用量与既有门禁不变
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_13c_mobile_original_validity_states_and_not_found_action_gate
- Assertion scope: 未清理且 `original_container_is_valid !== true` 时展示“目录不存在”与采集错误；恢复/清理均禁用，title 为“挂载目录不存在，无法恢复/无需清理”，确认框不打开且不调用写接口。

#### Scenario: 无权限读取目录

- Test/check:
  - [X] src/test/DeletedContainersDisplay.test.jsx::test_cleaned_priority_precedes_usage_errors_while_unclean_rows_keep_explicit_states
  - [X] src/test/DeletedContainersMountUsage.test.jsx::只有用量目录不存在时额外禁用恢复与清理并给原因，其他用量与既有门禁不变
  - [X] src/test/mountUsage.test.js::pending、成功、缺项与其他错误都不改变恢复与清理门禁
- Assertion scope: 未清理且无权限时展示相应状态与错误说明；`permission_denied` 不改变恢复/清理门禁，页面只按既有列表字段与 `original_container_is_valid=true` 的已恢复门禁决定按钮。

#### Scenario: 未清理且未完成或其他失败

- Test/check:
  - [X] src/test/mountUsage.test.js::成功采集只把已清理记录提升为残留，未清理仍回退列表事实
  - [X] src/test/mountUsage.test.js::pending、成功、缺项与其他错误都不改变恢复与清理门禁
- Assertion scope: 未清理记录等待或超时时保留列表状态，不误报残留；这些结果不改变恢复/清理门禁，`original_container_is_valid=true` 时已恢复门禁仍独立生效。

### Requirement: DeletedContainers 用量派生不改变恢复与清理门禁

#### Scenario: 残留状态不解除清理禁用

- Test/check:
  - [X] src/test/mountUsage.test.js::其他既有门禁保持不变：无快照/不可恢复/挂载清理记录/已清理
  - [X] src/test/DeletedContainersMountUsage.test.jsx::已清理且成功采集按原容器有效性显示已恢复/可能存在残留/已清理
- Assertion scope: 纯函数在 `cleaned_at` 非空时保持清理禁用并给出既有原因；页面按严格三态显示“已恢复/可能存在残留/已清理”，成功采集本身不解除已清理记录的原门禁。
- Coverage note: 纯函数覆盖 `cleaned_at` 门禁，页面用例覆盖三态展示；未单独点击断言“残留 + cleaned_at”组合按钮。

#### Scenario: 历史路径不改变提交参数

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_restore_and_cleanup_request_bodies_stay_unchanged
- Assertion scope: 恢复仍只提交 `{ deleted_id, content_source }`，清理仍只提交 `{ mount_cleanup_id }`，列表刷新仍只提交当前页/页大小；任何请求体均不含 `mount_path`、`machine_id` 或清理状态。

#### Scenario: 目录不存在禁用恢复与清理并提示

- Test/check:
  - [X] src/test/DeletedContainersMountUsage.test.jsx::只有用量目录不存在时额外禁用恢复与清理并给原因，其他用量与既有门禁不变
  - [X] src/test/DeletedContainersMountUsage.test.jsx::目录不存在样本被后续复查替换为非 not_found 后，按钮按原列表字段恢复
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_13c_mobile_original_validity_states_and_not_found_action_gate
- Assertion scope: 桌面 locator 断言用量 `not_found` 时恢复/清理均禁用，原因分别为“挂载目录不存在，无法恢复”/“挂载目录不存在，无需清理”，点击不打开确认、不发写请求；样本变为非 `not_found` 后按列表字段恢复。移动 locator 只断言 disabled 与 title，不点击。
- Coverage note: 移动端 `tc_dc_13c` 只覆盖禁用与标题；点击负向断言由桌面 locator 覆盖。

#### Scenario: 历史删除记录残留但原容器已恢复

- Test/check:
  - [X] src/test/DeletedContainersMountUsage.test.jsx::已清理且成功采集按原容器有效性显示已恢复/可能存在残留/已清理
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_13c_mobile_original_validity_states_and_not_found_action_gate
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_restored_gate_blocks_confirm_without_write
- Assertion scope: `original_container_is_valid === true` 时桌面或移动端恢复/清理均禁用，原因分别为“已恢复”/“已恢复，无法清理”，且该门禁优先于用量与清理状态；新增页面用例真实点击并断言确认框不打开、`resurrectDeletedContainer`/`cleanDeletedContainerMount` 均未调用。

#### Scenario: 原容器启用状态解除后恢复门禁

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_original_validity_change_recomputes_gate
- Assertion scope: 刷新后 `original_container_is_valid` 从严格 `true` 变为 `false`，旧“已恢复”禁用不再保留，恢复与清理按既有列表字段启用。
- Coverage note: 该用例未覆盖变为 `null`/缺失、`not_found` 或 `cleaning` 同时存在的分支。

#### Scenario: 清理中禁用清理与恢复并阻止确认

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_cleaning_blocks_both_actions_and_confirm
- Assertion scope: 未清理记录 `mount_cleanup_state === "cleaning"` 时恢复与清理均 disabled，标题分别为“清理进行中，无法恢复”/“清理进行中”；点击不打开 Popconfirm/Modal，不调用恢复或清理写接口。

#### Scenario: 清理失败或未知后重新计算门禁

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_failed_or_unknown_recomputes_existing_action_gates
  - [X] src/test/mountUsage.test.js::其他既有门禁保持不变：无快照/不可恢复/挂载清理记录/已清理
- Assertion scope: `failed`/`unknown`/`null` 不再按“清理中”锁定；`data_recoverable` 且用量未 `not_found` 时恢复与清理可用；`not_found`/已恢复仍按既有门禁优先禁用。纯函数 locator 证明原列表门禁未变。


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

### Requirement: DeletedContainers 异步清理受理与列表状态

#### Scenario: 受理后显示清理中而不是成功

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_clean_acceptance_starts_list_refresh_without_success
- Assertion scope: 清理请求精确调用一次、参数为现有 `mount_cleanup_id`；Ctrl 返回 `accepted: true` 后该行显示“清理中”，不出现 `message.success` 或“已清理”，列表记录不被本地改写；随即按当前页调用 `listDeletedContainers`，不等待 Node，不调用独立状态接口。

#### Scenario: 列表刷新恢复进程内清理中

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_list_refresh_hydrates_cleaning_state
- Assertion scope: 列表返回未清理记录的 `mount_cleanup_state: "cleaning"` 时，页面打开即显示“清理中”，恢复与清理按钮禁用；同一列表中历史 `cleaned_at` 记录仍显示“已清理”；不依赖 localStorage 或额外状态接口。

#### Scenario: 列表轮询单飞并取消旧请求

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_cleanup_list_refresh_is_single_flight_and_cancelled
- Assertion scope: 存在 `cleaning` 时 3 秒后发起列表刷新；首个请求未结算时不叠加下一请求；卸载时传出的 AbortSignal 被 abort，迟到响应不写入。
- Coverage note: 该 locator 未覆盖 401/403 停止路径、网络失败后保留 cleaning 与继续重试；这些分支仅由实现代码与规格约束，页面测试尚未单独断言。

#### Scenario: 只刷新当前页并保留列表事实

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_cleanup_refresh_merges_current_page_only
- Assertion scope: 刷新请求使用当前页与页大小；合并后用量查询次数不增加，已展开详情仍在；不发送路径、机器 ID 或 Node 地址。

### Requirement: DeletedContainers 清理结果与既有清理事实

#### Scenario: 既有 cleaned_at 或 mount_cleaned 显示已清理

- Test/check:
  - [X] src/test/DeletedContainersDisplay.test.jsx::test_cleaned_priority_precedes_usage_errors_while_unclean_rows_keep_explicit_states
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_cleaned_fields_win_over_new_states
- Assertion scope: 既有 locator 断言已清理状态优先于用量错误；新页面用例在 `cleaned_at`/`mount_cleaned` 与 `mount_cleanup_state` 的 `null`/`cleaning`/`failed`/`unknown` 同时存在时，仍显示“已清理”、两按钮禁用，不显示失败/未知/清理中，也不提前提示成功。

#### Scenario: 失败或未知不冒充成功

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_failed_or_unknown_never_claims_success
- Assertion scope: 未清理记录 `failed`/`unknown` 分别显示“清理失败”/“清理状态未知”，不显示“已清理”或成功提示，不回显原始 Node 文本；在 `data_recoverable` 且用量非 `not_found` 时恢复与清理按钮均启用。

#### Scenario: 失败或未知回退既有门禁并开放恢复

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_partial_delete_failed_unknown_reopens_restore_and_clean
- Assertion scope: `failed` 且 `data_recoverable`、用量成功时恢复与清理按钮均启用；点击恢复出现既有确认，确认后调用 `resurrectDeletedContainer(7, null)`；清理按钮未自动提交。
- Coverage note: 清理按钮只断言可用，未点击其确认；用量为 `not_found` 时仍按路径门禁禁用两项。

#### Scenario: 清理中与实时 not_found 并存时清理中优先

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_cleaning_overrides_live_not_found_until_task_ends
- Assertion scope: 未清理记录同时返回 `mount_cleanup_state: "cleaning"` 与用量 `not_found` 时显示“清理中”而非“目录不存在”，恢复与清理均禁用；随后列表不再返回 `cleaning` 且用量仍为 `not_found` 时改显“目录不存在”，两项仍禁用，不显示“已清理”或成功提示。

#### Scenario: 目录不存在沿用路径门禁正常显示

- Test/check:
  - [X] src/test/DeletedContainersMountUsage.test.jsx::只有用量目录不存在时额外禁用恢复与清理并给原因，其他用量与既有门禁不变
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_13c_mobile_original_validity_states_and_not_found_action_gate
- Assertion scope: 非 `cleaning` 记录在用量 `not_found` 时显示“目录不存在”/“统计不可用（目录不存在）”；桌面 locator 断言两项禁用、title 正确，点击不打开确认、不发写请求；移动 locator 只断言 disabled 与 title。
- Coverage note: 移动端未断言用量文案与点击负向；这两项由桌面 locator 覆盖。

#### Scenario: 非法清理状态按未知处理

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_invalid_state_maps_to_unknown
- Assertion scope: 未清理、用量非 `not_found` 时，非法 `mount_cleanup_state` 按 `unknown` 显示“清理状态未知”，不显示“已清理”或成功提示，不回显非法值；恢复与清理按既有列表/用量门禁启用。

#### Scenario: Ctrl 重启丢失状态

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_ctrl_restart_missing_state_falls_back_without_stuck_cleaning
- Assertion scope: 受理后列表返回 `mount_cleanup_state: null` 且既有清理字段为空时，不显示“已清理”或成功提示，不永久停留在“清理中”；恢复与清理按钮重新开放，不自动写操作。

#### Scenario: 清理请求本身失败

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_cleanup_request_rejection_keeps_error_and_starts_no_poll
- Assertion scope: 清理请求 reject 时不进入“清理中”，不显示成功，不启动新的列表轮询；调用既有 `showErrorModal`，初始列表仅请求一次。

### Requirement: DeletedContainers 保留其他删除页功能

#### Scenario: 单行清理不阻塞其他行与分页

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_cleaning_row_does_not_block_other_rows_or_pagination
- Assertion scope: 当前页一行 `cleaning` 时整页刷新按钮可用，另一行恢复仍可提交；切换到第二页后只显示第二页记录，旧 `cleaning` 状态不继承。
- Coverage note: 该用例未逐项断言其他行的用量轮询与详情展开；这些行为由既有页面测试和同一门禁逻辑覆盖。

#### Scenario: 恢复二选一与凭据弹窗不变

- Test/check:
  - [X] src/test/DeletedContainers.test.jsx::asks which content to use when the restore response says a choice is needed
  - [X] src/test/DeletedContainersRestorePassword.test.jsx::test_deleted_restore_root_credential shows root password, bypasses requires_choice, and keeps errors sanitized
- Assertion scope: 既有 locator 断言 `requires_choice` 显示 snapshot/template 两份配方、默认选择与重新提交，以及恢复成功后的 root 凭据弹窗、`requires_choice` 绕过凭据解析和失败脱敏；恢复参数与选择流程不变。

#### Scenario: 手动刷新与移动卡片可用

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_manual_refresh_and_mobile_cleaning_status
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_01_mobile_390_seven_columns
- Assertion scope: 390px 卡片显示七列、状态“清理中”、恢复/清理按钮禁用；刷新按钮可用并重新请求列表。既有 mobile locator 只证明七列卡片布局，不证明清理状态。
- Coverage note: 该用例未断言其他卡片的复制、详情和恢复操作；这些既有交互未在本变更中修改。

#### Scenario: 旧 Ctrl 或缺少新字段

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_legacy_success_without_new_fields_never_claims_success
- Assertion scope: 清理返回旧式 `{ success: 1 }`、列表缺少新状态字段时，不显示“已清理”或成功提示，不把旧 `success` 当受理；历史 `cleaned_at`/`mount_cleaned` 仍显示已清理，其余按既有列表事实展示并恢复操作。
