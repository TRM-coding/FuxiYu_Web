# Spec Delta

## MODIFIED Requirements

### Requirement: DeletedContainers 用量派生不改变恢复与清理门禁

恢复/清理门禁 SHALL 默认按既有 `cleaned_at`、`mount_cleaned`、`data_recoverable`、`snapshot`、`mount_cleanup_id` 等列表字段、权限与当前页最新用量项计算；用量结果及其派生状态 MUST NOT 改写这些规则。新增清理状态门禁：记录未清理且 `mount_cleanup_state === 'cleaning'` 时两项均禁用，提示“清理进行中，无法恢复”/“清理进行中”，确认框不得打开、不得发写请求；`failed`/`unknown`/`null` 时仅按既有列表字段与用量门禁重新计算。`original_container_is_valid === true` 时仍两项禁用并提示“已恢复”/“已恢复，无法清理”，优先于用量与清理状态；稳定 `not_found` 且非 true 时仍两项禁用并提示目录不存在。成功只由既有 `cleaned_at`/`mount_cleaned` 表达，不得要求新的 `succeeded` 状态；状态不得新增权限或绕过上述门禁。

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

- **GIVEN** 历史删除记录仍在，列表事实 `original_container_is_valid === true`，无论 `cleaned_at`、`mount_cleaned`、清理状态与当前用量项为成功、pending、`not_found` 或其他结果
- **WHEN** 桌面表格或移动卡片渲染该行操作列
- **THEN** 恢复与清理按钮均禁用；恢复提示“已恢复”，清理提示“已恢复，无法清理”；确认框不得打开且不发起写请求；禁用提示不得表述为目录不存在或可能存在残留

#### Scenario: 原容器启用状态解除后恢复门禁

- **GIVEN** 当前页刷新后 `original_container_is_valid` 不再是严格 `true`，且记录未处于“清理中”
- **WHEN** 该行操作列重新渲染，且当前页用量项为 `not_found` 或非 `not_found`
- **THEN** 不保留旧的“已恢复”禁用状态；`not_found` 时按目录不存在禁用并提示，其他结果按既有列表字段决定恢复与清理门禁

#### Scenario: 清理中禁用清理与恢复并阻止确认

- **GIVEN** 记录未清理且当前页最新 `mount_cleanup_state === 'cleaning'`
- **WHEN** 用户查看该行操作列并尝试打开恢复或清理确认
- **THEN** 两项按钮均禁用，恢复提示“清理进行中，无法恢复”，清理提示“清理进行中”；确认框不得打开，不发起恢复或清理写请求；其他行的既有门禁不变

#### Scenario: 清理失败或未知后重新计算门禁

- **GIVEN** 当前页 `mount_cleanup_state` 为 `failed`、`unknown` 或 `null`，且记录未清理
- **WHEN** 页面重新渲染该行操作列
- **THEN** 不再按“清理中”锁定；按既有列表字段、权限与用量项重新计算恢复和清理门禁，`data_recoverable` 且用量未指明目录不存在时可再次恢复或重试清理；用户接受部分删除后再次恢复的风险

## ADDED Requirements

### Requirement: DeletedContainers 异步清理受理与列表状态

DeletedContainers 的“清理 mount” SHALL 复用现有确认流程和 `POST /api/containers/clean_deleted_container_mount`，请求体只包含现有 `mount_cleanup_id`。确认后 Web SHALL 只等待 Ctrl 明确返回 `accepted: true`，MUST NOT 等待 Node 完成，也 MUST NOT 把 HTTP 2xx、旧 `success` 或超时前的本地状态当作清理成功。受理后 SHALL 显示“清理中”，不修改 `cleaned_at`/`mount_cleaned`。受理后 SHALL 立即复用 `POST /api/containers/list_deleted_containers` 刷新；未清理的 `cleaning` 存在时每 3 秒刷新，终态或消失后停止；读取逐行 `mount_cleanup_state` 与 `mount_cleanup_error_reason`；MUST NOT 新增或调用独立状态 API，MUST NOT 直连 Node。

#### Scenario: 受理后显示清理中而不是成功

- **GIVEN** 当前页有一条带 `mount_cleanup_id` 的记录，列表状态为 `null` 且记录未清理
- **WHEN** 用户确认“清理 mount”，Ctrl 返回 `accepted: true`
- **THEN** 页面只提交一次现有清理请求，请求体只含 `mount_cleanup_id`；不显示清理成功或“已清理”，不把本地 `cleaned_at`/`mount_cleaned` 改写为完成；该行显示“清理中”，并立即刷新当前页列表以读取 Ctrl 状态

#### Scenario: 列表刷新恢复进程内清理中

- **GIVEN** Ctrl 列表对当前页某记录返回 `mount_cleanup_state: "cleaning"` 且该记录未清理
- **WHEN** 用户打开、刷新页面或受理后的列表刷新返回
- **THEN** 该行从列表恢复“清理中”，操作门禁按清理状态生效；不依赖 localStorage 或新增状态接口；历史已清理记录仍按既有字段显示“已清理”

#### Scenario: 列表轮询单飞并取消旧请求

- **GIVEN** 当前页存在未清理且 `mount_cleanup_state === "cleaning"` 的记录
- **WHEN** 轮询计时到达，或用户翻页、手动刷新、离开页面
- **THEN** 同一时刻最多一个列表刷新请求在途，上一响应到达后才安排下一拍；翻页、刷新或离开时取消旧计时器与在途请求，迟到响应不得写入新页或覆盖新状态；不通过 WebSocket 或直接 Node 请求补充状态

#### Scenario: 只刷新当前页并保留列表事实

- **GIVEN** 当前页包含清理中、已清理、失败、未知和普通记录
- **WHEN** 受理后的列表刷新成功
- **THEN** 请求仍使用当前页与页大小，只合并当前页记录的 `mount_cleanup_state`、`mount_cleanup_error_reason` 及既有清理字段；不重置分页、展开行、用量轮询、复制或详情状态；不发送路径、机器 ID 或 Node 地址，沿用 `container:manage`

### Requirement: DeletedContainers 清理结果与既有清理事实

Web SHALL 只在列表返回 `cleaned_at` 非空或 `mount_cleaned === true` 时显示“已清理”并视为清理成功；不得要求新的 `succeeded` 状态。除此之外，`accepted: true`、`cleaning`、`failed`、`unknown`、`null`、Ctrl 重启丢失状态及旧/非法响应 MUST NOT 显示清理成功。未清理且 `failed` SHALL 显示“清理失败”；未清理且 `unknown` SHALL 显示“清理状态未知”；非法 `mount_cleanup_state` SHALL 按 `unknown` 处理；`null`/缺失 SHALL 回退既有列表事实。失败/未知/`null` 后 SHALL 只按既有列表字段与路径/用量门禁重新开放恢复和清理；Web MUST NOT 自动重试写操作。目录不存在沿既有 `mount_path`/用量 `not_found` 门禁正常显示；Node 重启部分删除后按既有 `data_recoverable`/用量门禁恢复。

#### Scenario: 既有 cleaned_at 或 mount_cleaned 显示已清理

- **GIVEN** 列表返回 `cleaned_at` 非空或 `mount_cleaned === true`，且 `mount_cleanup_state` 为 `null`、`cleaning`、`failed` 或 `unknown`
- **WHEN** 页面渲染该行并决定是否提示成功
- **THEN** 仍按既有字段显示“已清理”并采用既有已清理门禁；不要求新状态为成功，不把历史清理记录误写成清理中、失败或未知；仅在本次受理后的列表首次出现已清理事实时提示清理成功

#### Scenario: 失败或未知不冒充成功

- **GIVEN** 记录未清理，列表返回 `mount_cleanup_state: "failed"` 或 `"unknown"` 及可选 `mount_cleanup_error_reason`
- **WHEN** 页面处理该结果
- **THEN** 分别显示“清理失败”或“清理状态未知”，不显示“已清理”或成功提示，不回显 Node stderr、HTML 或原始响应；不自动重试清理；恢复与清理按钮按既有列表与用量门禁重新计算

#### Scenario: 失败或未知回退既有门禁并开放恢复

- **GIVEN** 状态为 `failed`/`unknown`，记录仍 `data_recoverable`，当前页用量未指明目录不存在，目录可能仅被部分删除
- **WHEN** 用户查看该行操作列
- **THEN** 恢复按钮重新开放，清理按钮也按既有字段可用；用户确认后仍走现有恢复接口与二选一/凭据流程；页面不声称目录已完整清理，也不阻止用户接受部分删除后的恢复风险

#### Scenario: 清理中与实时 not_found 并存时清理中优先

- **GIVEN** 记录未清理、`original_container_is_valid !== true`，列表同时返回 `mount_cleanup_state: "cleaning"` 与当前页用量 `not_found`
- **WHEN** 页面先处理该组合，随后 Ctrl 任务结束且列表不再返回 `cleaning`、用量仍为 `not_found`
- **THEN** 任务结束前显示“清理中”而非“目录不存在”，恢复与清理均禁用且提示清理进行中，不显示成功；任务结束后按既有路径门禁显示“目录不存在”，两项仍禁用并给出既有目录不存在原因，不伪造清理成功

#### Scenario: 目录不存在沿用路径门禁正常显示

- **GIVEN** 记录未清理、Ctrl 状态不是 `cleaning`，`mount_path` 存在且当前页用量明确返回 `not_found`，`original_container_is_valid !== true`
- **WHEN** 页面渲染该行
- **THEN** 正常显示“目录不存在”及既有统计不可用原因，不显示“清理中”“已清理”或成功提示；恢复与清理按既有目录不存在门禁禁用并提示，不要求新增 `not_found` 清理状态

#### Scenario: 非法清理状态按未知处理

- **GIVEN** 记录未清理，当前页用量不是 `not_found`，列表返回的 `mount_cleanup_state` 不是 `null`、`cleaning`、`failed` 或 `unknown`
- **WHEN** 页面渲染该行
- **THEN** 按 `unknown` 显示“清理状态未知”，不显示“已清理”或成功提示；不回显非法值原文，恢复与清理按既有列表/用量门禁重新计算

#### Scenario: Ctrl 重启丢失状态

- **GIVEN** 清理已受理，随后列表对该记录返回 `mount_cleanup_state: null` 或缺失，且既有 `cleaned_at`/`mount_cleaned` 仍为空
- **WHEN** 页面处理刷新结果
- **THEN** 不显示“已清理”或成功提示，不永久停留在“清理中”；回退既有列表事实并按既有列表/用量门禁重新开放操作；不自动发起清理或恢复写请求

#### Scenario: 清理请求本身失败

- **GIVEN** 用户确认清理，Ctrl 拒绝受理或请求超时
- **WHEN** 清理请求返回失败
- **THEN** 不进入“清理中”成功路径，不显示清理成功；按既有错误处理显示可理解失败并保留当前页记录；不启动新的状态轮询，不自动重试写请求，操作门禁按原列表与用量事实保持

### Requirement: DeletedContainers 保留其他删除页功能

异步清理状态 SHALL 只影响当前页对应行；列表、服务端分页、用量轮询、Mount 复制、详情展开、恢复二选一、凭据弹窗、权限与错误处理 SHALL 保持既有行为。清理一行 MUST NOT 阻塞其他行、其他页或整页刷新；手动刷新 SHALL 允许并重新读取列表状态。翻页、刷新或离开 SHALL 取消旧状态轮询并丢弃迟到响应。Web MUST NOT 新增数据库结构、状态查询 API 或直接访问 Node；恢复请求参数 MUST NOT 因清理状态改变。

#### Scenario: 单行清理不阻塞其他行与分页

- **GIVEN** 当前页一行处于“清理中”，另一行具备可恢复快照
- **WHEN** 用户查看或操作其他行、切换分页或刷新整页
- **THEN** 其他行的列表、恢复、用量与详情入口保持既有可用性；分页仍按服务端当前页请求；整页刷新不被清理中的行锁死，刷新后重新读取列表中的进程内状态

#### Scenario: 恢复二选一与凭据弹窗不变

- **GIVEN** 非清理中的可恢复记录收到 `requires_choice`，或恢复完成返回 root 凭据
- **WHEN** 用户选择 snapshot/template 或恢复成功
- **THEN** 仍显示现有两份配方、分段差异、选择后重调、凭据弹窗与安全错误处理；恢复请求参数仍为既有 `deleted_id`/`content_source`，不携带清理状态或路径

#### Scenario: 手动刷新与移动卡片可用

- **GIVEN** 移动端当前页存在清理中记录
- **WHEN** 用户点击刷新或查看 390px 卡片
- **THEN** 刷新按钮保持可用并重新读取列表；卡片显示清理中状态与两枚禁用操作按钮，完全保留容器、机器、Mount、用量、删除时间、状态和操作七列；其他卡片的复制、详情和恢复操作不受影响

#### Scenario: 旧 Ctrl 或缺少新字段

- **GIVEN** 清理请求返回旧式 `{ success: 1 }`，或列表缺少 `mount_cleanup_state`/`mount_cleanup_error_reason`
- **WHEN** 页面无法取得明确受理或新状态
- **THEN** 不显示“已清理”或成功提示，不把旧 `success` 当成完成；历史 `cleaned_at`/`mount_cleaned` 仍正常显示已清理，其余按既有列表事实展示并按既有门禁恢复操作；不新增状态接口、不直连 Node、不自动重试清理
