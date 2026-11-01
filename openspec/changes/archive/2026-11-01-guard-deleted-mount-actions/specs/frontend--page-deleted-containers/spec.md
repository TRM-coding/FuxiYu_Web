# Spec Delta

## MODIFIED Requirements

### Requirement: DeletedContainers 仅按当前页请求异步用量

DeletedContainers SHALL 在既有列表成功后，仅对当前页中 `mount_path` 非空且 `deleted_id` 为正整数的记录异步请求 Ctrl 用量；`mount_cleaned === true` 或 `cleaned_at` 非空但保留历史 `mount_path` 的记录同样 SHALL 可请求，用于判断清理后路径的实际状态。单次 `deleted_ids` MUST NOT 超过 100，MUST NOT 包含宿主路径，Web MUST NOT 直接调用 Node。列表、分页、恢复、清理 MUST NOT 等待统计；权限沿用既有 `container:manage`，不新增 machine 角色门禁或路径输入。恢复/清理门禁 SHALL 同时跟随列表事实 `original_container_is_valid` 与当前页最新用量项：`original_container_is_valid === true` 时按已恢复门禁禁用并提示已恢复；稳定 `not_found` 且 `original_container_is_valid !== true` 时禁用两项并提示目录不存在；其他统计结果 MUST NOT 改变门禁。

#### Scenario: 列表先出现、统计后到达

- **WHEN** 已删除列表请求成功而后续用量响应仍在等待
- **THEN** 列表（桌面表格或移动卡片）与分页先按列表结果显示，用量行显示等待状态；列表不被 du 或统计请求阻塞，也不提前写入统计值

#### Scenario: 仅请求当前页可测记录

- **WHEN** 当前页包含多条已删除记录
- **THEN** Web 只发送本页 `mount_path` 非空且 `deleted_id` 为正整数的去重 ID，单次不超过 100 个；请求体不含任何宿主路径，页面也不为这些 ID 之外记录发请求

#### Scenario: 无挂载、mount_cleaned=true 或 cleaned_at 非空不扫描

- **WHEN** 某行没有 `mount_path`，或 `deleted_id` 不是正整数；或该行已清理但没有可用的历史路径
- **THEN** 该行显示“无挂载”或既有占位，不把该行 ID 放入统计请求，也不触发任何目录扫描

#### Scenario: 已清理但保留历史路径仍可采样

- **WHEN** 记录 `mount_cleaned === true` 或 `cleaned_at` 非空，但 `mount_path` 非空且 `deleted_id` 为正整数
- **THEN** 页面保留该历史路径展示，并把该 ID 加入当前页用量请求；当前页最新用量项稳定为 `not_found` 且 `original_container_is_valid !== true` 时，恢复与清理按钮禁用并提示目录不存在；`original_container_is_valid === true` 时按已恢复门禁禁用并提示已恢复；其他结果不改变恢复/清理权限与按钮门禁

### Requirement: DeletedContainers 保持旧接口兼容与原有流程

旧 Ctrl 不支持统计接口、响应不可用或逐项失败时，Web SHALL 仅把用量显示为“统计不可用”/稳定原因，MUST NOT 填 0、假成功或阻断列表、分页、恢复、清理；当前页最新用量项稳定为 `not_found` 且 `original_container_is_valid !== true` 时除外，该目录事实 SHALL 禁用恢复与清理并提示。Ctrl 返回的 `node_unsupported`、`node_timeout`、`node_unavailable`、`node_bad_response` MUST 按不可用处理；单行或单机失败不得影响其他行。

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
- **THEN** 结果只影响当前页展示、轮询及稳定 `not_found` 且 `original_container_is_valid !== true` 的按钮门禁，不新增 `container:manage` 之外的权限或 machine 角色门禁，不写数据库、`disk_*`、恢复快照或清理记录，不扩周期 WSS，也不触发清理、恢复或删除

### Requirement: DeletedContainers 表格信息层级与 Mount 复制样式

DeletedContainers SHALL 保持现有的已删除容器列表、分页、挂载用量请求、清理和恢复流程；当前页最新用量项稳定为 `not_found` 或列表事实 `original_container_is_valid === true` 时，按操作门禁禁用恢复与清理按钮，不改变既有确认与提交流程。桌面主表（视口大于 768px）SHALL 保留容器身份、机器、Mount、逻辑用量、删除时间、状态和操作；镜像信息 SHALL 移入可展开详情，不再单独占用主表列。桌面主表的 Mount SHALL 使用现有 `CopyChip` 的 `meta` 与 `soft` 小号样式，保留完整路径到 `title` 和复制值。移动端 SHALL 使用共享 `TableComponent` 卡片并复用同一 `columns` 数组与 `expandedRowRender`；移动详情入口与卡片边界见新增要求。本展示布局变更 MUST NOT 新增接口字段、数据库字段、Node 请求或权限门禁。

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
- **THEN** 分页、有限用量轮询、取消、清理和恢复流程保持不变，稳定 `not_found` 与原容器已恢复的按钮禁用除外，迟到响应不覆盖当前页

### Requirement: DeletedContainers 移动端 Mount 复制与用量状态

移动端 Mount SHALL 继续使用现有 `CopyChip` 的 `meta` 与 `soft` 样式，复制值与 `title` MUST 为完整路径；在 320px 和 390px 下 SHALL 可用真实点击写入浏览器剪贴板。剪贴板失败时 SHALL 显示既有“复制失败”，路径、`title` 与复制值保持不变。逻辑用量的加载、测量中、成功 0 B、有/无比较上限、失败、缺项和无挂载状态 MUST 按既有规则展示；只有成功样本可显示进度条，pending、error、缺项和无挂载 MUST NOT 显示为 0 或伪造成功。已清理但保留历史路径的记录 SHALL 使用同一异步逻辑请求并展示实际用量，移动卡片与桌面表格使用同一状态派生与同一操作门禁；已清理且成功采集时按 `original_container_is_valid` 的严格三态显示“已恢复/可能存在残留/已清理”，稳定 `not_found` 且 `original_container_is_valid !== true` 时恢复与清理按钮禁用并提示目录不存在，`original_container_is_valid === true` 时按已恢复门禁禁用并提示已恢复。

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
- **THEN** 成功样本显示实际逻辑大小与测量时间，正数上限显示确定比例、无上限显示无比例成功轨道；pending 显示“测量中”，error 显示既有中文原因，缺项显示“统计不可用”，无挂载显示原状态；已清理且有路径按统一优先级展示挂载状态（严格 true 为“已恢复”、严格 false 为“可能存在残留”、null/缺失为“已清理”），采集列按实际采集结果展示；任一非成功状态均不显示 0 B 或成功进度条

#### Scenario: 390px 统计未返回时显示读取统计中

- **GIVEN** 移动端列表已成功返回，当前页可测记录的统计请求仍未返回
- **WHEN** 卡片渲染
- **THEN** 可测记录显示“读取统计中”，不显示成功进度条、0 B 或测量时间；无挂载记录继续显示“无挂载”

#### Scenario: 已清理与无挂载不采样

- **GIVEN** 记录已清理却没有可测路径，或记录无挂载
- **WHEN** 移动端列表请求完成后触发当前页用量采样并渲染卡片
- **THEN** 上述记录均不进入采样请求；已清理且无可测路径显示“已清理”，无挂载显示“无挂载”，且不显示“已恢复”“可能存在残留”“目录不存在”或“无权限”

#### Scenario: 已清理状态优先于采集错误

- **GIVEN** 记录已清理并保留历史 `mount_path`，当前页用量项为成功（含 0 B）、`not_found`、`permission_denied`、pending 或其他失败
- **WHEN** 移动端渲染卡片
- **THEN** 成功（含 0 B）时按 `original_container_is_valid` 三态显示：严格 `true` 为“已恢复”，严格 `false` 为“可能存在残留”，`null`/缺失/非布尔为“已清理”；`not_found`/`permission_denied` 时状态仍显示“已清理”且采集列显示既有稳定错误文案；`not_found` 且 `original_container_is_valid !== true` 时恢复与清理按钮禁用并提示目录不存在，`original_container_is_valid === true` 时按已恢复门禁禁用并提示已恢复，`permission_denied` 不改变门禁；pending 或其他失败继续显示“已清理”及既有等待/不可用原因，不改变门禁；任一非成功状态均不显示 0 B 或成功进度条

### Requirement: DeletedContainers 按用量结果派生挂载实际状态

DeletedContainers SHALL 仅使用当前页列表事实与已返回的按路径用量结果派生挂载状态，并按以下固定优先级取首个命中项：无挂载 > 已清理且成功采集且 `original_container_is_valid === true` = “已恢复” > 已清理且成功采集且 `original_container_is_valid === false` = “可能存在残留” > 已清理（含成功采集但 `original_container_is_valid` 为 `null`、缺失或非布尔） > 目录不存在/无权限 > 升级清理/mount 保留。`original_container_is_valid` 只在已清理且成功采集时参与：严格 `true` 显示“已恢复”，严格 `false` 显示“可能存在残留”，`null`/未提供/非布尔显示“已清理”。`not_found`、`permission_denied` MUST NOT 覆盖已清理记录的状态；采集列 SHALL 继续独立显示采集结果及既有稳定错误文案。`pending`、加载中、缺项、Node 不可用或尚未返回 MUST NOT 被表述为“目录不存在”“无权限”或“可能存在残留”。桌面表格与移动卡片 SHALL 复用同一派生结果。本节状态派生不改变恢复/清理门禁；`original_container_is_valid === true` 的已恢复门禁优先于本节任何用量状态，本节任一状态 MUST NOT 解除该门禁。

#### Scenario: 无挂载仍显示无挂载

- **GIVEN** 记录 `mount_path` 为空，即使该 `deleted_id` 仍有成功、错误或历史缓存用量
- **WHEN** 桌面表格或移动卡片渲染该行
- **THEN** 状态与采集列都显示“无挂载”，不显示“已恢复”“可能存在残留”“已清理”“目录不存在”或“无权限”，也不为该 ID 发起用量请求

#### Scenario: 已清理且路径成功采集到用量

- **GIVEN** 记录已清理（`mount_cleaned === true` 或 `cleaned_at` 非空）并保留历史 `mount_path`，Ctrl 返回 `pending=false`、`error=null`、`bytes` 为正整数的成功样本，且 `original_container_is_valid` 为 `true`、`false`、`null`、缺失或非布尔
- **WHEN** 页面渲染该行的挂载状态与采集列
- **THEN** 严格 `true` 时状态显示“已恢复”；严格 `false` 时显示“可能存在残留”；`null`、缺失或非布尔时显示“已清理”；采集列均显示该样本的逻辑大小、测量时间与成功进度条；不显示“目录不存在”或“无权限”；`original_container_is_valid === true` 时恢复/清理按已恢复门禁禁用并提示已恢复，否则按原列表字段和权限决定；成功结果本身不改变门禁

#### Scenario: 已清理且成功采集为 0 B

- **GIVEN** 记录已清理并保留历史 `mount_path`，Ctrl 返回 `pending=false`、`error=null`、`bytes=0` 的成功样本，且 `original_container_is_valid` 为 `true`、`false`、`null`、缺失或非布尔
- **WHEN** 页面渲染该行
- **THEN** 状态按三态显示：严格 `true` 为“已恢复”，严格 `false` 为“可能存在残留”，`null`/缺失/非布尔为“已清理”；采集列均显示 0 B、真实测量时间及成功进度条，不把 0 B 解释为无残留或已占用；不显示“目录不存在”或“无权限”；`original_container_is_valid === true` 时恢复/清理按已恢复门禁禁用并提示已恢复，否则按原列表字段和权限决定；成功结果本身不改变门禁

#### Scenario: 已清理且采集目录不存在

- **GIVEN** 记录已清理并保留历史 `mount_path`，当前页用量项 `error=not_found`，且 `original_container_is_valid !== true`
- **WHEN** 页面渲染该行的挂载状态与采集列
- **THEN** 状态显示“已清理”，采集列显示“统计不可用（目录不存在）”；不显示“目录不存在”“无权限”“可能存在残留”“已恢复”或 0 B；恢复与清理按钮均禁用，并提示目录不存在

#### Scenario: 已清理且采集无权限

- **GIVEN** 记录已清理并保留历史 `mount_path`，当前页用量项 `error=permission_denied`
- **WHEN** 页面渲染该行的挂载状态与采集列
- **THEN** 状态显示“已清理”，采集列显示“统计不可用（无权限读取目录）”；不显示“无权限”“目录不存在”“可能存在残留”“已恢复”或 0 B；恢复/清理按钮门禁不因该结果改变

#### Scenario: 未完成、其他失败或 Node 不可用

- **GIVEN** 记录已清理并保留历史 `mount_path`，用量项为 `pending`、加载中、缺项，或 `error` 为 `node_unavailable`、`node_timeout`、`node_unsupported`、`node_bad_response`、`invalid_path` 等其他稳定原因
- **WHEN** 页面渲染该行
- **THEN** 状态显示“已清理”，采集列显示既有等待状态或稳定不可用原因；不称目录不存在、无权限、可能存在残留或已恢复，也不显示 0 B；恢复/清理门禁不因这些结果改变

#### Scenario: 目录不存在

- **GIVEN** 记录未清理并保留 `mount_path`，当前页用量项 `error=not_found`，且 `original_container_is_valid !== true`
- **WHEN** 页面渲染该行的挂载状态与采集列
- **THEN** 状态显示“目录不存在”，采集列显示“统计不可用（目录不存在）”；不显示“已清理”“可能存在残留”“已恢复”或 0 B；恢复与清理按钮均禁用，并提示目录不存在

#### Scenario: 无权限读取目录

- **GIVEN** 记录未清理并保留 `mount_path`，当前页用量项 `error=permission_denied`
- **WHEN** 页面渲染该行的挂载状态与采集列
- **THEN** 状态显示“无权限”，采集列显示“统计不可用（无权限读取目录）”；不显示“已清理”“可能存在残留”“已恢复”或 0 B；恢复/清理门禁不因该结果改变

#### Scenario: 未清理且未完成或其他失败

- **GIVEN** 记录未清理并保留 `mount_path`，用量项为 `pending`、加载中、缺项，或 `error` 为 `node_unavailable`、`node_timeout`、`node_unsupported`、`node_bad_response`、`invalid_path` 等其他稳定原因
- **WHEN** 页面渲染该行
- **THEN** 状态按列表事实显示“升级清理”或“mount 保留”，采集列显示既有等待状态或稳定不可用原因；不称目录不存在、无权限、可能存在残留或已恢复，也不显示 0 B；恢复/清理门禁不因这些结果改变

### Requirement: DeletedContainers 用量派生不改变恢复与清理门禁

恢复/清理门禁 SHALL 默认按既有 `cleaned_at`、`data_recoverable`、`snapshot`、`mount_cleanup_id` 等列表字段与权限计算，用量请求及其派生状态 MUST NOT 改变恢复/清理的权限、按钮 disabled 条件、确认流程或提交参数；存在两个例外：① 列表事实 `original_container_is_valid === true`：即使对应历史删除记录仍在，恢复与清理按钮 SHALL 禁用并提示已恢复，恢复提示 MUST 为“已恢复”，清理提示 MUST 为“已恢复，无法清理”，确认框 MUST NOT 打开且 MUST NOT 发起写请求；该门禁独立于 `cleaned_at`、`mount_cleaned` 与用量结果，并优先于 `not_found`。② 当前页最新用量项稳定为 `not_found` 且 `original_container_is_valid !== true`：恢复与清理按钮 SHALL 禁用并提示目录不存在，MUST NOT 发起确认或写请求。`original_container_is_valid` 不再是严格 `true` 后，按 `not_found` 与既有列表字段重新计算门禁；用量项不再是 `not_found` 后按原列表字段恢复。已清理记录即使成功采集到用量并显示“可能存在残留”或“已恢复”，仍 SHALL 按原 `cleaned_at`、`data_recoverable`、`snapshot`、`mount_cleanup_id` 等列表字段决定除上述例外外的按钮门禁。

#### Scenario: 残留状态不解除清理禁用

- **GIVEN** 记录 `cleaned_at` 非空，Ctrl 用量成功并显示“可能存在残留”或“已恢复”
- **WHEN** 用户查看操作列
- **THEN** 清理按钮仍按既有 `cleaned_at` 规则禁用；`original_container_is_valid === true` 时恢复按钮按已恢复门禁禁用，否则按既有可恢复字段规则决定；页面不因成功用量结果改写权限或启用按钮

#### Scenario: 历史路径不改变提交参数

- **GIVEN** 已清理记录保留 `mount_path` 并参与用量请求
- **WHEN** 用户对其他可操作记录执行恢复或清理
- **THEN** 请求参数、确认流程、分页刷新与取消语义保持既有实现，不携带路径或统计结果

#### Scenario: 目录不存在禁用恢复与清理并提示

- **GIVEN** 当前页最新用量项为稳定 `not_found`，`original_container_is_valid !== true`，记录无论是否已清理
- **WHEN** 用户查看该行操作列
- **THEN** 恢复与清理按钮均禁用，恢复提示“挂载目录不存在，无法恢复”、清理提示“挂载目录不存在，无需清理”，确认框不得打开且不发起写请求；该用量项不再是 `not_found` 后，按钮按原列表字段和权限恢复

#### Scenario: 历史删除记录残留但原容器已恢复

- **GIVEN** 历史删除记录仍在，列表事实 `original_container_is_valid === true`，无论 `cleaned_at`、`mount_cleaned` 与当前用量项为成功、pending、`not_found` 或其他结果
- **WHEN** 桌面表格或移动卡片渲染该行操作列
- **THEN** 恢复与清理按钮均禁用；恢复提示“已恢复”，清理提示“已恢复，无法清理”；确认框不得打开且不发起写请求；禁用提示不得表述为目录不存在或可能存在残留

#### Scenario: 原容器启用状态解除后恢复门禁

- **GIVEN** 当前页刷新后 `original_container_is_valid` 不再是严格 `true`
- **WHEN** 该行操作列重新渲染，且当前页用量项为 `not_found` 或非 `not_found`
- **THEN** 不保留旧的“已恢复”禁用状态；`not_found` 时按目录不存在禁用并提示，其他结果按既有列表字段决定恢复与清理门禁
