# frontend--authentication Specification

## Purpose
定义 Web 共享的身份权限快照、真实镜像资源能力、认证失效与业务授权拒绝反馈，保证有效会话不会因业务权限不足被清空，同时保留公开页面静默身份探测与原有认证凭据策略。

## Requirements

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

## Source references

- [src/api/](../../../src/api/)、[src/utils/authHelpers.jsx](../../../src/utils/authHelpers.jsx)、[src/contexts/PermissionContext.jsx](../../../src/contexts/PermissionContext.jsx)。
- [src/test/apiAuthSignal.test.js](../../../src/test/apiAuthSignal.test.js)、[src/test/RbacMatrix.test.jsx](../../../src/test/RbacMatrix.test.jsx)、[src/test/settingsForbiddenHandling.test.jsx](../../../src/test/settingsForbiddenHandling.test.jsx)。
