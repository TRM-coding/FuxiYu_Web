# Design

## Context

本 change 覆盖三个既有 capability：`frontend--page-create-container`（7 个 Requirement、21 个 Scenario）、`frontend--page-create-image`（9 个 Requirement、15 个 Scenario）与 `frontend--page-deleted-containers`（15 个 Requirement、50 个 Scenario），合计 31 个 Requirement、86 个 Scenario。三份主规格已经存在并经过历史实现与修复；本 change 以主规格和实际测试代码为唯一映射依据，不把旧侧车当权威，也不修改旧侧车。

旧尝试 `e3075c5a` 在写入前已明确 `quota_exceeded`，没有留下可审查的 proposal、spec、test-plan 或测试文件；本 change 只补齐规划，不继承未落盘的判断。工作区另有 Web auth/detail active changes；本 change 不读取、不修改、不交错它们的文件。

测试框架为 Vitest + Testing Library（jsdom）。现有页面测试主要 mock `container_api`/`image_api` 等模块，真实页面状态机仍被渲染和交互；API 边界由 `containerMountUsageApi.test.js`、`containerApiCredentials.test.js`、`credentialResponse.test.js` 等真实 fetch 断言补齐。计划缺口集中到 `src/test/AnvilCreateDeleted.test.jsx`，使用真实目标页面、真实用户交互和 API 替身，不 mock 目标页面本身。

## Goals / Non-Goals

**Goals:**

- 用 3 份 MODIFIED no-op delta 逐字保留三个 capability 的全部 Requirement 与 Scenario，不改已定业务语义。
- 为 86 个 Scenario 建立可复核的 Test/check 映射：能从测试代码核实断言的标 `[X]`，真实缺口标 `[ ]` 并指向专属新测试文件。
- 让 fresh reviewer 能逐行核对：Scenario、测试文件、测试名、Assertion scope、Coverage note 与缺口测试计划。
- 把 Web 可验证行为与 Ctrl/Node/DB/WSS 跨仓职责分开，避免用反射、源码字符串或运行台账制造覆盖。

**Non-Goals:**

- 不修改主规格、侧车、review、tasks、业务源码、既有测试、共享 fixture、依赖、配置、CI、DB 或任何其他 active change。
- 不修正实现、不弱化规格、不把静态源码字符串或反射当作行为通过。
- 不在本阶段创建 `AnvilCreateDeleted.test.jsx`、不执行 apply、不 commit/push。
- 不声称真实浏览器像素、真实 Ctrl 后台、真实 Node 时序、真实 DB 或 WSS 已验证。

## Decisions

1. **Delta 采用逐字 MODIFIED no-op。**
   从三份主规格的 `### Requirement:` 到 `## Source references` 之前完整复制，只加 `# Spec Delta` 与 `## MODIFIED Requirements` 外壳。Requirement 名、Scenario 名、WHEN/THEN 和正文约束零改写；原因是本 change 只补测试映射，任何行为改写都会制造新的规格变更并需要独立实现决策。

2. **Canonical 映射放在 change 的 `test-plan.md`，不写运行台账。**
   映射使用中文 Requirement/Scenario 名称和中文 Assertion scope；只记录测试位置、断言范围与必要的覆盖边界，不记录时间戳、运行结果、通过数、状态字段或 per-entry evidence。main spec 不插入测试说明；sidecar 留待官方 sync 后由 `anvil-test-plan` 维护。

3. **`[X]` 只代表映射已从测试代码核实，不代表执行通过。**
   现有测试必须能读出对应 THEN 的实际断言；仅名称相近、仅覆盖前置条件或仅做源码字符串匹配的行不标 `[X]`。一个测试可以服务多个 Scenario，但必须在 Coverage note 说明共享范围和缺失部分。

4. **缺口集中规划到 `src/test/AnvilCreateDeleted.test.jsx`，共 44 个 planned tests。**
   其中 42 个已实现；2 个长期超限 locator 属于 Global Q83 已知缺口，最终文件不包含对应函数。测试 locator 使用真实 `CreateContainer`、`CreateImage`、`DeletedContainers` 组件，真实 `PermissionProvider`/路由、真实 `showErrorModal` 和真实用户交互；只 mock 外部 API 模块或受控 fetch、身份输入，需要参数断言时对真实错误弹窗 spy。不 mock 目标页面、目标状态机或目标用量逻辑，不读取源码字符串作为断言。文件内使用本地 helper，不新增共享 fixture。

5. **缺口按可观察行为分组。**
   - create-container 16 个：入口路由与身份快照、共享内存收敛后的 payload、ready 模板过滤与失效清空、GPU_LIST/详情限额 payload、受理成功反馈、无额外写请求、机器入口预选与同一凭据弹窗、Esc/路由离开清空密码、四行配额标签、数字输入与滑条同口径、shared>MEMORY 不发出超限 payload、403 保留身份、旧响应成功提示、console 无 secret、缺失/非数组凭据结构、畸形 accepted 的通用错误文案。
   - create-image 3 个：`/index/images` 入口、新建分支实际字段、删除动作。
   - deleted-containers 25 个：`/admin/deleted-containers` 入口与身份、Mount 保留/升级清理/已清理状态、长期超限中文原因、长期超限后原记录重试、同页刷新保持页码与页大小、最后一页回退有界、预算耗尽后手动刷新、1440/768/769 列头与字段一致、桌面展开关闭无重复详情、390px 卡片字段值、390px 展开资源/端口/删除来源、390px Mount 真实复制、390px 用量成功值/无上限轨道/非成功反向、390px loading 无 0 B/测量时间/已清理状态、复制失败后操作与用量可用、移动端确认清理/恢复、移动端 pending 翻页取消、移动端第二页移除 page-one、移动端旧展开 key 的迟到响应、移动端最后一页回退、统计 pending 期间动作不被阻塞、旧流程迟到响应不覆盖当前页、过期 usage 响应丢弃、有上限成功行的测量时间、template 分支重新提交。

6. **deleted-containers 的用量进度只消费成功样本与对应机器比较上限。**
   进度条上限来自列表记录已有的 `mount_usage_limit_bytes`（对应机器的比较上限），只有 `pending=false`、`error=null`、`bytes` 为非负整数的成功样本进入进度分支；pending、error、缺项、已清理、无挂载继续沿用既有文案与状态。测试 locator 不新增接口字段、不自行读取机器详情、不把缺省上限伪造成 0% 或百分比。

7. **跨仓与构建边界显式标注。**
   Ctrl 的 du 执行、Node 的目录扫描、审计写入、DB 与 WSS 不在 Web 测试可断言范围；映射只验证 Web 请求体、展示、错误降级、轮询取消与分页。`npm run build` 是精确命令，用于确认构建完成与页面级/Three 异步 chunk 产物；不把源码里的 `lazy` 或 `manualChunks` 字符串当作构建通过。

8. **已澄清的方法权限与文案边界。**
   - `frontend--page-create-image`：列表 API 的 `image:view` 与整个编辑管理页的 `image:edit` 入口可并存；`src/layouts/MainLayout.jsx` 与 `src/pages/CreateImage.jsx:449-455` 保留既有管理入口。主规格没有要求只具备 view 的用户也能进入完整管理页；本计划不新增只读管理页，逐项核对现有编辑、删除方法门和资源范围。
   - `frontend--page-create-container`：`container:create` 由后端提交守卫最终判定。页面未提供独立前端装配门，主规格也未明确要求新增此门；本计划前端断言限于路由、身份快照与 ROOT 选择器，不把后端权限断言冒充页面提前拦截。
   - `frontend--page-deleted-containers`：恢复 `long_term_limit_reached` 时页面当前只显示 Ctrl 英文 message 与通用 409 中文提示，未显示“已达到长期容器上限”的中文映射；该真实差异已登记 Global Q83，父已接受。计划不修 app/规格，两个 planned locator 保持 `[ ]`，最终文件不含对应函数。
这些边界已明确，不再作为待定业务差异，不新增 UI、接口或权限策略。

9. **CreateImage 新建 payload 固定六字段，范围/名单走既有编辑分支。**
   父已明确：`openspec/specs/frontend--page-create-image/spec.md:19` 的 `valid_range`/`grants` 属于整页已有镜像编辑能力，由既有编辑分支与独立的 share/audit 接口承担（`src/pages/CreateImage.jsx:331-340`、`:575-578`），不是新建请求必须新增的 payload 字段。`createImage` 新建调用仍只发 `name`、`description`、`status`、`base_image`、`dockerfile_body`、`entrypoint`（`src/pages/CreateImage.jsx:355-362`）；计划不新增分享流程、字段或测试分支。

10. **shared_memory > MEMORY guard 只做代码级 manual check。**
    正常 UI 由 `computeQuotaForMachine`/`useEffect` 把共享值 clamp 到 `min(max_shared_gb, MEMORY)`（`src/pages/CreateContainer.jsx:281-297`、`:381-400`），提交前 `collectQuotaViolations`（`:409-425`）与 payload clamp（`:443-457`）再收敛；正常用户路径无法形成 `shared_memory > MEMORY`，guard 的提示分支只作防御，黑盒不可达。UI locator 只断言可达 clamp 与不发出超限 payload；manual check 记录该防御分支，不改 UI/业务。

## Known Gap

Global Q83（已登记 e9aef7c）：`src/pages/DeletedContainers.jsx:233-237` 的恢复失败 catch 只把 `message`/`status`/`route` 传给 `showErrorModal`，未传已有的 `err.error_reason`；`long_term_limit_reached` 的 resurrect 路由中文映射（`src/utils/showErrorModal.jsx:159`）因此不生效，真实弹窗只有 Ctrl 英文 message 与通用 409 中文提示。对应两个 planned locator 保持 `[ ]`，最终测试文件不包含这两个测试函数，未使用 skip/xfail 或弱化断言。父已接受该真实差异，Global 与 Git 由父负责；本 change 不修 app/规格。

## Risks / Trade-offs

- **缺口补测可能暴露真实实现问题。** 按已澄清的页面、API 与跨仓边界断言；若出现新的具体规格违约，报告父代理登记 Global QUESTIONS，不把普通方法权限分层或同义文案重新包装成待定业务。
- **jsdom 无法确认真实像素。** 320/390/768px 的 `scrollWidth`、遮挡与重叠只能由真实浏览器证据补足；带布局断言的 Scenario 以既有 DOM/控件断言标 `[X]`，并在 Coverage note 说明像素边界，不伪造 `scrollWidth` 或 CSS 正则通过。
- **跨仓契约不可在 Web 仓闭环。** Ctrl guard、du、Node 扫描、DB 写入与 WSS 只能标注边界，不能在本仓宣称已验证。
- **既有页面测试多为模块级 mock。** 它们可证明页面状态机，但不能证明真实 HTTP 边界；真实边界由 `containerMountUsageApi.test.js`、`containerApiCredentials.test.js` 与计划文件补足，plan 必须区分两者。
- **Review 失效规则。** 任何 Requirement、Scenario、locator、Assertion scope 或 Coverage note 变化都必须重新 review；外部运行日志变化不使 review 失效。
