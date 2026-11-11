# Proposal

## Why

旧 Apply 创建表单与当前创建契约分叉，业务 403 会误触发全局登出，公告编辑又保留了没有必要的模板关联。按已确认的产品决策统一入口、认证反馈与独立草稿内容。

## What Changes

- 清退旧 Apply 表单，旧地址进入现有创建页，并核对所有界面可达入口。
- 全局认证失效仅由应处理的 401 触发，业务 403 保留身份和其他请求，展示拒绝原因。
- 选模板只填入编辑初值，保存或重开草稿不依赖模板；清空选择不丢弃已编辑内容。
- 模板删除与草稿独立；草稿操作遵循后端创建者隔离。
- 长期容器恢复超限时保留后端原因和具体数量，拒绝响应不显示恢复成功。

## Capabilities

### New Capabilities

- `frontend--authentication`: 跨页面 API 的 401 与 403 处置边界及静默身份探测。

### Modified Capabilities

- `frontend--page-apply`: 清退旧表单并保留旧地址兼容。
- `frontend--page-create-container`: 唯一创建流程与明确的认证、授权错误语义。
- `frontend--page-announcement-editor`: 模板初始化和独立草稿快照。
- `frontend--page-template-manager`: 自定义模板删除不被草稿关联阻塞。
- `frontend--page-announcements`: 私有草稿操作与独立发送内容。
- `frontend--page-deleted-containers`: 长期标记恢复超限的失败反馈。

## Impact

影响路由、旧页面及独占资源、API 包装器、公告编辑与相关组件测试。继续使用现有 HTTPS 生产入口与构建分包，不调整部署方式或认证凭据策略。
