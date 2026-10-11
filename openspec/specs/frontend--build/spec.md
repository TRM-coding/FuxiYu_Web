# 前端构建与分包

## Purpose

记录 Web chester-next 生产构建的代码级组织约定：告警与压缩保持默认、模块导入方式一致、页面与共同布局按需加载、`LoginLayout` 内 `ModelViewer` 的独立懒加载与局部错误隔离，以及 `vite.config.js` 实际 `manualChunks` 的分包边界。来源是当前已实现的 `src/routes/index.jsx`、`src/layouts/LoginLayout.jsx` 与 `vite.config.js`；本文件承载分包原则，页面 capability 的「构建归属」段落描述同一策略（其中 `frontend--page-create-container`、`frontend--page-machine-detail-page` 已显式链接本 capability）；分包原则不再以配置长注释重复。具体 chunk 体积与警告清单属验收观测，不作为本规格固化的历史指标。

## Requirements

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

## Source references

- [vite.config.js](../../../vite.config.js)：`build.rollupOptions.output.manualChunks` 的实际分组逻辑（注释已收敛，逻辑逐字未改）。
- [src/routes/index.jsx](../../../src/routes/index.jsx)：`React.lazy`、route element 级 `Suspense` 与完整路由表。
- [src/layouts/LoginLayout.jsx](../../../src/layouts/LoginLayout.jsx)：`ModelViewer` 独立 `lazy`、`ModelStageBoundary` 局部兜底与空占位。
- [src/components/ModelViewer.jsx](../../../src/components/ModelViewer.jsx)：自身 `renderDisabled` 降级语义（未改动）。
- [package.json](../../../package.json)：`build` 只产出 `dist/` 后结束，`start` 由常驻入口提供（契约见 [frontend--production-server](../frontend--production-server/spec.md)）。
- 显式链接本 capability 的两份页面主规格：[frontend--page-create-container](../frontend--page-create-container/spec.md)、[frontend--page-machine-detail-page](../frontend--page-machine-detail-page/spec.md)。
- 页面 capability 的「构建归属」段落与本 capability 描述同一策略；具体体积/警告数字见 `openspec/changes/archive/2026-10-11-fix-web-build/chunk-policy-report.md` 与同目录实现报告，不属于本规格。