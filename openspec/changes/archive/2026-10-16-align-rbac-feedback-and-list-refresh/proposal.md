# Proposal

## Why

机器端口展示、RBAC 覆盖矩阵和容器操作反馈存在与后端真相不一致的情况；静默刷新遗漏权限及展示字段，已删除容器页又会在空页丢失翻页入口并使用旧回调。按用户确认的 Q15–Q20 决策对齐接口、状态与列表上下文。

## What Changes

- 展示机器实际 Node 端口，注册失败仍可在验证码有效期内修正后重试。
- RBAC 矩阵显示真实的方法通配覆盖，资源通配独立表达，组名校验与后端一致。
- Home 只在接口确认成功或受理后更新相应状态并提示，失败保留本地列表，异步操作进入正确中间态并由轮询收敛。
- 刷新指纹覆盖参与权限、操作和展示的字段，抑制无意义变化。
- 已删除容器空列表仍保留分页入口，按权威总数回到有效页，异步回调跟随当前分页并忽略过期响应。
- 审计其他第一页重置；未在本次修复范围内的实质问题归入 QUESTIONS。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `frontend--page-machine-detail-page`: 实际端口与默认配置空值展示。
- `frontend--page-register`: 注册失败后的验证码重试行为。
- `frontend--page-rbac-matrix`: 方法覆盖显示与组名规则。
- `frontend--page-home`: 操作确认、中间态和容器刷新指纹。
- `frontend--page-deleted-containers`: 空页分页、当前回调和请求顺序。
- `frontend--page-manage-machine`: 机器及容器静默刷新字段覆盖。
- `frontend--page-manage-user`: 用户及容器静默刷新字段覆盖。

## Impact

影响相应页面、共享刷新指纹及针对性回归。方法权限、资源权限、认证失效策略与后端业务状态仍分别生效；不修改生产入口或扩大用户操作授权。
