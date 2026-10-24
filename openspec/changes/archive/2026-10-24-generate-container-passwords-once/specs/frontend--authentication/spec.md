## ADDED Requirements

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
