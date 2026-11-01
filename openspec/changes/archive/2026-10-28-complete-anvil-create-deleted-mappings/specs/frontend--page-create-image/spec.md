# Spec Delta

## MODIFIED Requirements

### Requirement: CreateImage 页面入口与身份

页面 SHALL 通过 `/index/images` 装配，并区分方法能力与资源范围：列表需要 image:view，完整详情和编辑需要 image:edit，删除需要 image:manage；编辑资源由创建者归属或后端确认的资源通配放行，MUST NOT 用方法通配展开结果代替真实资源能力。

#### Scenario: 装配页面
- **WHEN** 路由匹配镜像管理页且权限快照已加载
- **THEN** 使用当前身份和真实资源能力决定管理范围，同时保留每项操作的方法权限门禁

### Requirement: CreateImage 主流程

页面 SHALL 保持以下已实现的交互及数据职责：维护 name/base_image/dockerfile_body/entrypoint/status/valid_range；private/everyone/custom 三态，custom 才管理 visible_user_ids；删除为停用。

#### Scenario: 清空启动命令并保存

- **WHEN** 清空启动命令并保存
- **THEN** 传空串使后端清除 entrypoint，Ctrl 渲染最终 Dockerfile 时采用平台默认命令；Node 运行该镜像，不另行覆写 command。前端注入预览与真实设置差异见 QUESTIONS

### Requirement: CreateImage 构建归属

页面 SHALL 通过路由表的按需加载组织参加 Vite 构建：`src/routes/index.jsx` 对页面组件与共同布局（`MainLayout`、`AdminLayout`）使用 `React.lazy` 动态导入，并在 route element 层以既有 `Suspense` 提供页面级加载反馈（仅描述当前实现，不新增加载 UI）；`LoginLayout`、路由骨架与 React 运行时随入口静态加载。`LoginLayout` 内的 `ModelViewer` 亦按需加载，three 相关代码经 `vite.config.js` 的 `manualChunks` 按依赖方向 addons → WebGL → core 分为 `vendor-three-core`、`vendor-three-webgl`、`vendor-three-addons`，均不进入入口 chunk。上述页面与 `ModelViewer` 不再与同路由树代码共同进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`src/utils/requestManager.jsx` 与 `src/utils/validateCmdArg.jsx` 统一为静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属构建验收观测，记入本轮验收报告，不作为本规格固化的历史指标

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

### Requirement: CreateImage 关键词列表只应用当前上下文

关键词变化产生的镜像列表请求 SHALL 使用请求序号或 AbortController；响应应用前 MUST 确认仍对应当前关键词、`mine_only` 与资源范围。旧响应 MUST NOT 覆盖当前列表或当前选中项。

#### Scenario: 当前关键词响应应用

- **GIVEN** 用户停留在当前关键词与筛选
- **WHEN** 当前列表请求返回
- **THEN** 左侧列表按该响应更新，选中项仍与当前列表一致

#### Scenario: 旧关键词响应晚到

- **GIVEN** 用户从关键词 A 切到关键词 B
- **WHEN** 关键词 A 的请求晚于关键词 B 返回
- **THEN** 关键词 A 的结果被丢弃，列表仍显示关键词 B 的结果

### Requirement: CreateImage 新建成功后清空关键词、空词重取、选中新项并保留表单

新建镜像成功后页面 SHALL 清空关键词为 `''`，以空关键词重新请求列表，再选中返回的新 `image_id`，并保留用户刚提交的表单字段；MUST NOT 因新项尚未进入列表而把表单重置为空白。重取失败时 SHALL 保留提交表单并展示错误，MUST NOT 伪造新项已选中。

#### Scenario: 非匹配关键词下新建成功

- **GIVEN** 当前关键词不匹配即将创建的镜像，表单已填写
- **WHEN** 新建成功并返回 `image_id`
- **THEN** 关键词变为空串，列表以 `image_search=''` 重取并包含新镜像，`selectedId` 为新 `image_id`，表单字段保持提交值

#### Scenario: 空词重取失败仍保留表单

- **GIVEN** 新建成功但空关键词列表请求失败
- **WHEN** 页面处理失败
- **THEN** 表单保留刚提交的内容，页面展示可读错误，不把 `selectedId` 指向不存在的列表项

### Requirement: CreateImage 更新成功后重新读取左侧列表

更新镜像成功后页面 SHALL 按当前关键词重新请求左侧列表并展示最新摘要；MUST NOT 只调用 `selectImage` 而让列表停留旧数据。更新失败时 MUST NOT 把列表或表单伪装成已更新。

#### Scenario: 更新成功重取列表

- **GIVEN** 用户修改镜像并保存
- **WHEN** 更新接口成功
- **THEN** 左侧列表按当前关键词重新请求，展示更新后的名称与摘要，选中项仍为该镜像

#### Scenario: 更新失败保留旧列表

- **GIVEN** 用户保存镜像修改
- **WHEN** 更新接口失败
- **THEN** 左侧列表保持更新前内容，页面展示失败原因，不显示“已保存”成功文案

### Requirement: CreateImage 镜像错误原因按现有协议映射

页面调用 `showErrorModal` 时 SHALL 传递包含 `message` 对象、`status` 与 `route` 的调用参数，`route` MUST 为实际请求路径；镜像映射 SHALL 仅使用 Ctrl 当前已存在的 `error_reason`，MUST NOT 新增后端字段、错误码或接口。具体 route/error_reason 与期望中文见首个场景的映射表。

#### Scenario: 已知镜像原因展示中文

- **GIVEN** 镜像接口返回下表中的 `route` 与 `error_reason`
- **WHEN** 页面展示错误
- **THEN** 弹窗显示表中的中文原因，不显示“未收录的错误原因”

| route | error_reason | 期望中文 |
| --- | --- | --- |
| `/images/create_image` | `duplicate_entry` | 镜像名称已存在 |
| `/images/create_image` | `invalid_status` | 镜像状态不合法 |
| `/images/create_image` | `create_failed` | 创建镜像失败 |
| `/images/update_image` | `duplicate_entry` | 镜像名称已存在 |
| `/images/update_image` | `invalid_status` | 镜像状态不合法 |
| `/images/update_image` | `image_not_found` | 镜像不存在 |
| `/images/update_image` | `update_failed` | 更新镜像失败 |
| `/images/delete_image` | `image_not_found` | 镜像不存在 |
| `/images/set_image_valid_range` | `invalid_valid_range` | 镜像可见范围不合法 |
| `/images/set_image_valid_range` | `image_not_found` | 镜像不存在 |
| `/images/set_image_valid_range` | `set_valid_range_failed` | 设置镜像可见范围失败 |
| `/images/set_image_visible_users` | `not_custom_range` | 只有自定义可见范围才能设置用户名单 |
| `/images/set_image_visible_users` | `unknown_user` | 用户名单中存在不存在的用户 |
| `/images/set_image_visible_users` | `image_not_found` | 镜像不存在 |
| `/images/set_image_visible_users` | `set_visible_users_failed` | 保存镜像可见用户失败 |

#### Scenario: 未登记镜像原因保留兜底

- **GIVEN** 镜像接口返回上表之外的 `error_reason`
- **WHEN** 页面展示错误
- **THEN** 仍给出中文兜底并标注未收录原因，不硬套某个已知镜像错误
