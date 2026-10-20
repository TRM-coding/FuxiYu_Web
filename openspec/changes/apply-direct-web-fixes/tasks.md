# 任务

第 2 轮审查的 Required Changes 1–6 已由同一审查者定向复核，`APPROVE_WITH_CHANGES`、`CHANGES_APPLIED: yes`。现在开始实施；新增行为先记录失败基线再修复，已有正确行为不人为制造失败。证据位记录真实命令、退出码与测试汇总，不能只写“已通过”。

## 0. 审查门禁（apply 前）

- [x] 0.1 同一审查者已定向复核 Required Changes 1–6，并确认 `CHANGES_APPLIED: yes`。
  - 证据位：最新 `review.md` 的 VERDICT/CHANGES_APPLIED 行与 6 项复核记录。
- [x] 0.2 定向复核已通过，无剩余阻塞修改，可开始 1.x。
  - 证据位：复核轮次、修订条目清单与最终 VERDICT。

## 1. 请求生命周期与乱序保护（Q22、Q27）

- [ ] 1.1 红：写 `AdminLogs.test.jsx` 的 `test_q22_admin_logs_current_response`、`test_q22_admin_logs_stale_week`、`test_q22_admin_logs_stale_filter_page`，以及 `AnnouncementEditor.test.jsx` 的 `test_q22_announcement_stale_container`、`test_q22_announcement_stale_detail`、`CreateImage.test.jsx` 的 `test_q22_create_image_current_keyword`、`test_q22_create_image_stale_keyword`；确认旧列表或旧详情响应覆盖用例按预期失败。
  - 证据位：`npm run test:web -- AdminLogs AnnouncementEditor CreateImage` 的失败测试名与原因。
- [ ] 1.2 绿：为 AdminLogs 的周次/筛选/分页、AnnouncementEditor 的机器/容器列表与 `getDetailInformation`/`getContainerDetailInformation` 详情请求、CreateImage 的关键词/筛选增加页面内序号与可用的 AbortController；响应应用前校验上下文。
  - 证据位：1.1 测试全绿输出；记录列表与详情请求的取消/序号实现位置。
- [ ] 1.3 红：写 `permissionControllerRelease.test.js` 的 `test_q27_success_unregisters_controller`、`test_q27_error_unregisters_controller`、`test_q27_repeated_queries_no_accumulation`；确认成功路径与异常路径至少一条失败。
  - 证据位：该测试文件的失败输出。
- [ ] 1.4 绿：`getUserPermissions` 在 `finally` 清理 timer 并 `unregisterController`，成功/401/异常同一路径，允许重复注销不抛错。
  - 证据位：1.3 测试全绿；记录控制器集合不再积累的断言。
- [ ] 1.5 证据位：把 Q22、Q27 的测试命令、退出码、通过用例数写入 `verify.md` 对应小节。
  - 证据位：`verify.md` 的 Q22/Q27 小节。

## 2. 公告编辑器与模板分页、深链、光标（Q24、Q52、Q55）

- [ ] 2.1 红：写 `test_q24_announcement_first_page_zero`、`test_q52_announcement_template_205`、`test_q52_announcement_edit_template_link`、`test_q52_announcement_load_more_failure`、`test_q55_announcement_insert_selection`、`test_q55_announcement_insert_after_blur`；`TemplateManager.test.jsx` 的 `test_q52_template_manager_205_pages`、`test_q52_template_manager_deep_link_205`、`test_q52_template_manager_invalid_id`；确认分页参数、205 项、深链和夺焦插入用例失败。
  - 证据位：`AnnouncementEditor.test.jsx`、`TemplateManager.test.jsx` 失败测试名与关键请求参数。
- [ ] 2.2 绿：机器/容器列表改为 `page_number=0`、`page_size=500` 不变；用户列表分页保持原样。
  - 证据位：2.1 中 Q24 测试转绿；请求参数快照。
- [ ] 2.3 绿：公告编辑器模板下拉首批 `limit=200&offset=0`，加载更多 `offset=200`；编辑按钮跳转带 `template_id`；加载更多失败保留已加载 200 项。TemplateManager 列表按 200/页分页，205 个模板分两页，读取 `template_id` 时用现有 `getTemplate` 定位，无效 ID 显示“模板不存在”。
  - 证据位：2.1 中 Q52 测试转绿；两页面请求参数、205 项可见与深链定位断言。
- [ ] 2.4 绿：文本域缓存 `selectionStart/selectionEnd`，插入优先使用缓存选区，按钮夺焦后仍替换原选区。
  - 证据位：2.1 中 Q55 夺焦测试转绿；插入前后文本断言。
- [ ] 2.5 证据位：把 Q24、Q52、Q55 的命令、退出码、通过用例数写入 `verify.md`。
  - 证据位：`verify.md` 的 Q24/Q52/Q55 小节。

## 3. 设置校验、组名与设置错误（Q23、Q37）

- [ ] 3.1 红：写 `Settings.test.jsx` 的 `test_q23_settings_integer_valid`、`test_q23_settings_integer_decimal_rejected`、`test_q23_settings_reminder_valid`、`test_q23_settings_reminder_invalid_field`、`test_q23_settings_group_order`、`test_q23_settings_unknown_group_last`、`test_q37_settings_invalid_setting_mapping`、`test_q37_settings_update_failed_mapping`、`test_q37_settings_string_compatibility`；确认小数、非法节点、错位组名和字符串调用用例失败。
  - 证据位：`Settings.test.jsx` 失败测试名与输入/渲染差异。
- [ ] 3.2 绿：整数输入提交前拒绝小数/非数字；提醒节点按逗号逐项校验正整数，空项/非整数/0/负数在“清理提醒节点”字段报错，不静默丢弃。
  - 证据位：3.1 中整数与提醒测试转绿；记录提交前阻断与字段错误。
- [ ] 3.3 绿：`GROUP_ORDER` 改为 `['容器清理', '磁盘策略', '已删除容器', '公告', '镜像']`，未知分组排最后。
  - 证据位：3.1 中分组测试转绿；记录 DOM 顺序断言。
- [ ] 3.4 绿：设置错误调用改传 `err.body || err` 对象、`status`、`route`；补 `/settings` 的 `invalid_setting`、`update_failed` 映射；保留字符串兼容。
  - 证据位：3.1 中 Q37 测试转绿；记录弹窗实际文案。
- [ ] 3.5 证据位：把 Q23、Q37-Settings 的命令、退出码、通过用例数写入 `verify.md`。
  - 证据位：`verify.md` 的 Q23/Q37 小节。

## 4. 注册、模板、镜像错误映射与调用口径（Q37）

- [ ] 4.1 红：写 `Register.test.jsx` 的 `test_q37_register_request_code_domain_mapping`、`test_q37_register_code_mapping`、`test_q37_register_structured_call`，`TemplateManager.test.jsx` 的 `test_q37_template_known_reasons`、`test_q37_template_system_delete_mapping`、`test_q37_template_unknown_reason`，`CreateImage.test.jsx` 的 `test_q37_create_image_known_reasons`、`test_q37_create_image_unknown_reason`；确认映射缺键、只传字符串或落“未收录”的用例失败。
  - 证据位：三个测试文件的失败测试名与错误文案。
- [ ] 4.2 绿：Register 的 `/register`、`/request_register_code` 按规格表补原因（含 `code_creation_failed`）并改结构化调用。
  - 证据位：4.1 中 Register 测试转绿；记录调用参数含 `route`。
- [ ] 4.3 绿：TemplateManager 的 `/announcements/templates` 按规格表补原因，保存/删除改传对象、状态与路由。
  - 证据位：4.1 中 TemplateManager 测试转绿；记录“模板名称已存在”等实际文案。
- [ ] 4.4 绿：CreateImage 的五个镜像 route 按规格表补原因；确认只映射 Ctrl 现有 reason，不新增协议。
  - 证据位：4.1 中 CreateImage 测试转绿；记录 route/error_reason 表覆盖。
- [ ] 4.5 证据位：把 Q37-注册/模板/镜像的命令、退出码、通过用例数写入 `verify.md`。
  - 证据位：`verify.md` 的 Q37 小节。

## 5. 镜像新建与更新状态（Q63、Q64）

- [ ] 5.1 红：写 `test_q63_create_image_clear_keyword_select_new`、`test_q63_create_image_reload_failure_preserves_form`、`test_q64_create_image_update_refetches_list`、`test_q64_create_image_update_failure_keeps_list`；确认关键词、列表、`selectedId`、表单至少一态失败。
  - 证据位：`CreateImage.test.jsx` 失败测试名与状态快照。
- [ ] 5.2 绿：新建成功固定为“关键词清空 → 空词重取 → 选中新 `image_id` → 表单保留提交值”；重取失败保留表单并显示错误，不伪造选中。
  - 证据位：5.1 中 Q63 测试转绿；四态断言。
- [ ] 5.3 绿：更新成功后按当前关键词重取左侧列表并展示最新摘要；失败保留旧列表、不显示成功文案。
  - 证据位：5.1 中 Q64 测试转绿；更新前后列表调用次数与文案。
- [ ] 5.4 证据位：把 Q63、Q64 的命令、退出码、通过用例数写入 `verify.md`。
  - 证据位：`verify.md` 的 Q63/Q64 小节。

## 6. 用户/机器页面详情、死代码、分页与冒泡（Q35、Q36、Q59、Q60）

- [ ] 6.1 红：写 `ManageMachineDetailRefresh.test.jsx` 的 `test_q35_manage_machine_card_navigates_detail`、`test_q35_manage_machine_cancel_delete_no_modal`、`test_q35_manage_machine_no_legacy_modal`；`ManageUserDetailLink.test.jsx` 的 `test_q35_manage_user_container_row_navigates_detail`、`test_q36_manage_user_no_dead_detail_modal`、`test_q35_manage_user_no_new_detail_entry`；`ManageUserInTable.test.jsx` 的 `test_q60_edit_action_does_not_select_row`、`test_q60_other_actions_do_not_bubble`、`test_q59_six_containers_second_page_reachable`、`test_q59_total_at_most_four_no_pagination`；确认旧弹窗、无新删除入口、冒泡和分页用例失败。
  - 证据位：三个测试文件的失败测试名与 DOM/调用参数。
- [ ] 6.2 红：写两份 MODIFIED 同名要求的契约测试——`ManageMachineEligibility.test.jsx` 的 `test_q35_manage_machine_shared_action_contract`、`test_q35_manage_machine_failed_delete_eligibility`、`test_q35_manage_machine_transition_delete_denied`、`test_q35_manage_machine_no_sysadmin_delete_bypass`、`test_q35_manage_machine_long_term_unpause_fields`；`ManageUserEligibility.test.jsx` 的 `test_q35_manage_user_shared_action_consistency`、`test_q35_manage_user_role_matrix`、`test_q35_manage_user_long_term_fields`、`test_q35_manage_user_no_delete_or_modal_contract`、`test_q35_manage_user_unpause_failure_recovery`；确认旧弹窗父回调断言仍在或删除资格/解冻失败语义被改坏时失败。
  - 证据位：两个 eligibility 测试文件的失败测试名与纯计算断言。
- [ ] 6.3 红：写 `docs-cleanup.integration.mjs` 的 `test_q36_docs_zero_ref_removed`、`test_q36_docs_keeps_referenced_status_display`、`test_q36_docs_referenced_file_guard`；`Register.test.jsx` 的 `test_q36_register_field_rule_message`、`test_q36_register_no_validate_messages`；`Login.test.jsx` 的 `test_q36_login_structured_error`、`test_q36_login_network_fallback`、`test_q36_login_no_dead_branch_or_debug_console`；确认资源仍存在、`validateMessages` 仍配置、`userMsg`/console 仍在时失败。
  - 证据位：三个测试文件的失败测试名与源码命中行。
- [ ] 6.4 绿：ManageMachine 容器标题跳 `/index/containers/:containerId`；删除旧 `ContainerDetailModal`、`openContainerDetail`、`returnToDetail`、`detailModalVisible` 及弹窗专用回调；不新增卡片删除入口，只清理旧弹窗来源的不可达删除确认回跳链，实际删除仍走专用详情页。
  - 证据位：6.1 中 ManageMachine 测试转绿；源码符号扫描为空。
- [ ] 6.5 绿：ManageUser 容器行保留现有导航并阻止行选择冒泡；删除旧 `ContainerDetailModal`、`openContainerDetail`、`detailModalVisible` 及死状态，不新增详情入口。
  - 证据位：6.1 中 ManageUser 测试转绿；源码符号扫描为空。
- [ ] 6.6 绿：两份 MODIFIED 同名要求对应的测试消费共享动作工具纯计算结果；删除旧 `ContainerDetailModal` 父回调契约与断言；保留真实权限/资源角色、删除资格、长期字段和解冻失败语义；机器卡片不新增删除按钮。
  - 证据位：6.2 中 Q35 契约测试转绿；记录纯计算删除资格与专用页删除入口。
- [ ] 6.7 绿：ManageUserInTable 的编辑/删除/重置/权限组全部 `stopPropagation`；子表用服务端 `total_number`、父页 `page`、`pageSize=4` 控制分页，第二页请求 `page_number=1`，不一次拉全。
  - 证据位：6.1 中 Q59/Q60 测试转绿；第一次/第二次数请求参数与第 5/6 条断言。
- [ ] 6.8 绿：删除 Docs 零引用资源并保留 `statusDisplay`；删除 Register `validateMessages` 保留字段消息；删除 Login `userMsg` 与两处调试 console，保留结构化错误与网络中文兜底。
  - 证据位：6.3 中 Q36 测试转绿；引用扫描、构建与源码搜索输出。
- [ ] 6.9 证据位：把 Q35、Q36、Q59、Q60 的命令、退出码、通过用例数写入 `verify.md`。
  - 证据位：`verify.md` 的 Q35/Q36/Q59/Q60 小节。

## 7. 解冻保页、详情历史与 404（Q69、Q61、Q66）

- [ ] 7.1 红：写 `test_q69_manage_machine_unpause_keeps_second_page`、`test_q69_manage_machine_unpause_switch_page_race`、`test_q69_manage_machine_unpause_failure_keeps_page`；`ContainerDetailHistory.test.jsx` 的 `test_q61_refresh_button_refetches_history`、`test_q61_action_success_refetches_history`、`test_q61_action_failure_no_success_history`；`notFoundLayout.test.js` 的 `test_q66_notfound_full_viewport`、`test_q66_notfound_mobile_no_gap`；确认回第一页、历史不刷新和 64/56px 空隙用例失败。
  - 证据位：三个测试文件的失败测试名与请求/样式断言。
- [ ] 7.2 绿：解冻开始时记录页码、搜索词、机器筛选和操作令牌；成功后仅在上下文仍匹配时按快照页码刷新；切页/改筛选后的旧刷新丢弃；失败保留当前页；仅解冻，不扩展其他动作。
  - 证据位：7.1 中 Q69 测试转绿；记录竞态时序与最终页码。
- [ ] 7.3 绿：刷新按钮和容器动作成功后重取操作历史；失败不追加成功历史，保留既有历史并展示错误。
  - 证据位：7.1 中 Q61 测试转绿；历史请求次数与记录内容。
- [ ] 7.4 绿：404 页改 `min-height: 100vh` 并以 `100dvh` 覆盖移动端，删除 `calc(100vh - 64px)`/`calc(100vh - 56px)`。
  - 证据位：7.1 中 Q66 测试转绿；CSS 规则断言。
- [ ] 7.5 证据位：把 Q69、Q61、Q66 的命令、退出码、通过用例数写入 `verify.md`。
  - 证据位：`verify.md` 的 Q69/Q61/Q66 小节。

## 8. 全仓 lint 与 Node 测试运行时（Q28、Q29）

- [ ] 8.1 直接运行并记录 `npm run lint` 当前退出码 1、329 errors/20 warnings 的失败基线，记录 `git diff -- eslint.config.js package.json` 与 `rg` 策略扫描（`eslint-disable`、`globalIgnores`、`--ignore-pattern`、规则 `off`）的配置基线，不为 lint 命令额外制造测试包装；另写 `scripts/tests/test-entry-node26.integration.mjs` 的 `test_q29_node26_entry_injects_flag`、`test_q29_unsupported_node_no_injection`、`test_q29_test_web_wrapper_injects_flag`，以及支持范围与矩阵的直接机械检查，确认测试入口兼容性用例的失败基线。
  - 证据位：`scripts/tests/test-entry-node26.integration.mjs` 的失败输出；lint 策略命中的现有抑制/忽略。
- [x] 8.2 新增共享 node-options helper，四个测试入口统一使用；前端入口通过薄包装脚本启动；package/lock 的 engines 与已安装 Vite 一致，CI 矩阵为 20.19.0/22/26。父任务记录：直接入口修复前 5 失败，修复后 5 通过；环境兼容回归 3 通过；入口集成 37 通过。
  - 证据位：8.1 中 Q29 测试转绿；记录 helper 检测逻辑与 CI 矩阵。
- [ ] 8.3 绿：lint 第一批按 `no-unused-vars`、`no-empty`、`no-undef` 批量修复；不改变业务行为，逐批跑相关测试。
  - 证据位：`npx eslint . --format json` 的规则计数下降；相关测试退出码。
- [ ] 8.4 绿：lint 第二批处理 React Hooks（含 `exhaustive-deps`/`rules-of-hooks`）、正则/空白/React Refresh；删除或补齐 11 处 `eslint-disable` 的成因，不保留抑制。
  - 证据位：`rg "eslint-disable" src scripts` 为空；规则计数为 0。
- [ ] 8.5 绿：执行 `npm run lint` 达到退出码 0、0 errors、0 warnings；确认未新增/扩大 `globalIgnores`、未改规则为 `off`、未加 `--ignore-pattern`。
  - 证据位：`npm run lint` 完整输出与退出码；`eslint.config.js` 差异。
- [ ] 8.6 绿：在 Node 26.8.1 执行 `npm test`（测试名 `test_q29_node26_full_suite`），确认前端完整 Vitest 套件与生产入口集成测试通过；记录真实文件数/用例数，不复制旧基线。
  - 证据位：`node --version`、`npm test` 退出码、文件/用例汇总。
- [ ] 8.7 证据位：把 Q28、Q29 的命令、退出码、规则计数、Node 版本与套件统计写入 `verify.md`。
  - 证据位：`verify.md` 的 Q28/Q29 小节。

## 9. 全量回归与证据收口

- [ ] 9.1 执行 `npm test`、`npm run lint`、`npm run build`，确认三项均通过；记录各自退出码与输出摘要。
  - 证据位：三条命令的原始输出/退出码，写入 `verify.md` 总览。
- [ ] 9.2 执行 `openspec validate apply-direct-web-fixes --strict`，确认变更严格校验通过；若失败，先修文档再重跑。
  - 证据位：命令输出与退出码。
- [ ] 9.3 按 `verify.md` 要求生成验证报告，逐 Q、逐场景填写真实证据；未运行、失败或跳过的场景不得写成 PASS。
  - 证据位：`verify.md` 的 `DECISION` 行与 Q 覆盖表。
- [ ] 9.4 正常提交本变更的源码、测试与配置；提交边界只包含本变更交付，不混入 review.md、主规格、归档、QUESTIONS 或规划文档。
  - 证据位：提交哈希、`git show --stat`、逐 Q 证据记录。
