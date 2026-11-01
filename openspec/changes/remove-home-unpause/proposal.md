## Why

首页卡片的解冻入口不再需要，收束首页操作入口，并避免卡片与弹窗行为不一致。

## What Changes

- 首页卡片和首页详情弹窗不提供解冻操作。
- 保留独立容器详情页及其他管理页面已有的权限判断和解冻操作。

## Capabilities

### Modified Capabilities

- `frontend--page-home`: 首页解冻入口调整。

## Impact

仅影响 Web 首页及其测试，不修改接口和后端权限规则。
