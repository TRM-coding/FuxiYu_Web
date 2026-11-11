# Implementation Report — clarify-resource-limits-and-errors

实施子代理（provider/model: aliyun-maas / deepseek-v4.1-flash / high）。本报告记录真实改动与验证状态；**未执行的验证不声称通过**。

## 1. 环境与执行约束

- DSH Windows 沙箱对 workspace 的 `SetNamedSecurityInfoW` 返回 Win32 5，`pwsh` 命令全部失败（含只读探测）。
  按约定不反复尝试、不提权，实施与回归**全部用文件工具完成**；`npm test` / `npm run build` / OpenSpec CLI 校验由主代理执行。
- 写入范围严格遵守授权：`src/pages/CreateContainer.jsx`、`src/pages/CreateContainer.css`、`src/pages/MachineDetailPage.jsx`、`src/pages/DetailPages.css`、`src/utils/showErrorModal.jsx`、`src/test/` 下 3 个新测试、本 change 全部文件、两份主 SPEC。
  未触碰并行构建子代理独占的 `src/routes/index.jsx`、`src/layouts/LoginLayout.jsx`、`src/api/announcement_api.jsx`、`src/pages/Apply.jsx`、`vite.config.js` 及其新路由测试；未 stage/commit/push，未动 hooks/CI/.env/凭据。

## 2. 改动文件与行为变化

### 2.1 `src/pages/CreateContainer.jsx`（配额分层 + 共享内存联动 + 提交阻断）

- 新增限额语义工具：`knownLimit(v)`（数值含 0 = 已知；`null/''/非数` = 未知）、`clampQuota(v, limit, min)`（未知上限收敛到最小值，不假定无限）、`limitText`。
- `QuotaRow` 重写：固定展示「当前申请 X」与「本次可申请上限 Y（未知）」，元信息分开写「硬件容量」「机器配置限额」，并可附派生说明；滑条与 `InputNumber` 共用同一 `min/max/step`，取值统一走 `clampQuota`；已知 0 上限提示「本机该项不可分配」，未知提示「机器配置限额未获取到，暂不可调整」。
- 三层上限：`hardwareCapacity`（cpu_core_number/memory_size_gb/gpu_number）、`machineLimits`（max_*，CPU 机器 GPU 恒为 0）、`effectiveLimits`，其中 **`effectiveLimits.shared = min(max_shared_gb, 本次申请内存)`**。
- 新增 `useEffect`：降低内存或切换机器后，若已有 `sharedGb` 超过有效上限则收敛到上限（`sharedGb` 参与依赖，收敛后即稳定）。
- `handleSelectMachine` 抽出 `computeQuotaForMachine`：四项配额一起收敛进新机器限额，共享内存同时受新机器内存约束（GPU 机 GPU 默认 1，CPU 机恒 0）。
- `fetchMachines` 中 `max_gpu_number/max_shared_gb` 由 `?? 0` 改为 `?? null`，保住「已知 0」与「未知」的区别。
- `collectQuotaViolations` + 提交前阻断：已知上限被超出、或 shared_memory > MEMORY 时**不调用创建接口**，在配额区显示含申请值与上限的说明并 `message.warning`；payload 再按有效上限收敛一次（`safeGpu/safeCpu/safeMemory/safeShared`，`safeShared ≤ safeMemory`）。
- 机器卡计量条改为「硬件 X · 可分配 Y」（配置比例，不称实时空闲量）；配额卡增加三层概念图例与「非实时空闲量」声明；提交汇总补共享内存读数。
- 配额增加 `data-quota` 属性，便于行为测试定位。

### 2.2 `src/pages/CreateContainer.css`

- 删除误导性的单一「上限 …」与旧读数样式；新增 `.cc-quota-row-figures`、`.cc-quota-row-meta`、`.cc-quota-detail`、`.cc-quota-hint`、`.cc-quota-legend`、`.cc-quota-error`（`role="alert"` 红框）。

### 2.3 `src/pages/MachineDetailPage.jsx`（限额编辑）

- 新增 `knownLimit/clampInt/limitText`，各滑条配一个**同 min/max/step 的 `InputNumber`**，两者共用同一处理函数。
- **共享内存上限滑条 `max={8}` 移除**，改为 `sharedLimitMax = 本次编辑的 max_memory_gb`（缺省回落硬件内存）；`changeMemoryLimit` 在降低内存限额时同步 `clampInt(max_shared_gb, 0, nextMaxMemory)`，并通过 `sharedAutoReduced` 显示「已将共享内存上限下调到 N GB」的可见提示（用户手动改共享值或内存回升时清除），避免"悄悄改写"用户要保存的值。
- `limitDraft` 初始化即收敛：CPU/内存不超硬件容量，共享不超内存限额；`saveLimits` 保存前再收敛一次（不提交 `max_shared_gb > max_memory_gb` 或超过硬件容量的 payload，且 `clampInt` 取整、不为负，符合 Ctrl 请求模型对整数与非负的要求）。
- 文案区分「机器配置限额 / 硬件容量」；每块限额加 `data-limit` 供行为测试使用。

### 2.4 `src/pages/DetailPages.css`

- 新增 `.machine-limit-control`、`.machine-limit-input`、`.machine-limit-capacity`，保证滑条与数字输入同一行、硬件容量弱化显示。

### 2.5 `src/utils/showErrorModal.jsx`（错误呈现）

- 新增 `PLACEHOLDER_MESSAGES`、`NETWORK_FAILURE_PATTERN`、`isSpecificMessage`、`resolveReasonMessage`。
- 决策改为：网络类失败（无 status、无 error_reason）→ 中文兜底；**后端具体 message 优先保留**（含 8GB/4GB 等数值），中文原因映射降为补充行「原因：…」，不再覆盖具体数值；无具体 message 时用中文映射；未收录的 error_reason → 「发生未知错误…」+「未收录的错误原因：X」，**不硬套超限文案**；HTTP 状态中文 hint 全部保留（含 401/403/422/5xx）。
- `routeErrorMap` 为 `/machines/update_machine` 增加 `invalid_config`（机器配置限额无效或超出硬件容量，防御性映射）、`invalid_payload`（机器配置限额参数无效）、`missing_field`，使机器限额保存失败不再借用容器创建的超限文案；组合校验失败实际走该路由既有的 `update_failed`（更新机器失败）。
- 未改 401/403 的认证/授权处置（仍在 `ensureOk`/`abortAll('auth')`/PermissionContext），未改 `hideExistingModals/restoreModals`。

### 2.6 新增测试（行为测试，非只查映射表键）

- `src/test/ResourceLimits.test.jsx`：配额三层文案；shared 上限 = min(max_shared, MEMORY)（mem 32 → 16 GB，不被 8 GB 限）；降内存 32→4 时 shared 16→4；换机器（mem 4 / shared 0）重算；已知 0 上限显示 0 且提示不可分配；`null` 上限显示未知并禁用；内存上限 0 时**阻止超限 payload**且给出「内存 当前申请 1 GB，本次可申请上限 0 GB」；限额内组合提交 mem 32 / shared 16。断言滑条与数字输入的 `aria-valuemax` 一致。
- `src/test/MachineSharedLimit.test.jsx`：共享滑条上限 = 本次编辑 `max_memory_gb`（硬件内存 64、内存限额 32 → 上限 32，可设 16 并保存）；降内存 32→4 时 shared 16→4、显示可见下调提示且保存 payload 不超限；四项限额滑条/数字输入同口径、超上限输入收敛；保存被拒（422/`update_failed`）时把具体 message、status、route 交给 `showErrorModal`。
- `src/test/ErrorPresentation.test.jsx`：真实渲染弹窗，且**只读当前可见 dialog 的文案**（不读整个 body，避免上一次被隐藏的旧弹窗节点把旧文案算进来），清理按 DOM 点掉确认按钮并等可见弹窗归零；`invalid_config` 不覆盖具体 message（保留 8GB/4GB + 中文原因 + 400 提示）；`body`/`data` 包装均可取出；已知原因（机器离线）不出现超限字样；机器限额被拒按本路由文案呈现（422/`update_failed` 保留数值、400/`invalid_payload` 给出参数无效），且都不借用容器创建超限文案；未知原因中文兜底 + 未收录标注；网络失败不抛英文原文；无原因中文文案与 500 提示保留；401/403 提示与身份验证原因保留。本文件内单独桩掉 jsdom 未实现的伪元素 `getComputedStyle` 第二参数（仍走原实现），只消除噪音、不压业务错误。
- 工具只用现有 `MemoryRouter`/`PermissionProvider`/antd、`fireEvent`（`change` 与可冒泡 `focusOut` 分两个 act）与 `waitFor`，未引入新依赖。

### 2.8 主审实跑后第 2 轮修正（仅限授权范围）

主审实跑 20 例：13 passed / 7 failed（日志 `Global/bak/2026-10-11/repair-verification/web-resource-final.log`）。逐条定位后修正：

- **ErrorPresentation 4 fails（`document.body.textContent` 含上一次隐藏弹窗）**：改为只读「当前可见 `.ant-modal`」的 `dialogText()`；断言映射与数字（8GB/4GB/16GB/422/400 提示）全部保留。清理改为按 DOM 找确认按钮（隐藏弹窗用 role 查询查不到）逐一 `click` 并 `waitFor` `.ant-modal` 归零；`openModal` 打开前先断言没有可见残留弹窗。jsdom 伪元素 `getComputedStyle(elt, pseudoElt)` 噪音在**本文件内**桩掉第二参数、仍调用原实现（不压掉业务 `console.error`）。
- **InputNumber 3 fails（shared 16 仍 8、memory 4 仍 32、ResourceLimits shared 仍 0）**：判别结论是**测试交互问题，不是页面代码问题** —— 同一文件里「先 commit 再走 `userEvent` 交互」的用例（`ResourceLimits` 限额内提交）拿到的是 `MEMORY=32 / shared_memory=16`，说明状态确实提交了；失败点是同一 act 里 `change`+`focusOut` 让 `onBlur` 读到未刷新的旧输入态（等于没提交），且输入框显示值由 rc-input-number 的**被动** effect 同步（`rc-util/useLayoutEffect.js` 在 `NODE_ENV==='test'` 时用 `React.useEffect`），单次 act 内还没同步完。故把 `commitQuota`/`commitLimit` 拆成「change（act）→ waitFor 输入落定 → focusOut（act）」，提交后的显示值断言改 `waitFor`，并补一条状态直出文案断言（「当前申请 16 GB」/标签 `16 GB`）作为第二重确认。**未删除或放宽任何断言，未改页面实现**。
- **报告勘误（ManageMachine）**：见第 4 节第 2 条 —— 登记弹窗只传 name/ip/description/可选 port，局部 payload 的 max_* 并未发出，不存在「登记提交限额」缺口。

### 2.9 规格补充（登记 vs 限额编辑边界）

- 两份 `frontend--page-machine-detail-page` SPEC 的限额编辑 Requirement 增补 `#### Scenario: 限额只在机器详情页编辑`：登记只传最小信任锚（硬件由 node 首连、上限由 ctrl 默认策略），不新增登记期限额字段/接口/默认策略，`shared ≤ memory`、各项 `≤ 硬件容量` 由本页限额编辑保证。未改 `frontend--page-manage-machine`，未改 ManageMachine 代码。

### 2.7 规格

- 新增 delta：`openspec/changes/clarify-resource-limits-and-errors/specs/frontend--page-create-container/spec.md`、`.../frontend--page-machine-detail-page/spec.md`（`# Spec Delta` + MODIFIED/ADDED，Requirement 内用 SHALL/MUST，每条 ≥1 个 `#### Scenario` 带 WHEN/THEN；标题格式与并行 Ctrl delta 一致）。
- 主 SPEC 同步：`openspec/specs/frontend--page-create-container/spec.md` 删除「页面会提交 mem4/shared8 被 Ctrl 拒绝」的过时场景，替换为 shared ≤ MEMORY、上限分层与错误呈现；`openspec/specs/frontend--page-machine-detail-page/spec.md` 明确 `max_shared_gb` 上限取本次编辑 `max_memory_gb`、降内存收敛与保存阻断；两份均保留入口/身份、构建归属、Source references 段落。

## 3. 验证状态

**本代理：已运行：无。** 沙箱内 `pwsh` 全部失败（`SetNamedSecurityInfoW` Win32 5），未执行任何命令；因此不声称任何测试或构建通过。

**主审实跑（非本代理执行，记录事实）**：3 个新文件首轮 20 例 → **13 passed / 7 failed**（日志 `FuxiYu_Global/bak/2026-10-11/repair-verification/web-resource-final.log`）。通过的 13 例覆盖实现行为本身：配额三层文案与非实时空闲量、`min(max_shared_gb, MEMORY)=16`（mem 32 不再被 8 GB 限）、换机器重算（mem 4/shared 0）、上限 0 与未知（null）语义、内存上限 0 阻止超限 payload、限额内提交 payload `MEMORY=32/shared_memory=16`、同口径 `aria-valuemax` 一致与超上限输入收敛、保存被拒时把具体 message/status/route 交给 showErrorModal。7 例失败全部落在**测试交互/断言作用域**（详见 2.8），已修正。
**修正后定向复跑**：错误弹窗 8 例 + ResourceLimits 8 例共 **16 passed**（`web-resource-cleanup-fixed.log`）。
**full Web tests（已通过）**：以 `--maxWorkers=2` 重跑（**仅限制并发，未弱化断言**），Windows `web-all-final-two-workers.log` 103.03s、Linux `linux-tests-final.log` 60.70s（Global `bak/2026-10-11/repair-verification`），均 **28 文件 156 测试全部通过（exit 0）**；此前 `CreateContainer` 的 5s 并发超时属历史记录，已随重跑通过。

**验收已完成**：

- 与 Ctrl「移除 8GB 共享限额」修复的契约核对：Ctrl targeted 107 pass、strict 27 items / 0 fail（见第 7 节）；
- 生产构建与 OpenSpec 严格校验：Web strict **26 items / 0 fail**（含本 change；补齐两份页面 delta 后重验，项数不变）；生产构建证据见 fix-web-build 报告。

**人工静态复核（非执行验证）**：逐一核对新增 JSX 括号/属性、hook 调用顺序（新增 `useEffect` 为无条件调用）、payload 字段名未变（`CPU_NUMBER/MEMORY/GPU_LIST/shared_memory`）、既有测试所依赖的 DOM（`data-quota`、`.ant-slider-disabled`、`role="spinbutton"`）与 antd v5 / rc-input-number / rc-slider 实现一致。

## 4. 剩余问题与越界发现（只报告，未修改）

1. **后端 8GB 策略已核对到并行 Ctrl 变更（只读证据）**：`FuxiYu_CtrKernel/openspec/changes/remove-shared-memory-hard-cap/`（任务 1.1–1.5 已勾选）明确「系统 MUST NOT 以全局固定上限（如 8GB）拒绝更大的合法配置」，机器内存上限 32GB 时共享 16GB 可保存；其边界约定为：限额组合校验失败报 `update_failed`（管理 API **422**），请求模型层非法值报 `invalid_payload`（**400**），容器创建侧越界才是 `invalid_config`。本前端按此对齐：save 前 `clampInt` 取整且非负、同请求携带 memory+shared 且保证 `shared ≤ memory`（Ctrl 场景「同请求把共享与内存设为相等可保存」成立），错误映射按路由区分。**已完成的是代码/测试层契约核对**（Ctrl targeted 107 pass、strict 27/0；Web full 28 文件 156 测试通过）；**没有真实 Docker / 部署端到端**，故不就「线上部署版本已含该变更」作断言。
2. **`src/pages/ManageMachine.jsx`（未授权，未改）——勘误**：添加宿主机弹窗是既有「最小信任锚」登记模式，表单只有 `machine_name`/`machine_ip`/`port`/`machine_description`，没有任何 `max_*` / 硬件输入项；`handleAddHostConfirm` 里虽组装了含 `max_shared_gb` 等字段的局部 `payload`，但真正发出的 `registerMachine({...})` 只带 name/ip/description/可选 port —— **局部 `payload` 的 max_* 并没有发出去**（弹窗文案即写明「硬件信息由 node 首连返回，资源上限由 ctrl 默认策略生成」）。因此不存在「登记时提交限额」的缺口，也**不需要**新增登记字段/接口/默认策略：限额在机器详情页的「硬件分配限制」里编辑（本变更已覆盖 shared ≤ memory 与 ≤ 硬件容量）。此处不改 ManageMachine，也不把范围扩到它。
3. **`src/pages/Apply.jsx`（未授权，未改）**：已有 `shared > mem` 阻断（约 139-143、348-349 行）与 `max_shared_gb` 上限校验，**无功能性缺口**；但其共享空间标签只显示机器 `max_shared_gb`（未体现与 MEMORY 取小），属展示口径缺口，列出供归属转移决定。
4. **`src/components/MachineDetailModal.jsx`（未授权，未改）**：只读展示机器 `max_shared_gb`，无编辑路径，无缺口。
5. **测试交互假设（主审实跑后已修正）**：数字输入必须**分两个 act**（先 `change`、等受控值落定、再 `focusOut`）；两步同处一个 act 时 `onBlur` 会读到未刷新的旧输入态而等于没提交（主审日志：shared 16 仍显示 8、memory 4 仍显示 32、ResourceLimits shared 仍 0）。同时输入框显示值由 rc-input-number 的**被动** effect 同步（`rc-util/useLayoutEffect.js` 在 `NODE_ENV==='test'` 时用 `React.useEffect`），因此提交后的显示值断言统一放进 `waitFor`，并用状态直出的文案（「当前申请/上限」）作第二重确认。`showErrorModal` 的弹窗断言改为只读**当前可见 dialog**（旧的隐藏弹窗节点仍留在 body，读 body 会把旧文案算进来），清理改为按 DOM 点掉确认按钮并等 `.ant-modal` 归零。

## 5. 提交边界

未 stage/commit/push；未生成 AGENT.md/AGENTS.md/OpenSpec README；未改 hooks/CI/.env/.local/cert/凭据；未读 Global 历史 SPEC 当规则（仅 `QUESTIONS.md` 作问题证据只读）。

## 6. tasks.md 勾选依据

- 勾选 1.1 / 1.2 / 1.4：实现与文档写入已完成。
- **1.3 已勾选**：定向复跑 16 passed（错误弹窗 8 + ResourceLimits 8，`web-resource-cleanup-fixed.log`）。
- **2.1 已勾选**：full Web tests 28 文件 156 测试全部通过（exit 0），`--maxWorkers=2` 仅限制并发、未弱化断言（Windows 103.03s / Linux 60.70s）。本 change 剩余未勾项：**0**。

## 7. 本次验收证据（父代理/主审实测，非本代理运行）

- **测试修正**：第 2 轮已修正 3 个新测试文件的交互与作用域（见 2.8），**未删除或放宽断言、未改页面实现**。
- **定向复跑**：错误弹窗 8 例 + ResourceLimits 8 例共 **16 passed**（`web-resource-cleanup-fixed.log`）；1.3 据此勾选。
- **full Web tests**：**28 文件 156 测试全部通过（exit 0）**，以 `--maxWorkers=2` 重跑、**仅限制并发、未弱化断言**（Windows `web-all-final-two-workers.log` 103.03s、Linux `linux-tests-final.log` 60.70s）；此前 `CreateContainer` 5s 并发超时属历史记录，已随重跑通过；2.1 据此勾选。
- **Web 严格规格校验**：**26 items / 0 fail**（覆盖本 change、fix-web-build 与 `frontend--build`；补齐两份页面 delta 后重验，项数不变）。
- **仓库检查**：`git diff --check` 通过；cached 为空。
- **产物依赖图**（主审 AST，`chunk-graph-final.log`）：115 JS chunks，无 missing static imports、无 static cycles；入口 `index` 的 staticClosure 仅入口与 `vendor-react`，不含 `ModelViewer`/three；`ModelViewer` → vendorReact/webgl/addons/core，addons → webgl+core，webgl → core，core/react 无静态导入。
- **跨仓库契约（只读证据）**：Ctrl `remove-shared-memory-hard-cap` targeted **107 pass**，Ctrl strict **27 items / 0 fail**；本 change 的 `update_failed`(422) / `invalid_payload`(400) / `invalid_config` 映射与之一致。
- **未做**：**没有浏览器性能计时，也没有真实 Docker / 部署端到端**（未做 Docker 构建、容器部署或线上 E2E，不涉及 SSH）；不声称任何未运行的验证通过。