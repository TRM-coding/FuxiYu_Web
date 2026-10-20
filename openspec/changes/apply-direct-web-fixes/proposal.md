# 直接修复已确认的 Web 缺口

## Why

QUESTIONS.md 中有 18 个属于 Web 的“无需决策”条目，已有明确行为、现有接口或可验证边界，但当前 Web 在请求乱序、错误映射、分页定位、刷新竞态、死代码和全仓 lint 上仍与这些结论不一致。第 2 轮审查为 `APPROVE_WITH_CHANGES`，本提案按 C5/M8–M11 补齐验收口径，先形成可审、可测试、可执行的规格，不在本阶段修改源码。

## What Changes

- 为 AdminLogs、AnnouncementEditor、CreateImage 等列表请求增加按查询上下文生效的序号或取消保护；权限查询在 `finally` 注销控制器。
- 修正公告编辑器机器/容器列表与详情请求的零基分页和乱序保护、模板下拉 205 项可达、编辑模板深链携带 ID，以及按钮夺焦后的光标插入。
- 修正镜像页新建/更新后的关键词、列表、选中项和表单状态；明确选择“清空关键词、空词重取、再选中新项、保留表单”。
- 补齐注册、验证码、设置、模板、镜像的 `route` 与 `error_reason` 映射，只使用 Ctrl 现有原因，不新增后端协议；删除草稿中的 `frontend--shared-error-display` 能力，把映射分配到对应页面。
- 修正设置页整数与提醒节点校验，并把 `GROUP_ORDER` 组名对齐为后端实际分组 `容器清理`、`已删除容器`。
- 用户管理页与机器管理页的容器详情统一使用现有专用详情路由，删除旧详情弹窗及不可达链路；用户表操作按钮阻止冒泡。
- 用户子容器沿用父请求 `pageSize=4`，子表按服务端 `total` 显示分页并由父页控制页码，使第 5/6 个子容器在第二页可达。
- 机器页解冻成功后只在页码和筛选仍匹配时刷新，操作途中切页的旧刷新不得把列表拉回。
- 容器详情页的刷新按钮和容器动作成功后都重取操作历史；404 页使用完整视口高度。
- 全仓 `npm run lint` 必须 0 errors / 0 warnings，不关闭规则、不新增忽略目录、不保留 `eslint-disable` 抑制；清理 Login、ManageMachine 等确认不可达的死分支与未用代码。
- 所有测试入口自动检测并注入 Node 26 的 `--no-experimental-webstorage`；声明支持范围 `^20.19.0 || >=22.12.0`，CI 覆盖 Node 20.19.0、22、26，不锁定单一旧版本。

## Capabilities

### New Capabilities

无。本变更保持 Web 以页面为单位的能力粒度，只复用现有页面、`frontend--authentication` 与 `frontend--build`；删除草稿中的非页面能力 `frontend--shared-error-display`，其页面级映射并入以下页面规格。

### Modified Capabilities

- `frontend--authentication`：权限查询在成功、异常和重复调用路径统一释放控制器。
- `frontend--build`：全仓 ESLint 归零、测试入口 Node 26 兼容、支持范围与 CI 矩阵。
- `frontend--page-admin-logs`：周次、筛选和分页请求只应用当前上下文结果。
- `frontend--page-announcement-editor`：机器/容器列表及详情零基分页与乱序保护、模板下拉分页与深层链接、光标插入。
- `frontend--page-container-detail-page`：刷新按钮和容器动作后重取操作历史。
- `frontend--page-create-image`：关键词请求乱序、新建/更新后的列表与表单状态、镜像错误映射。
- `frontend--page-docs`：删除全仓零引用的 Docs 旧资源。
- `frontend--page-login`：删除 `userMsg` 死分支与调试 `console`，保留结构化错误展示。
- `frontend--page-manage-machine`：容器详情统一到专用页、删除旧弹窗链、解冻后保页并防止旧刷新回拉。
- `frontend--page-manage-user`：容器行只走专用详情路由，删除不可达详情弹窗链。
- `frontend--page-manage-user-in-table`：行操作阻止冒泡，子容器按服务端 total 分页。
- `frontend--page-not-found`：独立 404 页使用完整视口高度。
- `frontend--page-register`：删除无效 `validateMessages`，补齐注册/验证码错误映射。
- `frontend--page-settings`：整数与提醒节点校验、组名对齐、设置错误映射。
- `frontend--page-template-manager`：模板 205 项分页、深链定位、模板错误映射。

## Q 覆盖

| Q | 结论 | 承接能力 | 关键验收 |
| --- | --- | --- | --- |
| Q22 | 列表与详情请求按上下文生效 | AdminLogs、AnnouncementEditor、CreateImage | 旧周次/筛选/页码/关键词/机器/详情响应不得覆盖当前结果 |
| Q23 | 输入完整校验且组名对齐 | Settings | 拒绝小数与非法提醒节点；`GROUP_ORDER` 使用 `容器清理`、`已删除容器` |
| Q24 | 机器/容器列表零基分页 | AnnouncementEditor | 首屏 `page_number=0`；用户列表分页不改 |
| Q27 | 权限查询释放控制器 | Authentication | 成功、401/异常均 `finally` 注销 |
| Q28 | 全仓 lint 归零 | Build、Login、ManageMachine | `npm run lint` 退出 0，0 errors / 0 warnings，不关规则/不屏蔽目录 |
| Q29 | Node 26 测试入口兼容 | Build | 所有测试入口自动注入 flag；支持 `^20.19.0 \|\| >=22.12.0`；CI 覆盖 20.19/22/26 |
| Q35 | 详情统一到专用页 | ManageMachine、ManageUser | 容器入口跳 `/index/containers/:id`，删除旧弹窗链 |
| Q36 | 生产不可达资源与死分支清理 | Docs、Register、ManageUser、Login | 删除零引用资源、`validateMessages`、ManageUser 死弹窗、Login `userMsg`/调试 console |
| Q37 | 错误映射按现有协议补齐 | Register、Settings、TemplateManager、CreateImage | 逐 route/error_reason 映射，不创造后端协议 |
| Q52 | 模板两处 205 项可达并深链定位 | AnnouncementEditor、TemplateManager | `limit=200` + `offset=0/200`；`template_id` 定位；不新增接口 |
| Q55 | 光标插入不因按钮夺焦失效 | AnnouncementEditor | 保持或缓存选区，点击后仍插入原选区 |
| Q59 | 子容器分页可达 | ManageUserInTable | 父 `pageSize=4`；子表按服务端 total 分页；第 5/6 条第二页可达 |
| Q60 | 行操作不冒泡 | ManageUserInTable | 编辑/删除/重置/权限组不改变选中行 |
| Q61 | 操作历史随事实刷新 | ContainerDetailPage | 刷新按钮与动作成功后重取；失败不追加成功历史 |
| Q63 | 新建后状态唯一确定 | CreateImage | 清空关键词、空词重取、选中新项、保留表单 |
| Q64 | 更新后刷新左侧列表 | CreateImage | 更新成功按当前关键词重取；失败保留旧列表并提示 |
| Q66 | 404 使用完整视口 | NotFound | `100vh`/`100dvh`，不再减 64/56px |
| Q69 | 解冻保页且旧刷新不回拉 | ManageMachine | 仅解冻；保当前页/筛选；操作途中切页旧结果不生效 |

## Impact

- 仅涉及 Web 规划文档与后续 Web 测试/页面代码；本阶段不修改源码、主规格、归档或 `review.md`。
- 不新增后端接口、数据库字段、权限模型或持久化状态；不修改 Ctrl 的 `limit` 上限校验，也不修改 Ctrl 侧整数截断策略。
- Q52 的 Ctrl `limit<=200` 与 `offset` 校验由 Ctrl 侧独立变更承接；Web 只使用现有 `limit/offset`，不新增接口。
- Q37 只消费 Ctrl 当前返回的 `error_reason`；若后端原因新增，必须另立变更并补映射，不在本变更创造原因值。
- Q28 会触及较多既有文件，但只做规则/文件批量整理与确认不可达代码删除；Q29 只调整测试启动配置与 CI，不解释为业务修复。
- 验收证据以真实命令、退出码、测试文件/用例数和 `verify.md` 为准，不以任务勾选或文档声明代替。
