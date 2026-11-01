# frontend--production-server Test Plan

Spec: [spec.md](spec.md)

## Current Mapping

### Requirement: 常驻入口与构建职责独立

#### Scenario: 完成构建后启动

- Test/check:
  - [X] scripts/tests/production-entry-cli.integration.mjs::npm start（含 prestart + scripts.start 装配）真实冒烟
  - [X] scripts/tests/production-entry-cli.integration.mjs::正常启动后服务静态与 /api，SIGINT 可退出
- Assertion scope: 构建产物存在时，真实 `npm start` 提供静态页与 `/api`，不启动 Vite dev/preview；SIGINT 后进程退出。冒烟测试仅在 `dist/index.html` 存在时执行。
- Coverage note: 测试不覆盖 PM2；也不断言启动时“没有调用 build”，只断言读取既有产物并提供服务。

#### Scenario: 没有构建产物

- Test/check:
  - [X] scripts/tests/production-entry-cli.integration.mjs::缺少 dist/index.html 时启动失败退出
- Assertion scope: 临时 fixture 删除 `dist/index.html` 后启动，进程退出码 1，stderr 明确提示执行 `npm run build`，不进入服务状态。
- Coverage note: 未额外断言没有监听端口；进程在 listen 前失败并退出。

#### Scenario: 只安装运行依赖

- Test/check:
  - [ ] npm ci --omit=dev
- Assertion scope: 仅在临时副本执行该命令并保留完整证书与 `dist/`，再执行 `npm start`；断言临时副本只装 `dependencies` 后，生产入口仍能读取证书与构建产物并提供静态/API。`selfsigned` 属 devDependency，只在缺证书生成时需要，已有完整证书时不应成为启动前置；检查不修改当前仓库的 `node_modules` 或 lockfile。
- Coverage note: 本规划阶段没有执行生产依赖安装；`npm ci --omit=dev` 需要 npm registry/网络，本轮“不发外站请求”的边界下不能执行，保持 `[ ]`，不能由现有 dev 依赖环境冒充或当作已确认运行证据。该检查需网络与临时副本。

### Requirement: 配置以仓库根定位并保留 shell 优先级

#### Scenario: shell 优先

- Test/check:
  - [X] scripts/tests/production-entry.integration.mjs::loadWebEnv 读取 root .env 且 shell 环境变量优先
  - [X] scripts/tests/production-entry.integration.mjs::resolveConfig 默认值、写死路径与非法值
- Assertion scope: 临时 root 的 `.env` 写入 `FUXI_FIXTURE_FROM_FILE=file`、`CTRL_PORT=1`；shell 已有 `FUXI_FIXTURE_FROM_FILE=shell` 时保持 shell 值，未设置的 `CTRL_PORT` 从文件补入；不存在的 `.env` 返回 `loaded:false` 且不报错。`resolveConfig` 另断言 `VITE_ENABLE_SSL` 优先于 `ENABLE_SSL`。
- Coverage note: 测试在进程内调用真实 `loadWebEnv` 与 `resolveConfig`，没有启动完整入口；shell 优先、文件补全与兼容键优先级已直接断言。

#### Scenario: 从其他目录调用

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_start_from_foreign_cwd
- Assertion scope: 新测试从临时 cwd 以绝对路径 spawn `scripts/tests/support/run-cli.mjs`（调用与 `npm start` 相同的 `main()`，壳固定 `readEnvFile:false`），通过 `FUXI_START_TEST_JSON` 省略 `root` 字段（payload.root 为 undefined），让 `main` 使用默认 `PROJECT_ROOT`；仅传 `ENABLE_SSL=false`、临时端口等安全环境。断言 `PROJECT_ROOT` 由文件位置推出为仓库根，请求仓库 `dist` 首页与 `/api` 成功。该路径不读取仓库 `.env`，`ENABLE_SSL=false` 不需要证书。
- Coverage note: 只有外部 cwd/CLI 行为使用 spawn；日志、readDist、代理失败/abort/stream 使用 `main`/`startEntry` 真实模块和临时 root，证书类测试使用 `ensureCert` 临时 root。该测试不启动 PM2、不访问生产。

### Requirement: 默认配置与非法值

#### Scenario: 错误地址或超时

- Test/check:
  - [X] scripts/tests/production-entry.integration.mjs::resolveConfig 默认值、写死路径与非法值
  - [X] scripts/tests/production-entry.integration.mjs::CTRL_IP 只接受裸 IP，且报错不回显原值
  - [X] scripts/tests/production-entry-cli.integration.mjs::非法 WEB_PORT 启动失败退出
- Assertion scope: 默认监听 `0.0.0.0:5173`、Ctrl `127.0.0.1:5000`、默认超时 120000；`WEB_HOST`/`WEB_PORT` 可覆盖；布尔只接受 true/false；端口 0–65535；超时 1–2147483647；`CTRL_IP` 只接受裸 IPv4/IPv6，带协议、路径、凭据或非法超时抛 `ConfigError`，错误不回显原值。CLI 非法 `WEB_PORT=abc` 退出 1 并提示 0-65535。
- Coverage note: 端口占用另由下一 Scenario 覆盖；测试不静默回退到默认端口。

#### Scenario: 端口占用

- Test/check:
  - [X] scripts/tests/production-entry-cli.integration.mjs::端口被占用时立即失败退出
- Assertion scope: 先用真实 HTTP server 占住端口，再以同一端口启动入口；进程退出 1，stderr 含「已被占用」，不自动改用其它端口。
- Coverage note: 不额外断言启动重试次数；失败即退出。

### Requirement: HTTPS 与证书保留

#### Scenario: 完整证书

- Test/check:
  - [X] scripts/tests/production-entry.integration.mjs::gen-cert 缺则建、成对跳过、单个失败、WEB_IP 进 SAN
  - [X] scripts/tests/production-entry-cli.integration.mjs::npm start（含 prestart + scripts.start 装配）真实冒烟
- Assertion scope: 完整一对证书已存在时 `ensureCert` 返回 `created:false` 且证书字节不变；`npm start` 冒烟断言 prestart 执行了 gen-cert 日志，说明常规启动会先走保留/生成流程。证书不被覆盖由 gen-cert 测试直接断言，冒烟测试不单独比较字节。
- Coverage note: 默认 HTTPS 与关闭开关后同端口 HTTP 由 loopback/冒烟测试分别覆盖，不额外监听独立 HTTP 端口。

#### Scenario: 不完整证书

- Test/check:
  - [X] scripts/tests/production-entry.integration.mjs::gen-cert 缺则建、成对跳过、单个失败、WEB_IP 进 SAN
  - [X] scripts/tests/production-entry-cli.integration.mjs::只存在一半证书时启动失败退出
- Assertion scope: 仅剩证书或私钥时 `ensureCert` 抛 `CertError` 且提示「不成对」，现存证书字节不变；CLI 启动退出 1，stderr 点名缺失的 `web-key.pem`，不覆盖现存文件。
- Coverage note: 完整提示文案中的备份/补齐步骤由错误消息承载，测试只断言关键失败原因与不覆盖。

#### Scenario: TLS 材料缺失不降级

- Test/check:
  - [X] scripts/tests/production-entry-cli.integration.mjs::缺少证书时启动失败退出
  - [X] scripts/tests/production-entry-cli.integration.mjs::只存在一半证书时启动失败退出
- Assertion scope: `ENABLE_SSL=true` 且证书/私钥缺失或不成对时，进程在监听前退出 1 并提示 gen-cert/证书，没有进入 HTTP 服务状态。
- Coverage note: 关闭 SSL 时同端口 HTTP 由 `npm start` 冒烟（`ENABLE_SSL=false`）覆盖；默认 HTTPS 由 loopback 集成覆盖。`selfsigned` 生成依赖缺失时的「全量安装或自备证书」提示未由现有测试触发；该路径需在只装运行依赖且证书缺失的隔离环境人工确认，不能由现有 dev 依赖环境冒充。

### Requirement: 访问地址进入证书 SAN

#### Scenario: 首次生成

- Test/check:
  - [X] scripts/tests/production-entry.integration.mjs::gen-cert 缺则建、成对跳过、单个失败、WEB_IP 进 SAN
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_cert_san_lifecycle
- Assertion scope: 既有测试在临时 root 生成证书，断言 `WEB_IP=192.168.5.230` 进入 SAN 且日志包含该地址；新测试另断言 SAN 同时保留 localhost、127.0.0.1、::1，域名按 DNS、IP 按 IP，不硬编码其它服务器地址。
- Coverage note: 既有测试只断言 WEB_IP 条目，未逐项断言 loopback；新测试补该缺口。

#### Scenario: 地址发生变化

- Test/check:
  - [X] scripts/tests/production-entry.integration.mjs::gen-cert 缺则建、成对跳过、单个失败、WEB_IP 进 SAN
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_cert_san_lifecycle
- Assertion scope: 已有证书不覆盖新的 `WEB_IP` 时，`ensureCert` 返回 `created:false`、`webIpCovered:false`，原证书字节不变，日志提示保留原证书并提供备份/重新生成/自备证书的路径；新测试对提示关键词与文件不变做断言。
- Coverage note: 既有测试只匹配「保留原证书」；完整更新指引由新测试补，避免把提示文案当成已由现有断言覆盖。

### Requirement: TLS 信任与协议说明

#### Scenario: HTTPS 请求连接 HTTP 服务

- Test/check:
  - [X] Select-String -Path README.md -Pattern 'ERR_SSL_PROTOCOL_ERROR|不受信任|SAN|私钥留在服务器'
- Assertion scope: 人工审阅 README 命中段落：把 HTTPS 连到 HTTP 服务的协议错误与证书地址不匹配、证书不受信任分开说明；自签证书需客户端信任，正确 SAN 不会自动受信任；只分发公开证书，私钥留在服务端。
- Coverage note: 这是文档契约，没有可执行浏览器/TLS 对象；不制造只匹配文案的测试文件，也不声称已做真实浏览器信任实验。

### Requirement: 上游协议与局部 TLS 校验

#### Scenario: HTTPS 自签上游

- Test/check:
  - [X] scripts/tests/production-entry.integration.mjs::生产入口 loopback 集成：静态、代理、边界与错误 > GET /api 透传 401 JSON、多个 Set-Cookie 与响应头
  - [X] scripts/tests/production-entry.integration.mjs::resolveConfig 默认值、写死路径与非法值
- Assertion scope: `resolveConfig` 默认 `ctrl.verifyTls:false`，`CTRL_TLS_VERIFY=true` 时开启；loopback 集成用自签 HTTPS mock Ctrl 走真实代理，请求拿到 401 JSON、两个 Set-Cookie 与上游响应头，说明局部代理在默认配置下可连接自签上游。测试不设置全局 `NODE_TLS_REJECT_UNAUTHORIZED=0`。
- Coverage note: 没有单独启动另一个 TLS 客户端证明“其他客户端不受影响”；实现未改全局 TLS 环境，测试以默认局部 `secure:false` 为界。

#### Scenario: 开启上游校验

- Test/check:
  - [X] scripts/tests/production-entry.integration.mjs::上游 TLS 校验失败返回 502 且不泄漏证书路径或堆栈
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_proxy_failure_keeps_service_and_stream_close
- Assertion scope: 自签 Ctrl + `CTRL_TLS_VERIFY=true` 时返回 502 JSON `upstream_tls_untrusted`，响应体不含 `.pem`、certs、BEGIN 或 Node 堆栈；新测试用 `startEntry` 夹具（temp root、临时证书/端口）在同一进程上再发一个静态请求，断言服务仍可用。
- Coverage note: 既有测试只断言失败响应与不泄漏，未断言后续请求；服务继续运行由新测试补。

### Requirement: 精确匹配同源 API

#### Scenario: 路径与请求体

- Test/check:
  - [X] scripts/tests/production-entry.integration.mjs::生产入口 loopback 集成：静态、代理、边界与错误 > POST 保留方法、路径、query、请求体、Cookie
- Assertion scope: `POST /api/echo?a=1&b=2` 带 JSON 与 Cookie，Ctrl 收到原始 method、url（含 query）、JSON body 与 Cookie，响应 200；未被静态层改写。
- Coverage note: 未为 WebSocket 代理单独建测；实现没有 WebSocket 代理路径，本场景只覆盖 HTTP。

#### Scenario: 相似路径

- Test/check:
  - [X] scripts/tests/production-entry.integration.mjs::isApiPath 只认 /api 与 /api/ 族
  - [X] scripts/tests/production-entry.integration.mjs::生产入口 loopback 集成：静态、代理、边界与错误 > /apix 不转发给 Ctrl，也不是 200 入口页
- Assertion scope: `isApiPath` 对 `/api`、`/api/`、`/api/...`、`/api?...` 为 true；对 `/apix`、`//api/x`、`/API/x`、`/api2/x`、空值、静态资源为 false；loopback 请求 `/apix/anything` 不增加 Ctrl seen、不是 200 入口页。
- Coverage note: `//api` 与大小写变体在单元层断言，未逐条走 loopback；同一 `isApiPath` 是入口分支的唯一判据。

### Requirement: 保留状态码与认证 Cookie

#### Scenario: 未登录与多个 Cookie

- Test/check:
  - [X] scripts/tests/production-entry.integration.mjs::生产入口 loopback 集成：静态、代理、边界与错误 > GET /api 透传 401 JSON、多个 Set-Cookie 与响应头
- Assertion scope: 上游 401 JSON、两个独立 `Set-Cookie`、`x-ctrl-trace` 保留；静态层附加的 `Accept-Ranges` 被移除，`x-powered-by` 不出现；请求路径原样到达 Ctrl。
- Coverage note: Cookie 合并/改写在响应头层断言为两条独立项；认证策略由 Ctrl 返回的 401 保持，Web 不重解释。HTTPS 外层由 loopback HTTPS 测试覆盖；`Secure` 属性由 Ctrl 下发并由浏览器处理，Web 不改写，故不在本测试中单独断言。

#### Scenario: 空响应与不存在的接口

- Test/check:
  - [X] scripts/tests/production-entry.integration.mjs::生产入口 loopback 集成：静态、代理、边界与错误 > 204 无响应体
  - [X] scripts/tests/production-entry.integration.mjs::生产入口 loopback 集成：静态、代理、边界与错误 > 上游 404 JSON 透传而不是入口页
- Assertion scope: 上游 204 返回 204 且 body 为空；上游 404 JSON 返回 404 与原始 JSON，body 不含 fixture 入口页标记，不回落首页。
- Coverage note: 未逐字节比较所有响应头；状态码、JSON body 与“不回落 HTML”已直接断言。

### Requirement: 流式转发与请求资源回收

#### Scenario: 分块响应

- Test/check:
  - [X] scripts/tests/production-entry.integration.mjs::生产入口 loopback 集成：静态、代理、边界与错误 > 响应分块流式转发（不整体缓冲）
- Assertion scope: 客户端在 mock Ctrl 释放第二块之前就收到 `first-chunk`，随后收到 `second-chunk`；证明代理边收边发，不整体缓冲。
- Coverage note: 未测量内存峰值；时序证据足以区分流式与整体缓冲。

#### Scenario: 客户端中断

- Test/check:
  - [X] scripts/tests/production-entry.integration.mjs::生产入口 loopback 集成：静态、代理、边界与错误 > 客户端中断后进程仍可服务
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_client_abort_releases_upstream
- Assertion scope: 既有测试在 100ms 后销毁 `/api/slow` 请求，再请求 `/` 得到 200，证明进程可继续服务；新测试用 `startEntry` 夹具（temp root、临时端口）和 mock Ctrl 记录上游请求的 close/aborted，断言客户端中止后上游请求被终止，且后续请求仍成功。
- Coverage note: 既有测试没有断言上游中止或计时器/监听器归零；新测试补资源释放。失败/超时路径的监听器清理仍只由正常结束测试和代码路径间接覆盖。

### Requirement: 有限超时与代理错误

#### Scenario: 尚未响应时超时

- Test/check:
  - [X] scripts/tests/production-entry.integration.mjs::上游超时返回 504 且不挂死
- Assertion scope: mock Ctrl 延迟 1500ms、代理超时 300ms 时，客户端收到 504 JSON `{error:'upstream_timeout'}`，耗时小于 1400ms，不无限等待。
- Coverage note: 只断言总时限与响应，不固定计时器的内部实现。

#### Scenario: 已开始响应后失败

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_proxy_failure_keeps_service_and_stream_close
- Assertion scope: 新测试用 `startEntry` 夹具（temp root、临时端口）和 mock Ctrl 先写出 200 响应头和第一块，再销毁上游连接；客户端观察到连接关闭，不收到第二个矛盾状态码或追加 JSON；随后静态请求仍返回 200，进程可用。
- Coverage note: 既有 502 测试只覆盖响应头发出前失败；本场景需要新测试，不能用同一测试名冒充。

### Requirement: 静态访问边界与保守缓存

#### Scenario: 点号文件与路径逃逸

- Test/check:
  - [X] scripts/tests/production-entry.integration.mjs::hasDotSegment 拦住点号与编码点号路径
  - [X] scripts/tests/production-entry.integration.mjs::生产入口 loopback 集成：静态、代理、边界与错误 > 路径逃逸被阻断
  - [X] scripts/tests/production-entry.integration.mjs::生产入口 loopback 集成：静态、代理、边界与错误 > 点号路径不泄漏内容
- Assertion scope: `hasDotSegment` 识别 `/.env`、`/.git/config`、编码点号、`..` 等；loopback 对 `/../package.json` 返回 >=400 且不泄漏包名，对 `/.env`、`/%2Eenv`、`/assets/../.env` 不泄漏 fixture secret。
- Coverage note: 只断言不返回内容；未穷举所有编码变体，点号检测的单元用例覆盖主要编码形式。

#### Scenario: 缺失脚本

- Test/check:
  - [X] scripts/tests/production-entry.integration.mjs::生产入口 loopback 集成：静态、代理、边界与错误 > 缺失 .js 返回 404 非 HTML
- Assertion scope: `/assets/app-missing.js` 返回 404，body 不含入口页标记，content-type 不是 HTML；不回退 index.html，也不转发 Ctrl。
- Coverage note: 只测一个缺失脚本路径；静态层对任意缺失文件的 404 行为由该实现路径覆盖。

#### Scenario: 缓存与目录

- Test/check:
  - [X] scripts/tests/production-entry.integration.mjs::生产入口 loopback 集成：静态、代理、边界与错误 > 目录请求不列出清单
  - [X] scripts/tests/production-entry.integration.mjs::生产入口 loopback 集成：静态、代理、边界与错误 > 入口页与静态资源全部禁缓存
  - [X] scripts/tests/production-entry.integration.mjs::生产入口 loopback 集成：静态、代理、边界与错误 > HEAD 静态可用且无 body
- Assertion scope: `/assets/` 请求 >=400 且 body 不含文件清单；首页与 hashed 资源都带 `no-cache, no-store, must-revalidate`；HEAD 首页 200 且 body 为空。未长期缓存。
- Coverage note: “只暴露 dist”由路径逃逸与 dotfile 测试共同体现，未单独枚举 dist 外目录。

### Requirement: 日志与常驻流程

#### Scenario: PM2 托管

- Test/check:
  - [X] scripts/tests/production-entry-cli.integration.mjs::npm start（含 prestart + scripts.start 装配）真实冒烟
  - [X] scripts/tests/production-entry-cli.integration.mjs::正常启动后服务静态与 /api，SIGINT 可退出
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_startup_and_request_logs
  - [ ] Select-String -Path README.md -Pattern 'pm2 start npm|pm2 save|pm2 startup|同一个进程'
- Assertion scope: 真实 `npm start` 冒烟在 HTTP 下验证单进程页面与 API；另一既有 CLI 测试通过调用同一 `main` 的 `run-cli` 验证 HTTPS 页面与 API，无需另一个系统代理；新测试用 `main({ root: tempRoot, readEnvFile: false, log })` 启动真实模块，向临时本地端口发送含 `%0d%0a`/控制字符的路径、带 Cookie 与 `Authorization` 的请求，以及含 `password` 字段的 JSON 请求体，捕获启动与请求日志。断言启动行含监听地址、Ctrl 目标、代理超时和 TLS 状态；请求行含方法、无查询 pathname、状态与耗时；每条日志除末尾终止换行外不含 CR/LF/控制字符，也不含 Cookie、Authorization、password/请求体或响应体内容。README 人工审阅 PM2 启动、日志、保存列表、`pm2 startup` 后执行 sudo 命令的完整流程。PM2 本身不在本地运行。
- Coverage note: 受“不 PM2、不生产 SSH”约束，PM2 的实际进程托管未执行；现有测试只证明同一 Node 进程内的单入口服务契约。日志测试使用临时 root 与 `readEnvFile:false`，不读取仓库 `.env` 或真实凭据。

### Requirement: 更新产物的实际行为

#### Scenario: 构建失败

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_serves_updated_dist_per_request
  - [ ] Select-String -Path README.md -Pattern '只有构建成功才重启|并非原子发布|失败时应先检查产物'
- Assertion scope: 新测试用 `main({ root: tempRoot, readEnvFile: false })` 或既有 `startEntry` 夹具启动真实入口模块（不是 spawn 真 CLI），在服务运行中修改临时 `dist` 文件，下一次请求读到新内容，证明按请求时刻读盘；README 人工审阅确认更新流程要求构建成功后再重启，且不声称原地构建/覆盖 dist 是原子发布或保证旧产物完整。构建失败不重启是流程判断，不通过破坏真实构建来伪造。
- Coverage note: “构建失败”本身没有安全的自动化对象；不修改应用或配置来制造失败。按请求读盘由新测试覆盖，重启决策由 README 流程审阅覆盖。测试使用临时 root，不覆盖或依赖仓库 `dist`。
