# 规格变更：注册页校验配置与错误映射

覆盖问题：Q36、Q37。

## ADDED Requirements

### Requirement: Register 删除无效 validateMessages 配置并保留字段规则

注册页 SHALL 删除全局 `validateMessages` 配置及 `<Form validateMessages={...}>` 传参；这些配置被各字段规则显式 `message` 覆盖，不参与实际校验结果。删除后 MUST 保留字段规则原有中文提示，MUST NOT 改变用户名、邮箱、密码等校验条件。

#### Scenario: 非法用户名仍显示字段规则消息

- **GIVEN** 用户提交包含非法字符的用户名
- **WHEN** 表单校验失败
- **THEN** 仍显示字段规则原有的具体中文提示，清理全局配置不改变结果

#### Scenario: 源码不再配置 validateMessages

- **GIVEN** 检查 `src/pages/Register.jsx`
- **WHEN** 搜索 `validateMessages`
- **THEN** 不再存在全局配置或 `Form` 传参，字段规则显式消息仍在

### Requirement: Register 注册与验证码错误按现有协议映射

注册与请求验证码调用 SHALL 把包含 `status`、`error_reason` 的 `err.body || err` 对象、`status` 和 `route` 传给 `showErrorModal`，MUST NOT 只传字符串；映射 SHALL 仅使用 Ctrl 当前已存在的 `error_reason`，MUST NOT 新增后端字段、错误码或接口。具体 route/error_reason 与期望中文见首个场景的映射表。

#### Scenario: 请求验证码域名被拒展示中文

- **GIVEN** `/request_register_code` 返回下表中的原因
- **WHEN** 页面展示错误
- **THEN** 弹窗显示表内中文，不显示后端英文原因

| route | error_reason | 期望中文 |
| --- | --- | --- |
| `/register` | `username_exists` | 用户名已存在 |
| `/register` | `email_exists` | 邮箱已存在 |
| `/register` | `invalid_username` | 用户名仅允许英文、数字和下划线 |
| `/register` | `no_none_ascii` | 禁止非ASCII字符（请勿输入中文） |
| `/register` | `registration_code_required` | 请填写注册验证码 |
| `/register` | `registration_code_invalid` | 注册验证码无效或已过期 |
| `/register` | `mail_send_failed` | 验证邮件发送失败 |
| `/register` | `email_domain_not_allowed` | 该邮箱域名不允许注册 |
| `/request_register_code` | `missing_email` | 请输入邮箱 |
| `/request_register_code` | `email_domain_not_allowed` | 该邮箱域名不允许注册 |
| `/request_register_code` | `mail_send_failed` | 验证邮件发送失败 |
| `/request_register_code` | `code_creation_failed` | 验证码生成失败，请稍后重试 |

#### Scenario: 注册验证码必填或失效展示中文

- **GIVEN** `/register` 返回 `registration_code_required` 或 `registration_code_invalid`
- **WHEN** 页面展示错误
- **THEN** 分别显示“请填写注册验证码”或“注册验证码无效或已过期”，不落到“未收录的错误原因”

#### Scenario: 注册调用点传递结构化对象

- **GIVEN** 注册或请求验证码失败，`err.body` 含 `error_reason`，`err.route` 为实际请求路径
- **WHEN** 调用 `showErrorModal`
- **THEN** 调用参数保留对象、状态与路由，使路由映射可命中，而不是只传 `err.message` 字符串
