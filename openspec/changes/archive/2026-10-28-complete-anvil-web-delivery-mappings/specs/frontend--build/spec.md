# Spec Delta

## MODIFIED Requirements

### Requirement: 构建告警与压缩保持默认

生产构建 SHALL 保持 Vite 默认 `chunkSizeWarningLimit`（500 kB）与既有压缩设置，MUST NOT 通过调高阈值、屏蔽插件警告、关闭压缩或移除功能来消除告警。出现超阈值 chunk 时构建 SHALL 照常输出体积警告，并 SHALL 如实记入验收报告；本规格 MUST NOT 把「无警告」写成验收前提。

#### Scenario: 出现超阈值 chunk

- **WHEN** 生产构建产生压缩前超过 500 kB 的 chunk
- **THEN** 构建仍输出体积警告并如实记录该数值，未被提高阈值或屏蔽日志掩盖

#### Scenario: 以调阈值规避警告

- **WHEN** 有人提议提高 `chunkSizeWarningLimit` 或屏蔽警告，让构建输出看起来「干净」
- **THEN** 该做法被拒绝，真实体积与警告照常报告

### Requirement: 同一模块只采用一种导入方式

本次统一的两处共用模块 `src/utils/requestManager.jsx`、`src/utils/validateCmdArg.jsx` SHALL 采用静态导入；当前页面组件与 `ModelViewer` 使用 `React.lazy`。同一模块 MUST NOT 同时存在静态导入与动态 `import()`。该约束只针对上述共存问题，MUST NOT 解释为禁止未来合理的普通动态 `import()`；统一导入 MUST NOT 改变原有错误传播、401/403 认证处置与业务语义。

#### Scenario: 混合导入被检出

- **WHEN** 同一模块既被静态导入，又被 `import()` 动态导入
- **THEN** Rollup 输出「dynamically imported … but also statically imported」警告；修法是统一导入方式，不是屏蔽日志

#### Scenario: 统一后的生产构建

- **WHEN** 统一 `requestManager` 与 `validateCmdArg` 的导入后执行生产构建
- **THEN** 预期不再出现这两条混合导入警告，实际结果以构建输出为准

### Requirement: 页面与共同布局按需加载且路由不变

`src/routes/index.jsx` SHALL 以 `React.lazy` 动态导入业务页面与共同布局 `MainLayout`、`AdminLayout`，并在 route element 层以 `Suspense` 提供页面级加载反馈；`LoginLayout`、路由骨架与 React 运行时 SHALL 随入口静态加载。按需加载 MUST NOT 改动路由路径、`/admin`→`users` 默认重定向、403 权限守卫、两个独立详情页与 404 匹配。

#### Scenario: 异步 chunk 尚未就绪

- **WHEN** 目标页面或共同布局的异步 chunk 尚未就绪
- **THEN** route element 的 `Suspense` 显示页面级加载反馈，路径与权限判定不变

#### Scenario: 路由与守卫逐条不变

- **WHEN** 访问 `/`、`/register`、无 `user:manage` 的 `/admin/users`、`/index/containers/:containerId` 与任意未知路径
- **THEN** 分别得到登录页、匿名注册、403、容器详情页与 404，与懒加载前一致

### Requirement: ModelViewer 独立懒加载与局部错误隔离

`LoginLayout` 内的 `ModelViewer` SHALL 独立 `React.lazy` 加载，且 MUST NOT 改动 `/` 与 `/register` 路由及权限策略。加载中、动态导入被拒绝或组件渲染抛错时，仅右侧舞台 SHALL 降级为保持布局尺寸的空占位；MUST NOT 新增可见的「3D 预览…」文案，MUST NOT 新增 `role="status"`/`aria-live` 播报，左侧表单 MUST 保持可用。`ModelViewer` 自身既有 `renderDisabled` 行为 MUST 保持。

#### Scenario: 模型未就绪

- **WHEN** 进入 `/` 或 `/register` 时 `ModelViewer` 的动态导入尚未完成
- **THEN** 右侧为空占位、无文案与播报，左侧表单已可交互，两侧无强制先后顺序

#### Scenario: 导入被拒绝或渲染抛错

- **WHEN** `ModelViewer` 的动态导入被拒绝，或其组件渲染抛错
- **THEN** 仅右栏降级为空占位，左侧表单与路由保持可用，`renderDisabled` 既有降级语义不变

### Requirement: 分包按实际 manualChunks 配置

分包 SHALL 以 `vite.config.js` 的 `build.rollupOptions.output.manualChunks` 为唯一实现：`react`、`react-dom`、`react-router`、`react-router-dom`、`scheduler` → `vendor-react`（随入口加载、可长期缓存）；`three/examples/**` → `vendor-three-addons`；`three/build/three.module.js` → `vendor-three-webgl`；其余 `three` 模块 → `vendor-three-core`；其它 `node_modules` SHALL 交给 Rollup 自动分包。匹配 SHALL 容忍 id 的查询后缀。

#### Scenario: 模块 id 分组

- **WHEN** 构建遇到上述各依赖的模块 id
- **THEN** 分别落入 `vendor-react`、`vendor-three-addons`、`vendor-three-webgl`、`vendor-three-core`；其它 `node_modules` 由 Rollup 自动分包

#### Scenario: id 附带查询后缀

- **WHEN** `three.module.js` 的模块 id 附带查询后缀
- **THEN** 仍匹配 `vendor-three-webgl`（正则不锚定结尾），不误落入核心片

### Requirement: 依赖方向以产物检验后陈述

分包 SHALL 依据现有模块边界与依赖顺序，MUST NOT 为凑体积跨边界合并模块。chunk 之间的实际依赖边 SHALL 由主审以产物（chunk import 关系）验证后报告；MUST NOT 把源码中的 re-export 或 import 语句直接当作实际 chunk 边，MUST NOT 在未检验时把「单向无环」写成事实。

#### Scenario: 核对产物依赖

- **WHEN** 报告 vendor chunk 之间的依赖方向
- **THEN** 以产物验证为依据后再写结论；未验证时不写「单向无环」，也不把源码 re-export 当作实际 chunk 边

### Requirement: 分包原则由规格承载而非配置注释

分包策略 SHALL 由本 capability 规格承载，`vite.config.js` MUST NOT 用长段解释性注释重复这些原则。整理此类注释时 MUST 逐字保持 `manualChunks` 的函数签名、正则与返回值等逻辑，MUST NOT 借注释整理改动任何行为。

#### Scenario: 整理配置注释

- **WHEN** 删除 `vite.config.js` 中重复分包原则的长注释
- **THEN** 只删除注释文本，函数签名、正则与返回值逐字不变

### Requirement: 不宣称依赖减少或首屏加速

分包 SHALL NOT 被表述为必然减少总依赖代码量：依赖只是改变落点，总代码量 SHALL 以实际产物为准。首屏加速 SHALL 以浏览器实测为据；未实测前 MUST NOT 宣称或保证首屏更快。具体 chunk 体积与警告清单属验收观测，MUST NOT 固化为规格指标。

#### Scenario: 未做浏览器测量

- **WHEN** 尚未在生产预览中用浏览器测量首屏
- **THEN** 不得宣称构建调整使首屏更快，也不得声称总依赖代码因此减少

### Requirement: 构建产物不是持续运行入口

生产构建 SHALL 只负责产出 `dist/` 静态产物并正常结束。项目 SHALL 通过 `npm start` 提供持续运行入口，其行为契约由 `frontend--production-server` 承载；`npm run dev` 与 `npm run preview` 保留开发及本地预览用途。构建配置 SHALL 保持构建职责，生产代理与 TLS 由独立启动入口提供。

#### Scenario: 构建只产出静态产物

- **WHEN** 执行 `npm run build`
- **THEN** 只产出 `dist/` 下的静态文件与分包结果，不产出常驻服务进程

#### Scenario: 构建后的持续运行

- **WHEN** 构建完成后执行 `npm start`
- **THEN** 常驻入口读取构建产物并提供服务，构建命令自身不常驻

#### Scenario: 不改构建配置补功能

- **WHEN** 需要生产环境的 HTTPS 与 `/api` 代理
- **THEN** 由生产入口提供；`vite.config.js` 的开发代理与构建分包配置保持原有职责，不因本需求改动

### Requirement: 全仓 ESLint 必须零错误零警告

`npm run lint` SHALL 在仓库根目录检查全部既有 `**/*.{js,jsx}` 文件并以退出码 0 结束，输出 MUST 为 0 errors、0 warnings。修复 MUST 按规则与文件批量完成；MUST NOT 通过关闭规则、把规则改为 `off`、新增或扩大 `globalIgnores`、使用 `eslint-disable`/`eslint-disable-next-line`/`eslint-disable-line`、添加 `--ignore-pattern` 或屏蔽源码目录来达标。现有 `globalIgnores(['dist'])` 只忽略构建产物，保持原样，不得借 Q28 扩大或新增其他忽略。

#### Scenario: 全仓 lint 通过

- **GIVEN** 仓库按锁定依赖安装完成
- **WHEN** 在仓库根目录执行 `npm run lint`
- **THEN** 命令退出码为 0，ESLint 汇总为 0 errors、0 warnings，且检查范围仍覆盖 ESLint 配置当前包含的全部 JS/JSX 文件，没有新增忽略

#### Scenario: 禁用规则或忽略目录被拒

- **GIVEN** 代码变更试图通过关闭规则、新增忽略目录、添加 `--ignore-pattern` 或保留 `eslint-disable` 注释来消除报错
- **WHEN** 执行 lint 策略检查
- **THEN** 该做法被判失败，不能作为 Q28 的完成证据

### Requirement: 所有测试入口自动兼容 Node 26 实验 Web Storage

`npm test`、`npm run test:web`、`npm run test:watch`、`npm run test:server` 以及 CI 的测试步骤 SHALL 通过同一测试运行 helper 决定是否注入 `NODE_OPTIONS=--no-experimental-webstorage`：当 `process.allowedNodeEnvironmentFlags` 支持该 flag 时自动注入，不支持时不注入且不得因此失败；MUST NOT 要求用户手工设置 `NODE_OPTIONS`，也 MUST NOT 只修 `npm test` 而让 `npm run test:web` 继续绕过。

#### Scenario: Node 26 测试入口注入 flag

- **GIVEN** 当前 Node 的 `process.allowedNodeEnvironmentFlags` 包含 `--no-experimental-webstorage`
- **WHEN** 执行 `npm test` 或任一测试入口
- **THEN** 子进程环境自动包含该 flag，前端完整 Vitest 套件通过，不需要调用方手工设置环境变量

#### Scenario: 不支持 flag 的 Node 不注入

- **GIVEN** 当前 Node 不支持 `--no-experimental-webstorage`
- **WHEN** 执行任一测试入口
- **THEN** helper 不注入该 flag，测试仍按该 Node 的既有能力运行，不因 flag 不存在而失败

#### Scenario: 直接运行 test:web 同样注入

- **GIVEN** 当前 Node 支持 `--no-experimental-webstorage`
- **WHEN** 直接执行 `npm run test:web` 而不是先经过 `npm test`
- **THEN** 该入口同样自动注入 flag，不发生 jsdom 与实验 Web Storage 冲突

#### Scenario: Node 26 完整前端套件通过

- **GIVEN** 在 Node 26 环境安装锁定依赖
- **WHEN** 执行 `npm test`
- **THEN** 前端 Vitest 套件与生产入口集成测试均通过，证据记录真实文件数、用例数与退出码

### Requirement: Node 支持范围明确且覆盖新版本

`package.json` SHALL 通过 `engines.node` 声明支持范围 `^20.19.0 || >=22.12.0`，MUST NOT 加上仅允许 Node 22 或更低版本的上界；CI SHALL 使用 Node 20.19.0、22、26 的矩阵，覆盖声明下限、当前基线与 Node 26 兼容性。支持范围与矩阵 SHALL 由测试或静态检查守护，不能只写在 README。

#### Scenario: 支持范围与 CI 覆盖

- **GIVEN** 检查 `package.json` 与 Web Tests 工作流
- **WHEN** 读取 `engines.node` 和测试矩阵
- **THEN** `engines.node` 为 `^20.19.0 || >=22.12.0`，矩阵同时包含 Node 20.19.0、22、26，CI 的测试步骤调用统一入口

#### Scenario: 单一旧版本或缺失范围被拒

- **GIVEN** 变更把 CI 固定为仅 Node 22、删除 `engines.node` 或加上只允许旧版本的上界
- **WHEN** 执行支持范围检查
- **THEN** 检查失败，该配置不能作为 Q29 的完成证据
