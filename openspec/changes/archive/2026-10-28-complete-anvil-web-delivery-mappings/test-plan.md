# Test Plan

<!-- Mapping only. 本文是 Scenario→Test/check 对账计划，不是执行结果台账：
     不保存执行状态或统计。`[X]` 只表示所引用的既有测试或检查存在，
     且其断言已从测试代码或可复现命令确认；`[ ]` 表示测试、映射或人工检查尚待 apply/评审确认。 -->

计划中的独立测试文件以 `node --test scripts/tests/anvil-delivery.checks.mjs` 手动执行；使用 `.checks.mjs` 而不是 `.test.mjs`/`.integration.mjs`，避免 Vitest 默认收集和 `test:server` 收集。**不接入 `npm test`、`test:server` 或 CI，不作为 CI 门禁**。文件已存在并可通过上述命令独立执行；本 plan 只记录映射与断言范围，不复制运行结果。现有可复用测试（如 `scripts/tests/commit-message.integration.mjs`）按 `[X]` 记录，不重复规划新测试。

## frontend--build

### Requirement: 构建告警与压缩保持默认

#### Scenario: 出现超阈值 chunk

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_build_warning_policy
- Assertion scope: 该测试用仓库 `vite.config.js` 解析出的 build 配置运行一次含合成超大模块的真实构建，使用 `build.write:false` 或临时 `outDir`，不覆盖仓库 `dist`；捕获 Vite/Rollup 的体积警告，断言 `chunkSizeWarningLimit` 仍为默认 500 kB、警告包含实际 chunk 体积且未被静默；不把当前产物体积或警告清单写成固定指标。
- Coverage note: 既有测试没有覆盖告警输出；当前生产产物中是否存在超阈值 chunk 只作为验收观测，不作为本规格的固定断言；验收报告记录由执行阶段完成，本 plan 不保存数值。

#### Scenario: 以调阈值规避警告

- Test/check:
  - [X] git diff HEAD -- vite.config.js
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_build_warning_policy
- Assertion scope: 审查 `vite.config.js` 的 diff：任何上调 `chunkSizeWarningLimit`、关闭 `minify`、使用 `logLevel: 'silent'`、插件屏蔽体积告警或为消除警告而移除功能的改动都判失败；测试同时断言 resolved build 配置仍为默认阈值和压缩，不以「构建输出干净」作为完成证据。
- Coverage note: 「提议被拒绝」是评审动作，没有单一运行时对象；这里用 diff 审查加配置不变量守住，不用伪造的拒绝测试。

### Requirement: 同一模块只采用一种导入方式

#### Scenario: 混合导入被检出

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_build_import_warnings
- Assertion scope: 在临时 Vite 工程中让同一模块同时被静态导入与动态 `import()`，执行真实 Rollup 构建并捕获 `dynamically imported ... but also statically imported` 警告；断言该警告真实出现，测试不把屏蔽日志当作通过，修复方式仍由评审确认。
- Coverage note: 该 Scenario 是条件分支，只有混用出现时才触发；临时工程用于真实复现 Rollup 警告，不替代本仓库两处模块的现状断言。

#### Scenario: 统一后的生产构建

- Test/check:
  - [X] npm run build
  - [X] src/test/apiAuthSignal.test.js::API 包装器 401/403 语义分离（Q04） > describe.each(WRAPPERS: user_api/container_api/machine_api/image_api/rbac_api/settings_api/announcement_api/operation_log_api) > 401：发一次 auth:expired（全局失效策略保持），并中断在途请求
  - [X] src/test/apiAuthSignal.test.js::API 包装器 401/403 语义分离（Q04） > describe.each(WRAPPERS: user_api/container_api/machine_api/image_api/rbac_api/settings_api/announcement_api/operation_log_api) > 403：一般拒绝，不发认证信号、不清身份、不动其它在途请求，且原样保留响应体
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_build_import_warnings
- Assertion scope: `npm run build` 退出 0 并完成真实产物构建；新测试用 `build.write:false` 或临时 `outDir` 捕获构建 warnings，断言 `requestManager` 与 `validateCmdArg` 不再出现混合静态/动态导入警告，并从 Rollup module info 断言两模块由静态 importer 引用、不在动态导入集合中。认证回归是 401/403 两组测试体 × 8 个 wrapper（user_api/container_api/machine_api/image_api/rbac_api/settings_api/announcement_api/operation_log_api），断言 401 全局失效信号与 403 一般拒绝的响应体、身份与在途请求语义保持；它们证明当前错误传播/认证处置契约，不把构建成功当作业务语义证明。
- Coverage note: 401/403 两组测试体 × 8 个 wrapper 不比较统一导入前后的差异，只锁定现有契约；本 change 不修改 `requestManager`/`validateCmdArg` 或认证模块。其它体积或插件警告不使本场景失败；本场景只断言这两条混合导入警告不再出现，也不把其它合理的普通动态 `import()` 判失败。

### Requirement: 页面与共同布局按需加载且路由不变

#### Scenario: 异步 chunk 尚未就绪

- Test/check:
  - [X] src/test/routeLoading.test.jsx::"/" 匿名进入登录页：布局骨架先就位，登录表单懒加载后出现且不被 401 推走
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_route_suspense_fallback
- Assertion scope: 既有测试用真实 `AppRoutes` + `PermissionProvider` 确认 `/` 下 LoginLayout 骨架先出现、Login 懒加载后出现且未被空权限响应推走；新测试用 `renderToPipeableStream` 消费真实 `src/routes/index.jsx` 的初始 shell，或 JSDOM `createRoot` + 受控 pending lazy import，断言实际 fallback DOM 出现「页面加载中…」。明确不使用 `renderToString`，因为 React 19 对 Suspense 会 client-render bailout，不能作为 route Suspense 证据。路径与权限判定的逐条回归由下一 Scenario 的五条既有测试覆盖，不把 fallback 测试当成权限证明。
- Coverage note: 既有测试没有断言 fallback 文案，新测试补这个缺口；测试只验证真实路由组件的 Suspense fallback DOM，不模拟浏览器网络时序。

#### Scenario: 路由与守卫逐条不变

- Test/check:
  - [X] src/test/routeLoading.test.jsx::"/" 匿名进入登录页：布局骨架先就位，登录表单懒加载后出现且不被 401 推走
  - [X] src/test/routeLoading.test.jsx::"/register" 匿名注册可达，并与登录页共用同一个 LoginLayout
  - [X] src/test/routeLoading.test.jsx::"/admin/users" 无 manage 权限 → AdminLayout 守卫仍渲染 403，不进入管理页
  - [X] src/test/routeLoading.test.jsx::容器详情路径仍匹配并解析 :containerId
  - [X] src/test/routeLoading.test.jsx::未匹配路径仍落到 404 路由
  - [ ] npm run dev
- Assertion scope: 五条既有测试分别断言 `/` 登录页、`/register` 匿名注册、无 `user:manage` 的 `/admin/users` 显示 403 且不装配 ManageUser、`/index/containers/:containerId` 解析 containerId、未知路径显示 404；`npm run dev` 人工访问 `/admin` 断言默认重定向到 `/admin/users`。
- Coverage note: `/admin`→`users` 默认重定向不在五条现有断言内，故保留一条 manual check；不把 router 源码字符串当行为证据。

### Requirement: ModelViewer 独立懒加载与局部错误隔离

#### Scenario: 模型未就绪

- Test/check:
  - [X] src/test/loginViewerLazy.test.jsx::viewer 模块未完成时：右侧是空占位，左侧登录表单照常可用
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_model_viewer_failure_isolation
- Assertion scope: 既有测试用一个永不 settle 的 viewer 动态导入替身，断言 `model-stage-loading` 存在且为空 DOM、没有 `model-viewer`、没有「3D 预览」文案；左侧登录输入框在页面 chunk 就绪后出现。新测试补断言 loading 舞台没有 `role="status"`/`aria-live` 播报，失败舞台也没有新增可见文案。
- Coverage note: 既有测试只断言空 DOM 与表单可用，没有单独断言属性或尺寸；新测试补属性断言。左右两栏的渲染先后与尺寸测量仍不在自动断言范围，尺寸由同一份占位样式保持。

#### Scenario: 导入被拒绝或渲染抛错

- Test/check:
  - [X] src/test/loginViewerFailure.test.jsx::viewer 动态导入被拒绝：右栏为空占位，登录布局与表单槽位仍渲染
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_model_viewer_failure_isolation
- Assertion scope: 既有测试让 viewer 动态导入被拒绝，断言出现空的 `model-stage-unavailable`、无 loading/viewer/「3D 预览」文案，左侧登录/注册按钮与表单槽位仍渲染；新测试在 JSDOM 中加载真实 ModelViewer，先断言无 WebGL 时 `renderDisabled` 既有可见降级「3D 预览当前不可用」仍在 stage 内；再用会抛错的子组件触发隔离分支，断言 `model-stage-unavailable` 为空占位、左侧路由/表单可用。
- Coverage note: `renderDisabled` 是 Requirement 正文的既有可见降级语义，不等于 Scenario 的“空占位”；“空占位”结论只由动态导入被拒/渲染抛错子例支撑。测试替身只注入失败，不替换被验证的局部隔离逻辑，也不修改生产组件。

### Requirement: 分包按实际 manualChunks 配置

#### Scenario: 模块 id 分组

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_manual_chunks_artifact
- Assertion scope: 用仓库 `vite.config.js` 执行真实构建（`build.write:false` 或临时 `outDir`，不覆盖仓库 `dist`），通过 `generateBundle` 读取每个 chunk 的 module id：断言 `vendor-react` 含 react/react-dom/react-router/scheduler，入口 chunk 的 imports 指向 `vendor-react`，`vendor-three-addons` 含 `three/examples/**`，`vendor-three-webgl` 含 `three/build/three.module.js`，`vendor-three-core` 含其余 three，非 three 的 node_modules 不被强制塞进上述 vendor chunk。
- Coverage note: 断言依据是产物 module id 与 import 边，不以“build 绿”代替；chunk 文件名带 hash，因此不绑定文件名，也不把“长期缓存”写成自动断言。

#### Scenario: id 附带查询后缀

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_manual_chunks_query_suffix
- Assertion scope: 从真实 resolved config 取出 `manualChunks` 函数，对 `.../three/build/three.module.js?commonjs-proxy` 等带查询后缀的 id 调用，断言仍返回 `vendor-three-webgl`，对 `.../three/src/...?...` 返回 `vendor-three-core`；不锚定字符串结尾。
- Coverage note: 普通生产构建不一定产生带 `?` 的 three id，因此用真实配置函数的确定性调用补这一分支；产物分组由上一 Scenario 的真实构建覆盖。

### Requirement: 依赖方向以产物检验后陈述

#### Scenario: 核对产物依赖

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_chunk_dependency_edges_are_artifact_backed
  - [ ] Select-String -Path dist/assets/vendor-*.js -Pattern 'from"\./|import"\./'
- Assertion scope: 新测试读取 `test_anvil_manual_chunks_artifact` 同一次 `build.write:false`/临时 `outDir` 真实构建的 `generateBundle` bundle（或另跑一次不落盘的构建），从产物 chunk 的 imports 读取边，断言每条边都指向同一 bundle 中实际存在的 chunk 文件；`Select-String` 仅在已有 `dist` 时用于人工复核，缺失时转 manual。报告只写产物中可验证的边，不把源码 re-export 当 chunk 边，不在未检验时写「单向无环」。
- Coverage note: 规格要求的是“以产物为据陈述”，不是固定的无环图；自动化只验证边的产物来源，结论仍由人工报告。测试不要求仓库 `dist` 前置条件，也不覆盖仓库既有产物。

### Requirement: 分包原则由规格承载而非配置注释

#### Scenario: 整理配置注释

- Test/check:
  - [X] git diff HEAD -- vite.config.js
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_manual_chunks_query_suffix
- Assertion scope: 审查 `vite.config.js` diff：只允许删除重复分包原则的注释文本，不允许改动 `manualChunks` 的签名、正则或返回值；配置函数的分组与查询后缀行为由具名测试守护。本 change 当前无 `vite.config.js` diff。
- Coverage note: 该 Scenario 描述注释整理这一条件动作，没有当前运行时对象；用 diff 审查加行为测试双重约束，不制造注释文本匹配测试。

### Requirement: 不宣称依赖减少或首屏加速

#### Scenario: 未做浏览器测量

- Test/check:
  - [ ] Select-String -Path README.md -Pattern '首屏|依赖.*减少|更快|加速'
- Assertion scope: 人工审查 README 与最终交付报告中的相关文字：没有生产预览浏览器测量时，不得声称分包减少总依赖代码量或使首屏更快；命中词必须结合上下文判断，不能仅凭关键词定罪。
- Coverage note: 本 change 没有浏览器性能测量，也没有性能结论；该检查是文档/报告审阅，不是运行时性能测试。

### Requirement: 构建产物不是持续运行入口

#### Scenario: 构建只产出静态产物

- Test/check:
  - [X] npm run build
- Assertion scope: `npm run build` 退出 0、进程结束，并生成 `dist/index.html` 与静态资源；命令本身不启动常驻服务。产物存在性从 `dist` 读取，不以退出码推断服务行为。
- Coverage note: 构建会覆盖 `dist`，这是既有行为；不以进程列表之外的方式声称“没有后台进程”。

#### Scenario: 构建后的持续运行

- Test/check:
  - [X] scripts/tests/production-entry-cli.integration.mjs::npm start（含 prestart + scripts.start 装配）真实冒烟
  - [X] scripts/tests/production-entry-cli.integration.mjs::正常启动后服务静态与 /api，SIGINT 可退出
- Assertion scope: 真实 `npm start` 经 `prestart` + `scripts.start` 启动，单个入口服务首页与 `/api`，未启动 Vite dev/preview；SIGINT 后进程退出。冒烟测试仅在已有 `dist/index.html` 时执行，缺产物时跳过。
- Coverage note: 冒烟测试有 dist 前置条件；apply/build 顺序需保证产物存在。该测试不覆盖 PM2。

#### Scenario: 不改构建配置补功能

- Test/check:
  - [X] git diff HEAD -- vite.config.js
  - [X] npm pkg get scripts.dev scripts.preview
- Assertion scope: 审查 build 配置 diff：生产 HTTPS 与 `/api` 代理由 `scripts/start.mjs` 提供，`vite.config.js` 的开发代理与构建分包职责不变；本 change 无该文件改动。`npm pkg get` 断言 `dev` 与 `preview` 脚本仍保留。
- Coverage note: 这是职责边界审查，不是运行时断言；生产代理行为另由 `frontend--production-server` 的集成测试覆盖。

### Requirement: 全仓 ESLint 必须零错误零警告

#### Scenario: 全仓 lint 通过

- Test/check:
  - [X] npm run lint
- Assertion scope: 命令退出 0，汇总为 0 errors、0 warnings，检查范围仍覆盖 ESLint 配置当前包含的全部 JS/JSX，没有新增忽略。
- Coverage note: 本 plan 不保存运行数字或日志；真实输出归执行阶段、CI 或既有日志。

#### Scenario: 禁用规则或忽略目录被拒

- Test/check:
  - [X] git diff HEAD -- eslint.config.js package.json
  - [ ] Get-ChildItem eslint.config.js,package.json,src,scripts -Recurse -File -Include *.js,*.jsx,*.mjs | Select-String -Pattern 'eslint-disable|globalIgnores|--ignore-pattern'
- Assertion scope: 审查配置 diff：不得新增/扩大 `globalIgnores`、不得把规则改为 `off`、不得加 `--ignore-pattern` 或用 `eslint-disable` 注释；既有 `globalIgnores(['dist'])` 只保留原样。`Select-String` 命中需逐条分类，测试文本中的示例不算配置抑制。
- Coverage note: `Select-String` 不能解析 ESLint 配置继承关系，最终以 diff 与配置审阅为准；不新增只匹配文本的测试文件。

### Requirement: 所有测试入口自动兼容 Node 26 实验 Web Storage

#### Scenario: Node 26 测试入口注入 flag

- Test/check:
  - [X] scripts/tests/test-entry-node26.integration.mjs::test_q29_test_web_wrapper_injects_flag
  - [X] scripts/tests/test-entry-node26.integration.mjs::test_q29_node26_entry_injects_flag
- Assertion scope: helper 在 `process.allowedNodeEnvironmentFlags` 含 `--no-experimental-webstorage` 时把 flag 追加到 `NODE_OPTIONS`，保留已有选项且不修改输入；`test_q29_test_web_wrapper_injects_flag` 直接启动 `run-vitest.mjs` 跑依赖 jsdom storage 的既有用例，断言 status 0 且输出 `passed`。
- Coverage note: `npm test`、`test:watch`、`test:server` 与 CI 共用 helper，但没有为每个入口单独 spawn 进程；现有实际入口证据是 `test:web` 包装器，其它入口的进程级验证仍是部分覆盖。

#### Scenario: 不支持 flag 的 Node 不注入

- Test/check:
  - [X] scripts/tests/test-entry-node26.integration.mjs::test_q29_unsupported_node_no_injection
- Assertion scope: 传入空 flags 集合时 helper 不追加 flag，保留原 `NODE_OPTIONS`，不因 flag 不存在而失败；空 env 返回空对象。
- Coverage note: 该测试调用真实 helper 并注入不同 flags 集合，不依赖当前 Node 恰好不支持该 flag。

#### Scenario: 直接运行 test:web 同样注入

- Test/check:
  - [X] scripts/tests/test-entry-node26.integration.mjs::test_q29_test_web_wrapper_injects_flag
- Assertion scope: 在 `NODE_OPTIONS` 置空的情况下直接执行 `scripts/tests/run-vitest.mjs run src/test/authHelpers.test.js`，子进程由 wrapper 自动补 flag，测试通过；不要求调用方预设兼容变量。
- Coverage note: 该测试只跑一个依赖 jsdom storage 的既有用例，不是完整套件；完整入口兼容性另见下一 Scenario。

#### Scenario: Node 26 完整前端套件通过

- Test/check:
  - [X] node --version
  - [X] npm test
- Assertion scope: 先确认当前 Node 主版本为 26；`npm test` 退出 0，前端 Vitest 套件与生产入口集成测试都执行，0 failed/0 skipped/0 todo。真实文件数、用例数与输出归执行日志/CI，不写进本 plan。
- Coverage note: 不在 plan 内复制运行汇总；执行阶段需保留真实退出码与套件摘要。

### Requirement: Node 支持范围明确且覆盖新版本

#### Scenario: 支持范围与 CI 覆盖

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_node_engines_and_ci
- Assertion scope: 读取真实 `package.json` 与 `.github/workflows/web-tests.yml`，断言 `engines.node` 为 `^20.19.0 || >=22.12.0`，Node 矩阵同时包含 20.19.0、22、26，测试步骤调用 `npm run test`；不实际远程运行 GitHub Actions。
- Coverage note: 只验证静态配置；远程 CI 运行不在本 change 的本地范围。

#### Scenario: 单一旧版本或缺失范围被拒

- Test/check:
  - [ ] git diff HEAD -- package.json .github/workflows/web-tests.yml
- Assertion scope: 人工审查配置 diff：删除 `engines.node`、把矩阵固定为仅 Node 22、或加上只允许旧版本的上界都判失败；若改 Vite 依赖的 engines，也要与声明范围一致。
- Coverage note: 这是对假设性错误配置的策略审查，没有稳定的运行时对象；不新增只读配置文本的“拒绝测试”，也不把当前配置当成后续变更已拒绝的证明。

## frontend--production-server

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

## procedure--repository-workflow

### Requirement: 提交信息采用真实变更条目

#### Scenario: 多项变更

- Test/check:
  - [X] scripts/tests/commit-message.integration.mjs::accepts NEW
  - [X] scripts/tests/commit-message.integration.mjs::accepts AMEND
  - [X] scripts/tests/commit-message.integration.mjs::accepts FIX
  - [X] scripts/tests/commit-message.integration.mjs::accepts SPEC
  - [X] scripts/tests/commit-message.integration.mjs::accepts TEST
  - [X] scripts/tests/commit-message.integration.mjs::mixed entries keep comments and attribution rules
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_commit_msg_new_fix_combo_and_attribution
- Assertion scope: 既有 `accepts NEW/AMEND/FIX/SPEC/TEST` 逐个断言五类关键字在 LF、CRLF、无终止换行三种消息下均被真实钩子接受；`mixed entries keep comments and attribution rules` 已断言 SPEC+TEST 两行混合条目并跳过注释；新测试只补一条真实消息文件，含 `- NEW ...` 与 `- FIX ...` 两行，断言退出 0，并在同一临时 Git 仓库/真实 hook 中对 `Generated with` 与生成图标输入断言退出 1。钩子只校验格式/关键字，不判断两条内容是否真实。
- Coverage note: 现有 8 个 commit-message 测试没有 NEW+FIX 组合样例，也没有 `Generated with`/robot 拒绝断言；这两个真实自动边界合并进同一条新测试，不额外增加测试数量；内容真实性由人工评审。

#### Scenario: 错误关键字

- Test/check:
  - [X] scripts/tests/commit-message.integration.mjs::rejects unknown keywords and malformed entries
- Assertion scope: 既有测试用 `DOCS`、`DEBUG`、小写 `spec`、`-SPEC` 缺少空格、`- TEST` 缺少短句和仅注释/空行消息，断言真实钩子退出 1，stderr 列出 `SPEC`/`TEST` 的允许关键字提示。不再重复规划关键字白名单新测试。
- Coverage note: 只断言关键字白名单与格式；中文表达和条目自足不在钩子能力内。

#### Scenario: 脱离上下文不可读

- Test/check:
  - [ ] bash githooks/commit-msg <message-file>
- Assertion scope: 人工在临时消息文件中只写 `- FIX 更新若干文件`，真实钩子应放行（格式合法）；随后由人工评审按“不能脱离上下文独立理解”要求改写。该检查不新增自动语义测试，也不把钩子放行当成内容合格。
- Coverage note: 该 Scenario 的 THEN 是评审拒绝，不是钩子拒绝；现有 8 个测试不判断空泛度，故保留 manual 检查。

### Requirement: 禁止工具署名与空提交信息

#### Scenario: 只有注释或空行

- Test/check:
  - [X] scripts/tests/commit-message.integration.mjs::rejects unknown keywords and malformed entries
- Assertion scope: 既有测试的 `\n# 只有注释\n` 子例让真实钩子退出 1，并断言 stderr 命中「不符合条目格式|至少需要一条实际变更」；空行和注释不计条目。测试使用临时 git 仓库和真实 bash hook，不模拟钩子内部函数。
- Coverage note: 纯空行与注释行走同一 `items=0` 分支；既有测试以注释+空行样例覆盖该分支，不再重复规划新测试。

#### Scenario: 末行没有换行

- Test/check:
  - [X] scripts/tests/commit-message.integration.mjs::rejects unknown keywords and malformed entries
  - [X] scripts/tests/commit-message.integration.mjs::accepts NEW
  - [X] scripts/tests/commit-message.integration.mjs::mixed entries keep comments and attribution rules
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_commit_msg_new_fix_combo_and_attribution
- Assertion scope: `rejects unknown keywords and malformed entries` 中非法关键字和格式样例没有终止换行，断言非法末行仍退出 1；其中仅注释样例带终止换行，不用于证明无终止换行行为。`accepts NEW` 的 `\n`/`\r\n`/无终止换行三种 ending 断言合法条目均可读；`mixed entries keep comments and attribution rules` 断言 SPEC/TEST 条目夹注释仍通过、`Co-authored-by` 被拒；同一新测试 `test_anvil_commit_msg_new_fix_combo_and_attribution` 在真实临时 Git 仓库/真实 hook 中对 `Generated with` 与生成图标输入断言退出 1。
- Coverage note: 现有 8 个测试只覆盖 `Co-authored-by`；`Generated with`/robot 不降为 manual，已纳入上述组合+attribution 新测试的自动拒绝断言，测试数量仍为 19。

### Requirement: 合并提交使用 Git 默认信息

#### Scenario: 真实合并

- Test/check:
  - [X] scripts/tests/commit-message.integration.mjs::real merge state remains exempt
- Assertion scope: 既有测试在临时 git 仓库先写普通 `Merge branch example` 消息，断言真实钩子退出 1；随后写入 `.git/MERGE_HEAD`，同一消息退出 0。断言豁免依据真实 Git 状态而非消息文字，不创建 merge/commit。
- Coverage note: 现有测试已覆盖该 Scenario，删除原先规划的临时 MERGE_HEAD 新测试；不重复实现同一证据。

### Requirement: 钩子随仓库交付并显式启用

#### Scenario: 新克隆启用

- Test/check:
  - [X] git config --local core.hooksPath
  - [X] git ls-files -s -- githooks/pre-commit githooks/commit-msg
- Assertion scope: 当前仓库 `core.hooksPath` 为 `githooks`，两个钩子由仓库跟踪；无需复制到 `.git/hooks`。实际新克隆不在本机执行，故以配置与入库文件核对替代。
- Coverage note: 没有真实新克隆；不声称已验证所有克隆环境。钩子可执行性由下一 Requirement 的 mode 检查与 hook-run 测试覆盖。

#### Scenario: 已有自定义钩子

- Test/check:
  - [ ] Get-ChildItem .git/hooks -File | Where-Object { $_.Name -notlike '*.sample' }
- Assertion scope: 列出 `.git/hooks` 非 sample 钩子；若存在需保留的入口，必须在切换 hooksPath 前确认迁移方式，不能直接用 `githooks` 替换掉。当前仓库的 hooksPath 已指向 `githooks`，该检查用于新克隆/迁移评审。
- Coverage note: 这是人工流程检查，不自动修改 hooksPath，也不覆盖既有自定义钩子。

### Requirement: shell 钩子保持 LF 与 Git 100755

#### Scenario: 核对入库元数据

- Test/check:
  - [X] git ls-files -s -- githooks/pre-commit githooks/commit-msg
  - [X] git check-attr text eol -- githooks/pre-commit githooks/commit-msg
- Assertion scope: 两个钩子的 Git mode 都是 100755；`git check-attr` 显示 `text: set`、`eol: lf`，`.gitattributes` 的 `githooks/* text eol=lf` 生效。
- Coverage note: `.gitattributes` 覆盖无扩展名的 `githooks/` 文件；未额外枚举所有可能新增的钩子名。Windows 上的 `git add --chmod=+x` 是交付步骤，检查只验证最终 mode/LF，不自动执行 chmod。

#### Scenario: 漏补执行位

- Test/check:
  - [ ] git ls-files -s -- githooks/pre-commit githooks/commit-msg
- Assertion scope: 人工审查 mode：任一钩子为 100644 时，他人克隆后可能静默不执行或报 Permission denied，判为交付缺陷；当前两项均为 100755。
- Coverage note: 该负例是交付评审规则，不通过把真实文件改成 100644 来伪造失败；不修改 Git index。

### Requirement: 新 capability 使用门类前缀

#### Scenario: 新增页面规格

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_pre_commit_capability_prefix
  - [ ] Get-ChildItem openspec/specs -Directory | Where-Object { $_.Name -like 'frontend--page-*' }
- Assertion scope: 新测试在临时 index 中新增 `openspec/specs/frontend--page-calendar/spec.md`（A），执行真实 `githooks/pre-commit`，断言放行；该正向样例只证明门类前缀，不证明更细的 `page-` 命名。人工检查用命令列出既有页面 capability，确认采用 `frontend--page-<名称>` 约定。
- Coverage note: `githooks/pre-commit:78-100` 只校验 `standard--`/`frontend--`/`backend--`/`procedure--` 门类前缀；`page-` 是人工命名约定，hook 不会拒绝 `frontend--calendar` 这类页面规格。故该测试不能单独证明页面命名规则，必须保留上述 manual 检查，不改 app/hook。临时 index/GIT_DIR/blob 隔离边界见下一 Requirement 的 Coverage note。

#### Scenario: 叠加前缀

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_pre_commit_capability_prefix
- Assertion scope: 同一测试新增 `openspec/specs/frontend--backend--example/spec.md`（A），断言钩子退出 1，stderr 提示「不得叠加门类前缀」。
- Coverage note: 只断言钩子的前缀拒绝；不把名称分级判断扩展到未新增的存量 capability。

### Requirement: 命名校验只针对暂存区新增标记文件

#### Scenario: 修改既有规格

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_pre_commit_capability_prefix
- Assertion scope: 临时 index 中把既有 `openspec/specs/frontend--build/spec.md` 改为不同 blob（M），执行钩子，断言放行；修改既有主规格不要求改名。另构造 Git 识别的 R 改名（相似 blob）断言放行，改名不按新增 capability 强制迁移。
- Coverage note: A/叠加/archive 子例在独立临时仓库 `git init` 后构造 index；M/R/旧 capability delta 子例读取真实仓库的 `GIT_DIR` 和 HEAD 已有 blob，仅通过 `GIT_INDEX_FILE` 写独立临时 index，不写真实对象库、不 commit/reset/clean、不改工作区。blob 来源只用 HEAD 已有对象或临时仓库内的 `git hash-object`，不修改真实主规格。

#### Scenario: 旧 capability 首次增加 delta

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_pre_commit_capability_prefix
- Assertion scope: 临时 index 新增 `openspec/changes/<change>/specs/frontend--build/spec.md`（A），而 HEAD 已有该主规格；钩子检查 HEAD 后放行，断言「delta 新增不等于 capability 新增」。
- Coverage note: 使用真实 HEAD 的既有 capability；不修改该 change 之外的文件。

#### Scenario: 历史归档

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_pre_commit_capability_prefix
- Assertion scope: 同一测试新增 `openspec/changes/archive/<old>/specs/frontend--legacy/spec.md`（A），断言钩子跳过 archive，不追溯改名；另用含空格/非 ASCII 的路径验证 NUL 分隔读取不截断。
- Coverage note: 只验证 `--diff-filter=A` 与 archive 跳过；不重命名或迁移任何历史规格。

### Requirement: 业务单元边界与规格入口

#### Scenario: 页面规格的归属

- Test/check:
  - [ ] Select-String -Path openspec/specs/frontend--page-*/spec.md -Pattern '业务|规则'
- Assertion scope: 人工抽查页面规格：即使页面规格夹带业务规则，仍归 `frontend--`，判据是落在客户端一端；不因夹带业务内容把页面规格迁到 backend 或拆成跨端 capability。
- Coverage note: 这是命名/归属判断，没有单一可执行对象；命中词需结合规格上下文，不自动判定归属。

#### Scenario: 规格入口

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_openspec_layout
- Assertion scope: 新测试断言仓库根存在 `README.md`，并递归检查 `openspec/` 下不存在 `README.md`；不把 change 的 scaffold README 留在树内。
- Coverage note: 官方 `openspec new change` 会生成 change README，与本规则冲突；本 change 已删除自己的 scaffold README，工具链冲突报告父代理，不改官方工具或主规格。

### Requirement: 规范在各仓库独立执行

#### Scenario: 单独克隆一个仓库

- Test/check:
  - [ ] git clone --no-hardlinks . "$env:TEMP\fuxi-web-clone"
- Assertion scope: 在临时 clone 中启用 `core.hooksPath=githooks`，分别运行 commit-msg 与 `check_pr.py`；断言单独检出 Web 后，提交信息校验与 PR 正文校验都能执行，不需要 Ctrl/Node/Global 的运行时文件。检查不启动另外两个仓库，也不创建真实提交。
- Coverage note: 没有执行真实 clone（需要网络/远端），也未创建真实提交；这是隔离性人工评审，不是运行时集成测试。

#### Scenario: 其他仓库的规范变更

- Test/check:
  - [ ] Select-String -Path githooks/*,scripts/ci/*,.github/workflows/* -Pattern 'FuxiYu_Global|FuxiYu_CtrKernel|FuxiYu_NodeKernel|\.\./Global'
- Assertion scope: 人工审查命中项：本仓库 hooks/checker/workflow 不引用其他仓库的执行期文件；其他仓库调整自己的约定不应改变本仓库校验行为。命中说明文字需区分文档链接与运行时依赖。
- Coverage note: 不修改其他仓库，不跨仓运行；仅做本仓库依赖边界审查。

### Requirement: 已知问题登记与证据分级

#### Scenario: 规格中登记差异

- Test/check:
  - [ ] Get-ChildItem openspec/specs -Recurse -Filter spec.md | Select-String -Pattern 'QUESTIONS|见 QUESTIONS|不表示已修复'
  - [ ] Select-String -Path README.md -Pattern 'QUESTIONS'
- Assertion scope: 人工审阅已知差异的登记：业务问题集中引用 Global `QUESTIONS.md`，规格引用时明确该记录不代表问题已修复；本仓库只保留引用，不复制完整问题台账。
- Coverage note: `QUESTIONS.md` 位于跨仓库 Global，本 change 不读取或修改其内容；只审查本仓库的引用方式。

#### Scenario: 证据状态混用

- Test/check:
  - [ ] Select-String -Path ..\FuxiYu_Global\QUESTIONS.md -Pattern '已复现|源码确认|待验证|已修复'
- Assertion scope: 人工逐条核对命中项：只有源码走查、未在环境复现的问题必须记为「源码确认」，不得写成「已复现」；四种状态按实际证据区分。
- Coverage note: 该文件不在本仓库且本 change 不修改它；这是人工证据分级检查，不制造自动分类器。

### Requirement: 规范不代表业务已完整

#### Scenario: 校验通过但描述不足

- Test/check:
  - [ ] openspec validate --specs --strict
- Assertion scope: 命令退出 0 只证明结构/格式有效；人工抽查某个 capability 是否只写了字段与生命周期概述，若是仍承认其业务逻辑描述需要补写，不把校验通过当作业务完整证明。
- Coverage note: 这是评审判断，没有自动化对象；不新增“描述完整度”关键词测试。

### Requirement: PR 正文使用四类中英双语栏目

#### Scenario: 只有优化

- Test/check:
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_enhancement_only_is_delivery
- Assertion scope: 正文只有 `### 优化工作 | Enhancements & Patches` 且含真实条目时，`validate_body` 返回空错误列表，校验通过。
- Coverage note: 该测试直接调用真实 checker 的 `validate_body`；不经过 GitHub workflow。

#### Scenario: 只有计划

- Test/check:
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_plan_only_is_not_delivery
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_plan_items_do_not_satisfy_empty_delivery
- Assertion scope: 只有 `下一步计划 | Coming Up` 条目时校验失败；`新增内容` 只写 `- 无`、计划栏写真实条目时仍失败；计划条目不满足交付类栏目。
- Coverage note: 计划栏即使有真实内容也不计入交付；测试覆盖新旧标题混用中的计划停用分支。

#### Scenario: 空栏

- Test/check:
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_empty_column_with_wu_is_allowed
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_plan_items_do_not_satisfy_empty_delivery
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_missing_verification_is_valid
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_optional_verification_placeholder_is_not_required
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_pr_body_checker_data_and_title
- Assertion scope: 旧式 `NEW`/`FIX` 中一栏 `- 无`、另一栏有真实条目时通过；新式四类栏目中空交付栏不被计划条目填充；省略验证说明仍通过，验证栏写占位不构成必填失败；新测试另构造新式「一栏 `- 无` + 另一交付栏真实条目」断言通过，并确认验证说明/通过率可省略。
- Coverage note: 既有空栏测试使用旧栏目，新测试补新式四栏的空栏与可选验证组合；不修改既有 checker 测试。审查发现与待办不得写成已修复属于内容真实性，由人工评审，不由结构 checker 判断。

### Requirement: 占位、注释与围栏不计交付

#### Scenario: 只提交模板

- Test/check:
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_template_placeholders_cannot_pass_validation
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_template_contains_required_markers
- Assertion scope: 原样模板被 `validate_body` 判失败；模板含 HTML 注释、标题说明、四类中英双语标记，且不把 `## 验证` 写成必填栏。
- Coverage note: 测试断言模板本身不能通过；占位清单另由 `test_placeholder_items_are_rejected` 覆盖。

#### Scenario: 围栏里伪造条目

- Test/check:
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_fenced_copy_of_a_whole_pr_fails
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_fenced_items_do_not_satisfy_a_column
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_comment_only_body_fails
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_commented_items_do_not_satisfy_a_column
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_placeholder_items_are_rejected
- Assertion scope: 整个 PR 正文放进 fenced block 时无有效内容、校验失败；栏内 fenced/HTML 注释条目不能满足交付；只有注释的正文失败；占位 `-`、`- ...`、`- TODO`、`- 待填写`、`<...>`、`- 无`、`（请填写）` 均不计入。
- Coverage note: 占位只按“整条就是占位”判定，不误伤含这些词的正常条目；测试覆盖该边界。

### Requirement: PR 标题由人工评审

#### Scenario: 标题未带类型前缀

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_pr_body_checker_data_and_title
- Assertion scope: 用真实 event JSON 同时提供自然语言 `pull_request.title` 与合法正文，调用 `check_pr.py --event`，断言退出 0；checker 只读 `pull_request.body`，不要求 `feat(...)` 前缀，也不因标题措辞改变正文校验结果。
- Coverage note: 该测试不验证标题内容是否正确；只验证标题不参与结构校验。

#### Scenario: 标题写错

- Test/check:
  - [ ] git log -1 --stat --pretty=%s
- Assertion scope: 对照最近提交标题、实际改动文件与 PR 描述；标题与实际交付不符时由人工评审提出，checker 不拦标题。测试已证明脚本忽略标题，不能把“脚本通过”当成标题正确。
- Coverage note: 这是人工评审对象，没有自动化语义判断；不新增标题关键词测试。

### Requirement: 旧栏目仅作过渡兼容

#### Scenario: 过渡期旧正文

- Test/check:
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_new_only_is_valid
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_fix_only_is_valid
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_both_columns_are_valid
- Assertion scope: 旧式 `NEW | 新增内容`、`FIX | 修复漏洞` 单栏或双栏且含真实条目时，checker 仍接受；旧栏目只作过渡兼容。
- Coverage note: 兼容接受不等于当前推荐格式；新写正文的断言在下一 Scenario。

#### Scenario: 新写正文

- Test/check:
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_node_pr_four_columns
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_bilingual_case_and_spacing
- Assertion scope: 四类中英双语栏目各有真实条目时通过；大小写与 `|` 两侧空格变体仍识别；新正文应使用四类栏目。
- Coverage note: 测试不扫描仓库里所有 PR 正文，也不把模板文字当新正文；只验证 checker 对新式栏目的接受。

### Requirement: PR 正文由基准分支的检查器校验

#### Scenario: 正文被修改

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_pr_workflow_policy
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_pr_body_checker_data_and_title
- Assertion scope: 读取真实 `.github/workflows/pr-format.yml`，断言 `pull_request.types` 含 `edited`，正文编辑会重新触发工作流；不实际修改 GitHub PR。新测试把含 shell/Python 注入片段的正文放进 event JSON，执行真实 `check_pr.py --event`，断言正文只作为数据，不创建标记文件、不求值表达式、不调用 shell。
- Coverage note: 只验证工作流触发配置；远程 GitHub 事件未执行。

#### Scenario: 首次接入

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_pr_workflow_policy
- Assertion scope: 同一测试断言工作流先 checkout `github.event.pull_request.base.sha` 的 `reviewed` 路径；基准分支无 checker 时再 checkout head 的 `proposed/scripts/ci/check_pr.py`，并以固定 SHA256 校验；不静默跳过。
- Coverage note: 这是工作流配置与脚本路径的真实静态契约，不执行 GitHub Actions checkout。

#### Scenario: 摘要不符

- Test/check:
  - [X] scripts/tests/anvil-delivery.checks.mjs::test_anvil_pr_workflow_policy
  - [ ] sha256sum --check --status
- Assertion scope: 测试计算当前 `scripts/ci/check_pr.py` 的 SHA256，断言与工作流固定值一致；人工在临时副本准备校验和文件后执行 `sha256sum --check --status`，确认摘要不一致时返回非零且工作流 `set -e` 失败，不执行该脚本。
- Coverage note: 只在临时副本上制造不一致，不改仓库 checker；摘要不匹配的 CI 运行未远程执行。

### Requirement: commit 关键字与 PR 栏目相互独立

#### Scenario: PR 内含 AMEND 提交

- Test/check:
  - [X] scripts/ci/tests/test_check_pr.py::ValidateBodyTests.test_enhancement_only_is_delivery
  - [X] scripts/tests/commit-message.integration.mjs::accepts AMEND
- Assertion scope: 既有 commit-message 测试断言真实钩子接受 `- AMEND ...`；既有 PR checker 测试断言正文只保留「优化工作」栏目也能通过。二者各自维护，不把 commit 的 AMEND 改写成 PR 栏目关键字。
- Coverage note: 这是流程独立性规则，没有单一端到端对象；两侧各有真实测试，但“同一次 PR 同时含 AMEND 与四类正文”的人工组合仍需评审确认。

### Requirement: 规范入口不使用代理说明文件

#### Scenario: 生成代理说明文件

- Test/check:
  - [ ] Get-ChildItem -Recurse -File -Include AGENT.md,AGENTS.md | Where-Object { $_.FullName -notmatch '\\node_modules\\' }
- Assertion scope: 检查工作区（排除 `node_modules`）是否存在 `AGENT.md`/`AGENTS.md`；若工具生成，应移除并从暂存区排除，把适用规范整理到本仓库 OpenSpec。规则由维护与评审落实，不声称 hook 会自动拒绝。
- Coverage note: 该规则没有自动拦截器；测试若写成“文件存在即失败”也只是当前布局检查，不能证明 hook 行为。这里保留人工检查。
