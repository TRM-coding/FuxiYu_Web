# frontend--page-register Test Plan

Spec: [spec.md](spec.md)

## Current Mapping

### Requirement: Register 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] `../../../src/test/routeLoading.test.jsx::"/register" 匿名注册可达，并与登录页共用同一个 LoginLayout`
  - [X] `../../../src/test/PermissionContext.test.jsx::匿名访问不跳转：探针 401 ≠ 认证失效（/register 这类公开页必须进得去）`
- Assertion scope: 访问 `/register` 时学校邮箱输入框出现，登录/注册切换按钮保留在同一个 `LoginLayout` 内；匿名权限探测的 401 不改变 `/register` 路径。注册页以匿名入口装配，不需要已登录身份。
- Coverage note: 「学校域、验证码、用户名和口令由 Ctrl 服务最终校验」属后端裁决，不在 Web 测试内；前端可观察的学校邮箱输入与错误映射由本 capability 的其他 Scenario 覆盖。

### Requirement: Register 主流程

#### Scenario: 验证码验证失败或注册冲突

- Test/check:
  - [X] `../../../src/test/Register.test.jsx::test_q37_register_code_mapping`
  - [X] `../../../src/test/Register.test.jsx::test_q37_register_structured_call`
  - [X] `../../../src/test/AnvilAuthPages.test.jsx::test_anvil_register_conflict_retains_form_and_allows_corrected_retry`
- Assertion scope: 既有参数化测试覆盖 `/register` 的 8 个 reason（含 `username_exists`、`email_exists`、`registration_code_required`、`registration_code_invalid`）：页面调用 `showErrorModal` 时保留 `err.body` 对象、`status` 与 `route`，`routeErrorMap` 对应中文命中；结构化调用测试断言 `args.message` 是含 `error_reason` 的对象而非 `err.message` 字符串。新增测试让首次注册以 `username_exists` 冲突拒绝，断言页面保留、输入值保留、无成功弹窗；修改用户名后再次提交，断言 `registerUser` 的第二次调用 payload 同时含 `username`、`password`、`email`、`graduation_year`（数字）与 `registration_code` 五个字段，且值为表单当前输入（新用户名、同一验证码），随后出现注册成功弹窗。
- Coverage note: 验证码是否被后端消费/事务是否回滚由 Ctrl 裁决；Web 只断言冲突后前端未清空输入且允许用完整五字段 payload 重试。

### Requirement: Register 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] `npm run build`
- Assertion scope: 既有 `vite build` 检查（`npm run build`）：退出码 0、构建完成并生成 `dist`。随后人工核对 `dist/assets` 中存在 `Register` 与 `ModelViewer` 命名 chunk，且入口 chunk 不包含其页面源码；chunk 边界是人工观测，不由退出码 0 自动证明。
- Coverage note: 该 check 只对构建命令与可观测产物负责。`React.lazy`/`Suspense` 组织、`vite.config.js` 的 `manualChunks` 配置与静态导入现状属人工核对事实，不由本 check 断言；chunk 体积与警告清单不作为规格指标。

### Requirement: Register 登录布局与 3D 预览的独立加载

#### Scenario: 模型仍未就绪

- Test/check:
  - [X] `../../../src/test/AnvilAuthPages.test.jsx::test_anvil_register_viewer_loading_placeholder_keeps_form`
- Assertion scope: 新增测试用真实 `AppRoutes` + `PermissionProvider` 访问 `/register`，viewer 替身保持挂起：右侧只有空的 `model-stage-loading`，无 `model-viewer`、无可见「3D 预览」文案；等待注册表单出现后，断言 `model-stage` 内无 `role="status"`/`aria-live`（不否定页面级 `RouteLoading`），左侧真实注册表单的学校邮箱、用户名、验证码与提交按钮可交互。
- Coverage note: 既有 `loginViewerLazy` 使用真实 `AppRoutes` 与真实 Login，不是桩表单；它只渲染 `/` 登录分支，不覆盖 `/register` 的加载中状态。本变更新增测试覆盖 `/register` 加载中，仍不覆盖真实 WebGL 渲染。

#### Scenario: 模型正常就绪

- Test/check:
  - [X] `../../../src/test/AnvilAuthPages.test.jsx::test_anvil_register_viewer_ready_replaces_placeholder`
- Assertion scope: 新增测试放行 viewer 替身后，`model-viewer` 出现、`model-stage-loading` 移除，页面不出现额外加载/失败文案；等待注册表单出现后断言其仍可交互，且 `model-stage` 内无 `role="status"`/`aria-live`（不否定页面级 `RouteLoading`）。
- Coverage note: 既有测试不覆盖 `/register` 的 viewer 就绪状态；本变更新增测试覆盖该状态，jsdom 仍不渲染真实 WebGL。

#### Scenario: 模型导入被拒绝

- Test/check:
  - [X] `../../../src/test/AnvilAuthPages.test.jsx::test_anvil_login_register_viewer_failure_keeps_both_routes`
- Assertion scope: 新增测试让 viewer 渲染抛错后访问 `/register`：右侧出现空的 `model-stage-unavailable`，注册表单可用，点击「登录」后到 `/` 且登录表单可用；`model-stage` 内无 `role="status"`/`aria-live` 播报（不否定页面级 `RouteLoading`），路由不被局部错误牵连。
- Coverage note: 该测试与 Login 的「模型导入被拒绝」Scenario 共用；既有 `loginViewerFailure` 使用共享布局与桩表单槽位，未渲染真实 `/register` 表单。

### Requirement: Register 删除无效 validateMessages 配置并保留字段规则

#### Scenario: 非法用户名仍显示字段规则消息

- Test/check:
  - [X] `../../../src/test/Register.test.jsx::test_q36_register_field_rule_message`
  - [X] `../../../src/test/AnvilAuthPages.test.jsx::test_anvil_register_rejects_non_empty_invalid_username`
- Assertion scope: 既有测试对空表单提交断言「请输入用户名」「请输入有效邮箱」「请输入邮箱验证码」「请输入密码」「毕业年份必须在1900到2100之间」，证明删除全局 `validateMessages` 后 required 消息仍生效。新增测试填写非空但含非法字符的用户名 `bad-name`、合法邮箱/验证码/密码/毕业年份后提交，断言 `registerUser` 不被调用，且 `showErrorModal` 收到 `{ title: '注册出错', message: '用户名仅允许英文、数字和下划线' }`；该消息是现有实现对非法字符分支的实际反馈。
- Coverage note: 既有测试只覆盖空表单 required 消息；新增测试覆盖非空非法字符名的提交反馈，未新增 pattern 规则或业务语义。

#### Scenario: 源码不再配置 validateMessages

- Test/check:
  - [X] `../../../src/test/Register.test.jsx::test_q36_register_no_validate_messages`
- Assertion scope: 读取 `src/pages/Register.jsx`，断言不再包含 `validateMessages`，同时仍包含用户名、邮箱、验证码、密码的具体中文提示；该 Scenario 的 THEN 本身就是源码不存在，静态读取是精确检查。

### Requirement: Register 注册与验证码错误按现有协议映射

#### Scenario: 请求验证码域名被拒展示中文

- Test/check:
  - [X] `../../../src/test/Register.test.jsx::test_q37_register_request_code_domain_mapping`
  - [X] `../../../src/test/showErrorModalMap.test.js::Q37 真实弹窗按 route/reason 显示中文 > /request_register_code → code_creation_failed`
- Assertion scope: 页面级参数化测试逐行覆盖 `/request_register_code` 的 4 个 reason，断言 `showErrorModal` 收到含 `error_reason` 的 `err.body`、`status` 与 `route`，且 `routeErrorMap` 对应「请输入邮箱」「该邮箱域名不允许注册」「验证邮件发送失败」「验证码生成失败，请稍后重试」；真实弹窗样本断言 `code_creation_failed` 显示中文且不出现「未收录的错误原因」。
- Coverage note: 页面级测试替换了 `showErrorModal`，4 行都只断言调用参数与映射表，未逐行渲染弹窗；真实弹窗只对 `code_creation_failed` 样本断言。

#### Scenario: 注册验证码必填或失效展示中文

- Test/check:
  - [X] `../../../src/test/Register.test.jsx::test_q37_register_code_mapping`
  - [X] `../../../src/test/showErrorModalMap.test.js::Q37 真实弹窗按 route/reason 显示中文 > /register → registration_code_invalid`
- Assertion scope: `/register` 的 8 个 reason 逐行断言页面调用参数与 `routeErrorMap` 文案，其中 `registration_code_required`/`registration_code_invalid` 分别对应「请填写注册验证码」「注册验证码无效或已过期」；真实弹窗对 `registration_code_invalid` 断言显示该中文且不落到「未收录的错误原因」。
- Coverage note: 必填/失效两行未逐一渲染真实弹窗；页面调用参数逐行断言，真实弹窗由 `registration_code_invalid` 样本覆盖。

#### Scenario: 注册调用点传递结构化对象

- Test/check:
  - [X] `../../../src/test/Register.test.jsx::test_q37_register_structured_call`
- Assertion scope: 注册失败时断言 `showErrorModal` 的 `args.message` 是 `err.body` 对象、`typeof args.message === 'object'`、`error_reason` 保留、`args.message !== err.message`，`args.status` 与 `args.route` 也保留；不把对象降成字符串。
