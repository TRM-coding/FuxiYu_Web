# 独立审查：improve-mobile-container-display（第 1 轮，含 Required Changes 复核）

## Review Metadata

- **Review round**: 1
- **Prior round**: none
- **Recheck**: 第 1 轮 Required Changes 1–4 的应用复核（不新增 Review round）
- **Reviewer context**: fresh-context 独立审查；未读取作者会话或 transcript，未使用跨模型 CLI；在同一模型的新上下文中只依据磁盘文件复核。
- **Tool restrictions**: 只读 `read`/`grep`/`glob`、只读 PowerShell/`Get-FileHash`、`openspec show`/`validate`；唯一写入本 `review.md`。未修改源码、测试、其他规格或审计产物，未实现、未 build、未 commit。
- **Artifacts reviewed**: `proposal.md`、`design.md`、`specs/frontend--table-component/spec.md`、`specs/frontend--page-deleted-containers/spec.md`、`specs/frontend--page-container-detail-page/spec.md`、`specs/frontend--page-machine-detail-page/spec.md`、`specs/frontend--page-admin-logs/spec.md`；相关主规格与源码；`E:/AI/Fuxi_audit_artifacts/FuxiYu_Web/mobile-display/` 的基线结果与脚本。`openspec/project.md` 不存在。
- **Baseline**: `HEAD = e659c220a81975068e0c37b10f026fd3566019af`。`openspec validate improve-mobile-container-display --strict` 返回 valid。工作区只有三份既有 test-plan 修改和本 change 目录，源码未改；三份 test-plan 的未提交变更只作为背景核对，不作为本 change 的规划输入。
- **Staleness**: 首轮结论基于 14:47 的 hashes；作者在 14:53–14:59 只按 Required Changes 修订了 `proposal.md`、`design.md`、两份 spec，并新增 `frontend--page-admin-logs/spec.md`。下表同时保留首轮历史指纹与本次复核最终指纹；本结论只对复核最终 hashes 有效，后续任何改动（除已列 4 项）仍会使结论失效。

### 首轮审查时 change 文件 SHA256（历史）

| 文件 | SHA256 |
|---|---|
| `openspec/changes/improve-mobile-container-display/proposal.md` | `3ddc59ed1d8b8aa285e246077c0a8c3fb97d0cbb5ff819a9936fb13cd79e1a8c` |
| `openspec/changes/improve-mobile-container-display/design.md` | `227198ccefb7c769aac0e1503a07e72a99f39c5360e53b71900ea3c15602ce8f` |
| `openspec/changes/improve-mobile-container-display/specs/frontend--table-component/spec.md` | `61c289edf4db78115a79b79dc08f5b006b1baa4c5e8895e88a48bf84f98bce01` |
| `openspec/changes/improve-mobile-container-display/specs/frontend--page-deleted-containers/spec.md` | `05bec07dfaa7a0e2fd85354a9bbc36678ad89e2384d80e097d42dddfb55710ef` |
| `openspec/changes/improve-mobile-container-display/specs/frontend--page-container-detail-page/spec.md` | `c5efd07a1b4c58e72068ee2d3dda6fceba4c9e1cf1b62b17525a26c5ea818e96` |
| `openspec/changes/improve-mobile-container-display/specs/frontend--page-machine-detail-page/spec.md` | `6a42d975641372144a223ebaaf97ca89a6d9c0bbbcd02930bf5d9bc6cda74db1` |

### 复核最终 change 文件 SHA256

| 文件 | SHA256 |
|---|---|
| `openspec/changes/improve-mobile-container-display/proposal.md` | `cfe18e2b64c9efdcd414b6d45ae4a5190826c3aaa84a39387ccc3aa99799177a` |
| `openspec/changes/improve-mobile-container-display/design.md` | `7a329fa9f1137df93efb3e0dc3a69868bfedd2d67f4d92e95a2a60e9f8a55ee7` |
| `openspec/changes/improve-mobile-container-display/specs/frontend--table-component/spec.md` | `297ce056758b626abd4094029596ab4f10d056a2c9121ba6904ceca9fc915e84` |
| `openspec/changes/improve-mobile-container-display/specs/frontend--page-deleted-containers/spec.md` | `6a775528eb124af3d490d5dc0af4b4519b2700939b5f02dfbb7c027a21992c12` |
| `openspec/changes/improve-mobile-container-display/specs/frontend--page-container-detail-page/spec.md` | `c5efd07a1b4c58e72068ee2d3dda6fceba4c9e1cf1b62b17525a26c5ea818e96` |
| `openspec/changes/improve-mobile-container-display/specs/frontend--page-machine-detail-page/spec.md` | `6a42d975641372144a223ebaaf97ca89a6d9c0bbbcd02930bf5d9bc6cda74db1` |
| `openspec/changes/improve-mobile-container-display/specs/frontend--page-admin-logs/spec.md` | `dd07eed1b191c231888fd0c519b78c0d3f866b9e69e76e85eca33816e833823c` |

### 对照主规格、源码与证据 SHA256

| 文件 | SHA256 |
|---|---|
| `openspec/specs/frontend--page-deleted-containers/spec.md` | `bde6560dc60ea9436c2acebb8d773c7c1061e9e8526208db95eda2b5b1de71c7` |
| `openspec/specs/frontend--page-container-detail-page/spec.md` | `13e305cf7ea8ce156c9316d6483ef83177b603bb03bb4f74b6372664a5fc56e5` |
| `openspec/specs/frontend--page-machine-detail-page/spec.md` | `61040430bf4995ad808c7663ec982977db7ca962578ed4e346a9dcb7b280987e` |
| `openspec/specs/frontend--page-admin-logs/spec.md` | `1ce0b3834c2f228a929e06c1b4f4c8cd3bff1a11c3b6fc42bcf19ef16dbaa54b` |
| `openspec/specs/frontend--page-manage-user-in-table/spec.md` | `2daadc1483728715e7ac4e98b85609225b599a4743a6febbea930cece6b91d16` |
| `src/components/TableComponent.jsx` | `3a9ca68e9811e644cfc0e99b0cd62d75862e91767e4753e62b65970b59879986` |
| `src/components/TableComponent.css` | `24d8ceee07633a10cc80a73eaf35e52485ce47fec94529782421db27aa09a9a9` |
| `src/pages/DeletedContainers.jsx` | `b8bf89059084963dc1f0b5d93bef9fb72ffd0afb9177d7bd8614f0bbb32d43c8` |
| `src/pages/DeletedContainers.css` | `aa0badc8be5a59a576bdeb800507cbb5757b52bf639d148d255d96eb9ab92803` |
| `src/pages/DetailPages.css` | `1080aad5ca8b05e53f954bb79691fe23a7dfb7e4d64c861533f6b62f355aa32d` |
| `src/pages/AdminLogs.jsx` | `c69ca147821b94a9fdc3bf9e5deb3ca11497d7e3a7c483c63af03ab526dfb561` |
| `src/pages/AdminLogs.css` | `6151c922e52a007231b0de5897fd268d4b80e6f33022da4d7f87b0e03e36da1b` |
| `src/pages/ManageUserInTable.jsx` | `f438c6adb63fdf3c3766c10413962c8305d75ba5d10f323ecfe96f1839753d18` |
| `E:/AI/Fuxi_audit_artifacts/FuxiYu_Web/mobile-display/baseline/results.json` | `30a607c017fb97edec40ae3967b13e6c52c85e5506aa3e54ecbc7cabbcee5d3d` |
| `E:/AI/Fuxi_audit_artifacts/FuxiYu_Web/mobile-display/mobile-render.mjs` | `c7a8b907fc3b8822c69213f400ec75f4519334cdf60523455fc3018e7de5e039` |

复核时重算上述主规格、源码、`results.json` 与脚本 hashes，全部与首轮一致；源码仍未修改，`HEAD` 仍为 `e659c22`。

## 基线核验

- 当前 `HEAD` 与基线证据的 revision 一致；`results.json` 记录的 `TableComponent.jsx`、`DeletedContainers.jsx`、`AdminLogs.jsx`、`DetailPages.css` 哈希与当前源码逐项一致，因此 508px、468px、353px 与 AdminLogs 详情点击失败并非旧源码结论。
- 已确认：DeletedContainers 在 390px 和 320px 的 `document.documentElement.scrollWidth` 均为 508px；容器详情在 390px 和 320px 均为 468px；机器详情同为 468px。390px 的 Mount 真实点击被相邻单元格遮挡，普通 Playwright click 超时。
- 已确认：AdminLogs 在 320px 的 `scrollWidth` 为 353px；在 320/390/768px 均找不到可用的移动端日志详情按钮，审计脚本等待 `getByRole('button', { expanded: false })` 超时；1440px 日志详情和分页通过。
- `AdminLogs.css:174` 的 `.als-side { min-width: 300px; }` 是窄屏统计区超出内容宽度的固定约束；320px 下外层页面与统计卡 padding 叠加后，整页被撑到 353px。这个问题不在 `TableComponent` 内，给卡片/分页加样式不能消除它。
- 审计脚本已经把移动端期待写成“共享卡片 + 展开详情按钮”，但当前实现没有后者；该脚本在修改后必须能真实跑通，不能把“脚本自身等待超时”当成通过。

## 方向核验（通过的部分）

- `TableComponent` 对 `columns` 与 children 的双列源、桌面透传的思路正确；`DeletedContainers` 保留同一份 `columns`/`expandedRowRender` 比复制一套移动卡片更符合最小改动，也没有引入新接口或字段。
- `repeat(auto-fit, minmax(min(460px, 100%), 1fr))` 的方向正确，能把 468px 的固定最小列宽转为连续收缩；共享 `DetailPages.css` 同时处理容器与机器详情，没有把修复复制成两套页面逻辑。
- `ManageUserInTable` 的 `showExpandColumn:false` 与既有受控 keys 继续保留自定义操作列按钮，设计没有把该页改成内置按钮；这一点在 C1 的未受控 fallback 中仍必须保持。
- 用量状态机、恢复/清理 Popconfirm、当前页刷新和 120 次轮询没有被方案改写；这些是应当通过的方向，不需要为它们再扩规格。

## Findings

> 以下 C1/C2/M1/M2 是首轮审查基于 14:47 hashes 的原始发现，为保留历史不重写文字；每项末尾的“复核状态”和 `Required Changes 复核` 是本轮最终结论。

### 🔴 Critical (blocking)

#### C1. 未受控移动端展开仍不可达，AdminLogs 的关键详情在 320/390/768px 无法打开

`TableComponent.jsx:48` 只读取 `expandable.expandedRowKeys`，默认值是空数组；`TableComponent.jsx:148-151` 也只有当 key 命中时才渲染 `expandedRowRender`，移动端没有提供任何按钮。`AdminLogs.jsx:822-824` 只传入 `expandedRowRender`，没有 keys 或 `onExpandedRowsChange`，因此日志卡片永远不会出现详情；页面上也没有第二个“展开日志”的入口。`mobile-display/results.json` 的 `logs-320`、`logs-390`、`logs-768` 三个用例都因等待展开按钮超时而失败。

这不是无关的参考页边角：`design.md:24`、`:42`、`:90` 明确决定“不为未受控 AdminLogs 增加移动端详情入口”，`frontend--table-component/spec.md:43-47` 和 `:65-69` 还把“不出现展开按钮”固化为 THEN。用户目标是“使日志/删除详情在窄屏均能到达”；当前方案则把日志详情在窄屏完全不可达写成预期行为。主 `frontend--page-admin-logs/spec.md` 的主流程也要求展示结构化 diff 与失败信息，没有桌面限定。该缺口不能以“保持现状”辩解，因为现状本身正是待修的用户可见缺陷。

**影响**：本变更完成后，DeletedContainers 的详情可点，但 AdminLogs 的审计详情仍只能在桌面查看；移动端用户无法检查失败原因、前后差异或原始 JSON。仅修复 DeletedContainers 不足以满足目标，也让“参考 AdminLogs 成功案例”停留在列表层。

**要求的最小修法**：`TableComponent` 同时支持受控与未受控移动展开。存在 `expandable.expandedRowKeys` 数组时按受控处理，只有同时提供 `onExpandedRowsChange` 才渲染可操作按钮（缺少 callback 时保留“不可生效不显示按钮”的现有约束）；未提供 keys 时，组件用内部展开状态，渲染同一个“展开详情/收起详情”按钮，并调用可选 `onExpand`。`AdminLogs` 不传 keys，因此自动获得移动端详情，桌面仍由 antd 管理；`ManageUserInTable` 的 `showExpandColumn:false` 仍不出现第二个按钮。具体条目见 Required Change 1。

**复核状态（Required Change 1）**：fixed — `proposal.md:9-10`、`design.md:38-48`、`frontend--table-component/spec.md:61-103` 新增受控/未受控双模式、嵌套 `expandable` 契约、`rowExpandable` 缺省与 AdminLogs 内部展开场景；`frontend--page-admin-logs/spec.md` 覆盖 320/390/768 与 1440 桌面。**accepted by reviewer**。

#### C2. AdminLogs 在 320px 的 353px 整页溢出被排除在验证矩阵外，且没有对应样式修订

`design.md:66` 把 AdminLogs 的真实浏览器范围写成 390/768/1440，明确少了 320；`proposal.md:29` 的文件清单没有 `src/pages/AdminLogs.css`；Capabilities 也没有 AdminLogs；四份 delta spec 中没有 320px AdminLogs 的验收场景。与此同时，用户要求“320/390/768/1440，无整页横向溢出”，并明确说 AdminLogs 的 353px 需要小样式收缩才能满足回归目标。

当前证据是 320px 下 `document.documentElement.scrollWidth = 353`，而 390/768/1440 不溢出；因此这不是“已经被其他页面 CSS 顺带修好”的问题，而是一个必须在 `AdminLogs.css` 里单独处理的固定最小宽度。`TableComponent.css` 只影响卡片和分页，无法收缩 `.als-side`；只用 390px 的通过结果不能代表 320px 回归通过。若按当前设计实施，变更后的审计矩阵仍会跳过用户点名的 320px 失败。

**影响**：整体验收会在 AdminLogs 320px 上失败，或者被迫把该页从“无整页横向溢出”目标中排除；两种结果都不符合用户目标。

**要求的最小修法**：在 `AdminLogs.css` 对 `.als-side` 做窄屏收缩（例如 `min-width: min(300px, 100%);`，或等价的小断点把 `min-width` 设为 `0`），保留 `.als-wall-wrap` 的内部横向滚动与日志列表/分页行为，不重做日志页；在 AdminLogs capability 中增加 320px 场景，并把 320 加回 design 的浏览器矩阵。具体条目见 Required Change 2。

**复核状态（Required Change 2）**：fixed — `proposal.md:10,27,31` 增加 AdminLogs capability、`AdminLogs.css` Impact；`design.md:70-80` 给出 `.als-side { min-width: min(300px, 100%); }` 与 320 浏览器矩阵；`frontend--page-admin-logs/spec.md:7-31` 覆盖 320px 详情/统计/分页。**accepted by reviewer**。

### 🟡 Moderate

#### M1. 受控展开的 API 位置和 `rowExpandable` 缺省语义未定义，主路径存在约定不一致/运行时异常风险

`TableComponent.jsx:48` 从 `expandable.expandedRowKeys` 读取受控状态，`ManageUserInTable.jsx:43-53` 也把 keys 和 callback 放在 `expandable` 内；但 `frontend--table-component/spec.md:61` 只写“父级传入 `expandedRowKeys=[]` 和 `onExpandedRowsChange`”，`design.md:40` 同样没有点明路径。若实现者据此把两个 prop 放到 TableComponent 顶层，当前组件不会识别，移动端按钮会出现但状态不会生效，测试也可能按错误接口写。

更直接的是 `design.md:40` 与 `frontend--table-component/spec.md:57` 写成“且 `rowExpandable(record) !== false`”。DeletedContainers、AdminLogs、ManageUserInTable 都没有传 `rowExpandable`；按字面执行会在渲染每张卡片时调用 `undefined`，产生 TypeError。spec 的边界场景只覆盖“返回 false”和“缺少更新回调”，没有“未提供 rowExpandable”这一正常主路径。

**建议修订**：统一写明受控状态位于 `expandable.expandedRowKeys` 与 `expandable.onExpandedRowsChange`；写明“未提供 `rowExpandable` 时视为可展开，仅显式返回 false 时禁用”，并增加“未提供 rowExpandable 仍能展开”的机械测试。

**复核状态（Required Change 3）**：fixed — `design.md:40-44` 明确全部位于 `expandable` 且未提供 `rowExpandable` 视为 true；`frontend--table-component/spec.md:63-103` 的场景已覆盖受控、未受控、缺 callback、`rowExpandable` 缺省/false；`design.md:80` 要求直接组件测试。**accepted by reviewer**。

#### M2. “不得额外切片”与设计保留既有客户端分页切片相矛盾

`frontend--table-component/spec.md:29` 写“卡片 MUST NOT 对当前页数据做服务端分页之外的额外切片”；`design.md:48` 则明确“移动端仍只渲染当前 dataSource 页，不改变既有‘本地数据多页才切片’的逻辑”。当前源码 `TableComponent.jsx:86-90` 确实在 `dataSource.length > currentPageSize` 时执行 `mobileDataSource = dataSource.slice(pageStart, pageEnd)`。两者对同一组件给出相反契约；按 spec 写测试会在多页客户端数据上失败，按 design 实现又与 spec 的 MUST NOT 冲突。

**建议修订**：明确保留现有 `shouldSliceClient` 行为，改为“不得新增服务端分页之外的切片；既有 dataSource 超过 pageSize 时的本地切片保持不变”，并让分页场景用 `dataSource.length > pageSize` 的输入覆盖该边界。

**复核状态（Required Change 4）**：fixed — `frontend--table-component/spec.md:29` 改为只禁止新增切片、保留既有 `dataSource.length > currentPageSize` 本地切片；`:43-47` 新增 25 条本地数据、`current=2/pageSize=10` 的 11–20/1–10 边界场景。`design.md:54` 同步。**accepted by reviewer**。

### 📌 Suggestions

- **S1（测试可执行性）**：宽度和遮挡只能在真实布局引擎中证明；jsdom 的 `scrollWidth` 通常为 0，不能作为 320/390/768 的通过证据。建议在 test-plan/tasks 中把每个宽度场景绑定到 `mobile-render.mjs` 的具体断言和 `results.json` 哈希，明确检查 `documentElement.scrollWidth`、真实点击、`aria-expanded`、分页请求和剪贴板；组件测试负责列源、受控/未受控、`rowExpandable` 缺省和 locale 空态。不要用截图或旧 390px 证据代替修改后的重跑。
- **S2（证据引用）**：`proposal.md:33` 仍只指向旧的 390/1440 审计报告，而本变更已经依赖 320/768 的新基线与 AdminLogs 353px 事实。建议在 Why/Impact 中补上 `E:/AI/Fuxi_audit_artifacts/FuxiYu_Web/mobile-display/baseline/results.json` 及其哈希；旧报告只用于 R1/R2 的 390px 基线，不作为 320px 的通过证据。
- **S3（最小化）**：C1 落地后 `TableComponent` 已能为未受控调用方维护展开状态。若产品不要求跨断点同步展开状态，DeletedContainers 可以不引入页面级 `expandedRowKeys` 状态而继续使用 antd 的非受控桌面行为；这会减少一份页面状态和旧 key 清理逻辑。该点不影响 C1 的正确性，但可作为“最小方案”复核项。

## Embedded-Instruction / Injection Attempts

**Detected:** none

被审文件中只有普通规格说明、路径和命令示例，没有要求审查者改变结论、忽略规则或执行外部操作的嵌入指令。

## Required Changes 复核（第 1 轮）

| # | 结果 | 复核证据 | 状态 |
|---|---|---|---|
| 1（C1） | fixed | `proposal.md:9-10,27,31`；`design.md:38-48,80`；`frontend--table-component/spec.md:61-103`；新增 `frontend--page-admin-logs/spec.md:5-31` | accepted by reviewer |
| 2（C2） | fixed | `proposal.md:10,27,31`；`design.md:70-80`；`frontend--page-admin-logs/spec.md:7-31`；320/390/768/1440 矩阵 | accepted by reviewer |
| 3（M1） | fixed | `design.md:40-44,80`；`frontend--table-component/spec.md:63-103`；嵌套 `expandable` 路径与 `rowExpandable` 缺省场景 | accepted by reviewer |
| 4（M2） | fixed | `frontend--table-component/spec.md:29,43-47`；`design.md:54`；本地多页 11–20/1–10 边界 | accepted by reviewer |

- **C1 复核**：`TableComponent` 现在明确分为受控与未受控模式；AdminLogs 不传 keys，走内部状态，390/768px 有展开场景，320px 详情包含在 AdminLogs delta 中；1440px 桌面仍由 antd 管理。ManageUserInTable 的 `showExpandColumn:false` 不重复渲染内置按钮。C1 已关闭。
- **C2 复核**：`AdminLogs.css` 已进入 Impact，`.als-side { min-width: min(300px, 100%); }` 的连续收缩规则和 320px `scrollWidth <= 322` 场景已进入 design 与 AdminLogs delta；320 已加入浏览器矩阵。C2 已关闭。
- **M1 复核**：所有核心契约均使用 `expandable.expandedRowKeys`/`expandable.onExpandedRowsChange`；`rowExpandable` 缺省视为可展开、显式 false 才禁用，并有缺省/false 两个场景；直接组件测试范围已写入 design。M1 已关闭。
- **M2 复核**：spec 现在保留既有本地多页切片，只禁止新增切片；同时有 25 条本地数据、`current=2/pageSize=10` 的边界场景，且明确不发请求。M2 已关闭。
- **外部证据**：`E:/AI/Fuxi_audit_artifacts/FuxiYu_Web/mobile-display/baseline/results.json` 仍为 `30a607c017fb97edec40ae3967b13e6c52c85e5506aa3e54ecbc7cabbcee5d3d`，脚本仍为 `c7a8b907fc3b8822c69213f400ec75f4519334cdf60523455fc3018e7de5e039`；关键源码 hashes 与首轮一致，`HEAD` 仍为 `e659c22`。基线仍证明 508/468/353px 与日志详情不可达；本轮**没有**源码修改，也没有新的修改后浏览器结果，规划层不把基线当成实现通过证据。
- **S2** 已由 proposal/design 的基线路径与 hash 补齐而关闭；**S3** 按 design 的非目标明确不采纳；**S1** 留在 test-plan/apply 执行。`openspec validate improve-mobile-container-display --strict` 通过。
- **结论**：Required Changes 1–4 全部 fixed 且已由审查者 accepted；无剩余 Required Change，无新增 open Critical/Moderate。

## Verdict

首轮 C1/C2 是真实阻塞项；Required Changes 1–4 应用后已逐项复核通过（见上表，四项均 accepted by reviewer）。源码仍未修改，因此本轮只接受规划修订，不宣称 320/390/768/1440 的修改后浏览器通过或实现完成；这些留给 test-plan/apply 的机械验证。canonical 值保持带修订通过，完成信号按用户要求置为 yes。

VERDICT: APPROVE

## Required Changes (if APPROVE WITH CHANGES)

1. **补齐未受控移动展开，并让 AdminLogs 详情在窄屏可达**
   - 修改 `proposal.md:9`、`design.md` 的 Goals/Non-Goals、Decision 2、Open Questions，以及 `specs/frontend--table-component/spec.md` 的展开 requirement/scenario：删除“未受控 AdminLogs 不出现按钮”的结论，改为受控与未受控双模式。
   - 精确契约：当 `expandable.expandedRowRender` 存在且 `expandable.showExpandColumn !== false` 时，若 `expandable.expandedRowKeys` 是数组，则使用受控 keys 为唯一状态源；此时只有 `expandable.onExpandedRowsChange` 也是函数才渲染可操作按钮，否则保留“无效按钮不显示”的现有约束。未提供 keys 时，使用组件内部展开 keys，渲染“展开详情/收起详情”按钮，并在提供回调时调用。可操作按钮设置 `aria-expanded`，按 `rowKey` 增删 key，并在提供 `onExpand` 时调用 `onExpand(expanded, record)`。受控模式不得写内部状态；内部模式不得覆盖调用方传入的受控 keys。
   - `rowExpandable` 未提供视为可展开，返回 false 才不显示按钮；`showExpandColumn:false` 仍不渲染内置按钮，ManageUserInTable 继续使用自己的操作列按钮并渲染受控详情。
   - 增加 `frontend--page-admin-logs` 的 delta 或等价页面级 requirement：AdminLogs 在 390px 和 768px 可展开/收起日志详情，桌面 1440px 仍由 antd 展开图标管理；更新原“AdminLogs 未受控展开保持原行为”的场景，不再把无按钮写成 THEN。
   - 更新 Impact、Risk 和测试范围；保留桌面 1440px 现状、分页、权限和请求次数不变。

2. **修复 AdminLogs 320px 的 353px 整页溢出**
   - 在 `proposal.md` 的 Impact 增加 `src/pages/AdminLogs.css`，在 Capabilities 增加 AdminLogs（可合并到上述 AdminLogs delta），并在 `design.md` 增加一个最小样式决策。
   - 采用等价规则：`.als-side { min-width: min(300px, 100%); }`，或在窄屏断点把 `.als-side` 的 `min-width` 设为 `0`；不得改日志表/统计协议，不得用整页横向滚动或重做日志页规避。保留 `.als-wall-wrap` 的内部横向滚动。
   - 在 AdminLogs delta 增加 320px 场景：`document.documentElement.scrollWidth <= 322`，统计区/筛选/日志卡片与分页仍可见；展开日志详情后仍不溢出；桌面 1440px 的统计、分页和详情不变。
   - 把 AdminLogs 320 加入 `design.md:66` 的浏览器矩阵和验收证据，不能只写 390/768/1440。

3. **固定受控 API 位置与缺省 `rowExpandable` 语义**
   - 在所有文本中统一为嵌套路径 `expandable.expandedRowKeys`、`expandable.onExpandedRowsChange`，不引入顶层同名 props；场景 GIVEN 同步修改，避免测试和实现按不同接口编写。
   - 在 TableComponent requirement 中写明“未提供 `rowExpandable` 视为 true，仅显式 false 禁用”，并增加“未提供 rowExpandable 仍显示可生效按钮”的场景/测试；保留“keys 存在但缺 callback 时不出按钮”的现有约束。
   - 为 `TableComponent` 增加直接组件测试，至少覆盖 `columns` 与 children 的列源、空列/空数据、受控与未受控、`showExpandColumn:false`、`rowExpandable` 缺省/false、分页回调；不要只通过页面间接覆盖。

4. **对齐分页切片契约**
   - 将 `frontend--table-component/spec.md:29` 的“不得额外切片”改为“不得新增服务端分页之外的切片；既有 dataSource 大于 pageSize 时的本地切片保持现状”，与 `design.md:48` 及 `TableComponent.jsx:86-90` 一致。
   - 在分页场景中增加 `dataSource.length > pageSize` 的边界断言，明确组件只切当前本地页、不会自行发起请求；已删除页的服务端分页回调仍保持 `onChange(2, 20)`/当前页采样不变。

**本轮复核结果：1–4 全部 fixed，无剩余 Required Change。**

CHANGES_APPLIED: n/a

## Rebuttals

作者已以 fixed 回应 Required Changes 1–4，并提交了上述最终 artifacts。审查者逐项复核并标注 **accepted by reviewer**；C1/C2/M1/M2 均无未决项，也没有新的反驳需要裁定。S2 已修复，S3 已由 design 明确拒绝，S1 留给 test-plan/apply。

**说明**：本轮复核只覆盖 C1/C2/M1/M2 对应的 Required Changes 与外部基线；未修改源码、未实现、未 build、未 commit。任何对 `proposal.md`、`design.md` 或 `specs/**/*.md` 的后续改动都会按 STALENESS 规则使本结论失效。

## 最终只读复审（2026-10-21）

- 独立审查代理 `b45f3b0d-734c-44a1-9cd8-015212b410af` 的终审回执为 settled，`finish_reason.kind=completed`。本节由父代理根据实际回执收录；此前表格保留的是历史审查指纹。
- 用户要求移除旧审计产物引用后，审查者重新读取当前 proposal/design/specs；两处报告路径移除未改变设计。当前有效结论为 APPROVE，此前 Required Changes 1–4 全部修复，无新阻塞。
- 审查者另行复核了 `TableComponent` 只按实际渲染内容判断紧凑布局的修正，以及 AdminLogs 小屏日期导航和详情工具栏换行，未发现阻塞问题。
- 审查者核验过的 24 组/296 条浏览器结果对应终审时实现；父代理后续仅补强测试及外置浏览器断言，未修改被审设计或实现。

### 当前有效审查指纹

| 文件 | SHA256 |
|---|---|
| `proposal.md` | `e4a53ec180e0614dcf3d89dbecdf89fdfd1c5d15bff9a35052659f7fe5639490` |
| `design.md` | `2b521a102d5bc671feb975e53d7fbc0dae0627f3ebbab652eda71230f620d4d7` |
| `specs/frontend--table-component/spec.md` | `297ce056758b626abd4094029596ab4f10d056a2c9121ba6904ceca9fc915e84` |
| `specs/frontend--page-deleted-containers/spec.md` | `6a775528eb124af3d490d5dc0af4b4519b2700939b5f02dfbb7c027a21992c12` |
| `specs/frontend--page-container-detail-page/spec.md` | `c5efd07a1b4c58e72068ee2d3dda6fceba4c9e1cf1b62b17525a26c5ea818e96` |
| `specs/frontend--page-machine-detail-page/spec.md` | `6a42d975641372144a223ebaaf97ca89a6d9c0bbbcd02930bf5d9bc6cda74db1` |
| `specs/frontend--page-admin-logs/spec.md` | `dd07eed1b191c231888fd0c519b78c0d3f866b9e69e76e85eca33816e833823c` |