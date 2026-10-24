# Spec Delta

## ADDED Requirements

### Requirement: ContainerDetailPage 窄屏布局不横向溢出且长内容可读

ContainerDetailPage SHALL 在 320px、390px 和 768px 视口下把共享 `.container-detail-layout` 网格及其中卡片保持在视口宽度内。`DetailPages.css` 的共享最小列宽 MUST 使用 `min(460px, 100%)` 或等价的可收缩值，MUST NOT 因固定 460px 最小列宽产生整页横向滚动。`.detail-card`、标题、运行指标、bind 路径和详情字段 SHALL 允许收缩与换行；长容器名、长路径和长指标文案 MUST 可读，复制控件的 `title` 与复制值 MUST 保持完整。桌面信息层级、卡片顺序和资源字段归属 MUST NOT 因本修正改变；页面 MUST NOT 为此新增接口、字段或权限判断。

#### Scenario: 390px 长标题与长 bind 路径

- **GIVEN** 容器详情返回无空格长容器名和含中文、空格、长目录的 `bind_mount_path`
- **WHEN** 在 390px 视口渲染
- **THEN** `document.documentElement.scrollWidth` 不超过 392px，标题在卡片内换行，运行指标与操作卡完整可见；bind 路径复制控件的文本、`title` 和复制值均为完整路径

#### Scenario: 320px 长运行指标文案

- **GIVEN** 运行指标包含较长的 GPU 设备编号、网络入/出和磁盘上限文案
- **WHEN** 在 320px 视口渲染
- **THEN** 每个指标卡的标签、值和补充文案均在卡片内换行或收缩，不超出视口；页面无横向滚动，指标值不被截断成无法阅读的空白

#### Scenario: 768px 与桌面的共享布局

- **GIVEN** 同一份容器详情分别在 768px 和 1440px 视口打开
- **WHEN** 详情加载完成
- **THEN** 768px 下共享网格按可用宽度收缩为单列且无横向溢出；1440px 下仍保持现有桌面卡片归属与多列布局，不因响应式修正改变信息顺序

#### Scenario: 缺少 bind 路径或存在无空格长串

- **GIVEN** 详情响应没有 `bind_mount_path`，且容器名或某个指标值含无空格长串
- **WHEN** 在 320px 视口渲染
- **THEN** 路径区域显示“未记录”且不渲染复制控件，长串在卡片内换行，整页仍无横向溢出；不生成猜测路径或额外请求
