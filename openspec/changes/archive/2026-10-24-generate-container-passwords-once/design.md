## Context

Web 目前的容器创建、新增协作者、账号密码重置与 ROOT 所有者交接没有统一的安全密码交付：

- `CreateContainer` 等待 Ctrl/Node 同步完成，依赖 Node 固定初始密码。
- `ContainerDetailPage` 的账号卡只有角色/移除操作，没有密码重置入口；新增协作者也不返回密码。
- `EditUserModal` 的 ROOT 交接已有完整实现（`src/components/EditUserModal.jsx:126-145`）：遍历旧 ROOT 先 `updateRole(OLD, ADMIN)`，再 `updateRole(target, ROOT)`。这是**既有角色结果**，本次必须保留：旧 ROOT 变 ADMIN、目标变 ROOT，不新增其他角色语义。
- 已核实 Ctrl/Node 现状：`Ctrl container_tasks.update_role` 只改指定目标绑定；`Node container_service.update_role` 对 ADMIN 创建/更新独立账号，对 ROOT 设置共享 `root` 密码、归档/删除目标原独立账号。因此旧 ROOT→ADMIN 需要创建其独立系统账号并给随机密码；新 ROOT 使用始终存在的 `root` 账号并重置为另一随机密码。
- `ManageUser` 平台用户密码重置业务不在本变更范围。`showErrorModal` 自身不写 console/oplog、不做持久化；风险在调用方 catch 与 API 包装器把错误对象/响应体打印或拼进 message。新的容器凭据使用独立组件，不改 ManageUser 调用链。
- `PermissionProvider` 目前只暴露 `imageResourceUnrestricted`；`entities` 是生效集，可能含由 `bypass_auth_entity` 展开的 `container:manage`，不能据此判断真实资源通配。

本变更只修改 Web 仓库；Ctrl/Node 由父代理协调，Web 不自行改跨仓合同。

## Goals / Non-Goals

**Goals:**

- 统一消费 `accepted: true` 与 `credentials: [{ login_name, password }]`；创建、新增协作者、账号重置、ROOT 交接都在受理后立即展示密码，不等待 Node。
- 新增协作者（ADMIN 与 COLLABORATOR）由 Ctrl 生成随机密码、Node 设置、Web 展示一项凭据。
- ROOT 交接保留既有角色结果：正常单个旧 ROOT 返回 2 项（旧 ROOT 独立账号 + `root`）；历史多 ROOT 返回所有涉及账号 + `root`，可 >2；Web 只发一次 `update_role`，按数组渲染不裁剪。
- 重置只在详情页账号卡提供；仅在线且主机可用时执行；目标登录名取绑定 username，ROOT 固定 `root`。
- 用受控、可清理的弹窗展示密码；关闭/卸载/路由离开后不可回看。
- 权限只认 ROOT 绑定或 Ctrl 派生的 `container_resource_unrestricted`；方法通配单独不放行。
- 错误、异常、console、oplog 与错误弹窗都不携带密码或原始凭据响应体。

**Non-Goals:**

- 不实现、不提交、不运行生产测试；不生成 review/test-plan/tasks。
- 不修改 Ctrl/Node 代码、数据库、模型、迁移、Docker 环境/config/labels、WSS、操作日志或审计存储。
- 不修改既有角色结果/目录归档/账号归档规则：旧 ROOT→ADMIN、目标→ROOT 是既有业务；不通过改角色凑密码，不新增唯一所有者假设。
- 不扩大 ManageUser 平台密码重置业务；不重构协作者新增/移除以外的业务逻辑。
- 不在 Home 增加额外重置按钮；账号重置只放在详情页账号卡。
- 不新增持久回滚、队列、租约、迁移、邮件重试、密码查回或密码托管；不做全局角色唯一约束，不新增 repo 原子双绑定函数。

## Decisions

### D1. 统一凭据解析放在 API 边界

新增 `src/utils/credentialResponse.js`（名称可调整）：

- `parseCredentialResponse(body, { transferRoot, requireAccepted })`：校验 `accepted === true`、`credentials` 为非空数组、每项非空字符串 `login_name`/`password`，允许缺 `user_id`。创建、新增协作者、重置、恢复要求恰好 1 项；ROOT 在 `transfer_root:false` 时恰好 1 项，在 `true` 时至少 2 项（正常 2，历史多 N+1 可 >2）。按数组原样返回，不截断、不去重、不合成。测试映射：`transferRoot:false` 断言 1 项合法、0/2 项非法；`true` 断言 2 项与 N+1 项合法、少于 2 项非法。
- `sanitizeCredentialError(err)`：保留 `status`、`route`、`error_reason` 与安全 `message`（如资源超限 8GB/4GB 数值）/本地化原因；剥离 `credentials`、`root_password`、`password` 与 unsafe 原始 `body`，不 `JSON.stringify(body)`。

`container_api.jsx` 的 `createContainer`、`addCollaborator`、`resetContainerPassword`、`updateRole`、`resurrectDeletedContainer` 使用安全响应读取；成功才调用解析器，失败只抛白名单字段。`resurrectDeletedContainer` 的 `requires_choice:true` 绕过凭据解析，不展示密码；其失败路径不把 `err.body`/原始响应 JSON 交给 `showErrorModal` 或 console。任何路径都不 `console.*` 密码。

替代方案：页面各自解析。拒绝，重复安全逻辑容易漏。

### D2. 新建受控 `CredentialModal`

新增 `src/components/CredentialModal.jsx`：

- 复用 `ConfirmModal` 外观，但 MUST NOT 调用 `showErrorModal`；`title`、`message="密码仅显示一次，关闭后无法再次查看。"`、`confirmText="关闭"`、`showCancel={false}`。
- 每项严格渲染“重置后{login_name}的密码：”+密码；逐项复制，失败普通提示，不打印密码。响应 N 项渲染 N 行，不补行、不合并。
- 关闭时父组件立即清空 credentials 与引用；组件卸载不保留模块级缓存。该保证是 DOM/状态层不可回看，不承诺 JavaScript 字符串物理零化。

替代方案：继续 `showErrorModal`。拒绝，成功密码进入错误通道且无法表达关闭/卸载清理。

### D3. 页面本地持有凭据，不乐观改角色/账号

- `CreateContainer`：成功后写本地 credentials；原 `message.success` 与 `navigate('/index', {state:{startHeartbeat...}})` 延后到弹窗关闭。旧式无凭据响应保持原流程。
- `ContainerDetailPage`：新增 `credentialModal` 本地状态，覆盖新增协作者、账号重置、ROOT 交接；新增协作者不立即插入本地账号，ROOT 交接不立即改角色；关闭/卸载清空。
- `Home`：`EditUserModal` 通过 `onCredentialAccepted(credentials)` 上报；Home 页面级渲染弹窗，人员弹窗关闭后仍可展示。新增协作者不乐观插入，ROOT 交接不乐观改角色。
- `DeletedContainers`：实际恢复成功写入本地 credentials 并最小渲染 `CredentialModal`；`requires_choice` 不展示；不改恢复其他业务/布局。
- `ManageUser` 不改。

替代方案：全局 context/store 存凭据。拒绝，扩大密码生命周期。

### D4. 创建入口只保留一个提交实现

现有入口均落 `/index/create`：Navbar、MainLayout、ManageMachine 的 `machineId`、旧 `/index/apply` 重定向、直接访问。只改 `CreateContainer.handleSubmit` 与结果展示；不新增第二创建表单或绕过弹窗路径。Web 不为创建额外写 oplog。

### D5. ROOT 两入口保持差异：`transfer_root` 纯请求布尔

两个原有 Web 入口行为不同，不能合并：

- `Home/EditUserModal`：原有“旧 ROOT→ADMIN、再目标→ROOT”交接。请求体加 `transfer_root:true`；Ctrl 仅在该值为 true 时按既有顺序后台执行：
  1. 旧 ROOT → ADMIN；Node `update_role` 只处理该目标，创建其独立系统账号，使用 Ctrl 生成的随机密码 `config.password`。
  2. 目标 → ROOT；Node `update_role` 只处理该目标，设置共享 `root` 新密码 `config.root_password`，并按既有规则归档/删除目标原独立账号。
- `ContainerDetailPage`：原有只升目标、不降旧 ROOT。请求体使用 `transfer_root:false`（默认），Ctrl 单目标执行并只重置 `root`，返回 1 项凭据；不得偷偷降旧 ROOT。
- 正常单个旧 ROOT `transfer_root:true` 返回 2 项；历史多旧 ROOT 沿用既有遍历结果，返回所有涉及账号 + `root` 的 N+1 项，可 >2。不得丢涉及人或为凑固定项数改角色。
- Node 没有 `transfer_root` 字段，始终只处理单目标 primitive。Ctrl 内部删用户 ROOT 移交保持原单目标同步 primitive，不使用 Web 交接编排，避免副作用。
- Web 不乐观改写角色，不宣称完成；失败/部分完成/超时未知以 oplog 与权威详情为准，不得伪装 Node 确认成功；不新增持久回滚工作流。

替代方案：Web 继续两次 updateRole 再分别拿密码。拒绝，会有先降自己导致 403/乱序，且详情页会改变原有单目标行为。

### D6. 权限使用 Ctrl 派生非持久资源位

`GET /api/users/me/permissions` 增加 `container_resource_unrestricted: boolean = has_resource_wildcard(uid, "container")`，每次派生、不落库。Web：

- `user_api.getUserPermissions` 规范化 `containerResourceUnrestricted`，缺字段 false。
- `PermissionProvider`/`permissionContextValue` 刷新/换账号同步替换，清空身份归零。
- `ContainerDetailPage` 同时校验 `hasPermission('container:operation')`、ROOT 绑定或 `containerResourceUnrestricted === true`，以及既有机器/在线状态，决定重置按钮是否可用。
- 增加纯函数 `canResetContainerCredentials({accounts,userId,userName,containerResourceUnrestricted,hasOperationPermission})`，方法权限与资源权限必须同时满足，复用 `getContainerRoleFromAccounts`；资源通配不从 `entities` 推导，`bypass_auth_entity` 单独不放行。

替代方案：用 `entities.includes('container:manage')`。拒绝，生效集含方法通配派生。

### D7. 重置只在详情页，固定端点与守卫

- `POST /api/containers/reset_container_password`，body `{container_id,user_id}`；oplog 操作码 `reset_container_password`。
- Ctrl 在受理前执行既有主机/容器状态 guard；仅容器 `online` 且主机可用时执行；目标登录名取绑定 username，ROOT 固定 `root`。
- 404/409/500 使用既有 `error_reason` 映射，Ctrl 不拼原始错误体。
- Web 账号卡按钮要求同时具备 `container:operation` 方法权限与 ROOT 本人或 `containerResourceUnrestricted` 资源权限；缺任一权限时隐藏或禁用，非 online/主机不可用/目标无 user_id 时禁用；发请求前重校验。Home 不加重置按钮。
- 受理后立即展示一项凭据；不等待/轮询；后续只查 oplog，不含密码。

### D8. 新增协作者固定合同

- 现有 `add_collaborator` 请求不变（`user_id/container_id/role`）；Ctrl 生成随机密码，Ctrl→Node `config.password`，Node 设置账号。
- 响应 `accepted: true` + 1 项 credentials（新协作者绑定 username）。
- Home/EditUserModal 与详情页新增入口均展示；不乐观插入账号、不提示“已加入”；只沿用既有 `ADD_COLLABORATOR` 审计，不新增密码日志或重复添加日志。
- 普通非 ROOT 的 ADMIN/COLLABORATOR 互换仍走既有 update_role，无密码。

### D9. 失败与日志

- 凭据接口失败不把 unsafe 原始 body 挂错误对象；`Error.message` 不用 `JSON.stringify(body)`；保留安全 `message`（如资源超限数值）与 `error_reason`。reset 的 404/409/500 按既有 `error_reason` 映射，Ctrl 不拼原始错误体。
- 页面 catch 只记录/展示 `status`、`route`、`error_reason`、安全 message 或通用中文，不 `console.error(err)` 整个对象。
- 所有凭据响应由 Ctrl 带 `Cache-Control: no-store`；Web 请求带 `cache: 'no-store'`，不缓存响应。
- 日志复用：创建只沿用 CREATE；新增协作者仅 `ADD_COLLABORATOR`；重置 `reset_container_password`；ROOT 各步 `UPDATE_COLLABORATOR_ROLE`；不得新增密码日志或重复日志。
- 守卫：受理前执行既有资源/方法/机器三层 guard 与主机/容器状态守卫；reset 的 UI/后端口径一致。后台执行前最小既有 guard 复核，不新增 DTO/持久状态/租约。`accepted` 仅表示进程内任务已启动，不是持久队列承诺；oplog 未知/超时不得伪装 Node 确认成功。
- 普通非凭据错误仍走既有 `showErrorModal`；不改 ManageUser。
- `createContainer`、`addCollaborator`、`resetContainerPassword`、`updateRole` 的 fetch 增加 `cache: 'no-store'`；关闭弹窗/卸载不 abort 已发请求；超时/断连不自动重试、不宣称成功/失败。

### D10. 内部调用兼容：恢复与删用户触发 ROOT 交接

Ctrl 现有内部路径也必须适配新必填密码，不能被 Web 合同改动打断：

- `restore_accounts` 恢复协作者时，请求模型可增加瞬时 `password` 字段，由 Ctrl 生成随机值并在 Node wire 中传入；**禁止持久化到 snapshot**。
- 删除用户触发 ROOT 交接等内部路径同样生成随机密码并按既有步骤传入 Node，不得回退弱密码。
- 不修改恢复/删用户的业务规则与页面，不新增持久队列/回滚。
- 该兼容属于 Ctrl/Node 实现计划；Web 本轮只记录合同与风险，不改恢复/删用户页面。

### D11. Node 实现约束（供 Ctrl/Node 对齐）

- 目标升 ROOT 时摘除不存在的 `sudo`/`wheel` 组，按既有“预期最终组状态”处理，允许最小幂等修复；不改变角色最终结果、归档规则，普通角色行为不扩张。
- 错误输出与 Pydantic `SecretStr` 校验 422 input 必须脱敏，但仅对密码相关路由生效；其他路由保留既有默认错误形状，不借机重构全局错误。password 字段错误 input 不得回显；helper 不允许把 secret 作为 argv。
- Node 不返回 secret；仅 Ctrl 向 Web 返回 `credentials`。
- 测试可用 FakeDocker 验证 socket I/O；不得宣称真实生产验证。

### D12. 恢复入口最小接入

- `DeletedContainers` 实际恢复成功返回一项 root 凭据时，最小复用 `CredentialModal` 展示；不改变恢复其他业务、布局、列表/分页或既有流程。
- `requires_choice: true` 不展示密码，继续既有二选一。
- Ctrl 恢复时生成的协作者瞬时密码由 Ctrl 传入 Node wire，Node 只消费；不持久化到 snapshot，不新增恢复队列/日志。
- 失败/凭据非法不展示密码，按既有错误处理。

## Risks / Trade-offs

- [Ctrl/Web 合同字段不一致] → 已对齐：create `root_password`、add/reset `config.password`、update_role(ROOT) `config.root_password`、旧 ROOT→ADMIN `config.password`；`transfer_root` 仅 Web→Ctrl。
- [两入口被错误合并] → `transfer_root` 默认 false：详情单目标 1 项；Home true 才后台编排 2 项/N+1 项。
- [实体通配误放行] → 只认 ROOT 绑定或 Ctrl 派生位；缺字段 false。
- [失败响应夹带密码] → 解析器去 secret/unsafe body；保留安全 message；测试断言 console/弹窗无密码。
- [用户关闭弹窗丢密码] → 仅显示一次提示；关闭/卸载清状态与引用；不承诺 JS 字符串物理零化。
- [ROOT 交接部分完成] → 不伪报角色成功、不乐观改角色；以 oplog/详情为准；超时未知不伪装 Node 成功。
- [恢复成功丢密码] → 成功恢复最小复用弹窗；requires_choice 不展示；不改其他恢复业务。
- [新增协作者先显示密码但后台失败] → 不乐观插入账号；只提示已受理并给密码，结果看 oplog。
- [Home 人员弹窗关闭丢状态] → 凭据状态提升到 Home 页面级。
- [Node 422 脱敏过度] → 仅密码路由脱敏并保留其他路由默认形状；password input 不回显。
- [旧 Ctrl 无新字段/端点] → 创建旧响应兼容；其余新流程需 Ctrl 先行。

## Migration Plan

1. 父代理对齐跨仓合同：credentials/accepted、create top-level root_password、add/reset config.password、update_role(ROOT) config.root_password + 旧 ROOT→ADMIN config.password、`transfer_root` 仅 Web→Ctrl、reset 端点/oplog、权限位、no-store。
2. Web 实现顺序：安全解析 → CredentialModal → 权限位 → 创建 → 新增协作者 → 重置 → Home/详情 ROOT（transfer_root 区分）→ DeletedContainers 恢复展示。
3. 部署顺序：Ctrl/Node 先行，Web 后上；Web 回滚不影响持久数据；无数据库/模型/迁移。
4. 验证在后续 apply 阶段执行，不在本轮；不运行生产测试。使用父代理提供的 WSL/Windows 隔离环境时，先做 targeted，再跑完整套件。
5. 回滚：仅回滚 Web UI；不涉及持久队列/密码存储/角色迁移。

## Open Questions

无。跨仓字段、日志复用、多 ROOT 数组、内部调用兼容与 Node 约束均已对齐；若实现时发现更小的等价方案，按 D5 在 review 报告，不改变既有角色结果与凭据数组语义。
