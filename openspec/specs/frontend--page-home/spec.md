# Home

## Purpose

定义当前用户容器卡片、操作成功与受理反馈、过渡态跟踪和静默刷新。身份与资源权限决定操作能力，实际终态由心跳确认，失败保留原列表，刷新覆盖角色和资源限额等业务字段。

## Requirements

### Requirement: Home 页面入口与身份

页面 SHALL 通过 `/index` 装配。现有身份与权限约束为：PermissionContext 提供身份；角色和 containerActions 决定操作入口。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `Home` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: Home 主流程

页面 SHALL 读取容器 brief 并定时静默刷新，以 listRefresh 指纹判断是否更新。操作只有在后端明确确认成功或受理后才改变相应本地状态并提示；HTTP 成功但业务失败 MUST NOT 视为成功。启停重启仍在处理中时 SHALL 使用既有中间态、pending transition 和心跳收敛，不提前展示终态成功。退出关联 SHALL 只在确认成功后移除本地行；异常保留原行及具体错误。删除保留独立确认组件。

#### Scenario: 已受理停止或重启
- **WHEN** 后端确认已受理但尚未完成停止或重启
- **THEN** 显示相应中间态及准确受理反馈，由轮询推进至权威终态，不提前声称已停止或重启完成

#### Scenario: 操作失败
- **WHEN** 停止、重启或退出关联请求失败，包括业务 success=0
- **THEN** 显示具体错误，不额外提示成功，不删除本地行或伪造终态

### Requirement: Home 新增协作者凭据

Home 通过既有人员管理弹窗新增 ADMIN 或 COLLABORATOR 协作者时，SHALL 使用既有 `add_collaborator` 请求，由 Ctrl 生成随机密码、Node 设置；响应 `accepted: true` 且恰好一项凭据时，Home SHALL 在人员弹窗关闭过程中仍展示同一个受控密码弹窗。Web MUST NOT 发送密码或登录名，MUST NOT 在受理后乐观插入本地账号或宣称已加入；后续成功/失败以既有 `ADD_COLLABORATOR` oplog 与刷新结果为准，不新增密码日志或重复添加日志。

#### Scenario: 新增 ADMIN 或 COLLABORATOR 后展示密码

- **GIVEN** Home 人员管理弹窗选择新用户并指定 ADMIN 或 COLLABORATOR
- **WHEN** Ctrl 返回 `accepted: true` 与恰好一项凭据
- **THEN** 人员弹窗关闭后受控密码弹窗仍展示该项，文案为“重置后{login_name}的密码：”；本地账号列表不立即插入，不提示“已加入”

#### Scenario: 新增失败或凭据异常

- **GIVEN** 新增请求失败，或 `accepted: true` 但凭据缺失/字段非法
- **WHEN** Home 处理结果
- **THEN** 不展示任何密码，不插入本地账号，不提示成功；只显示脱敏错误，后续以 oplog 为准

### Requirement: Home ROOT 交接统一提交一次

Home 通过既有人员管理弹窗修改容器角色时，ROOT 交接 SHALL 与详情页使用同一语义，只提交一次 `POST /api/containers/update_role`，参数精确为 `{ container_id, user_id, updated_role: 'ROOT' }`，MUST NOT 发送 `transfer_root`。Web MUST NOT 自行先降旧 ROOT、自行创建旧 owner 独立账号、自行发起第二次 `update_role`，也 MUST NOT 提交任何密码、登录名或默认口令。Ctrl SHALL 在后台按既有顺序执行“旧 ROOT→ADMIN、目标→唯一 ROOT”，并生成永久 `root` 新密码与原 owner 独立用户名新密码；Node 每次只处理指定目标；角色结果沿用既有语义，以刷新后的权威列表/详情为准。

#### Scenario: 只发一次无分支交接请求

- **GIVEN** Home 详情弹窗打开某容器的“管理人员”，当前存在 ROOT 与非 ROOT 账号
- **WHEN** 用户把非 ROOT 账号改选为 ROOT
- **THEN** 只发出一次目标 `update_role`，请求体不含 `transfer_root`；Web 不自行降级旧 ROOT，不发送密码或登录名，也不发第二个 HTTP

### Requirement: Home ROOT 交接双凭据且不伪装完成

ROOT 交接受理响应 `accepted === true` 且 `credentials` 至少两项、每项 login_name/password 非空且互不相同时，Home SHALL 在人员弹窗关闭过程中仍按数组逐项展示同一个受控密码弹窗：正常单个旧 ROOT 为原 owner 独立用户名 + 永久 `root` 两项；历史多 ROOT 为所有涉及账号 + `root`，可超过两项。Web MUST NOT 截断到两项、丢弃涉及账号、为凑两项改写角色或新增重复日志；ROOT 各步沿用既有 `UPDATE_COLLABORATOR_ROLE`。Home MUST NOT 乐观改写账号角色、宣称交接完成或轮询密码；旧 ROOT→ADMIN、目标→ROOT 的实际完成情况以权威列表/详情刷新与 oplog 为准，失败或部分完成 MUST NOT 被伪报为成功。关闭弹窗 MUST 立即清空凭据状态，不持久化、不记录日志。

#### Scenario: 人员弹窗关闭后展示全部凭据

- **GIVEN** Home 人员管理弹窗已提交 ROOT 交接并收到 `accepted: true` 与至少两项的凭据
- **WHEN** 人员弹窗关闭
- **THEN** 受控密码弹窗逐项展示所有 login_name（常规单个旧 ROOT 为原 owner 与 `root` 两项，历史多 ROOT 可 >2），文案为“重置后{login_name}的密码：”；本地角色不立即改写

#### Scenario: 部分完成不伪报成功

- **GIVEN** 后台只完成旧 ROOT→ADMIN，目标→ROOT 失败
- **WHEN** Home 刷新或读取 oplog
- **THEN** 不宣称 ROOT 交接成功，不把目标显示为已 ROOT；已完成的旧 ROOT→ADMIN 按权威结果显示

#### Scenario: 受理凭据少于两项、重复或字段非法

- **GIVEN** 响应 `accepted: true`，但 ROOT 交接凭据少于两项，某项 login_name/password 为空，或 login_name/password 重复
- **WHEN** Home 校验
- **THEN** 不展示任何部分密码，不乐观改写角色，显示通用“响应异常”错误；不自动重试

#### Scenario: 交接失败

- **GIVEN** ROOT 交接请求失败、被拒绝或超时
- **WHEN** Home 处理失败
- **THEN** 不打开密码弹窗，不改写角色，不提示成功；只显示脱敏错误，后续以 oplog 为准

#### Scenario: 普通 ADMIN/COLLABORATOR 互换不生成密码

- **GIVEN** 账号为非 ROOT 的 ADMIN 或 COLLABORATOR
- **WHEN** 用户在人员管理弹窗把它切换为另一普通角色
- **THEN** 沿用既有成功提示，不打开密码弹窗，不生成或改变密码

#### Scenario: 关闭弹窗清空全部密码

- **GIVEN** Home 的 ROOT 交接凭据弹窗已展示两项或 N+1 项密码
- **WHEN** 用户关闭弹窗
- **THEN** 页面立即清空全部凭据状态，密码不再出现在 DOM、localStorage 或 sessionStorage，也没有查回请求

### Requirement: Home 构建归属

页面 SHALL 通过路由表的按需加载组织参加 Vite 构建：`src/routes/index.jsx` 对页面组件与共同布局（`MainLayout`、`AdminLayout`）使用 `React.lazy` 动态导入，并在 route element 层以既有 `Suspense` 提供页面级加载反馈（仅描述当前实现，不新增加载 UI）；`LoginLayout`、路由骨架与 React 运行时随入口静态加载。`LoginLayout` 内的 `ModelViewer` 亦按需加载，three 相关代码经 `vite.config.js` 的 `manualChunks` 按依赖方向 addons → WebGL → core 分为 `vendor-three-core`、`vendor-three-webgl`、`vendor-three-addons`，均不进入入口 chunk。上述页面与 `ModelViewer` 不再与同路由树代码共同进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`src/utils/requestManager.jsx` 与 `src/utils/validateCmdArg.jsx` 统一为静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属构建验收观测，记入本轮验收报告，不作为本规格固化的历史指标

### Requirement: Home 静默刷新覆盖权限与展示变化

容器刷新指纹 SHALL 覆盖参与卡片展示、限额及操作权限判断的名称、镜像、地址、端口、账号身份与角色、长期配额、磁盘容量与限额、运行和清理冻结状态；不能只依赖采集时间带动刷新。字段结构相同、集合顺序等语义无关变化 SHALL 保持比较稳定。

#### Scenario: 只改变角色或磁盘限额
- **WHEN** 新响应只改变当前用户角色或磁盘限额，其他状态与采集时间不变
- **THEN** 页面仍更新操作入口及展示，不沿用旧权限或旧限额

### Requirement: Home 容器动作使用共享纯函数结果

Home 的 start、stop、restart、unpause、delete、long_term_enable 与 long_term_disable SHALL 使用 `containerActions.js` 同一纯函数结果渲染 `visible`、`enabled`、`reason`、`loading`、`pending`；权限、角色、只读或状态缺失时 MUST 保守禁用。长期启用读取既有 `long_term_container_can_enable` 与 `disk_usage_percent`/`disk_usage.usage_percent`；长期取消按实际 `effective_status` 判断冻结，`freeze_state` 行残留不得永久禁用。页面只保留布局、确认和 API 回调，后端仍是最终裁决。

#### Scenario: 卡片与详情弹窗同源

- **WHEN** 同一容器、同一状态、同一权限上下文分别渲染 Home 卡片与详情弹窗
- **THEN** 两个入口的删除、启停、解冻与长期结论一致，不因组件不同而漂移

#### Scenario: 长期超限或冻结残留

- **WHEN** 非长期容器的 `long_term_container_can_enable` 为 false，或磁盘用量达到既有 100% 展示阈值；或长期容器已恢复 `online`/`offline` 但 `freeze_state` 行仍存在
- **THEN** 前者禁用启用并显示既有配额/磁盘原因；后者允许取消长期，不因冻结行残留永久禁用

#### Scenario: 权限或只读上下文缺失

- **WHEN** 调用方缺少 `container:operation`/`container:root`/`container:manage`，或 `readOnly` 缺失、非 boolean、为 true
- **THEN** 对应动作禁用并给出原因；缺失权限不得默认为可操作，删除也不得发出请求

#### Scenario: 提交前重解析

- **WHEN** 用户已打开确认框或已勾选长期，提交前容器状态、权限或 pending 已变化
- **THEN** 页面用最新上下文重新解析；结果禁用/隐藏则不调用 API，并更新原因

#### Scenario: 解冻失败不伪造终态

- **WHEN** 解冻请求失败、被拒绝或超时
- **THEN** 清除该容器的 loading/pending，显示具体错误并重读权威快照；不在 catch 中写 `paused`/`online`，后续权威 `online` 才结束 pending

## Source references

- [src/pages/Home.jsx](../../../src/pages/Home.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../utils/showErrorModal`。
- 页面直接依赖：`../components/CredentialModal`。
- 页面直接依赖：`../utils/authHelpers`。
- 页面直接依赖：`../api/container_api`。
- 页面直接依赖：`../utils/timeFormat`。
- 页面直接依赖：`../utils/containerActions`。
- 页面直接依赖：`../utils/heartbeat`。
- 页面直接依赖：`../utils/listRefresh`。
- 页面直接依赖：`../api/user_api`。
- 页面直接依赖：`../utils/requestManager`。
- 页面直接依赖：`../utils/detailFormat`。
- 页面直接依赖：`../utils/useAutoHideTopBar`。
- 页面直接依赖：`../contexts/PermissionContext`。
- [src/test/](../../../src/test/)、[vite.config.js](../../../vite.config.js)：当前测试记录见 `openspec/changes/archive/2026-10-18-align-container-action-eligibility-and-recovery/` 与仓库验证日志；本规格不固化测试文件/用例数字；页面测试是否直接覆盖见 Global QUESTIONS。
