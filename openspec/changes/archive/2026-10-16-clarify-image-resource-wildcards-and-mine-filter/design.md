# Design

## Context

权限快照的 entities 是方法权限展开结果，含 image:manage 不一定代表直接持有镜像资源通配。镜像编辑页用该值同时控制方法能力和资源范围，mine_only 又与授权名单混合。

## Goals / Non-Goals

**Goals:** 后端真实资源范围与 UI 一致；仅看我的只展示创建者资源；各操作仍有方法权限和业务状态检查。

**Non-Goals:** 不修改所有权，不扩大普通查看授权，不调整生产入口、构建分包或其他页面权限。

## Decisions

1. /users/me/permissions 返回 image_resource_unrestricted，由后端真实资源通配判定生成；前端规范化为 imageResourceUnrestricted 并保存在 PermissionContext，不从展开的 image:manage 猜测直接资源通配。
2. 对已选镜像，是否可编辑由 image:edit 方法能力与“自己创建或有真实资源通配”共同决定；删除仍需对应方法能力。
3. 仅看我的提交 mine_only=true，由后端在通配之前施加创建者条件，取消筛选才返回默认资源范围。
4. 权限刷新、换账号和清身份同步替换资源能力，原 401/403 规则不变。

## Risks / Trade-offs

- 旧响应缺少真实资源能力字段 → 采用保守默认值，不能退回“看到 image:manage 就看全部”的猜测。
- CUSTOM 名单与归属不同 → 以交互回归证明授权查看者不被当作所有者，创建者也不因名单移除自己而从筛选消失。
