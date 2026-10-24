## Why

容器创建、新增协作者、账号密码重置、ROOT 交接与容器恢复目前没有统一的安全密码交付：创建等待 Node 同步完成，新增协作者与重置沿用固定弱口令，ROOT 交接缺少密码交付，恢复成功也可能丢失 root 密码。需要让 Ctrl 在既有守卫通过后立即受理并返回随机密码，Web 只展示一次；密码不得进入日志、持久化或可回查通道。

## What Changes

- Web 消费 `accepted: true` 与 `credentials: [{ login_name, password }]`；凭据项只需 `login_name` 与 `password`，不要求 `user_id`。所有凭据响应由 Ctrl 带 `Cache-Control: no-store`，Web 请求使用 `cache: 'no-store'`。
- **ROOT 请求增加纯布尔 `transfer_root`，默认 false。** Home/`EditUserModal` 保留已有“旧 ROOT→ADMIN、再目标→ROOT”交接，显式传 `transfer_root:true`，Ctrl 仅在该值为 true 时按既有 Home 顺序后台编排；正常单个旧 ROOT 返回 2 项，历史多旧 ROOT 返回 N+1 项（所有涉及账号 + `root`）。`ContainerDetailPage` 原本只升目标、不降旧 ROOT，保持 `transfer_root:false`，只重置 `root` 并返回 1 项，不偷偷降旧 ROOT。Node 没有 `transfer_root` 字段，仍只接收单目标 primitive；Ctrl 内部删用户 ROOT 移交保持原单目标同步 primitive，不使用 Web 交接编排。
- 创建：Ctrl 受理后展示一项 `root` 凭据；Ctrl→Node 顶层 `root_password`。保留既有 `success`/`message` 与既有 CREATE oplog，**不额外记录创建日志**。
- 新增协作者：ADMIN 与 COLLABORATOR 都由 Ctrl 生成随机密码，Ctrl→Node `config.password`，Web 展示一项绑定 username 的凭据。只沿用既有 `ADD_COLLABORATOR` 审计，**不新增密码 oplog**；不乐观插入账号，结果以刷新/oplog 为准。
- 账号重置：仅在详情页账号卡提供，`POST /api/containers/reset_container_password` body `{container_id,user_id}`；Ctrl→Node `config.password`；Web 展示一项凭据；oplog 用 `reset_container_password`。目标登录名取绑定 username，ROOT 固定 `root`。reset 资源/方法/机器三层守卫在 UI 与后端保持一致。
- 普通非 ROOT 的 ADMIN/COLLABORATOR 互换保持现有实现与成功响应，不生成、不改变、不展示密码；只有 Home 交接中的旧 ROOT→ADMIN 独立账号创建需要密码。
- 兼容既有内部调用：`restore_accounts` 恢复、删除用户触发 ROOT 转移等 Ctrl 内部路径也必须生成随机密码并在 Node wire 中传入，不得回退弱密码；不修改恢复/删用户业务规则与页面。恢复协作者请求模型可加瞬时 `password`，由 Ctrl 生成、Node 只消费，禁止持久化到 snapshot。
- 容器恢复：`DeletedContainers` 实际恢复成功返回 root credentials 时，Web 最小复用 `CredentialModal` 展示；`requires_choice` 不展示；不能让用户恢复成功却丢失密码。不改恢复其他业务、布局或页面结构。
- 安全范围：Node 422 脱敏仅限密码相关路由并保留其他路由默认形状，不重构全局错误；password 字段错误 input 不得回显。Web 凭据 API 去掉 secret 字段与 unsafe 原始 body，但保留安全 `message`（如资源超限具体数值），不得为脱敏丢失原有具体错误信息。DOM 只保证清除组件状态与引用、关闭后不可回看，不承诺 JS 字符串物理零化。
- 守卫：受理前执行既有资源/方法/机器三层 guard；后台执行前最小既有 guard 复核；`accepted` 仅表示进程内任务已启动，不是持久队列承诺；不新增 DTO/持久状态/租约。oplog 未知结果（如超时）不得伪装成 Node 确认成功。
- 新增独立受控密码弹窗，复用既有确认弹窗外观但不走 `showErrorModal`；逐项复制、关闭/卸载/路由离开清除。密码 MUST NOT 进入 localStorage、sessionStorage、IndexedDB、URL、WSS、action 缓存、数据库、oplog、审计或 console；不提供查回接口。
- 不修改 ManageUser 平台密码重置业务；不新增 Home 重置按钮。
- API 包装器安全解析：失败时不拼不安全原始响应体；reset 404/409/500 使用既有 `error_reason` 映射，Ctrl 不拼原始错误体；错误对象、console、错误弹窗不得含 secret，但保留安全 message。
- 权限快照新增派生非持久 `container_resource_unrestricted = has_resource_wildcard(uid,"container")`；Web 不从 `entities` 中由 `bypass_auth_entity` 展开的 `container:manage` 反推。
- 不做：全局角色唯一约束、repo 新原子双绑定函数、持久队列/租约/迁移。字段按已固定合同，不再待确认。

## Capabilities

### New Capabilities

- `frontend--container-credentials`: 创建、新增协作者、账号重置、ROOT 交接与恢复共用的一次性密码响应、受控弹窗、数组渲染、日志复用及不落盘/不泄露约束。

### Modified Capabilities

- `frontend--authentication`: 新增容器资源管理通配能力，由后端权限快照派生给出，独立于方法权限展开。
- `frontend--page-create-container`: 创建受理后立即展示一次性 root 密码，覆盖全部既有创建入口。
- `frontend--page-container-detail-page`: 账号卡重置、新增协作者凭据、`transfer_root:false` 单目标 ROOT 提升、权限与在线守卫。
- `frontend--page-home`: 人员管理弹窗的新增协作者与 `transfer_root:true` ROOT 交接复用凭据弹窗，保持既有角色结果与多 ROOT 语义。
- `frontend--page-deleted-containers`: 恢复成功后的 root 凭据最小展示，`requires_choice` 不展示，不改其他恢复业务。

## Impact

- Web 代码：`src/api/container_api.jsx`、`src/configs/backend_config.js`、`src/contexts/PermissionProvider.jsx`、`src/contexts/permissionContextValue.js`、`src/utils/containerActions.js`、新增凭据工具与受控弹窗组件，以及 `CreateContainer.jsx`、`ContainerDetailPage.jsx`、`Home.jsx`、`EditUserModal.jsx`、`DeletedContainers.jsx` 及样式。**不改 `ManageUser.jsx`。**
- 固定跨仓合同：`credentials`/`accepted`；create 顶层 `root_password`；add/reset `config.password`；update_role(ROOT) `config.root_password`；旧 ROOT→ADMIN `config.password`；`transfer_root` 仅 Web→Ctrl，Node 无此字段。Node 不返回 secret。所有凭据响应 `Cache-Control: no-store`。
- 审计：新增协作者只沿用 `ADD_COLLABORATOR`；创建只沿用 CREATE；重置 `reset_container_password`；ROOT 各步沿用 `UPDATE_COLLABORATOR_ROLE`。不得增加密码日志或重复日志。
- 兼容：Ctrl 内部恢复/删用户触发的 ROOT 转移同样生成随机密码并传入 Node；恢复协作者瞬时密码不落 snapshot；不改恢复/删用户业务规则与页面。
- 明确不在本阶段：不实现、不提交、不运行生产测试；不写 review/test-plan/tasks；不新增持久回滚、队列、租约、迁移或全局角色唯一约束。
