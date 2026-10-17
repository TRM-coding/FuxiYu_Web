# Tasks

## 1. 统一纯函数策略层

- [ ] 1.1 扩展 `src/utils/containerActions.js`，导出 `CONTAINER_ACTION_KEYS`、`normalizeLongTermEligibility`、`normalizeContainerActionContext`、`resolveContainerActions` 与原因文案 helper；输入输出严格按 design 契约，页面不再需要自行拼 `visible/enabled/reason/loading/pending`。验证：纯函数单测覆盖 7 个必需 action key、`disabled === !enabled`、未知 key 被忽略，且模块无 IO/副作用/隐式 `Date.now()`。
- [ ] 1.2 在共享层实现固定 8 字段 DTO 校验：两个布尔必须原生 boolean，reason 与方向一致，`evaluated_at`/`disk_measured_at` 为 UTC 字符串，磁盘字节为非负整数或 null；缺字段、数组、字符串/数字布尔、坏时间、半对象、方向 reason 矛盾全部返回资格未知。验证：参数化单测覆盖每个字段缺失/错型、`"false"`/`0` 布尔、`Date` 对象、未带时区时间、合法 8 字段与合法 null 磁盘字段。
- [ ] 1.3 在共享层实现权限/角色与只读上下文归一化：`container:operation`、`container:manage`、`bypass_auth_entity`、`bypass_resource` 的形成关系与 Ctrl `rbac_service` 一致；缺失/undefined/未知角色 fail closed；`containerRole` 只认 ROOT/ADMIN/COLLABORATOR；`readOnly` 必须原生 boolean，`true` 或缺失/非法时禁用全部 7 个写动作（含 long-term/unpause），只有严格 `false` 放行。验证：单测覆盖 ROOT、ADMIN、COLLABORATOR、空角色、空数组、`undefined`、`container:manage` 资源通配、`bypass_auth_entity` 非资源通配，以及 `readOnly` 的 `true/false/缺失/"false"/0`。
- [ ] 1.4 实现动作—方法—资源表：start/stop/restart/delete 使用 `container:operation` + ADMIN 级资源角色/通配；long_term 使用 `container:operation` + ROOT 级资源角色/通配；unpause 仅要求 `container:manage`；长期方向严格按 `is_long_term === true/false`，缺失/非法只禁用两个长期动作并返回 `long_term_state_unknown`，不得默认为 enable 或连带禁用删除等无关动作。验证：单测参数化断言同一容器同一上下文在各 action 的 `visible`/`enabled`、不同角色的权限差异，以及 `is_long_term` 的 true/false/缺失/`"true"`/null 分支。
- [ ] 1.5 实现删除状态门：仅 `online/offline/paused/failed` 允许；`building/creating/starting/stopping/restarting/host_offline/host_maintenance/status_unknown` 禁用；`pausing/unpausing/unknown/空状态` 按本地保守态禁用。验证：状态矩阵单测明确 `failed` 可删、`paused` 可删、`starting` 不可删、`status_unknown` 不可删，且不引用 `canSetLongTerm`。
- [ ] 1.6 实现普通动作保守状态表：start 仅 offline，stop/restart 仅 online，unpause 仅 paused；过渡/宿主/未知状态 fail closed；保持后端允许 failed restart 时前端仍保守的行为。验证：单测覆盖 online/offline/paused/failed/7 个过渡及派生状态，断言与后端表不同处已在契约中标注。
- [ ] 1.7 实现统一 reason 优先级、loading 与 pending：按上下文有效性/只读 → 展示权限 → 长期方向有效性 → 动作 loading → 未确认 pending → DTO 未知 → 状态门 → 服务端方向 reason 的顺序短路；`readOnly=true`/缺失/非法、权限失效时 MUST 先返回授权/只读原因，loading 不得覆盖；pausing/unpausing 返回 `pending=true`。验证：单测逐一覆盖每层短路、loading 已授权时 reason 为 null、loading+权限失效仍按授权禁用、pending 不被当终态。
- [ ] 1.8 保证纯函数不读时钟：resolver 不接收也不调用隐式 now；页面/轮询在用 `deriveContainerEffectiveStatus` 判断 pending 超时时显式传 now，`createContainerStatusTransition` 的 `startedAt` 显式传事件时间。验证：单测 mock `Date.now` 或冻结时钟，断言 resolver 输出不变；页面测试断言超时分支使用显式 now。
- [ ] 1.9 扩展 `containerListFingerprint`：按固定顺序加入规范化后的 8 个 DTO 字段，缺 DTO 与合法 DTO 指纹不同，仅改 `can_disable`、原因、`evaluated_at` 或 `disk_measured_at` 也必须变化；不得只比较 `can_enable`。非 DTO 的响应接收/重发/渲染时间不得纳入业务指纹。验证：`listRefresh` 单测覆盖逐字段变化（含两个 DTO 时间）、键顺序稳定、缺失 DTO 与完整 DTO 差异，以及仅非 DTO 时间变化不改指纹。
- [ ] 1.10 迁移/移除旧规则：`getContainerActionState` 如保留必须薄委托同一状态表，`getRoleActionSet` 不得再参与资格判断；删除 Home 的未使用 import 与各页重复条件。验证：源码检索不存在 `canSetLongTerm` 决策、旧配额/磁盘长期门或第二套 `containerRole` 判断；相关旧单测更新为共享契约断言。

## 2. Home 页面

- [ ] 2.1 Home 卡片的 start/stop/restart 使用共享 action 结果渲染 `disabled/reason/loading`，不再直接把 `effective_status` 与按钮条件写死；确认弹窗与 API 回调保留。验证：Home 组件测试覆盖 online/offline/failed/过渡状态，断言按钮状态与共享 resolver 结果一致。
- [ ] 2.2 Home 解冻按钮只按 `container:manage` 与 `paused` 状态显示/启用，受理文案为“解冻指令已发送”；失败/超时清除 transition、loading、message loading 并重读权威快照，不在 catch 中写 `paused`/`online`。验证：组件测试覆盖受理后 `online`、失败、超时、后续启动验证 `failed`，并断言无“已解冻”。
- [ ] 2.3 Home 删除入口（详情弹窗）使用共享 `delete` 结果：ADMIN/ROOT 可见可删，COLLABORATOR 不显示可执行删除；`delete.visible=false` 不得自动转为解除关联授权，leave 仍按既有独立流程。`failed` 可删，`starting/stopping/restarting` 与宿主机/未知状态不可删；删除失败/409/超时展示具体原因并刷新，不伪造已删除。验证：Home 组件测试覆盖角色差异、failed 删除、过渡禁用、403/409/超时不提前移除行，以及无 `delete.visible` 推导 leave 的断言。
- [ ] 2.4 Home 长期勾选严格按 `is_long_term === true/false` 选方向，只读取固定 DTO，移除 `isDiskOverLimit`/旧配额布尔门；`is_long_term` 缺失/非法只禁用长期并显示未知原因，删除/启停不受影响；缺 DTO、字符串布尔、手工超限、冻结未解除、已确认解冻遗留 `freeze_state` 均按 DTO 与共享状态门处理；保存中 loading、成功权威刷新后更新、失败/409/超时重读。验证：Home 测试覆盖上述 DTO/冻结/超限/409/超时矩阵、旧字段假但 DTO 真的分支及 `is_long_term` 非法分支。
- [ ] 2.5 Home 静默刷新继续使用 `containerListFingerprint`，新增 DTO 与角色字段变化可触发重算；真实 `evaluated_at`/`disk_measured_at` 变化必须更新 DTO 并重算，单纯响应接收/重发时间不触发；不修改分页/筛选语义（Q69 不在本变更）。验证：刷新测试断言只改资格原因/角色/DTO 时间会更新，只改非 DTO 接收时间不会误判操作变化。

## 3. ManageMachine 页面与弹窗

- [ ] 3.1 ManageMachine 容器卡片的 start/stop/restart 改为共享 action 结果，移除 `status !== 'online'` 等本地硬编码；确认弹窗与 API 回调保留。验证：组件测试覆盖 online/offline/failed/过渡及不同角色，断言与共享结果一致。
- [ ] 3.2 ManageMachine 的 ContainerDetailModal 删除不再通过 `forceSystemAdmin=true` 绕过角色：传入真实 `containerRole`/当前权限上下文，`delete.visible/enabled` 与 Home/Detail 同结论；弹窗无长期控件；人员管理另用显式 `canManagePeople`，不与删除资格混用；解除关联不由删除不可见推导。验证：机器页/弹窗测试覆盖 ROOT、ADMIN、COLLABORATOR/无权限、failed 可删与 starting 不可删，断言无 `forceSystemAdmin` 伪造删除、资源通配代管人员仍可用、无 leave 自动授权。
- [ ] 3.3 ManageMachine 解冻与长期使用共享结果；解冻保留页面 pending 与回调，长期严格按 `is_long_term` 布尔选方向并移除旧配额/磁盘门，缺失/非法只禁用长期；失败/超时清 pending、重读权威快照，真实 `online`/`failed` 收敛与 Home 一致。验证：机器页测试覆盖长期 DTO 方向、`is_long_term` 非法、未知、冻结残留、解冻受理/失败/超时/真实 failed。
- [ ] 3.4 ManageMachine 刷新与弹窗回调不因共享化丢失页面状态：删除成功后重读机器容器列表，长期成功后才更新计数/行，解冻失败后按钮可恢复。验证：组件测试断言失败后无残留 loading/pending、无“已解冻”，删除/长期失败保留原行并可重试。

## 4. ManageUser 页面

- [ ] 4.1 ManageUser 容器卡片的 start/stop/restart、unpause、long_term 全部使用共享 action 结果；unpause 仍只需 `container:manage`，start/stop/restart 角色差异按后端权限表；页面不新增容器删除入口。验证：组件测试覆盖四种角色/权限上下文、只读缺失/非法、online/offline/paused/failed、过渡态与同一容器跨视图结论。
- [ ] 4.2 ManageUser 长期列/卡片只消费父组件共享结果；移除 `long_term_container_remaining`、`long_term_container_can_enable`、`isDiskOverLimit` 对禁用结论的直接参与；严格区分 `is_long_term` true/false，缺失/非法只禁用长期；只读 ContainerDetailModal 不出现长期控件或动作。验证：用户页/表格测试覆盖旧配额假但 DTO 真、DTO 未知、`is_long_term` 非法、方向拒绝、保存中、409/超时与只读弹窗。
- [ ] 4.3 ManageUser 解冻失败清理该容器的 transition、操作 loading、消息 loading，重读权威快照；不再 catch 后 patch `paused`；后续真实 `online` 清 pending，启动验证 `failed` 保持 `failed`。验证：用户页测试断言失败后按钮恢复、无残留 `unpausing`、错误可见且无“已解冻”。

## 5. ManageUserInTable

- [ ] 5.1 长期列改为消费父组件传入的 `longTerm`/共享 action 结果，不自行读取 `long_term_container_remaining`、旧 `long_term_container_can_enable`、`isDiskOverLimit` 或本地推导；严格区分 `is_long_term` true/false，缺失/非法按未知禁用；保存中显示 loading/禁用，失败由父组件重读后回填，父级在最终提交前重新解析。验证：表格组件测试覆盖方向 true/false、`is_long_term` 非法、资格未知、DTO 与旧字段冲突、父级失败回滚与保存前失效，断言组件内无长期资格重算。
- [ ] 5.2 明确本组件无删除容器入口；不把 Home/Detail 的删除逻辑复制到表格，也不把删除与长期策略混用。验证：源码检索与组件测试断言无 `deleteContainer`/删除按钮，表格仍只暴露既有父回调。

## 6. ContainerDetailPage 与 ContainerDetailModal

- [ ] 6.1 ContainerDetailPage 的删除按钮改用共享 `delete`：移除 `['building','creating']` 硬编码；ADMIN/ROOT 可删，COLLABORATOR 不显示可执行删除；`failed` 可删，过渡/宿主/未知不可删；失败/409/超时展示原因并重读，不提前导航成功。验证：详情页测试覆盖完整删除状态矩阵、角色差异、failed 删除、409/超时。
- [ ] 6.2 ContainerDetailPage 的 start/stop/restart/unpause 使用共享结果；解冻仍只在 `container:manage` 下渲染，受理文案“解冻指令已发送”，失败/超时清 loading/pending 并重读，真实 `online`/`failed` 按权威展示。验证：详情页测试覆盖按钮状态、受理/失败/超时、启动验证 failed 不被受理提示覆盖。
- [ ] 6.3 ContainerDetailPage 长期勾选只消费固定 DTO：严格按 `is_long_term` 布尔选方向，缺失/非法只禁用长期并显示未知原因，不影响删除/启停；缺 DTO/坏布尔/坏时间禁用并显示未知原因；手工超限、冻结未解除、已确认解冻后冻结记录残留按 DTO 与状态门；提交中不伪造 checked，409/超时重读。验证：详情页测试覆盖 8 字段异常、两个方向、`is_long_term` 非法、冻结残留、手工超限、409/超时。
- [ ] 6.4 ContainerDetailModal 不提供长期控件；删除/解冻使用父页面传入的 action 结果，不读 `freeze_state` 推导长期资格，不自行用 `isRoot` 或状态补第二套判据；解除关联沿用独立既有流程，不由 `delete.visible` 推导。验证：弹窗测试覆盖 ROOT/ADMIN/COLLABORATOR、failed 删除、过渡禁用、只读模式、无长期控件；断言删除/解冻可见性来自 props/共享结果，leave 无自动授权。
- [ ] 6.5 DetailPage 轮询把权威 `effective_status` 交给同一派生逻辑；解冻/启动的真实终态 `online`/`failed` 与 pending 清理和 Home/ManageMachine 一致；不新增 ContainerDetailModal 长期入口。验证：详情页 + 弹窗集成测试覆盖轮询清 pending、failed 保持、无长期控件。

## 7. 跨页矩阵与集成验证

- [ ] 7.1 建立同容器跨页面矩阵：同一 `container/effective_status/eligibility/context` 下 Home、ManageMachine、ManageUser、ManageUserInTable、ContainerDetailPage 得到相同 action 结论；不同上下文（ROOT/ADMIN/COLLABORATOR、`container:manage` 操作员、undefined 权限、readOnly true/缺失/非法、`is_long_term` 缺失/非法）得到明确差异而非页面漂移；loading+授权失效时授权原因优先；所有非只读页面 adapter 显式传 `readOnly:false`，不依赖缺省。验证：共享 resolver 参数化测试 + 各页组件断言，逐项记录上下文。
- [ ] 7.2 建立删除专项矩阵：`failed` 可删；`paused` 可删；`online/offline` 可删；`building/creating/starting/stopping/restarting` 不可删；`pausing/unpausing` 本地 pending 不可删；`host_offline/host_maintenance/status_unknown/unknown/空` 不可删；`readOnly=true/缺失/非法` 或权限失效时不可删且 loading 不覆盖；POST 403/409/超时/业务失败不伪造成功；`delete.visible=false` 不授权 leave。验证：纯函数与页面测试均覆盖，并注明 `pausing/unpausing` 是本地保守门而非后端拒绝。
- [ ] 7.3 建立长期专项矩阵：`is_long_term` true/false 正确选向，缺失/非法只禁用两个长期动作且删除/启停不受影响；手工超限 `can_enable=false` 不能启用；冻结未解除 `can_disable=false` 不能取消；已确认解冻、`freeze_state` 残留但 `can_disable=true` 可取消；DTO 缺失/坏布尔/坏时间/方向 reason 矛盾禁用；409/超时/重读失败不伪造成功或终态。验证：纯函数 + 五个页面测试覆盖。
- [ ] 7.4 失败/恢复专项：解冻失败/超时清 pending 与 loading 并权威重读；启动验证真实 `failed` 保持；HTTP 超时不伪造终态；`ready_identity`/action_ref 不被 Web 用于推断成功、失败或删除代际。验证：组件测试和源码审查覆盖，断言无 catch 中写 `paused`/`online`、无 action_ref 删除判据。
- [ ] 7.5 实现提交前重解析：所有写动作在真正调用 API 前重解析；有 confirm 的在用户点击确认时，长期勾选等直接提交的在 API 前，用提交时最新的容器状态、权限/角色、DTO 与 pending 重新调用 `resolveContainerActions`。不得复用打开弹窗或首次选择时的 action 快照；若重解析禁用/隐藏或 readOnly/上下文非法，则不调用 API，并更新原因/关闭确认框。util 不新增 IO 或 preflight API。验证：五个页面组件测试分别覆盖“打开/初次选择时可用、提交前角色/状态/DTO/pending 变化”分支，断言 API 未被调用且原因已更新。
- [ ] 7.6 源码审查确认只有一套规则：页面不再直接使用 `canSetLongTerm`、旧配额/磁盘长期门、`getRoleActionSet` 或各页硬编码删除状态；`resolveContainerActions` 是唯一动作资格入口，`ContainerDetailModal` 未被新增长期开关；共享 7 动作无 leave，无 `delete.visible` 推导 leave；readOnly 门禁覆盖 LT/unpause。验证：定向 grep + review，逐文件记录。
- [ ] 7.7 运行定向测试与全量 `npm test`，再运行 `npm run build`；保存输出，失败项逐条定位，不以 lint 债务或环境 warning 代替业务验证。验证：测试与构建通过，既有 123 项基线无回归。
- [ ] 7.8 运行 `openspec validate align-container-action-eligibility-and-recovery --strict`、`openspec status --change ...`，确认 4/4 artifact，并逐项勾选本变更已完成任务、附测试/评审证据；不得以“提案阶段未勾选”作为实施完成后的验收条件。再运行 `git diff --check`、检查变更内链接与 QUESTIONS 计数/索引。验证：strict 无 ERROR/非环境 warning；任务勾选与实际交付一致；Q21 索引与当前实现/验收证据一致（实施完成即更新，不沿用提案阶段状态）；Q58/Q71/Q72/Q73 退清单保留，Q67/Q69/Q70 未被声称修复。
- [ ] 7.9 最终 diff 的业务代码仅限本变更列出的 Web 容器动作文件与测试；不含 Ctrl/Node 实现、正式 specs/archive、报告、commit/push 或 skills。验证：`git status`/`git diff --check` 与变更影响清单逐项核对，确认 Q67/Q69/Q70 未被顺手修改。

## Workflow follow-up

- 本提案当前未实施：tasks 保持未勾选，Global QUESTIONS 的 Q21 索引记录“提案，未实现”。这是当前阶段记录，不是实施完成后的永久验收。
- 实现完成并通过评审后，逐项勾选 tasks、保存测试/构建/评审证据，并将 Q21 索引与实际实现状态同步（已实现则改状态与证据，部分实现则保留准确残余）；不得把提案阶段状态当作实现完成。
- 实现完成并通过评审后，按仓库流程归档本变更，将 delta 合并到五个既有页面主规格。
- 归档前再次核对 Ctrl/Node 对应提案实际状态；不把删除守卫或长期资格误报为已经修复。
