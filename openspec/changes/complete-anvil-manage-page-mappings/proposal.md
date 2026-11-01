# Proposal

## 本轮已知缺口与审查状态

Global Q84 已记录权限组重复 ID 未去重的防御性缺口；Global Q85 已记录 Home paused 详情弹窗未传 `onUnpause`、卡片与详情解冻动作不一致的缺口。原 36 个规划测试不删除，本轮把 paused 详情失败从 online 同源测试拆为独立未来 locator，总计划增至 37 个唯一测试：35 个已创建（online 同源现有覆盖 + 本轮 6 项真实断言已核实），Q84/Q85 两个未创建。不把 35 created 静默改 34，不声称 37 全完成。按用户决定本轮不修业务；026 独立复审已 APPROVE 当前 37 项计划；Q85 拆分已执行，35 个 created 测试全绿。DSH 余额不足期间不执行主侧车同步或归档，保留 Q38 等已有边界；不宣称全覆盖。

## Why

`frontend--page-home`、`frontend--page-machine-detail-page`、`frontend--page-manage-machine`、`frontend--page-manage-user`、`frontend--page-manage-user-in-table` 五个 capability 的主规格已经存在，合计 35 个 Requirement、75 个 Scenario；但主规格侧车仍保留历史“待复核/部分覆盖”台账式内容，不能作为本轮可逐行核对的 Scenario→Test/check 规划。原尝试 `24714ee0` 在写入前已明确 `quota_exceeded` 终态，没有留下本轮可审查的 proposal、specs、design 或 test-plan；本 change 由官方 fallback 独占补齐，只做规划，供独立 fresh review 通过后再进入 apply。独立 review `026fb1ba` 先给出 REVISE，本版按该 review 的 Blocking、Non-blocking 与父级 Global 项修正事实、收窄既有 scope 并补足可测缺口；026 复审已 APPROVE。

## What Changes

- 为上述 5 个 capability 的 35 个 Requirement、75 个 Scenario 建立中文 canonical 的 `Requirement → Scenario → Test/check → Assertion scope → 可选 Coverage note` 对账规划。
- 每个 delta 以 `MODIFIED Requirements` 完整、逐字重述主规格原 Requirement 块；Requirement 名、Scenario 名、WHEN/THEN 与正文约束零变化，本轮不新增、不删除、不弱化任何业务要求，也不污染主规格业务。
- 从真实测试代码逐行核实断言：能证明该 Scenario THEN 的既有 locator 标 `[X]`；真实缺口标 `[ ]`，并集中规划到专属新测试文件 `src/test/AnvilManagePages.test.jsx`；test-plan 只记录映射，不记录 run/pass/fail 台账。当前唯一 planned test 为 37 个：35 个已创建且断言已核实，Q84/Q85 两个未创建；原 36 planned 不删减，增加项仅来自把 paused 详情失败从 online 同源测试拆为独立缺陷回归。具体 per-capability 计数见 design。
- 规划测试使用真实目标页面/组件、真实用户交互和 API 替身：Home 卡片与详情弹窗、ManageMachine/ManageUser 管理页、MachineDetailPage、ManageUserInTable 均不 mock 目标组件；不凭测试名、反射、源码字符串或 mock 调用次数伪造行为。仅断言 `containerActions` helper 的测试只作纯函数证据，不冒充页面接线。
- 按 review `026fb1ba` 修正事实：添加宿主机弹窗确有描述输入；维护保存先 `updateMachine` 再按变化调用 `setMachineMaintenance`；`EditUserModal` 确有 `accounts` 状态，新增失败需真实断言脱敏、无密码、无成功、不插行；Home 现有“COLLABORATOR”fixture 实为缺失账号角色，另补真实 COLLABORATOR 与 `deleteContainer` 未调用；ManageUser/ManageMachine 的 unpause 失败原因、共享契约 unpause 与 paused 长期取消均补页面级真实 DOM 或参数断言；`success=false` 的 status/route 未断言处收窄 scope；jsdom 响应式只断言 DOM/控件、不冒充像素布局。权限组去重实际重复输入得到 `[2,2,5]`（期望 `[2,5]`），归 Global Q84；Home paused 详情缺 `onUnpause` 导致卡片/详情解冻不一致，归 Global Q85，独立未来 locator 未创建。两者均不修 app、不 skip/xfail、不缩原目标。
- 单独核对 `containerActions` 统一门禁：冻结容器禁止取消长期、满限/磁盘达到既有阈值禁止设长期；同时覆盖用户管理入口的真实路由/守卫与表格视图、移动端/表格真实 DOM 交互、子容器分页与行操作不改变选中行。
- 父级边界已收口：Home ADD 不要求新增成功后自动关闭；规划测试在受理后显式关闭人员弹窗，再断言同一凭据弹窗仍展示，ROOT 自动关闭路径独立测试，不预判失败。MachineDetail 主规格只规定读取/修改方法能力，只有“修复连接”Scenario 明确无权限隐藏，不要求额外前端 edit/delete/view 门；计划只断言修复入口门，不把后端权限验证冒充页面隐藏。ManageUser 角色入口已归入既有 Global Q38，不另造 Q、不造不存在入口的通过测试，Coverage note 如实保留本页未实现。
- 若对账发现实现与规格实质矛盾，只在 planning 中报告父代理，不修改应用、不修改主规格、不弱化规格。
- 主规格、侧车、review、tasks、测试文件、共享 fixture、业务源码、依赖、配置、数据库、CI、hooks、skills、SSH、secrets 与 commit 本轮均不写入。

## Capabilities

### New Capabilities

<!-- 无新增 capability。 -->

### Modified Capabilities

- `frontend--page-home`: 仅补齐测试对账（9 个 Requirement、21 个 Scenario），Requirement 语义不变。
- `frontend--page-machine-detail-page`: 仅补齐测试对账（6 个 Requirement、14 个 Scenario），Requirement 语义不变。
- `frontend--page-manage-machine`: 仅补齐测试对账（7 个 Requirement、15 个 Scenario），Requirement 语义不变。
- `frontend--page-manage-user`: 仅补齐测试对账（7 个 Requirement、13 个 Scenario），Requirement 语义不变。
- `frontend--page-manage-user-in-table`: 仅补齐测试对账（6 个 Requirement、12 个 Scenario），Requirement 语义不变。

## Impact

- 规格：仅新增本 change 下的 `proposal.md`、5 个 `specs/frontend--*/spec.md`、`design.md`、`test-plan.md`。不改 `openspec/specs/**` 及其侧车。
- 代码：规划阶段零改动；后续 apply 仅新增 `src/test/AnvilManagePages.test.jsx`，不改既有测试、页面实现、路由或共享 fixture。
- 构建/依赖/配置：不改默认 schema、`openspec/config.yaml`、`vite.config.js`、`package.json`、CI 或 Git hooks；不读取 `.env`、APIKEY/PASSCODE、SSH 或生产凭据。
- 并行边界：不与既有 4 批 change 交错，不修改 `AnvilBasicPages.test.jsx` 或其它批次计划中的文件。
- 交付：本 change 只交付规划产物；commit/push 由父代理负责。
