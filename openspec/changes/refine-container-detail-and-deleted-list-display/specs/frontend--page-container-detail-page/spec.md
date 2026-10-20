## MODIFIED Requirements

### Requirement: ContainerDetailPage 展示并复制既有宿主 bind 路径

ContainerDetailPage SHALL 从既有详情响应读取可空 `bind_mount_path`，在运行指标区域完整展示该值并提供复制；此值只来自 Ctrl 的最近记录，MUST NOT 调用 Node 核实，也不得按容器名、机器名、端口或其他本地字段拼猜。页面 SHALL 标注其为最近记录而非实时核对，不新增宿主路径输入、页面入口、API 字段或权限判断。

#### Scenario: 有记录时完整展示与复制

- **GIVEN** 详情响应返回非空 `bind_mount_path`，以及 GPU 分配和共享内存字段
- **WHEN** 页面渲染运行指标和镜像信息
- **THEN** 运行指标区域原样展示三项资源信息并提供路径复制；镜像信息区域不重复展示 GPU、共享内存或 bind 路径，只展示镜像身份和已有 Dockerfile 内容

#### Scenario: 空值或旧 Ctrl 缺字段

- **GIVEN** `bind_mount_path` 为 `null`、空字符串，或旧 Ctrl 详情响应没有该字段
- **WHEN** 页面渲染运行指标
- **THEN** 只显示“未记录”，不生成候选路径或可复制值；缺失资源使用既有未知占位，合法的 0 值不得被当成缺失；其余详情字段、状态轮询和既有动作仍正常展示

#### Scenario: 最近记录与实时核对的区别

- **GIVEN** 页面显示非空 bind 路径
- **WHEN** 用户查看该字段或点击复制
- **THEN** 文案表明这是最近记录、不是实时核对，复制内容与响应值逐字一致，且不触发 Node 请求

#### Scenario: 复制失败

- **GIVEN** 剪贴板写入失败且页面仍有非空 bind 路径
- **WHEN** 用户点击路径复制控件
- **THEN** 显示既有“复制失败”反馈，路径、`title` 和复制值保持不变，不发起 API 或 Node 请求

## ADDED Requirements

### Requirement: ContainerDetailPage 运行指标资源归属

ContainerDetailPage SHALL 将既有详情响应中的 GPU 分配和共享内存放入运行指标区域，使用当前页面的格式化与未知值处理；本项只调整展示归属，不引入新的资源计算、接口或持久化状态。

#### Scenario: 资源字段放入运行指标

- **GIVEN** 详情响应含 GPU 分配 `4, 0` 与共享内存 `1 GB`
- **WHEN** 页面渲染运行指标
- **THEN** 运行指标区域显示对应标签和值，镜像信息卡不再显示这两项

#### Scenario: 资源值缺失或为零

- **GIVEN** GPU 或共享内存字段缺失，或明确返回 0
- **WHEN** 页面渲染运行指标
- **THEN** 缺失值显示既有未知占位，0 显示为合法的 0 值；页面不发起补充请求

#### Scenario: 镜像内容缺失

- **GIVEN** 镜像名为空或 `image_dockerfile` 为空
- **WHEN** 页面渲染镜像信息区域
- **THEN** 镜像名显示“未知”，空 Dockerfile 不渲染伪造内容或空的代码块
