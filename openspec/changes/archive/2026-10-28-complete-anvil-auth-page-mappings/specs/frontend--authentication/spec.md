# Spec Delta

## MODIFIED Requirements

### Requirement: 仅认证失效触发全局身份清理

API 包装器和页面共用错误处理 SHALL 仅对需要全局处理的 401 取消认证相关请求、派发身份失效并清理会话。业务 403 SHALL 保留当前身份及其他请求，显示一般权限拒绝。错误对象 SHALL 保留状态、后端 message、error_reason 和具体数值。

#### Scenario: 有效身份遇到业务拒绝
- **WHEN** 任一业务 API 返回 403
- **THEN** 显示拒绝原因，不派发 auth:expired，不全局取消请求，不登出或跳登录页

#### Scenario: 认证失效
- **WHEN** 普通受保护业务请求返回 401
- **THEN** 进入既有全局身份失效流程；日志 API 同样遵守该语义

#### Scenario: 公开页静默身份探测
- **WHEN** 匿名访问注册页且初始化权限查询按既有约定静默返回 401
- **THEN** 不通过全局清理强制跳离公开页面

### Requirement: 镜像资源能力独立于方法权限展开

Web SHALL 从后端权限快照的 image_resource_unrestricted 布尔字段获取真实镜像资源通配能力，规范化为 imageResourceUnrestricted，并在刷新或换账号时同步替换，身份清空时归零；缺少字段 SHALL 默认 false。MUST NOT 仅凭 entities 中由 bypass_auth_entity 展开的 image:manage 推断资源通配，原有 401/403 反馈与公开页静默身份探测语义 SHALL 保留。

#### Scenario: 相同方法列表但资源能力不同
- **WHEN** 两个用户均有 image:manage 方法权限，其中一个仅由方法通配展开而没有真实资源通配
- **THEN** Web 根据后端真实资源能力区分其资源管理范围，不把两者等同

#### Scenario: 换账号或清空身份
- **WHEN** 权限快照刷新为另一用户或因认证失效清空
- **THEN** 原账号的镜像资源通配能力不遗留到新账号或匿名身份

### Requirement: 容器资源能力独立于方法权限展开

Web SHALL 从后端权限快照的 `container_resource_unrestricted` 布尔字段获取真实容器资源管理通配能力，规范化为 `containerResourceUnrestricted`，并在权限刷新或换账号时同步替换，身份清空时归零；缺少该字段 SHALL 默认 `false`。该字段 SHALL 由 Ctrl 以 `has_resource_wildcard(user, "container")` 每次派生且不落库，即用户直持 `bypass_resource` 或直持 `container:manage`；MUST NOT 仅凭 `entities` 中由 `bypass_auth_entity` 展开的 `container:manage` 推断，也 MUST NOT 让 `bypass_auth_entity` 单独成为容器资源管理权。原有 401/403 反馈、`imageResourceUnrestricted` 与公开页静默身份探测语义 SHALL 保留。

#### Scenario: 相同方法列表但容器资源能力不同

- **GIVEN** 两个用户的生效 `entities` 都包含 `container:manage`，其中一个直持该权限，另一个仅由 `bypass_auth_entity` 展开
- **WHEN** Web 读取权限快照
- **THEN** 前者 `containerResourceUnrestricted` 为 true，后者为 false；详情页账号重置入口按该值区分

#### Scenario: 直持资源通配

- **GIVEN** 后端返回 `container_resource_unrestricted: true`，或用户直持 `bypass_resource` 且后端据此给出 true
- **WHEN** 页面判断容器资源管理能力
- **THEN** `containerResourceUnrestricted` 为 true，可用于账号重置入口；不要求用户是容器 ROOT 绑定

#### Scenario: 字段缺失或旧后端

- **GIVEN** 权限快照没有 `container_resource_unrestricted` 字段
- **WHEN** Web 规范化权限
- **THEN** `containerResourceUnrestricted` 为 false；MUST NOT 从 `entities` 反推为 true，也不得因此展示账号重置入口

#### Scenario: 换账号或清空身份

- **GIVEN** 权限快照刷新为另一用户，或因认证失效清空
- **WHEN** Web 更新权限上下文
- **THEN** 原账号的容器资源通配能力不遗留到新账号或匿名身份；匿名状态下为 false

#### Scenario: 方法通配不得单独放行

- **GIVEN** 用户仅持 `bypass_auth_entity`，`container_resource_unrestricted` 为 false
- **WHEN** 页面渲染账号重置入口
- **THEN** 即使生效权限集中出现 `container:manage`，重置按钮也不可见或不可用

### Requirement: 权限查询必须在 finally 注销控制器

`getUserPermissions` SHALL 在成功、异常和 401 三条路径都通过 `finally` 调用 `unregisterController(controller)` 并清理超时计时器；MUST NOT 只在成功路径注销，也 MUST NOT 因重复注销抛错。挂载、登录刷新或组件卸载触发的权限查询 SHALL 使用同一释放语义，已完成控制器不得留在全局集合中。

#### Scenario: 成功返回后释放控制器

- **GIVEN** 权限查询成功返回并解析出 `entities`、身份和资源位
- **WHEN** 请求流程结束
- **THEN** 该控制器已从请求管理器注销，连续多次成功查询不会增加已完成控制器数量

#### Scenario: 401 或异常返回后释放控制器

- **GIVEN** 权限查询返回 401 或网络异常
- **WHEN** 调用方捕获错误
- **THEN** 该控制器仍已在 `finally` 中注销，超时计时器被清理，错误按既有 401/异常语义继续向上传递

#### Scenario: 连续查询不积累控制器

- **GIVEN** 页面连续触发多次权限查询
- **WHEN** 所有查询分别成功、失败或超时结束
- **THEN** 全局控制器集合不保留任何已完成项，后续 `abortAll` 只处理真正在途的请求
