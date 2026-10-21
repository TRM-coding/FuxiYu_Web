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

页面 SHALL 保持以下已实现的交互及数据职责：加载详情、日志并每 5 秒轮询状态；支持启停重启删除、长期标记、解冻、协作者增删改；受理动作等待运行状态收敛；镜像信息卡在该容器详情下发 image_dockerfile 时原样展示它（容器自身记录），页面不按当前模板另行渲染。

#### Scenario: 启动已受理

- **WHEN** 启动已受理
- **THEN** 展示过渡状态并继续读取快照，最终 online/failed 由服务端事实决定

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

刷新按钮和容器动作完成后 SHALL 重新获取操作历史，不得只在首次挂载时读取。动作失败时 MUST NOT 追加成功历史；页面 SHALL 保留既有历史并展示失败原因，或在失败后按权威事实重取。

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

## Source references

- [src/pages/ContainerDetailPage.jsx](../../../src/pages/ContainerDetailPage.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../api/container_api`。
- 页面直接依赖：`../api/user_api`。
- 页面直接依赖：`../utils/showErrorModal`。
- 页面直接依赖：`../utils/detailFormat`。
- 页面直接依赖：`../utils/timeFormat`。
- 页面直接依赖：`../utils/statusDisplay`。
- 页面直接依赖：`../contexts/PermissionContext`。
- 页面直接依赖：`../utils/containerActions`。
- [src/test/](../../../src/test/)、[vite.config.js](../../../vite.config.js)：当前测试记录见 `openspec/changes/archive/2026-10-18-align-container-action-eligibility-and-recovery/` 与仓库验证日志；本规格不固化测试文件/用例数字；页面测试是否直接覆盖见 Global QUESTIONS。

