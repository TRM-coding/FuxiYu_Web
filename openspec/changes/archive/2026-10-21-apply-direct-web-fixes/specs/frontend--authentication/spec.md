# 规格变更：权限查询控制器释放

覆盖问题：Q27。

## ADDED Requirements

### Requirement: 权限查询必须在 finally 注销控制器

`getUserPermissions` SHALL 在成功、异常和 401 三条路径都通过 `finally` 调用 `unregisterController(controller)` 并清理超时计时器；MUST NOT 只在成功路径注销，也 MUST NOT 因重复注销抛错。挂载、登录刷新或组件卸载触发的权限查询 SHALL 使用同一释放语义，已完成控制器不得留在全局集合中。

#### Scenario: 成功返回后释放控制器

- **GIVEN** 权限查询成功返回并解析出 `entities`、身份和资源位
- **WHEN** 请求流程结束
- **THEN** 该控制器已从请求管理器注销，连续多次成功查询不会增加已完成控制器数量

#### Scenario: 401 或异常返回后释放控制器

- **GIVEN** 权限查询返回 401 或网络异常
- **WHEN** 调用方捕获错误
- **THEN** 该控制器仍已在 `finally` 中注销，超时计时器被清理，错误按既有 401/异常语义继续向上传递

#### Scenario: 连续查询不积累控制器

- **GIVEN** 页面连续触发多次权限查询
- **WHEN** 所有查询分别成功、失败或超时结束
- **THEN** 全局控制器集合不保留任何已完成项，后续 `abortAll` 只处理真正在途的请求
