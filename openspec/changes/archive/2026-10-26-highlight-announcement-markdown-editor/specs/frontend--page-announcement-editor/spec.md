# Spec Delta

## ADDED Requirements

### Requirement: AnnouncementEditor Markdown 正文源码高亮

公告正文编辑区 SHALL 以纯文本 Markdown 源码模式显示正文，并对标题、粗体/斜体、链接、有序/无序列表标记、行内代码与围栏代码等源码语法着色。高亮 SHALL 仅影响显示样式；正文 MUST NOT 被渲染为 Markdown 预览或 HTML，也 MUST NOT 因此新增工具栏、富文本编辑状态或后端转换接口。

#### Scenario: 源码标记按类别着色

- **GIVEN** 正文同时包含标题、粗体、链接、列表、行内代码和围栏代码
- **WHEN** 公告编辑器显示该正文
- **THEN** 对应源码标记与内容按不同语法类别着色，Markdown 原字符仍可见，编辑器中的正文与输入原文一致

#### Scenario: 原始 HTML 与 Markdown 不做渲染转换

- **GIVEN** 正文包含 HTML 标签、HTML 实体或 Markdown 语法
- **WHEN** 用户查看或编辑正文
- **THEN** 编辑器只显示着色后的源码文本，不生成标题、链接、粗体等 HTML 节点，不解码或改写 HTML 实体，保存内容仍为原文

#### Scenario: 模板与草稿载入后保留原文

- **GIVEN** 用户选择模板或打开已有草稿
- **WHEN** 模板正文或草稿内容进入编辑区
- **THEN** 编辑器显示与来源正文完全一致的原文并重新应用语法高亮；加载过程不改写正文，也不执行模板变量替换

### Requirement: AnnouncementEditor Markdown 编辑器输入与可访问性

公告正文编辑器 SHALL 以受控方式同步正文，用户编辑 SHALL 支持撤销/重做与中文 IME。编辑器 SHALL 可通过键盘聚焦、具备可访问的多行文本框语义，并 MUST NOT 将 Tab 截为缩进。

#### Scenario: 用户编辑可撤销和重做

- **GIVEN** 用户已在编辑器中修改正文并保持焦点
- **WHEN** 用户执行撤销快捷键，随后执行重做快捷键
- **THEN** 正文先恢复到上一编辑状态，再恢复被撤销的修改，编辑器内容与受控正文状态保持一致

#### Scenario: 键盘可访问性与中文 IME

- **GIVEN** 用户仅使用键盘或使用中文输入法
- **WHEN** 用户聚焦正文编辑区并输入中文，或按 Tab 离开编辑区
- **THEN** 编辑器具有可访问的名称和多行文本框语义，Tab 不被截为缩进；IME 组合输入不丢字、不重复提交组合中间态，完成后的正文按原文参与保存

## MODIFIED Requirements

### Requirement: AnnouncementEditor 光标插入保留原选区

插入操作 SHALL 在 Markdown 源码编辑器主选区变化时缓存起止偏移，点击插入按钮导致编辑器失焦时仍使用缓存选区，并将偏移钳制到当前正文长度；MUST NOT 因按钮获得焦点而追加到文本末尾。插入完成后 SHALL 用插入文本替换目标选区，将主选区折叠到插入内容末尾，并把焦点还给编辑器。

#### Scenario: 保持焦点时替换选区

- **GIVEN** Markdown 源码编辑器保持焦点且用户选中一段文本
- **WHEN** 点击插入按钮
- **THEN** 插入内容替换该选区，主选区折叠到插入内容末尾且焦点回到编辑器

#### Scenario: 按钮夺焦后仍插入原选区

- **GIVEN** Markdown 源码编辑器有选区，随后焦点移动到插入按钮
- **WHEN** 点击插入按钮
- **THEN** 内容仍写入失焦前缓存并钳制到当前正文长度的选区，不追加到文本末尾
