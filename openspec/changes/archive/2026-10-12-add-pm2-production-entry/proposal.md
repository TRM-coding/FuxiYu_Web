# Proposal

## Why

Web 缺少 `scripts.start`，PM2 无法通过 `npm start` 启动。构建产物需要常驻服务提供 HTTPS 与同源 `/api` 转发，否则页面虽能打开，登录和业务请求仍无法正常使用。

## What Changes

- 提供 `npm start` 入口，复用成熟静态服务和代理库，在一个进程中提供 `dist`、HTTPS 与 `/api` 转发。
- 从仓库根 `.env` 读取配置，保留已有 shell 变量；明确构建缺失、端口占用、代理失败和超时行为。
- 证书生成支持可选 `WEB_IP`，保留已有证书，运行依赖与构建依赖分开。
- 增加真实 loopback HTTP/TLS 集成测试，补齐 README 的 PM2 完整使用流程。

## Capabilities

### New Capabilities

- `frontend--production-server`: 常驻入口、配置、证书、静态服务与同源 API 转发契约。

### Modified Capabilities

- `frontend--build`: 明确静态构建与常驻入口的职责。

## Impact

涉及启动与证书脚本、npm 依赖、集成测试、README、环境配置示例及对应规格。浏览器继续使用当前站点的 `/api`，登录 Cookie、状态码和后端响应保持原有语义。
