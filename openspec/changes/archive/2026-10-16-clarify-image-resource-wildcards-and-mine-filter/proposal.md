# Proposal

## Why

镜像编辑页仅以展开后的 image:manage 判断管理范围，无法可靠区分方法通配和资源通配。“仅看我的”又依赖查看授权绑定，可能混入他人镜像或遗漏创建者自己的镜像。

## What Changes

- 使用后端确认的真实镜像资源通配能力显示跨所有者的管理范围，不从方法通配推导资源通配。
- “仅看我的”按当前创建者归属过滤，拥有通配也不返回他人的镜像。
- 保留编辑、删除、详情的方法权限门禁；普通授权查看不构成编辑所有权，所有权不能转让。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `frontend--page-create-image`: 真实资源通配、方法能力和创建者筛选。
- `frontend--authentication`: 身份权限快照分别表达方法权限与资源通配能力。
- `frontend--page-deleted-containers`: 对齐恢复来源差异中的启动命令分段显示。

## Impact

影响权限快照消费、镜像编辑页、恢复差异展示与组件回归。创建容器页仍使用默认可见列表并只选择 READY 模板，已有生产 HTTPS 入口和构建方式保持其职责。
