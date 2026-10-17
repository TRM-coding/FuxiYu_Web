# Register

## Purpose

定义学校邮箱验证码申请、注册提交和具体错误反馈。注册失败保留页面与可修正输入，允许在验证码有效期内重试，消费与有效性最终由后端事务和业务规则裁决。

## Requirements

### Requirement: Register 页面入口与身份

页面 SHALL 通过 `/register` 装配。现有身份与权限约束为：匿名入口；学校域、验证码、用户名和口令由 Ctrl 服务最终校验。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `Register` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: Register 主流程

页面 SHALL 申请验证码后提交 username/password/email/graduation_year/registration_code，分别呈现前端校验与后端具体错误。注册失败 SHALL 保持页面与可修正输入，允许在验证码有效期内修正后重试；MUST NOT 因一次注册冲突强制认定验证码已消费。过期或错误验证码仍按后端响应处理。

#### Scenario: 验证码验证失败或注册冲突
- **WHEN** 验证码验证失败或注册冲突
- **THEN** 保持页面并显示具体失败；冲突不消耗有效验证码，用户可修正输入后重试

### Requirement: Register 构建归属

页面 SHALL 通过路由表的按需加载组织参加 Vite 构建：`src/routes/index.jsx` 对页面组件与共同布局（`MainLayout`、`AdminLayout`）使用 `React.lazy` 动态导入，并在 route element 层以既有 `Suspense` 提供页面级加载反馈（仅描述当前实现，不新增加载 UI）；`LoginLayout`、路由骨架与 React 运行时随入口静态加载。`LoginLayout` 内的 `ModelViewer` 亦按需加载，three 相关代码经 `vite.config.js` 的 `manualChunks` 按依赖方向 addons → WebGL → core 分为 `vendor-three-core`、`vendor-three-webgl`、`vendor-three-addons`，均不进入入口 chunk。上述页面与 `ModelViewer` 不再与同路由树代码共同进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`src/utils/requestManager.jsx` 与 `src/utils/validateCmdArg.jsx` 统一为静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属构建验收观测，记入本轮验收报告，不作为本规格固化的历史指标

### Requirement: Register 登录布局与 3D 预览的独立加载

`/register` 的左侧匿名注册表单与右侧 `ModelViewer` SHALL 相互独立加载并允许并行完成，MUST NOT 约定强制先后顺序；`ModelViewer` 未就绪 SHALL NOT 阻塞已可用的注册表单。`ModelViewer` 的动态导入被拒绝或组件渲染抛错时，仅右侧舞台 SHALL 降级为保持原布局尺寸的空占位（`data-testid="model-stage-unavailable"`），MUST NOT 传播到左侧表单或路由；加载中同样只渲染空占位（`data-testid="model-stage-loading"`）。加载中与加载失败两种状态 MUST NOT 新增可见的「3D 预览…」文案，MUST NOT 新增 `role="status"`/`aria-live` 播报。该约束只针对本轮新增的懒加载边界与局部兜底，MUST NOT 解释为禁止或改写 `ModelViewer` 自身既有的 `renderDisabled` 降级文案。匿名访问与既有权限策略保持原状。

#### Scenario: 模型仍未就绪

- **WHEN** 进入 `/register` 时 `ModelViewer` 的动态导入尚未完成
- **THEN** 右侧为无文案、无播报的空占位，左侧匿名注册表单已可交互（输入与提交入口可用），两侧加载无强制先后顺序

#### Scenario: 模型正常就绪

- **WHEN** `ModelViewer` 的动态导入完成
- **THEN** 右侧渲染正常 3D 预览并移除空占位，左侧匿名注册表单保持可用，不出现额外加载或失败文案

#### Scenario: 模型导入被拒绝

- **WHEN** `ModelViewer` 的动态导入被拒绝，或其组件渲染抛错
- **THEN** 仅右侧降级为空占位；`/register` 匿名注册表单保持可用，`/` 登录仍可达，不出现可见失败文案或播报；`ModelViewer` 自身 `renderDisabled` 降级语义不变

## Source references

- [src/pages/Register.jsx](../../../src/pages/Register.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../utils/validateCmdArg`。
- 页面直接依赖：`../api/user_api`。
- 页面直接依赖：`../utils/showErrorModal`。
- [src/test/](../../../src/test/)、[vite.config.js](../../../vite.config.js)：本次既有 21 个测试文件、123 个测试通过；页面测试是否直接覆盖见 Global QUESTIONS。
