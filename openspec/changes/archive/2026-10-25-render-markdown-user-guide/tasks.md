## 1. 字节源与 Git 保护

- [x] 1.1 写失败测试 `test_q36_docs_guide_bytes_are_source_faithful`、`test_q36_docs_gitattributes_preserve_guide_bytes`，确认旧仓库在内容缺失/属性缺失时红灯
- [x] 1.2 按字节复制 Global 指南到 `src/content/USER_GUIDE_v1.md`，并只在 `.gitattributes` 增加该路径的 `-text`
- [x] 1.3 重跑字节测试与 `git check-attr`，确认 6052 字节、CRLF、SHA256 和 `text: unset` 一致

## 2. AST 目录与页内导航

- [x] 2.1 写失败测试：H1–H3 层级、中文/重复/行内 code/代码围栏假标题、`docs-` 唯一 id、无 href 目录 button、焦点/hash/reduced-motion
- [x] 2.2 实现 `src/utils/markdownToc.js` 的真实 remark AST 提取、标题 id 插件与 `MarkdownGuide` 目录按钮
- [x] 2.3 重跑目录/导航测试，确认 0 failure 并保持桌面/移动两套目录结构

## 3. Markdown 渲染、安全与复制

- [x] 3.1 写失败测试：GFM 表格、危险协议、外链 rel、原始 HTML、内部锚点、复制成功/失败
- [x] 3.2 接入 `react-markdown` + `remark-gfm` 与安全组件；实现外链 rel、内部锚点拦截、局部表格/代码容器
- [x] 3.3 补齐 Clipboard 成功、Clipboard 拒绝 + `execCommand` 回退成功、两路失败三类测试并全部转绿

## 4. 响应式布局、盒模型与触摸隔离

- [x] 4.1 写失败测试：桌面目录/移动 details、先折叠再 RAF 定位、TOC/代码/表格冒泡隔离
- [x] 4.2 实现右侧粘性目录、单栏折叠、Scoped `border-box`、移除横向溢出的内容盒根因（不使用 `overflow-x: hidden`）
- [x] 4.3 在 TOC、代码块、表格局部 `stopPropagation()`，不修改 `MainLayout`，不阻止默认滚动；补内部锚点 fixture
- [x] 4.4 用真实浏览器验证 1440/1201/1024/768/390/320 的文档宽度、正文限宽、顶栏偏移、焦点、hash、复制，并保存外部截图/JSON

## 5. Docs 装配与旧契约清理

- [x] 5.1 写失败测试 `test_q36_docs_old_hardcoded_body_removed`、零引用、`statusDisplay` 保留与引用守护
- [x] 5.2 将 `Docs.jsx` 缩为 Markdown 装配壳，删除 `DocsJourney.css`，不保留旧正文/旧 CSS
- [x] 5.3 重写 `scripts/tests/docs-cleanup.integration.mjs`，使其验证哈希、属性、无 Global 依赖、新 CSS 契约和共享工具保留

## 6. 交付验证与移交

- [x] 6.1 运行定向 Web 测试 16/16、Docs 集成 8/8、`npm run lint` 0 problems
- [x] 6.2 运行 `npm run build`，确认 Docs 异步 chunk 与 CSS 产物生成成功
- [x] 6.3 记录 harness 中断的 `full-npm-test.log`（未重启整套），以定向测试 + lint + build + 真实浏览器证据完成本轮 verify；不伪造全量通过
- [x] 6.4 生成 `review.md`、`test-plan.md`、`tasks.md`、`verify.md`；保留可审查状态

## 7. 父级门禁（不勾选，不属本实现）

- 暂存 blob 字节校验、独立复审确认、主规格同步、archive 与 commit 由父级执行。
