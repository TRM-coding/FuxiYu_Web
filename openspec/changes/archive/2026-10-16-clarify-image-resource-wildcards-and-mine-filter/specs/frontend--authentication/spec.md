## ADDED Requirements

### Requirement: 镜像资源能力独立于方法权限展开

Web SHALL 从后端权限快照的 image_resource_unrestricted 布尔字段获取真实镜像资源通配能力，规范化为 imageResourceUnrestricted，并在刷新或换账号时同步替换，身份清空时归零；缺少字段 SHALL 默认 false。MUST NOT 仅凭 entities 中由 bypass_auth_entity 展开的 image:manage 推断资源通配，原有 401/403 反馈与公开页静默身份探测语义 SHALL 保留。

#### Scenario: 相同方法列表但资源能力不同
- **WHEN** 两个用户均有 image:manage 方法权限，其中一个仅由方法通配展开而没有真实资源通配
- **THEN** Web 根据后端真实资源能力区分其资源管理范围，不把两者等同

#### Scenario: 换账号或清空身份
- **WHEN** 权限快照刷新为另一用户或因认证失效清空
- **THEN** 原账号的镜像资源通配能力不遗留到新账号或匿名身份
