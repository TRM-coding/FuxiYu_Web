## Why

注册验证码入口需要清晰说明已注册邮箱及发送冷却。

## What Changes

- 显示已注册邮箱和请求过于频繁的中文提示。
- 依据后端返回的该邮箱剩余冷却秒数显示倒计时，期间拦截相同邮箱的重复点击。

## Capabilities

### Modified Capabilities

- `frontend--page-register`: 展示验证码请求拒绝原因。

## Impact

注册页增加按邮箱管理的临时倒计时状态，并消费 Ctrl 的剩余冷却时间；不新增持久化。
