# frontend--page-settings Test Plan

Spec: [spec.md](spec.md)

## Current Mapping

### Requirement: Settings 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_settings_route_assembly`
- Assertion scope: 真实 `AppRoutes` + `PermissionProvider` + `MemoryRouter` 访问 `/admin/settings`，权限含 `settings:manage`，`listSystemSettings` 返回设置项；断言 AdminLayout 菜单「系统设置」出现、`.settings-page` 与设置项「自动清理天数」渲染、路由路径保持 `/admin/settings`。
- Coverage note: 规划测试，未创建；现有 `Settings.test.jsx` 与 `settingsForbiddenHandling.test.jsx` 只直渲页面。

### Requirement: Settings 主流程

#### Scenario: 合法设置更新成功

- Test/check:
  - [X] `src/test/Settings.test.jsx::test_q23_settings_integer_valid`
  - [X] `src/test/Settings.test.jsx::test_q23_settings_reminder_valid`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_settings_save_refresh_success`
- Assertion scope: 既有测试断言整数 9 与提醒节点 `48,24,12` 以期望对象调用 `updateSystemSettings`；规划测试让更新响应返回新值，断言 `message.success('设置已保存')` 可见、输入框刷新为服务端新值、「无改动」状态出现。
- Coverage note: 规划测试，未创建；既有测试未断言矩阵刷新与保存成功提示。后端未知键/越界校验与事务写入不在本前端测试计划范围，错误场景只覆盖前端对模拟 `invalid_setting`/`update_failed` 响应的展示。

### Requirement: Settings 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] `npm run build`
- Assertion scope: `vite build` 退出码 0，构建完成并生成 `dist`。
- Coverage note: 只证明构建成功与产物生成；不自动断言 `Settings`/`ModelViewer` 独立 chunk、`vendor-three-*` 分组或 Rollup 警告清单，这些是产物人工核对/验收观测，不由命令退出码证明。

### Requirement: Settings 整数与提醒节点必须完整校验

#### Scenario: 整数合法值可提交

- Test/check:
  - [X] `src/test/Settings.test.jsx::test_q23_settings_integer_valid`
- Assertion scope: 输入 9 后保存，`updateSystemSettings` 收到包含 `container.cleanup_after_days: 9` 的对象；字段未被校验错误阻止。

#### Scenario: 整数输入小数被拒

- Test/check:
  - [X] `src/test/Settings.test.jsx::test_q23_settings_integer_decimal_rejected`
- Assertion scope: 输入 `1.5` 保存后字段文本含「必须为整数」，`updateSystemSettings` 未被调用，因此未把 `1.5` 截断为 `1` 发送。

#### Scenario: 合法提醒节点可提交

- Test/check:
  - [X] `src/test/Settings.test.jsx::test_q23_settings_reminder_valid`
- Assertion scope: 输入 `48,24,12` 保存后，`updateSystemSettings` 收到原字符串 `container.cleanup_reminder_hours: '48,24,12'`。

#### Scenario: 非法提醒节点指出具体字段

- Test/check:
  - [X] `src/test/Settings.test.jsx::test_q23_settings_reminder_invalid_field`
- Assertion scope: 四个非法值分别保存后，「清理提醒节点」字段文本包含对应非法项（`abc`、空项、`0`、`-1`），`updateSystemSettings` 未调用，未静默丢弃后发送其他值。

### Requirement: Settings GROUP_ORDER 与后端实际分组一致

#### Scenario: 分组顺序与后端一致

- Test/check:
  - [X] `src/test/Settings.test.jsx::test_q23_settings_group_order`
- Assertion scope: 后端分组乱序输入后，`.settings-section-head h4` 文本严格等于 `['容器清理','磁盘策略','已删除容器','公告','镜像']`。

#### Scenario: 未知分组排最后

- Test/check:
  - [X] `src/test/Settings.test.jsx::test_q23_settings_unknown_group_last`
- Assertion scope: 含「未知分组」的输入渲染顺序严格等于五个已知分组后接「未知分组」，已知分组顺序不变。

### Requirement: Settings 错误保留结构化原因并兼容既有字符串

#### Scenario: invalid_setting 展示中文

- Test/check:
  - [X] `src/test/Settings.test.jsx::test_q37_settings_invalid_setting_mapping`
  - [X] `src/test/showErrorModalMap.test.js::Q37 真实弹窗按 route/reason 显示中文 > /settings → invalid_setting`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_settings_error_modal_frontend`
- Assertion scope: 页面测试只证明前端把模拟的 `error.body`、`status=422`、`route` 交给 `showErrorModal`，且映射表值为「设置项不合法」；工具测试只证明前端弹窗显示「设置项不合法」且不含「未收录的错误原因」。规划测试不 mock `showErrorModal`，mock `listSystemSettings` 返回 422 且 `body.error_reason='invalid_setting'` 的模拟响应，让 Settings 页面走真实前端错误展示链路；不证明 Ctrl 真实拒绝未知键/越界值，也不证明事务写入。
- Coverage note: 规划测试，未创建；既有两条分别覆盖前端页面参数契约与前端工具文案，未在单测内串起。后端 `invalid_setting` 的校验与事务行为不在本前端测试计划范围。

#### Scenario: update_failed 展示中文

- Test/check:
  - [X] `src/test/Settings.test.jsx::test_q37_settings_update_failed_mapping`
  - [X] `src/test/showErrorModalMap.test.js::Q37 规格 route/error_reason 全表 > /settings → update_failed 显示「保存设置失败」`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_settings_error_modal_frontend`
- Assertion scope: 页面测试只证明前端在更新失败时把模拟的 body、status、route 交给 `showErrorModal`，且映射表值为「保存设置失败」；全表测试只证明该前端映射值存在。规划测试 mock `updateSystemSettings` 返回 422 且 `body.error_reason='update_failed'` 的模拟响应，真实渲染 `/settings` 前端弹窗并断言文本「保存设置失败」，不落回英文或通用未知错误；不证明后端校验或事务写入。
- Coverage note: 规划测试，未创建；现有前端工具真实弹窗样例只含 invalid_setting，update_failed 只有映射值断言。后端行为不在本前端测试计划范围。

#### Scenario: 只传字符串时仍可读

- Test/check:
  - [X] `src/test/Settings.test.jsx::test_q37_settings_string_compatibility`
- Assertion scope: 真实弹窗对对象消息「历史字符串消息」、直接字符串「直接传入的字符串消息」、以及含 JSON 的字符串消息分别显示可读文案；不抛解析异常，JSON 中的 `invalid_setting` 仍映射为「原因：设置项不合法」。
