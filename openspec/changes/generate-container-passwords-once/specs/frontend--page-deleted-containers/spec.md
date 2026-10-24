## ADDED Requirements

### Requirement: 恢复成功后的 root 凭据展示

DeletedContainers 实际恢复成功且响应 `accepted: true` 与恰好一项 root 凭据时，页面 SHALL 最小复用 `CredentialModal` 展示该密码，MUST NOT 丢失恢复成功返回的密码。`requires_choice: true` 的响应 SHALL 绕过凭据解析并 SHALL NOT 展示密码弹窗。失败、异常或凭据非法时 MUST NOT 展示密码，且 MUST NOT 把 `err.body`/原始响应 JSON 交给 `showErrorModal` 或 console；安全 message 可保留。不得改变恢复其他业务规则、页面布局、列表/分页或既有恢复流程。

#### Scenario: 恢复成功展示 root 密码

- **GIVEN** 用户确认恢复一个可恢复容器
- **WHEN** Ctrl 返回 `accepted: true` 与一项 `login_name=root` 的凭据
- **THEN** 页面复用同一受控密码弹窗展示该项，文案为“重置后root的密码：”；恢复其他业务与页面布局不变

#### Scenario: requires_choice 不展示密码

- **GIVEN** 恢复响应 `requires_choice: true`，尚未实际恢复
- **WHEN** 页面处理响应
- **THEN** 不打开密码弹窗、不展示任何密码；仍按既有二选一流程处理

#### Scenario: 恢复失败或凭据非法

- **GIVEN** 恢复失败，或 `accepted: true` 但凭据缺失/字段非法，且失败响应可能夹带 secret
- **WHEN** 页面处理结果
- **THEN** 不展示密码，不改变恢复其他业务；不把 `err.body`/原始 JSON 交给 `showErrorModal` 或 console，只显示安全 message 或响应异常提示
