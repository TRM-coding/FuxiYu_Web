# Spec Delta

## ADDED Requirements

### Requirement: MachineDetailPage 窄屏共享布局不横向溢出

MachineDetailPage SHALL 在 320px、390px 和 768px 视口下把共享 `.machine-detail-layout` 网格及其中卡片保持在视口宽度内。页面 SHALL 复用 `DetailPages.css` 中可收缩的 `min(460px, 100%)` 最小列宽，MUST NOT 因固定 460px 最小列宽产生整页横向滚动。机器标题、指标卡补充文案、硬件限制说明和 GPU 名称 SHALL 允许在卡片内换行或收缩；长机器名、长描述和指标文案 MUST 保持可读，既有带省略号的控件 MAY 视觉截断但 MUST NOT 撑破卡片。桌面卡片顺序、指标归属和限额编辑行为 MUST NOT 因本修正改变；页面 MUST NOT 为此新增接口、字段或权限判断。

#### Scenario: 390px 长机器名与长指标文案

- **GIVEN** 机器详情返回长机器名、较长描述和完整 CPU/内存/GPU/磁盘指标
- **WHEN** 在 390px 视口渲染
- **THEN** 机器名和指标文案在各自卡片内换行，`document.documentElement.scrollWidth` 不超过 392px，指标卡与趋势图卡按单列顺序可见

#### Scenario: 320px 长 GPU 名称与限制说明

- **GIVEN** GPU 名称或硬件限制说明包含无空格长串
- **WHEN** 在 320px 视口渲染硬件分配限制与 GPU 选择区
- **THEN** 长串在卡片内换行或按既有省略显示，不撑破卡片，页面无横向滚动，保存按钮与 GPU 选择控件仍完整可见且可点击

#### Scenario: 768px 与桌面的共享布局

- **GIVEN** 同一份机器详情分别在 768px 和 1440px 视口打开
- **WHEN** 详情加载完成
- **THEN** 768px 下共享网格按可用宽度收缩且无横向溢出；1440px 下仍保持现有桌面卡片顺序与多列布局，不因响应式修正改变指标、趋势图和限额编辑的归属

#### Scenario: 可选指标缺失时仍保持布局

- **GIVEN** `runtime_snapshot` 缺少 CPU、GPU 或磁盘中的部分字段
- **WHEN** 在 320px 视口渲染
- **THEN** 缺失项按既有未知占位显示，卡片宽度仍不超过视口，长标题与说明继续换行，页面不发起补充请求或伪造数值
