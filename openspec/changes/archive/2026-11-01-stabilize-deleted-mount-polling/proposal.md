## Why

已删除页面对短暂的 Ctrl 或 Node 超时只显示失败，不再自动更新，打开页面期间无法自行恢复。

## What Changes

- 页面打开期间持续查询当前页挂载路径；等待测量时短间隔，其他情况低频复查。
- 保留单请求在途、翻页与离开取消及旧响应丢弃；不调整 Node 的 du 超时。

## Capabilities

### Modified Capabilities

- `frontend--page-deleted-containers`: 持续轮询及取消。

## Impact

仅修改 Web 按需查询调度；沿用已有 Ctrl 和 Node 接口与缓存。
