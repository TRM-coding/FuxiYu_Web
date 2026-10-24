# ContainerDetailPage

## Purpose

独立容器详情、运行状态和协作账号操作。本文件是 Web chester-next 6c5f04d2a7f1 在 2026-10-11 的代码逆向基线，按页面或已有页面组件组织路由、权限、API 与状态行为。已知交互和接口差异统一见 [Global QUESTIONS](../../../../FuxiYu_Global/QUESTIONS.md)，此记录不表示对应问题已经修复。

## Requirements

### Requirement: ContainerDetailPage 页面入口与身份

页面 SHALL 通过 `/index/containers/:containerId` 装配。现有身份与权限约束为：路径参数为 Ctrl DB id；后端以方法权限及容器资源角色判定操作。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `ContainerDetailPage` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: ContainerDetailPage 主流程

页面 SHALL 保持以下已实现的交互及数据职责：加载详情、日志，并在可见页每 5 秒静默刷新完整详情（运行状态及成员等可变详情事实均以该响应为准，不再以仅含状态的接口作为周期刷新来源）；支持启停重启删除、长期标记、解冻、协作者增删改；受理动作等待运行状态收敛；镜像信息卡在该容器详情下发 image_dockerfile 时原样展示它（容器自身记录），页面不按当前模板另行渲染。新增协作者 SHALL 按凭据流程展示密码，普通 ADMIN/COLLABORATOR 互换 SHALL 保持现有实现与成功响应且不改变密码；ROOT 上位 SHALL 与 Home 使用同一交接语义：只提交一次不带 `transfer_root` 的 `update_role`，由 Ctrl 后台降旧 ROOT、目标成为唯一 ROOT；受理后展示永久 `root` 与旧 owner 独立用户名的全部凭据，不等待 Node，不降旧 ROOT，不乐观改写本地角色，结果以完整详情刷新为准。

#### Scenario: 启动已受理

- **WHEN** 启动已受理
- **THEN** 展示过渡状态并继续读取快照，最终 online/failed 由服务端事实决定

#### Scenario: 新增协作者先拿密码再加入

- **GIVEN** 用户新增 ADMIN 或 COLLABORATOR 协作者
- **WHEN** 页面收到 `accepted: true` 与一项凭据
- **THEN** 页面先展示密码，不乐观插入账号；立即重取及后续周期刷新均按权威详情显示新增结果

#### Scenario: 普通角色切换保持原响应

- **GIVEN** 账号当前为非 ROOT 的 ADMIN 或 COLLABORATOR
- **WHEN** 用户把它切换为另一普通角色
- **THEN** 页面沿用既有成功响应与提示，不显示密码弹窗，不改变该账号密码

#### Scenario: 详情页 ROOT 交接受理后不等待后台

- **GIVEN** 用户把非 ROOT 账号选为 ROOT
- **WHEN** 页面收到 `accepted: true` 与至少两项凭据（原 owner 独立用户名 + 永久 `root`）
- **THEN** 页面立即展示全部凭据并等待用户关闭；不阻塞 Node，不在 Web 侧降级旧 ROOT，不把受理当作角色已完成

### Requirement: ContainerDetailPage 详情权威事实周期收敛

页面 SHALL 将完整容器详情响应作为运行状态与可变详情事实（`accounts`、`owners`、`is_long_term`、冻结、磁盘、`last_ssh_login_time`、`runtime_metrics`）的权威来源。页面在可见时 SHALL 以 5 秒周期静默刷新完整详情，使用短超时并防重入；隐藏时跳过、重新可见时立即恢复。旧路由、旧请求晚到或卸载后的响应 MUST NOT 回写；周期失败保留既有详情且不弹错误窗。新增协作者受理后的立即重取若仍旧，后续周期 SHALL 自动显示新成员。候选平台用户列表 MAY 在挂载、手动刷新、下拉展开或成员变更后按需重取，MUST NOT 参与每 5 秒全量轮询。本项不改变密码/凭据边界：密码只在受理响应中展示，页面不轮询密码，不乐观插入账号或改写角色。

#### Scenario: 受理后异步成员自动出现

- **GIVEN** 新增协作者已被受理并立即展示一项凭据，但受理后的立即重取仍返回旧 `accounts`
- **WHEN** 后续周期刷新取到包含新成员的权威详情
- **THEN** 用户管理列表无需手刷即显示新成员；页面不因 `accepted` 乐观插入账号，也不把受理当作已完成

#### Scenario: 角色变更与移除最终收敛

- **GIVEN** 角色变更或移除已受理，受理后的立即重取仍返回旧角色或旧成员列表
- **WHEN** 后续周期刷新返回新的 `accounts`
- **THEN** 角色标签或成员列表自动更新；不触发密码弹窗，不乐观改写本地角色

#### Scenario: 运行状态与外部详情事实周期更新

- **GIVEN** 容器已有详情，外部状态变化为冻结/长期标记，或磁盘、上次 SSH 登录等字段更新
- **WHEN** 周期刷新返回新的完整详情
- **THEN** 状态、长期勾选、磁盘、上次 SSH 与运行指标按新详情更新；页面不以仅含状态的响应覆盖完整详情

#### Scenario: 隐藏页跳过与重新可见恢复

- **GIVEN** 页面处于隐藏状态
- **WHEN** 5 秒周期到点
- **THEN** 页面不发起后台详情刷新；页面重新可见时立即刷新一次并展示最新权威事实

#### Scenario: 后台失败保留、防并发

- **GIVEN** 页面已有详情，且一次后台刷新仍在途或失败
- **WHEN** 下一周期到点
- **THEN** 不新增并发的后台详情请求；失败时保留既有详情，不弹出周期错误窗

#### Scenario: 旧响应、换路由与卸载不回写

- **GIVEN** 旧容器的详情请求晚到，或详情请求在组件卸载后才返回
- **WHEN** 响应到达
- **THEN** 不覆盖当前路由内容、不写入已卸载页面状态，也不弹出晚到错误

#### Scenario: 错误弹窗等待不占用后台刷新与 loading

- **GIVEN** 前台详情刷新网络阶段已失败，`showErrorModal` 正在等待用户关闭
- **WHEN** 下一次 5 秒周期到点
- **THEN** 后台完整详情刷新仍可发起并完成；loading 已在前台请求网络结束时释放；错误弹窗继续保留给用户处理

#### Scenario: 显式请求被 silent 请求淘汰后仍释放 loading

- **GIVEN** 显式刷新 A 在途，随后人员/长期动作的 silent 刷新 B 先返回并清空当前容器
- **WHEN** A 晚到且因请求序号旧而不写详情
- **THEN** A 的 network 生命周期结束即清除它拥有的 loading；页面不因 A 被淘汰而永久停在加载态

#### Scenario: 旧路由慢请求不阻塞新页后台

- **GIVEN** 容器 A 的显式详情请求仍在途，用户切换到容器 B，且 B 的初始详情已完成
- **WHEN** B 的下一次 5 秒周期到点
- **THEN** B 的后台详情刷新正常发起并显示新事实；A 的晚到响应不写回，也不占用 B 的后台防重入名额

#### Scenario: 候选平台用户按需刷新

- **GIVEN** 平台新增用户，页面初始候选列表未包含该用户
- **WHEN** 用户展开候选下拉、手动刷新或完成成员变更
- **THEN** 页面按需重取候选用户并显示新用户；5 秒周期不轮询平台用户列表

### Requirement: 新增协作者凭据与不乐观加入

ContainerDetailPage 的现有新增协作者入口对 ADMIN 与 COLLABORATOR 均 SHALL 使用既有 `add_collaborator` 请求，由 Ctrl 生成随机密码、Node 设置；响应 `accepted: true` 且恰好一项凭据时，页面 SHALL 立即展示受控密码弹窗。Web MUST NOT 发送密码或登录名，MUST NOT 在受理后乐观插入本地账号或宣称已加入；后续成功/失败以既有 `ADD_COLLABORATOR` oplog 与刷新后的权威详情为准，不新增密码日志或重复添加日志。普通非 ROOT 的 ADMIN/COLLABORATOR 互换不生成密码。

#### Scenario: 新增 ADMIN 协作者

- **GIVEN** 当前用户可管理容器成员，选择新用户并指定 ADMIN
- **WHEN** Ctrl 返回 `accepted: true` 与恰好一项凭据
- **THEN** 页面立即展示该凭据，行文案为“重置后{login_name}的密码：”；不立即把该账号插入本地列表，也不提示“已加入”

#### Scenario: 新增 COLLABORATOR 协作者

- **GIVEN** 当前用户可管理容器成员，选择新用户并指定 COLLABORATOR
- **WHEN** Ctrl 返回 `accepted: true` 与恰好一项凭据
- **THEN** 与 ADMIN 新增相同，立即展示一项凭据；不发送前端账号名、密码或默认口令

#### Scenario: 新增受理失败或凭据异常

- **GIVEN** 新增协作者请求失败，或 `accepted: true` 但凭据缺失/字段非法
- **WHEN** 页面处理结果
- **THEN** 不展示任何密码，不插入本地账号，不提示成功；只显示脱敏错误，后续以 oplog 为准

### Requirement: 账号卡密码重置入口与权限

ContainerDetailPage 的每个账号卡 SHALL 提供“重置密码”按钮。按钮仅当同时满足以下三层时可见：方法层 `hasPermission('container:operation')`；资源层当前用户是该容器 ROOT 绑定本人，或权限快照的 `containerResourceUnrestricted === true`；机器/在线层容器 `online` 且宿主机可用。缺少任一层的其他 ADMIN、COLLABORATOR 以及仅由 `bypass_auth_entity` 展开的方法权限 MUST NOT 获得该按钮。本入口只在详情页账号卡提供，Web MUST NOT 在 Home 增加额外重置按钮。按钮 SHALL 在容器非 `online`、宿主机离线/维护、状态过渡、缺少 `container:operation` 或目标账号缺少有效 `user_id` 时禁用并给出原因；发请求前 SHALL 重新校验三层资格、目标绑定与容器状态。Web MUST NOT 发送或显示任何默认密码，包括 `user123`、`owner123` 或其他固定口令。

#### Scenario: ROOT 本人可见

- **GIVEN** 当前用户是容器 ROOT 绑定，详情返回 `root` 与普通账号两个绑定
- **WHEN** 详情页渲染账号卡
- **THEN** 每个账号卡均显示“重置密码”按钮，包括 ROOT 与普通账号

#### Scenario: 资源管理通配者可见

- **GIVEN** 当前用户不是容器 ROOT，但权限快照 `containerResourceUnrestricted` 为 true
- **WHEN** 详情页渲染账号卡
- **THEN** 每个账号均显示“重置密码”按钮，不要求 ROOT 绑定

#### Scenario: ADMIN、COLLABORATOR 与方法通配不得放行

- **GIVEN** 当前用户是容器 ADMIN 或 COLLABORATOR，或仅持 `bypass_auth_entity` 且 `containerResourceUnrestricted` 为 false
- **WHEN** 详情页渲染账号卡
- **THEN** 不显示“重置密码”按钮；页面不发送重置请求

#### Scenario: 缺少 container:operation 方法层守卫

- **GIVEN** 当前用户是容器 ROOT 绑定或 `containerResourceUnrestricted` 为 true，但 `hasPermission('container:operation')` 为 false
- **WHEN** 详情页渲染账号卡
- **THEN** “重置密码”按钮隐藏或禁用并给出方法权限原因；页面不发送重置请求；后端仍是最终裁决

#### Scenario: 容器不在线或主机不可用

- **GIVEN** 容器状态不是 `online`，或宿主机离线/维护、启动/停止/重启等过渡态
- **WHEN** 查看账号卡
- **THEN** “重置密码”按钮禁用并显示既有状态原因；用户不能发起重置请求

#### Scenario: 目标绑定缺少 user_id 或提交前变化

- **GIVEN** 目标账号没有有效绑定 `user_id`，或确认提交前容器变为离线/维护/过渡态
- **WHEN** 用户确认重置
- **THEN** 页面不调用接口，关闭确认并显示原因；MUST NOT 改发前端账号名或旧 user_id

#### Scenario: 不得回退到默认密码

- **GIVEN** 容器详情或用户输入中没有密码字段
- **WHEN** 用户执行任何账号重置或角色操作
- **THEN** Web 不发送、不显示、不保存任何默认密码；密码只能来自 Ctrl 响应 `credentials`

### Requirement: 账号卡密码重置请求与受理

点击并经确认后，页面 SHALL 只调用 `POST /api/containers/reset_container_password`，请求体精确为 `{ container_id, user_id }`；MUST NOT 发送 `login_name`、`password` 或前端展示名。Ctrl 在受理前执行三层既有 guard：方法层 `container:operation`、资源层 `container:root`（ROOT 绑定或资源通配）、机器层主机与容器 `online` 可用；UI 的可见/可用口径与后端一致，只在三层均满足时执行。目标登录名取绑定 username，ROOT 固定 `root`。404/409/500 使用既有 `error_reason` 映射，Ctrl 不拼原始错误体。受理后页面 SHALL 立即用受控密码弹窗展示一项凭据，MUST NOT 等待 Node 或轮询密码。后续成功/失败只以既有 oplog 呈现，操作码为 `reset_container_password`，MUST NOT 在 oplog、通知或页面日志中写入密码。

#### Scenario: 只提交绑定身份

- **GIVEN** 当前用户是容器 ROOT 绑定，点击普通账号的“重置密码”并确认
- **WHEN** 页面发起请求
- **THEN** 请求只含该绑定的 `container_id` 与 `user_id`；不出现 `login_name`、`password`、`username` 或前端展示名

#### Scenario: 登录名以前端展示名伪装

- **GIVEN** 账号卡的展示名与绑定登录名不同，响应返回 `login_name` 为绑定 username
- **WHEN** 密码弹窗打开
- **THEN** 行文案使用响应 `login_name`，不使用卡片展示名；ROOT 绑定即使展示名不同也使用响应中的 `root`

#### Scenario: 受理后立即展示

- **GIVEN** 重置请求返回 `accepted: true` 与恰好一项凭据
- **WHEN** 页面处理响应
- **THEN** 立即打开受控密码弹窗；不等待容器状态变化或 Node 结果，不发起密码轮询

#### Scenario: 后续结果只看 oplog

- **GIVEN** 重置已受理并已展示密码
- **WHEN** Node 后台执行成功或失败
- **THEN** 页面不宣称密码已生效，不写入含密码的日志；后续 5 秒历史刷新无需手刷即显示“重置容器密码”成功或失败记录

#### Scenario: 重置失败不泄露密码

- **GIVEN** 重置请求失败、超时或响应夹带密码字段
- **WHEN** 页面处理失败
- **THEN** 不打开密码弹窗，不显示任何密码，不把原始响应体写入错误弹窗或 console；保留当前账号与角色展示

#### Scenario: 受理凭据数量或字段非法

- **GIVEN** 重置响应 `accepted: true`，但凭据不是恰好一项，或 login_name/password 为空
- **WHEN** 页面校验
- **THEN** 不展示任何部分密码，显示通用“响应异常”错误；不自动重试、不宣称成功

### Requirement: 详情页 ROOT 上位统一交接

当详情页把非 ROOT 绑定改选为 ROOT 时，页面 SHALL 只调用一次 `POST /api/containers/update_role`，参数精确为 `{ container_id, user_id, updated_role: 'ROOT' }`，MUST NOT 发送 `transfer_root`。旧 ROOT→ADMIN、目标→唯一 ROOT、永久 `root` 新密码及原 owner 独立用户名新密码 SHALL 由 Ctrl 后台编排并在受理响应返回；Web MUST NOT 自行先降旧 ROOT、自行创建旧 owner 独立账号、自行发起第二次 `update_role`，也 MUST NOT 提交任何密码、登录名或默认口令。

#### Scenario: 只提交一次无分支交接请求

- **GIVEN** 容器已有 ROOT 绑定，另有一个非 ROOT 绑定可选为 ROOT
- **WHEN** 页面提交 ROOT 上位
- **THEN** 只发出一次目标 `update_role` 请求，请求体不含 `transfer_root`；Web 不调用旧 ROOT 降级请求，不要求旧 ROOT 凭据，也不发出第二个 HTTP

#### Scenario: 普通 ADMIN/COLLABORATOR 互换不生成密码

- **GIVEN** 当前账号为非 ROOT 的 ADMIN 或 COLLABORATOR
- **WHEN** 用户在同一账号上切换 ADMIN/COLLABORATOR
- **THEN** 只调用既有角色接口，响应可无凭据；不打开密码弹窗，不生成密码，不发送默认口令

### Requirement: 详情页 ROOT 交接展示全部凭据且不乐观更新

详情页 ROOT 受理响应 `accepted === true` 且 `credentials` 至少 2 项、每项 login_name/password 非空且互不相同时，页面 SHALL 在受控密码弹窗逐项展示永久 `root` 与原 owner 独立用户名的全部密码；历史多个旧 owner 的 N+1 项 MUST 全部展示，MUST NOT 截断、丢弃、合并或只取 `root`。Web MUST NOT 乐观改写账号角色；目标成为 ROOT 与旧 ROOT 降级 MUST 以受理后的完整详情刷新（立即重取与 5 秒周期）为准。关闭弹窗 MUST 立即清空凭据状态，不持久化、不记录日志、不回查。

#### Scenario: 展示原 owner 与 root 两项

- **GIVEN** ROOT 交接返回 `accepted: true` 与原 owner 独立用户名、永久 `root` 两项凭据
- **WHEN** 页面处理响应
- **THEN** 弹窗显示两条“重置后{login_name}的密码：”，分别为原 owner 与 `root`；不省略原 owner、不只展示 `root`

#### Scenario: 历史多个旧 owner 的 N+1 项全部展示

- **GIVEN** 历史多旧 owner 容器交接返回所有涉及账号 + `root`，凭据为 3 项或更多
- **WHEN** 页面处理响应
- **THEN** 弹窗逐项显示全部 login_name 与密码，不截断为两项，不为凑固定项数丢弃旧 owner

#### Scenario: 凭据少于两项、重复或字段非法

- **GIVEN** 响应 `accepted: true`，但凭据少于两项、login_name/password 为空，或 login_name/password 重复
- **WHEN** 页面校验
- **THEN** 不展示任何部分密码，不乐观改写角色，显示通用“响应异常”错误；不自动重试

#### Scenario: 目标成为 ROOT 不乐观更新

- **GIVEN** ROOT 交接受理后，立即完整详情重取仍返回旧角色
- **WHEN** 页面处理受理与立即重取
- **THEN** 本地角色保持旧值，不因 `accepted` 提前显示目标为 ROOT；后续完整详情返回旧 ROOT→ADMIN、目标→ROOT 后才更新，且刷新不再次弹密码

#### Scenario: 提升失败或结果未知

- **GIVEN** ROOT 交接请求失败、被拒绝、超时或 oplog 结果未知
- **WHEN** 页面处理结果
- **THEN** 不打开/保留密码弹窗，不改变本地角色，不提示成功或 Node 已确认；只显示脱敏错误，后续以 oplog 为准

#### Scenario: 关闭弹窗清空全部密码

- **GIVEN** ROOT 交接弹窗已展示两项或 N+1 项密码
- **WHEN** 用户关闭弹窗
- **THEN** 页面立即清空全部凭据状态，密码不再出现在 DOM、localStorage 或 sessionStorage，也没有查回请求

### Requirement: ContainerDetailPage 构建归属

页面 SHALL 通过路由表的按需加载组织参加 Vite 构建：`src/routes/index.jsx` 对页面组件与共同布局（`MainLayout`、`AdminLayout`）使用 `React.lazy` 动态导入，并在 route element 层以既有 `Suspense` 提供页面级加载反馈（仅描述当前实现，不新增加载 UI）；`LoginLayout`、路由骨架与 React 运行时随入口静态加载。`LoginLayout` 内的 `ModelViewer` 亦按需加载，three 相关代码经 `vite.config.js` 的 `manualChunks` 按依赖方向 addons → WebGL → core 分为 `vendor-three-core`、`vendor-three-webgl`、`vendor-three-addons`，均不进入入口 chunk。上述页面与 `ModelViewer` 不再与同路由树代码共同进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`src/utils/requestManager.jsx` 与 `src/utils/validateCmdArg.jsx` 统一为静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属构建验收观测，记入本轮验收报告，不作为本规格固化的历史指标

### Requirement: ContainerDetailPage 容器动作使用共享结果

ContainerDetailPage 的 start、stop、restart、unpause、delete、long_term_enable 与 long_term_disable SHALL 使用同一共享纯函数结果，输入当前用户真实方法权限、容器角色、只读上下文与权威状态。删除按 `online/offline/paused/failed` 允许、过渡/主机/未知拒绝；长期使用既有配额、磁盘百分比与状态字段；动作确认使用 `ContainerActionConfirmModal`，该页不渲染 `ContainerDetailModal`，确认弹窗只负责确认呈现，不另建动作资格判据。失败时清除 loading/pending 并重读，不伪造终态。

#### Scenario: 与其他页面同上下文一致

- **WHEN** 同一容器、同一状态和同一权限上下文分别出现在 ContainerDetailPage 与 Home/ManageMachine/ManageUser
- **THEN** 各动作的 visible/enabled/reason 结论一致，不因详情页另写条件而漂移

#### Scenario: 失败容器可删除、过渡态不可删除

- **WHEN** 容器状态为 `failed` 且操作员具备删除权限；或状态为 `building/creating/starting/stopping/restarting`、主机离线/维护、采集未知、本地 `pausing/unpausing`
- **THEN** 前者删除可见可执行；后者删除禁用并显示原因，不发送删除请求

#### Scenario: 长期配额、磁盘与冻结残留

- **WHEN** 非长期容器 `long_term_container_can_enable` 为 false，或磁盘达到既有 100% 展示阈值；或长期容器实际状态为 `paused`；或已恢复 `online`/`offline` 但冻结行仍存在
- **THEN** 前两者分别禁用启用/取消；后者允许取消长期，不因冻结行残留永久禁用

#### Scenario: 提交前重解析

- **WHEN** 用户已打开删除/解冻确认框或已勾选长期，提交前容器状态、权限或 pending 已变化
- **THEN** 页面用最新上下文重新解析；结果禁用/隐藏则不调用 API，并更新原因或关闭确认框

#### Scenario: 解冻或启动失败不覆盖权威终态

- **WHEN** 解冻失败/超时，或解冻后的启动被权威验证为 `failed`
- **THEN** 清除 loading/pending、显示具体错误并重读；权威 `online` 才结束 pending，真实 `failed` 保持 `failed`，不写猜测的 `paused`/`online`

#### Scenario: 动作确认弹窗不另建资格

- **WHEN** ContainerDetailPage 的 `ContainerActionConfirmModal` 收到带长期/冻结字段的容器
- **THEN** 该动作确认弹窗不出现长期控件，不自行用 `freeze_state`、旧配额或本地状态推导长期/删除资格；解除关联仍走独立既有流程

### Requirement: ContainerDetailPage 展示并复制既有宿主 bind 路径

ContainerDetailPage SHALL 从既有详情响应读取可空 `bind_mount_path`，在运行指标区域完整展示该值并提供复制；此值只来自 Ctrl 的最近记录，MUST NOT 调用 Node 核实，也不得按容器名、机器名、端口或其他本地字段拼猜。页面 SHALL 标注其为最近记录而非实时核对，不新增宿主路径输入、页面入口、API 字段或权限判断。

#### Scenario: 有记录时完整展示与复制

- **GIVEN** 详情响应返回非空 `bind_mount_path`，以及 GPU 分配和共享内存字段
- **WHEN** 页面渲染运行指标和镜像信息
- **THEN** 运行指标区域原样展示三项资源信息并提供路径复制；镜像信息区域不重复展示 GPU、共享内存或 bind 路径，只展示镜像身份和已有 Dockerfile 内容

#### Scenario: 空值或旧 Ctrl 缺字段

- **GIVEN** `bind_mount_path` 为 `null`、空字符串，或旧 Ctrl 详情响应没有该字段
- **WHEN** 页面渲染运行指标
- **THEN** 只显示“未记录”，不生成候选路径或可复制值；缺失资源使用既有未知占位，合法的 0 值不得被当成缺失；其余详情字段、状态轮询和既有动作仍正常展示

#### Scenario: 最近记录与实时核对的区别

- **GIVEN** 页面显示非空 bind 路径
- **WHEN** 用户查看该字段或点击复制
- **THEN** 文案表明这是最近记录、不是实时核对，复制内容与响应值逐字一致，且不触发 Node 请求

#### Scenario: 复制失败

- **GIVEN** 剪贴板写入失败且页面仍有非空 bind 路径
- **WHEN** 用户点击路径复制控件
- **THEN** 显示既有“复制失败”反馈，路径、`title` 和复制值保持不变，不发起 API 或 Node 请求

### Requirement: ContainerDetailPage 运行指标资源归属

ContainerDetailPage SHALL 将既有详情响应中的 GPU 分配和共享内存放入运行指标区域，使用当前页面的格式化与未知值处理；本项只调整展示归属，不引入新的资源计算、接口或持久化状态。

#### Scenario: 资源字段放入运行指标

- **GIVEN** 详情响应含 GPU 分配 `4, 0` 与共享内存 `1 GB`
- **WHEN** 页面渲染运行指标
- **THEN** 运行指标区域显示对应标签和值，镜像信息卡不再显示这两项

#### Scenario: 资源值缺失或为零

- **GIVEN** GPU 或共享内存字段缺失，或明确返回 0
- **WHEN** 页面渲染运行指标
- **THEN** 缺失值显示既有未知占位，0 显示为合法的 0 值；页面不发起补充请求

#### Scenario: 镜像内容缺失

- **GIVEN** 镜像名为空或 `image_dockerfile` 为空
- **WHEN** 页面渲染镜像信息区域
- **THEN** 镜像名显示“未知”，空 Dockerfile 不渲染伪造内容或空的代码块

### Requirement: ContainerDetailPage 操作历史随事实刷新

刷新按钮、容器动作和人员变更受理后 SHALL 重新获取操作历史，不得只在首次挂载时读取。页面在可见时 SHALL 以同一 5 秒周期后台复读既有操作历史接口，使用短超时并进行 in-flight 防重入，页面隐藏时跳过、重新可见时恢复；旧路由、旧请求或卸载后的响应 MUST NOT 回写。后台历史刷新失败 SHALL 保留既有历史且不弹周期错误窗。异步 `add_collaborator`、`remove_collaborator`、`update_collaborator_role` 与 `reset_container_password` 的终态 SHALL 无需用户手刷即出现；`reset_container_password` 使用中文“重置容器密码”，页面 MUST NOT 轮询、展示或记录任何密码。动作失败时 MUST NOT 追加成功历史；页面 SHALL 保留既有历史并展示失败原因，或在失败后按权威事实重取。

#### Scenario: 点击刷新按钮重取历史

- **GIVEN** 容器详情已展示初始操作历史
- **WHEN** 用户点击刷新按钮
- **THEN** 页面同时重取详情和操作历史，历史列表包含刷新时刻的最新事实

#### Scenario: 操作成功后历史包含最新事实

- **GIVEN** 用户在详情页成功启动、停止、解冻或修改长期状态
- **WHEN** 动作成功返回
- **THEN** 页面重取操作历史，新增记录与本次动作事实一致，不只更新详情字段

#### Scenario: 操作失败不追加成功历史

- **GIVEN** 用户触发容器动作
- **WHEN** 后端拒绝或请求失败
- **THEN** 历史列表不出现本次动作的成功记录，页面展示失败原因，既有历史不被误标为成功

#### Scenario: 异步成员变更终态自动出现

- **GIVEN** 添加协作者已受理并立即重取历史，但返回的仍是旧日志
- **WHEN** 后续 5 秒后台历史刷新取到 `add_collaborator` 成功或失败记录
- **THEN** 历史列表无需手刷即出现“添加协作者”终态；页面不把受理当作已完成，也不显示密码

#### Scenario: 重置密码终态使用中文标签

- **GIVEN** 重置密码已受理并展示凭据，后台 Node 最终写入 `reset_container_password` 结果
- **WHEN** 后续 5 秒后台历史刷新返回该记录
- **THEN** 历史列表显示“重置容器密码”与成功/失败标签，不显示原始操作码或任何密码

#### Scenario: 历史后台失败保留、防并发

- **GIVEN** 页面已有操作历史，且一次后台历史刷新仍在途或失败
- **WHEN** 下一周期到点
- **THEN** 不新增并发的后台历史请求；失败时保留既有历史且不弹周期错误窗

#### Scenario: 历史隐藏跳过与恢复

- **GIVEN** 页面处于隐藏状态
- **WHEN** 5 秒周期到点后页面重新可见
- **THEN** 隐藏期间不请求历史；重新可见时立即复读并在列表显示最新终态

#### Scenario: 旧路由与卸载后的历史不回写

- **GIVEN** 旧容器的后台历史请求晚到，或历史请求在组件卸载后才返回
- **WHEN** 响应到达
- **THEN** 不覆盖当前路由历史、不写已卸载页面状态，也不产生晚到错误或告警

### Requirement: ContainerDetailPage 窄屏布局不横向溢出且长内容可读

ContainerDetailPage SHALL 在 320px、390px 和 768px 视口下把共享 `.container-detail-layout` 网格及其中卡片保持在视口宽度内。`DetailPages.css` 的共享最小列宽 MUST 使用 `min(460px, 100%)` 或等价的可收缩值，MUST NOT 因固定 460px 最小列宽产生整页横向滚动。`.detail-card`、标题、运行指标、bind 路径和详情字段 SHALL 允许收缩与换行；长容器名、长路径和长指标文案 MUST 可读，复制控件的 `title` 与复制值 MUST 保持完整。桌面信息层级、卡片顺序和资源字段归属 MUST NOT 因本修正改变；页面 MUST NOT 为此新增接口、字段或权限判断。

#### Scenario: 390px 长标题与长 bind 路径

- **GIVEN** 容器详情返回无空格长容器名和含中文、空格、长目录的 `bind_mount_path`
- **WHEN** 在 390px 视口渲染
- **THEN** `document.documentElement.scrollWidth` 不超过 392px，标题在卡片内换行，运行指标与操作卡完整可见；bind 路径复制控件的文本、`title` 和复制值均为完整路径

#### Scenario: 320px 长运行指标文案

- **GIVEN** 运行指标包含较长的 GPU 设备编号、网络入/出和磁盘上限文案
- **WHEN** 在 320px 视口渲染
- **THEN** 每个指标卡的标签、值和补充文案均在卡片内换行或收缩，不超出视口；页面无横向滚动，指标值不被截断成无法阅读的空白

#### Scenario: 768px 与桌面的共享布局

- **GIVEN** 同一份容器详情分别在 768px 和 1440px 视口打开
- **WHEN** 详情加载完成
- **THEN** 768px 下共享网格按可用宽度收缩为单列且无横向溢出；1440px 下仍保持现有桌面卡片归属与多列布局，不因响应式修正改变信息顺序

#### Scenario: 缺少 bind 路径或存在无空格长串

- **GIVEN** 详情响应没有 `bind_mount_path`，且容器名或某个指标值含无空格长串
- **WHEN** 在 320px 视口渲染
- **THEN** 路径区域显示“未记录”且不渲染复制控件，长串在卡片内换行，整页仍无横向溢出；不生成猜测路径或额外请求

## Source references

- [src/pages/ContainerDetailPage.jsx](../../../src/pages/ContainerDetailPage.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../api/container_api`。
- 页面直接依赖：`../api/user_api`。
- 页面直接依赖：`../utils/showErrorModal`。
- 页面直接依赖：`../components/CredentialModal`。
- 页面直接依赖：`../utils/detailFormat`。
- 页面直接依赖：`../utils/timeFormat`。
- 页面直接依赖：`../utils/statusDisplay`。
- 页面直接依赖：`../contexts/PermissionContext`。
- 页面直接依赖：`../utils/containerActions`。
- 页面直接依赖：`../utils/listRefresh`（`LIST_REFRESH_INTERVAL_MS`、`canRunListRefresh`）。
- [src/test/](../../../src/test/)、[vite.config.js](../../../vite.config.js)：当前测试记录见 `openspec/changes/archive/2026-10-18-align-container-action-eligibility-and-recovery/` 与仓库验证日志；本规格不固化测试文件/用例数字；页面测试是否直接覆盖见 Global QUESTIONS。

