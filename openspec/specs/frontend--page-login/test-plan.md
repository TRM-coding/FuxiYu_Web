# frontend--page-login Test Plan

Spec: [spec.md](spec.md)

## Current Mapping

### Requirement: Login 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] `../../../src/test/routeLoading.test.jsx::"/" 匿名进入登录页：布局骨架先就位，登录表单懒加载后出现且不被 401 推走`
  - [X] `../../../src/test/AnvilAuthPages.test.jsx::test_anvil_login_authenticated_snapshot_replaces_to_index`
- Assertion scope: 既有测试用真实 `AppRoutes` + `PermissionProvider` 访问 `/`，`getUserPermissions` 以空 entities、`userId: null` resolve（不是 401）：布局的登录/注册切换按钮立即出现，登录表单懒加载后出现，页面未被推走。新增测试用真实 `PermissionProvider` 快照 `loaded: true`、`userId: 7`，并在 localStorage 放置另一 id 作为干扰，断言登录页以 replace 到 `/index`、登录表单不再可用、`loginUser` 未被调用，身份来自权限快照而不是本地副本。
- Coverage note: 该既有测试标题含「不被 401 推走」，但实际 mock 是空权限 resolve；`/` 的 401 拒绝分支未由它断言，公开页 401 静默由 `PermissionContext` 的 `/register` 测试覆盖。「loaded 且 userId 已存在时 replace 到 /index」写在 Requirement 正文，无独立 Scenario，随本 Scenario 挂载。

### Requirement: Login 主流程

#### Scenario: 权限快照刷新失败

- Test/check:
  - [X] `../../../src/test/AnvilAuthPages.test.jsx::test_anvil_login_refresh_failure_still_enters_index`
- Assertion scope: 新增测试让 `loginUser` 成功、`getUserPermissions` 的 refresh 调用失败：页面吞掉刷新错误，仍调用 `message.success('登录成功')` 并导航到 `/index`，不调用 `showErrorModal`；同时断言 `loginUser` 收到 `username`/`password`/`remember`，且 localStorage 中不写入身份副本。该行为是规格登记的待修复差异，测试只锁定当前可观察行为，不评价修复方向。
- Coverage note: 既有测试只覆盖登录失败的结构化错误与网络兜底，不覆盖成功登录后的 refresh 失败；本变更新增测试覆盖 refresh 失败仍进站。HttpOnly cookie 由 Ctrl 设置，Web 测试不断言 cookie 生命周期；refresh 成功后的权限快照内容不在本测试范围。

### Requirement: Login 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] `npm run build`
- Assertion scope: 既有 `vite build` 检查（`npm run build`）：退出码 0、构建完成并生成 `dist`。随后人工核对 `dist/assets` 中存在 `Login` 与 `ModelViewer` 命名 chunk，且入口 chunk 不包含其页面源码；chunk 边界是人工观测，不由退出码 0 自动证明。
- Coverage note: 该 check 只对构建命令与可观测产物负责。`React.lazy`/`Suspense` 组织、`vite.config.js` 的 `manualChunks` 配置、`requestManager.jsx`/`validateCmdArg.jsx` 的静态导入现状属人工核对事实，不由本 check 断言；chunk 体积与警告清单是验收观测，不是本规格固化的历史指标。

### Requirement: Login 登录布局与 3D 预览的独立加载

#### Scenario: 模型仍未就绪

- Test/check:
  - [X] `../../../src/test/loginViewerLazy.test.jsx::viewer 模块未完成时：右侧是空占位，左侧登录表单照常可用`
  - [X] `../../../src/test/AnvilAuthPages.test.jsx::test_anvil_login_viewer_loading_keeps_form_and_submit_available`
- Assertion scope: 既有测试用永不 settle 的 viewer 动态导入替身，断言 `model-stage-loading` 存在且为空 DOM、没有 `model-viewer`、没有可见「3D 预览」文案；左侧登录用户名/邮箱输入框可定位。新增测试等待登录表单出现后，断言登录提交按钮可用、`model-stage` 内无 `role="status"`/`aria-live` 播报；不否定页面级 `RouteLoading` 自身的 `role="status"`。
- Coverage note: 既有 `loginViewerLazy` 使用真实 `AppRoutes` 与真实 Login，覆盖舞台占位和输入框；它未断言提交按钮可用与舞台内无播报，新增测试覆盖这两项运行时状态。

#### Scenario: 模型正常就绪

- Test/check:
  - [X] `../../../src/test/loginViewerLazy.test.jsx::viewer 模块完成后：渲染正常 viewer，无额外可见文案，左侧仍可用`
  - [X] `../../../src/test/AnvilAuthPages.test.jsx::test_anvil_login_viewer_ready_keeps_form_and_submit_available`
- Assertion scope: 既有测试放行同一 deferred 后，`model-viewer` 出现并带 `/glb.opt.glb`，`model-stage-loading` 移除，页面不出现「3D 预览」文案，登录输入框仍可用。新增测试等待表单出现后断言提交按钮可用，`model-stage` 内无 `role="status"`/`aria-live` 播报；不把页面级 `RouteLoading` 计入该否定范围。
- Coverage note: 既有测试覆盖 viewer 就绪后的舞台与输入框；它未断言提交入口与舞台内播报，新增测试覆盖这两项运行时状态。

#### Scenario: 模型导入被拒绝

- Test/check:
  - [X] `../../../src/test/loginViewerFailure.test.jsx::viewer 动态导入被拒绝：右栏为空占位，登录布局与表单槽位仍渲染`
  - [X] `../../../src/test/AnvilAuthPages.test.jsx::test_anvil_login_register_viewer_failure_keeps_both_routes`
- Assertion scope: 既有测试让 viewer 动态导入被拒绝：右侧出现空的 `model-stage-unavailable`，无 loading/viewer/「3D 预览」文案；登录布局与表单槽位仍渲染，登录、注册切换按钮存在。新增测试实际渲染 `AppRoutes`，让 viewer 渲染抛错，断言 `/` 登录表单可用、点击「注册」后到 `/register` 且注册表单可用、舞台仍为空占位、舞台内无 `role="status"`/`aria-live` 播报；不否定页面级 `RouteLoading`。
- Coverage note: 既有测试覆盖动态导入拒绝并只使用表单槽位；新增测试覆盖渲染抛错与 `/register` 真实可达性。`ModelViewer` 自身 `renderDisabled` 降级文案未改动，未单独构造 WebGL 失败回归。

### Requirement: Login 删除 userMsg 死分支与调试 console 并保留结构化错误

#### Scenario: 登录失败展示后端结构化错误

- Test/check:
  - [X] `../../../src/test/Login.test.jsx::test_q36_login_structured_error`
- Assertion scope: 登录接口以 `{ body: { message: 'error', error_reason: 'password_incorrect' }, status: 401, route: '/login' }` 拒绝后，真实错误弹窗显示「密码错误」与「未授权，请登录后重试。」，且不再出现 `Login error`/`Failed:` 调试输出；后端结构化原因经 `/login` 映射显示，不经过 `userMsg` 分支。

#### Scenario: 网络失败仍显示中文兜底

- Test/check:
  - [X] `../../../src/test/Login.test.jsx::test_q36_login_network_fallback`
  - [X] `../../../src/test/AnvilAuthPages.test.jsx::test_anvil_login_network_failure_hides_english_original`
- Assertion scope: 既有测试断言登录请求以 `new Error('Failed to fetch')` 拒绝时，真实弹窗显示「网络异常或请求超时，无法连接到服务器，请检查网络后重试。」。新增测试用真实 Login + 真实错误弹窗，断言弹窗文本仍含该中文、且不含 `Failed to fetch`/`NetworkError`/原始英文错误串，不把英文原文直接展示给用户。
- Coverage note: 既有测试只断言中文兜底出现；新增测试覆盖「不展示英文原文」这一剩余 THEN。

#### Scenario: 源码不再包含 userMsg 与调试 console

- Test/check:
  - [X] `../../../src/test/Login.test.jsx::test_q36_login_no_dead_branch_or_debug_console`
- Assertion scope: 读取 `src/pages/Login.jsx`，断言不包含 `userMsg`、不匹配 `console.(error|log|warn)(`，仍包含 `showErrorModal` 与 `err?.body || err`；该 Scenario 的 THEN 本身就是源码不存在，静态读取是精确检查。
