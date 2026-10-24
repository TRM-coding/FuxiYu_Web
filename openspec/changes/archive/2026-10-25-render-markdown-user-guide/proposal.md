## Why

Web 的 `/index/docs` 目前由 `Docs.jsx` 内的大量 JSX 常量和手工目录维护，正文与 `FuxiYu_Global` 的用户指南形成两个事实源：指南更新需要同步改前端，文案、锚点与状态说明容易漂移。需要把已定稿的 Markdown 指南作为 Web 内唯一正文源，以字节级副本进入前端构建，同时保留现有路由、布局与共享工具。

## What Changes

- 将 `E:/AI/Fuxi/FuxiYu_Global/USER_GUIDE_v1.md`（6052 字节，SHA256 `4C2DEA...BF34`）按字节复制为 `src/content/USER_GUIDE_v1.md`，通过 Vite `?raw` 导入；Web 构建不再依赖相邻 Global 仓库。
- 为满足字节保真，对这一个内容文件选择 `-text` 的 `.gitattributes` 规则（实现选择，不是原稿要求），避免 Git 对 CRLF/LF 做换行转换；不修改 Global 仓库中的任何文件。
- 使用 `react-markdown` + `remark-gfm` 渲染指南，不引入 `rehype-raw`、`dangerouslySetInnerHTML` 或另一套 Markdown 解析器；保留 URL 安全默认，外链附加安全 `rel`，正文内部 `#` 锚点拦截并用 `scrollIntoView`/焦点处理，不写 HashRouter hash。
- 从真实 Markdown AST 的 H1–H3 标题生成侧边层级目录，生成带 `docs-` 前缀的稳定唯一标题 id；目录项使用原生 `button`，点击使用 `scrollIntoView`，不产生可改变 HashRouter 路径的 `href`，并处理焦点与 `prefers-reduced-motion`。
- 采用轻量两栏桌面布局：限宽白底正文 + 右侧粘性分级目录；窄屏为单栏折叠目录。Docs 局部统一 `border-box`，长代码和表格只在自身容器内横向滚动，适配 320/390/768/1440，不用 `overflow-x: hidden` 掩盖溢出。
- TOC、代码块与表格在局部拦截 `touchstart`/`touchend` 冒泡，避免被 `MainLayout` 横滑手势误判；不修改全局手势或阻止纵向滚动。
- 代码块提供可用的复制反馈（Clipboard 失败时回退并检查结果）；正文不再在 JSX 中复制，旧 `Docs.jsx` 硬编码正文与 `DocsJourney.css` 删除。
- 保留 `Docs` 路由、`/index/docs`、`MainLayout` 布局与 `statusDisplay` 共享工具；更新 Docs 专项测试与清理集成检查，使其验证新职责而非旧正文；新样式路径固定为 `src/components/docs/MarkdownGuide.css`。
- 增加渲染与依赖：`react-markdown`、`remark-gfm`、`unified`、`remark-parse`（后两者是 react-markdown 同一 remark AST 解析链的直接依赖，用于目录提取）。

**BREAKING**：无后端 API、路由或权限行为变更；不修改 Global 原稿内容。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `frontend--page-docs`: 正文源、目录、渲染安全、布局响应式与清理守护从 JSX 静态页面改为 Markdown 帮助页。

## Impact

- 页面与组件：`src/pages/Docs.jsx`、`src/components/docs/`、`src/utils/markdownToc.js`。
- 内容与构建：`src/content/USER_GUIDE_v1.md`、`.gitattributes`、`package.json`、`package-lock.json`。
- 测试：`src/test/Docs*.test.jsx`、`scripts/tests/docs-cleanup.integration.mjs`。
- 删除：`src/pages/DocsJourney.css`；`Docs.jsx` 旧正文不再保留。
- 不修改：`src/routes/index.jsx`、`src/layouts/MainLayout.*`、`src/utils/statusDisplay.js`、Global 仓库、生产环境。
- 交付边界：本实现不自行同步主规格、不归档、不提交；主规格同步与归档由父级在独立复审通过后执行。
- 验证：Web 单测、Docs 清理集成、lint、生产构建；真实浏览器与视觉验收由父级独立执行。
