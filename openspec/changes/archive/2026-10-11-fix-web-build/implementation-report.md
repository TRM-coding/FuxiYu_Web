# Implementation Report — fix-web-build

实施代理（Web 唯一写入者）记录。

**运行边界**：DSH shell 被 Windows 沙箱 ACL 拦住
（`Error: SetNamedSecurityInfoW failed (Win32 5): grantWrite(E:\AI\Fuxi\FuxiYu_Web)`），
按约束不重试 shell、不申请提权，只用文件工具实现；**本代理始终未运行 build / test / lint**。
下文标注「主审实测」的数字来自主代理的 Windows `npm run build` 与测试日志，不是本代理运行结果。

## 当前验收状态（父代理实测；本代理未运行）

### 构建（Windows / Linux，最终）

- **Windows** `npm run build` **exit 0**（3187 modules）：不再出现两条「同一模块既被静态又被动态导入」警告，也**无 >500 kB 包警告**（未调高阈值、未屏蔽）。
- 体积：入口 `index-DnRt454i.js` 24.99 kB（gzip 8.18 kB）；随入口的 `vendor-react` 231.86 kB；`ModelViewer` 4.80 kB；three 分片 `vendor-three-addons` 66.97 kB、`vendor-three-core` 206.40 kB、`vendor-three-webgl` 339.90 kB；其余 chunk <500 kB。
- **入口 24.99 kB 不是首屏下载总量**：首屏还包含随入口的 `vendor-react` 等静态 chunk 与页面异步 chunk；本报告不把 24.99 kB 当作总首屏字节。
- **Linux**（本地 WSL Ubuntu，Node 22.22.3 / npm 10.9.8）：`npm ci` 391 packages / 10s，随后生产构建 **exit 0**，chunk 文件名与体积和 Windows 一致，build 8.01s。`npm ci` 仅原有 `whatwg-encoding` 弃用警告，**不是** Vite 构建警告。
- 日志（均 UTF-16LE）：`FuxiYu_Global/bak/2026-10-11/repair-verification/windows-build-final.log`、`.../linux-build-final.log`。

### 产物依赖图（主审 AST 实测，`chunk-graph-final.log`）

- **115 JS chunks**；无 missing static imports、无 static cycles。
- 入口 `index`（24.99 kB）的 staticClosure **仅入口与 `vendor-react`**，不含 `ModelViewer` / three。
- `ModelViewer` → vendorReact/webgl/addons/core；addons → webgl+core；webgl → core；core/react 无静态导入。
- 以上为产物观测，只记入报告；主 SPEC 保留规范原则，不硬码这些数字。

### 测试与规格校验（全部通过）

- 4 个 build 测试文件共 **13 pass**（announcementAuthSignal 3、routeLoading 7、loginViewerLazy 延迟/完成 2、loginViewerFailure 1）；routeLoading / loginViewerLazy **不再是待跑项**。
- **full Web tests：28 文件 156 测试全部通过（exit 0）**，以 `--maxWorkers=2` 重跑（**仅限制并发，未弱化断言**）；Windows `web-all-final-two-workers.log` 103.03s、Linux `linux-tests-final.log` 60.70s（Global `bak/2026-10-11/repair-verification`）。此前 CreateContainer 的 5s 并发超时属历史记录，已随重跑通过。
- Web 严格规格校验 **26 items / 0 fail**（含新增 `frontend--build` 与 2 个 change；补齐两份页面 delta 后重验，项数不变）。
- `git diff --check` 通过；cached 为空。
- tasks 2.2 / 2.4 已据此勾选。

### 不宣称

- 本代理未运行任何命令（沙箱 ACL `Win32 5`），上述数字均为父代理实测。
- **不声称原始构建失败**：修复前 build 亦 exit 0，只是带 2 条混合导入警告与 2353.06 kB 主包观测。
- **不声称首屏更快**：没有浏览器性能计时（未做 navigation / timing 测量）。
- **没有真实 Docker / 部署端到端**：未做 Docker 构建、容器部署或线上 E2E，也不涉及 SSH。

## 0. 历史迭代记录：主审实测基线（第一轮）

- `npm run build` exit 0；两条混合导入警告消失；主入口包显著变小。
- 唯一 >500 kB chunk：`ModelViewer-BFDQ6jn6.js` 613.72 kB（gzip 161.48 kB）；
  `vendor-react` 231.86 kB；其余 chunk <500 kB。
- 测试：3 文件 8 例 → 3 failed / 5 passed（`loginViewerLazy` 1 fail；`routeLoading` 2 fail；
  `announcementAuthSignal` 全过）。失败表现均为「只停留在加载占位」，无业务代码抛错。

## 1. 变更文件（第三轮修正后）

| 文件 | 变更 | 目的 |
| --- | --- | --- |
| `src/api/announcement_api.jsx` | `abortAll` 并入既有 requestManager 静态导入；401/403 分支去掉 `await import(...)`，改 `try { abortAll('auth') } catch` | 消除混合导入 #1；401/403 语义、事件名、兜底与「抛出前派发信号」时机不变 |
| `src/pages/Apply.jsx` | 导入改 `{ isValidName, anyUnsafe }`（移除未使用的 `isValidImageName`）；改同步 `anyUnsafe`；**注释修正**为「校验函数异常时置 false（未检出风险），与旧 `.catch(() => setAddContainerUnsafe(false))` 一致」 | 消除混合导入 #2；行为不变，注释不再把 false 说成「不安全」 |
| `src/routes/index.jsx` | `MainLayout`/`AdminLayout`/全部业务页 `React.lazy`；`LoginLayout` 保持静态；每个 route element 包局部 `<Suspense>`（fallback 为页面级「页面加载中…」）；注释改为「随入口同步加载的只有 React 运行时（vendor-react）、路由骨架与登录布局」 | 真实拆包；路径、`/admin`→`users`、403 守卫、两个详情页、404 逐条保留；注释与实测口径一致 |
| `src/layouts/LoginLayout.jsx` | `ModelViewer` 懒加载 + 局部类 `ModelStageBoundary`（ErrorBoundary）；**加载中与失败都只渲染保持原布局尺寸的空占位**（`data-testid="model-stage-loading"` / `"model-stage-unavailable"`），无文案、无 role/aria 播报 | chunk 加载失败/渲染异常只在右栏隔离，不传播到左栏表单；**不新增任何可见展示**（第三轮已撤回此前的可见提示） |
| `vite.config.js` | `manualChunks`：`vendor-react`（react/react-dom/react-router(-dom)/scheduler）；**three 按自发布模块边界三分**：`three.core.js` → `vendor-three-core`、`three.module.js` → `vendor-three-webgl`、`examples/jsm/**` → `vendor-three-addons` | 见 §4：613.72 kB 单 chunk 不再单点超阈值；未改阈值、未静默 warning |
| `src/test/routeLoading.test.jsx` | 7 例：`/` 登录、`/register` 匿名注册、`/admin/users` 无权限→403、有 `user:manage`→管理页、容器详情 `:containerId`、机器详情 `:machineId`、404 | 路由含义 + 管理守卫 + 两个详情路径回归；真实 `PermissionProvider` + `user_api` 请求替身 + 页面桩 |
| `src/test/loginViewerLazy.test.jsx` | 2 例：viewer mock 用**永不 settle 的 promise** 观察空占位 + 左侧表单可用；放行 deferred 后观察正常 viewer 且无附加文案 | 确定性覆盖加载中/完成两态；断言不依赖计时 |
| `src/test/loginViewerFailure.test.jsx` | 1 例：mock 工厂抛错使 viewer 动态导入被拒绝，断言右栏为**空占位**（无文案）且登录布局/表单槽位/切换按钮仍可用 | 失败隔离回归（局部 ErrorBoundary），不因撤回文案而丢失隔离断言 |
| `src/test/announcementAuthSignal.test.js` | 3 例：401/403 派发一次 `auth:expired`（`reason:'auth'`）并抛带 `status/route`；200 不派发 | 导入统一所触及的认证信号行为回归 |

## 2. 两条混合导入警告的根因（已由主审构建确认消除）

Rollup 对同一模块"既静态又动态"导入时把它固定在静态 chunk 并输出
`is dynamically imported by ... but also statically imported by ...`。

- `requestManager`：8 个 API 静态导入（其中 6 个已静态导入 `abortAll`），`announcement_api`
  唯独在 401/403 处动态导入取 `abortAll` → 统一静态导入。
- `validateCmdArg`：`Register.jsx` 与 `Apply.jsx` 都静态导入，`Apply.jsx` 又动态导入 `anyUnsafe`
  → 统一静态导入。

全库复核：`grep "import("` 现仅剩 `scripts/gen-cert.mjs`（构建脚本）与新加的 `lazy(() => import(...))`。

## 3. 测试失败原因与修法（第二轮，第 2 项）

**现象**：失败用例都卡在 `Suspense` 占位（`页面加载中…`），viewer 有时已就位；无业务抛错。
**根因不是业务代码**：失败文件里**首次**动态导入页面模块时才触发 Vite 转换 antd 整图，
主线程被转换阻塞数秒（日志中 `5460ms / 4337ms`），而 `findBy*` 默认等待窗口仅 1s；
同一文件里稍后运行、已命中转换缓存的 404 用例 338ms 即通过。即**懒加载就绪与断言等待赛跑**。

**修法（不是 sleep、不是删断言）**：
1. `beforeAll` 里 `await import(...)` 预热页面/布局模块图（把首次 antd 转换移出断言窗口），
   hook 超时显式给 60s；
2. 断言改为 `findBy*(text, undefined, { timeout: 10000 })` 的条件等待，并给对应用例
   `30_000` 的 per-test 超时（否则会被 vitest 默认 5s 抢先掐断）；
3. 用真实 `PermissionProvider` + `vi.mock('../api/user_api')` 请求替身（`getUserPermissions`
   可控 entities），不再依赖「无 Provider 的默认空 context」；
4. 业务页面用桩隔离（`ManageUser`/两个详情页），只断言「路径 → 页/守卫」，详情页桩读
   `useParams` 验证参数解析。

## 4. Three 613.72 kB 单 chunk 的拆分依据（第二轮，第 1 项）

**源码依赖证据**（`node_modules/three@0.181.2`，只读）：
- `package.json` `exports["."] → ./build/three.module.js`；`./examples/jsm/*` 单独导出。
- `build/three.module.js`（18516 行）第 6 行 `import { Matrix3, Vector2, ... } from './three.core.js'`，
  自身是 **WebGL 渲染器**；`build/three.core.js`（58952 行）是核心类，不含渲染器。
- `examples/jsm/loaders/GLTFLoader.js`（4892 行）import 的符号来自 `three`（→ 渲染器/核心）；
  `examples/jsm/libs/meshopt_decoder.module.js` 内嵌 wasm（`wasm_base`/`wasm_simd`）。
- 源码级依赖方向为 **addons → webgl → core**；这只是源码证据，实际 chunk 依赖边由主审以产物核对后报告，不当作已验证事实。

据此按 three 自己的模块边界三分片，三者只在懒加载的 ModelViewer 中引用。
**限制（不夸大）**：`three.core.js` 是**单个模块**，Rollup 不能把单模块再切分；若 tree-shaken 后
该片仍 >500 kB，则只能改用 `three/src/*` 内部路径重写导入（本 change 明确不做）。
新体积以主代理构建为准，本代理未运行构建。

## 5. 实施时的未运行项与残余限制（历史）

- 当时未运行：`npm run build`、`npm test`、`npm run lint`、Linux 构建、包图核对（沙箱 ACL 限制）；Windows / Linux 生产构建与 4 文件回归后由父代理完成，见「当前验收状态」。
- 未提高 `chunkSizeWarningLimit`、未静默插件 warning、未关闭压缩、未屏蔽 log、未升级/删除依赖。
- 懒布局使 `/index`、`/admin` 首次进入多一次 chunk 往返；`/`、`/register` 仍是「骨架即时 +
  单次页面 chunk」。
- 未触碰 401/403 策略、匿名注册可达性、旧 Apply 创建契约、配额/认证业务缺陷。

## 6. 当时拟定的验收命令（已由父代理执行，保留为记录）

```bash
# 1) 生产构建：exit 0；无两条混合导入警告；记录 dist/assets 各 chunk 体积，
#    核对 ModelViewer 原 613.72 kB 已按 vendor-three-core / -webgl / -addons 分散
npm run build
ls -l dist/assets

# 2) 回归（4 文件 13 例：announcementAuthSignal 3、routeLoading 7、loginViewerLazy 2、loginViewerFailure 1）
env:NODE_OPTIONS=--no-experimental-webstorage; npm test

# 3) lint（本次修改文件无新增错误）
npm run lint -- src/routes/index.jsx src/layouts/LoginLayout.jsx src/api/announcement_api.jsx src/pages/Apply.jsx vite.config.js src/test
```

人工核对：`/`、`/register`（匿名可达、401 不推走）、`/admin/*`（无权限 403、有 `user:manage` 进入）、
`/index/containers/:id`、`/index/machines/:id`、任意错误路径 404；viewer chunk 失败时右栏降级而左栏可用。

## 7. tasks.md 勾选（当前：全部已勾）

- 1.1 / 1.2 / 1.3 已勾。
- 2.1（Windows 生产构建）与 2.3（本地 Linux 生产构建）已勾。
- 2.2（full Web tests：28 文件 156 测试全过）与 2.4（主审 diff / 结构校验：`git diff --check` 通过）已勾。
- 3.1–3.4 已勾（最后两份页面主 SPEC 与对应 MODIFIED delta 见 §9）。
- 本 change 剩余未勾项：**0**。

## 8. 第三轮：撤回 viewer 舞台的可见提示（越界的展示扩展）

**为何会改 `src/layouts/LoginLayout.jsx`**：该文件在原任务允许写入清单内；three 必须移出入口包，
所以 `ModelViewer` 改为 `lazy`。这是构建组织调整，不是展示需求。

**为何当初新增可见文案（性质区分）**：
- `3D 预览加载中…` + `role="status"/aria-live`：**我的推断**。依据只是原任务里「加载反馈应合理」
  一句，我把它从页面级扩大套用到了装饰性 viewer 舞台，并自行写了文案与无障碍播报。
- `3D 预览当前不可用`：**复用旧组件文案**。文字与配色来自 `ModelViewer` 自身既有的
  `renderDisabled` 降级分支（`src/components/ModelViewer.jsx` 第 299–317 行），我把它搬进了
  LoginLayout 的 ErrorBoundary。
- 第 1 轮主审只要求「局部错误隔离」（并为失败场景加回归），**没有要求新增任何可见提示**；
  用户也从未要求。判断：这两处属于我自行扩大的可见 UI 变更。

**第三轮撤回的内容**（有界修正）：
- 删除 `3D 预览加载中…` 与 `3D 预览当前不可用` 两段可见文案，以及 `role="status"`/`aria-live`；
- 加载中与失败都改为**保持原布局尺寸的空占位**，仅以
  `data-testid="model-stage-loading"` / `"model-stage-unavailable"` 供测试定位；
- 保留：`ModelViewer` 按需加载、LoginLayout 内的局部 `ModelStageBoundary`（失败隔离仍需要）、
  `console.error` 记录（非可见 UI）。`ModelViewer` 内部 `renderDisabled` 语义与文案**未改动**。
- 未扩展到其它业务；本轮只写 `LoginLayout.jsx`、2 个 viewer 测试、本 change 文档。

**保留但需用户裁决的一点**：页面级 route element 的「页面加载中…」（`src/routes/index.jsx`）
不在本轮写入范围，未改动；它来自原任务「加载反馈应合理」，若也视为越界请另行指示。

**测试同步（不因撤回文案而放宽）**：
- `loginViewerLazy.test.jsx`：viewer mock 返回**永不 settle 的 promise**（确定性，不靠计时）→
  断言 `model-stage-loading` 存在且 `toBeEmptyDOMElement()`、无 viewer、无 `/3D 预览/` 文案、左侧表单可用；
  随后放行同一 deferred → 断言正常 viewer 就位、空占位消失、无附加文案、左侧仍可用。
- `loginViewerFailure.test.jsx`：导入被拒绝后断言 `model-stage-unavailable` **空占位**（无文案）、
  无 `/3D 预览/` 文案、登录布局与表单槽位/切换按钮仍可用——失败隔离断言完整保留。

**构建变化 vs 展示撤回的界线**：本轮**未调整分包策略**——`vite.config.js` 的 `manualChunks`
（`vendor-react` 与 three 三分片）未改动，chunk 边界与数量预期不变；但撤回文案仍会改变产物**内容**，
从而改变文件名 hash 与字节数，故不声称「对构建产物影响为零」，实际产物待主代理构建核对。

## 9. 第四轮起：SPEC 与实现同步（本轮不改实现文件）

- 主 SPEC 22 份页面 capability 的「构建归属」段落改写为当前实现（真实加载组织 + **预期**），
  删除「没有页面级 lazy 拆包」与 2353.06 kB 旧观测；体积与警告清单归验收报告，不写成规格指标
  （见 tasks 3.1）。
- 主 SPEC `frontend--page-login` / `frontend--page-register` 新增「登录布局与 3D 预览的独立加载」：
  左右并行、未就绪不阻塞表单、失败只空占位、不新增可见文案与 aria 播报，并显式保留
  `ModelViewer` 自身 `renderDisabled` 降级语义；含「仍未就绪 / 正常就绪 / 导入被拒绝」三场景；
  匿名访问与既有权限策略照旧（tasks 3.2）。
- 移除 `openspec/changes/fix-web-build/.openspec.yaml` 的 `skip_specs: true`；新增 22 份页面 delta
  （`openspec/changes/fix-web-build/specs/frontend--page-*/spec.md`，login/register 另含 ADDED）
  与 `frontend--build` delta（tasks 3.3）。
- **残留已清零**（tasks 3.4）：`frontend--page-create-container`、`frontend--page-machine-detail-page`
  的「构建归属」已改为同一口径（页面/共同布局 `React.lazy`、`ModelViewer` 按需、three 按实际
  `manualChunks` 进入三个 vendor chunk），并显式链接 `frontend--build`；同时新增两份 MODIFIED delta。
- 分包原则自 `vite.config.js` 注释迁入 `openspec/specs/frontend--build/spec.md` 主 SPEC 与
  `openspec/changes/fix-web-build/specs/frontend--build/spec.md` delta；配置只删注释、`manualChunks`
  逻辑逐字未改，未在代码重写长注释。
- 未改：`procedure--repository-workflow`、其它非页面主规格、任何实现文件。
- 状态说明：**主 SPEC 已同步，但 change 尚未归档**；不要把 OpenSpec archive 的
  「already exists / already applied」提示当作代码未 apply。

**测试状态（全部通过）**：4 个 build 测试文件共 13 例（announcementAuthSignal 3、routeLoading 7、
loginViewerLazy 2、loginViewerFailure 1）已实跑通过，无待跑项；**full Web tests 28 文件 156 测试
全部通过（exit 0）**，`--maxWorkers=2` 仅限制并发、未弱化断言（Windows 103.03s / Linux 60.70s）；
Web 严格校验 26 items / 0 fail（补齐两份页面 delta 后重验，项数不变）；产物 AST 无 missing static
imports / static cycles，入口 staticClosure 仅入口与 vendor-react。本报告不声称首屏更快（**没有
浏览器性能计时**），也不声称原始构建失败；**无真实 Docker / 部署端到端**。