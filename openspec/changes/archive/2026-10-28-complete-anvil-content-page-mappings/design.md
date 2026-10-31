# Design

## Context

本 change 覆盖三个已有前端 capability：`frontend--page-announcement-editor`（8 Requirement / 20 Scenario）、`frontend--page-template-manager`（5 / 9）、`frontend--page-docs`（7 / 22），合计 51 个 Scenario。主规格、主侧车和既有测试都已存在，本 change 只做 Scenario→Test/check 对账，不改变业务行为。

现有测试分三层：`src/test/*.test.jsx` 的 Vitest + jsdom 组件/路由测试；`scripts/tests/docs-cleanup.integration.mjs` 的 node:test 清理与文件/配置检查；以及 `npm run build` 的生产构建检查。页面测试通过 mock 外部 API 模块、`antd.message` 和错误弹窗边界来驱动真实页面组件；jsdom 不能提供真实布局几何、真实中文 IME 或真实浏览器滚动行为。

主侧车已经记录了多数映射，但部分 `[X]` 只到测试名或间接路径，不能证明 Scenario 的全部 THEN；本轮必须逐段读取真实断言后再确认。入口装配、保存草稿后的 draft_id 延续、清空模板后保存、模板变化后的草稿恢复、含占位符的模板变量替换、机器切换后的容器实际选择、旧响应加载态、系统模板/未知原因的真实弹窗、Docs 路由装配、`pre > code` 结构、复制回退完整文本、移动目录下一帧顺序和触摸 `preventDefault` 边界仍缺直接断言。

## Goals / Non-Goals

**Goals:**

- 为 51 个 Scenario 建立逐条可核对的 Test/check 行、Assertion scope 和必要的 Coverage note。
- 只把已从测试代码确认的既有测试标为 `[X]`；缺口测试统一规划到 `src/test/AnvilContentPages.test.jsx`，本阶段不创建。
- 明确区分自动化测试、构建/清理检查和真实可复现的人工检查，写清各自能证明和不能证明的范围。
- 保持 delta 为主规格 Requirement 的逐字 MODIFIED no-op，不向主规格或 sidecar 写入测试说明。

**Non-Goals:**

- 不修改 `src/**`、既有测试、共享 fixture、主规格、主侧车、默认 schema、配置、依赖、CI、数据库或 secrets。
- 不执行 apply、不创建测试文件、不写 tasks/review，不运行测试或构建，不提交、不部署、不删除任何文件。
- 不把源码字符串、反射或测试名当作运行时行为的证明；不新增机械规则文本测试。
- 不替父代理决定真实业务矛盾；发现规格与实现的边界时只报告。

## Decisions

### D1: Delta 逐字 no-op

三个 delta 文件只包含 `# Spec Delta`、`## MODIFIED Requirements` 和原主规格从第一个 `### Requirement:` 到最后一个 Scenario 的完整块。文件不插入 Coverage note、测试说明、Purpose 或新 Scenario；逐行比较主规格块与 delta 块的差异为 0。

### D2: `[X]` 的证据标准

`[X]` 只表示 locator 存在且其断言已从测试代码逐段核对，不表示本轮运行、通过或整个 Scenario 已覆盖。测试名不作为证据；Assertion scope 写实际断言到的 DOM、API 参数、payload、事件、命令或文件条件。若 Scenario 的 THEN 只被部分断言，保留 `[X]` 的既有部分，并在 Coverage note 写清缺少的分支；可以补测的缺口另列 `[ ]` 规划测试。

### D3: 缺口测试的位置与边界

所有缺口测试落在 `src/test/AnvilContentPages.test.jsx`，由 apply 阶段创建。测试渲染真实页面、真实 `AppRoutes`、真实 `PermissionProvider`、真实 `AdminLayout`/`MainLayout`、真实 `MarkdownGuide`/`MarkdownSourceEditor`；只 mock 外部 API 模块、`antd.message` 和不属于目标行为的装饰组件。路由装配测试使用既有 `MemoryRouter` + `PermissionProvider` 模式，不靠读取 `src/routes/index.jsx` 字符串证明页面可达；真实 `PermissionProvider` 会调用 `user_api.getUserPermissions`，必须将其 stub 为已加载快照：公告/模板返回 `{ entities: ['announcement:manage'], userId: 1, userName: 'audit' }`，Docs 返回 `{ entities: [], userId: 1, userName: 'audit' }`，避免真实请求、未处理异步错误或误落 403。测试不修改既有测试、共享 fixture 或生产代码。

### D4: 规划测试清单

- AnnouncementEditor：入口在管理布局下装配；新建草稿保存后保留 draft_id 并可继续编辑；清空模板后保存仍保留正文且不带 template_id；草稿携带历史 template_id 时只恢复草稿快照；含 `{{name}}`/`{{date}}` 占位符的模板与草稿逐字保留、不执行变量替换；旧列表响应不提前结束最新加载态；旧详情响应不清空另一独立选择；机器切换后实际点击容器 B 仍保留机器 B 及其详情；Markdown 高亮补齐斜体与有序列表标记。
- TemplateManager：入口在管理布局下装配；系统模板删除失败和未登记原因通过真实 `showErrorModal` 弹窗显示中文，后者不硬套“模板名称已存在”。
- Docs：`/index/docs` 在 `MainLayout` 下装配；GFM 代码块生成 `pre > code`；Clipboard API 不可用时回退隐藏 textarea 且复制完整代码；移动端目录先关闭、下一帧再聚焦/滚动；局部触摸容器不调用 `preventDefault`，正文空白处 touchend 仍冒泡。

### D5: 程序性检查与人工检查

构建 Scenario 映射 `npm run build`，只声明构建命令成功；页面级异步 chunk 的存在/命名、`React.lazy`/`manualChunks` 的组织、chunk 体积和警告清单不由该命令自动断言，也不在本计划声称已观测。Docs 清理、字节哈希、`.gitattributes`、外部路径和零引用检查映射既有 `scripts/tests/docs-cleanup.integration.mjs` 检查，并如实限定其读文件/读配置的范围；该集成检查只读源码，不证明 dist 已消费指南正文。205 分页 Scenario 只断言请求参数与末项可选择/可打开；加载更多失败 Scenario 只断言第二次调用发生、可读错误与模板 1 仍可选，未逐项计数 200 项全部保留，不把“显示 200/5 个”写成已逐项计数。jsdom 无法证明的 320/390/768/1440 视口几何、粘性/白底视觉、56px 顶栏遮挡和中文 IME，映射为可复现的 Chrome/Edge 人工检查；CSS/配置正则 token 不等于媒体块结构或像素结果，不把它们写成自动化通过。

### D6: Test-plan 形状

按 capability → Requirement → Scenario 分组，每个 Scenario 使用 `- Test/check:` 下嵌套的独立 checkbox 行，后接 `- Assertion scope:`，必要时加 `- Coverage note:`。不写运行时间、pass/fail、覆盖数字、执行证据或状态字段；不使用宽表。

## Risks / Trade-offs

- 既有测试的范围普遍窄于 Scenario THEN，尤其是“不清空另一选择”“不提前结束加载态”“真实弹窗中文”“分页逐项计数”和“下一帧顺序”。这些以 `[ ]` 规划测试或 Coverage note 明示，不靠测试名扩大结论。卸载用例的 `console.error` 断言只覆盖指定过滤模式，不证明广义无错误。
- 既有模板/草稿 fixtures 不含 `{{name}}` 等占位符，等于固定字符串不能证明变量替换引擎未执行；计划新增独立占位符测试，不用旧 fixture 冒充覆盖。
- CSS 检查是文本 token 断言，不证明 1024px 媒体块内部单栏结构、72px 声明与 768px 媒体块/H1–H6 的关联或实际像素；这些保留为人工检查范围。
- 路由装配测试使用真实 `PermissionProvider`，若遗漏 `user_api.getUserPermissions` stub，会发真实权限请求并可能产生未处理异步错误或 403；D3 已要求三处测试显式 stub 已加载快照。
- `frontend--page-docs` 的“标题 id 不与页面已有 DOM id 冲突”现有测试只预置无前缀的 `id="快速开始"`；实现的 `usedIds` 只覆盖当前 Markdown 树，未证明页面已存在 `docs-*` id 时仍无冲突。这是规格边界而非本轮可擅自修复的实现改动，提交父代理决定。
- `frontend--page-template-manager` 的“删除被引用模板后草稿/公告仍使用各自内容”属于后端解除引用语义；Web 侧只能证明删除不被前端阻止且列表刷新，不能证明后端数据不变，计划中明确该边界。
- 构建 Scenario 的 `npm run build` 不自动断言 chunk 隔离、体积或 Rollup 警告；文档与计划只声明命令成功，不把构建产物观测或源码组织写成运行时证明。
- 本阶段不运行测试或构建，`[X]` 与人工检查均不构成执行结果；任何真实矛盾只报告，不改 app、不弱化 spec。
