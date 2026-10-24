# frontend--container-credentials Specification

## Purpose

定义创建、新增协作者、账号重置、ROOT 交接与容器恢复的一次性凭据契约、受控展示、错误脱敏和安全边界。

## Requirements

### Requirement: 一次性凭据响应的结构校验

Web SHALL 在响应包含 `accepted` 或 `credentials` 时严格解析：仅当 `accepted === true` 且 `credentials` 为非空数组时进入密码展示；每项 MUST 提供非空字符串 `login_name` 与非空字符串 `password`，MAY 不含 `user_id`。创建、新增协作者、单账号重置与容器恢复 SHALL 恰好 1 项。ROOT 请求 SHALL 带纯布尔 `transfer_root`，默认 false：false 时（详情页）只重置 `root`，SHALL 恰好 1 项；true 时（Home/EditUserModal）保留既有交接，正常单个旧 ROOT 为 2 项，历史多旧 ROOT 为所有涉及账号 + `root` 的 N+1 项，可 >2。Web MUST 以响应 `login_name` 作为展示登录名，MUST NOT 用前端账号文本覆盖、截断、去重或合成额外项。

#### Scenario: 创建受理返回一项

- **GIVEN** 创建接口返回 `accepted: true`、`success: 1`、`message`，并含一项 `login_name=root`
- **WHEN** Web 解析响应
- **THEN** 得到恰好一项凭据并进入受控弹窗；保留原 success/message 供既有受理反馈

#### Scenario: 新增协作者受理返回一项

- **GIVEN** 新增协作者（ADMIN 或 COLLABORATOR）返回 `accepted: true` 与一项 `login_name=<新协作者绑定 username>` 的凭据
- **WHEN** Web 解析响应
- **THEN** 得到该项凭据并展示；不把前端选择的展示名当作 login_name，不插入未确认的本地账号行

#### Scenario: 详情页 ROOT 提升只返回 root

- **GIVEN** 请求 `transfer_root:false` 或无该字段，详情页把非 ROOT 账号提升为 ROOT
- **WHEN** Ctrl 返回 `accepted: true` 与一项 `login_name=root`
- **THEN** Web 只展示该项；不降旧 ROOT、不生成旧 ROOT 凭据、不要求第二项

#### Scenario: Home 交接常规两项

- **GIVEN** 请求 `transfer_root:true`，单个旧 ROOT 交接返回 `accepted: true`，credentials 为旧 ROOT 独立账号与 `root` 两项不同登录名
- **WHEN** Web 解析响应
- **THEN** 原样保留两项及各自 login_name；不重排、不合并、不假设共享同一 root 密码

#### Scenario: 历史多 ROOT 全部保留

- **GIVEN** 请求 `transfer_root:true`，历史多旧 ROOT 容器交接返回所有涉及账号 + `root`，credentials 为 N+1 项
- **WHEN** Web 解析并渲染
- **THEN** 逐项保留并展示全部 login_name，不截断、不丢弃涉及账号、不为凑固定项数改写任何角色

#### Scenario: 恢复成功返回 root 凭据

- **GIVEN** 容器恢复实际成功并返回 `accepted: true` 与一项 root 凭据
- **WHEN** DeletedContainers 处理响应
- **THEN** 最小复用同一弹窗展示该项；`requires_choice` 响应不展示密码

#### Scenario: 凭据项只带 login_name

- **GIVEN** credentials 项只有 `login_name` 与 `password`，没有 `user_id`
- **WHEN** Web 校验并渲染
- **THEN** 接受该结构并展示；不要求、不补造 user_id

#### Scenario: 登录名以响应为准

- **GIVEN** 前端账号卡展示名与响应 `login_name` 不同
- **WHEN** Web 渲染凭据
- **THEN** 使用响应中的 `login_name`，不使用前端展示名或本地推断的账号

### Requirement: 旧响应与无凭据兼容

未携带 `accepted` 与 `credentials` 的旧创建成功响应 SHALL 按既有成功流程处理且不展示密码。重置、新增协作者与 ROOT 交接缺少受理标志时 MUST NOT 被当作成功。普通非 ROOT 的 ADMIN/COLLABORATOR 互换返回空或缺省 `credentials` SHALL 视为无密码变更，不弹窗、不报错。

#### Scenario: 旧创建响应无凭据

- **GIVEN** 创建接口返回旧式 `success: 1` 与 `message`，没有 `accepted` 与 `credentials`
- **WHEN** 页面处理响应
- **THEN** 保留既有成功提示与后续导航，不打开密码弹窗，也不伪造密码

#### Scenario: 普通角色互换无凭据

- **GIVEN** 非 ROOT 账号在 ADMIN/COLLABORATOR 之间切换，响应保持 success/message 且 credentials 为空或缺省
- **WHEN** Web 处理响应
- **THEN** 不打开密码弹窗，不生成或改变密码，沿用既有成功反馈

#### Scenario: 新流程缺少受理标志

- **GIVEN** 新增协作者、重置或 ROOT 交接响应没有 `accepted: true`
- **WHEN** Web 处理响应
- **THEN** 不展示密码，显示通用未受理/响应异常提示；不按旧成功流程放行

### Requirement: 凭据响应异常的脱敏

对 HTTP 失败、`success === 0`、声明受理但 `accepted !== true`、字段缺失、项数不符或项内 password 为空，Web SHALL 抛出脱敏错误，MUST NOT 把 `credentials`、`root_password`、`password` 或 unsafe 原始响应体带入错误对象、message、console 或错误弹窗。错误 SHALL 保留 status、route、error_reason 与安全 `message`（如资源超限具体数值）；错误展示 SHALL 使用该安全 message 或已脱敏原因，不得为脱敏丢掉原有具体错误信息。

#### Scenario: 普通失败保留安全信息

- **GIVEN** 请求返回 HTTP 400、`error_reason=invalid_payload` 与安全 message（含资源超限数值），响应体不含密码字段
- **WHEN** Web 构造错误
- **THEN** 错误保留 status、route、error_reason 与安全 message 数值，不包含原始响应体 JSON 或 secret

#### Scenario: 失败响应夹带密码

- **GIVEN** HTTP 500 或 `success: 0` 的响应体含 `credentials`、`root_password` 或 `password`
- **WHEN** Web 构造错误
- **THEN** 错误 status/route/error_reason 可保留，但 message、console、错误弹窗均不含任何密码值或原始响应体 JSON

#### Scenario: 安全 message 与密码同体

- **GIVEN** 失败响应体含安全 `message`（如 Requested shared_memory 8GB cannot exceed memory 4GB）与 `credentials`/`root_password`
- **WHEN** Web 构造错误
- **THEN** 错误保留 8GB/4GB 的安全 message 数值，同时剥离所有 secret 与 unsafe 原始 body；console/错误弹窗不出现密码

#### Scenario: transfer_root:false 凭据不是恰好一项

- **GIVEN** 详情页请求 `transfer_root:false`，响应 `accepted: true`，但 credentials 缺失、不是数组、项数不是 1，或 login_name/password 为空
- **WHEN** Web 校验
- **THEN** 不展示任何部分密码，显示通用“响应异常”错误，不自动重试、不写入成功状态

#### Scenario: transfer_root:true 凭据少于两项

- **GIVEN** Home 请求 `transfer_root:true`，响应 `accepted: true`，但 credentials 缺失、不是数组、少于 2 项，或 login_name/password 为空
- **WHEN** Web 校验
- **THEN** 不展示任何部分密码，显示通用“响应异常”错误，不自动重试、不写入成功状态

### Requirement: 受理前守卫与后台复核

Ctrl SHALL 在受理前执行三层既有守卫：方法层 `container:operation`、资源层 `container:root`（ROOT 绑定或资源通配）、机器层主机与容器 `online` 可用；reset 的 UI 与后端三层守卫口径一致。失败 SHALL 返回既有 `error_reason`，MUST NOT 返回 `accepted: true` 或凭据。后台执行前 MAY 做最小既有 guard 二次核对，MUST NOT 新增 DTO、持久状态或租约。`accepted` 仅表示进程内任务已启动，不是持久队列承诺；oplog 未知结果（如超时）不得伪装 Node 确认成功。Web 收到未受理响应 MUST NOT 打开密码弹窗，只按既有 `error_reason`/安全 message 提示。

#### Scenario: 前置守卫失败

- **GIVEN** 容器离线、主机维护或其它既有 guard 不满足
- **WHEN** Web 提交创建/新增协作者/重置/ROOT 交接
- **THEN** Ctrl 在受理前拒绝，不返回密码；Web 不打开密码弹窗，只显示脱敏原因

#### Scenario: 受理后最小复核

- **GIVEN** 请求已受理并返回密码
- **WHEN** Ctrl 后台执行前做最小既有 guard 复核
- **THEN** 不新增持久 DTO/租约；复核失败按既有失败原因记录，不伪报成功，也不发明新密码

#### Scenario: 后台结果未知

- **GIVEN** 后台执行超时或 oplog 结果未知
- **WHEN** 页面读取操作历史
- **THEN** 不把未知结果呈现为 Node 确认成功；显示既有未知/失败提示，密码不回查

### Requirement: 审计复用且不重复记录

密码交付 MUST NOT 新增重复 oplog/审计。创建只沿用既有 CREATE 记录，不额外记录；新增协作者只沿用既有 `ADD_COLLABORATOR`；重置使用 `reset_container_password`；ROOT 各步沿用既有 `UPDATE_COLLABORATOR_ROLE`。任何日志 MUST NOT 含 secret，也不得增加密码日志。

#### Scenario: 创建与新增协作者只留既有审计

- **GIVEN** 创建容器或新增 ADMIN/COLLABORATOR 协作者成功受理
- **WHEN** 检查操作日志
- **THEN** 创建只有既有 CREATE 记录，新增只有既有 `ADD_COLLABORATOR` 记录；没有额外密码日志或重复日志

#### Scenario: 重置使用固定操作码

- **GIVEN** 账号重置成功受理
- **WHEN** 检查操作日志
- **THEN** 使用 `reset_container_password`；不额外写第二条密码日志

#### Scenario: ROOT 各步沿用既有角色审计

- **GIVEN** ROOT 交接按既有顺序完成各目标步骤
- **WHEN** 检查操作日志
- **THEN** 每步沿用既有 `UPDATE_COLLABORATOR_ROLE`，不新增重复的密码交接日志；失败记录不含 secret

### Requirement: 受控一次性密码弹窗

Web SHALL 使用专用受控弹窗展示密码，复用既有确认弹窗的视觉外观，但 MUST NOT 调用 `showErrorModal`，MUST NOT 将密码交给错误日志、错误上报或任何全局错误通道。弹窗每一项 MUST 严格显示“重置后{login_name}的密码：”及该密码；响应有 N 项时 SHALL 显示 N 行。弹窗 SHALL 提供逐项复制与关闭操作；复制失败 SHALL 显示普通失败提示且不记录密码。关闭弹窗、组件卸载或路由离开时，Web MUST 立即从组件状态清除全部密码与引用，MUST NOT 重新展示或提供“再次查看”。该保证是 DOM/状态层不可回看，不承诺 JavaScript 字符串物理零化。

#### Scenario: 单凭据展示与复制

- **GIVEN** 收到一项 `{login_name: "alice", password: "P@ss-..."}`
- **WHEN** 弹窗打开并点击复制
- **THEN** 行文案精确为“重置后alice的密码：”加该密码；剪贴板写入同一密码，不写入其他字段

#### Scenario: ROOT 交接两项展示

- **GIVEN** 收到旧 ROOT 独立账号与 `root` 两项凭据
- **WHEN** 弹窗打开
- **THEN** 两行分别使用各自 login_name 与密码，文案均为严格格式，不合并、不省略、不补行

#### Scenario: 关闭或卸载后不可再查看

- **GIVEN** 用户已看到密码弹窗
- **WHEN** 点击关闭、按 Esc、切换路由或组件卸载
- **THEN** 组件状态中的密码被清空；重新挂载或刷新页面不显示该密码，也没有查回请求

#### Scenario: 复制失败

- **GIVEN** 浏览器拒绝剪贴板写入
- **WHEN** 用户点击复制
- **THEN** 显示普通“复制失败”反馈；密码仍在当前弹窗中可见直到关闭，console/oplog 不出现密码

### Requirement: 密码不进入持久化、日志与回查通道

Web MUST NOT 将任何 `password`、`root_password` 或完整 `credentials` 写入 localStorage、sessionStorage、IndexedDB、URL、查询参数、WSS 消息、action 缓存、数据库、操作日志、审计或 console；MUST NOT 读取、展示或转发响应中的顶层 `root_password`，创建只消费 `credentials`。Web MUST NOT 将密码写入 Docker 环境/config/labels 或其他服务端持久通道。所有凭据响应 SHALL 由 Ctrl 带 `Cache-Control: no-store`；Web 请求 SHALL 使用 `cache: 'no-store'` 且不缓存响应。Web MUST NOT 提供或调用任何凭据查回接口；后续结果查询只读取不含密码的 oplog。Web MUST NOT 因关闭弹窗、切换路由或卸载页面而取消已发送的创建/新增协作者/重置/ROOT 交接请求，也 MUST NOT 在超时后自动重试并重复提交。

#### Scenario: 打开与关闭弹窗无持久化

- **GIVEN** 凭据弹窗已打开并随后关闭
- **WHEN** 检查 localStorage、sessionStorage、URL、console 与操作日志请求
- **THEN** 均不含密码或 credentials；凭据 POST 请求带 `cache: 'no-store'`，响应带 `Cache-Control: no-store` 且未被缓存

#### Scenario: 顶层 root_password 不进入 Web

- **GIVEN** 响应同时含顶层 `root_password` 与 `credentials`
- **WHEN** Web 解析并展示
- **THEN** 只使用 `credentials`；顶层 `root_password` 不出现在 UI、console、存储或后续请求中

#### Scenario: 卸载不取消已受理任务

- **GIVEN** 创建、新增协作者、重置或 ROOT 交接请求已发出
- **WHEN** 用户关闭弹窗、切换路由或组件卸载
- **THEN** Web 不调用取消/中止该请求的接口，不自动重发；任务的后续成功/失败只在 oplog 中呈现

#### Scenario: 超时或断连不重复提交

- **GIVEN** 请求已发出但客户端等待超时或连接断开
- **WHEN** 页面处理该异常
- **THEN** 不显示或持久化密码，不自动重试，不把任务宣称为成功或失败；提示用户通过 oplog 查看结果

### Requirement: 凭据入口统一且错误通道隔离

创建、新增协作者、账号重置与 ROOT 交接 SHALL 复用同一受控密码弹窗及其安全解析；成功密码 MUST NOT 通过 `showErrorModal`、全局 message 持久日志或任何错误展示路径输出。错误路径 SHALL 仅显示脱敏后的状态、原因或通用中文提示；任何异常对象 MUST NOT 携带原始凭据响应体。

#### Scenario: 四个容器入口使用同一展示组件

- **GIVEN** 创建、新增协作者、账号重置与 ROOT 交接分别成功返回密码
- **WHEN** 各页面展示结果
- **THEN** 均打开同一受控弹窗并采用严格行文案；`showErrorModal` 在成功路径未被调用

#### Scenario: 错误路径不显示密码

- **GIVEN** 任一入口失败，响应或异常中含密码字段
- **WHEN** 页面显示错误
- **THEN** 只显示脱敏错误；不打开密码弹窗，不把原始 body 传入错误弹窗或 console
