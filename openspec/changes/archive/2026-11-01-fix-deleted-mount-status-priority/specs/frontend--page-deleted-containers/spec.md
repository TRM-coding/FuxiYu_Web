# Spec Delta

## MODIFIED Requirements

### Requirement: DeletedContainers 按用量结果派生挂载实际状态

DeletedContainers SHALL 仅使用当前页列表事实与已返回的按路径用量结果派生挂载状态，并按以下固定优先级取首个命中项：无挂载 > 已清理且成功采集（含 0 B）= 可能存在残留 > 已清理 > 目录不存在/无权限 > 升级清理/mount 保留。`not_found`、`permission_denied` MUST NOT 覆盖已清理记录的状态；采集列 SHALL 继续独立显示采集结果及既有稳定错误文案。`pending`、加载中、缺项、Node 不可用或尚未返回 MUST NOT 被表述为“目录不存在”“无权限”或“可能存在残留”。桌面表格与移动卡片 SHALL 复用同一派生结果。

#### Scenario: 无挂载仍显示无挂载

- **GIVEN** 记录 `mount_path` 为空，即使该 `deleted_id` 仍有成功、错误或历史缓存用量
- **WHEN** 桌面表格或移动卡片渲染该行
- **THEN** 状态与采集列都显示“无挂载”，不显示“可能存在残留”“已清理”“目录不存在”或“无权限”，也不为该 ID 发起用量请求

#### Scenario: 已清理且路径成功采集到用量

- **GIVEN** 记录已清理（`mount_cleaned === true` 或 `cleaned_at` 非空）并保留历史 `mount_path`，Ctrl 返回 `pending=false`、`error=null`、`bytes` 为正整数的成功样本
- **WHEN** 页面渲染该行的挂载状态与采集列
- **THEN** 状态显示“可能存在残留”，采集列显示该样本的逻辑大小、测量时间与成功进度条；不显示“已清理”“目录不存在”或“无权限”；恢复/清理按钮仍按原列表字段和权限决定

#### Scenario: 已清理且成功采集为 0 B

- **GIVEN** 记录已清理并保留历史 `mount_path`，Ctrl 返回 `pending=false`、`error=null`、`bytes=0` 的成功样本
- **WHEN** 页面渲染该行
- **THEN** 状态显示“可能存在残留”，采集列显示 0 B 与真实测量时间及成功进度条；不回退为“已清理”“目录不存在”或“无权限”，也不把 0 B 解释为无残留或已占用

#### Scenario: 已清理且采集目录不存在

- **GIVEN** 记录已清理并保留历史 `mount_path`，当前页用量项 `error=not_found`
- **WHEN** 页面渲染该行的挂载状态与采集列
- **THEN** 状态显示“已清理”，采集列显示“统计不可用（目录不存在）”；不显示“目录不存在”“无权限”“可能存在残留”或 0 B，恢复/清理按钮门禁不变

#### Scenario: 已清理且采集无权限

- **GIVEN** 记录已清理并保留历史 `mount_path`，当前页用量项 `error=permission_denied`
- **WHEN** 页面渲染该行的挂载状态与采集列
- **THEN** 状态显示“已清理”，采集列显示“统计不可用（无权限读取目录）”；不显示“无权限”“目录不存在”“可能存在残留”或 0 B，恢复/清理按钮门禁不变

#### Scenario: 未完成、其他失败或 Node 不可用

- **GIVEN** 记录已清理并保留历史 `mount_path`，用量项为 `pending`、加载中、缺项，或 `error` 为 `node_unavailable`、`node_timeout`、`node_unsupported`、`node_bad_response`、`invalid_path` 等其他稳定原因
- **WHEN** 页面渲染该行
- **THEN** 状态显示“已清理”，采集列显示既有等待状态或稳定不可用原因；不称目录不存在、无权限或可能存在残留，也不显示 0 B

#### Scenario: 目录不存在

- **GIVEN** 记录未清理并保留 `mount_path`，当前页用量项 `error=not_found`
- **WHEN** 页面渲染该行的挂载状态与采集列
- **THEN** 状态显示“目录不存在”，采集列显示“统计不可用（目录不存在）”；不显示“已清理”“可能存在残留”或 0 B，恢复/清理按钮门禁不变

#### Scenario: 无权限读取目录

- **GIVEN** 记录未清理并保留 `mount_path`，当前页用量项 `error=permission_denied`
- **WHEN** 页面渲染该行的挂载状态与采集列
- **THEN** 状态显示“无权限”，采集列显示“统计不可用（无权限读取目录）”；不显示“已清理”“可能存在残留”或 0 B，恢复/清理按钮门禁不变

#### Scenario: 未清理且未完成或其他失败

- **GIVEN** 记录未清理并保留 `mount_path`，用量项为 `pending`、加载中、缺项，或 `error` 为 `node_unavailable`、`node_timeout`、`node_unsupported`、`node_bad_response`、`invalid_path` 等其他稳定原因
- **WHEN** 页面渲染该行
- **THEN** 状态按列表事实显示“升级清理”或“mount 保留”，采集列显示既有等待状态或稳定不可用原因；不称目录不存在、无权限或可能存在残留，也不显示 0 B

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
- **THEN** 成功样本显示实际逻辑大小与测量时间，正数上限显示确定比例、无上限显示无比例成功轨道；pending 显示“测量中”，error 显示既有中文原因，缺项显示“统计不可用”，无挂载显示原状态；已清理且有路径按统一优先级展示挂载状态、采集列按实际采集结果展示；任一非成功状态均不显示 0 B 或成功进度条

#### Scenario: 390px 统计未返回时显示读取统计中

- **GIVEN** 移动端列表已成功返回，当前页可测记录的统计请求仍未返回
- **WHEN** 卡片渲染
- **THEN** 可测记录显示“读取统计中”，不显示成功进度条、0 B 或测量时间；无挂载记录继续显示“无挂载”

#### Scenario: 已清理与无挂载不采样

- **GIVEN** 记录已清理却没有可测路径，或记录无挂载
- **WHEN** 移动端列表请求完成后触发当前页用量采样并渲染卡片
- **THEN** 上述记录均不进入采样请求；已清理且无可测路径显示“已清理”，无挂载显示“无挂载”，且不显示“可能存在残留”“目录不存在”或“无权限”

#### Scenario: 已清理状态优先于采集错误

- **GIVEN** 记录已清理并保留历史 `mount_path`，当前页用量项为成功（含 0 B）、`not_found`、`permission_denied`、pending 或其他失败
- **WHEN** 移动端渲染卡片
- **THEN** 成功（含 0 B）时状态显示“可能存在残留”；`not_found`/`permission_denied` 时状态仍显示“已清理”且采集列显示既有稳定错误文案；pending 或其他失败继续显示“已清理”及既有等待/不可用原因；任一非成功状态均不显示 0 B 或成功进度条
