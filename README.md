# 伏羲 · Fuxi-Yu

Fuxi-Yu 是面向高校与实验室算力管理场景的容器化平台。Web 是伏羲平台的浏览器前端，提供用户登录注册、容器与镜像自助管理，以及机器、用户、公告、权限和审计日志的管理界面。

当前版本使用 React、React Router 与 Ant Design 构建界面，使用 Vite 开发和打包，使用 Vitest 验证交互。

## 快速上手

### 1. 安装依赖

安装与仓库依赖兼容的 Node.js 和 npm，在仓库根目录执行：

```bash
npm ci
```

`npm ci` 按 `package-lock.json` 安装依赖，便于开发与构建环境保持一致。

### 2. 配置环境

可参考 `.env.example` 创建 `.env`。开发代理常用配置：

```bash
CTRL_IP=127.0.0.1
CTRL_PORT=5000
```

浏览器向当前站点的 `/api` 发起请求，Vite 开发代理将请求转发到 `https://CTRL_IP:CTRL_PORT`。填写裸 IP 与端口即可；这些配置决定代理目标，不会让浏览器直接连接 Node。

### 3. 启动开发服务

```bash
npm run dev
```

默认访问地址：

```text
https://localhost:5173
```

启动前会检查 `certs/web.pem` 与 `certs/web-key.pem`，缺失时生成开发自签证书。已有证书会保留；本地自签证书首次访问时需在浏览器中确认信任。

### 4. 构建与预览

```bash
npm run build
npm run preview
```

构建产物位于 `dist/`，预览地址以终端输出为准。常驻运行使用下面的 PM2 流程；`build` 生成文件后结束，`start` 持续提供这些文件和同源 API。

### 5. 运行检查

```bash
npm test
npm run lint
```

交互开发可使用 `npm run test:watch`。构建、测试与 lint 是独立检查，构建成功不表示其余检查通过。

Node 26 的实验 Web Storage 与当前 jsdom 测试配置存在冲突。若使用该版本，运行测试时关闭实验 Web Storage：

```bash
NODE_OPTIONS=--no-experimental-webstorage npm test
```

PowerShell 对应命令：

```powershell
$env:NODE_OPTIONS = '--no-experimental-webstorage'
npm test
```

## PM2 常驻运行

以下流程只使用本项目的 Node 服务和 PM2，适用于已安装 PM2 的 Linux 机器。Node.js 至少使用 20.19.0，建议采用项目 CI 使用的 Node 22。

### 1. 更新代码与依赖

```bash
cd ~/FuxiYu_Next/FuxiYu_Web
git switch chester-next
git pull --ff-only
npm ci --include=dev
```

若尚无 `.env`，先复制 `.env.example` 为 `.env`，再编辑。保留实际 Ctrl 地址与端口，不要把已有配置直接覆盖为示例值。Web 配置如下：

```dotenv
ENABLE_SSL=true
WEB_IP=192.168.5.230
WEB_PORT=5173
```

同时确认 `CTRL_IP` 与 `CTRL_PORT` 指向实际 Ctrl 服务；这里只填裸 IP 和端口。若旧配置或 shell 中还有 `VITE_ENABLE_SSL`，移除它或设为 `true`，因为兼容键优先于 `ENABLE_SSL`。上游默认 HTTPS，Web 默认兼容上游自签证书，受信任证书环境可设置 `CTRL_TLS_VERIFY=true` 开启上游校验。只有 Ctrl 确实使用 HTTP 时才显式配置 `CTRL_SCHEME=http`。

### 2. 构建

```bash
npm run build
```

`npm start`（以及 PM2 的 `run start`）会先由 `prestart` 自动运行证书脚本：`certs/web.pem` 与 `certs/web-key.pem` 成对缺失时生成自签证书，已有完整一对时保留原文件；常规流程不需要手动执行 `npm run gen-cert`。只有单个文件时启动会明确失败且不覆盖现存文件，需先备份补齐后再启动。自备受信任证书也使用这两个文件名，并应包含实际访问 IP 或域名；私钥留在服务器。

### 3. 先前台验证

```bash
npm start
```

启动日志应显示 HTTPS 监听和正确的 Ctrl 上游地址。在另一个终端执行：

```bash
curl -k -I https://127.0.0.1:5173/
curl -k -i https://127.0.0.1:5173/api/users/me/permissions
```

首页应返回 200；未登录的权限请求应返回 Ctrl 的 401 JSON，不能返回首页 HTML。502 表示 Web 无法连接 Ctrl，504 表示代理超时，需检查上游地址、协议和服务状态。`-k` 仅用于这次自签环境的连通检查。

浏览器使用 **`https://192.168.5.230:5173/`**。确认能登录、刷新页面并查看容器后，在运行 `npm start` 的终端按 Ctrl+C。

如果启动日志提示旧证书缺少当前 `WEB_IP`（或实际访问地址发生变化），这是主动更换证书的场景：先按 Ctrl+C 停掉前台进程，确认它是需要替换的自签证书，再备份并重新生成，然后重新 `npm start`；证书脚本不会自动覆盖已有文件。

```bash
backup_dir="certs/bak/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$backup_dir"
mv certs/web.pem certs/web-key.pem "$backup_dir/"
npm run gen-cert
npm start
```

### 4. 交给 PM2 托管

前台验证通过并按 Ctrl+C 后，删除旧的失败进程或 `pm2 serve` 进程，按顺序执行统一入口：

```bash
pm2 delete FuxiYu
pm2 start npm --name FuxiYu -- run start
pm2 logs FuxiYu --lines 30 --nostream
pm2 list
pm2 save
pm2 startup
```

若之前没有名为 FuxiYu 的进程，删除命令提示不存在可继续。确认状态稳定且重启次数没有持续增长，再保存进程列表。`pm2 save` 保存当前列表；`pm2 startup` 只打印系统启动配置命令，**还需要复制并执行其输出的完整 sudo 命令**，然后再执行 `pm2 save`。以后 PM2 会按保存的列表恢复服务。

### 5. 后续更新

```bash
git pull --ff-only
npm ci --include=dev
npm run build && pm2 restart FuxiYu --update-env
pm2 logs FuxiYu --lines 30 --nostream
```

只有构建成功才重启。原地构建会修改 `dist/`，并非原子发布；失败时应先检查产物，不应假设旧文件完整保留。

`ERR_SSL_PROTOCOL_ERROR` 通常表示 HTTPS 请求连到了 HTTP 服务或错误端口。上述入口默认提供 HTTPS；自签证书产生的“不受信任”或证书地址不匹配提示属于另一类问题，需要客户端信任公开证书及正确的 SAN。自签证书不会自动变成浏览器受信任证书。

## 目录结构

```text
src/api/             # Ctrl API 请求与错误处理
src/pages/           # 页面及页面状态
src/routes/          # 路由装配
src/layouts/         # 用户与管理界面布局
src/components/      # 共用界面组件
src/contexts/        # 身份与权限快照
src/configs/         # API 路径、超时与网络配置
src/utils/           # 容器状态、校验及通用工具
src/assets/          # 图标、模型等静态资源
src/test/            # Vitest 交互测试
scripts/             # 证书、常驻服务与集成测试
openspec/specs/      # 按页面组织的行为契约
vite.config.js       # 开发代理、HTTPS 与测试配置
```

## 开发约定

后端请求统一放在 src/api 中，页面使用 PermissionContext 提供的身份与权限快照。权限菜单、操作入口和 Ctrl 的接口鉴权应采用一致的契约；共享交互与状态判定放在组件或工具中，避免在不同页面维护多套规则。

当前页面行为见 [OpenSpec](openspec/specs/)。跨仓库已知问题统一记录在 [Global QUESTIONS](../FuxiYu_Global/QUESTIONS.md)，旧文档保留在 Global 的 bak 中。
