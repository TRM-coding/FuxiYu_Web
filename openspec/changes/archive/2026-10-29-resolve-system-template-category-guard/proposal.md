# Proposal

## Why

Q51 已获授权按“系统身份不可变”修复。现状核实：`TemplateManager.jsx` 在编辑 SYSTEM 模板时仍渲染可用的类别 Select，保存会把 `category` 一并提交；现有删除保护只检查删除当刻的 `category`，因此 system→custom 保存后会暴露删除入口。Ctrl 侧将补充 HTTP 400 `error_reason=cannot_change_system_template_category` 作为最终裁决；Web 需要同时补 UI 防线和真实错误消费，避免用户把“改了类别”或请求失败当成保存成功。

## What Changes

- 编辑模式且 `editTarget.category === 'system'` 时禁用类别 Select 并保持 `system`；名称、描述、主题模板、正文模板仍可编辑并保存。
- 新建模板、编辑自定义模板保持现有类别可选行为；`custom → system` 保存继续可用，保存成功后按既有流程刷新列表。
- 在 `/announcements/templates` 路由错误映射中新增 `cannot_change_system_template_category` 的中文文案“系统模板类别不可修改”。
- 页面消费真实 400：显示中文原因，MUST NOT 提示成功、关闭编辑弹窗或丢弃已填字段；列表不按成功路径刷新。Ctrl 为权威校验，Web 不新增接口或字段；只映射 Ctrl Q51 新增的 `cannot_change_system_template_category`，不扩展其他错误码。
- 保留既有权限门、模板 200/页分页与深链定位、SYSTEM 删除保护；不消费 Q68 将删除的 `announcement`/`template created_by`，不新增所有者门禁。

## Capabilities

### New Capabilities

<!-- 无新增 capability。 -->

### Modified Capabilities

- `frontend--page-template-manager`: 系统模板编辑时锁定类别并保留其它字段编辑；补充系统模板类别变更 400 的中文映射与失败消费。

## Impact

- 代码：`src/pages/TemplateManager.jsx`、`src/utils/showErrorModal.jsx`；测试覆盖真实组件交互、真实请求错误消费与映射。
- 接口/后端：仅消费 Ctrl Q51 契约的 400 `error_reason`；不改 Ctrl、Node、DB，不新增 API 或后端字段。
- 规格：只新增本 change 的 proposal/specs/design/test-plan；不改主规格、其他 active change 或共享配置。
- 安全/范围：不读 `.env`/APIKEY/PASSCODE，不 SSH、不发信、不 commit/push；Q68 删除 `created_by` 不由 Web 消费，不添加所有者门禁。
