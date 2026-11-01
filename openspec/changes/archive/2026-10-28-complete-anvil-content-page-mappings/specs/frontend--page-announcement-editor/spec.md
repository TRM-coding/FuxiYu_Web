# Spec Delta

## MODIFIED Requirements

### Requirement: AnnouncementEditor 页面入口与身份

页面 SHALL 通过 `/admin/announcements/editor` 装配。现有身份与权限约束为：管理布局和公告 API；草稿/模板通过查询参数或页面状态加载。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `AnnouncementEditor` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

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

### Requirement: AnnouncementEditor 构建归属

页面 SHALL 通过路由表的按需加载组织参加 Vite 构建：`src/routes/index.jsx` 对页面组件与共同布局（`MainLayout`、`AdminLayout`）使用 `React.lazy` 动态导入，并在 route element 层以既有 `Suspense` 提供页面级加载反馈（仅描述当前实现，不新增加载 UI）；`LoginLayout`、路由骨架与 React 运行时随入口静态加载。`LoginLayout` 内的 `ModelViewer` 亦按需加载，three 相关代码经 `vite.config.js` 的 `manualChunks` 按依赖方向 addons → WebGL → core 分为 `vendor-three-core`、`vendor-three-webgl`、`vendor-three-addons`，均不进入入口 chunk。上述页面与 `ModelViewer` 不再与同路由树代码共同进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`src/utils/requestManager.jsx` 与 `src/utils/validateCmdArg.jsx` 统一为静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属构建验收观测，记入本轮验收报告，不作为本规格固化的历史指标

### Requirement: AnnouncementEditor 机器和容器独立选择并各自保护列表与详情请求

机器和容器是独立的公告属性选择器。机器/容器列表 SHALL 使用 `page_number=0` 与现有 `page_size=500`；容器列表请求 SHALL 使用 `machine_id:''`，MUST NOT 跟随当前机器选择过滤。机器选择变化 MUST NOT 清空或重载容器选择/列表；容器选择变化 MUST NOT 清空机器选择/详情。机器和容器各自的列表请求及 `getDetailInformation`/`getContainerDetailInformation` 详情请求 SHALL 使用各自上下文的取消或递增序号；旧响应 MUST NOT 覆盖对应选择，组件卸载后 MUST NOT 再应用任何列表或详情响应。用户列表分页口径不在本要求内，MUST NOT 一并替换。

#### Scenario: 首屏请求第 0 页

- **GIVEN** 公告编辑器首次展开机器或容器选择器
- **WHEN** 页面请求列表
- **THEN** 机器/容器列表均携带 `page_number=0`、`page_size=500`，容器列表携带 `machine_id=''`，结果按各自选择写入

#### Scenario: 机器切换保留独立容器选择

- **GIVEN** 用户已独立选择机器 A 与容器 B
- **WHEN** 用户切换到机器 C
- **THEN** 容器选择仍为 B，容器列表不按机器重载或过滤；选择器仍可独立选择其他容器，不清空机器选择

#### Scenario: 同一选择器旧列表响应晚到

- **GIVEN** 同一选择器在列表尚未加载完成时再次展开，产生后一次列表请求
- **WHEN** 前一次请求晚于后一次返回
- **THEN** 仅应用后一次列表，旧响应不覆盖选项，也不提前结束当前加载状态；机器与容器选择器各自判断请求序号

#### Scenario: 旧机器或容器详情响应晚到

- **GIVEN** 机器和容器已分别切换到当前选择，旧详情请求仍在途
- **WHEN** 旧 `getDetailInformation` 或 `getContainerDetailInformation` 响应晚于当前请求返回
- **THEN** 旧 `machineDetail`/`containerDetail` 被丢弃，各自详情仍对应当前选择，且不清空另一独立选择

#### Scenario: 卸载后旧列表或详情响应不应用

- **GIVEN** 机器或容器的列表/详情请求仍在途
- **WHEN** 公告编辑器卸载后这些响应返回
- **THEN** 不更新已卸载页面的机器/容器列表或详情，也不清空另一独立选择

### Requirement: AnnouncementEditor 模板下拉分页与编辑深链

模板下拉 SHALL 使用现有 `listTemplates` 的 `limit/offset`：首批 `limit=200&offset=0`，加载更多使用 `offset=200`，使 205 个模板中的第 205 个可选；MUST NOT 新增接口或提高单次 `limit` 超过 200。点击“编辑此模板”SHALL 跳转到 `/admin/announcements/templates?template_id=<id>`，由模板管理页按 ID 打开编辑内容。

#### Scenario: 205 个模板可加载到第 205 个

- **GIVEN** 后端返回 205 个模板
- **WHEN** 用户在下拉中加载更多
- **THEN** 首批显示 200 个，第二批以 `offset=200` 取回 5 个，第 205 个模板可选择

#### Scenario: 编辑此模板携带模板 ID

- **GIVEN** 用户选中一个模板并点击“编辑此模板”
- **WHEN** 路由跳转
- **THEN** 目标地址包含 `template_id=<该模板 ID>`，不丢失模板标识

#### Scenario: 加载更多失败保留已加载项

- **GIVEN** 首批 200 个模板已加载
- **WHEN** `offset=200` 的加载更多请求失败
- **THEN** 已加载的 200 个选项保留，页面显示可读错误，不把列表清空

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
