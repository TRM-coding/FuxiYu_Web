## MODIFIED Requirements

### Requirement: CreateImage 页面入口与身份

页面 SHALL 通过 `/index/images` 装配，并区分方法能力与资源范围：列表需要 image:view，完整详情和编辑需要 image:edit，删除需要 image:manage；编辑资源由创建者归属或后端确认的资源通配放行，MUST NOT 用方法通配展开结果代替真实资源能力。

#### Scenario: 装配页面
- **WHEN** 路由匹配镜像管理页且权限快照已加载
- **THEN** 使用当前身份和真实资源能力决定管理范围，同时保留每项操作的方法权限门禁

## ADDED Requirements

### Requirement: 镜像资源通配管理范围

拥有真实镜像资源通配且具备相应方法权限的用户 SHALL 能在默认列表选择、查看和编辑他人的镜像。只有方法通配或授权查看名单 MUST NOT 被当作全部资源管理权；资源拒绝 SHALL 保留会话并按普通业务失败反馈。

#### Scenario: 默认操作员跨所有者编辑
- **WHEN** 同时具有资源与方法通配的操作员选择他人镜像
- **THEN** 能加载完整详情并提交编辑或可见性修改，不因创建者不同被前端禁用

#### Scenario: 方法通配不扩展资源
- **WHEN** 用户只有方法实体通配，没有真实资源通配
- **THEN** 不因展开权限中出现 image:manage 而显示全部资源可编辑能力

### Requirement: 仅看我的按创建者过滤

“仅看我的” SHALL 通过 mine_only=true 只展示当前用户创建的镜像，不纳入仅由通配、全员可见或 CUSTOM 查看授权获取的他人镜像。创建者不在 CUSTOM 名单时仍 SHALL 看见自己的镜像，查看授权不构成所有权转让。

#### Scenario: 通配者切换筛选
- **WHEN** 资源通配者从全部镜像切换到仅看我的
- **THEN** 列表只显示自己创建的镜像，取消筛选后才恢复其全部资源范围

#### Scenario: 被授权查看的他人模板
- **WHEN** 当前用户在他人模板的 CUSTOM 查看名单中
- **THEN** 该模板不进入其“仅看我的”列表，不能据此取得模板所有者编辑能力
