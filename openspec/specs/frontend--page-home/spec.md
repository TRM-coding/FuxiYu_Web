# Home

## Purpose

定义当前用户容器卡片、操作成功与受理反馈、过渡态跟踪和静默刷新。身份与资源权限决定操作能力，实际终态由心跳确认，失败保留原列表，刷新覆盖角色和资源限额等业务字段。

## Requirements

### Requirement: Home 页面入口与身份

页面 SHALL 通过 `/index` 装配。现有身份与权限约束为：PermissionContext 提供身份；角色和 containerActions 决定操作入口。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `Home` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: Home 主流程

页面 SHALL 读取容器 brief 并定时静默刷新，以 listRefresh 指纹判断是否更新。操作只有在后端明确确认成功或受理后才改变相应本地状态并提示；HTTP 成功但业务失败 MUST NOT 视为成功。启停重启仍在处理中时 SHALL 使用既有中间态、pending transition 和心跳收敛，不提前展示终态成功。退出关联 SHALL 只在确认成功后移除本地行；异常保留原行及具体错误。删除保留独立确认组件。

#### Scenario: 已受理停止或重启
- **WHEN** 后端确认已受理但尚未完成停止或重启
- **THEN** 显示相应中间态及准确受理反馈，由轮询推进至权威终态，不提前声称已停止或重启完成

#### Scenario: 操作失败
- **WHEN** 停止、重启或退出关联请求失败，包括业务 success=0
- **THEN** 显示具体错误，不额外提示成功，不删除本地行或伪造终态

### Requirement: Home 构建归属

页面 SHALL 通过路由表的按需加载组织参加 Vite 构建：`src/routes/index.jsx` 对页面组件与共同布局（`MainLayout`、`AdminLayout`）使用 `React.lazy` 动态导入，并在 route element 层以既有 `Suspense` 提供页面级加载反馈（仅描述当前实现，不新增加载 UI）；`LoginLayout`、路由骨架与 React 运行时随入口静态加载。`LoginLayout` 内的 `ModelViewer` 亦按需加载，three 相关代码经 `vite.config.js` 的 `manualChunks` 按依赖方向 addons → WebGL → core 分为 `vendor-three-core`、`vendor-three-webgl`、`vendor-three-addons`，均不进入入口 chunk。上述页面与 `ModelViewer` 不再与同路由树代码共同进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`src/utils/requestManager.jsx` 与 `src/utils/validateCmdArg.jsx` 统一为静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属构建验收观测，记入本轮验收报告，不作为本规格固化的历史指标

### Requirement: Home 静默刷新覆盖权限与展示变化

容器刷新指纹 SHALL 覆盖参与卡片展示、限额及操作权限判断的名称、镜像、地址、端口、账号身份与角色、长期配额、磁盘容量与限额、运行和清理冻结状态；不能只依赖采集时间带动刷新。字段结构相同、集合顺序等语义无关变化 SHALL 保持比较稳定。

#### Scenario: 只改变角色或磁盘限额
- **WHEN** 新响应只改变当前用户角色或磁盘限额，其他状态与采集时间不变
- **THEN** 页面仍更新操作入口及展示，不沿用旧权限或旧限额

## Source references

- [src/pages/Home.jsx](../../../src/pages/Home.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../utils/showErrorModal`。
- 页面直接依赖：`../utils/authHelpers`。
- 页面直接依赖：`../api/container_api`。
- 页面直接依赖：`../utils/timeFormat`。
- 页面直接依赖：`../utils/diskLimit`。
- 页面直接依赖：`../utils/containerActions`。
- 页面直接依赖：`../utils/heartbeat`。
- 页面直接依赖：`../utils/listRefresh`。
- 页面直接依赖：`../api/user_api`。
- 页面直接依赖：`../utils/requestManager`。
- 页面直接依赖：`../utils/detailFormat`。
- 页面直接依赖：`../utils/useAutoHideTopBar`。
- 页面直接依赖：`../contexts/PermissionContext`。
- [src/test/](../../../src/test/)、[vite.config.js](../../../vite.config.js)：本次既有 21 个测试文件、123 个测试通过；页面测试是否直接覆盖见 Global QUESTIONS。
