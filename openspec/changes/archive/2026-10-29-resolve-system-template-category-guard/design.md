# Design

## Context

Q51 的现状已核实：`src/pages/TemplateManager.jsx` 的 `openEdit` 会把 `template.category` 填入表单，类别 Select 无条件渲染且未设置 `disabled`；`handleSave` 无论新建或编辑都会把 `category` 放进 payload。列表中的删除入口按当前卡片 `category === 'system'` 隐藏，因此 system→custom 成功后会出现删除入口。Ctrl 当前 `update_template` 接受 `category`，删除保护只在删除当刻检查 `category`；Ctrl 将新增 HTTP 400 `error_reason=cannot_change_system_template_category` 作为最终裁决。

Web 现有请求包装器在非 2xx 时抛出带 `body`、`status`、`route` 的错误；`handleSave` 的 catch 已调用 `showErrorModal`，成功提示、关闭弹窗和列表刷新只在 `await updateTemplate` 成功后执行。现有 `TemplateManager.test.jsx` 模块级 mock 了 `announcement_api` 与 `showErrorModal`，只能证明调用参数，不能证明真实 400 被页面消费。本 change 选择“系统身份不可变”，同时保留新建、自定义编辑和 `custom → system` 的既有行为。

## Goals / Non-Goals

**Goals:**

- 在编辑目标当前 `category=system` 时禁用类别 Select，保持 `system`，不改变名称、描述、主题模板、正文模板的可编辑性。
- 保留新建模式与自定义模板编辑的类别可选行为，包括 `custom → system`。
- 为 `/announcements/templates` 增加 `cannot_change_system_template_category` 的中文映射。
- 用真实请求路径锁定失败消费：400 时显示中文、不提示成功、不关闭编辑、不丢弃字段、不按成功路径刷新列表。
- 保留既有权限、分页、深链与 SYSTEM 删除保护；不新增 API 或后端字段，唯一新增错误原因是 Ctrl Q51 的 `cannot_change_system_template_category`。

**Non-Goals:**

- 不修改 Ctrl、Node、DB、路由权限、模板分页、删除保护或 Q68 的 `created_by` 删除策略。
- 不消费 `announcement`/`template` 的 `created_by`，不添加所有者门禁。
- 不把类别保护扩展到自定义模板或新建模板；不禁止 `custom → system`。
- 不新增任务、执行记录、测试通过声明或运行台账；测试计划只做 scenario→test 映射。

## Decisions

1. **以编辑目标身份而不是表单当前值判定保护。**
   使用 `editMode === 'edit' && editTarget?.category === 'system'` 派生 `isSystemEdit`，类别 Select 的 `disabled` 绑定该值。原因：保护对象是“正在编辑的系统模板”，不能在用户改表单值后失效；新建模式与自定义编辑不命中该条件，现有交互不变。类别字段仍由 `openEdit` 填入 `system`，保存 payload 继续携带 `system`，不改变既有请求字段形状。

2. **前端保护只做 UX 防线，Ctrl 仍是权威。**
   前端禁用不能替代后端校验；Ctrl 的 400 `cannot_change_system_template_category` 用于覆盖陈旧页面、并发或直接调用等绕过 UI 的路径。Web 消费既有 400 错误协议中的该新 reason，不新增 `category` 字段或独立接口，也不扩展其他错误码。

3. **中文映射放在现有模板路由表。**
   在 `src/utils/showErrorModal.jsx` 的 `/announcements/templates` 映射中新增“系统模板类别不可修改”。该表已按 route 优先匹配，能避免落到通用 400 或英文原文；不改 `showErrorModal` 的解析策略。

4. **失败路径沿用现有“仅成功才收尾”的结构。**
   `handleSave` 现有 catch 已把 `err.body`、`err.status`、`err.route` 交给 `showErrorModal`，且成功提示、`setEditVisible(false)`、`loadTemplates(page)` 都在 `await updateTemplate` 之后。实现不新增“先关闭再提示”或“失败后刷新”的分支；用真实请求测试锁定 `message.success` 未调用、字段值保留、列表读取次数不增加。由于 `showErrorModal` 会先把已有 `.ant-modal` 设为 `display:none`，测试在点击错误弹窗“好的”关闭后再断言编辑弹窗恢复可见，避免把临时隐藏误判为关闭。

5. **测试分两层，避免 mock 冒充真实错误消费。**
   页面交互测试使用真实 `TemplateManager`，验证 Select 固定 `.ant-select-disabled` 断言、启用状态与保存 payload；错误消费测试使用真实 `announcement_api`（stub `fetch` 返回 400）与真实 `showErrorModal`，断言中文文案、`name`/`description`/`subject_template`/`body_template` 与 `category=system` 保留、编辑弹窗恢复可见和无假成功。映射表测试补充新 `error_reason` 的中文与真实弹窗命中；`后端 error_reason 全集都有中文映射` locator 已存在，apply 时修改其清单而非新建。规划 locator 在测试创建或修改前保持 `[ ]`，不写执行结果。

## Risks / Trade-offs

- **禁用 Select 仍保留表单值。** Ant Design 的 disabled 控件仍在 Form 中；若实现改为删除字段或重置表单，可能丢失 `system` 或清空其它字段。用“类别显示系统 + 其它字段可改 + 保存 payload 仍为 system”的真实组件断言锁定。
- **Ctrl 对“未变更的 system 类别”必须放行。** 前端禁用后正常路径仍可能携带 `category=system`；若 Ctrl 把任何携带 `category` 的 system 更新都拒绝，会误伤内容编辑。计划按“仅拒绝实际变更”的语义描述，并在真实 400 测试中区分拒绝分支；若实际契约不同，应在实现前对齐，而不是放宽前端保护。
- **模块级 mock 会掩盖传输层。** 现有 `TemplateManager.test.jsx` 的 API mock 只能证明调用；新增错误消费测试必须走真实 `announcement_api`/`fetch` 与真实弹窗，否则不能声称“真实请求错误消费”。
- **范围蔓延。** Q68 的 `created_by` 删除与所有者门禁不在本 change；权限、分页、深链和删除保护保持现状，避免把 Q51 扩大成模板生命周期重构。
