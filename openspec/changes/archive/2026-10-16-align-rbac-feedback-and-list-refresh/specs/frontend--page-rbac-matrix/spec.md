## MODIFIED Requirements

### Requirement: RbacMatrix 主流程

页面 SHALL 按后端 entity_code 与目录匹配权限点，区分直接赋予、方法实体通配覆盖、同域 manage 派生和未启用。bypass_auth_entity SHALL 覆盖包括各域 manage 在内的方法点，MUST NOT 派生 bypass_resource 或被显示为资源通配；bypass_resource 本身不赋予方法权限。同域 manage SHALL 只派生实际存在的同域非 manage 方法。operator 的 locked_entity_codes SHALL 保留直接修改限制。组创建与整组实体保存 SHALL 沿用后端契约，组名校验 SHALL 与后端标识符正则一致。

#### Scenario: 保存有效权限组配置
- **WHEN** 保存有效权限组配置
- **THEN** 通过 updateRbacGroupEntities 提交 code 集合并刷新矩阵，不把矩阵 id 当作持久化实体 id

#### Scenario: 方法通配覆盖管理方法
- **WHEN** 组只直接赋予 bypass_auth_entity
- **THEN** 各域 manage 显示方法层实体通配覆盖，bypass_resource 不显示被派生，也不承诺全部资源范围；非锁定 manage 仍允许直接配置，不能因方法已覆盖而阻止赋予其资源管理能力

#### Scenario: 直接配置管理权限不被方法覆盖阻断
- **WHEN** 方法通配组直接赋予某域 manage，再撤销该直接赋予
- **THEN** 保存集合分别包含和不包含该 manage；撤销后方法仍显示被通配覆盖，但不再把派生 manage 视为该域资源通配，锁定项限制始终保留

#### Scenario: 直接赋予与域内派生
- **WHEN** 某方法直接赋予，或仅由同域 manage 派生
- **THEN** 前者保持直接启用，后者显示管理覆盖；其他域不被该 manage 扩大

#### Scenario: 组名不符合后端格式
- **WHEN** 组名不匹配后端要求的首字母及长度、字符范围
- **THEN** 保存前显示原因且不提交无效创建请求，合法名称仍由后端进行唯一性校验
