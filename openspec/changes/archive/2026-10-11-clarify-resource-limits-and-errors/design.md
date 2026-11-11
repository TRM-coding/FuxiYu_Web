# Design

## Context

见 proposal.md。当前三业务仓库为独立规范入口，Global QUESTIONS 仅作问题证据。

## Goals / Non-Goals

目标：完成限额及交互修复，保持其它业务功能、权限和恢复流程。

## Decisions

创建页使用机器配置 max_* 作为申请上限，硬件容量单独标注，不称之为实时剩余资源。共享内存随申请 MEMORY 联动；0、null 与未知上限不能混为无限。机器详情编辑 max_shared_gb 与本次 max_memory_gb 联动；输入值为非负整数。showErrorModal 保留具体 message，同时给出原路由/错误原因的本地化提示，不让泛化 invalid_config 掩盖申请值和上限；未知原因或网络失败有可理解 fallback。

## Risks / Trade-offs

- 上限为 0 或未知时禁用控件并显式提示 → 用户暂时不可调整，但避免把未知当成无限放行。
- 降内存或切机器时收敛已有共享值 → 会改动用户先前输入，故以可见提示说明本次下调。
- 错误呈现保留后端具体 message 并叠加本地化原因 → 文案更长，但不让泛化文案覆盖申请值与上限。
