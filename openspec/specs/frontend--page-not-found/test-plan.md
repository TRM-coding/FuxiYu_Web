# frontend--page-not-found Test Plan

Spec: [spec.md](spec.md)

## Current Mapping

### Requirement: NotFound 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] `src/test/routeLoading.test.jsx::未匹配路径仍落到 404 路由`
- Assertion scope: 真实 `AppRoutes` + `PermissionProvider` 访问 `/definitely-missing`，懒加载后渲染「页面走丢了」与「404」，证明 `*` 路由装配 NotFound。
- Coverage note: 未断言「无 API 请求或额外页面权限」；页面实现无数据请求，测试未显式断言。

### Requirement: NotFound 主流程

#### Scenario: 访问未匹配路由

- Test/check:
  - [X] `src/test/routeLoading.test.jsx::未匹配路径仍落到 404 路由`
  - [X] `src/test/AnvilTableSettings.test.jsx::anvil_ts_notfound_home_navigation`
- Assertion scope: 既有测试断言未知路径显示「页面走丢了」与「404」；规划测试点击「回到主页」，断言导航到 `/index` 并渲染目标占位内容。
- Coverage note: 规划测试，未创建；既有测试未点击返回按钮。

### Requirement: NotFound 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] `npm run build`
- Assertion scope: `vite build` 退出码 0，构建完成并生成 `dist`。
- Coverage note: 只证明构建成功与产物生成；不自动断言 `NotFound`/`ModelViewer` 独立 chunk、`vendor-three-*` 分组或 Rollup 警告清单，这些是产物人工核对/验收观测，不由命令退出码证明。

### Requirement: NotFound 页面使用完整视口高度

#### Scenario: 顶层未知路由无底部空隙

- Test/check:
  - [ ] `npm run dev`
- Assertion scope: 人工在 Chromium 1440×900 打开 HashRouter 实际地址 `https://localhost:5173/#/definitely-missing`（路径 `/definitely-missing`），等待 `NotFound` 渲染。读取 `document.querySelector('.notfound-page')`，断言 `page.getBoundingClientRect().height >= window.innerHeight`、`page.getBoundingClientRect().bottom >= window.innerHeight - 1`（页面底边不高于视口底边，即无 64px 底部空隙）、`parseFloat(getComputedStyle(page).minHeight) >= window.innerHeight`（computed 值为 px，不比较 `100vh`/`100dvh` 字符串）、`document.documentElement.scrollHeight >= window.innerHeight`（页面覆盖视口）。`scrollHeight` 可因内容/盒模型略大于视口，不用“必须等于视口”误判底部空隙。
- Coverage note: 现有 `notFoundLayout.test.js::test_q66_notfound_full_viewport` 只读 CSS 源字符串，按本轮规则不能作为真实视口证据；jsdom 无布局，故只规划人工浏览器检查，不新建机械 CSS 文本测试。

#### Scenario: 移动端视口无 56px 空隙

- Test/check:
  - [ ] `npm run dev`
- Assertion scope: 人工在 Chromium 390×844 与 320×568 打开 `https://localhost:5173/#/definitely-missing`（路径 `/definitely-missing`），重复上述 px 测量：`page.getBoundingClientRect().height >= window.innerHeight`、`page.getBoundingClientRect().bottom >= window.innerHeight - 1`、`parseFloat(getComputedStyle(page).minHeight) >= window.innerHeight`、`document.documentElement.scrollHeight >= window.innerHeight`；断言无 56px/64px 底部空隙，404 文案与「回到主页」按钮可见。
- Coverage note: 现有 `notFoundLayout.test.js::test_q66_notfound_mobile_no_gap` 只读 CSS 源字符串，不作为真实视口证据；jsdom 无布局，故只规划人工浏览器检查。
