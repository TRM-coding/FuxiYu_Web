# Test Plan

<!-- Mapping only. 本文件是 Scenario→Test/check 对账计划，不是执行结果台账：
     不记录 run/pass/fail/时间戳/覆盖数字。`[X]` 仅表示该映射所引用的既有测试/检查存在，
     且其断言已从测试代码或构建配置确认；`[ ]` 表示测试或断言待创建或确认。 -->

## frontend--authentication

### Requirement: 仅认证失效触发全局身份清理

#### Scenario: 有效身份遇到业务拒绝

- Test/check:
  - [X] `src/test/apiAuthSignal.test.js::403：一般拒绝，不发认证信号、不清身份、不动其它在途请求，且原样保留响应体`
  - [X] `src/test/RbacMatrix.test.jsx::读取矩阵 403：显示后端拒绝原因，不导航、不清身份`
  - [X] `src/test/RbacMatrix.test.jsx::保存权限 403：显示后端拒绝原因，不导航、不清身份`
- Assertion scope: `apiAuthSignal` 对 user/container/machine/image/rbac/settings/announcement/operation_log 八个包装器逐一断言：403 只把错误交给调用方，不发 `auth:expired`、不调用 `abortAll`，其它在途控制器不被中止；错误保留 `status`、`route`、`error_reason` 所在响应体及数值字段（`limits.allowed === 0`、`wild_containers` 元素为数字）。RbacMatrix 页面级 403 断言显示后端 message、仍在 `/admin/rbac`、`localStorage` 身份保留、无成功提示。
- Coverage note: 页面展示以 RbacMatrix 为样本，其他页面共用同一 API 包装器与 `showErrorModal` 语义，未逐页重测；这不影响 403 不触发全局认证清理的结论。

#### Scenario: 认证失效

- Test/check:
  - [X] `src/test/apiAuthSignal.test.js::401：发一次 auth:expired（全局失效策略保持），并中断在途请求`
  - [X] `src/test/PermissionContext.test.jsx::auth:expired：清空快照（含资源位）+ 回登录页（客户端跳，不做整页重载）`
  - [X] `src/test/RbacMatrix.test.jsx::读取矩阵 401：仍走全局认证处理（回登录页 + 清历史本地身份）`
- Assertion scope: 八个包装器（含 `operation_log_api`）的 401 断言 `auth:expired` 只发一次且 `detail.reason === 'auth'`、`abortAll` 只发一次、在途控制器被中止；`PermissionProvider` 收到事件后清空 entities、image 资源位与身份并导航 `/`；RbacMatrix 页面级 401 导航到 `/`、清掉历史本地身份、不弹业务错误弹窗。

#### Scenario: 公开页静默身份探测

- Test/check:
  - [X] `src/test/apiAuthSignal.test.js::getUserPermissions：匿名探测的静默 401 不发认证信号（公开注册页必须进得去）`
  - [X] `src/test/PermissionContext.test.jsx::匿名访问不跳转：探针 401 ≠ 认证失效（/register 这类公开页必须进得去）`
- Assertion scope: `getUserPermissions` 的 401 仍以 `status: 401` 拒绝，但不发 `auth:expired`、不调用 `abortAll`；Provider 在 `/register` 捕获该 401 后路径仍为 `/register`，不会被全局清理推回登录页。

### Requirement: 镜像资源能力独立于方法权限展开

#### Scenario: 相同方法列表但资源能力不同

- Test/check:
  - [X] `src/test/PermissionContext.test.jsx::资源级通配来自服务端字段：true 存入，缺字段保守 false（不从 entities 反推）`
  - [X] `src/test/apiAuthSignal.test.js::getUserPermissions：资源位规范化为布尔，缺字段/非布尔一律保守 false`
- Assertion scope: `PermissionContext` 的两个快照 entities 都是 `image:view,image:edit,image:manage`，仅服务端字段不同：`image_resource_unrestricted: true` 时为 true，缺字段时仍为 false；`apiAuthSignal` 另以含 `image:manage` 的缺字段响应断言 false，并以非布尔 `'true'` 断言 false；两条测试都证明不从 entities 反推资源能力。
- Coverage note: 这两个快照的 entities 完全相同，差异只来自服务端资源位字段，正是本 Scenario 的区分条件。

#### Scenario: 换账号或清空身份

- Test/check:
  - [X] `src/test/PermissionContext.test.jsx::auth:expired：清空快照（含资源位）+ 回登录页（客户端跳，不做整页重载）`
  - [X] `src/test/PermissionContext.test.jsx::换账号 refresh：资源位被新响应替换`
- Assertion scope: `auth:expired` 后 `imageResourceUnrestricted` 由 true 变 false、entities 为空、身份为空、路径为 `/`；refresh 到另一用户（user 8）后资源位从上一账号的 true 替换为新响应的 false，旧账号能力不残留。

### Requirement: 容器资源能力独立于方法权限展开

#### Scenario: 相同方法列表但容器资源能力不同

- Test/check:
  - [X] `src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability maps the derived flag, defaults false, refreshes and clears`
  - [X] `src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability requires method, ROOT/resource and online guard for reset`
  - [X] `src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability normalizes API field and defaults missing to false`
- Assertion scope: 同一 entities 列表（`container:operation,container:manage`）下，服务端 `containerResourceUnrestricted` 为 true 时 Provider 值为 true，刷新为另一账号且字段为 false 时变为 false；重置谓词只消费 `hasOperationPermission`、ROOT 或资源位，不接收 entities；缺字段时即使 entities 含 `container:manage` 也归一化为 false，不从 entities 反推资源通配。
- Coverage note: 既有测试用服务端资源位区分同一方法列表；直持与仅由 `bypass_auth_entity` 展开的差异由 `container_resource_unrestricted` 决定，不由 entities 反推。

#### Scenario: 直持资源通配

- Test/check:
  - [X] `src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability requires method, ROOT/resource and online guard for reset`
  - [X] `src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_permission_guards requires method, ROOT/resource and online, and only detail page`
- Assertion scope: 谓词对非 ROOT 的 `ops` 账号（user 9，accounts 为空、`containerResourceUnrestricted: true`）返回 `visible: true`；既有测试未断言 `enabled`，本行不声称 enabled。详情页以 `container:operation` + flag true、用户不在 ROOT 账号中时仍渲染「重置密码」按钮，证明不要求用户是容器 ROOT 绑定。

#### Scenario: 字段缺失或旧后端

- Test/check:
  - [X] `src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability normalizes API field and defaults missing to false`
  - [X] `src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability requires method, ROOT/resource and online guard for reset`
  - [X] `src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_permission_guards requires method, ROOT/resource and online, and only detail page`
- Assertion scope: 旧响应缺 `container_resource_unrestricted` 时归一化为 false，即使 entities 含 `container:manage` 也不反推；flag false 的非 ROOT 账号（alice）在详情页不出现「重置密码」，admin 的 flag false 谓词也为 `visible: false`。

#### Scenario: 换账号或清空身份

- Test/check:
  - [X] `src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability maps the derived flag, defaults false, refreshes and clears`
- Assertion scope: Provider 值先为 true；refresh 到另一账号且字段为 false 后变 false；调用 `clear()` 后仍为 false，旧账号的容器资源位不残留。

#### Scenario: 方法通配不得单独放行

- Test/check:
  - [X] `src/test/containerActions.test.js::container:manage 同时提供操作/管理/资源通配；bypass_auth_entity 不是资源通配`
  - [X] `src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability normalizes API field and defaults missing to false`
  - [X] `src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_permission_guards requires method, ROOT/resource and online, and only detail page`
  - [X] `src/test/AnvilAuthContainerDetail.test.jsx::test_anvil_container_detail_hides_reset_for_method_wildcard_without_resource_flag`
- Assertion scope: 既有断言证明 `bypass_auth_entity` 单独出现在 permissions 时 `hasOperation`/`hasManage` 为 true 但 `resourceWildcard` 为 false；响应 entities 含 `container:manage` 且缺资源位字段时归一化为 false；flag false 的非 ROOT 账号在详情页无重置入口。新增测试真实渲染 `ContainerDetailPage` + `PermissionProvider` + `MemoryRouter` 的 `/index/containers/12`，权限快照为 `entities: ['container:operation', 'container:manage', 'bypass_auth_entity']`、`containerResourceUnrestricted: false`、当前用户为 alice（非 ROOT），详情 `online` 且 accounts 含 alice；mock `container_api` 后断言页面不出现「重置密码」且 `resetContainerPassword` 不被调用。
- Coverage note: 本变更新增的详情页测试放在独立文件，不改 detail-credential 批次的测试与组件；既有三条 `[X]` 分别覆盖通配不产生资源位、缺字段不从 entities 反推、flag=false 页面无入口。

### Requirement: 权限查询必须在 finally 注销控制器

#### Scenario: 成功返回后释放控制器

- Test/check:
  - [X] `src/test/permissionControllerRelease.test.js::test_q27_success_unregisters_controller`
  - [X] `src/test/AnvilAuthPages.test.jsx::test_anvil_permission_controller_unregister_is_idempotent`
- Assertion scope: 成功解析后 `createController`/`unregisterController` 各一次、注销的是同一控制器、全局在途集合归零、计时器归零，且释放路径不调用 `abortAll`。新增测试用真实 `requestManager` 创建控制器，`unregisterController` 连续调用两次不抛错，随后 `abortAll` 不再中止该控制器，证明重复注销幂等且已完成控制器未留在集合中。
- Coverage note: 既有测试覆盖单次成功释放、401/异常释放与连续四次查询；新增测试覆盖重复注销幂等。`PermissionProvider` 挂载、登录 refresh 与卸载三条触发路径共用 `getUserPermissions` 的 `finally`，未分别注入控制器观测，仍不单独覆盖调度差异。

#### Scenario: 401 或异常返回后释放控制器

- Test/check:
  - [X] `src/test/permissionControllerRelease.test.js::test_q27_error_unregisters_controller`
- Assertion scope: 401 与 `TypeError('Failed to fetch')` 两条失败路径都以对应错误拒绝，同时控制器已注销、计时器清零、`abortAll` 未被调用；401 仍保留 `status: 401` 供上层处理。

#### Scenario: 连续查询不积累控制器

- Test/check:
  - [X] `src/test/permissionControllerRelease.test.js::test_q27_repeated_queries_no_accumulation`
- Assertion scope: 连续四次查询（成功、401、网络异常、AbortError）后 `createController` 与 `unregisterController` 各四次，全局集合归零，`abortAll` 未被调用；超时/中止同样走 finally。

## frontend--page-login

### Requirement: Login 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] `src/test/routeLoading.test.jsx::"/" 匿名进入登录页：布局骨架先就位，登录表单懒加载后出现且不被 401 推走`
  - [X] `src/test/AnvilAuthPages.test.jsx::test_anvil_login_authenticated_snapshot_replaces_to_index`
- Assertion scope: 既有测试用真实 `AppRoutes` + `PermissionProvider` 访问 `/`，`getUserPermissions` 以空 entities、`userId: null` resolve（不是 401）：布局的登录/注册切换按钮立即出现，登录表单懒加载后出现，页面未被推走。新增测试用真实 `PermissionProvider` 快照 `loaded: true`、`userId: 7`，并在 localStorage 放置另一 id 作为干扰，断言登录页以 replace 到 `/index`、登录表单不再可用、`loginUser` 未被调用，身份来自权限快照而不是本地副本。
- Coverage note: 该既有测试标题含「不被 401 推走」，但实际 mock 是空权限 resolve；`/` 的 401 拒绝分支未由它断言，公开页 401 静默由 `PermissionContext` 的 `/register` 测试覆盖。「loaded 且 userId 已存在时 replace 到 /index」写在 Requirement 正文，无独立 Scenario，随本 Scenario 挂载。

### Requirement: Login 主流程

#### Scenario: 权限快照刷新失败

- Test/check:
  - [X] `src/test/AnvilAuthPages.test.jsx::test_anvil_login_refresh_failure_still_enters_index`
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
  - [X] `src/test/loginViewerLazy.test.jsx::viewer 模块未完成时：右侧是空占位，左侧登录表单照常可用`
  - [X] `src/test/AnvilAuthPages.test.jsx::test_anvil_login_viewer_loading_keeps_form_and_submit_available`
- Assertion scope: 既有测试用永不 settle 的 viewer 动态导入替身，断言 `model-stage-loading` 存在且为空 DOM、没有 `model-viewer`、没有可见「3D 预览」文案；左侧登录用户名/邮箱输入框可定位。新增测试等待登录表单出现后，断言登录提交按钮可用、`model-stage` 内无 `role="status"`/`aria-live` 播报；不否定页面级 `RouteLoading` 自身的 `role="status"`。
- Coverage note: 既有 `loginViewerLazy` 使用真实 `AppRoutes` 与真实 Login，覆盖舞台占位和输入框；它未断言提交按钮可用与舞台内无播报，新增测试覆盖这两项运行时状态。

#### Scenario: 模型正常就绪

- Test/check:
  - [X] `src/test/loginViewerLazy.test.jsx::viewer 模块完成后：渲染正常 viewer，无额外可见文案，左侧仍可用`
  - [X] `src/test/AnvilAuthPages.test.jsx::test_anvil_login_viewer_ready_keeps_form_and_submit_available`
- Assertion scope: 既有测试放行同一 deferred 后，`model-viewer` 出现并带 `/glb.opt.glb`，`model-stage-loading` 移除，页面不出现「3D 预览」文案，登录输入框仍可用。新增测试等待表单出现后断言提交按钮可用，`model-stage` 内无 `role="status"`/`aria-live` 播报；不把页面级 `RouteLoading` 计入该否定范围。
- Coverage note: 既有测试覆盖 viewer 就绪后的舞台与输入框；它未断言提交入口与舞台内播报，新增测试覆盖这两项运行时状态。

#### Scenario: 模型导入被拒绝

- Test/check:
  - [X] `src/test/loginViewerFailure.test.jsx::viewer 动态导入被拒绝：右栏为空占位，登录布局与表单槽位仍渲染`
  - [X] `src/test/AnvilAuthPages.test.jsx::test_anvil_login_register_viewer_failure_keeps_both_routes`
- Assertion scope: 既有测试让 viewer 动态导入被拒绝：右侧出现空的 `model-stage-unavailable`，无 loading/viewer/「3D 预览」文案；登录布局与表单槽位仍渲染，登录、注册切换按钮存在。新增测试实际渲染 `AppRoutes`，让 viewer 渲染抛错，断言 `/` 登录表单可用、点击「注册」后到 `/register` 且注册表单可用、舞台仍为空占位、舞台内无 `role="status"`/`aria-live` 播报；不否定页面级 `RouteLoading`。
- Coverage note: 既有测试覆盖动态导入拒绝并只使用表单槽位；新增测试覆盖渲染抛错与 `/register` 真实可达性。`ModelViewer` 自身 `renderDisabled` 降级文案未改动，未单独构造 WebGL 失败回归。

### Requirement: Login 删除 userMsg 死分支与调试 console 并保留结构化错误

#### Scenario: 登录失败展示后端结构化错误

- Test/check:
  - [X] `src/test/Login.test.jsx::test_q36_login_structured_error`
- Assertion scope: 登录接口以 `{ body: { message: 'error', error_reason: 'password_incorrect' }, status: 401, route: '/login' }` 拒绝后，真实错误弹窗显示「密码错误」与「未授权，请登录后重试。」，且不再出现 `Login error`/`Failed:` 调试输出；后端结构化原因经 `/login` 映射显示，不经过 `userMsg` 分支。

#### Scenario: 网络失败仍显示中文兜底

- Test/check:
  - [X] `src/test/Login.test.jsx::test_q36_login_network_fallback`
  - [X] `src/test/AnvilAuthPages.test.jsx::test_anvil_login_network_failure_hides_english_original`
- Assertion scope: 既有测试断言登录请求以 `new Error('Failed to fetch')` 拒绝时，真实弹窗显示「网络异常或请求超时，无法连接到服务器，请检查网络后重试。」。新增测试用真实 Login + 真实错误弹窗，断言弹窗文本仍含该中文、且不含 `Failed to fetch`/`NetworkError`/原始英文错误串，不把英文原文直接展示给用户。
- Coverage note: 既有测试只断言中文兜底出现；新增测试覆盖「不展示英文原文」这一剩余 THEN。

#### Scenario: 源码不再包含 userMsg 与调试 console

- Test/check:
  - [X] `src/test/Login.test.jsx::test_q36_login_no_dead_branch_or_debug_console`
- Assertion scope: 读取 `src/pages/Login.jsx`，断言不包含 `userMsg`、不匹配 `console.(error|log|warn)(`，仍包含 `showErrorModal` 与 `err?.body || err`；该 Scenario 的 THEN 本身就是源码不存在，静态读取是精确检查。

## frontend--page-register

### Requirement: Register 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] `src/test/routeLoading.test.jsx::"/register" 匿名注册可达，并与登录页共用同一个 LoginLayout`
  - [X] `src/test/PermissionContext.test.jsx::匿名访问不跳转：探针 401 ≠ 认证失效（/register 这类公开页必须进得去）`
- Assertion scope: 访问 `/register` 时学校邮箱输入框出现，登录/注册切换按钮保留在同一个 `LoginLayout` 内；匿名权限探测的 401 不改变 `/register` 路径。注册页以匿名入口装配，不需要已登录身份。
- Coverage note: 「学校域、验证码、用户名和口令由 Ctrl 服务最终校验」属后端裁决，不在 Web 测试内；前端可观察的学校邮箱输入与错误映射由本 capability 的其他 Scenario 覆盖。

### Requirement: Register 主流程

#### Scenario: 验证码验证失败或注册冲突

- Test/check:
  - [X] `src/test/Register.test.jsx::test_q37_register_code_mapping`
  - [X] `src/test/Register.test.jsx::test_q37_register_structured_call`
  - [X] `src/test/AnvilAuthPages.test.jsx::test_anvil_register_conflict_retains_form_and_allows_corrected_retry`
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
  - [X] `src/test/AnvilAuthPages.test.jsx::test_anvil_register_viewer_loading_placeholder_keeps_form`
- Assertion scope: 新增测试用真实 `AppRoutes` + `PermissionProvider` 访问 `/register`，viewer 替身保持挂起：右侧只有空的 `model-stage-loading`，无 `model-viewer`、无可见「3D 预览」文案；等待注册表单出现后，断言 `model-stage` 内无 `role="status"`/`aria-live`（不否定页面级 `RouteLoading`），左侧真实注册表单的学校邮箱、用户名、验证码与提交按钮可交互。
- Coverage note: 既有 `loginViewerLazy` 使用真实 `AppRoutes` 与真实 Login，不是桩表单；它只渲染 `/` 登录分支，不覆盖 `/register` 的加载中状态。本变更新增测试覆盖 `/register` 加载中，仍不覆盖真实 WebGL 渲染。

#### Scenario: 模型正常就绪

- Test/check:
  - [X] `src/test/AnvilAuthPages.test.jsx::test_anvil_register_viewer_ready_replaces_placeholder`
- Assertion scope: 新增测试放行 viewer 替身后，`model-viewer` 出现、`model-stage-loading` 移除，页面不出现额外加载/失败文案；等待注册表单出现后断言其仍可交互，且 `model-stage` 内无 `role="status"`/`aria-live`（不否定页面级 `RouteLoading`）。
- Coverage note: 既有测试不覆盖 `/register` 的 viewer 就绪状态；本变更新增测试覆盖该状态，jsdom 仍不渲染真实 WebGL。

#### Scenario: 模型导入被拒绝

- Test/check:
  - [X] `src/test/AnvilAuthPages.test.jsx::test_anvil_login_register_viewer_failure_keeps_both_routes`
- Assertion scope: 新增测试让 viewer 渲染抛错后访问 `/register`：右侧出现空的 `model-stage-unavailable`，注册表单可用，点击「登录」后到 `/` 且登录表单可用；`model-stage` 内无 `role="status"`/`aria-live` 播报（不否定页面级 `RouteLoading`），路由不被局部错误牵连。
- Coverage note: 该测试与 Login 的「模型导入被拒绝」Scenario 共用；既有 `loginViewerFailure` 使用共享布局与桩表单槽位，未渲染真实 `/register` 表单。

### Requirement: Register 删除无效 validateMessages 配置并保留字段规则

#### Scenario: 非法用户名仍显示字段规则消息

- Test/check:
  - [X] `src/test/Register.test.jsx::test_q36_register_field_rule_message`
  - [X] `src/test/AnvilAuthPages.test.jsx::test_anvil_register_rejects_non_empty_invalid_username`
- Assertion scope: 既有测试对空表单提交断言「请输入用户名」「请输入有效邮箱」「请输入邮箱验证码」「请输入密码」「毕业年份必须在1900到2100之间」，证明删除全局 `validateMessages` 后 required 消息仍生效。新增测试填写非空但含非法字符的用户名 `bad-name`、合法邮箱/验证码/密码/毕业年份后提交，断言 `registerUser` 不被调用，且 `showErrorModal` 收到 `{ title: '注册出错', message: '用户名仅允许英文、数字和下划线' }`；该消息是现有实现对非法字符分支的实际反馈。
- Coverage note: 既有测试只覆盖空表单 required 消息；新增测试覆盖非空非法字符名的提交反馈，未新增 pattern 规则或业务语义。

#### Scenario: 源码不再配置 validateMessages

- Test/check:
  - [X] `src/test/Register.test.jsx::test_q36_register_no_validate_messages`
- Assertion scope: 读取 `src/pages/Register.jsx`，断言不再包含 `validateMessages`，同时仍包含用户名、邮箱、验证码、密码的具体中文提示；该 Scenario 的 THEN 本身就是源码不存在，静态读取是精确检查。

### Requirement: Register 注册与验证码错误按现有协议映射

#### Scenario: 请求验证码域名被拒展示中文

- Test/check:
  - [X] `src/test/Register.test.jsx::test_q37_register_request_code_domain_mapping`
  - [X] `src/test/showErrorModalMap.test.js::Q37 真实弹窗按 route/reason 显示中文 > /request_register_code → code_creation_failed`
- Assertion scope: 页面级参数化测试逐行覆盖 `/request_register_code` 的 4 个 reason，断言 `showErrorModal` 收到含 `error_reason` 的 `err.body`、`status` 与 `route`，且 `routeErrorMap` 对应「请输入邮箱」「该邮箱域名不允许注册」「验证邮件发送失败」「验证码生成失败，请稍后重试」；真实弹窗样本断言 `code_creation_failed` 显示中文且不出现「未收录的错误原因」。
- Coverage note: 页面级测试替换了 `showErrorModal`，4 行都只断言调用参数与映射表，未逐行渲染弹窗；真实弹窗只对 `code_creation_failed` 样本断言。

#### Scenario: 注册验证码必填或失效展示中文

- Test/check:
  - [X] `src/test/Register.test.jsx::test_q37_register_code_mapping`
  - [X] `src/test/showErrorModalMap.test.js::Q37 真实弹窗按 route/reason 显示中文 > /register → registration_code_invalid`
- Assertion scope: `/register` 的 8 个 reason 逐行断言页面调用参数与 `routeErrorMap` 文案，其中 `registration_code_required`/`registration_code_invalid` 分别对应「请填写注册验证码」「注册验证码无效或已过期」；真实弹窗对 `registration_code_invalid` 断言显示该中文且不落到「未收录的错误原因」。
- Coverage note: 必填/失效两行未逐一渲染真实弹窗；页面调用参数逐行断言，真实弹窗由 `registration_code_invalid` 样本覆盖。

#### Scenario: 注册调用点传递结构化对象

- Test/check:
  - [X] `src/test/Register.test.jsx::test_q37_register_structured_call`
- Assertion scope: 注册失败时断言 `showErrorModal` 的 `args.message` 是 `err.body` 对象、`typeof args.message === 'object'`、`error_reason` 保留、`args.message !== err.message`，`args.status` 与 `args.route` 也保留；不把对象降成字符串。

## frontend--page-rbac-matrix

### Requirement: RbacMatrix 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] `src/test/RbacMatrix.test.jsx::renders permission chips by entity group and saves selected cells`
  - [X] `src/test/AnvilAuthPages.test.jsx::test_anvil_rbac_route_assembles_for_rbac_manage`
  - [X] `src/test/AnvilAuthPages.test.jsx::test_anvil_rbac_denies_without_rbac_manage`
- Assertion scope: 既有测试在 `loaded: true`、`hasPermission('rbac:manage')` 下渲染真实 `RbacMatrix`，断言角色 `user` 与机器/容器分组芯片出现，数据来自 `getRbacMatrix` 返回的 entities/groups。新增测试一用真实 `AppRoutes` + `PermissionProvider` + `AdminLayout` 访问 `/admin/rbac`，断言路径、标题「权限管理」、`getRbacMatrix` 被调用且目录芯片渲染；新增测试二给 `user:manage`（能过 `AdminLayout` 守卫）但不给 `rbac:manage`，断言页面显示「403 - 无权限矩阵管理权限」且 `getRbacMatrix` 不被调用。
- Coverage note: 既有测试直接渲染组件并 mock 权限上下文，不覆盖 `/admin/rbac` 路由装配与 `rbac:manage` 门禁；本变更新增两条测试覆盖这两个分支。

### Requirement: RbacMatrix 主流程

#### Scenario: 保存有效权限组配置

- Test/check:
  - [X] `src/test/RbacMatrix.test.jsx::renders permission chips by entity group and saves selected cells`
  - [X] `src/test/AnvilAuthPages.test.jsx::test_anvil_rbac_save_refreshes_matrix_from_returned_group`
- Assertion scope: 既有测试断言点击 `container:create` 并保存后，`updateRbacGroupEntities` 收到 `group_id: 10` 与含 `machine:view`、`container:create` 的 `entity_codes`，提交的是 code 字符串而不是把矩阵 id 当实体 id。新增测试让保存响应返回更新后的 group，断言出现「权限已保存」，且 `container:create` chip 的 `aria-label` 从 `开启 container:create` 变为 `关闭 container:create`、文案为「启用」，即矩阵按响应 `entity_codes` 回填。
- Coverage note: 既有测试只断言提交 payload；本变更新增测试覆盖保存后矩阵按响应刷新。

#### Scenario: 方法通配覆盖管理方法

- Test/check:
  - [X] `src/test/RbacMatrix.test.jsx::bypass_auth_entity 覆盖 manage 与跨域 manage，但不派生 bypass_resource`
  - [X] `src/test/RbacMatrix.test.jsx::仅方法通配的组可直接授予/撤销 manage 以扩大资源范围`
  - [X] `src/test/rbacMatrixUtils.test.js::方法实体通配覆盖普通权限点，也覆盖各域 manage`
  - [X] `src/test/rbacMatrixUtils.test.js::方法通配优先于同域 manage 派生（与后端判定顺序一致）`
  - [X] `src/test/RbacMatrix.test.jsx::bypass_resource 仅资源通配语义，不覆盖任何方法权限点`
  - [X] `src/test/rbacMatrixUtils.test.js::资源通配只具资源语义，不覆盖任何方法权限点`
- Assertion scope: 点击 `bypass_auth_entity` 后，`machine/container/image/settings:manage` 均带 `rbac-permission-chip-covered-auth`、`grantable`、可点击且文案为「实体通配」；纯派生的非 manage 点仍禁用；`bypass_resource` 不带覆盖样式且可点；工具层断言方法通配覆盖各域 manage 且优先于同域 manage 派生。`bypass_resource` 本身只表达资源通配，不覆盖任何方法权限点，也不被 `bypass_auth_entity` 派生为方法/manage。

#### Scenario: 直接配置管理权限不被方法覆盖阻断

- Test/check:
  - [X] `src/test/RbacMatrix.test.jsx::仅方法通配的组可直接授予/撤销 manage 以扩大资源范围`
  - [X] `src/test/RbacMatrix.test.jsx::locked 与 bypass_resource 的不可派生语义不受可授予 manage 影响`
- Assertion scope: 仅方法通配组直接授予 `container:manage` 后芯片转「启用」，保存集合含该 manage；撤销后回到「实体通配」覆盖但仍可再次授予，下一次保存集合不含 `container:manage` 且含新直持的 `image:manage`；operator 的 locked bypass 与 locked_manager 的 locked manage 始终禁用并显示「锁定」，`bypass_resource` 不被派生。

#### Scenario: 直接赋予与域内派生

- Test/check:
  - [X] `src/test/RbacMatrix.test.jsx::同域 manage 派生域内普通权限点，manage 自身与跨域不受影响`
  - [X] `src/test/RbacMatrix.test.jsx::bypass_auth_entity 覆盖 manage 与跨域 manage，但不派生 bypass_resource`
  - [X] `src/test/rbacMatrixUtils.test.js::直接赋予显示为直接，不被通配改写成派生覆盖`
  - [X] `src/test/rbacMatrixUtils.test.js::manage 派生不覆盖 manage 自身，也不跨域`
  - [X] `src/test/rbacMatrixUtils.test.js::manage 码不存在时不产生派生（对齐 _manage_entity_for 的有效码校验）`
- Assertion scope: `container:manage` 直接组自身显示「启用」，同域 `container:create`/`container:operation` 带 `covered-manage` 且禁用，跨域 `machine:view` 不被覆盖；直接赋予即使同时存在 `bypass_auth_entity` 仍保持直接启用；工具层断言同域派生不覆盖 manage 自身、不跨域，且当同域 manage 码不存在时不产生派生。

#### Scenario: 组名不符合后端格式

- Test/check:
  - [X] `src/test/RbacMatrix.test.jsx::创建角色前按 Ctrl 组名规则校验并给出反馈`
  - [X] `src/test/rbacMatrixUtils.test.js::长度边界 2 / 64 合法，1 / 65 非法`
  - [X] `src/test/rbacMatrixUtils.test.js::validateGroupName（对齐 Ctrl _GROUP_NAME_RE） > 拒绝非法组名 "1abc"，并给出具体原因`
  - [X] `src/test/rbacMatrixUtils.test.js::validateGroupName（对齐 Ctrl _GROUP_NAME_RE） > 拒绝非法组名 "a b"，并给出具体原因`
- Assertion scope: 页面输入 `1bad` 显示「角色名称必须以英文字母开头」且保存不调用 `createRbacGroup`；输入 `a` 显示「角色名称至少 2 个字符」；输入合法 `teacher2` 后提交，`createRbacGroup` 收到该名称并显示「角色已创建」。工具层断言 2/64 字符合法、1/65 字符非法，并覆盖首字母、字符范围等具体拒绝原因。
- Coverage note: 合法名称的唯一性仍由后端校验，Web 测试只断言前端格式规则与提交；不伪造唯一性覆盖。

### Requirement: RbacMatrix 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] `npm run build`
- Assertion scope: 既有 `vite build` 检查（`npm run build`）：退出码 0、构建完成并生成 `dist`。随后人工核对 `dist/assets` 中存在 `RbacMatrix` 与 `ModelViewer` 命名 chunk，且入口 chunk 不包含其页面源码；chunk 边界是人工观测，不由退出码 0 自动证明。
- Coverage note: 该 check 只对构建命令与可观测产物负责。`React.lazy`/`Suspense` 组织、`vite.config.js` 的 `manualChunks` 配置与静态导入现状属人工核对事实，不由本 check 断言；chunk 体积与警告清单不作为规格指标。
