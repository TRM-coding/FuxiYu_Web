# Spec Delta

## MODIFIED Requirements

### Requirement: CreateContainer 主流程

页面 SHALL 保持以下已实现的交互及数据职责：镜像使用 image_id；详情读取 max_cpu_core_number/max_memory_gb/max_gpu_number/max_shared_gb 作为机器配置限额；payload 传 CPU_NUMBER/MEMORY/GPU_LIST/shared_memory；环境模板列表只保留 status 为 ready 的模板，已选中项不再是 ready 时清空选择。共享内存的本次可申请上限 SHALL 取 min(机器 max_shared_gb, 本次申请内存)，降低内存或切换机器后 SHALL 重算并收敛已有值；提交前 SHALL 校验各项申请值不超过本次可申请上限，MUST NOT 发出超限 payload。

#### Scenario: 内存 4 GB、共享内存 8 GB

- **WHEN** 机器 max_shared_gb 允许 16 GB，用户把内存设为 4 GB 后共享内存仍为 8 GB
- **THEN** 共享内存被收敛到本次可申请上限 4 GB，提交时 shared_memory MUST NOT 大于 MEMORY

#### Scenario: 内存 32 GB、共享内存 16 GB

- **WHEN** 机器 max_shared_gb 为 16 GB，用户把内存设为 32 GB
- **THEN** 共享内存本次可申请上限为 16 GB，不再是 8 GB，且可提交 shared_memory=16

#### Scenario: 模板不在可用集合内

- **WHEN** 模板 brief 列表包含 draft 或 disabled 模板
- **THEN** 页面不展示也不允许选中它们；已选中的模板变为非 ready 时选择被清空

## ADDED Requirements

### Requirement: CreateContainer 配额上限分层与共享内存联动

页面 SHALL 在每个配额区同时给出当前申请值与本次可申请上限，并 SHALL 区分硬件容量、机器配置限额（管理员设定的 max_*）与本次可申请上限三层；上限 SHALL NOT 被描述为实时空闲量。共享内存的本次可申请上限 SHALL 等于 min(机器 max_shared_gb, 本次申请内存)。数字输入与滑条 SHALL 使用同一 min/max/step 并经同一收敛函数。上限取值为数值（含 0）时视为已知；为 null 或未获取到时 SHALL 显示为未知，MUST NOT 伪装成无限或替换为硬件容量。

#### Scenario: 上限未知

- **WHEN** 机器详情未返回 max_shared_gb
- **THEN** 共享内存区显示上限未知且控件不可调整，不显示为无限

#### Scenario: 上限为 0

- **WHEN** 机器 max_shared_gb 为 0
- **THEN** 共享内存区显示本次可申请上限 0 GB 并提示本机该项不可分配，不显示为未知

#### Scenario: 降低内存后重算

- **WHEN** 用户把内存从 32 GB 降到 4 GB，而共享内存当前为 16 GB
- **THEN** 共享内存被收敛到 4 GB，页面重新显示本次可申请上限 4 GB

#### Scenario: 切换机器后重算

- **WHEN** 用户从 max_memory_gb=32/max_shared_gb=16 的机器切到 max_memory_gb=4/max_shared_gb=0 的机器
- **THEN** 内存收敛到 4 GB、共享内存收敛到 0 GB，申请值都不超过新机器的配置限额

### Requirement: CreateContainer 提交前超限阻断

点击创建时，页面 SHALL 在调用创建接口前核对各项本次申请值与本次可申请上限；任一已知上限被超出或 shared_memory 大于 MEMORY 时，MUST NOT 调用创建接口，并 SHALL 在配额区展示含申请值与上限的说明。

#### Scenario: 期望内存超过已知上限

- **WHEN** 机器 max_memory_gb 为 0 而页面内存申请值为 1 GB
- **THEN** 页面不调用创建接口，并显示“内存 当前申请 1 GB，本次可申请上限 0 GB”

#### Scenario: 共享内存超过本次申请内存

- **WHEN** 已形成 shared_memory 大于 MEMORY 的组合
- **THEN** 页面不调用创建接口，并显示共享内存不得超过本次申请内存的说明

### Requirement: CreateContainer 创建失败的错误呈现

创建接口返回具体错误 message 与 error_reason 时，页面 SHALL 通过 showErrorModal 保留后端具体 message（含申请值、上限等数值），并 SHALL 同时给出本地化的错误原因与 HTTP 状态提示；已知原因（如机器离线）MUST NOT 被呈现为内存超限。未知原因与网络失败 SHALL 有可理解的中文兜底。

#### Scenario: invalid_config 带具体数值

- **WHEN** 接口返回 message=Requested shared_memory 8GB cannot exceed requested memory 4GB、error_reason=invalid_config、HTTP 400
- **THEN** 弹窗保留该 message 原文与其中的 8GB/4GB，并附带容器配置无效或超出宿主机上限及 400 的中文提示

#### Scenario: 机器离线

- **WHEN** 接口返回 error_reason=machine_offline
- **THEN** 弹窗显示所在机器不在线的中文提示，不出现超限字样