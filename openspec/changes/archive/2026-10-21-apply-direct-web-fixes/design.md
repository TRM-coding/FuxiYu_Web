# 设计

## 背景

本变更承接第 1 轮 `review.md` 的 C1–C4/M1–M7 与第 2 轮 C5/M8–M11，目标是把 18 个 Web“无需决策”Q 收敛为可执行、可断言、可证据化的规划。当前仓库在 Node 26.8.1 下实测 `npm run lint` 为 329 errors / 20 warnings（38 个文件出现告警），且存在 11 处 `eslint-disable`；前端有 55 个测试文件，完整用例数以真实运行为准。以上数字是修订时诊断基线，不作为规格固化的历史指标，验收只认 0 errors / 0 warnings 与真实测试输出。

本阶段只修改 `proposal.md`、`design.md`、`specs/**`、`test-plan.md`、`tasks.md`；不修改源码、`review.md`、QUESTIONS、主规格或归档。第 2 轮结论为 `APPROVE_WITH_CHANGES`、`CHANGES_APPLIED: no`；应用 Required Changes 1–6 后，由同一审查者只定向复核这 6 项，通过前不进入 apply，也不把 test-plan/tasks 当作已生效门禁。

## 审查发现对应

| 发现 | 修订落点 |
| --- | --- |
| C1 Q28 局部 lint | `frontend--build` 的全仓 0/0 要求；tasks 8.3–8.5；Login/ManageMachine 死代码清理 |
| C2 Q29 缺失 | `frontend--build` 的测试入口、支持范围与 CI 要求；tasks 8.2/8.6 |
| C3 Q35/Q36 清理不完整 | `frontend--page-manage-machine`、`frontend--page-manage-user`、`frontend--page-login`、`frontend--page-docs`、`frontend--page-register` |
| C4 Q27 无规格 | `frontend--authentication` 的 `finally` 要求与三条路径场景 |
| M1 Q37 未枚举 | Register/Settings/TemplateManager/CreateImage 四张 route/error_reason 表 |
| M2 shared 非页面能力 | 删除 `specs/frontend--shared-error-display/`，映射并入页面，proposal/design 说明边界 |
| M3 Q52 只覆盖一半 | AnnouncementEditor 下拉分页、TemplateManager 分页/深链、Ctrl limit 边界 |
| M4 Q63 未选定 | CreateImage 固定选择 A：清空关键词、空词重取、选中新项、保留表单 |
| M5 Q59 实现自由度 | ManageUserInTable 固定父页 4 条、服务端 total、第二页第 5/6 条 |
| M6 Q23 组名错位 | Settings 固定 `容器清理`、`已删除容器` 与完整顺序 |
| M7 Q69 scope creep | ManageMachine 只保留解冻，删除“其他容器操作”，补切页竞态 |
| C5 主规格仍要求旧弹窗 | ManageMachine/ManageUser delta 各补同名 `MODIFIED Requirements` 完整块，保留原场景名并删除弹窗父回调契约 |
| M8 公告详情请求乱序 | AnnouncementEditor 的机器/容器独立选择与各自列表/详情上下文保护，新增 `test_q22_announcement_stale_detail` 与 `test_q22_announcement_unmount_no_apply` |
| M9 验证码生成失败漏映射 | Register `/request_register_code` 增加 `code_creation_failed`，设计计数改为 8+4 |
| M10 Q28 测试包装 | 按父修订保持直接 `npm run lint` + 配置差异/`rg` 策略扫描，不恢复 lint 测试文件 |
| M11 规划期提交检查 | tasks 9.4 改为正常实现提交源码、测试与配置，并保留不混入 review/主规格等边界 |
| 旧建议 | AdminLogs 周次/筛选/分页、Q61 刷新按钮与失败、Q69 切页竞态均进入场景；证据由 tasks/test-plan 承载 |

## 目标 / 非目标

**Goals:**

- 18 个 Web Q 全部有明确归属：页面规格、`frontend--authentication` 或 `frontend--build`。
- 删除非页面新能力 `frontend--shared-error-display`，把错误输入兼容保留为现有工具行为，把 route/error_reason 映射分配给实际页面。
- 每个场景有唯一具名测试，tasks 按功能分组并保留红、绿、证据位。
- 明确 Q28 全仓 lint、Q29 Node 26 测试入口、Q52 两页模板 205 项、Q59 父页 4 条分页、Q63 唯一新建行为、Q69 仅解冻保页与切页竞态、Q37 仅现有协议、Q23 组名对齐。

**Non-Goals:**

- 不修改 Ctrl/Node 源码，不新增后端接口、字段、错误码、数据库表或权限模型。
- 不处理仍需产品决策的交互策略，不把 Q52 的 Ctrl `limit<=200`/`offset` 校验并入本变更。
- 不把 Q28 缩成“本次触及文件 lint”，不把 Q29 解释为业务修复。
- 不新增 Web capability；`frontend--shared-error-display` 不进入主规格。

## 决策

### 1. 请求生命周期：页面内序号优先，取消只用于该请求

会因周次、筛选、页码、关键词或各自属性选择变化而重发的请求，统一采用“页面内递增序号 + 可用时 AbortController”的双保险：响应应用前比较序号和当前上下文，不匹配则丢弃；取消只针对该页面发起的请求，MUST NOT 对业务列表调用全局 `abortAll`，避免把其他页面或认证请求一并取消。

- AdminLogs：周次、筛选、分页共用一个查询序号；旧请求完成时只释放自身资源。
- AnnouncementEditor：机器与容器是独立的公告属性选择器；两者各自保存选择与请求序号，容器列表固定使用 `machine_id:''`，机器切换不清空或重载容器选择/列表，容器切换不清空机器选择/详情；`getDetailInformation`/`getContainerDetailInformation` 详情请求同样按各自上下文保护，卸载时作废全部在途响应。
- CreateImage：列表序号绑定 `keyword`、`mineOnly` 与资源范围；新建/更新后的重取也使用新序号。
- ManageUser：只删除死弹窗链，不扩展为全页请求重构；现有用户/权限请求行为保持。
- Q27：`getUserPermissions` 在 `finally` 统一 `unregisterController` 并清理 `timer`；成功、401、异常和组件卸载同一路径，不重复注册，不因重复注销抛错。

替代方案“所有请求统一走全局 `abortAll`”被拒绝：它会把无关请求和认证请求一起取消，无法表达“仅旧查询失效”。

### 2. Q28：全仓 lint 归零，按规则/文件批量整理

验收命令固定为 `npm run lint`，要求退出码 0、0 errors、0 warnings，检查范围覆盖全部既有 `**/*.{js,jsx}`。修复按规则分批：`no-unused-vars`、`no-empty`、`no-undef`、React Hooks 规则（含 `exhaustive-deps` 与 `rules-of-hooks`）、其余正则/空白/React Refresh 问题。现有 11 处 `eslint-disable` 必须通过补齐依赖、删除死代码或重写实现清零，不能保留抑制。

规则与忽略策略保持不变：不得新增/扩大 `globalIgnores`（现有 `dist` 原样保留），不得把规则改为 `off`，不得加 `--ignore-pattern`，不得用注释抑制。Login 的 `userMsg` 死分支与调试 `console`、ManageMachine 旧弹窗链和未用 setter 随对应页面规格一起删除，不能只靠 lint 自动修复。替代方案“只清本次触及文件”被明确拒绝，因为它与 Q28 原文和用户验收口径冲突。

### 3. Q29：统一测试 helper，声明范围但不锁旧 Node

新增测试运行 helper（建议 `scripts/tests/node-options.mjs`），根据 `process.allowedNodeEnvironmentFlags` 决定是否把 `--no-experimental-webstorage` 追加到 `NODE_OPTIONS`。`npm test`、`npm run test:web`、`npm run test:watch`、`npm run test:server` 与 CI 共用该 helper；`test:web`/`test:watch` 通过薄包装脚本启动 Vitest，避免直接运行 `vitest` 绕过注入。`package.json` 增加 `engines.node: "^20.19.0 || >=22.12.0"`；CI 矩阵为 Node 20.19.0、22、26。Node 26 的完整套件通过作为真实证据，文件/用例数按运行时记录，不复制旧基线。

替代方案“CI 固定 Node 22 + README 让用户手工设置”被拒绝：它不能覆盖 Node 26，也把环境责任推给调用方；“只给 `npm test` 加 flag”被拒绝，因为 `test:web` 仍可复现冲突。

### 4. Q37：删除 shared 能力，映射归属页面，只消费现有协议

`frontend--shared-error-display` 删除，不新增跨页面能力。`showErrorModal` 现有的“对象/字符串兼容”保留为工具既有行为，但所有本次触及的调用点统一传 `{ message: err.body || err, status, route }`，不得只传字符串。route/error_reason 的权威表写入对应页面规格：

- Register：`/register` 与 `/request_register_code` 的 8+4 个原因，含 `registration_code_required`、`registration_code_invalid`、`mail_send_failed`、`email_domain_not_allowed`、`code_creation_failed`。
- Settings：`/settings` 的 `invalid_setting`、`update_failed`。
- TemplateManager：`/announcements/templates` 的 `duplicate_entry`、`missing_field`、`not_found`、`cannot_delete_system_template`。
- CreateImage：`/images/create_image`、`/images/update_image`、`/images/delete_image`、`/images/set_image_valid_range`、`/images/set_image_visible_users` 的 15 个 route/error_reason 组合。

以上原因均来自 Ctrl 当前源码，不新增协议。替代方案“保留 shared 能力并与页面共同拥有映射”被拒绝：它造成重复所有权，也违反 Web 以页面为单位的粒度。

### 5. Q52：两个页面各自分页，深链复用现有详情接口

AnnouncementEditor 模板下拉首批 `limit=200&offset=0`，加载更多 `offset=200`；TemplateManager 列表同样按 200/页分页，使 205 个模板的第 201–205 个可达。“编辑此模板”跳转带上 `?template_id=<id>`；模板页优先在当前页查找，找不到时用现有 `GET /announcements/templates/{id}` 取回并打开编辑，无效 ID 显示“模板不存在”。Web 不新增接口、不把单次 `limit` 提高到 200 以上；Ctrl 的 `limit<=200` 与 `offset` 校验由 Ctrl 侧独立变更承接。

替代方案“把 `limit` 提高到 500 或新增搜索接口”被拒绝：前者越过 Ctrl 上限边界，后者扩大跨仓协议。

### 6. Q59：父页 4 条、子表用服务端 total、父控页码

用户子容器请求保持 `pageSize=4`，不为分页一次性拉全量。子表分页由父页状态控制：`current = 父页 page + 1`、`pageSize = 4`、`total = 服务端 total_number`（缺失时回退 `total_page * 4`），`onChange` 调用父页 `fetchContainersForUser(userId, page - 1, search)`。6 个子容器时第一页 4 条、第二页 2 条，第 5/6 条在第二页可达；total ≤4 时不渲染分页。

替代方案“把子表阈值改成 >3 或一次拉 6 条”被拒绝：前者仍是客户端假分页，后者违反“无需一次拉全”。

### 7. Q63：唯一选择 A

新建成功后的状态转移固定为：`keyword = ''` → 以空关键词重新请求列表 → `selectedId = 新 image_id` → 表单字段保持提交值。列表未返回新项时不得触发“选中项不在列表即清空表单”的 effect；重取失败时保留提交表单、显示错误，不伪造选中。替代方案 B“保留关键词、不选中新项”被拒绝，因为用户已明确选择 A。

### 8. Q35/Q36：统一专用详情，删除确认不可达的代码

- ManageMachine 容器标题导航到 `/index/containers/:containerId`；删除 `ContainerDetailModal`、`openContainerDetail`、`returnToDetail`、`detailModalVisible` 及只服务旧弹窗的回调/状态。机器卡片没有删除按钮，本变更不新增卡片删除入口；只清理旧弹窗来源的不可达删除确认回跳链，实际删除沿现有容器详情页入口执行。仍被卡片快捷操作使用的动作确认框保留。
- ManageUser 容器行沿用现有按钮导航，删除 `ContainerDetailModal`、`openContainerDetail`、`detailModalVisible` 及旧只读组件契约/父回调断言；不新增“详情”入口。
- Docs 删除零引用的 `Docs.css`、`components/docs/Guides.jsx` 与四个 `assets/docs-*.svg`；保留仍被引用的 `statusDisplay`。
- Register 删除全局 `validateMessages` 与 `Form` 传参，字段规则显式消息不变。
- Login 删除 `userMsg` 死分支与两处调试 `console`，保留 `err.body || err` 结构化错误和网络中文兜底。

替代方案“保留 ManageMachine 弹窗以避免两套展示分叉”被拒绝，因为 Q35 的目标就是统一到专用页；专用页已有协作者管理与容器动作，删除旧弹窗不丢失详情能力。若实施时发现专用页缺少某项旧弹窗能力，必须停下另立变更，不能把缺口藏进“清理”。

### 9. Q23：先校验后提交，组名逐字对齐

整数输入在提交前校验 `Number.isInteger`；提醒节点按逗号拆分，逐项 `trim` 后要求正整数，空项/非整数/0/负数在字段上指出非法项，不静默丢弃。`GROUP_ORDER` 固定为 `['容器清理', '磁盘策略', '已删除容器', '公告', '镜像']`，未知分组排最后。Ctrl 侧整数截断仍由 Ctrl 保证，本变更不修改后端。

### 10. Q55：缓存选区，而不是给每个插入按钮加事件

文本域在 `select`、`keyup`、`blur` 时把 `selectionStart/selectionEnd` 写入 ref；插入时若文本域仍聚焦则用实时选区，否则用缓存选区。这样不需要给十余个插入按钮逐个加 `onMouseDown`，也能覆盖按钮夺焦。插入后聚焦文本域并把光标移到插入内容末尾。

替代方案“统一给插入按钮 `onMouseDown.preventDefault()`”可行，但按钮分布在多个卡片且以后新增按钮容易漏加；缓存选区只依赖文本域状态，维护面更小。

### 11. Q61/Q66：刷新历史与视口高度

`loadDetail` 只负责详情；新增/复用的历史加载在刷新按钮点击、动作成功和权威重读后调用。动作失败不追加成功历史，保留既有历史并展示失败。404 页使用 `min-height: 100vh` 并以 `100dvh` 覆盖动态视口；删除 `calc(100vh - 64px)`/`calc(100vh - 56px)`。

### 12. Q69：解冻快照 + 上下文校验

解冻开始时记录 `{ machineId, page, search, filter }` 与操作令牌；成功后只有当前上下文仍等于快照时才用快照页码刷新，否则丢弃旧刷新，由用户切页/改筛选产生的新请求负责当前列表。仅当响应 total 证明当前页越界时才回退到有效页。MUST NOT 把“其他容器操作”写入本要求；启动/停止/重启的刷新语义不在 Q69 范围。

## 风险与权衡

- [Q28 全仓 lint 触及 38 个文件、可能改变行为] → 按规则批次修改，每批后跑相关测试与 `npm run lint`，只做等价重写/删除死代码。
- [移除 ManageMachine 旧弹窗可能减少某个入口] → 机器卡片本就没有删除按钮；专用详情页承载详情、动作、删除与协作者管理。测试断言卡片不新增删除入口、实际删除仍走专用页，发现缺口另立变更。
- [Q63 清空关键词会改变用户当前筛选] → 这是用户明确选择的 A；测试同时断言关键词、列表、选中项、表单四态。
- [Q37 中文文案与后端原因漂移] → 页面规格与映射测试共用同一表；新增原因必须另立变更，不能静默落到“未收录”。
- [Q29 未来 Node 移除该 flag] → helper 用 `process.allowedNodeEnvironmentFlags` 特性检测，不支持时跳过；不硬编码版本号。
- [Q59 服务端缺 `total_number`] → 用 `total_page * pageSize` 回退，仍不一次拉全；若两者都缺，按当前条数显示并记录证据。
- [Q69 用户切页后旧刷新被丢弃] → 新上下文请求已在途；若没有，下一次静默轮询/手动刷新会取当前页，不能把旧结果回拉。
- [Q52 深链依赖现有 `getTemplate`] → 只复用现有接口；若 ID 不存在，显示“模板不存在”，不新增搜索 API。

## 迁移计划

1. 应用 Required Changes 1–6 后，交同一审查者定向复核这 6 项；`CHANGES_APPLIED: yes` 前不实施。
2. 实施时按 tasks 分组先红后绿；先请求生命周期与页面行为，再错误映射/清理，最后 Q28 全仓 lint 与 Q29 测试运行时收口。
3. Q28 分规则批次提交，每批保留测试证据；Q29 先落 helper 与 `engines`，再跑 Node 26 完整套件。
4. Web 可独立部署；Q52 的 Ctrl 上限校验由 Ctrl 侧变更独立上线，不改变 Web 现有接口调用。回滚按文件/批次回退，不涉及数据迁移。
5. 全部任务完成后生成真实 `verify.md`；未通过的场景不得写成 PASS。

## 开放问题

无。Q23 的 Ctrl 侧整数校验、Q37 的原因集合、Q52 的 Ctrl limit/offset、Q59 的页大小、Q63 的行为选择、Q69 的范围均已在用户输入或现有源码中确定；若实施发现新后端原因或专用页能力缺口，按“另立变更”处理，不在本变更内猜测。
