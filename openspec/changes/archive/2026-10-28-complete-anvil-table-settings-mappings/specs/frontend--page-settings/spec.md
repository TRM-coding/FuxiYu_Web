# Spec Delta

## MODIFIED Requirements

### Requirement: Settings 页面入口与身份

页面 SHALL 通过 `/admin/settings` 装配。现有身份与权限约束为：settings:manage；读取 setting 定义与当前值。

#### Scenario: 装配页面

- **WHEN** 路由或父组件匹配上述页面入口
- **THEN** 装配 `Settings` 并采用现有布局、身份快照或 props；页面身份与后端资源主键分别处理

### Requirement: Settings 主流程

页面 SHALL 保持以下已实现的交互及数据职责：按 boolean/integer/string 类型显示 Switch/InputNumber/Input；使用 min/max/unit/multiline；只提交变化的键，后端一次校验并事务写入。

#### Scenario: 合法设置更新成功

- **WHEN** 合法设置更新成功
- **THEN** 刷新矩阵并展示保存结果；未知键/越界等由后端 invalid_setting 拒绝

### Requirement: Settings 构建归属

页面 SHALL 通过路由表的按需加载组织参加 Vite 构建：`src/routes/index.jsx` 对页面组件与共同布局（`MainLayout`、`AdminLayout`）使用 `React.lazy` 动态导入，并在 route element 层以既有 `Suspense` 提供页面级加载反馈（仅描述当前实现，不新增加载 UI）；`LoginLayout`、路由骨架与 React 运行时随入口静态加载。`LoginLayout` 内的 `ModelViewer` 亦按需加载，three 相关代码经 `vite.config.js` 的 `manualChunks` 按依赖方向 addons → WebGL → core 分为 `vendor-three-core`、`vendor-three-webgl`、`vendor-three-addons`，均不进入入口 chunk。上述页面与 `ModelViewer` 不再与同路由树代码共同进入主 JS chunk。构建警告与运行交互缺陷分别登记。

#### Scenario: 生成生产产物

- **WHEN** 对本基线执行 `npm run build`
- **THEN** Vite 完成构建并输出页面级与 `ModelViewer` 的异步 chunk；`src/utils/requestManager.jsx` 与 `src/utils/validateCmdArg.jsx` 统一为静态导入后，预期不再出现「同一模块既被静态又被动态导入」的 Rollup 警告；具体 chunk 体积与警告清单属构建验收观测，记入本轮验收报告，不作为本规格固化的历史指标

### Requirement: Settings 整数与提醒节点必须完整校验

整数设置 SHALL 只接受整数并拒绝小数、空值和非数字输入，提交前 MUST 阻止非法值；提醒节点 SHALL 只接受逗号分隔的正整数（如 `72,24,12`），空项、非整数、0 和负数 MUST 被拒绝，并在具体字段上指出非法项；MUST NOT 静默截断小数或丢弃非法节点后继续保存。

#### Scenario: 整数合法值可提交

- **GIVEN** 整数设置在 min/max 范围内
- **WHEN** 用户输入整数并保存
- **THEN** 表单提交该整数值，不出现校验错误

#### Scenario: 整数输入小数被拒

- **GIVEN** 用户在整数设置输入 `1.5`
- **WHEN** 尝试保存
- **THEN** 表单阻止提交并指出该字段必须为整数，不把值截断为 `1` 后发送

#### Scenario: 合法提醒节点可提交

- **GIVEN** 用户输入 `72,24,12`
- **WHEN** 保存设置
- **THEN** 表单接受该字符串并按原值提交

#### Scenario: 非法提醒节点指出具体字段

- **GIVEN** 用户输入 `abc`、`72,,12`、`0` 或 `-1` 等非法节点
- **WHEN** 尝试保存
- **THEN** 表单在“清理提醒节点”字段指出非法项并阻止保存，不静默丢弃后发出其他值

### Requirement: Settings GROUP_ORDER 与后端实际分组一致

设置页分组顺序 SHALL 使用后端实际组名 `容器清理`、`磁盘策略`、`已删除容器`、`公告`、`镜像`；MUST NOT 再使用 `容器策略` 或 `已删除清理` 这两个错位名称。未知分组 SHALL 排在已知分组之后，MUST NOT 因名称不匹配把已知分组排到末尾。

#### Scenario: 分组顺序与后端一致

- **GIVEN** 后端返回 `镜像`、`已删除容器`、`容器清理`、`公告`、`磁盘策略` 五个分组
- **WHEN** 设置页渲染
- **THEN** 页面按“容器清理、磁盘策略、已删除容器、公告、镜像”的顺序展示

#### Scenario: 未知分组排最后

- **GIVEN** 后端新增一个不在 GROUP_ORDER 中的分组
- **WHEN** 设置页渲染
- **THEN** 该未知分组排在五个已知分组之后，已知分组顺序不变

### Requirement: Settings 错误保留结构化原因并兼容既有字符串

设置请求失败 SHALL 以包含 `message` 对象、`status`、`route` 的参数调用 `showErrorModal`，MUST NOT 只传 `err.message` 字符串；`/settings` 的 `invalid_setting` 与 `update_failed` SHALL 分别显示“设置项不合法”和“保存设置失败”。错误展示工具对历史字符串输入的既有兼容 MUST 保留，字符串输入仍须显示可读消息而不抛解析异常。

#### Scenario: invalid_setting 展示中文

- **GIVEN** 设置接口返回 `invalid_setting`
- **WHEN** 页面展示错误
- **THEN** 弹窗显示“设置项不合法”，不显示“未收录的错误原因”

#### Scenario: update_failed 展示中文

- **GIVEN** 设置接口返回 `update_failed`
- **WHEN** 页面展示错误
- **THEN** 弹窗显示“保存设置失败”，不落回原始英文或通用未知错误

#### Scenario: 只传字符串时仍可读

- **GIVEN** 历史调用只传字符串消息
- **WHEN** 错误展示工具处理输入
- **THEN** 仍展示该可读消息或中文网络兜底，不因不是对象而抛出解析异常
