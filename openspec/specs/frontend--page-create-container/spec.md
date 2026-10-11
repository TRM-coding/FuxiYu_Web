# CreateContainer

## Purpose

选择镜像和宿主机，提交容器资源及 SSH 公钥。本文件是 Web chester-next 6c5f04d2a7f1 在 2026-10-11 的代码逆向基线，按页面或已有页面组件组织路由、权限、API 与状态行为；同日按变更 clarify-resource-limits-and-errors 同步了配额上限分层、共享内存联动与错误呈现。其余已知交互和接口差异统一见 [Global QUESTIONS](../../../../FuxiYu_Global/QUESTIONS.md)，该记录不表示对应问题已经修复。

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

创建接口返回具体错误 message 与 error_reason 时，页面 SHALL 通过 showErrorModal 保留后端具体 message（含申请值、上限等数值），并 SHALL 同时给出本地化错误原因与 HTTP 状态提示；已知原因（如机器离线）MUST NOT 被呈现为内存超限。未知原因与网络失败 SHALL 有可理解的中文兜底；401/403 的认证与授权处置流程不变。

#### Scenario: invalid_config 带具体数值

- **WHEN** 接口返回 message=Requested shared_memory 8GB cannot exceed requested memory 4GB、error_reason=invalid_config、HTTP 400
- **THEN** 弹窗保留该 message 原文与其中的 8GB/4GB，并附带容器配置无效或超出宿主机上限及 400 的中文提示

#### Scenario: 机器离线

- **WHEN** 接口返回 error_reason=machine_offline
- **THEN** 弹窗显示所在机器不在线的中文提示，不出现超限字样

### Requirement: CreateContainer 构建归属

页面 SHALL 通过路由表按需加载参加 Vite 构建：`src/routes/index.jsx` 以 `React.lazy` 动态导入页面与共同布局（`MainLayout`、`AdminLayout`），route element 用 `Suspense` 给页面级加载反馈；`LoginLayout`、路由骨架与 React 运行时随入口静态加载，`LoginLayout` 内 `ModelViewer` 亦按需加载，three 经 `vite.config.js` `manualChunks` 分入 `vendor-three-core`/`vendor-three-webgl`/`vendor-three-addons`，均不入入口 chunk。分包原则与边界见 [frontend--build](../frontend--build/spec.md)，实际 chunk 依赖以产物核对为准。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`requestManager` 与 `validateCmdArg` 统一静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属验收观测，记入本轮验收报告，不作为本规格固化的历史指标

## Source references

- [src/pages/CreateContainer.jsx](../../../src/pages/CreateContainer.jsx)；[src/pages/CreateContainer.css](../../../src/pages/CreateContainer.css)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../utils/showErrorModal`。
- 页面直接依赖：`../contexts/PermissionContext`。
- 页面直接依赖：`../api/machine_api`。
- 页面直接依赖：`../api/user_api`。
- 页面直接依赖：`../api/container_api`。
- 页面直接依赖：`../api/image_api`。
- [src/test/](../../../src/test/)、[vite.config.js](../../../vite.config.js)：基线（2026-10-11）为 21 个测试文件、123 个测试通过；clarify-resource-limits-and-errors 新增配额与错误呈现回归 [ResourceLimits.test.jsx](../../../src/test/ResourceLimits.test.jsx)、[ErrorPresentation.test.jsx](../../../src/test/ErrorPresentation.test.jsx)、[MachineSharedLimit.test.jsx](../../../src/test/MachineSharedLimit.test.jsx)，执行结果由主代理运行后记录。