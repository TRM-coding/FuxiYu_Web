# Spec Delta

## MODIFIED Requirements

### Requirement: DeletedContainers 仅按当前页请求异步用量

DeletedContainers SHALL 在既有列表成功后，仅对当前页中 `mount_path` 非空且 `deleted_id` 为正整数的记录异步请求 Ctrl 用量；`mount_cleaned === true` 或 `cleaned_at` 非空但保留历史 `mount_path` 的记录同样 SHALL 可请求，用于判断清理后路径的实际状态。单次 `deleted_ids` MUST NOT 超过 100，MUST NOT 包含宿主路径，Web MUST NOT 直接调用 Node。列表、分页、恢复、清理 MUST NOT 等待统计；权限沿用既有 `container:manage`，不新增 machine 角色门禁或路径输入，恢复/清理门禁不因统计结果改变。

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
- **THEN** 页面保留该历史路径展示，并把该 ID 加入当前页用量请求；恢复/清理权限与按钮门禁不因该请求改变

### Requirement: DeletedContainers 如实展示逻辑大小与测量时间

成功统计项 SHALL 按 `deleted_id` 映射到对应行，展示 `du -sb` 逻辑字节数和该样本真实 `measured_at`；MUST NOT 把逻辑字节称为物理磁盘块，也不得称为实时或瞬时占用。成功结果 `bytes=0` 时 SHALL 显示 0 B。成功样本 SHALL 展示一个优化样式的逻辑用量进度条，无论记录是否已清理；进度条只能由成功样本驱动，不得把 pending、error、缺项或未请求状态画成 0% 成功条。若已有记录包含正数比较上限，则条宽按逻辑字节与该上限计算并在超过上限时封顶视觉宽度但保留实际数值；没有比较上限或上限不为正时显示无比例的成功轨道，使用 `aria-valuetext` 说明已测量但没有可比上限，不伪造百分比。可见测量文案 SHALL 缩短为 `测量 {MM-DD HH:mm}`，完整时间继续放在可访问的 `title` 或等价提示中；只有成功样本可显示时间。页面 MUST NOT 为此新增接口字段、数据库字段、Node 接口、缓存或权限门禁；pending 项按持续轮询更新，失败、缺项和旧缓存不得冒充当前成功样本。

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

- **GIVEN** 某项 `error` 非空、响应缺项、响应形状非法或无挂载
- **WHEN** 该行渲染
- **THEN** 沿用既有的统计不可用或无挂载展示，不渲染成功进度条、不显示伪造时间、不把状态改写成 0 B，并继续丢弃缺项或过期响应

### Requirement: DeletedContainers 有界轮询、取消与旧响应失效

页面打开期间 SHALL 持续查询当前页可测挂载路径：pending 项每 5 秒重查，所有可测路径每 60 秒复查；成功、错误及暂时超时不永久停止。请求 SHALL 单飞，401/403 SHALL 停止；离开、翻页、刷新、清理或恢复时 SHALL 取消旧计时器和在途请求并丢弃迟到响应，不增加周期 WSS。

#### Scenario: pending 收敛即停止

- **WHEN** 某 pending 行在后续查询中变为 success 或 error
- **THEN** 显示结果并停止该行的快速查询，后续仍按低频复查；其他 pending 项继续快速查询

#### Scenario: 离开、翻页、刷新取消

- **WHEN** 用户在查询期间离开页面、翻页或手动刷新列表
- **THEN** 旧计时器与在途请求被取消，迟到响应不得覆盖新页或新一轮统计

#### Scenario: 清理或恢复后不保留旧用量

- **WHEN** 清理或恢复成功并重新加载列表
- **THEN** 旧统计立即失效；新列表按当前页重查，不用旧样本判断残留

#### Scenario: 单页预算耗尽

- **WHEN** pending 持续超过原 120 次轮询
- **THEN** 页面继续查询，不显示停止自动刷新的提示；离开页面后停止

#### Scenario: 暂时超时后恢复

- **WHEN** 当前页查询返回 `node_timeout` 或网络超时，之后节点恢复
- **THEN** 页面显示当前错误并低频重试，成功后展示新用量

### Requirement: DeletedContainers 移动端 Mount 复制与用量状态

移动端 Mount SHALL 继续使用现有 `CopyChip` 的 `meta` 与 `soft` 样式，复制值与 `title` MUST 为完整路径；在 320px 和 390px 下 SHALL 可用真实点击写入浏览器剪贴板。剪贴板失败时 SHALL 显示既有“复制失败”，路径、`title` 与复制值保持不变。逻辑用量的加载、测量中、成功 0 B、有/无比较上限、失败、缺项和无挂载状态 MUST 按既有规则展示；只有成功样本可显示进度条，pending、error、缺项和无挂载 MUST NOT 显示为 0 或伪造成功。已清理但保留历史路径的记录 SHALL 使用同一异步逻辑请求并展示实际用量，移动卡片与桌面表格使用同一判断。

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
- **THEN** 成功样本显示实际逻辑大小与测量时间，正数上限显示确定比例、无上限显示无比例成功轨道；pending 显示“测量中”，error 显示既有中文原因，缺项显示“统计不可用”，无挂载显示原状态；已清理且有路径按实际采集结果展示；任一非成功状态均不显示 0 B 或成功进度条

#### Scenario: 390px 统计未返回时显示读取统计中

- **GIVEN** 移动端列表已成功返回，当前页可测记录的统计请求仍未返回
- **WHEN** 卡片渲染
- **THEN** 可测记录显示“读取统计中”，不显示成功进度条、0 B 或测量时间；无挂载记录继续显示“无挂载”

#### Scenario: 已清理与无挂载不采样

- **GIVEN** 记录已清理但保留历史 `mount_path`，或记录已清理却没有可测路径，或记录无挂载
- **WHEN** 移动端列表请求完成后触发当前页用量采样
- **THEN** 已清理且保留路径的 `deleted_id` 进入采样请求；成功时状态显示“可能存在残留”，`not_found` 显示“目录不存在”，`permission_denied` 显示“无权限”，pending 或其他失败继续显示“已清理”及既有等待/不可用原因；无可测路径或无挂载记录不进入请求

## ADDED Requirements

### Requirement: DeletedContainers 按用量结果派生挂载实际状态

DeletedContainers SHALL 只使用当前页已返回的按路径用量结果派生挂载实际状态：`not_found` 显示“目录不存在”，`permission_denied` 显示“无权限”，已清理记录成功采集到用量时显示“可能存在残留”。`pending`、加载中、其他失败、Node 不可用、缺项或尚未返回 MUST NOT 被表述为“目录不存在”或“可能存在残留”，SHALL 回退到“已清理”或“mount 保留”等列表事实；无 `mount_path` 始终显示“无挂载”。桌面表格与移动卡片 SHALL 复用同一派生结果。

#### Scenario: 已清理且路径成功采集到用量

- **GIVEN** 记录已清理并保留历史 `mount_path`，Ctrl 对该路径返回成功样本
- **WHEN** 页面渲染该行的挂载状态
- **THEN** 显示“可能存在残留”，并展示该成功样本的逻辑大小与测量时间；恢复/清理按钮仍按原列表字段和权限决定

#### Scenario: 目录不存在

- **GIVEN** 当前页用量项 `error=not_found`
- **WHEN** 页面渲染该行的挂载状态或用量说明
- **THEN** 显示“目录不存在”，不显示“可能存在残留”或 0 B

#### Scenario: 无权限读取目录

- **GIVEN** 当前页用量项 `error=permission_denied`
- **WHEN** 页面渲染该行的挂载状态或用量说明
- **THEN** 显示“无权限”，不显示“目录不存在”或“可能存在残留”

#### Scenario: 未完成、其他失败或 Node 不可用

- **GIVEN** 用量项为 `pending`、加载中、缺项，或 `error` 为 `node_unavailable`、`node_timeout`、`node_unsupported`、`node_bad_response` 等其他稳定原因
- **WHEN** 页面渲染该行
- **THEN** 按列表事实显示“已清理”或“mount 保留”，并展示既有等待/不可用原因；不称目录不存在，也不称可能存在残留

#### Scenario: 无挂载仍显示无挂载

- **GIVEN** 记录 `mount_path` 为空，即使历史用量缓存或响应仍有该 ID
- **WHEN** 桌面表格或移动卡片渲染
- **THEN** 显示“无挂载”，不显示目录不存在、无权限或可能存在残留，也不为该 ID 发请求

### Requirement: DeletedContainers 用量派生不改变恢复与清理门禁

用量请求及其派生状态 SHALL 只影响挂载状态与用量展示，MUST NOT 改变恢复/清理的权限、按钮 disabled 条件、确认流程或提交参数。已清理记录即使成功采集到用量并显示“可能存在残留”，仍 SHALL 按原 `cleaned_at`、`data_recoverable`、`snapshot`、`mount_cleanup_id` 等列表字段决定按钮门禁。

#### Scenario: 残留状态不解除清理禁用

- **GIVEN** 记录 `cleaned_at` 非空，Ctrl 用量成功并显示“可能存在残留”
- **WHEN** 用户查看操作列
- **THEN** 清理按钮仍按既有 `cleaned_at` 规则禁用，恢复按钮仍按既有可恢复字段规则决定；页面不因用量结果改写权限或启用按钮

#### Scenario: 历史路径不改变提交参数

- **GIVEN** 已清理记录保留 `mount_path` 并参与用量请求
- **WHEN** 用户对其他可操作记录执行恢复或清理
- **THEN** 请求参数、确认流程、分页刷新与取消语义保持既有实现，不携带路径或统计结果
