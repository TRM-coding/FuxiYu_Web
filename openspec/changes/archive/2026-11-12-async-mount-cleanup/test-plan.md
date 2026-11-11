# Test Plan

<!-- Mapping only：本文件是 scenario→test 计划，不是执行结果台账。
     `[X]` 仅表示该既有测试/检查存在且其当前断言已从测试代码或规格映射核对。
     `[ ]` 表示规划中的 locator，尚未创建、尚未确认断言，不代表执行结果或完整覆盖。
     本变更尚未实现；apply 时需为既有页面测试补新列表字段替身，并新增本计划中的 planned locator。 -->

## frontend--page-deleted-containers

### Requirement: DeletedContainers 用量派生不改变恢复与清理门禁

#### Scenario: 残留状态不解除清理禁用

- Test/check:
  - [X] src/test/mountUsage.test.js::其他既有门禁保持不变：无快照/不可恢复/挂载清理记录/已清理
  - [X] src/test/DeletedContainersMountUsage.test.jsx::已清理且成功采集按原容器有效性显示已恢复/可能存在残留/已清理
- Assertion scope: 纯函数在 `cleaned_at` 非空时保持清理禁用并给出既有原因；页面按严格三态显示“已恢复/可能存在残留/已清理”，成功采集本身不解除已清理记录的原门禁。既有 locator 未断言“残留 + 已清理”组合下清理按钮的页面点击，只证明纯函数与展示。
- Coverage note: 既有 locator 覆盖原门禁基座；新增 `mount_cleanup_state` 与这些既有事实的优先级由本计划“既有 cleaned_at 或 mount_cleaned 显示已清理”场景规划。

#### Scenario: 历史路径不改变提交参数

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_restore_and_cleanup_request_bodies_stay_unchanged
- Assertion scope: 规划用例断言恢复仍只提交 `{ deleted_id, content_source }`，清理仍只提交 `{ mount_cleanup_id }`，列表刷新仍只提交当前页/页大小；任何请求体均不含 `mount_path`、`machine_id` 或清理状态；确认流程与当前页刷新不变。
- Coverage note: 规划用例尚未创建/确认；既有 `test_pagination_usage_polling_cleanup_and_restore_are_unchanged` 的同步清理成功断言会因受理变更而需要改写，不能把其当前断言当作新行为已覆盖。

#### Scenario: 目录不存在禁用恢复与清理并提示

- Test/check:
  - [X] src/test/DeletedContainersMountUsage.test.jsx::只有用量目录不存在时额外禁用恢复与清理并给原因，其他用量与既有门禁不变
  - [X] src/test/DeletedContainersMountUsage.test.jsx::目录不存在样本被后续复查替换为非 not_found 后，按钮按原列表字段恢复
- Assertion scope: 当前页用量稳定为 `not_found` 且 `original_container_is_valid !== true` 时恢复/清理均禁用，原因分别为“挂载目录不存在，无法恢复”/“挂载目录不存在，无需清理”，确认框不打开、不发写请求；样本变为非 `not_found` 后按列表字段重新计算。
- Coverage note: 既有 locator 覆盖路径/用量来源的目录不存在门禁；新清理字段不新增 `not_found` 状态，后端字段兼容由“失败或未知不冒充成功”与“清理中与实时 not_found 并存时清理中优先”场景补充。

#### Scenario: 历史删除记录残留但原容器已恢复

- Test/check:
  - [X] src/test/DeletedContainersMountUsage.test.jsx::已清理且成功采集按原容器有效性显示已恢复/可能存在残留/已清理
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_13c_mobile_original_validity_states_and_not_found_action_gate
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_restored_gate_blocks_confirm_without_write
- Assertion scope: `original_container_is_valid === true` 时桌面或移动端恢复/清理均禁用，原因分别为“已恢复”/“已恢复，无法清理”，且该门禁优先于用量与清理状态；既有 locator 断言 disabled 与 title，规划 locator 再真实点击并断言确认框不打开、`resurrectDeletedContainer`/`cleanDeletedContainerMount` 均未调用。
- Coverage note: 既有 locator 未直接断言点击后的无确认/无写请求，该负向行为由 planned locator 补齐；不能把 disabled 属性当成点击负向断言。

#### Scenario: 原容器启用状态解除后恢复门禁

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_original_validity_change_recomputes_gate
- Assertion scope: 规划用例刷新当前页后让 `original_container_is_valid` 从严格 `true` 变为 `false`/缺失，断言旧“已恢复”禁用不再保留；若用量不为 `not_found` 且记录未处于“清理中”，按既有 `data_recoverable`/`snapshot` 字段决定；若为 `not_found` 或未清理的 `cleaning`，仍分别按目录不存在/清理中禁用。
- Coverage note: 规划用例尚未创建/确认；需要覆盖列表事实变化与新清理状态共同参与门禁的组合。

#### Scenario: 清理中禁用清理与恢复并阻止确认

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_cleaning_blocks_both_actions_and_confirm
- Assertion scope: 规划用例让未清理记录的状态为 `cleaning`，断言恢复与清理按钮均 disabled，标题分别为“清理进行中，无法恢复”/“清理进行中”；点击不打开 Popconfirm/Modal，不调用 `resurrectDeletedContainer` 或 `cleanDeletedContainerMount`；另一行操作不受影响。
- Coverage note: 规划用例尚未创建/确认；该场景覆盖新增的第三类门禁，不能由既有用量派生门禁用例替代。

#### Scenario: 清理失败或未知后重新计算门禁

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_failed_or_unknown_recomputes_existing_action_gates
  - [X] src/test/mountUsage.test.js::其他既有门禁保持不变：无快照/不可恢复/挂载清理记录/已清理
- Assertion scope: 规划用例让状态为 `failed`/`unknown`/`null`，断言页面不再显示“清理中”禁用，按 `data_recoverable`、`snapshot`、`cleaned_at`、`mount_cleanup_id` 与用量项重新计算；可恢复且用量未 `not_found` 时恢复与清理可用，`not_found`/已恢复仍分别优先禁用。既有纯函数 locator 只证明原列表门禁未变，不证明状态切换后的页面联动。
- Coverage note: 规划用例尚未创建/确认；既有 locator 覆盖原门禁基座，新增状态切换后的重新计算由 planned locator 覆盖。

### Requirement: DeletedContainers 异步清理受理与列表状态

#### Scenario: 受理后显示清理中而不是成功

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_clean_acceptance_starts_list_refresh_without_success
- Assertion scope: 规划用例确认清理请求精确调用一次、参数为现有 `mount_cleanup_id`，Ctrl 返回 `accepted: true` 后该行显示“清理中”，不出现 `message.success` 或“已清理”，列表记录不被本地改写；随即按当前页调用一次 `listDeletedContainers`，不等待 Node，不调用独立状态接口。
- Coverage note: 规划用例尚未创建/确认；必须同时断言受理展示与立即列表刷新，不能只断言 `accepted` 被读取。

#### Scenario: 列表刷新恢复进程内清理中

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_list_refresh_hydrates_cleaning_state
- Assertion scope: 规划用例让列表返回未清理记录的 `mount_cleanup_state: "cleaning"`，断言页面打开/刷新后直接显示“清理中”、两按钮禁用；同一列表中历史 `cleaned_at`/`mount_cleaned` 记录仍显示“已清理”；不依赖 localStorage 或额外状态接口。
- Coverage note: 规划用例尚未创建/确认；重点覆盖“刷新页面读取列表进程内状态”和“历史清理事实不依赖新状态”两个 THEN。

#### Scenario: 列表轮询单飞并取消旧请求

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_cleanup_list_refresh_is_single_flight_and_cancelled
- Assertion scope: 规划用例用 fake timers 与未决列表请求断言存在 `cleaning` 时 3 秒间隔刷新、上一请求结算后才安排下一拍、同一时刻最多一个请求在途；翻页或卸载时 signal 被 abort，迟到响应不写入新页；401/403 停止查询，网络失败保留最后 `cleaning` 而不显示成功。
- Coverage note: 规划用例尚未创建/确认；页面用例覆盖生命周期，不把 jsdom 计时当作真实网络或 Ctrl 轮询。

#### Scenario: 只刷新当前页并保留列表事实

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_cleanup_refresh_merges_current_page_only
- Assertion scope: 规划用例断言刷新仍使用当前页与页大小，只合并当前页记录的 `mount_cleanup_state`、`mount_cleanup_error_reason` 与既有清理字段；不重置分页、展开行、用量轮询、复制或详情；请求不含路径、机器 ID 或 Node 地址，沿用 `container:manage`。
- Coverage note: 规划用例尚未创建/确认；该场景防止实现用整页重载破坏既有交互，不能只用“列表调用次数”替代合并范围断言。

### Requirement: DeletedContainers 清理结果与既有清理事实

#### Scenario: 既有 cleaned_at 或 mount_cleaned 显示已清理

- Test/check:
  - [X] src/test/DeletedContainersDisplay.test.jsx::test_cleaned_priority_precedes_usage_errors_while_unclean_rows_keep_explicit_states
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_cleaned_fields_win_over_new_states
- Assertion scope: 既有 locator 断言已清理状态优先于用量错误；规划用例在列表同时返回 `cleaned_at`/`mount_cleaned` 与 `mount_cleanup_state` 的 `null`/`cleaning`/`failed`/`unknown` 时，断言仍显示“已清理”、采用既有已清理门禁、不显示失败/未知/清理中，且仅在本次受理后的首次成功事实出现时提示成功。
- Coverage note: 既有 locator 不含新字段；规划用例尚未创建/确认，必须覆盖新状态不能覆盖历史清理事实的优先级。

#### Scenario: 失败或未知不冒充成功

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_failed_or_unknown_never_claims_success
- Assertion scope: 规划用例让未清理记录返回 `failed`/`unknown` 及稳定 `mount_cleanup_error_reason`，断言分别显示“清理失败”/“清理状态未知”，不显示“已清理”或成功提示，不回显原始 Node 文本；不自动重试写请求；在 `data_recoverable` 且用量非 `not_found` 时，恢复与清理按钮均启用，并分别按既有字段计算。
- Coverage note: 规划用例尚未创建/确认；失败提示、未知提示与恢复/清理两枚按钮的启用状态必须分别断言，不能仅以标签存在替代。

#### Scenario: 失败或未知回退既有门禁并开放恢复

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_partial_delete_failed_unknown_reopens_restore_and_clean
- Assertion scope: 规划用例让状态为 `failed`/`unknown`、记录仍 `data_recoverable` 且用量成功（目录仍存在），断言恢复与清理按钮均重新开放；点击恢复先出现既有恢复确认，确认才调用 `resurrectDeletedContainer(7, null)`；清理按钮按 `mount_cleanup_id` 可用但不自动提交；不声称目录完整、不自动恢复或清理。
- Coverage note: 规划用例尚未创建/确认；该场景固化用户明确接受的部分删除风险，并同时覆盖恢复与清理两枚按钮，不能只断言恢复；用量为 `not_found` 时仍按路径门禁禁用两项。

#### Scenario: 清理中与实时 not_found 并存时清理中优先

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_cleaning_overrides_live_not_found_until_task_ends
- Assertion scope: 规划用例先让未清理记录同时返回 `mount_cleanup_state: "cleaning"` 与用量 `not_found`，断言显示“清理中”而非“目录不存在”，恢复与清理均禁用并提示清理进行中，不显示成功、不打开确认、不发写请求；随后列表不再返回 `cleaning` 且用量仍为 `not_found`，断言改显“目录不存在”，两项仍按路径门禁禁用并给出既有原因，不显示“已清理”或成功提示。
- Coverage note: 规划用例尚未创建/确认；必须覆盖“任务结束前清理中优先、任务结束后回落到既有 not_found”两阶段，不能只断言其中一个状态。

#### Scenario: 目录不存在沿用路径门禁正常显示

- Test/check:
  - [X] src/test/DeletedContainersMountUsage.test.jsx::只有用量目录不存在时额外禁用恢复与清理并给原因，其他用量与既有门禁不变
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_13c_mobile_original_validity_states_and_not_found_action_gate
- Assertion scope: 既有桌面/移动 locator 断言非 `cleaning` 记录在用量 `not_found` 时显示“目录不存在”/“统计不可用（目录不存在）”，恢复与清理禁用并给出既有原因，点击不打开确认、不发写请求；不新增 `not_found` 清理状态。
- Coverage note: 既有 locator 覆盖非 `cleaning` 的路径门禁；`cleaning` 与实时 `not_found` 共存的优先级由本计划“清理中与实时 not_found 并存时清理中优先”的 planned locator 覆盖。

#### Scenario: 非法清理状态按未知处理

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_invalid_state_maps_to_unknown
- Assertion scope: 规划用例向未清理、用量非 `not_found` 的记录返回不在 `null`/`cleaning`/`failed`/`unknown` 内的状态值（如 `"succeeded"` 或任意字符串），断言按 `unknown` 显示“清理状态未知”，不显示“已清理”或成功提示，不回显非法值原文；恢复与清理按钮按既有列表/用量门禁计算。
- Coverage note: 规划用例尚未创建/确认；该精简用例只覆盖非法值映射与不冒充成功，不重复完整的未知/重启流程。

#### Scenario: Ctrl 重启丢失状态

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_ctrl_restart_missing_state_falls_back_without_stuck_cleaning
- Assertion scope: 规划用例在受理后让列表返回 `mount_cleanup_state: null`/缺失且既有清理字段为空，断言不显示成功/“已清理”、不永久停留在“清理中”，回退既有列表事实并按既有门禁重新开放；不自动清理或恢复，不调用独立状态接口。
- Coverage note: 规划用例尚未创建/确认；必须覆盖“本地已受理但服务端状态丢失”的降级，而不是只测初次打开无状态。

#### Scenario: 清理请求本身失败

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_cleanup_request_rejection_keeps_error_and_starts_no_poll
- Assertion scope: 规划用例让清理请求 reject（500/超时/旧式失败响应），断言不进入“清理中”成功路径、不显示成功、不启动新的列表轮询；按既有 `showErrorModal` 展示安全错误，列表与操作门禁按原事实保留，不自动重试。
- Coverage note: 规划用例尚未创建/确认；请求失败与“已受理后状态失败”是不同分支，不能合并成同一断言。

### Requirement: DeletedContainers 保留其他删除页功能

#### Scenario: 单行清理不阻塞其他行与分页

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_cleaning_row_does_not_block_other_rows_or_pagination
- Assertion scope: 规划用例让第一页一行 `cleaning`，断言其他行的恢复/详情/用量仍可用，分页仍请求当前页；切换页面后新页不继承旧页的清理中状态，旧轮询被取消；整页刷新不被清理中的行锁死。
- Coverage note: 规划用例尚未创建/确认；既有 `test_pagination_usage_polling_cleanup_and_restore_are_unchanged` 的清理成功分支会改为异步，不能直接当作本场景已覆盖。

#### Scenario: 恢复二选一与凭据弹窗不变

- Test/check:
  - [X] src/test/DeletedContainers.test.jsx::asks which content to use when the restore response says a choice is needed
  - [X] src/test/DeletedContainersRestorePassword.test.jsx::test_deleted_restore_root_credential shows root password, bypasses requires_choice, and keeps errors sanitized
- Assertion scope: 既有 locator 断言 `requires_choice` 显示 snapshot/template 两份配方、默认选择与重新提交，以及恢复成功后的 root 凭据弹窗、`requires_choice` 绕过凭据解析和失败脱敏；本轮不改变恢复接口参数、选择流程或凭据语义。
- Coverage note: 既有 locator 未与清理状态联动；其页面 mock 在 apply 时需补列表新字段，但恢复断言本身仍是有效映射。

#### Scenario: 手动刷新与移动卡片可用

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_manual_refresh_and_mobile_cleaning_status
  - [X] src/test/DeletedContainersMobile.test.jsx::tc_dc_01_mobile_390_seven_columns
- Assertion scope: 规划用例在 390px 断言清理中卡片仍显示七列、状态为“清理中”、恢复/清理按钮禁用，刷新按钮可用并重新请求列表；其他卡片复制、详情和恢复不受影响。既有 mobile locator 只证明七列卡片布局，不证明清理状态。
- Coverage note: 规划用例尚未创建/确认；移动端新增状态展示必须补真实卡片断言，不能只引用桌面表格测试。

#### Scenario: 旧 Ctrl 或缺少新字段

- Test/check:
  - [X] src/test/DeletedContainersAsyncCleanup.test.jsx::test_legacy_success_without_new_fields_never_claims_success
- Assertion scope: 规划用例让清理返回旧式 `{ success: 1 }`、列表缺少 `mount_cleanup_state`/`mount_cleanup_error_reason`，断言不显示“已清理”或成功提示、不把旧 `success` 当受理；历史 `cleaned_at`/`mount_cleaned` 仍显示已清理，其余按既有列表事实与门禁展示；不新增状态接口、不直连 Node、不自动重试。
- Coverage note: 规划用例尚未创建/确认；旧式响应与缺少新列表字段是两个兼容分支，均须保留“不冒充成功”的负向断言。
