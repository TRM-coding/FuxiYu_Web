# Spec Delta

## ADDED Requirements

### Requirement: ContainerDetailPage 展示并复制既有宿主 bind 路径

ContainerDetailPage SHALL 从既有详情响应读取可空 `bind_mount_path`，完整展示该值并提供复制；此值只来自 Ctrl 的最近记录，MUST NOT 调用 Node 核实，也不得按容器名、机器名、端口或其他本地字段拼猜。页面 SHALL 标注其为最近记录而非实时核对，不新增宿主路径输入、页面入口或权限判断。

#### Scenario: 有记录时完整展示与复制

- **WHEN** 详情响应返回非空 `bind_mount_path`（例如 `/home/alice/containers/train-a`）
- **THEN** 页面原样展示完整路径并提供复制，复制内容与响应值逐字一致，不截断、不改写路径段；该操作不触发 Node 请求

#### Scenario: 空值或旧 Ctrl 缺字段

- **WHEN** `bind_mount_path` 为 `null`、空字符串，或旧 Ctrl 详情响应没有该字段
- **THEN** 页面只显示“未记录”，不生成候选路径或可复制值；其余详情字段、状态轮询和既有动作仍正常展示

#### Scenario: 最近记录与实时核对的区别

- **WHEN** 页面显示非空路径的来源说明
- **THEN** 文案表明这是最近记录、不是实时核对，且不声称服务器刚刚检查过该目录；本展示不新增请求、权限或宿主路径输入
