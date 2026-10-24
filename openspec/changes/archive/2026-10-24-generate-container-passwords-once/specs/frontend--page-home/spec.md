## ADDED Requirements

### Requirement: Home 新增协作者凭据

Home 通过既有人员管理弹窗新增 ADMIN 或 COLLABORATOR 协作者时，SHALL 使用既有 `add_collaborator` 请求，由 Ctrl 生成随机密码、Node 设置；响应 `accepted: true` 且恰好一项凭据时，Home SHALL 在人员弹窗关闭过程中仍展示同一个受控密码弹窗。Web MUST NOT 发送密码或登录名，MUST NOT 在受理后乐观插入本地账号或宣称已加入；后续成功/失败以既有 `ADD_COLLABORATOR` oplog 与刷新结果为准，不新增密码日志或重复添加日志。

#### Scenario: 新增 ADMIN 或 COLLABORATOR 后展示密码

- **GIVEN** Home 人员管理弹窗选择新用户并指定 ADMIN 或 COLLABORATOR
- **WHEN** Ctrl 返回 `accepted: true` 与恰好一项凭据
- **THEN** 人员弹窗关闭后受控密码弹窗仍展示该项，文案为“重置后{login_name}的密码：”；本地账号列表不立即插入，不提示“已加入”

#### Scenario: 新增失败或凭据异常

- **GIVEN** 新增请求失败，或 `accepted: true` 但凭据缺失/字段非法
- **WHEN** Home 处理结果
- **THEN** 不展示任何密码，不插入本地账号，不提示成功；只显示脱敏错误，后续以 oplog 为准

### Requirement: Home ROOT 交接只提交一次目标请求

Home 通过既有人员管理弹窗修改容器角色时，ROOT 交接 SHALL 只提交一次 `POST /api/containers/update_role`，参数为 `{ container_id, user_id, updated_role: 'ROOT', transfer_root: true }`。Web MUST NOT 自行先降旧 ROOT、自行创建旧 owner 独立账号、自行发起第二次 `update_role`，也 MUST NOT 提交任何密码、登录名或默认口令。Ctrl 仅在 `transfer_root:true` 时按既有顺序后台执行“旧 ROOT→ADMIN、目标→ROOT”；Node 没有 `transfer_root` 字段，每次只处理指定目标；角色结果沿用既有语义。

#### Scenario: 只发一次目标请求且显式交接

- **GIVEN** Home 详情弹窗打开某容器的“管理人员”，当前存在 ROOT 与非 ROOT 账号
- **WHEN** 用户把非 ROOT 账号改选为 ROOT
- **THEN** 只发出一次目标 `update_role`，`transfer_root` 为 true；Web 不自行降级旧 ROOT，不发送密码或登录名

### Requirement: Home ROOT 交接双凭据且不伪装完成

ROOT 交接受理响应 `accepted === true` 且 `credentials` 为至少两项的数组时，Home SHALL 在人员弹窗关闭过程中仍按数组逐项展示同一个受控密码弹窗：正常单个旧 ROOT 为旧 ROOT 独立账号 + `root` 两项；历史多 ROOT 为所有涉及账号 + `root`，可超过两项。Web MUST NOT 截断到两项、丢弃涉及账号、为凑两项改写角色或新增重复日志；ROOT 各步沿用既有 `UPDATE_COLLABORATOR_ROLE`。Home MUST NOT 乐观改写账号角色、宣称交接完成或轮询密码；旧 ROOT→ADMIN、目标→ROOT 的实际完成情况以 oplog 与刷新后的权威详情为准，失败或部分完成 MUST NOT 被伪报为成功。

#### Scenario: 人员弹窗关闭后展示全部凭据

- **GIVEN** Home 人员管理弹窗已提交 ROOT 交接并收到 `accepted: true` 与至少两项的凭据
- **WHEN** 人员弹窗关闭
- **THEN** 受控密码弹窗逐项展示所有 login_name（常规单个旧 ROOT 为 2 项，历史多 ROOT 可 >2），文案为“重置后{login_name}的密码：”；本地角色不立即改写

#### Scenario: 部分完成不伪报成功

- **GIVEN** 后台只完成旧 ROOT→ADMIN，目标→ROOT 失败
- **WHEN** Home 刷新或读取 oplog
- **THEN** 不宣称 ROOT 交接成功，不把目标显示为已 ROOT；已完成的旧 ROOT→ADMIN 按权威结果显示

#### Scenario: 受理凭据少于两项或字段非法

- **GIVEN** 响应 `accepted: true`，但 ROOT 交接凭据少于两项，或某项 login_name/password 为空
- **WHEN** Home 校验
- **THEN** 不展示任何部分密码，不乐观改写角色，显示通用“响应异常”错误；不自动重试

#### Scenario: 交接失败

- **GIVEN** ROOT 交接请求失败、被拒绝或超时
- **WHEN** Home 处理失败
- **THEN** 不打开密码弹窗，不改写角色，不提示成功；只显示脱敏错误，后续以 oplog 为准

#### Scenario: 普通 ADMIN/COLLABORATOR 互换不生成密码

- **GIVEN** 账号为非 ROOT 的 ADMIN 或 COLLABORATOR
- **WHEN** 用户在人员管理弹窗把它切换为另一普通角色
- **THEN** 沿用既有成功提示，不打开密码弹窗，不生成或改变密码
