# 规格变更：独立 404 页面高度

覆盖问题：Q66。

## ADDED Requirements

### Requirement: NotFound 页面使用完整视口高度

独立 404 路由是顶层路由的兄弟，没有 `MainLayout`/导航栏祖先；`.notfound-page` SHALL 使用 `min-height: 100vh`，并可用 `100dvh` 覆盖移动端动态视口。MUST NOT 再使用 `calc(100vh - 64px)` 或 `calc(100vh - 56px)`，MUST NOT 为不存在的导航栏预留固定底部空间。

#### Scenario: 顶层未知路由无底部空隙

- **GIVEN** 用户访问不存在的顶层路由
- **WHEN** 404 页面渲染
- **THEN** 页面高度占满视口，底部没有 64px 的额外空隙

#### Scenario: 移动端视口无 56px 空隙

- **GIVEN** 移动端视口命中既有响应式断点
- **WHEN** 404 页面渲染
- **THEN** 页面使用 `100vh` 或 `100dvh`，底部没有 56px 的额外空隙
