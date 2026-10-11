# MachineDetailPage

## Purpose

独立宿主机详情、限制编辑、维护及信任修复。本文件是 Web chester-next 6c5f04d2a7f1 在 2026-10-11 的代码逆向基线，按页面或已有页面组件组织路由、权限、API 与状态行为；同日按变更 clarify-resource-limits-and-errors 同步了限额编辑的输入口径、共享内存约束与错误呈现。其余已知交互和接口差异统一见 [Global QUESTIONS](../../../../FuxiYu_Global/QUESTIONS.md)，该记录不表示对应问题已经修复。

## Requirements

### Requirement: MachineDetailPage 页面入口与身份

页面 SHALL 通过 `/index/machines/:machineId` 装配。现有身份与权限约束为：路径 machineId 为 DB id；读取 machine:view+资源权，修改 machine:manage。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `MachineDetailPage` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: MachineDetailPage 主流程

页面 SHALL 保持以下已实现的交互及数据职责：加载硬件和限制并轮询 machine_status/is_maintenance/runtime_snapshot；编辑基本信息可显式 port=null；维护开关独立于 online/offline；machine:manage 用户可发起修复连接（重钉信任锚），执行前二次确认。硬件分配限制编辑 SHALL 让 max_shared_gb 的滑条上限等于本次编辑的 max_memory_gb（MUST NOT 固定为 8 GB），降低 max_memory_gb 时 SHALL 同步收敛已有的 max_shared_gb，保存前 SHALL 再次收敛。

#### Scenario: 保存未修改端口的基本信息

- **WHEN** 保存未修改端口的基本信息
- **THEN** 当前详情 response_model 漏 port，页面可能发送 null 清空既有端口；该缺陷已 API 复现并记录

#### Scenario: 内存限额 32 GB、共享限额 16 GB

- **WHEN** 机器硬件内存 32 GB，用户把内存限额设为 32 GB 并把共享内存限额设为 16 GB
- **THEN** 共享内存滑条上限为 32 GB，16 GB 可被选中并随保存提交，不被 8 GB 拦截

#### Scenario: 确认后修复连接

- **WHEN** 具备 machine:manage 的用户在机器详情页点击修复连接并确认
- **THEN** 调用 renew_machine_trust 端点；成功后提示连接信任已重建并按响应补充是否重发身份牌、身份牌是否与对端不一致，随后静默刷新详情；失败经 showErrorModal 反馈；无该权限时不展示入口。该入口只修复既有机器行的信任锚，不重建机器档案

### Requirement: MachineDetailPage 限额编辑的输入口径与超限阻断

硬件分配限制编辑 SHALL 同时显示硬件容量与机器配置限额，并把每个滑条配一个与滑条同 min/max/step 的数字输入，两者 SHALL 经同一收敛函数取值。降低 max_memory_gb 后，若已有 max_shared_gb 超过新限额，页面 SHALL 立即收敛到新限额并以可见提示标明该次下调；保存 payload 中 max_shared_gb MUST NOT 大于 max_memory_gb，各项 MUST NOT 超过硬件容量。

#### Scenario: 降低内存限额

- **WHEN** 当前 max_memory_gb 为 32 GB、max_shared_gb 为 16 GB，用户把内存限额降到 4 GB
- **THEN** 共享内存限额立即变为 4 GB，数字输入与滑条读数一致，并显示已将共享内存上限下调到 4 GB 的提示

#### Scenario: 数字输入与滑条同口径

- **WHEN** 用户在共享内存数字输入里填入超过上限的值
- **THEN** 输入与滑条都收敛到同一上限，不产生超过上限的编辑值

#### Scenario: 限额只在机器详情页编辑

- **WHEN** 机器经添加宿主机弹窗登记（该弹窗只传机器名/IP/描述/可选 node 端口，硬件由 node 首连返回、上限由 ctrl 默认策略生成）
- **THEN** 不新增登记期限额字段、接口或默认策略；共享内存 ≤ 内存限额、各项 ≤ 硬件容量一律在本页限额编辑里保证

### Requirement: MachineDetailPage 保存失败的错误呈现

硬件分配限制保存失败时，页面 SHALL 经 showErrorModal 显示机器更新路由的中文错误提示，并 SHALL 保留后端具体 message 中的数值（如限额字段与大小）。服务层的组合校验失败（`update_failed`，422）与请求模型层的非法值（`invalid_payload`，400）SHALL 分别按机器更新路由的中文文案呈现，MUST NOT 被呈现为容器创建超限（`invalid_config`）。

#### Scenario: 服务层拒绝共享超内存

- **WHEN** update_machine 返回 HTTP 422、error_reason=update_failed、message=max_shared_gb 16GB cannot exceed max_memory_gb 8GB
- **THEN** 弹窗保留该 message 与 16GB/8GB，并附带更新机器失败及 422 的中文提示，不出现容器创建超限文案

#### Scenario: 请求模型层非法值

- **WHEN** update_machine 返回 HTTP 400、error_reason=invalid_payload
- **THEN** 弹窗显示机器配置限额参数无效及 400 的中文提示

### Requirement: MachineDetailPage 构建归属

页面 SHALL 通过路由表按需加载参加 Vite 构建：`src/routes/index.jsx` 以 `React.lazy` 动态导入页面与共同布局（`MainLayout`、`AdminLayout`），route element 用 `Suspense` 给页面级加载反馈；`LoginLayout`、路由骨架与 React 运行时随入口静态加载，`LoginLayout` 内 `ModelViewer` 亦按需加载，three 经 `vite.config.js` `manualChunks` 分入 `vendor-three-core`/`vendor-three-webgl`/`vendor-three-addons`，均不入入口 chunk。分包原则与边界见 [frontend--build](../frontend--build/spec.md)，实际 chunk 依赖以产物核对为准。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`requestManager` 与 `validateCmdArg` 统一静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属验收观测，记入本轮验收报告，不作为本规格固化的历史指标

## Source references

- [src/pages/MachineDetailPage.jsx](../../../src/pages/MachineDetailPage.jsx)；[src/pages/DetailPages.css](../../../src/pages/DetailPages.css)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../api/machine_api`。
- 页面直接依赖：`../contexts/PermissionContext`。
- 页面直接依赖：`../utils/showErrorModal`。
- 页面直接依赖：`../utils/detailFormat`。
- 页面直接依赖：`../utils/statusDisplay`。
- [src/test/](../../../src/test/)、[vite.config.js](../../../vite.config.js)：基线（2026-10-11）为 21 个测试文件、123 个测试通过；clarify-resource-limits-and-errors 新增限额编辑回归 [MachineSharedLimit.test.jsx](../../../src/test/MachineSharedLimit.test.jsx)，执行结果由主代理运行后记录。