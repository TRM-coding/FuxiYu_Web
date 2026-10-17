## MODIFIED Requirements

### Requirement: CreateContainer 创建失败的错误呈现

创建接口返回具体错误 message 与 error_reason 时，页面 SHALL 通过 showErrorModal 保留后端具体 message（含申请值、上限等数值），并 SHALL 同时给出本地化错误原因与 HTTP 状态提示；已知原因（如机器离线）MUST NOT 被呈现为内存超限。未知原因与网络失败 SHALL 有可理解的中文兜底；401 SHALL 沿用认证失效处理，403 SHALL 显示一般拒绝并保留会话。

#### Scenario: invalid_config 带具体数值
- **WHEN** 接口返回 message=Requested shared_memory 8GB cannot exceed requested memory 4GB、error_reason=invalid_config、HTTP 400
- **THEN** 弹窗保留该 message 原文与其中的 8GB/4GB，并附带容器配置无效或超出宿主机上限及 400 的中文提示

#### Scenario: 机器离线
- **WHEN** 接口返回 error_reason=machine_offline
- **THEN** 弹窗显示所在机器不在线的中文提示，不出现超限字样

#### Scenario: 创建权限不足
- **WHEN** 有效会话的创建请求返回 403
- **THEN** 显示拒绝原因并保留身份，不把该业务拒绝作为全局认证失效
