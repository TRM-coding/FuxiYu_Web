# 规格变更：登录页死分支与调试输出清理

覆盖问题：Q28、Q36。

## ADDED Requirements

### Requirement: Login 删除 userMsg 死分支与调试 console 并保留结构化错误

登录页 SHALL 删除不可达的 `userMsg` 分支，以及 `console.error('Login error:', err)`、`console.log('Failed:', errorInfo)` 等仅为调试输出的调用；登录失败时 SHALL 继续把 `err.body || err`、`status` 和 `route` 传给 `showErrorModal`，MUST NOT 用本地拼接字符串覆盖后端 `error_reason`。网络失败仍 SHALL 由错误展示工具给出中文兜底。

#### Scenario: 登录失败展示后端结构化错误

- **GIVEN** 登录接口返回含 `message`、`error_reason` 的响应，且 `err.route` 为 `/login` 请求路径
- **WHEN** 页面处理登录失败
- **THEN** 错误弹窗保留结构化对象与路由，展示后端原因或既有中文映射，不再经过 `userMsg`

#### Scenario: 网络失败仍显示中文兜底

- **GIVEN** 登录请求抛出 `Failed to fetch` 或超时错误，没有 HTTP 状态与 `error_reason`
- **WHEN** 页面展示错误
- **THEN** 弹窗显示既有中文网络/超时提示，不把英文原文直接抛给用户

#### Scenario: 源码不再包含 userMsg 与调试 console

- **GIVEN** 检查 `src/pages/Login.jsx`
- **WHEN** 搜索 `userMsg` 与上述调试 console
- **THEN** 均不存在，登录错误路径仍只通过 `showErrorModal` 展示
