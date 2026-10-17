# DeletedContainers

## Purpose

定义已删除容器的目录清理、快照恢复、内容来源选择与分页上下文。空页仍提供翻页入口，动作完成使用当前页，只有权威总数证明越界时回退，并避免旧响应覆盖新的浏览位置。

## Requirements

### Requirement: DeletedContainers 页面入口与身份

页面 SHALL 通过 `/admin/deleted-containers` 装配。现有身份与权限约束为：container:manage；记录使用 deleted_id，分页依服务端 total_number。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `DeletedContainers` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: DeletedContainers 主流程

页面 SHALL 保持以下已实现的交互及数据职责：展示 mount 保留/已清理/升级清理；恢复返回 requires_choice 时显示 snapshot/template 两份配方，差异按 sections 分段标注基础镜像/业务片段/启动命令的有无变化并在前端计算逐行差异，选择 content_source 后重调；容器留痕只随该二选一响应公布，页面不单独请求。

#### Scenario: 恢复需要选择来源

- **WHEN** 恢复需要选择来源
- **THEN** 首次响应只提供两份配方，不表示恢复完成；用户选择后提交 snapshot 或 template

#### Scenario: 差异分段与公布落点

- **WHEN** 恢复返回 requires_choice
- **THEN** 变化分布按 sections 的 name 渲染为基础镜像/业务片段/启动命令并标有变化/无变化，逐行差异由 dockerfileDiff 就地计算，页面不再发起单独读取容器留痕的请求

### Requirement: DeletedContainers 构建归属

页面 SHALL 通过路由表的按需加载组织参加 Vite 构建：`src/routes/index.jsx` 对页面组件与共同布局（`MainLayout`、`AdminLayout`）使用 `React.lazy` 动态导入，并在 route element 层以既有 `Suspense` 提供页面级加载反馈（仅描述当前实现，不新增加载 UI）；`LoginLayout`、路由骨架与 React 运行时随入口静态加载。`LoginLayout` 内的 `ModelViewer` 亦按需加载，three 相关代码经 `vite.config.js` 的 `manualChunks` 按依赖方向 addons → WebGL → core 分为 `vendor-three-core`、`vendor-three-webgl`、`vendor-three-addons`，均不进入入口 chunk。上述页面与 `ModelViewer` 不再与同路由树代码共同进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`src/utils/requestManager.jsx` 与 `src/utils/validateCmdArg.jsx` 统一为静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属构建验收观测，记入本轮验收报告，不作为本规格固化的历史指标

### Requirement: 长期恢复超限保留明确失败反馈

恢复接口因长期容器数量限制拒绝时，页面 SHALL 保留后端 error_reason、message 中的当前数量与上限并显示可理解的中文提示，MUST NOT 显示恢复成功或移除失败记录。用户释放配额后 SHALL 能使用原恢复记录重试。

#### Scenario: 数量达到上限
- **WHEN** 恢复返回 long_term_limit_reached 并说明已用数量和上限
- **THEN** 显示长期容器数量超限及具体数量，不泛化为未知错误，也不提示恢复请求已发送

### Requirement: 已删除容器保留分页与当前操作上下文

已删除容器页 SHALL 在 records 为空时仍保留表格与分页入口。动作确认成功后 SHALL 按操作完成时当前页及页大小刷新；只有权威总数表明页码越界时才退至有效页，MUST NOT 无条件回到第一页。异步回调 SHALL 使用当前分页参数，清退捕获旧页的冗余回调；迟到响应 MUST NOT 覆盖新页，加载和自动回退不能形成重复请求循环。

#### Scenario: 空页仍可翻页
- **WHEN** 当前页返回空列表，但总数仍有其他有效页
- **THEN** 保留分页入口，可访问有效页；确认越界后才按最新总页数回退

#### Scenario: 操作期间切换分页
- **WHEN** 在第二页发起清理或恢复，动作完成前切换到另一页
- **THEN** 动作完成后刷新当前页，不调用已捕获的旧页回调，旧响应不覆盖当前页

#### Scenario: 最后一页减少
- **WHEN** 动作完成后权威总数减少，原页码超过最新末页
- **THEN** 回到最新有效末页并有限次重取数据，未越界时保留原页，不强制跳首页

## Source references

- [src/pages/DeletedContainers.jsx](../../../src/pages/DeletedContainers.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../utils/detailFormat`。
- 页面直接依赖：`../api/container_api`。
- 页面直接依赖：`../contexts/PermissionContext`。
- 页面直接依赖：`../utils/authHelpers`。
- 页面直接依赖：`../utils/dockerfileDiff`。
- 页面直接依赖：`../utils/showErrorModal`。
- 回归验证：[src/test/](../../../src/test/)；实际范围和结果以当前组件及生产入口测试为准。
