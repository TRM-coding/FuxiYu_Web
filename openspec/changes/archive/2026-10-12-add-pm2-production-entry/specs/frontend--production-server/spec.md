# Spec Delta

## Purpose

定义构建产物的常驻服务契约：单进程入口、配置解析、证书处理、静态资源服务与同源 `/api` 转发。Web 自身即同源 `/api` 反向代理，但 MUST NOT 引入独立反向代理服务，也不额外监听 HTTP 端口。

## ADDED Requirements

### Requirement: 常驻入口与构建职责独立

项目 SHALL 提供 `npm start`，在前台持续运行，并可由 PM2 托管。生产入口 SHALL 读取已生成的 `dist/`，MUST NOT 在启动时构建；缺少 `dist/index.html` 时 SHALL 非零退出并提示先构建。运行期依赖 SHALL 声明在 dependencies，已有证书时 SHALL 支持只安装运行依赖。

#### Scenario: 完成构建后启动

- **WHEN** 构建成功后执行 `npm start`
- **THEN** 进程持续提供静态产物与 API，不启动 Vite 开发或预览服务器

#### Scenario: 没有构建产物

- **WHEN** `dist/index.html` 不存在
- **THEN** 启动失败并明确提示执行 `npm run build`

#### Scenario: 只安装运行依赖

- **WHEN** 已提供完整证书且执行 `npm ci --omit=dev`
- **THEN** `npm start` 无需构建依赖即可运行

### Requirement: 配置以仓库根定位并保留 shell 优先级

入口 SHALL 从自身文件位置定位仓库根、`dist/`、`certs/` 与 `.env`，MUST NOT 依赖调用目录。根 `.env` SHALL 只补充尚未设置的环境变量，缺少文件时 SHALL 使用 shell 和默认配置。网络键名 SHALL 使用 `CTRL_IP`、`CTRL_PORT`、`ENABLE_SSL`；`VITE_ENABLE_SSL` SHALL 保留优先于 `ENABLE_SSL` 的兼容语义。

#### Scenario: shell 优先

- **WHEN** 根 `.env` 配置 CTRL_PORT=5000，而 shell 配置为 6000
- **THEN** 上游使用 6000

#### Scenario: 从其他目录调用

- **WHEN** 从其他目录以绝对路径运行入口
- **THEN** 使用 Web 仓库的配置与产物

### Requirement: 默认配置与非法值

默认 SHALL 监听 `0.0.0.0:5173`，支持 `WEB_HOST`、`WEB_PORT` 覆盖；Ctrl 默认 SHALL 为 `127.0.0.1:5000`。`CTRL_IP` SHALL 只接受裸 IPv4 或 IPv6；端口 SHALL 为 0–65535 整数；布尔配置 SHALL 接受 true/false；代理超时 SHALL 为 1–2147483647 整数毫秒，默认 120000。非法值及端口占用 SHALL 明确失败，MUST NOT 静默改用其他配置。

#### Scenario: 错误地址或超时

- **WHEN** CTRL_IP 带协议、路径或凭据，或超时超过安全整数范围
- **THEN** 启动非零退出并说明合法配置，不回显地址中的凭据

#### Scenario: 端口占用

- **WHEN** Web 端口已被其他进程监听
- **THEN** 以非零退出码失败，MUST NOT 自动更换端口

### Requirement: HTTPS 与证书保留

Web 默认 SHALL 使用 HTTPS（`VITE_ENABLE_SSL` 优先于 `ENABLE_SSL`）；关闭开关时 SHALL 在同一监听端口改用 HTTP。MUST NOT 额外监听独立 HTTP 端口；prestart 未能准备出 TLS 材料，或直接执行启动脚本而证书、私钥缺失时，入口 SHALL 明确失败，MUST NOT 自动降级为 HTTP。HTTPS SHALL 使用仓库 `certs/web.pem` 和 `certs/web-key.pem`。prestart SHALL 检查证书：完整的一对 SHALL 保留；仅有一个文件 SHALL 明确失败且不覆盖；两个都缺失时 SHALL 尝试生成自签证书，缺少生成依赖时 SHALL 提示全量安装或提供证书。

#### Scenario: 完整证书

- **WHEN** 证书和私钥均存在
- **THEN** 保留原文件，不重新生成

#### Scenario: 不完整证书

- **WHEN** 只有证书或私钥
- **THEN** 启动失败并提示备份后补齐，不覆盖现存文件

#### Scenario: TLS 材料缺失不降级

- **WHEN** 直接执行启动脚本而证书或私钥缺失，或 prestart 未能准备出材料
- **THEN** 非零退出并提示生成或提供证书，MUST NOT 改用 HTTP 端口继续服务

### Requirement: 访问地址进入证书 SAN

首次生成证书时 SHALL 保留 localhost、127.0.0.1、::1，并将可选 `WEB_IP` 加入 SAN，IP 按 IP、域名按 DNS。已有证书缺少该地址时 SHALL 保留并提示备份后重新生成或提供匹配证书。实现 MUST NOT 硬编码服务器访问 IP。

#### Scenario: 首次生成

- **WHEN** 设置 WEB_IP=192.168.5.230 且不存在证书
- **THEN** 生成证书的 SAN 包含该 IP

#### Scenario: 地址发生变化

- **WHEN** 已有证书不覆盖新的 WEB_IP
- **THEN** 提示更新方式，原文件不变

### Requirement: TLS 信任与协议说明

README SHALL 区分 HTTP/HTTPS 协议不匹配、证书地址不匹配和证书不受信任。自签证书 SHALL 如实说明需要客户端信任，MUST NOT 声称正确 SAN 使其自动受信任。信任材料 SHALL 只分发公开证书，私钥 SHALL 留在服务端。

#### Scenario: HTTPS 请求连接 HTTP 服务

- **WHEN** HTTPS URL 访问原 HTTP 托管端口而发生协议错误
- **THEN** 文档指引使用项目 HTTPS 常驻入口，不将协议错误当成证书信任错误

### Requirement: 上游协议与局部 TLS 校验

Ctrl 默认协议 SHALL 随 Web 的 HTTPS 开关（`VITE_ENABLE_SSL` 优先于 `ENABLE_SSL`）使用 HTTPS 或 HTTP，支持 `CTRL_SCHEME` 显式覆盖为 http/https。上游证书校验默认 SHALL 关闭以兼容现有自签配置，`CTRL_TLS_VERIFY=true` SHALL 开启校验。实现 MUST NOT 设置全局 NODE_TLS_REJECT_UNAUTHORIZED=0。

#### Scenario: HTTPS 自签上游

- **WHEN** 默认配置连接自签 Ctrl
- **THEN** 局部代理允许连接，其他 TLS 客户端不受影响

#### Scenario: 开启上游校验

- **WHEN** 开启校验而 Ctrl 证书不受信任
- **THEN** 请求返回 502，服务进程继续运行

### Requirement: 精确匹配同源 API

代理 SHALL 仅识别 pathname 等于 `/api` 或以 `/api/` 开头的请求，保留原始路径、查询、方法与请求体。MUST NOT 使用本地文件未命中后的全量转发，也 MUST NOT 为 Node 增加 WebSocket 代理。

#### Scenario: 路径与请求体

- **WHEN** 请求 POST /api/echo?a=1 并发送 JSON
- **THEN** Ctrl 收到原始方法、路径、查询与请求体

#### Scenario: 相似路径

- **WHEN** 请求 /apix、//api 或大小写变体
- **THEN** 不转发给 Ctrl，按静态请求处理

### Requirement: 保留状态码与认证 Cookie

代理 SHALL 保留上游状态码、响应体及响应头（可移除静态服务统一附加的 `Accept-Ranges`），保留请求 Cookie 和响应的多个独立 Set-Cookie，MUST NOT 合并或改写 Cookie，也 MUST NOT 改变原有认证策略。正常使用 SHALL 采用 HTTPS 外层以支持 Secure Cookie。

#### Scenario: 未登录与多个 Cookie

- **WHEN** Ctrl 返回 401 JSON 及两条 Set-Cookie
- **THEN** 浏览器收到同一 401 JSON 和两条完整 Cookie

#### Scenario: 空响应与不存在的接口

- **WHEN** Ctrl 返回 204 或 404
- **THEN** 分别保留无响应体的 204 或原始 404，MUST NOT 返回首页 HTML

### Requirement: 流式转发与请求资源回收

代理 SHALL 边接收边发送上游响应，不整体缓冲。正常结束、失败、超时与客户端断连 SHALL 清理计时器和对应监听器。客户端中途断连 SHALL 中止上游请求，服务 SHALL 继续处理后续请求。

#### Scenario: 分块响应

- **WHEN** 上游写出第一块后延迟再结束
- **THEN** 客户端在上游结束之前收到第一块

#### Scenario: 客户端中断

- **WHEN** 客户端中途关闭长请求
- **THEN** 对应请求资源释放，其他请求正常服务

### Requirement: 有限超时与代理错误

上游连接失败 SHALL 返回 502；达到配置的总代理时限 SHALL 返回 504。错误 SHALL 使用稳定 JSON 标识，不暴露证书路径、Cookie、堆栈或原始上游错误详情。若响应头已发出，入口 SHALL 关闭流，MUST NOT 再写一个矛盾状态码或追加 JSON。

#### Scenario: 尚未响应时超时

- **WHEN** 上游超过时限仍未开始响应
- **THEN** 返回 504 JSON，MUST NOT 无限等待

#### Scenario: 已开始响应后失败

- **WHEN** 上游流中途断开或超时且响应头已发出
- **THEN** 关闭该连接，服务进程保持可用

### Requirement: 静态访问边界与保守缓存

静态服务 SHALL 仅暴露 dist，阻止路径逃逸与点号路径，MUST NOT 返回目录清单。静态响应 SHALL 使用 no-cache/no-store，避免入口和资源长期缓存。缺失文件 SHALL 返回 404，MUST NOT 将缺失脚本回退为 index.html 或转发给 Ctrl；HashRouter 无需通用 SPA 回退。

#### Scenario: 点号文件与路径逃逸

- **WHEN** 请求 /.env、/.git/config 或逃逸 dist 的路径
- **THEN** 不返回对应文件内容

#### Scenario: 缺失脚本

- **WHEN** 请求不存在的 /assets/app-missing.js
- **THEN** 返回 404，MUST NOT 返回入口 HTML

#### Scenario: 缓存与目录

- **WHEN** 请求首页、资源或资源目录
- **THEN** 文件响应不长期缓存，目录不返回文件清单

### Requirement: 日志与常驻流程

启动日志 SHALL 说明监听地址、Ctrl 目标、代理超时和 TLS 状态；请求日志 SHALL 记录方法、无查询的 pathname、状态及耗时，MUST NOT 记录 Cookie、请求体或响应体。README SHALL 提供构建、前台验证、PM2 托管、保存进程列表与实际执行开机配置命令的完整流程。

#### Scenario: PM2 托管

- **WHEN** 前台验证成功后用 PM2 启动 npm start
- **THEN** 同一个进程提供页面、HTTPS 和 API，无需另一个系统代理服务

### Requirement: 更新产物的实际行为

服务 SHALL 按请求时刻读取磁盘上的构建文件。更新流程 SHALL 构建成功后再重启；构建失败 SHALL 不继续重启。README MUST NOT 声称原地构建或覆盖 dist 是原子发布，或保证失败后旧产物完整保留。

#### Scenario: 构建失败

- **WHEN** 更新构建失败
- **THEN** 不执行重启，并先检查产物状态
