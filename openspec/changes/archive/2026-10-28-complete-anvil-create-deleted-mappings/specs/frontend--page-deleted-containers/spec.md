# Spec Delta

## MODIFIED Requirements

### Requirement: DeletedContainers 页面入口与身份

页面 SHALL 通过 `/admin/deleted-containers` 装配。现有身份与权限约束为：container:manage；记录使用 deleted_id，分页依服务端 total_number。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `DeletedContainers` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: DeletedContainers 主流程

页面 SHALL 保持以下已实现的交互及数据职责：展示 mount 保留/已清理/升级清理；恢复返回 requires_choice 时显示 snapshot/template 两份配方，差异按 sections 分段标注基础镜像/业务片段/启动命令的有无变化并在前端计算逐行差异，选择 content_source 后重调；容器留痕只随该二选一响应公布，页面不单独请求。

#### Scenario: 恢复需要选择来源

- **WHEN** 恢复需要选择来源
- **THEN** 首次响应只提供两份配方，不表示恢复完成；用户选择后提交 snapshot 或 template

#### Scenario: 差异分段与公布落点

- **WHEN** 恢复返回 requires_choice
- **THEN** 变化分布按 sections 的 name 渲染为基础镜像/业务片段/启动命令并标有变化/无变化，逐行差异由 dockerfileDiff 就地计算，页面不再发起单独读取容器留痕的请求

### Requirement: DeletedContainers 构建归属

页面 SHALL 通过路由表的按需加载组织参加 Vite 构建：`src/routes/index.jsx` 对页面组件与共同布局（`MainLayout`、`AdminLayout`）使用 `React.lazy` 动态导入，并在 route element 层以既有 `Suspense` 提供页面级加载反馈（仅描述当前实现，不新增加载 UI）；`LoginLayout`、路由骨架与 React 运行时随入口静态加载。`LoginLayout` 内的 `ModelViewer` 亦按需加载，three 相关代码经 `vite.config.js` 的 `manualChunks` 按依赖方向 addons → WebGL → core 分为 `vendor-three-core`、`vendor-three-webgl`、`vendor-three-addons`，均不进入入口 chunk。上述页面与 `ModelViewer` 不再与同路由树代码共同进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`src/utils/requestManager.jsx` 与 `src/utils/validateCmdArg.jsx` 统一为静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属构建验收观测，记入本轮验收报告，不作为本规格固化的历史指标

### Requirement: 长期恢复超限保留明确失败反馈

恢复接口因长期容器数量限制拒绝时，页面 SHALL 保留后端 error_reason、message 中的当前数量与上限并显示可理解的中文提示，MUST NOT 显示恢复成功或移除失败记录。用户释放配额后 SHALL 能使用原恢复记录重试。

#### Scenario: 数量达到上限
- **WHEN** 恢复返回 long_term_limit_reached 并说明已用数量和上限
- **THEN** 显示长期容器数量超限及具体数量，不泛化为未知错误，也不提示恢复请求已发送

### Requirement: 恢复成功后的 root 凭据展示

DeletedContainers 实际恢复成功且响应 `accepted: true` 与恰好一项 root 凭据时，页面 SHALL 最小复用 `CredentialModal` 展示该密码，MUST NOT 丢失恢复成功返回的密码。`requires_choice: true` 的响应 SHALL 绕过凭据解析并 SHALL NOT 展示密码弹窗。失败、异常或凭据非法时 MUST NOT 展示密码，且 MUST NOT 把 `err.body`/原始响应 JSON 交给 `showErrorModal` 或 console；安全 message 可保留。不得改变恢复其他业务规则、页面布局、列表/分页或既有恢复流程。

#### Scenario: 恢复成功展示 root 密码

- **GIVEN** 用户确认恢复一个可恢复容器
- **WHEN** Ctrl 返回 `accepted: true` 与一项 `login_name=root` 的凭据
- **THEN** 页面复用同一受控密码弹窗展示该项，文案为“重置后root的密码：”；恢复其他业务与页面布局不变

#### Scenario: requires_choice 不展示密码

- **GIVEN** 恢复响应 `requires_choice: true`，尚未实际恢复
- **WHEN** 页面处理响应
- **THEN** 不打开密码弹窗、不展示任何密码；仍按既有二选一流程处理

#### Scenario: 恢复失败或凭据非法

- **GIVEN** 恢复失败，或 `accepted: true` 但凭据缺失/字段非法，且失败响应可能夹带 secret
- **WHEN** 页面处理结果
- **THEN** 不展示密码，不改变恢复其他业务；不把 `err.body`/原始 JSON 交给 `showErrorModal` 或 console，只显示安全 message 或响应异常提示

### Requirement: 已删除容器保留分页与当前操作上下文

已删除容器页 SHALL 在 records 为空时仍保留列表（桌面表格或移动卡片）与分页入口。动作确认成功后 SHALL 按操作完成时当前页及页大小刷新；只有权威总数表明页码越界时才退至有效页，MUST NOT 无条件回到第一页。异步回调 SHALL 使用当前分页参数，清退捕获旧页的冗余回调；迟到响应 MUST NOT 覆盖新页，加载和自动回退不能形成重复请求循环。

#### Scenario: 同页刷新保持当前位置

- **GIVEN** 用户停留在第二页，权威总数仍包含第二页
- **WHEN** 清理或恢复成功并触发列表刷新
- **THEN** 页面仍按第二页与原页大小请求，列表和分页显示第二页结果，不跳回第一页

#### Scenario: 空页仍可翻页
- **WHEN** 当前页返回空列表，但总数仍有其他有效页
- **THEN** 保留分页入口，可访问有效页；确认越界后才按最新总页数回退

#### Scenario: 操作期间切换分页
- **WHEN** 在第二页发起清理或恢复，动作完成前切换到另一页
- **THEN** 动作完成后刷新当前页，不调用已捕获的旧页回调，旧响应不覆盖当前页

#### Scenario: 最后一页减少
- **WHEN** 动作完成后权威总数减少，原页码超过最新末页
- **THEN** 回到最新有效末页并有限次重取数据，未越界时保留原页，不强制跳首页

### Requirement: DeletedContainers 仅按当前页请求异步用量

DeletedContainers SHALL 在既有列表成功后，仅对当前页中 `mount_path` 非空、`mount_cleaned !== true`、`cleaned_at` 为空且 `deleted_id` 为正整数的记录异步请求 Ctrl 用量。`mount_cleaned === true` 或 `cleaned_at` 非空均视为已清理，不请求统计并展示“已清理”。单次 `deleted_ids` MUST NOT 超过 100，MUST NOT 包含宿主路径，Web MUST NOT 直接调用 Node。列表、分页、恢复、清理 MUST NOT 等待统计；权限沿用既有 `container:manage`，不新增 machine 角色门禁或路径输入。

#### Scenario: 列表先出现、统计后到达

- **WHEN** 已删除列表请求成功而后续用量响应仍在等待
- **THEN** 列表（桌面表格或移动卡片）与分页先按列表结果显示，用量行显示等待状态；列表不被 du 或统计请求阻塞，也不提前写入统计值

#### Scenario: 仅请求当前页可测记录

- **WHEN** 当前页包含多条已删除记录
- **THEN** Web 只发送本页有挂载、`mount_cleaned !== true`、`cleaned_at` 为空且 `deleted_id` 为正整数的 ID，单次不超过 100 个；请求体不含任何宿主路径，页面也不为这些 ID 之外记录发请求

#### Scenario: 无挂载、mount_cleaned=true 或 cleaned_at 非空不扫描

- **WHEN** 某行没有 `mount_path`；或 `mount_cleaned === true`（即使 `cleaned_at` 为空）；或 `cleaned_at` 非空
- **THEN** 前者显示“无挂载”，后两者显示“已清理”；均不把该行 ID 放入统计请求，也不触发任何目录扫描

### Requirement: DeletedContainers 如实展示逻辑大小与测量时间

成功统计项 SHALL 按 `deleted_id` 映射到对应行，展示 `du -sb` 逻辑字节数和该样本真实 `measured_at`；MUST NOT 把逻辑字节称为物理磁盘块，也不得称为实时或瞬时占用。成功结果 `bytes=0` 时 SHALL 显示 0 B，并只在成功状态展示一个优化样式的逻辑用量进度条；进度条只能由成功样本驱动，不得把 pending、error、缺项或未请求状态画成 0% 成功条。若已有记录包含正数比较上限，则条宽按逻辑字节与该上限计算并在超过上限时封顶视觉宽度但保留实际数值；没有比较上限或上限不为正时显示无比例的成功轨道，使用 `aria-valuetext` 说明已测量但没有可比上限，不伪造百分比。可见测量文案 SHALL 缩短为 `测量 {MM-DD HH:mm}`，完整时间继续放在可访问的 `title` 或等价提示中；只有成功样本可显示时间。页面 MUST NOT 为此新增接口字段、数据库字段、Node 请求、缓存或权限门禁；pending 项继续按主规格的有界轮询收敛，失败、缺项和旧缓存不得冒充当前成功样本。

#### Scenario: 成功且确实为零

- **GIVEN** 某项 `pending=false`、`error=null` 且 `bytes=0`
- **WHEN** 该行渲染
- **THEN** 显示 0 B 和成功进度条，显示对应测量时间；无正数上限时该条为无比例成功轨道，不把零解释为失败、缺项或未知

#### Scenario: 成功样本与旧测量时间

- **GIVEN** 某项 `pending=false`、`error=null`、`bytes` 为非负数且有真实 `measured_at`，即使样本来自较早测量
- **WHEN** 该行渲染逻辑用量
- **THEN** 显示优化样式的成功进度条、逻辑大小和 `测量 {MM-DD HH:mm}`；完整时间在提示属性中保留，进度条具有可访问的成功语义，不声称实时或物理块占用；时间按现有浏览器本地化格式生成

#### Scenario: 成功样本有上限或没有上限

- **GIVEN** 成功样本有可靠比较上限、逻辑字节超过该上限，或没有比较上限
- **WHEN** 该行渲染成功进度条
- **THEN** 有正数上限时按逻辑字节与上限计算并在超限时封顶宽度；没有上限或上限不为正时显示无比例成功轨道并设置说明性 `aria-valuetext`，不显示伪造百分比，但仍显示实际逻辑大小和测量时间

#### Scenario: 测量中

- **GIVEN** 某项 `pending=true`、`bytes=null`、`error=null`，或仍处于列表加载中
- **WHEN** 该行渲染
- **THEN** 显示既有“读取统计中”或“测量中”状态，不渲染成功进度条、不显示 0 或伪造测量时间

#### Scenario: 失败、缺项或形状非法

- **GIVEN** 某项 `error` 非空、响应缺项、响应形状非法、无挂载或已清理
- **WHEN** 该行渲染
- **THEN** 沿用既有的统计不可用、无挂载或已清理展示，不渲染成功进度条、不显示伪造时间、不把状态改写成 0 B，并继续丢弃缺项或过期响应

### Requirement: DeletedContainers 有界轮询、取消与旧响应失效

当前页存在 pending 项时，Web SHALL 每 5 秒重查这些项，单页累计最多 120 次；success 或 error 项 MUST 停止轮询。离开、翻页、刷新、清理或恢复时，Web SHALL 取消旧计时器和在途请求，并丢弃迟到响应；预算耗尽后 MUST 停止自动轮询，保留“测量未完成”提示并允许手动刷新，MUST NOT 无限轮询或扩周期 WSS。

#### Scenario: pending 收敛即停止

- **WHEN** 某 pending 行在后续查询中变为 success 或 error
- **THEN** 该行停止轮询并显示最终结果；其他仍 pending 的行继续按 5 秒间隔查询

#### Scenario: 离开、翻页、刷新取消

- **WHEN** 用户在 pending 期间离开页面、翻页或手动刷新列表
- **THEN** 旧计时器与在途统计请求被取消，迟到响应因当前页/请求序号不符而被丢弃，不覆盖新页或新一轮统计

#### Scenario: 清理或恢复后不保留旧用量

- **WHEN** 清理或恢复成功并重新加载列表
- **THEN** 相应旧统计与计时器立即失效；已清理行只显示“已清理”，不再扫描该路径或展示清理前的 bytes/pending

#### Scenario: 单页预算耗尽

- **WHEN** 当前页 pending 轮询达到 120 次仍未全部收敛
- **THEN** 自动轮询停止，页面保留“测量未完成”提示并允许用户手动刷新，不继续后台轮询或改用周期 WSS

### Requirement: DeletedContainers 保持旧接口兼容与原有流程

旧 Ctrl 不支持统计接口、响应不可用或逐项失败时，Web SHALL 仅把用量显示为“统计不可用”/稳定原因，MUST NOT 填 0、假成功或阻断列表、分页、恢复、清理。Ctrl 返回的 `node_unsupported`、`node_timeout`、`node_unavailable`、`node_bad_response` MUST 按不可用处理；单行或单机失败不得影响其他行。

#### Scenario: 旧 Ctrl 没有统计接口

- **WHEN** 统计接口返回 404/405 或不可识别的旧响应
- **THEN** 当前列表照常显示，所有相关用量显示“统计不可用”，不弹阻断错误、不显示 0；恢复与清理仍按原有列表字段和权限工作

#### Scenario: 单机失败不拖累其他机器

- **WHEN** 当前页一部分记录的机器返回 `node_unavailable` 或 `node_timeout`，另一部分成功或 pending
- **THEN** 失败行显示对应不可用原因，成功行显示逻辑大小，pending 行继续有界轮询；任一失败不把整页结果清空或改成 0

#### Scenario: 旧 Node 不支持或响应异常

- **WHEN** Ctrl 因旧 Node 404/405 返回 `node_unsupported`，或因超时、离线、缺路径/形状错误返回 `node_timeout`、`node_unavailable`、`node_bad_response`
- **THEN** Web 将这些编码显示为统计不可用及可理解原因，不当作成功空结果、不填 0，也不直接重试 Node

#### Scenario: 不扩张权限与持久化

- **WHEN** 用量请求成功、pending 或失败
- **THEN** 结果只影响当前页展示与轮询，不新增 `container:manage` 之外的权限或 machine 角色门禁，不写数据库、`disk_*`、恢复快照或清理记录，不扩周期 WSS，也不触发清理、恢复或删除

### Requirement: DeletedContainers 表格信息层级与 Mount 复制样式

DeletedContainers SHALL 保持现有的已删除容器列表、分页、挂载用量请求、清理和恢复流程。桌面主表（视口大于 768px）SHALL 保留容器身份、机器、Mount、逻辑用量、删除时间、状态和操作；镜像信息 SHALL 移入可展开详情，不再单独占用主表列。桌面主表的 Mount SHALL 使用现有 `CopyChip` 的 `meta` 与 `soft` 小号样式，保留完整路径到 `title` 和复制值。移动端 SHALL 使用共享 `TableComponent` 卡片并复用同一 `columns` 数组与 `expandedRowRender`；移动详情入口与卡片边界见新增要求。本展示变更 MUST NOT 新增接口字段、数据库字段、Node 请求或权限门禁。

#### Scenario: 删除列表显示详情与可复制 Mount

- **GIVEN** 已删除记录包含镜像名和非空 Mount 路径
- **WHEN** 表格和该行详情渲染
- **THEN** 主表没有单独的镜像列，展开详情显示镜像，Mount 单元格显示小号复制控件，复制值和 `title` 均包含完整路径

#### Scenario: 空 Mount 或空镜像

- **GIVEN** 记录的 Mount 路径为空，或镜像名缺失
- **WHEN** 表格或展开详情渲染
- **THEN** 空 Mount 显示“无挂载”且不渲染复制控件；空镜像显示“未知”；两者都不生成无效复制按钮或猜测值

#### Scenario: 复制失败

- **GIVEN** 剪贴板写入失败
- **WHEN** 用户点击 Mount 复制控件
- **THEN** 显示“复制失败”，路径、`title` 和复制值不变，不发起接口或 Node 请求

#### Scenario: 旧流程

- **GIVEN** 用户翻页、刷新、清理 Mount 或恢复已删除容器
- **WHEN** 页面沿用现有生命周期处理
- **THEN** 分页、有限用量轮询、取消、清理和恢复行为保持不变，迟到响应不覆盖当前页

### Requirement: DeletedContainers 移动端复用共享卡片布局

DeletedContainers SHALL 在视口宽度不超过 768px 时通过共享 `TableComponent` 渲染卡片列表，并继续使用页面现有的 `columns` 数组、`rowKey="deleted_id"`、`expandedRowRender` 与分页回调；视口大于 768px 时 SHALL 继续渲染 antd 表格。两种布局 MUST 共用同一份列定义与同一份详情渲染，不得维护两套字段、两套数据请求或额外镜像/用量列。移动端卡片 SHALL 按列 `title` 显示标签，按原 `render` 显示值，完整保留容器、机器、Mount、逻辑用量、删除时间、状态和操作。卡片、长路径、长名称、操作按钮与复制控件 MUST NOT 把整页撑宽或被相邻内容遮挡。

#### Scenario: 390px 以卡片展示七列

- **GIVEN** 当前页存在包含容器、机器、Mount、逻辑用量、删除时间、状态和操作字段的已删除记录
- **WHEN** 在 390px 视口渲染
- **THEN** 页面不出现 antd 表格，每条记录显示为一张卡片，七个列标题与对应值均可见，`document.documentElement.scrollWidth` 不超过 392px

#### Scenario: 768px 使用卡片而桌面保留表格

- **GIVEN** 同一份已删除记录分别在 768px、769px 和 1440px 视口打开
- **WHEN** 页面完成列表加载
- **THEN** 768px 使用卡片列表，769px 与 1440px 使用带列头的 antd 表格；三个视口显示的记录字段、分页总数和操作保持一致

#### Scenario: 320px 长路径与长名称不遮挡操作

- **GIVEN** 容器名和 Mount 路径包含无空格长串，当前视口为 320px
- **WHEN** 卡片渲染并显示复制与恢复/清理按钮
- **THEN** 文本在卡片内换行或截断，页面无横向滚动，Mount 复制控件与操作按钮完整可见且可点击，不出现单元格重叠

#### Scenario: 列定义或数据为空

- **GIVEN** 当前页没有记录，或某条记录缺少可选展示字段
- **WHEN** 在移动端渲染
- **THEN** 空页仍显示空态与分页入口，缺字段按既有占位显示，不生成空白卡片、不伪造字段，也不因移动布局改变请求次数

### Requirement: DeletedContainers 移动端详情主动展开与收起

DeletedContainers SHALL 为移动卡片提供可主动操作的详情展开/收起入口，并通过受控 `expandable.expandedRowKeys` 与 `expandable.onExpandedRowsChange` 同共享 `TableComponent` 的展开按钮同步状态；桌面端 SHALL 继续使用 antd 展开图标。展开内容 MUST 沿用现有 `expandable.expandedRowRender` 的镜像、资源、端口、删除来源和账号字段，不得新增请求或改变用量轮询、分页和当前页刷新。单行展开/收起 MUST 只影响该 `deleted_id`，不得影响其他记录。

#### Scenario: 390px 展开并收起一行详情

- **GIVEN** 已删除记录包含镜像、资源、端口和账号，当前 `expandable.expandedRowKeys` 为空
- **WHEN** 用户在 390px 卡片点击“展开详情”，随后点击“收起详情”
- **THEN** 展开后卡片内显示镜像、资源、端口、删除来源和账号，按钮文案变为“收起详情”且 `aria-expanded=true`；收起后详情消失、`aria-expanded=false`，列表与用量请求次数不变

#### Scenario: 桌面展开图标与移动按钮共享状态

- **GIVEN** 同一行记录在桌面通过 antd 展开图标打开详情
- **WHEN** 视口仍为桌面并再次点击该图标
- **THEN** 详情按 antd 受控展开行为打开/关闭，展开内容与移动端一致，不出现第二份详情或重复行

#### Scenario: 详情文本很长

- **GIVEN** 镜像名、资源描述或账号文本包含无空格长串，视口为 320px
- **WHEN** 展开该行详情
- **THEN** 详情文本在卡片内换行，页面仍无横向溢出，收起按钮可见且可操作

#### Scenario: 旧展开 key 不属于当前页

- **GIVEN** `expandable.expandedRowKeys` 保留了上一页某条记录的 `deleted_id`
- **WHEN** 用户翻到不包含该记录的新一页
- **THEN** 当前页不渲染空白详情或错误卡片，分页、卡片字段和用量轮询正常，迟到响应不恢复旧详情

### Requirement: DeletedContainers 移动端 Mount 复制与用量状态

移动端 Mount SHALL 继续使用现有 `CopyChip` 的 `meta` 与 `soft` 样式，复制值与 `title` MUST 为完整路径；在 320px 和 390px 下 SHALL 可用真实点击写入浏览器剪贴板。剪贴板失败时 SHALL 显示既有“复制失败”，路径、`title` 与复制值保持不变。逻辑用量的加载、测量中、成功 0 B、有/无比较上限、失败、缺项、已清理和无挂载状态 MUST 按既有规则展示；只有成功样本可显示进度条，pending、error、缺项、已清理和无挂载 MUST NOT 显示为 0 或伪造成功。

#### Scenario: 320px 真实点击复制完整 Mount

- **GIVEN** Mount 路径含中文、空格和长目录，视口为 320px，且记录可测量
- **WHEN** 用户真实点击卡片中的 Mount 复制控件
- **THEN** 浏览器剪贴板内容与完整路径逐字一致，控件 `title` 也是完整路径，操作按钮未被遮挡，且不发起接口或 Node 请求

#### Scenario: 复制失败保留路径

- **GIVEN** 浏览器拒绝剪贴板写入
- **WHEN** 用户在 390px 卡片点击 Mount 复制控件
- **THEN** 显示“复制失败”，路径、`title` 和复制值不变，后续恢复/清理与用量展示仍可用

#### Scenario: 390px 展示全部用量状态

- **GIVEN** 当前页同时包含成功且有上限、成功 0 B 且无上限、pending、error、缺项、已清理和无挂载记录
- **WHEN** 在 390px 渲染卡片
- **THEN** 成功样本显示实际逻辑大小与测量时间，正数上限显示确定比例、无上限显示无比例成功轨道；pending 显示“测量中”，error 显示既有中文原因（如“统计超时”或“无权限读取目录”），缺项显示“统计不可用”，已清理/无挂载显示原状态；任一非成功状态均不显示 0 B 或成功进度条

#### Scenario: 390px 统计未返回时显示读取统计中

- **GIVEN** 移动端列表已成功返回，当前页可测记录的统计请求仍未返回
- **WHEN** 卡片渲染
- **THEN** 可测记录显示“读取统计中”，不显示成功进度条、0 B 或测量时间；已清理与无挂载记录继续显示原状态

#### Scenario: 已清理与无挂载不采样

- **GIVEN** 记录 `mount_cleaned === true`、`cleaned_at` 非空或 `mount_path` 为空
- **WHEN** 移动端列表请求完成后触发当前页用量采样
- **THEN** 这些记录的 `deleted_id` 不出现在采样请求中，卡片分别显示“已清理”或“无挂载”，页面不扫描目录、不请求统计

### Requirement: DeletedContainers 移动端分页、确认流程与轮询语义不变

移动端 SHALL 继续使用服务端分页的 `current`、`pageSize`、`total` 与 `onChange`，动作完成 SHALL 按操作完成时的当前页刷新；只有权威总数证明页码越界时才回退有效页。恢复与清理 SHALL 保留既有确认文案和 Popconfirm 流程，确认前 MUST NOT 调用接口。当前页存在 pending 项时 SHALL 继续每 5 秒重查、单页最多 120 次；翻页、刷新、清理、恢复或离开 SHALL 取消旧计时器与在途请求，迟到响应 MUST NOT 覆盖当前页。

#### Scenario: 手机翻页并按当前页采样

- **GIVEN** 第一页有 20 条、第二页有 1 条已删除记录，视口为 390px
- **WHEN** 用户点击分页第二页
- **THEN** 页面请求第二页并只渲染第二页记录，用量采样只包含第二页可测 ID，分页总数与当前页保持服务端结果

#### Scenario: 手机确认清理与恢复

- **GIVEN** 移动卡片中的记录具备清理记录或可恢复快照
- **WHEN** 用户点击“清理 mount”或“恢复”并确认
- **THEN** 确认前不调用写接口，确认后调用既有接口，成功后刷新当前页并保留分页上下文；取消确认不调用接口、不改变卡片

#### Scenario: pending 时切换分页

- **GIVEN** 第一页存在 pending 用量，视口为 390px
- **WHEN** 用户切换到第二页
- **THEN** 第一页的计时器与在途请求被取消，迟到响应不写入第二页卡片；第二页只请求自己的可测 ID

#### Scenario: 移动端最后一页减少

- **GIVEN** 移动端动作完成后权威总数减少，当前页码超过最新末页
- **WHEN** 页面重新加载当前页
- **THEN** 只回退到权威有效末页并有限次重取，不无条件跳回第一页，也不形成重复请求循环

#### Scenario: 轮询预算耗尽

- **GIVEN** 当前页 pending 项已达到 120 次轮询仍未全部收敛
- **WHEN** 自动轮询结束
- **THEN** 页面显示“测量未完成”并允许手动刷新，不继续无限轮询或改用周期 WSS
