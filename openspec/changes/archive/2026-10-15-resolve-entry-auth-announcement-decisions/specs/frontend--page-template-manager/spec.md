## MODIFIED Requirements

### Requirement: TemplateManager 主流程

页面 SHALL 维护 name/category/description/subject_template/body_template，保留 SYSTEM 模板删除保护及转模板来源追溯。自定义模板 SHALL 可删除，旧草稿或公告的模板引用由后端解除，已有正文和投递记录不随模板删除改变。

#### Scenario: 删除已经被公告或草稿引用的自定义模板
- **WHEN** 删除已经被公告或草稿引用的自定义模板
- **THEN** 删除成功后刷新模板列表，相关草稿及公告仍使用各自保存的内容，不要求先删除草稿
