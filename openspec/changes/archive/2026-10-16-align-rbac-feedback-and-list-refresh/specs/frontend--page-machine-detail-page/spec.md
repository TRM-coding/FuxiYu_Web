## MODIFIED Requirements

### Requirement: MachineDetailPage 主流程

页面 SHALL 保持以下交互及数据职责：加载硬件、限制和实际配置端口，轮询 machine_status/is_maintenance/runtime_snapshot；编辑基本信息允许显式 port=null。自定义端口 SHALL 按详情响应回填并展示，空配置 SHALL 说明使用平台默认，MUST NOT 硬编码默认数值覆盖实际端口；未修改端口保存时 SHALL 保留既有配置。维护开关独立于 online/offline；machine:manage 用户可在二次确认后修复连接。共享内存滑条上限 SHALL 等于本次编辑的 max_memory_gb，降低内存限额及保存前 SHALL 收敛 max_shared_gb。

#### Scenario: 保存未修改端口的基本信息
- **WHEN** 用户读取自定义端口的详情，只修改描述后保存
- **THEN** 页面回填并保留原端口，不因字段漏失发送 null 清空配置

#### Scenario: 内存限额 32 GB、共享限额 16 GB
- **WHEN** 机器硬件内存 32 GB，用户设置内存限额 32 GB、共享限额 16 GB
- **THEN** 共享滑条上限为 32 GB，16 GB 可选并提交，不受固定 8 GB 限制

#### Scenario: 确认后修复连接
- **WHEN** 具备 machine:manage 的用户点击修复连接并确认
- **THEN** 调用 renew_machine_trust，成功后按响应展示身份牌结果并刷新详情，失败经 showErrorModal 反馈；不重建机器档案，无权限不显示入口
