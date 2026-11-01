# CreateContainer

## Purpose

选择镜像和宿主机，提交容器资源及 SSH 公钥。本规格记录当前页面入口、权限、API 与交互边界。未完成问题见 [Global QUESTIONS](../../../../FuxiYu_Global/QUESTIONS.md)。

## Requirements

### Requirement: CreateContainer 页面入口与身份

页面 SHALL 通过 `/index/create` 装配。现有身份与权限约束为：container:create；container:manage 用户显示代建 ROOT 选择；身份来自 PermissionContext。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `CreateContainer` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: CreateContainer 主流程

页面 SHALL 保持以下已实现的交互及数据职责：镜像使用 image_id；详情读取 max_cpu_core_number/max_memory_gb/max_gpu_number/max_shared_gb 作为机器配置限额；payload 传 CPU_NUMBER/MEMORY/GPU_LIST/shared_memory；环境模板列表只保留 status 为 ready 的模板，已选中项不再是 ready 时清空选择。共享内存的本次可申请上限 SHALL 取 min(机器 max_shared_gb, 本次申请内存)，降低内存或切换机器后 SHALL 重算并收敛已有值；提交前 SHALL 校验各项申请值不超过本次可申请上限，MUST NOT 发出超限 payload。

#### Scenario: 内存 4 GB、共享内存 8 GB

- **WHEN** 机器 max_shared_gb 允许 16 GB，用户把内存设为 4 GB 而共享内存仍为 8 GB
- **THEN** 共享内存被收敛到本次可申请上限 4 GB；提交时 shared_memory MUST NOT 大于 MEMORY

#### Scenario: 内存 32 GB、共享内存 16 GB

- **WHEN** 机器 max_shared_gb 为 16 GB，用户把内存设为 32 GB
- **THEN** 共享内存本次可申请上限为 16 GB（不再被 8 GB 限制），且可提交 shared_memory=16

#### Scenario: 模板不在可用集合内

- **WHEN** 模板 brief 列表包含 draft 或 disabled 模板
- **THEN** 页面不展示也不允许选中它们；已选中的模板变为非 ready 时选择被清空

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

### Requirement: CreateContainer 配额上限分层与共享内存联动

页面 SHALL 在每个配额区同时给出当前申请值与本次可申请上限，并 SHALL 区分硬件容量、机器配置限额（max_*）与本次可申请上限三层；上限 SHALL NOT 被描述为实时空闲量。数字输入与滑条 SHALL 使用同一 min/max/step 并经同一收敛函数。上限为数值（含 0）时视为已知，0 表示该项不可分配；为 null 或未获取到时 SHALL 显示为未知且控件不可调整，MUST NOT 伪装成无限或替换为硬件容量。

#### Scenario: 上限未知

- **WHEN** 机器详情未返回 max_shared_gb
- **THEN** 共享内存区显示本次可申请上限未知并禁用滑条与数字输入

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

点击创建时，页面 SHALL 在调用创建接口前核对各项本次申请值与本次可申请上限；任一已知上限被超出，或 shared_memory 大于 MEMORY 时，MUST NOT 调用创建接口，并 SHALL 在配额区展示含申请值与上限的说明。

#### Scenario: 期望内存超过已知上限

- **WHEN** 机器 max_memory_gb 为 0 而页面内存申请值为 1 GB
- **THEN** 页面不调用创建接口，并显示“内存 当前申请 1 GB，本次可申请上限 0 GB”

#### Scenario: 共享内存超过本次申请内存

- **WHEN** 已形成 shared_memory 大于 MEMORY 的组合
- **THEN** 页面不调用创建接口，并显示共享内存不得超过本次申请内存的说明

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

### Requirement: CreateContainer 构建归属

页面 SHALL 通过路由表按需加载参加 Vite 构建：`src/routes/index.jsx` 以 `React.lazy` 动态导入页面与共同布局（`MainLayout`、`AdminLayout`），route element 用 `Suspense` 给页面级加载反馈；`LoginLayout`、路由骨架与 React 运行时随入口静态加载，`LoginLayout` 内 `ModelViewer` 亦按需加载，three 经 `vite.config.js` `manualChunks` 分入 `vendor-three-core`/`vendor-three-webgl`/`vendor-three-addons`，均不入入口 chunk。分包原则与边界见 [frontend--build](../frontend--build/spec.md)，实际 chunk 依赖以产物核对为准。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`requestManager` 与 `validateCmdArg` 统一静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属验收观测，记入本轮验收报告，不作为本规格固化的历史指标

## Source references

- [src/pages/CreateContainer.jsx](../../../src/pages/CreateContainer.jsx)；[src/pages/CreateContainer.css](../../../src/pages/CreateContainer.css)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../utils/showErrorModal`。
- 页面直接依赖：`../components/CredentialModal`。
- 页面直接依赖：`../contexts/PermissionContext`。
- 页面直接依赖：`../api/machine_api`。
- 页面直接依赖：`../api/user_api`。
- 页面直接依赖：`../api/container_api`。
- 页面直接依赖：`../api/image_api`。
- 回归验证：[src/test/](../../../src/test/)；实际范围和结果以当前组件及生产入口测试为准。
