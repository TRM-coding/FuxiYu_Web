## ADDED Requirements

### Requirement: 新增协作者凭据与不乐观加入

ContainerDetailPage 的现有新增协作者入口对 ADMIN 与 COLLABORATOR 均 SHALL 使用既有 `add_collaborator` 请求，由 Ctrl 生成随机密码、Node 设置；响应 `accepted: true` 且恰好一项凭据时，页面 SHALL 立即展示受控密码弹窗。Web MUST NOT 发送密码或登录名，MUST NOT 在受理后乐观插入本地账号或宣称已加入；后续成功/失败以既有 `ADD_COLLABORATOR` oplog 与刷新后的权威详情为准，不新增密码日志或重复添加日志。普通非 ROOT 的 ADMIN/COLLABORATOR 互换不生成密码。

#### Scenario: 新增 ADMIN 协作者

- **GIVEN** 当前用户可管理容器成员，选择新用户并指定 ADMIN
- **WHEN** Ctrl 返回 `accepted: true` 与恰好一项凭据
- **THEN** 页面立即展示该凭据，行文案为“重置后{login_name}的密码：”；不立即把该账号插入本地列表，也不提示“已加入”

#### Scenario: 新增 COLLABORATOR 协作者

- **GIVEN** 当前用户可管理容器成员，选择新用户并指定 COLLABORATOR
- **WHEN** Ctrl 返回 `accepted: true` 与恰好一项凭据
- **THEN** 与 ADMIN 新增相同，立即展示一项凭据；不发送前端账号名、密码或默认口令

#### Scenario: 新增受理失败或凭据异常

- **GIVEN** 新增协作者请求失败，或 `accepted: true` 但凭据缺失/字段非法
- **WHEN** 页面处理结果
- **THEN** 不展示任何密码，不插入本地账号，不提示成功；只显示脱敏错误，后续以 oplog 为准

### Requirement: 账号卡密码重置入口与权限

ContainerDetailPage 的每个账号卡 SHALL 提供“重置密码”按钮。按钮仅当同时满足以下三层时可见：方法层 `hasPermission('container:operation')`；资源层当前用户是该容器 ROOT 绑定本人，或权限快照的 `containerResourceUnrestricted === true`；机器/在线层容器 `online` 且宿主机可用。缺少任一层的其他 ADMIN、COLLABORATOR 以及仅由 `bypass_auth_entity` 展开的方法权限 MUST NOT 获得该按钮。本入口只在详情页账号卡提供，Web MUST NOT 在 Home 增加额外重置按钮。按钮 SHALL 在容器非 `online`、宿主机离线/维护、状态过渡、缺少 `container:operation` 或目标账号缺少有效 `user_id` 时禁用并给出原因；发请求前 SHALL 重新校验三层资格、目标绑定与容器状态。Web MUST NOT 发送或显示任何默认密码，包括 `user123`、`owner123` 或其他固定口令。

#### Scenario: ROOT 本人可见

- **GIVEN** 当前用户是容器 ROOT 绑定，详情返回 `root` 与普通账号两个绑定
- **WHEN** 详情页渲染账号卡
- **THEN** 每个账号卡均显示“重置密码”按钮，包括 ROOT 与普通账号

#### Scenario: 资源管理通配者可见

- **GIVEN** 当前用户不是容器 ROOT，但权限快照 `containerResourceUnrestricted` 为 true
- **WHEN** 详情页渲染账号卡
- **THEN** 每个账号均显示“重置密码”按钮，不要求 ROOT 绑定

#### Scenario: ADMIN、COLLABORATOR 与方法通配不得放行

- **GIVEN** 当前用户是容器 ADMIN 或 COLLABORATOR，或仅持 `bypass_auth_entity` 且 `containerResourceUnrestricted` 为 false
- **WHEN** 详情页渲染账号卡
- **THEN** 不显示“重置密码”按钮；页面不发送重置请求

#### Scenario: 缺少 container:operation 方法层守卫

- **GIVEN** 当前用户是容器 ROOT 绑定或 `containerResourceUnrestricted` 为 true，但 `hasPermission('container:operation')` 为 false
- **WHEN** 详情页渲染账号卡
- **THEN** “重置密码”按钮隐藏或禁用并给出方法权限原因；页面不发送重置请求；后端仍是最终裁决

#### Scenario: 容器不在线或主机不可用

- **GIVEN** 容器状态不是 `online`，或宿主机离线/维护、启动/停止/重启等过渡态
- **WHEN** 查看账号卡
- **THEN** “重置密码”按钮禁用并显示既有状态原因；用户不能发起重置请求

#### Scenario: 目标绑定缺少 user_id 或提交前变化

- **GIVEN** 目标账号没有有效绑定 `user_id`，或确认提交前容器变为离线/维护/过渡态
- **WHEN** 用户确认重置
- **THEN** 页面不调用接口，关闭确认并显示原因；MUST NOT 改发前端账号名或旧 user_id

#### Scenario: 不得回退到默认密码

- **GIVEN** 容器详情或用户输入中没有密码字段
- **WHEN** 用户执行任何账号重置或角色操作
- **THEN** Web 不发送、不显示、不保存任何默认密码；密码只能来自 Ctrl 响应 `credentials`

### Requirement: 账号卡密码重置请求与受理

点击并经确认后，页面 SHALL 只调用 `POST /api/containers/reset_container_password`，请求体精确为 `{ container_id, user_id }`；MUST NOT 发送 `login_name`、`password` 或前端展示名。Ctrl 在受理前执行三层既有 guard：方法层 `container:operation`、资源层 `container:root`（ROOT 绑定或资源通配）、机器层主机与容器 `online` 可用；UI 的可见/可用口径与后端一致，只在三层均满足时执行。目标登录名取绑定 username，ROOT 固定 `root`。404/409/500 使用既有 `error_reason` 映射，Ctrl 不拼原始错误体。受理后页面 SHALL 立即用受控密码弹窗展示一项凭据，MUST NOT 等待 Node 或轮询密码。后续成功/失败只以既有 oplog 呈现，操作码为 `reset_container_password`，MUST NOT 在 oplog、通知或页面日志中写入密码。

#### Scenario: 只提交绑定身份

- **GIVEN** 当前用户是容器 ROOT 绑定，点击普通账号的“重置密码”并确认
- **WHEN** 页面发起请求
- **THEN** 请求只含该绑定的 `container_id` 与 `user_id`；不出现 `login_name`、`password`、`username` 或前端展示名

#### Scenario: 登录名以前端展示名伪装

- **GIVEN** 账号卡的展示名与绑定登录名不同，响应返回 `login_name` 为绑定 username
- **WHEN** 密码弹窗打开
- **THEN** 行文案使用响应 `login_name`，不使用卡片展示名；ROOT 绑定即使展示名不同也使用响应中的 `root`

#### Scenario: 受理后立即展示

- **GIVEN** 重置请求返回 `accepted: true` 与恰好一项凭据
- **WHEN** 页面处理响应
- **THEN** 立即打开受控密码弹窗；不等待容器状态变化或 Node 结果，不发起密码轮询

#### Scenario: 后续结果只看 oplog

- **GIVEN** 重置已受理并已展示密码
- **WHEN** Node 后台执行成功或失败
- **THEN** 页面不宣称密码已生效，不写入含密码的日志；用户刷新既有操作历史后看到 `reset_container_password` 成功或失败记录

#### Scenario: 重置失败不泄露密码

- **GIVEN** 重置请求失败、超时或响应夹带密码字段
- **WHEN** 页面处理失败
- **THEN** 不打开密码弹窗，不显示任何密码，不把原始响应体写入错误弹窗或 console；保留当前账号与角色展示

#### Scenario: 受理凭据数量或字段非法

- **GIVEN** 重置响应 `accepted: true`，但凭据不是恰好一项，或 login_name/password 为空
- **WHEN** 页面校验
- **THEN** 不展示任何部分密码，显示通用“响应异常”错误；不自动重试、不宣称成功

### Requirement: 详情页 ROOT 提升默认单目标

当详情页把非 ROOT 绑定改选为 ROOT 时，页面 SHALL 只调用一次 `POST /api/containers/update_role`，参数为 `{ container_id, user_id, updated_role: 'ROOT', transfer_root: false }`（或省略 `transfer_root`，默认 false）。这是详情页原有行为：只升目标，不降旧 ROOT。Web MUST NOT 自行先降旧 ROOT、自行创建旧 owner 独立账号、自行发起第二次 `update_role`，也 MUST NOT 提交任何密码、登录名或默认口令。

#### Scenario: 只提升目标

- **GIVEN** 容器已有 ROOT 绑定，另有一个非 ROOT 绑定可选为 ROOT
- **WHEN** 页面提交 ROOT 提升
- **THEN** 只发出一次目标 `update_role` 请求，`transfer_root` 为 false；Web 不调用旧 ROOT 降级请求，不要求旧 ROOT 凭据

#### Scenario: 普通 ADMIN/COLLABORATOR 互换不生成密码

- **GIVEN** 当前账号为非 ROOT 的 ADMIN 或 COLLABORATOR
- **WHEN** 用户在同一账号上切换 ADMIN/COLLABORATOR
- **THEN** 只调用既有角色接口，响应可无凭据；不打开密码弹窗，不生成密码，不发送默认口令

### Requirement: 详情页 ROOT 提升只展示 root 单凭据

`transfer_root:false` 的 ROOT 提升受理响应 `accepted === true` 且 `credentials` 恰好一项 `root` 时，页面 SHALL 在受控密码弹窗展示该项。Web MUST NOT 要求第二项、生成旧 ROOT 凭据或乐观改写账号角色；结果以既有 `UPDATE_COLLABORATOR_ROLE` oplog 与刷新后的权威详情为准，超时/未知结果不得伪装 Node 确认成功。

#### Scenario: 只展示 root 一项

- **GIVEN** ROOT 提升返回 `accepted: true` 与一项 `login_name=root` 的凭据
- **WHEN** 页面处理响应
- **THEN** 弹窗只显示一项“重置后root的密码：”；不显示旧 ROOT 行，不要求两项

#### Scenario: 凭据不是恰好一项

- **GIVEN** 响应 `accepted: true`，但凭据为零项、多于一项或 login_name/password 为空
- **WHEN** 页面校验
- **THEN** 不展示任何部分密码，不乐观改写角色，显示通用“响应异常”错误；不自动重试

#### Scenario: 提升失败或结果未知

- **GIVEN** ROOT 提升请求失败、被拒绝、超时或 oplog 结果未知
- **WHEN** 页面处理结果
- **THEN** 不打开/保留密码弹窗，不改变本地角色，不提示成功或 Node 已确认；只显示脱敏错误，后续以 oplog 为准

## MODIFIED Requirements

### Requirement: ContainerDetailPage 主流程

页面 SHALL 保持以下已实现的交互及数据职责：加载详情、日志并每 5 秒轮询状态；支持启停重启删除、长期标记、解冻、协作者增删改；受理动作等待运行状态收敛；镜像信息卡在该容器详情下发 image_dockerfile 时原样展示它（容器自身记录），页面不按当前模板另行渲染。新增协作者 SHALL 按凭据流程展示密码，普通 ADMIN/COLLABORATOR 互换 SHALL 保持现有实现与成功响应且不改变密码；ROOT 提升 SHALL 使用 `transfer_root:false` 默认单目标，受理后只展示一项 root 凭据，不等待 Node，不降旧 ROOT，不乐观改写本地角色。

#### Scenario: 启动已受理

- **WHEN** 启动已受理
- **THEN** 展示过渡状态并继续读取快照，最终 online/failed 由服务端事实决定

#### Scenario: 新增协作者先拿密码再加入

- **GIVEN** 用户新增 ADMIN 或 COLLABORATOR 协作者
- **WHEN** 页面收到 `accepted: true` 与一项凭据
- **THEN** 页面先展示密码，不乐观插入账号；刷新后按权威详情显示新增结果

#### Scenario: 普通角色切换保持原响应

- **GIVEN** 账号当前为非 ROOT 的 ADMIN 或 COLLABORATOR
- **WHEN** 用户把它切换为另一普通角色
- **THEN** 页面沿用既有成功响应与提示，不显示密码弹窗，不改变该账号密码

#### Scenario: 详情页 ROOT 提升受理后不等待后台

- **GIVEN** 用户把非 ROOT 账号选为 ROOT，详情页使用默认 `transfer_root:false`
- **WHEN** 页面收到 `accepted: true` 与一项 root 凭据
- **THEN** 页面立即展示该项并等待用户关闭；不阻塞 Node，不降旧 ROOT，不把受理当作角色已完成
