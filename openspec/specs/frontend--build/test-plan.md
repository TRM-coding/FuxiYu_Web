# frontend--build Test Plan

Spec: [spec.md](spec.md)

## Current Mapping

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
