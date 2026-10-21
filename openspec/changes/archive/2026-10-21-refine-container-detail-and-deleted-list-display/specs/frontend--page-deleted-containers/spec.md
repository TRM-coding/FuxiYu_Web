## MODIFIED Requirements

### Requirement: DeletedContainers 如实展示逻辑大小与测量时间

成功统计项 SHALL 按 `deleted_id` 映射到对应行，展示 `du -sb` 逻辑字节数和该样本真实 `measured_at`；MUST NOT 把逻辑字节称为物理磁盘块，也不得称为实时或瞬时占用。成功结果 `bytes=0` 时 SHALL 显示 0 B，并只在成功状态展示一个优化样式的逻辑用量进度条；进度条只能由成功样本驱动，不得把 pending、error、缺项或未请求状态画成 0% 成功条。若已有记录包含正数比较上限，则条宽按逻辑字节与该上限计算并在超过上限时封顶视觉宽度但保留实际数值；没有比较上限或上限不为正时显示无比例的成功轨道，使用 `aria-valuetext` 说明已测量但没有可比上限，不伪造百分比。可见测量文案 SHALL 缩短为 `测量 {MM-DD HH:mm}`，完整时间继续放在可访问的 `title` 或等价提示中；只有成功样本可显示时间。页面 MUST NOT 为此新增接口字段、数据库字段、Node 请求、缓存或权限门禁；pending 项继续按主规格的有界轮询收敛，失败、缺项和旧缓存不得冒充当前成功样本。

#### Scenario: 成功样本与旧测量时间

- **GIVEN** 某项 `pending=false`、`error=null`、`bytes` 为非负数且有真实 `measured_at`，即使样本来自较早测量
- **WHEN** 该行渲染逻辑用量
- **THEN** 显示优化样式的成功进度条、逻辑大小和 `测量 {MM-DD HH:mm}`；完整时间在提示属性中保留，进度条具有可访问的成功语义，不声称实时或物理块占用；时间按现有浏览器本地化格式生成

#### Scenario: 成功且确实为零

- **GIVEN** 某项 `pending=false`、`error=null` 且 `bytes=0`
- **WHEN** 该行渲染
- **THEN** 显示 0 B 和成功进度条，显示对应测量时间；无正数上限时该条为无比例成功轨道，不把零解释为失败、缺项或未知

#### Scenario: 成功样本有上限或没有上限

- **GIVEN** 成功样本有可靠比较上限、逻辑字节超过该上限，或没有比较上限
- **WHEN** 该行渲染成功进度条
- **THEN** 有正数上限时按逻辑字节与上限计算并在超限时封顶宽度；没有上限或上限不为正时显示无比例成功轨道并设置说明性 `aria-valuetext`，不显示伪造百分比，但仍显示实际逻辑大小和测量时间

#### Scenario: 测量中

- **GIVEN** 某项 `pending=true`、`bytes=null`、`error=null`，或仍处于列表加载中
- **WHEN** 该行渲染
- **THEN** 显示既有“读取统计中”或“测量中”状态，不渲染成功进度条、不显示 0 或伪造测量时间

#### Scenario: 失败、缺项或形状非法

- **GIVEN** 某项 `error` 非空、响应缺项、响应形状非法、无挂载或已清理
- **WHEN** 该行渲染
- **THEN** 沿用既有的统计不可用、无挂载或已清理展示，不渲染成功进度条、不显示伪造时间、不把状态改写成 0 B，并继续丢弃缺项或过期响应

## ADDED Requirements

### Requirement: DeletedContainers 表格信息层级与 Mount 复制样式

DeletedContainers SHALL 保持现有的已删除容器列表、分页、挂载用量请求、清理和恢复流程。主表 SHALL 保留容器身份、机器、Mount、逻辑用量、删除时间、状态和操作；镜像信息 SHALL 移入可展开详情，不再单独占用主表列。Mount SHALL 使用现有 `CopyChip` 的 `meta` 与 `soft` 小号样式，保留完整路径到 `title` 和复制值。本展示变更 MUST NOT 新增接口字段、数据库字段、Node 请求或权限门禁。

#### Scenario: 删除列表显示详情与可复制 Mount

- **GIVEN** 已删除记录包含镜像名和非空 Mount 路径
- **WHEN** 表格和该行详情渲染
- **THEN** 主表没有单独的镜像列，展开详情显示镜像，Mount 单元格显示小号复制控件，复制值和 `title` 均包含完整路径

#### Scenario: 空 Mount 或空镜像

- **GIVEN** 记录的 Mount 路径为空，或镜像名缺失
- **WHEN** 表格或展开详情渲染
- **THEN** 空 Mount 显示“无挂载”且不渲染复制控件；空镜像显示“未知”；两者都不生成无效复制按钮或猜测值

#### Scenario: 复制失败

- **GIVEN** 剪贴板写入失败
- **WHEN** 用户点击 Mount 复制控件
- **THEN** 显示“复制失败”，路径、`title` 和复制值不变，不发起接口或 Node 请求

#### Scenario: 旧流程

- **GIVEN** 用户翻页、刷新、清理 Mount 或恢复已删除容器
- **WHEN** 页面沿用现有生命周期处理
- **THEN** 分页、有限用量轮询、取消、清理和恢复行为保持不变，迟到响应不覆盖当前页
