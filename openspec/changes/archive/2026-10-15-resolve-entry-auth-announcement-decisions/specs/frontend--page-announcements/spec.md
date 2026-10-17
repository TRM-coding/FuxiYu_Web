## MODIFIED Requirements

### Requirement: Announcements 主流程

页面 SHALL 分别查询公告和当前用户私有草稿，解析用户、机器、容器或全员目标人数；POST batch-send 立即返回 announcement_ids，后台状态轮询反馈成功失败。发送 SHALL 使用草稿独立内容，无需原模板存在；后端拒绝他人的草稿操作时 SHALL 显示拒绝而不展示成功。

#### Scenario: 后台尚未完成发送
- **WHEN** 后台尚未完成发送
- **THEN** 以 SENDING 和计数呈现进度，不把受理响应作为全部邮件已投递

#### Scenario: 草稿无模板
- **WHEN** 用户发送由模板填充后独立保存、且原模板已删除的草稿
- **THEN** 按已保存内容和目标发送，不要求重新选择模板
