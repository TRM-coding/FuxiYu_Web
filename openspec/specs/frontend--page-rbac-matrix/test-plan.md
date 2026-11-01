# frontend--page-rbac-matrix Test Plan

Spec: [spec.md](spec.md)

## Current Mapping

### Requirement: RbacMatrix 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] `../../../src/test/RbacMatrix.test.jsx::renders permission chips by entity group and saves selected cells`
  - [X] `../../../src/test/AnvilAuthPages.test.jsx::test_anvil_rbac_route_assembles_for_rbac_manage`
  - [X] `../../../src/test/AnvilAuthPages.test.jsx::test_anvil_rbac_denies_without_rbac_manage`
- Assertion scope: 既有测试在 `loaded: true`、`hasPermission('rbac:manage')` 下渲染真实 `RbacMatrix`，断言角色 `user` 与机器/容器分组芯片出现，数据来自 `getRbacMatrix` 返回的 entities/groups。新增测试一用真实 `AppRoutes` + `PermissionProvider` + `AdminLayout` 访问 `/admin/rbac`，断言路径、标题「权限管理」、`getRbacMatrix` 被调用且目录芯片渲染；新增测试二给 `user:manage`（能过 `AdminLayout` 守卫）但不给 `rbac:manage`，断言页面显示「403 - 无权限矩阵管理权限」且 `getRbacMatrix` 不被调用。
- Coverage note: 既有测试直接渲染组件并 mock 权限上下文，不覆盖 `/admin/rbac` 路由装配与 `rbac:manage` 门禁；本变更新增两条测试覆盖这两个分支。

### Requirement: RbacMatrix 主流程

#### Scenario: 保存有效权限组配置

- Test/check:
  - [X] `../../../src/test/RbacMatrix.test.jsx::renders permission chips by entity group and saves selected cells`
  - [X] `../../../src/test/AnvilAuthPages.test.jsx::test_anvil_rbac_save_refreshes_matrix_from_returned_group`
- Assertion scope: 既有测试断言点击 `container:create` 并保存后，`updateRbacGroupEntities` 收到 `group_id: 10` 与含 `machine:view`、`container:create` 的 `entity_codes`，提交的是 code 字符串而不是把矩阵 id 当实体 id。新增测试让保存响应返回更新后的 group，断言出现「权限已保存」，且 `container:create` chip 的 `aria-label` 从 `开启 container:create` 变为 `关闭 container:create`、文案为「启用」，即矩阵按响应 `entity_codes` 回填。
- Coverage note: 既有测试只断言提交 payload；本变更新增测试覆盖保存后矩阵按响应刷新。

#### Scenario: 方法通配覆盖管理方法

- Test/check:
  - [X] `../../../src/test/RbacMatrix.test.jsx::bypass_auth_entity 覆盖 manage 与跨域 manage，但不派生 bypass_resource`
  - [X] `../../../src/test/RbacMatrix.test.jsx::仅方法通配的组可直接授予/撤销 manage 以扩大资源范围`
  - [X] `../../../src/test/rbacMatrixUtils.test.js::方法实体通配覆盖普通权限点，也覆盖各域 manage`
  - [X] `../../../src/test/rbacMatrixUtils.test.js::方法通配优先于同域 manage 派生（与后端判定顺序一致）`
  - [X] `../../../src/test/RbacMatrix.test.jsx::bypass_resource 仅资源通配语义，不覆盖任何方法权限点`
  - [X] `../../../src/test/rbacMatrixUtils.test.js::资源通配只具资源语义，不覆盖任何方法权限点`
- Assertion scope: 点击 `bypass_auth_entity` 后，`machine/container/image/settings:manage` 均带 `rbac-permission-chip-covered-auth`、`grantable`、可点击且文案为「实体通配」；纯派生的非 manage 点仍禁用；`bypass_resource` 不带覆盖样式且可点；工具层断言方法通配覆盖各域 manage 且优先于同域 manage 派生。`bypass_resource` 本身只表达资源通配，不覆盖任何方法权限点，也不被 `bypass_auth_entity` 派生为方法/manage。

#### Scenario: 直接配置管理权限不被方法覆盖阻断

- Test/check:
  - [X] `../../../src/test/RbacMatrix.test.jsx::仅方法通配的组可直接授予/撤销 manage 以扩大资源范围`
  - [X] `../../../src/test/RbacMatrix.test.jsx::locked 与 bypass_resource 的不可派生语义不受可授予 manage 影响`
- Assertion scope: 仅方法通配组直接授予 `container:manage` 后芯片转「启用」，保存集合含该 manage；撤销后回到「实体通配」覆盖但仍可再次授予，下一次保存集合不含 `container:manage` 且含新直持的 `image:manage`；operator 的 locked bypass 与 locked_manager 的 locked manage 始终禁用并显示「锁定」，`bypass_resource` 不被派生。

#### Scenario: 直接赋予与域内派生

- Test/check:
  - [X] `../../../src/test/RbacMatrix.test.jsx::同域 manage 派生域内普通权限点，manage 自身与跨域不受影响`
  - [X] `../../../src/test/RbacMatrix.test.jsx::bypass_auth_entity 覆盖 manage 与跨域 manage，但不派生 bypass_resource`
  - [X] `../../../src/test/rbacMatrixUtils.test.js::直接赋予显示为直接，不被通配改写成派生覆盖`
  - [X] `../../../src/test/rbacMatrixUtils.test.js::manage 派生不覆盖 manage 自身，也不跨域`
  - [X] `../../../src/test/rbacMatrixUtils.test.js::manage 码不存在时不产生派生（对齐 _manage_entity_for 的有效码校验）`
- Assertion scope: `container:manage` 直接组自身显示「启用」，同域 `container:create`/`container:operation` 带 `covered-manage` 且禁用，跨域 `machine:view` 不被覆盖；直接赋予即使同时存在 `bypass_auth_entity` 仍保持直接启用；工具层断言同域派生不覆盖 manage 自身、不跨域，且当同域 manage 码不存在时不产生派生。

#### Scenario: 组名不符合后端格式

- Test/check:
  - [X] `../../../src/test/RbacMatrix.test.jsx::创建角色前按 Ctrl 组名规则校验并给出反馈`
  - [X] `../../../src/test/rbacMatrixUtils.test.js::长度边界 2 / 64 合法，1 / 65 非法`
  - [X] `../../../src/test/rbacMatrixUtils.test.js::validateGroupName（对齐 Ctrl _GROUP_NAME_RE） > 拒绝非法组名 "1abc"，并给出具体原因`
  - [X] `../../../src/test/rbacMatrixUtils.test.js::validateGroupName（对齐 Ctrl _GROUP_NAME_RE） > 拒绝非法组名 "a b"，并给出具体原因`
- Assertion scope: 页面输入 `1bad` 显示「角色名称必须以英文字母开头」且保存不调用 `createRbacGroup`；输入 `a` 显示「角色名称至少 2 个字符」；输入合法 `teacher2` 后提交，`createRbacGroup` 收到该名称并显示「角色已创建」。工具层断言 2/64 字符合法、1/65 字符非法，并覆盖首字母、字符范围等具体拒绝原因。
- Coverage note: 合法名称的唯一性仍由后端校验，Web 测试只断言前端格式规则与提交；不伪造唯一性覆盖。

### Requirement: RbacMatrix 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] `npm run build`
- Assertion scope: 既有 `vite build` 检查（`npm run build`）：退出码 0、构建完成并生成 `dist`。随后人工核对 `dist/assets` 中存在 `RbacMatrix` 与 `ModelViewer` 命名 chunk，且入口 chunk 不包含其页面源码；chunk 边界是人工观测，不由退出码 0 自动证明。
- Coverage note: 该 check 只对构建命令与可观测产物负责。`React.lazy`/`Suspense` 组织、`vite.config.js` 的 `manualChunks` 配置与静态导入现状属人工核对事实，不由本 check 断言；chunk 体积与警告清单不作为规格指标。
