## MODIFIED Requirements

### Requirement: AnnouncementEditor 主流程

编辑器 SHALL 选模板填充主题正文并保留属性插入功能，保存 title、content、raw_content 等独立草稿内容，MUST NOT 保存有效 template_id 关联。模板仅提供编辑初值，不执行模板变量替换引擎；加载已有草稿 SHALL 优先恢复已保存内容，不重新套用模板。草稿操作 SHALL 遵循创建者私有边界。

#### Scenario: 保存草稿成功
- **WHEN** 创建者保存草稿成功
- **THEN** 保留 draft_id 和编辑内容，可继续编辑或进入发送列表；下拉分页与插入光标问题仍单独登记

#### Scenario: 清空模板选择
- **WHEN** 用户选模板后编辑正文再清空模板选择并保存
- **THEN** 保存当前编辑内容，不保留模板关联，不因清空选择丢弃正文

#### Scenario: 模板变化后打开草稿
- **WHEN** 原模板已修改或删除，用户打开之前保存的草稿
- **THEN** 恢复草稿自身的内容，不因历史模板 id 再次请求或覆盖正文
