# Tasks

## 1. Web 系统模板类别保护

- [x] 1.1 在 `src/pages/TemplateManager.jsx` 按 `editMode === 'edit' && editTarget?.category === 'system'` 派生系统编辑状态，仅禁用类别 Select；保留名称、描述、主题模板、正文模板可编辑，保留新建/自定义模板的类别可选与 `custom → system` 行为，保存 payload 继续携带 `category`。验证：对应 `frontend--page-template-manager / TemplateManager 主流程 / 编辑系统模板锁定类别但保留内容编辑` 的组件测试通过。
- [x] 1.2 在 `src/test/TemplateManager.test.jsx` 增加系统模板编辑测试：类别 Select 固定断言 `.ant-select-disabled`，四项内容字段可改，保存调用 `updateTemplate` 且 `category=system`。验证：该测试单独运行通过。
- [x] 1.3 在 `src/test/TemplateManager.test.jsx` 增加新建模板与自定义模板编辑测试：类别可选、默认 custom、选择 system 后 `createTemplate`/`updateTemplate` 收到 `category=system`。验证：两条测试单独运行通过。
- [x] 1.4 运行 1.2/1.3 涉及的 UI 测试并修复本范围失败。验证：`npm run test:web -- src/test/TemplateManager.test.jsx` 通过。

## 2. 系统模板类别 400 的中文映射与真实消费

- [x] 2.1 在 `src/utils/showErrorModal.jsx` 的 `/announcements/templates` 路由映射增加 `cannot_change_system_template_category: '系统模板类别不可修改'`，不新增其他错误码或接口。验证：映射测试断言该 route/reason 的中文值。
- [x] 2.2 新增 `src/test/TemplateManagerSystemCategoryRequest.test.jsx`，使用真实 `announcement_api`、stub `fetch` 返回 HTTP 400、真实 `showErrorModal`；断言 PUT 请求保留 `name`/`description`/`subject_template`/`body_template` 与 `category=system`，错误弹窗显示中文，关闭错误弹窗后编辑弹窗可见且全部字段保留，无 `message.success`、无列表刷新。验证：该测试单独运行通过。
- [x] 2.3 在 `src/test/showErrorModalMap.test.js` 新增 `test_q51_system_category_reason_maps_to_chinese`，并把 `cannot_change_system_template_category` 加入 `BACKEND_ERROR_REASONS`；保持既有“后端 error_reason 全集都有中文映射” locator 通过。验证：映射相关测试通过。
- [x] 2.4 运行 2.2/2.3 涉及的 UI 与映射测试并修复本范围失败。验证：`npm run test:web -- src/test/TemplateManagerSystemCategoryRequest.test.jsx src/test/showErrorModalMap.test.js` 通过。

## 3. 回归与验收

- [x] 3.1 运行受影响回归：`TemplateManager.test.jsx`、`TemplateManagerSystemCategoryRequest.test.jsx`、`showErrorModalMap.test.js`、`AnvilContentPages.test.jsx` 中模板相关用例。验证：相关测试通过，既有权限/分页/深链/删除保护不回退。
- [x] 3.2 运行 `npm run lint` 与 `npm run build`，修复本范围失败。验证：两条命令退出码为 0。
- [x] 3.3 将测试、lint、build 原始日志写入 `E:/AI/Fuxi_audit_artifacts/q68-q51-20261029/web/`，记录实际命令、计数与 diff 统计；不写 verify.md，不 commit/push。验证：日志文件存在且与命令输出一致。
