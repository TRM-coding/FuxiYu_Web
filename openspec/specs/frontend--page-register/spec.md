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

### Requirement: Register 删除无效 validateMessages 配置并保留字段规则

注册页 SHALL 删除全局 `validateMessages` 配置及 `<Form validateMessages={...}>` 传参；这些配置被各字段规则显式 `message` 覆盖，不参与实际校验结果。删除后 MUST 保留字段规则原有中文提示，MUST NOT 改变用户名、邮箱、密码等校验条件。

#### Scenario: 非法用户名仍显示字段规则消息

- **GIVEN** 用户提交包含非法字符的用户名
- **WHEN** 表单校验失败
- **THEN** 仍显示字段规则原有的具体中文提示，清理全局配置不改变结果

#### Scenario: 源码不再配置 validateMessages

- **GIVEN** 检查 `src/pages/Register.jsx`
- **WHEN** 搜索 `validateMessages`
- **THEN** 不再存在全局配置或 `Form` 传参，字段规则显式消息仍在

### Requirement: Register 注册与验证码错误按现有协议映射

注册与请求验证码调用 SHALL 把包含 `status`、`error_reason` 的 `err.body || err` 对象、`status` 和 `route` 传给 `showErrorModal`，MUST NOT 只传字符串；映射 SHALL 仅使用 Ctrl 当前已存在的 `error_reason`，MUST NOT 新增后端字段、错误码或接口。具体 route/error_reason 与期望中文见首个场景的映射表。

#### Scenario: 请求验证码域名被拒展示中文

- **GIVEN** `/request_register_code` 返回下表中的原因
- **WHEN** 页面展示错误
- **THEN** 弹窗显示表内中文，不显示后端英文原因

| route | error_reason | 期望中文 |
| --- | --- | --- |
| `/register` | `username_exists` | 用户名已存在 |
| `/register` | `email_exists` | 邮箱已存在 |
| `/register` | `invalid_username` | 用户名仅允许英文、数字和下划线 |
| `/register` | `no_none_ascii` | 禁止非ASCII字符（请勿输入中文） |
| `/register` | `registration_code_required` | 请填写注册验证码 |
| `/register` | `registration_code_invalid` | 注册验证码无效或已过期 |
| `/register` | `mail_send_failed` | 验证邮件发送失败 |
| `/register` | `email_domain_not_allowed` | 该邮箱域名不允许注册 |
| `/request_register_code` | `missing_email` | 请输入邮箱 |
| `/request_register_code` | `email_domain_not_allowed` | 该邮箱域名不允许注册 |
| `/request_register_code` | `mail_send_failed` | 验证邮件发送失败 |
| `/request_register_code` | `code_creation_failed` | 验证码生成失败，请稍后重试 |

#### Scenario: 注册验证码必填或失效展示中文

- **GIVEN** `/register` 返回 `registration_code_required` 或 `registration_code_invalid`
- **WHEN** 页面展示错误
- **THEN** 分别显示“请填写注册验证码”或“注册验证码无效或已过期”，不落到“未收录的错误原因”

#### Scenario: 注册调用点传递结构化对象

- **GIVEN** 注册或请求验证码失败，`err.body` 含 `error_reason`，`err.route` 为实际请求路径
- **WHEN** 调用 `showErrorModal`
- **THEN** 调用参数保留对象、状态与路由，使路由映射可命中，而不是只传 `err.message` 字符串

### Requirement: 注册验证码请求拒绝提示

页面 SHALL 对 `email_exists` 提示邮箱已注册并可登录，对 `rate_limited` 提示发送过于频繁并稍后重试。

#### Scenario: 邮箱已注册

- **WHEN** 验证码接口返回 `email_exists`
- **THEN** 提示该邮箱已注册并引导登录

#### Scenario: 发送冷却

- **WHEN** 验证码接口返回 `rate_limited`
- **THEN** 提示发送过于频繁、稍后重试

### Requirement: 按邮箱展示注册验证码冷却倒计时

页面 SHALL 仅使用发送成功或 `rate_limited` 响应中的 `retry_after_seconds` 建立或更新发起请求邮箱的倒计时；倒计时基于收到响应时的时间和剩余秒数独立计算。该邮箱倒计时未结束时 SHALL 在发送按钮展示剩余时间并禁止再次发送；到期后恢复发送。页面 MUST NOT 自行设定与后端无关的冷却期限，也 MUST NOT 在普通失败、网络错误或超时后推算或启动新倒计时。服务端节流是唯一权威来源。

#### Scenario: 发送成功或触发节流

- **WHEN** 当前邮箱的请求成功，或收到带剩余秒数的 `rate_limited` 响应
- **THEN** 根据响应中的最新剩余时间显示倒计时，未到期时禁用该邮箱的发送按钮，不再主动请求更新时间

#### Scenario: 切换邮箱和迟到响应

- **WHEN** 用户更换邮箱，或原邮箱请求的响应在切换后到达
- **THEN** 倒计时与发起请求的邮箱关联，当前邮箱只显示自身倒计时；切回原邮箱时展示其尚未到期的剩余时间

#### Scenario: 刷新后恢复

- **WHEN** 页面刷新导致本地倒计时丢失，用户再次请求仍处于冷却期的邮箱
- **THEN** 页面根据 `rate_limited` 响应返回的最新剩余秒数重新开始显示

#### Scenario: 其他失败或超时

- **WHEN** 请求失败且原因不是 `rate_limited`，或请求超时、响应丢失
- **THEN** 显示原有错误提示，不凭空开始倒计时；后续请求仍由服务端判断是否处于冷却期

#### Scenario: 浏览器计时延迟

- **WHEN** 浏览器切到后台或定时器被延迟
- **THEN** 再次渲染时依据本地截止时间与当前时间计算剩余时间，不因延迟逐次减一而延长倒计时

## Source references

- [src/pages/Register.jsx](../../../src/pages/Register.jsx)；[src/routes/index.jsx](../../../src/routes/index.jsx)。
- 页面直接依赖：`../utils/validateCmdArg`。
- 页面直接依赖：`../api/user_api`。
- 页面直接依赖：`../utils/showErrorModal`。
- [src/test/](../../../src/test/)、[vite.config.js](../../../vite.config.js)：本次既有 21 个测试文件、123 个测试通过；页面测试是否直接覆盖见 Global QUESTIONS。
