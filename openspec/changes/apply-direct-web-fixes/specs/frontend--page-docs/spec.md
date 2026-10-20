# 规格变更：Docs 不可达资源清理

覆盖问题：Q36。

## ADDED Requirements

### Requirement: Docs 页面只保留生产可达资源

Docs 页面 SHALL 删除全仓确认零引用的 `src/pages/Docs.css`、`src/components/docs/Guides.jsx`、`src/assets/docs-apply.svg`、`src/assets/docs-apply-mobile.svg`、`src/assets/docs-home.svg`、`src/assets/docs-home-mobile.svg`；仍被引用的 `src/utils/statusDisplay` 及其他共享工具 MUST NOT 因局部未使用而删除。删除后生产入口 MUST 可构建。

#### Scenario: 零引用资源删除且构建通过

- **GIVEN** 引用扫描确认上述样式、组件和 SVG 在 `src/`、`public/`、测试与构建配置中零引用
- **WHEN** 删除这些文件并执行 `npm run build`
- **THEN** 生产构建通过，产物不引用已删除文件

#### Scenario: 仍被引用的 statusDisplay 保留

- **GIVEN** `src/pages/Docs.jsx` 等页面仍导入 `../utils/statusDisplay`
- **WHEN** 完成 Docs 清理并执行引用扫描
- **THEN** `statusDisplay` 保留，Docs 页面状态展示行为不变

#### Scenario: 有引用的资源不得删除

- **GIVEN** 待删除清单中的文件仍被源码、样式、测试或构建配置引用
- **WHEN** 执行清理守护检查
- **THEN** 检查失败并要求先保留或迁移引用，不能把“零引用”当作未经扫描的默认结论
