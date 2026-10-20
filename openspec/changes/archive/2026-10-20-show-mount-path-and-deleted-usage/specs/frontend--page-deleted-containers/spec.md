# Spec Delta

## ADDED Requirements

### Requirement: DeletedContainers 仅按当前页请求异步用量

DeletedContainers SHALL 在既有列表成功后，仅对当前页中 `mount_path` 非空、`mount_cleaned !== true`、`cleaned_at` 为空且 `deleted_id` 为正整数的记录异步请求 Ctrl 用量。`mount_cleaned === true` 或 `cleaned_at` 非空均视为已清理，不请求统计并展示“已清理”。单次 `deleted_ids` MUST NOT 超过 100，MUST NOT 包含宿主路径，Web MUST NOT 直接调用 Node。列表、分页、恢复、清理 MUST NOT 等待统计；权限沿用既有 `container:manage`，不新增 machine 角色门禁或路径输入。

#### Scenario: 列表先出现、统计后到达

- **WHEN** 已删除列表请求成功而后续用量响应仍在等待
- **THEN** 表格与分页先按列表结果显示，用量行显示等待状态；列表不被 du 或统计请求阻塞，也不提前写入统计值

#### Scenario: 仅请求当前页可测记录

- **WHEN** 当前页包含多条已删除记录
- **THEN** Web 只发送本页有挂载、`mount_cleaned !== true`、`cleaned_at` 为空且 `deleted_id` 为正整数的 ID，单次不超过 100 个；请求体不含任何宿主路径，页面也不为这些 ID 之外记录发请求

#### Scenario: 无挂载、mount_cleaned=true 或 cleaned_at 非空不扫描

- **WHEN** 某行没有 `mount_path`；或 `mount_cleaned === true`（即使 `cleaned_at` 为空）；或 `cleaned_at` 非空
- **THEN** 前者显示“无挂载”，后两者显示“已清理”；均不把该行 ID 放入统计请求，也不触发任何目录扫描

### Requirement: DeletedContainers 如实展示逻辑大小与测量时间

成功统计项 SHALL 按 `deleted_id` 映射到对应行，展示 `du -sb` 逻辑字节数和该样本真实 `measured_at`；MUST NOT 把逻辑字节称为物理磁盘块，也不得称为实时或瞬时占用。成功结果 `bytes=0` 时 SHALL 显示 0 B；`bytes=null` 的 pending/error MUST NOT 显示成 0，且只有成功样本才可显示测量时间。

#### Scenario: 成功且确实为零

- **WHEN** 某项 `pending=false`、`error=null` 且 `bytes=0`
- **THEN** 该行显示 0 B，并显示对应的真实 `measured_at`，不把零解释为失败或未知

#### Scenario: 成功样本与旧测量时间

- **WHEN** 某项返回非负 `bytes` 和非空 `measured_at`，即使该样本可能来自 TTL 内的较早测量
- **THEN** 页面展示逻辑大小和该 `measured_at` 的实际时间，标注为测量记录，不声称是刚刚或实时测得

#### Scenario: 测量中

- **WHEN** 某项 `pending=true`、`bytes=null`、`error=null`
- **THEN** 该行显示“测量中”，不显示 0、不显示伪造的测量时间，并等待有界轮询更新

#### Scenario: 失败、缺项或形状非法

- **WHEN** 某项 `error` 非空、`bytes=null` 且 `pending=false`；已请求项在响应中缺项；或响应形状不合法/明确失败
- **THEN** 该行显示“统计不可用”或对应稳定原因，不显示 0、不显示旧缓存冒充当前结果；未请求的无挂载/已清理行继续显示原状态，不为缺项补造“无挂载”或 0

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
