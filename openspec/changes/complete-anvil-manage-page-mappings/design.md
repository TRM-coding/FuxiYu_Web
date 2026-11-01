# Design

## 本轮暂缓边界与已知缺口

Global Q84 记录权限组重复 ID 未去重；Global Q85 记录 Home paused 详情弹窗未传 `onUnpause`，导致卡片可解冻而详情无解冻入口。原 36 项规划不删除；本轮把 paused 详情失败从 online 同源测试拆为独立未来 locator，总计划 37 个唯一测试 = 35 个已创建（online 同源现有覆盖 + 6 项已补真实断言）+ Q84/Q85 两个未创建。当前 35 个已创建测试的 online/既有断言已核实并已全绿；已按批准方案从 online 函数移出 Q85 paused 红片段，Q85 future 仍未创建，外部红证据已保存。026 独立复审已 APPROVE 当前 37 项计划；可以继续官方 verify 与 root 侧主侧车维护，但不在本批归档。应用、API、权限规则与主规格保持原样。

## Context

本 change 覆盖五个既有 capability：`frontend--page-home`（9 个 Requirement、21 个 Scenario）、`frontend--page-machine-detail-page`（6 个 Requirement、14 个 Scenario）、`frontend--page-manage-machine`（7 个 Requirement、15 个 Scenario）、`frontend--page-manage-user`（7 个 Requirement、13 个 Scenario）与 `frontend--page-manage-user-in-table`（6 个 Requirement、12 个 Scenario），合计 35 个 Requirement、75 个 Scenario。

五份主规格已经存在并经过历史实现与修复。`openspec/specs/<capability>/test-plan.md` 侧车仍保留历史“待复核/部分覆盖”台账，不能作为本轮权威映射；本 change 只读侧车，不修改侧车。原尝试 `24714ee0` 在写入前已明确 `quota_exceeded`，没有留下本轮可审查的 proposal、spec、design 或 test-plan；本 change 不继承未落盘的判断。独立 fresh review `026fb1ba` 先给出 REVISE，作者按 Blocking/Non-blocking 修正后，026 复审已 APPROVE；不修改 review、主规格、侧车或业务实现。父级已读修订与真实源码并进一步裁定：Home ADD 不要求新增成功后自动关闭人员弹窗；MachineDetail 只要求“修复连接”Scenario 的无权限隐藏，不要求额外的 edit/delete/view 前端装配门；ManageUser 角色入口归入既有 Global Q38，不另造新 Q。本版据此收口，不扩代码、接口、字段或权限范围。工作区另有 Web auth/detail/create-deleted active changes；本 change 不读取、不修改、不交错它们的文件。

测试框架为 Vitest + Testing Library（jsdom）。现有页面测试主要 mock `container_api`/`machine_api`/`user_api`/`rbac_api` 等模块，真实页面状态机仍被渲染和交互；API 边界由 `containerApiSuccess.test.js`、`containerApiCredentials.test.js`、`credentialResponse.test.js`、`showErrorModalMap.test.js` 等真实 fetch/真实弹窗断言补齐。计划缺口集中到 `src/test/AnvilManagePages.test.jsx`，使用真实目标页面/组件、真实用户交互和 API 替身。

## Goals / Non-Goals

**Goals:**

- 用 5 份 MODIFIED no-op delta 逐字保留五个 capability 的全部 Requirement 与 Scenario，不改已定业务语义。
- 为 75 个 Scenario 建立可复核的 Test/check 映射：能从测试代码核实断言的标 `[X]`，真实缺口标 `[ ]` 并指向专属新测试文件。
- 让 fresh reviewer 能逐行核对：Scenario、测试文件、测试名、Assertion scope、Coverage note 与缺口测试计划。
- 把 Web 可验证行为与 Ctrl/Node/DB/WSS 跨仓职责分开，避免用反射、源码字符串或运行台账制造覆盖。

**Non-Goals:**

- 不修改主规格、侧车、review、tasks、业务源码、既有测试、共享 fixture、依赖、配置、CI、DB 或任何其他 active change。
- 不修正实现、不弱化规格、不把静态源码字符串或反射当作行为通过。
- 规划产物只含 proposal/design/specs/test-plan；测试文件、apply、commit/push 不在本次规划产物内。
- 不声称真实浏览器像素、真实 Ctrl 后台、真实 Node 时序、真实 DB 或 WSS 已验证。

## Decisions

1. **Delta 采用逐字 MODIFIED no-op。**
   从五份主规格的 `### Requirement:` 到第一个 `## Source references` 之前完整复制，只加 `# Spec Delta` 与 `## MODIFIED Requirements` 外壳。Requirement 名、Scenario 名、WHEN/THEN 和正文约束零改写；原因是本 change 只补测试映射，任何行为改写都会制造新的规格变更并需要独立实现决策。

2. **Canonical 映射放在 change 的 `test-plan.md`，不写运行台账。**
   映射使用中文 Requirement/Scenario 名称和中文 Assertion scope；只记录测试位置、断言范围与必要的覆盖边界，不记录时间戳、运行结果、通过数、状态字段或 per-entry evidence。main spec 不插入测试说明；sidecar 留待官方 sync 后由 `anvil-test-plan` 维护。

3. **`[X]` 只代表映射已从测试代码核实，不代表执行通过。**
   现有测试必须能读出对应 THEN 的实际断言；仅名称相近、仅覆盖前置条件或仅做源码字符串匹配的行不标 `[X]`。一个测试可以服务多个 Scenario，但必须在 Coverage note 说明共享范围和缺失部分。对于主规格明确要求“源码不再引用/不再存在”的负向清理 Scenario，源码检查就是该 Scenario 的直接检查，标 `[X]` 时只声明“静态符号不存在”，不把它升级成行为通过。仅断言 `containerActions` helper 的用例只证明纯函数，不证明页面接线；页面级结论必须有真实页面 DOM 断言。

4. **缺口集中规划到 `src/test/AnvilManagePages.test.jsx`，共 37 个唯一 planned test。**
   当前文件已创建 35 个，35 个的 online/既有断言映射已核实为 `[X]` 并已全绿；Q84/Q85 两个 locator 未创建。已按批准方案从 online 函数移出 Q85 paused 红片段，Q85 future 仍未创建。计划测试使用真实 `Home`、`MachineDetailPage`、`ManageMachine`、`ManageUser`、`ManageUserInTable`、`TableComponent`、`EditUserModal`、`ContainerDetailModal`、`showErrorModal` 与真实路由/Provider；只 mock 外部 API 模块、受控 fetch、权限快照、心跳定时器和 Three 装饰组件，不 mock 目标页面/目标状态机/整个共享 resolver。`showErrorModal` 在错误呈现类缺口里保持真实，断言弹窗中文与数值；`TableComponent` 在移动/表格类缺口里保持真实，用 `window.matchMedia` 驱动移动分支，断言真实 DOM 而不是源码字符串。

5. **缺口按可观察行为分组（planned/created/confirmed/pending）。**
   - Home 14/13/13/1：`/index` 路由/身份、restart 受理中间态、ADD ADMIN 受理后显式关闭人员弹窗仍展示同一凭据、ADD 失败脱敏/无密码/无成功/不插行、成员守卫中文原因、ROOT 部分完成权威刷新、ROOT 拒绝的通用错误与角色保持、静默刷新角色/磁盘、online 卡片/详情可观察同源、ROOT 交接自动关闭/凭据（N+1、普通角色、关闭日志）、解冻失败重读、真实 COLLABORATOR 角色与 `deleteContainer` 未调用、paused 已长期行取消门禁、Q85 paused 详情解冻独立回归（未创建）。
   - MachineDetail 8/8/8/0：路由 DB id/修复入口权限门、显式清空端口、维护开关顺序与轮询独立、修复连接成功/失败/无权限、添加宿主机描述与最小信任锚、422 与 400 的真实中文错误呈现、320/390/768/1440 与可选指标缺失的真实 DOM/控件边界。
   - ManageMachine 4/4/4/0：路由 bypass 守卫、仍有容器时删除机器的计数/禁用、静默刷新机器/容器字段并保留当前页（含 CPU/内存/GPU 展示）、真实 paused 卡片的 unpause 页面契约。
   - ManageUser 9/8/8/1：路由 bypass 守卫、权限组整组替换（Q84 未创建）、重置密码/删除用户只走用户 API、离线解绑中文原因、静默刷新用户/容器字段并保留当前页（含磁盘限额与本用例 page_size=4）、ADMIN/manage operator 的 start/stop 真实页面矩阵、跨页面 online/ROOT 共享动作、paused 已长期行取消门禁、容器标题不选中用户行。
   - ManageUserInTable 2/2/2/0：移动端真实 `TableComponent` 卡片/展开、paused 已长期行按父级 `disabled/reason` 真实渲染。

6. **Home 的 `readOnly` 边界按共享 resolver 处理。**
   Home 页面当前固定传 `readOnly: false`，因此“readOnly 缺失/非 boolean/true 时禁用”不能在本页面真实触发；该约束由 `containerActions` 共享纯函数的真实断言覆盖，Home 页面只断言缺失权限时删除隐藏且不调用删除 API。计划不伪造 Home 的 readOnly 分支。

7. **MachineDetail 的响应式场景区分“静态 CSS 契约”“jsdom DOM 接线”与“真实视口行为”。**
   `DetailPagesLayout.test.js` 只读取 CSS 源字符串，能证明声明的 `min(460px, 100%)`、`min-width: 0`、`overflow-wrap` 与媒体查询存在，不能证明真实 `scrollWidth`、换行或点击可见性。计划把该静态检查标为 `[X]` 但在 Assertion scope 中限定为 CSS 契约，并为四个响应式 Scenario 规划真实组件 DOM/控件 locator；这些 locator 只断言文本/控件存在与可调用、未知占位、无补充请求，不声称单列、换行、无溢出或 `scrollWidth`。真实像素边界在 Coverage note 中留给浏览器验收，不用 jsdom 的 0 值冒充通过。

8. **跨仓与构建边界显式标注。**
   Ctrl 的守卫/组校验/自锁、Node 的证书/首连、DB 与 WSS 不在 Web 测试可断言范围；映射只验证 Web 请求体、展示、错误降级、轮询/分页与本地状态。`npm run build` 是精确命令，本 plan 只用它确认构建完成与 `dist` 产物存在；`React.lazy` 页面 chunk、three 分包与具体 Rollup 警告清单属实现上下文与验收观测，不由该命令自动断言，也不把源码里的 `lazy` 或 `manualChunks` 字符串当作构建通过。

9. **父级边界收口与待记录差异（只读报告）。**
   - **Home ADD 凭据生命周期（已收口，非缺陷）**：主规格 `openspec/specs/frontend--page-home/spec.md:32` 说“人员弹窗关闭过程中仍展示同一个受控密码弹窗”，Scenario `spec.md:38` 说“人员弹窗关闭后仍展示”；两者都没有要求新增成功后必须自动关闭人员弹窗。`src/components/EditUserModal.jsx:95-100` 的 ADD 分支没有 `onClose()` 本身不是违规；`src/pages/Home.jsx:64,549-554,1173-1177` 把凭据弹窗状态与人员弹窗关闭状态分开。计划让 ADD 规划测试在受理后通过真实 `EditUserModal` 的完成/关闭控件显式关闭人员弹窗，再断言同一个 `CredentialModal` 仍显示该项；不模拟业务自动关闭，不预判失败。ROOT 的自动关闭路径由 `test_home_root_handover_credential_modal_after_people_close` 独立验证；只有显式关闭后凭据确实丢失，才作为父级 Global 缺口报告。
   - **ManageUser 角色入口（已归入 Q38）**：主规格 `openspec/specs/frontend--page-manage-user/spec.md:20` 正文要求“容器角色变更和解绑经对应服务 API”；`src/pages/ManageUser.jsx:10-13` 只导入 `removeCollaborator`，没有 `updateRole` 或角色变更控件。`container_api.updateRole` 服务器方法仍存在并被 Home/详情使用，缺的是 ManageUser 客户端入口，不是服务器方法缺失。父级已将该正文缺口归入既有 Global Q38（`FuxiYu_Global/QUESTIONS.md:85-89` 记录三处协作者编辑 UI 与状态/磁盘文案统一），不另造新 Q，不造不存在入口的通过测试；本页未实现事实在 Coverage note 如实保留；原 36 项规划不删减，增加 Q85 后总 37 个唯一 planned，其中 35 个已创建、Q84/Q85 未创建。
   - **Home paused 详情解冻（Q85，真实业务差异）**：主规格 `specs/frontend--page-home/spec.md:129-132` 要求同一容器/状态/权限下卡片与详情弹窗的删除、启停、解冻与长期结论一致。`src/pages/Home.jsx:1147-1158` 只向 `ContainerDetailModal` 传 `actions`，未传 `onUnpause`；`src/components/ContainerDetailModal.jsx:96,165-171` 要求 `onUnpause` 才能渲染「解冻容器」。因此 paused 卡片显示可用“解冻”，详情没有该按钮，只显示冻结提示。父级已登记 Global Q85；本轮不修 app，保留原 online 同源测试，另规划未创建的 `test_home_paused_detail_exposes_same_unpause_action_as_card`，不改成“期望按钮缺失”或弱化预期。完整红证据在外部 `Q85-paused-detail-current-failing.test.jsx.txt` / `Q85-paused-detail.raw.log`。
   - **MachineDetail 方法能力与修复入口门（已收口，非缺陷）**：主规格 `openspec/specs/frontend--page-machine-detail-page/spec.md:11` 只规定读取 `machine:view`+资源权、修改 `machine:manage` 的方法能力；只有“确认后修复连接”Scenario 的 `spec.md:32` 明确“无权限不显示入口”。`src/pages/MachineDetailPage.jsx:442-447` 的修复连接门符合该 Scenario；`:449` 删除、`:459` 编辑无条件渲染并没有被显式 SHALL 要求隐藏。计划只断言修复入口门，不要求额外前端 edit/delete 装配门，也不把 Ctrl/后端的权限验证冒充成页面隐藏。
   - **MachineDetail 读取侧（边界记录，非缺陷）**：`src/routes/index.jsx:92` 直接挂载页面，页面没有独立的前端 `machine:view`/资源权门；主规格没有明确的前端读取隐藏 SHALL，读取由入口与 Ctrl/后端作最终裁决。计划不伪造该门，并在 `test_machine_detail_route_uses_path_id_and_repair_permission_gate` 的 Coverage note 记录边界。
   - **ManageUserInTable 父级缺失 `longTerm`**：当前组件在父级完全不传结果时不渲染长期控件（比“未知禁用”更保守）；父级传 `stateKnown:false` 时按未知禁用并显示父级原因。计划按后者对账，并把前者作为额外防御边界说明，不把它写成规格要求的“禁用”。
   - **ManageMachine 删除计数失败**：删除机器确认依赖 `listAllContainerBrefInformation` 计数；计数失败时实现选择不拦截、由后端 409 兜底。计划覆盖成功计数与禁用，不把计数失败伪造成“已拦截”。

10. **Review 026fb1ba 的事实修正。**
   - 添加宿主机弹窗确有 `machine_description` 的 `Input.TextArea`（`src/pages/ManageMachine.jsx:1556-1558`），主规格 `openspec/specs/frontend--page-machine-detail-page/spec.md:50` 也列出“描述”；计划断言该输入存在、填写值进入 `registerMachine`、留空时为空串，并仍断言不含 `max_*`/硬件容量/默认策略字段。
   - 机器基本信息保存先 `updateMachine` 再按维护值变化调用 `setMachineMaintenance`（`src/pages/MachineDetailPage.jsx:117-126`）；计划断言两次调用的参数与顺序，不写“只调用 `setMachineMaintenance`”或“只允许一个 API”。
   - `EditUserModal` 确有 `accounts` 状态（`src/components/EditUserModal.jsx:30,71`）；新增失败计划断言真实 `accounts` 列表/计数不变、无密码、无成功提示，现有 `[X]` 仅收窄到“未回调凭据 + 调用错误弹窗”，不再写“组件不持有账号列表”。
   - `src/test/HomeEligibility.test.jsx:155-175` 的 fixture 是 `user_id:9` ROOT 而当前 `userId:1`，实际覆盖“缺失账号角色”，不是 COLLABORATOR，也未断言 `deleteContainer` 未调用；计划补真实 COLLABORATOR 页面测试与删除 API 未调用断言。
   - `src/test/ManageMachineDetailRefresh.test.jsx:301-306` 只断言 `showErrorModal` 被调用；失败原因参数由 `src/test/ManageMachineEligibility.test.jsx:263-297` 的 `message.message === 'unpause failed'` 断言，两处合并覆盖，不把页码用例写成原因文案已断言。ManageUser 的 unpause 失败用例 `src/test/ManageUserEligibility.test.jsx:253-281` 已有参数断言，scope 明确写出。
   - `src/test/ManageMachineEligibility.test.jsx:474-487` 未断言 unpause；`:547-571` 的 resolver 只证明 helper。计划在真实 paused 卡片增加 unpause 页面断言，并把 `containerActions.test.js` 的 paused 长期取消只当 helper 证据，在 Home/ManageUser/ManageUserInTable 补真实 DOM。
   - `src/test/ManageMachineDetailRefresh.test.jsx:121-122` 与 `src/test/ManageUserDetailLink.test.jsx:105-108` 的详情页是 `<div data-testid>` 桩；计划措辞改为“路由路径匹配（页面为桩）”，不称真实详情页落点。
   - `src/test/containerApiSuccess.test.js:33-39` 的 `success=false` 只断言 rejection/body，没有 status/route；计划 scope 收窄为“success=0 断言 status/body/route；success=false 只断言 rejection/body”，不用同一句话覆盖两者。
   - 四个响应式规划 locator 在 jsdom 中只断言文本、控件存在/可调用、未知占位与无补充请求；不声称单列、换行、`scrollWidth` 或无溢出，布局结论留给真实浏览器。
   - 权限组去重测试必须实际构造重复输入（重复 matrix group id 或重复 `group_ids`）；当前 `ManageUser.jsx:520-545` 的 `selectedIds` 直接来自 matrix 映射，未见到 Set/去重。实际重复输入返回 `[2,2,5]` 而非 `[2,5]`，已登记 Global Q84；该 locator 保留 `[ ]` 且未创建，不改 app、不弱化规格、不宣称 37 完成。

## Risks / Trade-offs

- **父级边界已收口。** Home ADD 不要求自动关闭，规划测试显式关闭人员弹窗后验证同一凭据弹窗，不预判失败；只有显式关闭丢凭据才报告。ManageUser 角色入口归入既有 Q38，不新 Q、不造通过测试。MachineDetail 只要求修复连接 Scenario 的无权限隐藏，不要求额外 edit/delete/view 前端门；后端权限验证不冒充页面隐藏。其余独立测试不因这些边界阻塞。
- **helper 不等于页面。** `containerActions.test.js` 的 paused 长期取消、resolver 的 unpause 只证明纯函数；页面门禁必须另有真实 DOM，本 plan 已在 Home/ManageUser/ManageUserInTable/ManageMachine 补规划 locator。
- **jsdom 无法确认真实像素。** 320/390/768/1440px 的 `scrollWidth`、遮挡与重叠只能由真实浏览器证据补足；带布局断言的 Scenario 以既有 CSS 契约与真实 DOM/控件断言区分 35 个已创建已确认与 Q84/Q85 两个未创建行，并在 Coverage note 说明像素边界，不伪造 `scrollWidth`。
- **跨仓契约不可在 Web 仓闭环。** Ctrl 守卫/组校验、Node 证书、DB 写入与 WSS 只能标注边界，不能在本仓宣称已验证。
- **既有页面测试多为模块级 mock。** 它们可证明页面状态机，但不能证明真实 HTTP 边界；真实边界由 `containerApiSuccess.test.js`、`containerApiCredentials.test.js`、`credentialResponse.test.js` 与 `showErrorModalMap.test.js` 补足，plan 必须区分两者。
- **既有静态源码检查较多。** `containerActionSourceReview.test.js`、`ManageMachineDetailRefresh.test.jsx` 与 `ManageUserDetailLink.test.jsx` 中的源码检查只用于主规格明确要求的“源码不再引用旧弹窗链”或负向“无删除入口”约束，不用于行为场景。
- **Review 失效规则。** 本次按 `026fb1ba` 修改 locator、Assertion scope 与 Coverage note 后，026 复审已 APPROVE；批准后的 Q85 拆分与状态更新不改变 locator/scope/note 语义。
