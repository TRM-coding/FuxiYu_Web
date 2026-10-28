# frontend--authentication Test Plan

Spec: [spec.md](spec.md)

## Current Mapping

### Requirement: 仅认证失效触发全局身份清理

#### Scenario: 有效身份遇到业务拒绝

- Test/check:
  - [X] `../../../src/test/apiAuthSignal.test.js::403：一般拒绝，不发认证信号、不清身份、不动其它在途请求，且原样保留响应体`
  - [X] `../../../src/test/RbacMatrix.test.jsx::读取矩阵 403：显示后端拒绝原因，不导航、不清身份`
  - [X] `../../../src/test/RbacMatrix.test.jsx::保存权限 403：显示后端拒绝原因，不导航、不清身份`
- Assertion scope: `apiAuthSignal` 对 user/container/machine/image/rbac/settings/announcement/operation_log 八个包装器逐一断言：403 只把错误交给调用方，不发 `auth:expired`、不调用 `abortAll`，其它在途控制器不被中止；错误保留 `status`、`route`、`error_reason` 所在响应体及数值字段（`limits.allowed === 0`、`wild_containers` 元素为数字）。RbacMatrix 页面级 403 断言显示后端 message、仍在 `/admin/rbac`、`localStorage` 身份保留、无成功提示。
- Coverage note: 页面展示以 RbacMatrix 为样本，其他页面共用同一 API 包装器与 `showErrorModal` 语义，未逐页重测；这不影响 403 不触发全局认证清理的结论。

#### Scenario: 认证失效

- Test/check:
  - [X] `../../../src/test/apiAuthSignal.test.js::401：发一次 auth:expired（全局失效策略保持），并中断在途请求`
  - [X] `../../../src/test/PermissionContext.test.jsx::auth:expired：清空快照（含资源位）+ 回登录页（客户端跳，不做整页重载）`
  - [X] `../../../src/test/RbacMatrix.test.jsx::读取矩阵 401：仍走全局认证处理（回登录页 + 清历史本地身份）`
- Assertion scope: 八个包装器（含 `operation_log_api`）的 401 断言 `auth:expired` 只发一次且 `detail.reason === 'auth'`、`abortAll` 只发一次、在途控制器被中止；`PermissionProvider` 收到事件后清空 entities、image 资源位与身份并导航 `/`；RbacMatrix 页面级 401 导航到 `/`、清掉历史本地身份、不弹业务错误弹窗。

#### Scenario: 公开页静默身份探测

- Test/check:
  - [X] `../../../src/test/apiAuthSignal.test.js::getUserPermissions：匿名探测的静默 401 不发认证信号（公开注册页必须进得去）`
  - [X] `../../../src/test/PermissionContext.test.jsx::匿名访问不跳转：探针 401 ≠ 认证失效（/register 这类公开页必须进得去）`
- Assertion scope: `getUserPermissions` 的 401 仍以 `status: 401` 拒绝，但不发 `auth:expired`、不调用 `abortAll`；Provider 在 `/register` 捕获该 401 后路径仍为 `/register`，不会被全局清理推回登录页。

### Requirement: 镜像资源能力独立于方法权限展开

#### Scenario: 相同方法列表但资源能力不同

- Test/check:
  - [X] `../../../src/test/PermissionContext.test.jsx::资源级通配来自服务端字段：true 存入，缺字段保守 false（不从 entities 反推）`
  - [X] `../../../src/test/apiAuthSignal.test.js::getUserPermissions：资源位规范化为布尔，缺字段/非布尔一律保守 false`
- Assertion scope: `PermissionContext` 的两个快照 entities 都是 `image:view,image:edit,image:manage`，仅服务端字段不同：`image_resource_unrestricted: true` 时为 true，缺字段时仍为 false；`apiAuthSignal` 另以含 `image:manage` 的缺字段响应断言 false，并以非布尔 `'true'` 断言 false；两条测试都证明不从 entities 反推资源能力。
- Coverage note: 这两个快照的 entities 完全相同，差异只来自服务端资源位字段，正是本 Scenario 的区分条件。

#### Scenario: 换账号或清空身份

- Test/check:
  - [X] `../../../src/test/PermissionContext.test.jsx::auth:expired：清空快照（含资源位）+ 回登录页（客户端跳，不做整页重载）`
  - [X] `../../../src/test/PermissionContext.test.jsx::换账号 refresh：资源位被新响应替换`
- Assertion scope: `auth:expired` 后 `imageResourceUnrestricted` 由 true 变 false、entities 为空、身份为空、路径为 `/`；refresh 到另一用户（user 8）后资源位从上一账号的 true 替换为新响应的 false，旧账号能力不残留。

### Requirement: 容器资源能力独立于方法权限展开

#### Scenario: 相同方法列表但容器资源能力不同

- Test/check:
  - [X] `../../../src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability maps the derived flag, defaults false, refreshes and clears`
  - [X] `../../../src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability requires method, ROOT/resource and online guard for reset`
  - [X] `../../../src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability normalizes API field and defaults missing to false`
- Assertion scope: 同一 entities 列表（`container:operation,container:manage`）下，服务端 `containerResourceUnrestricted` 为 true 时 Provider 值为 true，刷新为另一账号且字段为 false 时变为 false；重置谓词只消费 `hasOperationPermission`、ROOT 或资源位，不接收 entities；缺字段时即使 entities 含 `container:manage` 也归一化为 false，不从 entities 反推资源通配。
- Coverage note: 既有测试用服务端资源位区分同一方法列表；直持与仅由 `bypass_auth_entity` 展开的差异由 `container_resource_unrestricted` 决定，不由 entities 反推。

#### Scenario: 直持资源通配

- Test/check:
  - [X] `../../../src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability requires method, ROOT/resource and online guard for reset`
  - [X] `../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_permission_guards requires method, ROOT/resource and online, and only detail page`
- Assertion scope: 谓词对非 ROOT 的 `ops` 账号（user 9，accounts 为空、`containerResourceUnrestricted: true`）返回 `visible: true`；既有测试未断言 `enabled`，本行不声称 enabled。详情页以 `container:operation` + flag true、用户不在 ROOT 账号中时仍渲染「重置密码」按钮，证明不要求用户是容器 ROOT 绑定。

#### Scenario: 字段缺失或旧后端

- Test/check:
  - [X] `../../../src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability normalizes API field and defaults missing to false`
  - [X] `../../../src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability requires method, ROOT/resource and online guard for reset`
  - [X] `../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_permission_guards requires method, ROOT/resource and online, and only detail page`
- Assertion scope: 旧响应缺 `container_resource_unrestricted` 时归一化为 false，即使 entities 含 `container:manage` 也不反推；flag false 的非 ROOT 账号（alice）在详情页不出现「重置密码」，admin 的 flag false 谓词也为 `visible: false`。

#### Scenario: 换账号或清空身份

- Test/check:
  - [X] `../../../src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability maps the derived flag, defaults false, refreshes and clears`
- Assertion scope: Provider 值先为 true；refresh 到另一账号且字段为 false 后变 false；调用 `clear()` 后仍为 false，旧账号的容器资源位不残留。

#### Scenario: 方法通配不得单独放行

- Test/check:
  - [X] `../../../src/test/containerActions.test.js::container:manage 同时提供操作/管理/资源通配；bypass_auth_entity 不是资源通配`
  - [X] `../../../src/test/ContainerResourcePermission.test.jsx::test_auth_container_resource_capability normalizes API field and defaults missing to false`
  - [X] `../../../src/test/ContainerDetailPasswords.test.jsx::test_detail_reset_permission_guards requires method, ROOT/resource and online, and only detail page`
  - [X] `../../../src/test/AnvilAuthContainerDetail.test.jsx::test_anvil_container_detail_hides_reset_for_method_wildcard_without_resource_flag`
- Assertion scope: 既有断言证明 `bypass_auth_entity` 单独出现在 permissions 时 `hasOperation`/`hasManage` 为 true 但 `resourceWildcard` 为 false；响应 entities 含 `container:manage` 且缺资源位字段时归一化为 false；flag false 的非 ROOT 账号在详情页无重置入口。新增测试真实渲染 `ContainerDetailPage` + `PermissionProvider` + `MemoryRouter` 的 `/index/containers/12`，权限快照为 `entities: ['container:operation', 'container:manage', 'bypass_auth_entity']`、`containerResourceUnrestricted: false`、当前用户为 alice（非 ROOT），详情 `online` 且 accounts 含 alice；mock `container_api` 后断言页面不出现「重置密码」且 `resetContainerPassword` 不被调用。
- Coverage note: 本变更新增的详情页测试放在独立文件，不改 detail-credential 批次的测试与组件；既有三条 `[X]` 分别覆盖通配不产生资源位、缺字段不从 entities 反推、flag=false 页面无入口。

### Requirement: 权限查询必须在 finally 注销控制器

#### Scenario: 成功返回后释放控制器

- Test/check:
  - [X] `../../../src/test/permissionControllerRelease.test.js::test_q27_success_unregisters_controller`
  - [X] `../../../src/test/AnvilAuthPages.test.jsx::test_anvil_permission_controller_unregister_is_idempotent`
- Assertion scope: 成功解析后 `createController`/`unregisterController` 各一次、注销的是同一控制器、全局在途集合归零、计时器归零，且释放路径不调用 `abortAll`。新增测试用真实 `requestManager` 创建控制器，`unregisterController` 连续调用两次不抛错，随后 `abortAll` 不再中止该控制器，证明重复注销幂等且已完成控制器未留在集合中。
- Coverage note: 既有测试覆盖单次成功释放、401/异常释放与连续四次查询；新增测试覆盖重复注销幂等。`PermissionProvider` 挂载、登录 refresh 与卸载三条触发路径共用 `getUserPermissions` 的 `finally`，未分别注入控制器观测，仍不单独覆盖调度差异。

#### Scenario: 401 或异常返回后释放控制器

- Test/check:
  - [X] `../../../src/test/permissionControllerRelease.test.js::test_q27_error_unregisters_controller`
- Assertion scope: 401 与 `TypeError('Failed to fetch')` 两条失败路径都以对应错误拒绝，同时控制器已注销、计时器清零、`abortAll` 未被调用；401 仍保留 `status: 401` 供上层处理。

#### Scenario: 连续查询不积累控制器

- Test/check:
  - [X] `../../../src/test/permissionControllerRelease.test.js::test_q27_repeated_queries_no_accumulation`
- Assertion scope: 连续四次查询（成功、401、网络异常、AbortError）后 `createController` 与 `unregisterController` 各四次，全局集合归零，`abortAll` 未被调用；超时/中止同样走 finally。
