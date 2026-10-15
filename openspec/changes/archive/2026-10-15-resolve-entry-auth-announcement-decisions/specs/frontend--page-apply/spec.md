## MODIFIED Requirements

### Requirement: Apply 页面入口与身份

旧地址 `/index/apply` SHALL 兼容进入 `/index/create`，不再装配独立 Apply 表单。当前创建入口及机器上下文的身份、权限和资源契约 SHALL 由 CreateContainer 统一承载。

#### Scenario: 装配页面
- **WHEN** 用户访问旧 Apply 地址
- **THEN** 进入现有创建页，不加载旧表单或提交缺少 image_id 的旧请求

### Requirement: Apply 主流程

Web SHALL 清退旧 Apply 创建表单，所有可达创建动作 SHALL 使用现有创建流程及其配额校验，MUST NOT 保留第二套 container.image 创建协议。

#### Scenario: 通过旧表单提交创建
- **WHEN** 用户沿历史创建链接进入系统
- **THEN** 由新创建页选择 image_id 并按本次可申请上限提交，旧表单不能再被打开

### Requirement: Apply 构建归属

构建 SHALL 不再包含旧 Apply 页面及独占资源的异步页面 chunk；兼容跳转后的 CreateContainer SHALL 沿用既有路由按需加载与构建策略，共用资源 SHALL 仅在确认无其他消费者时清退。

#### Scenario: 生成生产产物
- **WHEN** 执行 npm run build
- **THEN** 构建成功且没有独立 Apply 表单页面产物，其他页面使用的资源仍可正常加载
