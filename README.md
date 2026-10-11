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

构建产物位于 `dist/`，预览地址以终端输出为准。正式部署时，静态站点需要将同源 `/api` 请求转发给 Ctrl，并保持登录 cookie 的传递。

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
scripts/             # 本地开发证书脚本
openspec/specs/      # 按页面组织的行为契约
vite.config.js       # 开发代理、HTTPS 与测试配置
```

## 开发约定

后端请求统一放在 src/api 中，页面使用 PermissionContext 提供的身份与权限快照。权限菜单、操作入口和 Ctrl 的接口鉴权应采用一致的契约；共享交互与状态判定放在组件或工具中，避免在不同页面维护多套规则。

当前页面行为见 [OpenSpec](openspec/specs/)。跨仓库已知问题统一记录在 [Global QUESTIONS](../FuxiYu_Global/QUESTIONS.md)，旧文档保留在 Global 的 bak 中。
