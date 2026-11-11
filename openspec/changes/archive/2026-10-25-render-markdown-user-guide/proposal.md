# Proposal

## Why

Web 的 `/index/docs` 原先由 `Docs.jsx` 内大量 JSX 常量和手工目录维护，正文与相邻 `FuxiYu_Global` 仓库中的用户指南形成两个事实源：指南更新需要同步修改前端，文案、锚点与状态说明容易漂移。把已定稿的 Markdown 指南作为 Web 内唯一正文源，可以让帮助内容只维护一份，同时保留现有路由、布局与共享工具。

## What Changes

- 把已定稿的 `USER_GUIDE_v1.md` 按字节复制到 `src/content/USER_GUIDE_v1.md`，通过 Vite `?raw` 进入前端构建；Web 构建不再依赖相邻 Global 仓库。
- 使用 `react-markdown` 与 `remark-gfm` 渲染指南，保留安全 URL 默认，外链附加安全的 `rel`，正文内部锚点不写入 HashRouter 的 URL hash。
- 从真实 Markdown AST 的 H1-H3 标题生成侧边分级目录，使用带 `docs-` 前缀的稳定唯一 id 和原生 `button`；支持焦点、减少动态效果与移动端折叠。
- 采用限宽白底正文与右侧粘性目录组成的桌面两栏布局，窄屏改为单栏折叠目录；长代码和宽表格只在自身容器内横向滚动。
- 帮助页仅在 TOC、代码块和表格等局部容器隔离 `MainLayout` 的横滑手势，不修改全局手势；代码块提供可用的复制反馈。
- 删除旧 JSX 正文与 `DocsJourney.css`，更新 Docs 专项测试和清理集成检查，保留其它页面仍在使用的 `statusDisplay`。
- 增加 `react-markdown`、`remark-gfm`、`unified`、`remark-parse` 依赖。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `frontend--page-docs`: 正文源、目录、渲染安全、阅读布局与清理守护从 JSX 静态页面改为 Markdown 帮助页；路由、权限和共享状态工具行为不变。

## Impact

- 页面与组件：`src/pages/Docs.jsx`、`src/components/docs/`、`src/utils/markdownToc.js`。
- 内容与构建：`src/content/USER_GUIDE_v1.md`、`.gitattributes`、`package.json`、`package-lock.json`。
- 测试：`src/test/Docs*.test.jsx`、`scripts/tests/docs-cleanup.integration.mjs`。
- 删除：`src/pages/DocsJourney.css`；`Docs.jsx` 旧正文不再保留。
- 不修改：`src/routes/index.jsx`、`src/layouts/MainLayout.*`、`src/utils/statusDisplay.js`、Global 仓库、生产环境。
- 交付边界：主规格同步、归档、提交与真实浏览器视觉验收由父级在独立复审通过后完成；本次文档归一化不重做这些动作。
