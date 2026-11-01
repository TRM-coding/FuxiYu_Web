## MODIFIED Requirements

### Requirement: Register 主流程

页面 SHALL 申请验证码后提交 username/password/email/graduation_year/registration_code，分别呈现前端校验与后端具体错误。注册失败 SHALL 保持页面与可修正输入，允许在验证码有效期内修正后重试；MUST NOT 因一次注册冲突强制认定验证码已消费。过期或错误验证码仍按后端响应处理。

#### Scenario: 验证码验证失败或注册冲突
- **WHEN** 验证码验证失败或注册冲突
- **THEN** 保持页面并显示具体失败；冲突不消耗有效验证码，用户可修正输入后重试
