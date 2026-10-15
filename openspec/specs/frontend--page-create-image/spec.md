# CreateImage

## Purpose

定义镜像模板编辑、构建内容、启动命令、可见名单及仅看我创建的筛选行为；方法权限和后端确认的资源通配分别生效。

## Requirements

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

## Source references

- [src/pages/CreateImage.jsx](../../../src/pages/CreateImage.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../utils/showErrorModal`。
- 页面直接依赖：`../contexts/PermissionContext`。
- 页面直接依赖：`../api/image_api`。
- 页面直接依赖：`../api/user_api`。
- [src/test/](../../../src/test/)、[vite.config.js](../../../vite.config.js)：本次既有 21 个测试文件、123 个测试通过；页面测试是否直接覆盖见 Global QUESTIONS。
