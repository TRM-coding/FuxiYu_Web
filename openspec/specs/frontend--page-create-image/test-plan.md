# frontend--page-create-image Test Plan

Spec: [spec.md](spec.md)

## Current Mapping

### Requirement: CreateImage 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] src/test/CreateImage.test.jsx::loads user_images scope by default for image editors
  - [X] src/test/CreateImage.test.jsx::资源通配：出现「仅看我创建的」，默认只看我的、可关掉看全部，并能编辑他人模板
  - [X] src/test/CreateImage.test.jsx::删除键按方法级 image:manage：无该权限时不渲染
  - [X] src/test/CreateImage.test.jsx::删除键按方法级 image:manage：生效集含 manage 时渲染
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_image_entry_route_and_identity_snapshot
- Assertion scope: 既有 locator 用真实 `CreateImage` 与 `PermissionProvider` 断言权限快照加载后默认请求 `user_images`、资源通配决定“仅看我创建的”与跨所有者编辑、删除按钮仅由方法级 `image:manage` 放行；该 locator 在 `/index/images` 路由下断言页面装配、身份快照来自 Provider，且资源范围与每项方法门同时保留。
- Coverage note: 既有 locator 直接渲染组件；`/index/images` 路由装配由该 locator 覆盖。列表 API 的 `image:view` 与整页编辑入口的 `image:edit` 是不同层次，本行不宣称存在只具备 view 即可进入管理页的能力。

### Requirement: CreateImage 主流程

#### Scenario: 清空启动命令并保存

- Test/check:
  - [X] src/test/CreateImage.test.jsx::把详情里的 entrypoint 读进表单，并在保存时发出去
  - [X] src/test/CreateImage.test.jsx::清空时发空串而不是 null（null 会被后端 exclude_none 丢掉，等于没清）
  - [X] src/test/CreateImage.test.jsx::切到「所有人可见」只调三态接口，不碰名单接口
  - [X] src/test/CreateImage.test.jsx::custom 态保存时先定态、再发名单（顺序是硬约束）
  - [X] src/test/CreateImage.test.jsx::非 custom 态不提供名单入口，并说明名单会保留
  - [X] src/test/CreateImage.test.jsx::把详情里回显的 custom 名单读进选择器
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_image_create_payload_includes_actual_create_fields
  - [X] src/test/AnvilCreateDeleted.test.jsx::test_image_delete_calls_delete_and_reloads_list
- Assertion scope: 既有 locator 断言 entrypoint 读入与空串保存、private/everyone/custom 三态、custom 才管理名单且先定态后发名单、非 custom 保留名单说明、custom 名单回显；该 locator 断言新建分支实际发送 `name`、`description`、`status`、`base_image`、`dockerfile_body`、`entrypoint`，并断言删除动作在确认后调用 `deleteImage(image_id)` 并重取当前列表（后端停用语义不在 Web 断言）。
- Coverage note: 既有 locator 覆盖 entrypoint 与三态；新建分支实际字段与删除动作由该 locator 覆盖。父已明确新建不设置 `valid_range`/`visible_user_ids`；范围/名单属既有编辑分支与独立 share/audit 接口（`src/pages/CreateImage.jsx:331-340`、`:575-578`），非新建需求；本 locator 只断言六个新建字段，不新增分享流程或字段。该 Scenario 的 Ctrl 渲染最终 Dockerfile 默认命令、Node 不覆写 command 属跨仓行为，不在 Web 断言范围。

### Requirement: CreateImage 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] npm run build
  - [X] src/test/loginViewerLazy.test.jsx::viewer 模块未完成时：右侧是空占位，左侧登录表单照常可用
- Assertion scope: `npm run build` 以退出码 0 完成；viewer locator 断言 three 相关模块独立加载；构建输出提供页面级与 `ModelViewer` chunk 的观测，不逐页断言 chunk 名称。
- Coverage note: chunk 体积与警告清单属构建观测；不把源码字符串当作构建通过。

### Requirement: 镜像资源通配管理范围

#### Scenario: 默认操作员跨所有者编辑

- Test/check:
  - [X] src/test/CreateImage.test.jsx::资源位为 true 者可编辑他人模板（与后端资源门放行一致）
  - [X] src/test/CreateImage.test.jsx::资源通配：出现「仅看我创建的」，默认只看我的、可关掉看全部，并能编辑他人模板
- Assertion scope: 资源位为 true 时加载他人镜像完整详情并允许编辑，不因 `created_by_user_id` 不同被禁用；默认“仅看我创建的”开启，关闭后可看全部资源范围。

#### Scenario: 方法通配不扩展资源

- Test/check:
  - [X] src/test/CreateImage.test.jsx::仅 bypass_auth_entity：生效集里有 image:manage，但资源位为 false → 不开资源范围
  - [X] src/test/CreateImage.test.jsx::旧响应缺资源位：保守 false，即便 entities 含 image:manage 也不开资源范围
  - [X] src/test/imagePermissions.test.js::删除等管理端点要直持 image:manage
- Assertion scope: 仅 `bypass_auth_entity` 展开出 `image:manage` 而资源位为 false 时，不显示“仅看我创建的”、他人模板只读；旧响应缺资源位按 false；方法级 `image:manage` 不被资源通配替代。

### Requirement: 仅看我的按创建者过滤

#### Scenario: 通配者切换筛选

- Test/check:
  - [X] src/test/CreateImage.test.jsx::资源通配：出现「仅看我创建的」，默认只看我的、可关掉看全部，并能编辑他人模板
  - [X] src/test/CreateImage.test.jsx::loads user_images scope by default for image editors
- Assertion scope: 资源通配者默认以 `mine_only: true` 请求，切到全部后以 `mine_only: false` 请求；返回列表由服务端资源范围决定，本行只断言请求参数与页面切换。

#### Scenario: 被授权查看的他人模板

- Test/check:
  - [X] src/test/CreateImage.test.jsx::他人创建的模板：编辑区与可见范围都标灰，并说明原因
  - [X] src/test/CreateImage.test.jsx::自己创建的模板照旧可编辑（别把归属闸做成谁都改不了）
  - [X] src/test/CreateImage.test.jsx::资源通配：出现「仅看我创建的」，默认只看我的、可关掉看全部，并能编辑他人模板
- Assertion scope: 既有 locator 断言 `mine_only` 请求参数、非所有者且无资源通配时编辑区与可见范围只读、自己创建的模板仍可编辑；查看授权不改变所有权编辑门，页面不从 CUSTOM 名单推断资源所有权。
- Coverage note: `mine_only=true` 的他人模板/查看授权过滤由 Ctrl 语义执行；Web 侧只断言请求参数与所有权编辑门，不伪造服务端过滤结果。

### Requirement: CreateImage 关键词列表只应用当前上下文

#### Scenario: 当前关键词响应应用

- Test/check:
  - [X] src/test/CreateImage.test.jsx::test_q22_create_image_current_keyword
- Assertion scope: 当前关键词请求返回后列表更新，选中项仍与当前关键词列表一致，请求参数包含当前 `image_search` 与 `mine_only`。

#### Scenario: 旧关键词响应晚到

- Test/check:
  - [X] src/test/CreateImage.test.jsx::test_q22_create_image_stale_keyword
- Assertion scope: 关键词 A 的响应晚于关键词 B 返回时被丢弃，列表与选中项保持 B 的结果，旧响应不触发详情请求。

### Requirement: CreateImage 新建成功后清空关键词、空词重取、选中新项并保留表单

#### Scenario: 非匹配关键词下新建成功

- Test/check:
  - [X] src/test/CreateImage.test.jsx::test_q63_create_image_clear_keyword_select_new
- Assertion scope: 新建成功后关键词清空为 `''`，以空关键词重取列表，`selectedId` 指向新 `image_id`，表单字段保持刚提交的值，不被服务端新名称覆盖。

#### Scenario: 空词重取失败仍保留表单

- Test/check:
  - [X] src/test/CreateImage.test.jsx::test_q63_create_image_reload_failure_preserves_form
- Assertion scope: 空关键词重取失败时表单保留提交内容，页面展示可读错误，`selectedId` 不指向不存在的列表项，不伪造新项已选中。

### Requirement: CreateImage 更新成功后重新读取左侧列表

#### Scenario: 更新成功重取列表

- Test/check:
  - [X] src/test/CreateImage.test.jsx::test_q64_create_image_update_refetches_list
- Assertion scope: 更新成功按当前关键词重取列表，展示更新后的名称/摘要，选中项仍为该镜像。

#### Scenario: 更新失败保留旧列表

- Test/check:
  - [X] src/test/CreateImage.test.jsx::test_q64_create_image_update_failure_keeps_list
- Assertion scope: 更新失败时左侧列表保持更新前内容，错误弹窗收到 `message` 对象、状态与 route，不显示“模板已保存”。

### Requirement: CreateImage 镜像错误原因按现有协议映射

#### Scenario: 已知镜像原因展示中文

- Test/check:
  - [X] src/test/CreateImage.test.jsx::test_q37_create_image_known_reasons
  - [X] src/test/showErrorModalMap.test.js::/images/create_image → duplicate_entry
- Assertion scope: 15 行 `route/error_reason` 表逐行映射为期望中文；真实弹窗样例 `/images/create_image` + `duplicate_entry` 显示“镜像名称已存在”，不出现“未收录的错误原因”。
- Coverage note: 全表由 routeErrorMap 逐行断言；真实弹窗抽样覆盖一个镜像路由，其余行未逐个渲染。

#### Scenario: 未登记镜像原因保留兜底

- Test/check:
  - [X] src/test/CreateImage.test.jsx::test_q37_create_image_unknown_reason
- Assertion scope: 未登记 `error_reason` 时真实弹窗显示中文兜底与“未收录的错误原因：…”，不硬套“镜像名称已存在”。
