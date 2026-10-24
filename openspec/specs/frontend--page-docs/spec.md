# Docs

## Purpose

用户操作指引、状态说明、机器与镜像说明和 FAQ。本文件是 Web chester-next 6c5f04d2a7f1 在 2026-10-11 的代码逆向基线，按页面或已有页面组件组织路由、权限、API 与状态行为。已知交互和接口差异统一见 [Global QUESTIONS](../../../../FuxiYu_Global/QUESTIONS.md)，此记录不表示对应问题已经修复。

## Requirements

### Requirement: Docs 页面入口与身份

页面 SHALL 继续通过 `/index/docs` 装配，并保留 `MainLayout`、路由级懒加载与现有身份/权限边界；页面正文 SHALL 由 `src/content/USER_GUIDE_v1.md` 的 Markdown 渲染结果提供，不得在 JSX 中保留另一份帮助正文。`src/utils/statusDisplay.js` 仍是其它页面共享的状态展示工具，MUST NOT 因 Docs 不再使用而删除。

#### Scenario: 装配页面

- **GIVEN** 用户访问 `/index/docs`
- **WHEN** `Docs` 页面完成懒加载
- **THEN** 页面在 `MainLayout` 内渲染指南中的 H1「快速开始」及正文，且不再渲染旧 JSX 的「概念卡 · 状态标签」等硬编码章节

#### Scenario: 旧正文残留被拒绝

- **GIVEN** Docs 页面、组件源码与清理集成测试可被读取
- **WHEN** 执行 Docs 清理检查
- **THEN** `Docs.jsx` 不包含旧目录数组、旅程数组或 FAQ 硬编码正文，发现残留时检查失败

### Requirement: Docs 主流程

页面 SHALL 从 Markdown 真实 AST 的 H1–H3 标题生成层级目录，并为标题分配带 `docs-` 前缀、稳定且唯一的 id；目录项 SHALL 使用原生 `button`，不得带会改变 HashRouter 路径的 `href`。目录点击 SHALL 使用 `scrollIntoView` 滚动到目标标题，不得改变 URL hash。点击后 SHALL 将焦点移至目标标题；当 `prefers-reduced-motion: reduce` 生效时，滚动 MUST 使用非平滑行为。

#### Scenario: 点击目录项

- **GIVEN** Markdown 已生成目录，页面位于 `/index/docs`
- **WHEN** 用户点击某个目录按钮
- **THEN** 对应标题获得焦点并调用 `scrollIntoView`，`window.location.hash` 保持不变，且目录内不存在 `href^="#"` 的锚点

#### Scenario: 减少动态效果

- **GIVEN** 浏览器匹配 `(prefers-reduced-motion: reduce)`
- **WHEN** 用户点击目录按钮
- **THEN** `scrollIntoView` 的 `behavior` 为 `auto`，不使用 `smooth`

#### Scenario: 标题 id 的唯一性与 AST 来源

- **GIVEN** Markdown 同时包含中文标题、行内 code、重复标题、代码围栏内的 `# 假标题` 与 H4 标题
- **WHEN** 构建目录并渲染正文
- **THEN** H1–H3 标题获得带 `docs-` 前缀且不重复的 id，代码围栏文本不进入目录，行内 code 的文本参与 id 与目录标签，代码块内文本不产生标题，且不会与页面已有 DOM id 冲突

### Requirement: Docs 构建归属

页面 SHALL 继续通过路由表的 `React.lazy` 与既有 `Suspense` 参加 Vite 构建；指南正文 MUST 通过 Vite 的 `?raw` 导入已提交的 Markdown 副本。构建 MUST 不依赖 `FuxiYu_Global` 或其它相邻仓库路径。

#### Scenario: 生成生产产物

- **GIVEN** 仅存在 Web 仓库与其 `src/content/USER_GUIDE_v1.md`
- **WHEN** 执行 `npm run build`
- **THEN** Vite 成功生成 Docs 异步 chunk，且构建产物包含指南正文

#### Scenario: 外部路径依赖被拒绝

- **GIVEN** 源码与构建配置可被引用扫描
- **WHEN** 扫描 `FuxiYu_Global`、`../Global` 或绝对 Global 路径
- **THEN** 不出现任何 Web 运行时或构建期引用

### Requirement: Docs 页面只保留生产可达资源

Docs 页面 SHALL 删除旧硬编码正文与 `src/pages/DocsJourney.css`，并删除全仓确认零引用的历史 Docs 资源；仍被其它生产页面引用的 `src/utils/statusDisplay.js` 与其它共享工具 MUST NOT 被删除。清理守护检查 MUST 能拒绝删除仍有引用的资源。

#### Scenario: 零引用资源删除且构建通过

- **GIVEN** 引用扫描确认 `DocsJourney.css` 与历史 Docs 资源零引用
- **WHEN** 删除这些文件并执行 `npm run build`
- **THEN** 生产构建通过，产物不引用已删除文件

#### Scenario: 仍被引用的 statusDisplay 保留

- **GIVEN** `ContainerDetailPage.jsx` 与 `MachineDetailPage.jsx` 仍引用 `../utils/statusDisplay`
- **WHEN** 完成 Docs 清理并执行引用扫描
- **THEN** `src/utils/statusDisplay.js` 保留，其它生产页面状态展示行为不变

#### Scenario: 有引用的资源不得删除

- **GIVEN** 新增的 Markdown 帮助样式或组件仍被 Docs 引用
- **WHEN** 对其 basename 执行零引用删除守护断言
- **THEN** 守护检查抛出“仍被引用”错误，而不是误判为可删除


### Requirement: Docs Markdown 正文字节保真

`src/content/USER_GUIDE_v1.md` SHALL 是 Global 原稿的逐字节副本（6052 字节、SHA256 `4C2DEA950538717E5608A654692B6CC8A0B61DA18F84578A6EA9735893D2BF34`），不得改动原稿词句或换行。为满足字节保真，本 change 选择对这一个内容文件设置 `-text`；该属性只关闭换行转换，是实现选择而非原稿要求。`.gitattributes` MUST 仅针对该内容文件关闭文本换行转换。

#### Scenario: 字节与哈希一致

- **GIVEN** Global 原稿和 Web 内副本同时存在
- **WHEN** 比较字节长度、SHA256 与逐字节内容
- **THEN** 长度均为 6052 字节、SHA256 相同且字节数组完全相等

#### Scenario: 换行被 Git 改写

- **GIVEN** `.gitattributes` 对该文件设置 `-text`
- **WHEN** 执行 `git check-attr text -- src/content/USER_GUIDE_v1.md`
- **THEN** 属性为 `text: unset`，Git 不对 CRLF/LF 做转换

#### Scenario: 副本内容偏离

- **GIVEN** 有人修改了 Web 内 Markdown 的任一字节
- **WHEN** 执行 Docs 清理集成检查
- **THEN** 哈希或字节长度断言失败并阻止交付

### Requirement: Docs Markdown 安全渲染与 GFM 能力

页面 SHALL 使用 `react-markdown` 与 `remark-gfm` 渲染正文，MUST NOT 使用 `rehype-raw`、`dangerouslySetInnerHTML` 或自写正文解析器。链接 MUST 沿用安全 URL 默认，外链 SHALL 增加 `noopener noreferrer`；正文内部 `#` 锚点 SHALL 被拦截并聚焦/滚动目标标题，不得写入 HashRouter 的 URL hash；原始 HTML MUST 不作为可执行标记进入 DOM。代码块 SHALL 提供复制功能：先尝试 Clipboard API，拒绝/不可用时回退到隐藏 textarea + `execCommand('copy')` 并检查布尔返回值，任一路径成功均显示「已复制」，仅两路都失败才显示「复制失败」；长代码与宽表格 MUST 在自身容器内横向滚动，不得撑破页面。正文保真指 Markdown 源文件字节；目录、复制按钮与状态反馈属于 UI chrome，不得替代字节保真检查。

#### Scenario: 安全链接与原始 HTML

- **GIVEN** Markdown 包含 HTTPS 外链、`javascript:` 链接与 `<script>` 原始 HTML
- **WHEN** 渲染 Markdown
- **THEN** 外链带 `rel="noopener noreferrer"`，危险 URL 不保留 `javascript:` 协议，原始 HTML 不生成 `<script>` 元素

#### Scenario: 正文内部锚点保持 HashRouter

- **GIVEN** Markdown 包含指向 `#docs-安装` 的内部锚点与一个不存在的目标
- **WHEN** 用户点击内部锚点
- **THEN** 存在的目标标题获得焦点并滚动，`window.location.hash` 保持不变；不存在的目标也不写入 hash

#### Scenario: GFM 表格与代码块

- **GIVEN** Markdown 包含 GFM 表格与带语言标记的代码围栏
- **WHEN** 渲染正文
- **THEN** 生成表格与 `pre code` 结构，表格位于可横向滚动的局部容器中

#### Scenario: 复制代码成功与失败

- **GIVEN** 代码块已渲染，Clipboard API 与 `execCommand` 可分别模拟成功/失败
- **WHEN** 用户点击复制
- **THEN** Clipboard 成功或 Clipboard 拒绝但回退成功时复制完整代码并显示「已复制」；仅两路均失败时显示「复制失败」且页面不崩溃

### Requirement: Docs 阅读布局与响应式目录

桌面 SHALL 呈现限宽白底正文与右侧粘性分级目录组成的轻量两栏布局；宽度不大于 1024px 时 SHALL 改为单栏，并将目录折叠为可通过摘要展开的 `details` 控件。页面 MUST 在 320、390、768、1440 像素宽度下不产生正文级横向溢出，Docs 局部 MUST 使用 `border-box` 统一盒模型，MUST NOT 用 `overflow-x: hidden` 掩盖溢出；移动端标题定位 MUST 考虑 56px 固定顶栏。移动端选择目录项时 SHALL 先折叠目录，再在下一帧聚焦/滚动，避免折叠引起的高度变化导致目标偏移。帮助页 SHALL 仅在 TOC、代码块、表格等局部交互容器拦截 `touchstart`/`touchend` 冒泡，MUST NOT 修改 `MainLayout` 的全局滑动手势，也不得阻止纵向滚动或点击默认行为。

#### Scenario: 桌面两栏与移动折叠

- **GIVEN** 分别在 1440px 与 390px 视口打开 Docs
- **WHEN** 检查目录容器与正文
- **THEN** 桌面目录为正文右侧的非折叠粘性侧栏且正文为限宽白底卡片，移动端目录为默认折叠的 `details` 控件

#### Scenario: 窄屏横向溢出防护

- **GIVEN** 页面含长代码行与宽 GFM 表格
- **WHEN** 在 320、390、768 或 1440px 视口查看
- **THEN** 页面正文宽度不超过视口，横向滚动只发生在代码块/表格的局部容器，且样式未使用 `overflow-x: hidden` 隐藏问题

#### Scenario: 移动端标题定位

- **GIVEN** 视口宽度不大于 768px，且顶部 56px 导航为 fixed
- **WHEN** 点击目录跳转到标题
- **THEN** 标题的 `scroll-margin-top` 至少为 56px，标题不会被固定顶栏遮挡

#### Scenario: 移动端先折叠再定位

- **GIVEN** 移动端目录展开，用户选择一个标题
- **WHEN** 点击目录按钮
- **THEN** `details` 先关闭，随后在下一帧聚焦目标标题并调用 `scrollIntoView`；目标 id 仍带 `docs-` 前缀

#### Scenario: 帮助页滑动手势隔离

- **GIVEN** `MainLayout` 在 `.main-content` 上监听 `touchstart`/`touchend`，帮助页含 TOC、代码块与表格
- **WHEN** 触摸手势从这些局部交互容器起手
- **THEN** 事件在局部 `stopPropagation()`，父级手势处理不被调用，且不 `preventDefault`；从正文空白处起手的事件仍正常冒泡
