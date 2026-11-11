# frontend--page-machine-detail-page Test Plan

Spec: [spec.md](spec.md)

## Current Mapping

### Requirement: MachineDetailPage 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] src/test/routeLoading.test.jsx::机器详情路径仍匹配并解析 :machineId
  - [X] src/test/DetailPages.test.jsx::machine detail initializes with detail API and polls machine_status cache only
  - [X] src/test/AnvilManagePages.test.jsx::test_machine_detail_route_uses_path_id_and_repair_permission_gate
- Assertion scope: 真实路由 `/index/machines/7` 解析 `machineId=7`，页面以 `getDetailInformation(7)` 加载并以 `getMachineStatus(7, POLL_TIMEOUT)` 轮询；标题/ID 7 与机器数据来自路径主键。缺口 locator 只断言 `machine:manage` 对「修复连接」入口的显示门（有权限显示、无权限隐藏），并断言该门不改变路径主键/读取请求；不把编辑/删除按钮写成受 `machine:manage` 控制。
- Coverage note: 路由参数解析与真实页面加载分别覆盖；精确 DB id 与修复入口门由本 locator 覆盖，checkbox 已核实为 `[X]`。主规格 `openspec/specs/frontend--page-machine-detail-page/spec.md:11` 只规定读取/修改的方法能力，只有“确认后修复连接”Scenario 的 `spec.md:32` 明确“无权限不显示入口”；编辑/删除按钮没有“SHALL 隐藏”的明确约束，因此计划不断言额外前端 edit/delete 门，也不把 Ctrl/后端权限验证冒充成页面隐藏。读取侧 `machine:view`/资源权也没有明确的前端隐藏 SHALL（`src/routes/index.jsx:92` 直接挂载），由入口与 Ctrl/后端作最终读取裁决，本 plan 不伪造该门。

### Requirement: MachineDetailPage 主流程

#### Scenario: 保存未修改端口的基本信息

- Test/check:
  - [X] src/test/MachineDetailPort.test.jsx::标题区显示记录里的实际端口，编辑草稿预填该端口
  - [X] src/test/MachineDetailPort.test.jsx::未改动端口时保存回传真实端口，而不是 null
  - [X] src/test/MachineDetailPort.test.jsx::端口未配置时给出明确缺省语义，不显示默认端口号
  - [X] src/test/AnvilManagePages.test.jsx::test_machine_detail_explicit_null_port_clears_platform_default
  - [X] src/test/AnvilManagePages.test.jsx::test_machine_detail_maintenance_switch_independent_of_machine_status
- Assertion scope: 详情 `port=6789` 时标题显示「端口 6789」，编辑草稿预填 6789；只改描述保存时 `updateMachine(7, ...)` 的 `port` 仍为 6789，不发送 null；详情 `port=null` 时显示「端口 未配置（平台默认）」，不硬编码 5789（已由独立 locator 断言）。维护开关部分已补：捕获真实 `getMachineStatus` 轮询回调并以 `{machine_status:'offline', is_maintenance:true}` 响应，断言维护标记不被轮询清除、状态按离线更新；切换仍先 `updateMachine(7, fields)`、后 `setMachineMaintenance(7,true)`、参数正确且 `machine_status` 不写入。
- Coverage note: 未修改端口与显式清空端口已由独立 `[X]` locator 覆盖；维护开关写入顺序与“轮询不清除维护”均由本 locator 补真实断言并标 `[X]`。`src/pages/MachineDetailPage.jsx:117-126` 的实际顺序是 `updateMachine` 后按维护值变化调用 `setMachineMaintenance`。

#### Scenario: 内存限额 32 GB、共享限额 16 GB

- Test/check:
  - [X] src/test/MachineSharedLimit.test.jsx::共享内存滑条上限取本次编辑的 max_memory_gb（32 GB），不再固定 8 GB
- Assertion scope: 硬件内存 64 GB、本次 `max_memory_gb=32` 时共享滑条与数字输入的 `aria-valuemax` 均为 32，16 GB 可选、可提交；保存 payload `max_memory_gb=32`、`max_shared_gb=16`，不受固定 8 GB 限制。
- Coverage note: 共享上限、16 GB 可选与提交 payload 已确证；未改动端口保存保持原端口由端口场景覆盖。

#### Scenario: 确认后修复连接

- Test/check:
  - [X] src/test/AnvilManagePages.test.jsx::test_machine_detail_renew_trust_confirm_success_failure_and_permission
- Assertion scope: 具备 `machine:manage` 时显示「修复连接」；点击后出现二次确认，确认才调用 `renewMachineTrust(7)`；成功提示「连接信任已重建」，`uid_reissued`/`uid_mismatch` 按响应追加文案，随后静默刷新详情；失败经 `showErrorModal` 显示具体错误；无权限不显示入口，不调用 `registerMachine`、不重建机器档案。
- Coverage note: 既有 `MachineDetailPort`/`MachineSharedLimit` mock 了 `renewMachineTrust` 但没有用例触发；该行为由本 locator 覆盖，checkbox 已核实为 `[X]`。

### Requirement: MachineDetailPage 限额编辑的输入口径与超限阻断

#### Scenario: 降低内存限额

- Test/check:
  - [X] src/test/MachineSharedLimit.test.jsx::降低内存上限时同步收敛已有共享值（32→4 时 shared 16→4），保存 payload 不超限
- Assertion scope: 当前 `max_memory_gb=32`、`max_shared_gb=16`，把内存降到 4 后共享值立即变为 4，数字输入与滑条读数一致，出现「已将共享内存上限下调到 4 GB」提示；保存 payload 为 `max_memory_gb=4`、`max_shared_gb=4` 且后者不大于前者。
- Coverage note: 收敛、可见提示与保存 payload 均已确证。

#### Scenario: 数字输入与滑条同口径

- Test/check:
  - [X] src/test/MachineSharedLimit.test.jsx::四项限额都有与滑条同口径的数字输入，超上限输入收敛到同一上限
- Assertion scope: cpu/memory/shared/disk 四项都有与滑条同 min/max/step 的数字输入；memory 上限 64、cpu 16、shared 32；在 shared 输入 99 后 blur 收敛到 32，滑条与输入一致，并显示「不得高于本次内存上限 32 GB」「硬件内存 64 GB」。
- Coverage note: 四项同口径与超上限收敛已确证；硬盘/CPU 的独立超上限未逐一造数，但同一收敛函数与 max 属性已断言。

#### Scenario: 限额只在机器详情页编辑

- Test/check:
  - [X] src/test/AnvilManagePages.test.jsx::test_manage_machine_add_host_sends_only_trust_anchor_fields
- Assertion scope: 真实 `ManageMachine` 的「添加宿主机」弹窗包含机器名、IP、可选 Node 端口与「描述」`Input.TextArea`；填写描述后提交，断言 `registerMachine` 请求体的 `machine_description` 等于填写值；清空描述再提交，断言 `machine_description` 为空串。请求体只含 `machine_name`/`machine_ip`/`machine_description`/可选 `port`，不含 `max_*`、硬件容量或默认策略字段；弹窗不出现内存/CPU/GPU/磁盘限额输入，限额仍只在机器详情页编辑。
- Coverage note: `src/pages/ManageMachine.jsx:1556-1558` 确有 `machine_description` 的 `Input.TextArea`，`specs/frontend--page-machine-detail-page/spec.md:50` 也明确列出“描述”；本计划不再写“描述没有输入项”。现有测试没有覆盖添加宿主机提交，该行为由本 locator 覆盖，checkbox 已核实为 `[X]`。

### Requirement: MachineDetailPage 保存失败的错误呈现

#### Scenario: 服务层拒绝共享超内存

- Test/check:
  - [X] src/test/MachineSharedLimit.test.jsx::保存被后端拒绝时把具体 message、状态与路由交给 showErrorModal
  - [X] src/test/AnvilManagePages.test.jsx::test_machine_detail_update_failed_422_shows_route_chinese_with_numbers
- Assertion scope: `updateMachine` 返回 422、`error_reason=update_failed`、message 为 `max_shared_gb 16GB cannot exceed max_memory_gb 8GB` 时，页面把原始 body、status 422、route 交给 `showErrorModal`；缺口 locator 使用真实弹窗断言保留 message 与 16GB/8GB，同时出现「更新机器失败」与 422 的中文提示，不出现容器创建超限（`invalid_config`）文案。
- Coverage note: 调用参数已确证；真实弹窗中文/数值与「不串到容器创建」的呈现由本 locator 覆盖，checkbox 已核实为 `[X]`。

#### Scenario: 请求模型层非法值

- Test/check:
  - [X] src/test/AnvilManagePages.test.jsx::test_machine_detail_invalid_payload_400_uses_machine_route_chinese
- Assertion scope: `updateMachine` 返回 400、`error_reason=invalid_payload` 时，真实 `showErrorModal` 显示「机器配置限额参数无效」与 400 的中文提示，不显示容器创建超限文案，也不把 400 当成普通成功或静默失败。
- Coverage note: 机器更新路由的 `invalid_payload` 映射存在，但没有既有行为测试命中该路由；该行为由本 locator 覆盖，checkbox 已核实为 `[X]`。

### Requirement: MachineDetailPage 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] npm run build
- Assertion scope: `npm run build` 退出码 0，完成构建并产生 `dist` 产物。该 check 只证明构建可完成与产物存在；机器详情页/共同布局的懒加载 chunk、`ModelViewer` 的 three 分包与 Rollup 警告清单不是该命令的自动断言，属实现上下文与验收观测，不作为本 check 的通过条件。
- Coverage note: 该 check 只对构建命令与产物负责；`React.lazy`/`manualChunks`/three 分包与具体警告清单不是该命令的自动断言，属实现上下文与验收观测；不新增源码字符串机械测试。

### Requirement: MachineDetailPage 窄屏共享布局不横向溢出

#### Scenario: 390px 长机器名与长指标文案

- Test/check:
  - [X] src/test/DetailPagesLayout.test.js::tc_machine_css_01_390
  - [X] src/test/AnvilManagePages.test.jsx::test_machine_detail_responsive_dom_and_optional_metrics
- Assertion scope: CSS 静态检查确认共享网格使用 `repeat(auto-fit, minmax(min(460px, 100%), 1fr))`、标题 `overflow-wrap:anywhere`、指标补充文案声明可换行；缺口 locator 在 jsdom 中渲染 390px 场景的长机器名/较长描述与完整 CPU/内存/GPU/磁盘指标，只断言名称、指标文案、趋势图标题、保存/编辑控件存在于真实 DOM，保存/编辑可被调用，卡片分组与 DOM 顺序可读。jsdom 不做布局计算，不证明单列、换行、`scrollWidth <= 392` 或无横向滚动；这些由真实浏览器验收。
- Coverage note: 既有 CSS locator 只证明声明契约；本 locator 只补真实 DOM/控件存在与可调用，不伪造像素布局。390px 换行、单列与滚动边界需真实浏览器证据；DOM 映射 checkbox 已核实为 `[X]`。

#### Scenario: 320px 长 GPU 名称与限制说明

- Test/check:
  - [X] src/test/DetailPagesLayout.test.js::tc_machine_css_02_320
  - [X] src/test/AnvilManagePages.test.jsx::test_machine_detail_responsive_dom_and_optional_metrics
- Assertion scope: CSS 静态检查确认 980px 以下 `.machine-limit-row` 声明改为纵向、GPU 选项 `max-width:140px`、`.detail-card` `min-width:0`；缺口 locator 在 jsdom 中渲染 320px 场景的无空格长 GPU 名称与长限制说明，只断言长文本存在、保存按钮与 GPU 选择控件存在于真实 DOM 且可点击。jsdom 不证明实际换行、省略、控件完整可见或页面无横向滚动；这些由真实浏览器验收。
- Coverage note: 静态 CSS 与 jsdom DOM 是两类证据；本 locator 不声称 320px 下的视觉换行/完整可见/无滚动，只补文本与控件接线；DOM 映射 checkbox 已核实为 `[X]`，像素布局需浏览器验收。

#### Scenario: 768px 与桌面的共享布局

- Test/check:
  - [X] src/test/DetailPagesLayout.test.js::tc_machine_css_03_768_desktop
  - [X] src/test/AnvilManagePages.test.jsx::test_machine_detail_responsive_dom_and_optional_metrics
- Assertion scope: CSS 静态检查确认共享网格在桌面/768 声明可收缩最小列宽、指标卡 `min-width:0`；缺口 locator 分别在 jsdom 的 768px/1440px 场景渲染同一份详情，只断言指标、趋势图、限额编辑控件均存在于真实 DOM，且 DOM 文档顺序不因视口设置改变。jsdom 不证明网格收缩、无横向溢出、多列布局或视觉归属；这些由真实浏览器验收。
- Coverage note: 既有 locator 只断言 CSS；本 locator 只补 DOM/控件存在与文档顺序，不冒充 768/1440 布局或溢出结论；DOM 映射 checkbox 已核实为 `[X]`，像素布局需浏览器验收。

#### Scenario: 可选指标缺失时仍保持布局

- Test/check:
  - [X] src/test/DetailPagesLayout.test.js::tc_machine_css_04_optional_metrics
  - [X] src/test/AnvilManagePages.test.jsx::test_machine_detail_responsive_dom_and_optional_metrics
- Assertion scope: CSS 静态检查确认指标值/补充文案/运行项声明允许换行且 `min-width:0`；缺口 locator 在 jsdom 中让 `runtime_snapshot` 缺少 CPU、GPU 或磁盘部分字段，只断言缺失项按既有未知占位显示、页面不发起补充请求或伪造数值、保存/限额控件仍存在于真实 DOM。jsdom 不证明卡片不超视口、长标题实际换行或视觉可读性；这些由真实浏览器验收。
- Coverage note: 静态 CSS 不覆盖未知占位与请求行为；本 locator 补 DOM/占位/无补充请求，不声称视口或换行结果；DOM 映射 checkbox 已核实为 `[X]`，像素布局需浏览器验收。
