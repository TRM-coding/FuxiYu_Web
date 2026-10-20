# 测试计划

本表按修订后的 `specs/**/spec.md` 逐条映射，每个 `#### Scenario:` 至少一个具名测试。第 2 轮 review 为 `APPROVE_WITH_CHANGES`、`CHANGES_APPLIED: yes`；B 范围（Q23、Q27、Q37 注册/设置/镜像、Q63、Q64 与 Register 死校验）已由 `.git/parent-b-acceptance.log` 的 9 文件 144 测试通过证明，红绿证据见 `.git/apply-direct-web-fixes-web-owned-final.log`。公告编辑器独立选择修订仍等原独立 reviewer 复核，相关行保持现状，不伪称通过；A/C 剩余与 Q28 全仓 lint 未完成。

当前为实施台账：已运行行按真实命令、退出码和测试汇总记录，未运行或未覆盖行保持原状态；工程约束行使用真实机械检查，不把命令名称冒充具名测试。不能把“现状看起来正确”直接写成通过。

## 测试映射

| Requirement | Scenario | 测试文件或检查范围 | 测试名称或命令 | 当前状态 |
|-------------|----------|-----------|-----------|---------------|
| specs/frontend--authentication/spec.md → 权限查询必须在 finally 注销控制器 | 成功返回后释放控制器 | src/test/permissionControllerRelease.test.js | test_q27_success_unregisters_controller | 🟢 green |
| specs/frontend--authentication/spec.md → 权限查询必须在 finally 注销控制器 | 401 或异常返回后释放控制器 | src/test/permissionControllerRelease.test.js | test_q27_error_unregisters_controller | 🟢 green |
| specs/frontend--authentication/spec.md → 权限查询必须在 finally 注销控制器 | 连续查询不积累控制器 | src/test/permissionControllerRelease.test.js | test_q27_repeated_queries_no_accumulation | 🟢 green |
| specs/frontend--build/spec.md → 全仓 ESLint 必须零错误零警告 | 全仓 lint 通过 | 非可执行规格：直接机械验证 | `npm run lint` 的退出码、错误/警告数 | 待执行 |
| specs/frontend--build/spec.md → 全仓 ESLint 必须零错误零警告 | 禁用规则或忽略目录被拒 | 非可执行规格：直接机械验证 | `git diff -- eslint.config.js package.json` 与 `rg` 策略扫描（`eslint-disable`、`globalIgnores`、`--ignore-pattern`、规则 `off`） | 待执行 |
| specs/frontend--build/spec.md → 所有测试入口自动兼容 Node 26 实验 Web Storage | Node 26 测试入口注入 flag | scripts/tests/test-entry-node26.integration.mjs | test_q29_node26_entry_injects_flag | 🟢 已通过 |
| specs/frontend--build/spec.md → 所有测试入口自动兼容 Node 26 实验 Web Storage | 不支持 flag 的 Node 不注入 | scripts/tests/test-entry-node26.integration.mjs | test_q29_unsupported_node_no_injection | 🟢 已通过 |
| specs/frontend--build/spec.md → 所有测试入口自动兼容 Node 26 实验 Web Storage | 直接运行 test:web 同样注入 | scripts/tests/test-entry-node26.integration.mjs | test_q29_test_web_wrapper_injects_flag | 🟢 已通过 |
| specs/frontend--build/spec.md → 所有测试入口自动兼容 Node 26 实验 Web Storage | Node 26 完整前端套件通过 | 非可执行规格：直接套件验收 | `node --version`、`npm test` 的真实汇总（`test_q29_node26_full_suite`），不新增递归套件测试 | 待执行 |
| specs/frontend--build/spec.md → Node 支持范围明确且覆盖新版本 | 支持范围与 CI 覆盖 | 非可执行规格：配置机械核对 | Node 命令核对 package/lock 的 engines 与 Vite 一致、CI 包含 20.19.0/22/26 | 🟢 机械检查通过，未执行远端矩阵 |
| specs/frontend--build/spec.md → Node 支持范围明确且覆盖新版本 | 单一旧版本或缺失范围被拒 | 非可执行规格：同一配置机械核对 | 配置断言对缺失 engines、缺失版本矩阵或限制旧版返回失败，不额外制造配置测试文件 | 🟢 机械检查通过 |
| specs/frontend--page-admin-logs/spec.md → AdminLogs 查询结果必须匹配当前周次、筛选与分页 | 当前上下文响应应用 | src/test/AdminLogs.test.jsx | test_q22_admin_logs_current_response | 🔴 red |
| specs/frontend--page-admin-logs/spec.md → AdminLogs 查询结果必须匹配当前周次、筛选与分页 | 旧周次响应晚到 | src/test/AdminLogs.test.jsx | test_q22_admin_logs_stale_week | 🔴 red |
| specs/frontend--page-admin-logs/spec.md → AdminLogs 查询结果必须匹配当前周次、筛选与分页 | 旧筛选或旧页响应晚到 | src/test/AdminLogs.test.jsx | test_q22_admin_logs_stale_filter_page | 🔴 red |
| specs/frontend--page-announcement-editor/spec.md → AnnouncementEditor 机器和容器独立选择并各自保护列表与详情请求 | 首屏请求第 0 页 | src/test/AnnouncementEditor.test.jsx | test_q24_announcement_first_page_zero | 🔴 red |
| specs/frontend--page-announcement-editor/spec.md → AnnouncementEditor 机器和容器独立选择并各自保护列表与详情请求 | 机器切换保留独立容器选择 | src/test/AnnouncementEditor.test.jsx | test_q22_announcement_independent_selectors | 🔴 red |
| specs/frontend--page-announcement-editor/spec.md → AnnouncementEditor 机器和容器独立选择并各自保护列表与详情请求 | 同一选择器旧列表响应晚到 | src/test/AnnouncementEditor.test.jsx | test_q22_announcement_stale_container | 🔴 red |
| specs/frontend--page-announcement-editor/spec.md → AnnouncementEditor 机器和容器独立选择并各自保护列表与详情请求 | 旧机器或容器详情响应晚到 | src/test/AnnouncementEditor.test.jsx | test_q22_announcement_stale_detail | 🔴 red |
| specs/frontend--page-announcement-editor/spec.md → AnnouncementEditor 机器和容器独立选择并各自保护列表与详情请求 | 卸载后旧列表或详情响应不应用 | src/test/AnnouncementEditor.test.jsx | test_q22_announcement_unmount_no_apply | 🔴 red |
| specs/frontend--page-announcement-editor/spec.md → AnnouncementEditor 模板下拉分页与编辑深链 | 205 个模板可加载到第 205 个 | src/test/AnnouncementEditor.test.jsx | test_q52_announcement_template_205 | 🔴 red |
| specs/frontend--page-announcement-editor/spec.md → AnnouncementEditor 模板下拉分页与编辑深链 | 编辑此模板携带模板 ID | src/test/AnnouncementEditor.test.jsx | test_q52_announcement_edit_template_link | 🔴 red |
| specs/frontend--page-announcement-editor/spec.md → AnnouncementEditor 模板下拉分页与编辑深链 | 加载更多失败保留已加载项 | src/test/AnnouncementEditor.test.jsx | test_q52_announcement_load_more_failure | 🔴 red |
| specs/frontend--page-announcement-editor/spec.md → AnnouncementEditor 光标插入保留原选区 | 保持焦点时替换选区 | src/test/AnnouncementEditor.test.jsx | test_q55_announcement_insert_selection | 🔴 red |
| specs/frontend--page-announcement-editor/spec.md → AnnouncementEditor 光标插入保留原选区 | 按钮夺焦后仍插入原选区 | src/test/AnnouncementEditor.test.jsx | test_q55_announcement_insert_after_blur | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → ContainerDetailPage 操作历史随事实刷新 | 点击刷新按钮重取历史 | src/test/ContainerDetailHistory.test.jsx | test_q61_refresh_button_refetches_history | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → ContainerDetailPage 操作历史随事实刷新 | 操作成功后历史包含最新事实 | src/test/ContainerDetailHistory.test.jsx | test_q61_action_success_refetches_history | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → ContainerDetailPage 操作历史随事实刷新 | 操作失败不追加成功历史 | src/test/ContainerDetailHistory.test.jsx | test_q61_action_failure_no_success_history | 🔴 red |
| specs/frontend--page-create-image/spec.md → CreateImage 关键词列表只应用当前上下文 | 当前关键词响应应用 | src/test/CreateImage.test.jsx | test_q22_create_image_current_keyword | 🔴 red |
| specs/frontend--page-create-image/spec.md → CreateImage 关键词列表只应用当前上下文 | 旧关键词响应晚到 | src/test/CreateImage.test.jsx | test_q22_create_image_stale_keyword | 🔴 red |
| specs/frontend--page-create-image/spec.md → CreateImage 新建成功后清空关键词、空词重取、选中新项并保留表单 | 非匹配关键词下新建成功 | src/test/CreateImage.test.jsx | test_q63_create_image_clear_keyword_select_new | 🟢 green |
| specs/frontend--page-create-image/spec.md → CreateImage 新建成功后清空关键词、空词重取、选中新项并保留表单 | 空词重取失败仍保留表单 | src/test/CreateImage.test.jsx | test_q63_create_image_reload_failure_preserves_form | 🟢 green |
| specs/frontend--page-create-image/spec.md → CreateImage 更新成功后重新读取左侧列表 | 更新成功重取列表 | src/test/CreateImage.test.jsx | test_q64_create_image_update_refetches_list | 🟢 green |
| specs/frontend--page-create-image/spec.md → CreateImage 更新成功后重新读取左侧列表 | 更新失败保留旧列表 | src/test/CreateImage.test.jsx | test_q64_create_image_update_failure_keeps_list | 🟢 green |
| specs/frontend--page-create-image/spec.md → CreateImage 镜像错误原因按现有协议映射 | 已知镜像原因展示中文 | src/test/CreateImage.test.jsx | test_q37_create_image_known_reasons | 🟢 green |
| specs/frontend--page-create-image/spec.md → CreateImage 镜像错误原因按现有协议映射 | 未登记镜像原因保留兜底 | src/test/CreateImage.test.jsx | test_q37_create_image_unknown_reason | 🟢 green |
| specs/frontend--page-docs/spec.md → Docs 页面只保留生产可达资源 | 零引用资源删除且构建通过 | scripts/tests/docs-cleanup.integration.mjs | test_q36_docs_zero_ref_removed | 🔴 red |
| specs/frontend--page-docs/spec.md → Docs 页面只保留生产可达资源 | 仍被引用的 statusDisplay 保留 | scripts/tests/docs-cleanup.integration.mjs | test_q36_docs_keeps_referenced_status_display | 🔴 red |
| specs/frontend--page-docs/spec.md → Docs 页面只保留生产可达资源 | 有引用的资源不得删除 | scripts/tests/docs-cleanup.integration.mjs | test_q36_docs_referenced_file_guard | 🔴 red |
| specs/frontend--page-login/spec.md → Login 删除 userMsg 死分支与调试 console 并保留结构化错误 | 登录失败展示后端结构化错误 | src/test/Login.test.jsx | test_q36_login_structured_error | 🔴 red |
| specs/frontend--page-login/spec.md → Login 删除 userMsg 死分支与调试 console 并保留结构化错误 | 网络失败仍显示中文兜底 | src/test/Login.test.jsx | test_q36_login_network_fallback | 🔴 red |
| specs/frontend--page-login/spec.md → Login 删除 userMsg 死分支与调试 console 并保留结构化错误 | 源码不再包含 userMsg 与调试 console | src/test/Login.test.jsx | test_q36_login_no_dead_branch_or_debug_console | 🔴 red |
| specs/frontend--page-manage-machine/spec.md → ManageMachine 容器详情统一使用专用详情页 | 点击容器标题进入专用详情页 | src/test/ManageMachineDetailRefresh.test.jsx | test_q35_manage_machine_card_navigates_detail | 🔴 red |
| specs/frontend--page-manage-machine/spec.md → ManageMachine 容器详情统一使用专用详情页 | 删除确认取消不打开旧详情弹窗 | src/test/ManageMachineDetailRefresh.test.jsx | test_q35_manage_machine_cancel_delete_no_modal | 🔴 red |
| specs/frontend--page-manage-machine/spec.md → ManageMachine 容器详情统一使用专用详情页 | 源码不再引用旧弹窗链 | src/test/ManageMachineDetailRefresh.test.jsx | test_q35_manage_machine_no_legacy_modal | 🔴 red |
| specs/frontend--page-manage-machine/spec.md → ManageMachine 解冻后保留当前页与筛选并防止旧结果回拉 | 第二页解冻后仍在第二页 | src/test/ManageMachineDetailRefresh.test.jsx | test_q69_manage_machine_unpause_keeps_second_page | 🔴 red |
| specs/frontend--page-manage-machine/spec.md → ManageMachine 解冻后保留当前页与筛选并防止旧结果回拉 | 操作期间切页后旧刷新不回拉 | src/test/ManageMachineDetailRefresh.test.jsx | test_q69_manage_machine_unpause_switch_page_race | 🔴 red |
| specs/frontend--page-manage-machine/spec.md → ManageMachine 解冻后保留当前页与筛选并防止旧结果回拉 | 解冻失败保留当前页 | src/test/ManageMachineDetailRefresh.test.jsx | test_q69_manage_machine_unpause_failure_keeps_page | 🔴 red |
| specs/frontend--page-manage-machine/spec.md → ManageMachine 使用真实权限与共享动作结果 | 卡片与既有组件契约结论一致 | src/test/ManageMachineEligibility.test.jsx | test_q35_manage_machine_shared_action_contract | 🔴 red |
| specs/frontend--page-manage-machine/spec.md → ManageMachine 使用真实权限与共享动作结果 | 失败容器仍可删除 | src/test/ManageMachineEligibility.test.jsx | test_q35_manage_machine_failed_delete_eligibility | 🔴 red |
| specs/frontend--page-manage-machine/spec.md → ManageMachine 使用真实权限与共享动作结果 | 过渡或主机异常不可删除 | src/test/ManageMachineEligibility.test.jsx | test_q35_manage_machine_transition_delete_denied | 🔴 red |
| specs/frontend--page-manage-machine/spec.md → ManageMachine 使用真实权限与共享动作结果 | 不用系统管理员标志伪造删除 | src/test/ManageMachineEligibility.test.jsx | test_q35_manage_machine_no_sysadmin_delete_bypass | 🔴 red |
| specs/frontend--page-manage-machine/spec.md → ManageMachine 使用真实权限与共享动作结果 | 长期与解冻使用既有字段 | src/test/ManageMachineEligibility.test.jsx | test_q35_manage_machine_long_term_unpause_fields | 🔴 red |
| specs/frontend--page-manage-user/spec.md → ManageUser 容器行只走专用详情路由并删除不可达弹窗 | 点击容器行进入专用详情页 | src/test/ManageUserDetailLink.test.jsx | test_q35_manage_user_container_row_navigates_detail | 🔴 red |
| specs/frontend--page-manage-user/spec.md → ManageUser 容器行只走专用详情路由并删除不可达弹窗 | 源码不再包含旧详情弹窗链 | src/test/ManageUserDetailLink.test.jsx | test_q36_manage_user_no_dead_detail_modal | 🔴 red |
| specs/frontend--page-manage-user/spec.md → ManageUser 容器行只走专用详情路由并删除不可达弹窗 | 不新增用户管理页详情入口 | src/test/ManageUserDetailLink.test.jsx | test_q35_manage_user_no_new_detail_entry | 🔴 red |
| specs/frontend--page-manage-user/spec.md → ManageUser 容器动作使用共享结果且不新增删除入口 | 与其他页面同上下文一致 | src/test/ManageUserEligibility.test.jsx | test_q35_manage_user_shared_action_consistency | 🔴 red |
| specs/frontend--page-manage-user/spec.md → ManageUser 容器动作使用共享结果且不新增删除入口 | 操作员与容器角色差异 | src/test/ManageUserEligibility.test.jsx | test_q35_manage_user_role_matrix | 🔴 red |
| specs/frontend--page-manage-user/spec.md → ManageUser 容器动作使用共享结果且不新增删除入口 | 长期使用既有字段 | src/test/ManageUserEligibility.test.jsx | test_q35_manage_user_long_term_fields | 🔴 red |
| specs/frontend--page-manage-user/spec.md → ManageUser 容器动作使用共享结果且不新增删除入口 | 卡片无删除入口与既有只读组件契约 | src/test/ManageUserEligibility.test.jsx | test_q35_manage_user_no_delete_or_modal_contract | 🔴 red |
| specs/frontend--page-manage-user/spec.md → ManageUser 容器动作使用共享结果且不新增删除入口 | 解冻失败恢复 | src/test/ManageUserEligibility.test.jsx | test_q35_manage_user_unpause_failure_recovery | 🔴 red |
| specs/frontend--page-manage-user-in-table/spec.md → ManageUserInTable 用户表行操作不得改变选中行 | 点击编辑用户不改变选中行 | src/test/ManageUserInTable.test.jsx | test_q60_edit_action_does_not_select_row | 🔴 red |
| specs/frontend--page-manage-user-in-table/spec.md → ManageUserInTable 用户表行操作不得改变选中行 | 删除、重置密码与权限组同样不冒泡 | src/test/ManageUserInTable.test.jsx | test_q60_other_actions_do_not_bubble | 🔴 red |
| specs/frontend--page-manage-user-in-table/spec.md → 子容器分页按服务端 total 且父页保持 pageSize=4 | 六个子容器第二页可达第 5/6 个 | src/test/ManageUserInTable.test.jsx | test_q59_six_containers_second_page_reachable | 🔴 red |
| specs/frontend--page-manage-user-in-table/spec.md → 子容器分页按服务端 total 且父页保持 pageSize=4 | 服务端 total 不超过 4 不显示分页 | src/test/ManageUserInTable.test.jsx | test_q59_total_at_most_four_no_pagination | 🔴 red |
| specs/frontend--page-not-found/spec.md → NotFound 页面使用完整视口高度 | 顶层未知路由无底部空隙 | src/test/notFoundLayout.test.js | test_q66_notfound_full_viewport | 🔴 red |
| specs/frontend--page-not-found/spec.md → NotFound 页面使用完整视口高度 | 移动端视口无 56px 空隙 | src/test/notFoundLayout.test.js | test_q66_notfound_mobile_no_gap | 🔴 red |
| specs/frontend--page-register/spec.md → Register 删除无效 validateMessages 配置并保留字段规则 | 非法用户名仍显示字段规则消息 | src/test/Register.test.jsx | test_q36_register_field_rule_message | 🟢 green |
| specs/frontend--page-register/spec.md → Register 删除无效 validateMessages 配置并保留字段规则 | 源码不再配置 validateMessages | src/test/Register.test.jsx | test_q36_register_no_validate_messages | 🟢 green |
| specs/frontend--page-register/spec.md → Register 注册与验证码错误按现有协议映射 | 请求验证码域名被拒展示中文 | src/test/Register.test.jsx | test_q37_register_request_code_domain_mapping | 🟢 green |
| specs/frontend--page-register/spec.md → Register 注册与验证码错误按现有协议映射 | 注册验证码必填或失效展示中文 | src/test/Register.test.jsx | test_q37_register_code_mapping | 🟢 green |
| specs/frontend--page-register/spec.md → Register 注册与验证码错误按现有协议映射 | 注册调用点传递结构化对象 | src/test/Register.test.jsx | test_q37_register_structured_call | 🟢 green |
| specs/frontend--page-settings/spec.md → Settings 整数与提醒节点必须完整校验 | 整数合法值可提交 | src/test/Settings.test.jsx | test_q23_settings_integer_valid | 🟢 green |
| specs/frontend--page-settings/spec.md → Settings 整数与提醒节点必须完整校验 | 整数输入小数被拒 | src/test/Settings.test.jsx | test_q23_settings_integer_decimal_rejected | 🟢 green |
| specs/frontend--page-settings/spec.md → Settings 整数与提醒节点必须完整校验 | 合法提醒节点可提交 | src/test/Settings.test.jsx | test_q23_settings_reminder_valid | 🟢 green |
| specs/frontend--page-settings/spec.md → Settings 整数与提醒节点必须完整校验 | 非法提醒节点指出具体字段 | src/test/Settings.test.jsx | test_q23_settings_reminder_invalid_field | 🟢 green |
| specs/frontend--page-settings/spec.md → Settings GROUP_ORDER 与后端实际分组一致 | 分组顺序与后端一致 | src/test/Settings.test.jsx | test_q23_settings_group_order | 🟢 green |
| specs/frontend--page-settings/spec.md → Settings GROUP_ORDER 与后端实际分组一致 | 未知分组排最后 | src/test/Settings.test.jsx | test_q23_settings_unknown_group_last | 🟢 green |
| specs/frontend--page-settings/spec.md → Settings 错误保留结构化原因并兼容既有字符串 | invalid_setting 展示中文 | src/test/Settings.test.jsx | test_q37_settings_invalid_setting_mapping | 🟢 green |
| specs/frontend--page-settings/spec.md → Settings 错误保留结构化原因并兼容既有字符串 | update_failed 展示中文 | src/test/Settings.test.jsx | test_q37_settings_update_failed_mapping | 🟢 green |
| specs/frontend--page-settings/spec.md → Settings 错误保留结构化原因并兼容既有字符串 | 只传字符串时仍可读 | src/test/Settings.test.jsx | test_q37_settings_string_compatibility | 🟢 green |
| specs/frontend--page-template-manager/spec.md → TemplateManager 列表分页与深链定位 | 205 个模板分两页 | src/test/TemplateManager.test.jsx | test_q52_template_manager_205_pages | 🔴 red |
| specs/frontend--page-template-manager/spec.md → TemplateManager 列表分页与深链定位 | 深链定位第 205 个模板 | src/test/TemplateManager.test.jsx | test_q52_template_manager_deep_link_205 | 🔴 red |
| specs/frontend--page-template-manager/spec.md → TemplateManager 列表分页与深链定位 | 无效模板 ID 不崩溃 | src/test/TemplateManager.test.jsx | test_q52_template_manager_invalid_id | 🔴 red |
| specs/frontend--page-template-manager/spec.md → TemplateManager 模板错误按现有协议映射 | 重名创建显示模板名称已存在 | src/test/TemplateManager.test.jsx | test_q37_template_known_reasons | 🔴 red |
| specs/frontend--page-template-manager/spec.md → TemplateManager 模板错误按现有协议映射 | 删除系统模板显示不可删除 | src/test/TemplateManager.test.jsx | test_q37_template_system_delete_mapping | 🔴 red |
| specs/frontend--page-template-manager/spec.md → TemplateManager 模板错误按现有协议映射 | 未登记模板原因保留兜底 | src/test/TemplateManager.test.jsx | test_q37_template_unknown_reason | 🔴 red |

## 覆盖说明

- 命名约定：测试名以 `test_q<Q号>_` 前缀标识问题来源，便于从 Q 反查测试；同一测试文件内的中文 `it(...)` 描述可另写，但测试函数名必须与上表一致或可一一对应。
- 竞态测试：Q22、Q27、Q63、Q69 使用 deferred promise 或受控 mock 让旧请求晚于新请求返回；只断言 AbortController 存在不算覆盖。
- Q22 公告编辑器：机器与容器是独立选择器，容器列表始终 `machine_id:''`；`test_q22_announcement_independent_selectors` 覆盖选择互不清空，`test_q22_announcement_stale_container` 覆盖同一选择器旧列表响应，`test_q22_announcement_unmount_no_apply` 覆盖卸载后不应用。
- Q28：直接执行 `npm run lint` 验证退出码和错误/警告数，配置策略用真实差异与新增抑制审查验收；不额外加入会在 `npm test` 内重复运行 lint 的镜像测试。
- Q29：`test-entry-node26.integration.mjs` 以模拟 flags 验证支持/不支持/保留调用方配置，并实际启动直接前端入口运行 jsdom storage 回归；package/lock 与 CI 范围另作直接配置检查。最终完整 `npm test` 尚待页面实施结束后记录，不以局部结果替代。

## Q29 实施证据（父任务，2026-10-21）

- Node v26.8.1，不预设 `NODE_OPTIONS` 运行旧直接入口 `npm run test:web -- src/test/authHelpers.test.js`：5 失败，原因是 `localStorage.clear()` 读取 undefined；原始输出 `.git/q29-direct-red.log`。
- 同一命令经统一入口修复后：5 通过，无需手工环境选项。
- `node --test scripts/tests/test-entry-node26.integration.mjs`：3 通过，实际直接入口在第三例中执行。
- `npm run test:server`：37 通过、0 失败、0 跳过，输出 `.git/q29-server-green.log`。
- Node 配置断言验证 package/lock 的 engines 与 Vite 一致、CI 三版本和动态 matrix 引用存在，并对删除 engines/退回仅 22 的负例断言失败；检查通过。没有新增专门验证配置字符串的持久化测试。
- 受影响脚本 `npx eslint` 通过。CI 仅配置了矩阵，未宣称已在本地或远端执行 20/22；完整前端套件在其他页面修正稳定后执行。
- Q37：页面组件测试与 `src/test/showErrorModalMap.test.js` 可共用 route/error_reason 表；组件测试至少断言一次真实弹窗文案，不能只断言映射对象存在。`test_q37_*_known_reasons` / `test_q37_register_code_mapping` 等测试应遍历对应页面规格表中的全部组合，场景名只代表其中一个可见入口；`code_creation_failed` 归入 `test_q37_register_request_code_domain_mapping` 的遍历集合（实际断言在 `REQUEST_CODE_ERROR_TABLE`），不新增测试文件。
- Q35/Q36：ADDED 详情、死代码与资源删除使用组件或 Node 测试；MODIFIED 契约用 eligibility 组件测试消费共享纯函数，不断言弹窗；删除资格只做纯计算断言，实际删除只断言详情页入口；删除后仍保留 `npm run build` 证据。
- Q59：组件测试 mock `listAllContainerBrefInformation`，第一页返回 4 条、`total_number=6`，第二页返回 2 条；断言第二次调用参数为 `page_number:1, page_size:4`，不出现一次拉 6 条。
- Q63：断言四态（关键词、列表、`selectedId`、表单）同时正确；不要只断言表单未清空。
- Q69：用 deferred `unpauseContainer` 挂起操作，在途时切换页码或筛选，再 resolve；断言旧刷新结果被丢弃。
- 证据位置：apply 时把每行命令、退出码、通过用例数写入 `verify.md` 的对应 Q 小节，并在 tasks 勾选处保留简短结果；不得只写“已通过”。
