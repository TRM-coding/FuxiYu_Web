## ADDED Requirements

### Requirement: 创建受理后立即展示一次性 root 密码

创建提交 SHALL 继续使用现有 `create_container` 接口；当响应 `accepted === true` 且恰好一项 `credentials` 时，页面 MUST 立即展示受控密码弹窗，不等待 Node 创建完成，也不轮询密码。弹窗行文案 MUST 严格为“重置后{login_name}的密码：”。创建响应既有 `success`/`message` SHALL 保留，受理后页面 SHALL 继续显示既有受理反馈。Web MUST NOT 为创建额外写操作日志或重复上报创建事件；只沿用既有 CREATE 记录，不新增密码日志。导航到 `/index` 与 `startHeartbeat` SHALL 在密码弹窗关闭后执行，MUST NOT 因立即跳转丢失凭据。所有既有创建入口——顶部导航、主导航、机器页“创建容器”、旧 `/index/apply` 重定向及直接访问 `/index/create`——SHALL 复用同一提交处理器，MUST NOT 新增绕过凭据弹窗的创建路径。

#### Scenario: 从主导航创建并立即拿到密码

- **GIVEN** 用户从既有“创建容器”入口进入 `/index/create`，提交合法配置
- **WHEN** Ctrl 返回 `accepted: true`、`success: 1`、`message` 与一项 `login_name=root` 的凭据
- **THEN** 页面立即打开受控密码弹窗，文案为“重置后root的密码：”加密码；不等待 Node；关闭弹窗后才导航到 `/index` 并携带原 `startHeartbeat`

#### Scenario: 机器页带入机器与旧 Apply 重定向复用同一机制

- **GIVEN** 用户从机器页带 `machineId` 进入，或从旧 `/index/apply` 被重定向到 `/index/create`
- **WHEN** 提交并收到受理响应
- **THEN** 使用与主导航入口相同的提交处理器与同一密码弹窗，不出现第二个创建实现或不带密码提示的旁路

#### Scenario: 旧响应没有凭据

- **GIVEN** 创建接口只返回旧式 `success: 1` 与 `message`，没有 `accepted` 与 `credentials`
- **WHEN** 页面处理响应
- **THEN** 保留既有成功提示并执行原导航，不打开密码弹窗，也不伪造或猜测密码

#### Scenario: 已受理但凭据缺失或非法

- **GIVEN** 响应 `accepted: true`，但 `credentials` 缺失、不是数组或项数不为 1
- **WHEN** 页面处理响应
- **THEN** 不展示任何密码，显示通用“响应异常”提示；不自动重试创建，不导航到可能掩盖问题的成功页

#### Scenario: 创建失败夹带密码

- **GIVEN** 创建返回 HTTP 错误或 `success: 0`，响应体含有 `credentials` 或 `root_password`
- **WHEN** 页面显示失败
- **THEN** 只显示脱敏后的状态与原因，不打开密码弹窗，不把原始响应体写入错误弹窗或 console，也不导航

#### Scenario: 关闭或离开页面后密码不可回看

- **GIVEN** 创建密码弹窗已经展示
- **WHEN** 用户关闭弹窗、按 Esc、切换路由或离开页面
- **THEN** 密码从组件状态清除，刷新或重新进入不显示该密码，也没有查回请求

## MODIFIED Requirements

### Requirement: CreateContainer 创建失败的错误呈现

创建接口返回具体错误 message 与 error_reason 时，页面 SHALL 通过 showErrorModal 保留后端具体 message（含申请值、上限等数值），并 SHALL 同时给出本地化错误原因与 HTTP 状态提示；已知原因（如机器离线）MUST NOT 被呈现为内存超限。未知原因与网络失败 SHALL 有可理解的中文兜底；401 SHALL 沿用认证失效处理，403 SHALL 显示一般拒绝并保留会话。当失败响应或异常对象包含 `credentials`、`root_password`、`password` 等敏感字段时，页面与 API 包装器 MUST 在构造错误文案和记录前剥离，MUST NOT 把原始响应体拼进错误 message 或 console。

#### Scenario: invalid_config 带具体数值
- **WHEN** 接口返回 message=Requested shared_memory 8GB cannot exceed requested memory 4GB、error_reason=invalid_config、HTTP 400
- **THEN** 弹窗保留该 message 原文与其中的 8GB/4GB，并附带容器配置无效或超出宿主机上限及 400 的中文提示

#### Scenario: 机器离线
- **WHEN** 接口返回 error_reason=machine_offline
- **THEN** 弹窗显示所在机器不在线的中文提示，不出现超限字样

#### Scenario: 创建权限不足
- **WHEN** 有效会话的创建请求返回 403
- **THEN** 显示拒绝原因并保留身份，不把该业务拒绝作为全局认证失效

#### Scenario: 失败响应夹带凭据字段
- **GIVEN** 创建失败响应或异常对象除 status、error_reason 外还含 `credentials` 或 `root_password`
- **WHEN** 页面构造并显示错误
- **THEN** 错误弹窗、错误 message 与 console 均不出现任何密码值或原始响应体；仍保留可安全展示的状态与非敏感原因
