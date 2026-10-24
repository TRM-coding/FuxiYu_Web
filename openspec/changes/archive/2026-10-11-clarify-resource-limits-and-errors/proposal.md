# Proposal

## Why

创建共享内存未联动本次申请内存，机器限额编辑滑条固定8GB；界面对申请值、机器配置限额和硬件容量表达混杂，错误映射覆盖后端具体数值。

## What Changes

- 明确当前申请值、本次可申请上限及机器配置限额，保证滑条和数字输入语义一致。
- 创建共享内存上限取 min(max_shared_gb, 本次 MEMORY)，变化后同步校验已有值；机器共享限额编辑受目标内存限额约束，移除8GB。
- 保留具体资源越界 message，并维护路由错误映射及已知 HTTP 错误类型。
- 核对其他机器相关入口的缺口，修正范围内输入与 SPEC，不重写现有恢复能力。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `frontend--page-create-container`：明确本次资源限额及输入/错误契约。
- `frontend--page-machine-detail-page`：明确本次资源限额及输入/错误契约。

## Impact

仅修改本仓库对应实现、业务规格和回归测试；不提交后续修复、不修改其它仓库或凭据。
