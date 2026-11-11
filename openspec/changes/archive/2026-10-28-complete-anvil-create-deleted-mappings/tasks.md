# Tasks

## 1. 新测试文件与 create-container 基础缺口

- [x] 1.1 新建唯一测试文件 `src/test/AnvilCreateDeleted.test.jsx`，搭建真实 `PermissionProvider`/路由、真实 `showErrorModal`、API 模块替身、deferred/act/waitFor、计时器/剪贴板/fetch cleanup 的本地 helper；不新增共享 fixture，运行 `npx eslint src/test/AnvilCreateDeleted.test.jsx` 通过。
- [x] 1.2 实现 create-container 入口与身份、模板 ready 过滤/失效清空、共享内存 clamp/payload、GPU_LIST 全字段、四行配额标签/滑杆同口径：`test_create_entry_route_mounts_page_and_keeps_identity_snapshot`、`test_create_template_ready_filter_and_stale_selection_cleared`、`test_create_shared_memory_converges_and_payload_never_exceeds_memory`、`test_create_shared_memory_clamps_and_never_emits_overlimit_payload`、`test_create_payload_uses_gpu_list_and_detail_limits`、`test_create_all_quota_rows_show_current_limit_and_layer_labels`、`test_create_all_quota_inputs_share_slider_range`；以真实页面交互为准，正常 UI 不构造 shared>MEMORY 不可达状态。
- [x] 1.3 实现 create-container 受理/凭据/错误缺口：`test_create_accepted_keeps_existing_success_feedback`、`test_create_accepted_emits_no_extra_write_requests`、`test_create_machine_entry_preselects_and_uses_credential_modal`、`test_create_password_clears_on_escape_or_route_leave`、`test_create_legacy_success_keeps_existing_success_message`、`test_create_credential_envelope_rejects_missing_or_non_array_credentials`、`test_create_malformed_accepted_shows_generic_response_error`、`test_create_error_does_not_log_secret_or_raw_body`、`test_create_403_keeps_identity_and_shows_denial`；console 负断言与真实错误弹窗边界按 plan。
- [x] 1.4 运行 create-container 定向测试：`npm run test:web -- src/test/AnvilCreateDeleted.test.jsx -t "test_create_"`，确认新增 create 用例通过；失败只修测试/报告真实业务差异，不改 app。

## 2. create-image 缺口

- [x] 2.1 实现 `test_image_entry_route_and_identity_snapshot`、`test_image_create_payload_includes_actual_create_fields`、`test_image_delete_calls_delete_and_reloads_list`；新建只断言六字段，share/range 归既有编辑分支，不新增分享流程。
- [x] 2.2 运行 create-image 定向测试：`npm run test:web -- src/test/AnvilCreateDeleted.test.jsx -t "test_image_"`，确认通过。

## 3. deleted-containers 入口、状态、恢复与分页

- [x] 3.1 实现入口/身份、Mount 状态、同页刷新、最后一页有界回退：`test_deleted_entry_route_identity_and_row_key`、`test_deleted_mount_status_preserved_escalated_and_cleaned`、`test_deleted_same_page_refresh_keeps_page_and_size`、`test_deleted_last_page_fallback_is_bounded_and_not_duplicated`。
- [x] 3.2 实现 requires_choice snapshot/template、移动端确认清理/恢复、pending 翻页、最后一页回退、预算耗尽手动刷新：`test_deleted_requires_choice_template_resubmits_with_template`、`test_deleted_mobile_confirm_clean_and_restore`、`test_deleted_mobile_pending_page_switch_aborts_and_discards`、`test_deleted_mobile_last_page_reduction_falls_back_to_valid_page`、`test_deleted_poll_budget_exhausted_manual_refresh`。
- [x] 3.3 运行 deleted 分页/恢复定向测试：`npm run test:web -- src/test/AnvilCreateDeleted.test.jsx -t "test_deleted_"`，确认通过；已知 Global Q83 的 2 个测试函数不在最终文件中。

## 4. deleted-containers 用量、响应布局与晚到边界

- [x] 4.1 实现 390/768/769/1440 响应布局、卡片字段值、展开资源/端口/来源、Mount 真实复制、复制失败后续操作、第二页移除 page-one：`test_deleted_table_and_card_share_fields_at_768_769_1440`、`test_deleted_mobile_390_card_values`、`test_deleted_mobile_390_expand_resource_port_and_deletion_source`、`test_deleted_mobile_390_mount_copy_writes_clipboard`、`test_deleted_mobile_copy_failure_keeps_restore_clean_and_usage`、`test_deleted_mobile_page_two_removes_page_one`、`test_deleted_desktop_expand_toggles_without_duplicate_detail`。
- [x] 4.2 实现用量成功大小/时间/无上限轨道/非成功反向、zero/loading 负向、有上限测量时间、过期 usage 丢弃、旧流程/移动旧 key 晚到、pending 动作不阻塞：`test_deleted_mobile_390_usage_success_values_and_non_success_reverse`、`test_deleted_mobile_390_loading_has_no_zero_measurement_or_cleaned_state`、`test_deleted_usage_limit_success_keeps_size_and_measurement_time`、`test_deleted_stale_usage_response_does_not_overwrite_success`、`test_deleted_old_flow_late_response_does_not_overwrite_current_page`、`test_deleted_mobile_stale_expand_key_discards_late_page_response`、`test_deleted_actions_do_not_wait_for_pending_usage`。
- [x] 4.3 运行 deleted 用量/布局定向测试：`npm run test:web -- src/test/AnvilCreateDeleted.test.jsx -t "test_deleted_"`；日期断言使用跨 Win/Ubuntu 稳定格式，移动端只断言 DOM/模式，不伪造真实像素。

## 5. 回归映射套件与 lint

- [x] 5.1 运行相关既有映射套件：`npm run test:web -- src/test/CreateContainer.test.jsx src/test/CreateContainerPassword.test.jsx src/test/ResourceLimits.test.jsx src/test/CreateImage.test.jsx src/test/DeletedContainers.test.jsx src/test/DeletedContainersDisplay.test.jsx src/test/DeletedContainersMobile.test.jsx src/test/DeletedContainersMountUsage.test.jsx src/test/DeletedContainersRestorePassword.test.jsx src/test/credentialResponse.test.js src/test/containerMountUsageApi.test.js src/test/mountUsage.test.js src/test/ErrorPresentation.test.jsx src/test/showErrorModalMap.test.js src/test/CredentialModal.test.jsx src/test/legacyApplyRedirect.test.jsx`。
- [x] 5.2 运行 `npx eslint src/test/AnvilCreateDeleted.test.jsx`，确认新文件 lint 通过；确认 app/config/主 spec/旧测试/依赖未改，复用近期 Web1 build，不重复 build 或全 npm 基线。

## Known Gap

- Global Q83（已登记 e9aef7c）：恢复 `long_term_limit_reached` 时 `DeletedContainers.jsx` 未把 `err.error_reason` 传给 `showErrorModal`，真实弹窗只有 Ctrl 英文 message + 通用 409 中文提示；两个 planned locator 保持 `[ ]`，当前测试函数不存在，未使用 skip/xfail 或弱化断言。父负责 Global 与 Git，本 change 不修 app/规格。

## Workflow follow-up

- 运行 official `openspec-verify-change` advisory，不创建 `verify.md`。
- official no-op sync 三份 delta，保持 Web 28 份 main spec SHA 不变。
- 使用 `anvil-test-plan` 更新三份 canonical 侧车，并让 archive 内 test-plan 的实施状态与侧车一致，保留跨仓/人工限制。
- 以北京时间 2026-10-28 归档 change；父验收 git，未获授权不 commit/push。
